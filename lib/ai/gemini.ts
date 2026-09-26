/**
 * The only place Gemini is called. Swap this file's body to change providers;
 * callers only use generateJSON / generateText / streamChat.
 *
 * Every call walks the key pool (lib/ai/pool.ts) so a rate-limited key costs a
 * retry rather than the whole job. Failures return null instead of throwing:
 * the ingest must degrade to a non-AI fallback, never crash mid-run.
 */

import { candidates, reportFailure, reportSuccess } from "./pool";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Fast, cheap; used for summaries, extraction and chat. */
export const FLASH = process.env.GEMINI_MODEL || "gemini-2.5-flash";
/** Stronger; used for long-form article drafting. */
export const PRO = process.env.GEMINI_MODEL_PRO || "gemini-2.5-pro";

/** Transient conditions worth retrying on a different key. */
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export type Role = "user" | "model";
export interface Turn {
  role: Role;
  text: string;
}

export interface GenerateOptions {
  model?: string;
  /** Prepended as systemInstruction. */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

function body(turns: Turn[], opts: GenerateOptions, json: boolean) {
  return {
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      temperature: opts.temperature ?? (json ? 0.2 : 0.6),
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POSTs to Gemini, trying each pooled key until one answers. Returns null when
 * every key failed or the request itself was rejected as malformed.
 */
async function post(
  path: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<Response | null> {
  const keys = candidates();
  if (keys.length === 0) {
    console.warn("[gemini] no API keys configured (GEMINI_API_KEYS)");
    return null;
  }

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const state = keys[attempt];
    try {
      const res = await fetch(`${ENDPOINT}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": state.key,
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (res.ok) {
        reportSuccess(state);
        return res;
      }

      // 400 means our payload is wrong; another key will not help.
      if (res.status === 400) {
        console.warn(`[gemini] 400 bad request: ${(await res.text()).slice(0, 300)}`);
        return null;
      }

      reportFailure(state);
      const retryable = RETRYABLE.has(res.status);
      console.warn(
        `[gemini] key ${attempt + 1}/${keys.length} -> HTTP ${res.status}${retryable ? ", rotating" : ""}`,
      );
      if (!retryable && res.status !== 403) return null;
      await sleep(250 * 2 ** attempt);
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      reportFailure(state);
      console.warn(`[gemini] key ${attempt + 1}/${keys.length} failed: ${(err as Error).message}`);
      await sleep(250 * 2 ** attempt);
    }
  }

  console.warn("[gemini] all keys exhausted");
  return null;
}

function firstText(data: GeminiResponse): string | null {
  if (data.promptFeedback?.blockReason) {
    console.warn(`[gemini] blocked: ${data.promptFeedback.blockReason}`);
    return null;
  }
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  const text = parts.map((p) => p.text ?? "").join("").trim();
  return text || null;
}

/** Structured output. Returns null on any failure so callers can fall back. */
export async function generateJSON<T>(
  prompt: string | Turn[],
  opts: GenerateOptions = {},
): Promise<T | null> {
  const turns = typeof prompt === "string" ? [{ role: "user" as const, text: prompt }] : prompt;
  const res = await post(
    `${opts.model || FLASH}:generateContent`,
    body(turns, opts, true),
    opts.signal,
  );
  if (!res) return null;

  const text = firstText((await res.json()) as GeminiResponse);
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`[gemini] response was not JSON: ${text.slice(0, 200)}`);
    return null;
  }
}

/** Plain prose. Returns null on failure. */
export async function generateText(
  prompt: string | Turn[],
  opts: GenerateOptions = {},
): Promise<string | null> {
  const turns = typeof prompt === "string" ? [{ role: "user" as const, text: prompt }] : prompt;
  const res = await post(
    `${opts.model || FLASH}:generateContent`,
    body(turns, opts, false),
    opts.signal,
  );
  if (!res) return null;
  return firstText((await res.json()) as GeminiResponse);
}

/**
 * Streams a chat reply as text chunks, for the site chatbot. Yields nothing if
 * the whole pool is unavailable — the caller sends a fallback message.
 */
export async function* streamChat(
  turns: Turn[],
  opts: GenerateOptions = {},
): AsyncGenerator<string> {
  const res = await post(
    `${opts.model || FLASH}:streamGenerateContent?alt=sse`,
    body(turns, opts, false),
    opts.signal,
  );
  if (!res?.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep any partial frame buffered.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const text = firstText(JSON.parse(json) as GeminiResponse);
        if (text) yield text;
      } catch {
        // Ignore a frame we cannot parse rather than killing the stream.
      }
    }
  }
}
