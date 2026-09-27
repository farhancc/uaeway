/**
 * The only place Gemini is called. Swap this file's body to change providers;
 * callers only use generateJSON / generateText / streamChat.
 *
 * Every call walks the key pool (lib/ai/pool.ts) so a rate-limited key costs a
 * retry rather than the whole job. Failures return null instead of throwing:
 * the ingest must degrade to a non-AI fallback, never crash mid-run.
 */

import {
  candidates,
  poolStatus,
  reportFailure,
  reportSuccess,
  type FailureKind,
} from "./pool";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Fast, cheap; used for summaries, extraction and chat. */
export const FLASH = process.env.GEMINI_MODEL || "gemini-2.5-flash";
/** Stronger; used for long-form article drafting. */
export const PRO = process.env.GEMINI_MODEL_PRO || "gemini-2.5-pro";

interface GeminiError {
  error?: {
    message?: string;
    status?: string;
    details?: {
      "@type"?: string;
      reason?: string;
      retryDelay?: string;
      violations?: { quotaId?: string; quotaMetric?: string }[];
    }[];
  };
}

/** "34s" or "1.5s" from the API's RetryInfo. */
function parseDelay(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number.parseFloat(value.replace(/s$/, ""));
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : undefined;
}

/**
 * What a failed response means for this key.
 *
 * `kind: null` means the request itself was wrong — a malformed payload or an
 * unknown model — so no other key can help and we stop. Everything else is a
 * problem with this key, and the next one gets a turn.
 *
 * The distinctions here are what the pool needs to know: a key that is out of
 * credit answers 429 exactly like one that is briefly rate-limited, and putting
 * the exhausted one back into rotation a minute later just fails again.
 */
function classify(
  status: number,
  body: string,
): { kind: FailureKind | null; retryAfterMs?: number; detail: string } {
  let parsed: GeminiError | null = null;
  try {
    parsed = JSON.parse(body) as GeminiError;
  } catch {
    // Not JSON; fall back to the status code alone.
  }

  const details = parsed?.error?.details ?? [];
  const reason = details.find((d) => d.reason)?.reason;
  const retryAfterMs = parseDelay(details.find((d) => d.retryDelay)?.retryDelay);
  const quotaIds = details
    .flatMap((d) => d.violations ?? [])
    .map((v) => `${v.quotaId ?? ""} ${v.quotaMetric ?? ""}`)
    .join(" ");
  const detail = reason || parsed?.error?.status || `HTTP ${status}`;

  // A rejected key answers 400, not 401 — verified against the live API. The
  // previous code read every 400 as "our payload is wrong" and abandoned the
  // whole request, so one mistyped key took the other four down with it.
  if (reason === "API_KEY_INVALID") return { kind: "invalid", detail };
  if (status === 403) return { kind: "invalid", detail };
  if (status === 400) return { kind: null, detail };
  if (status === 404) return { kind: null, detail };

  if (status === 429) {
    // A daily or lifetime quota will not clear in a minute.
    const daily = /PerDay|per day|FreeTier/i.test(quotaIds) || /billing|credit/i.test(parsed?.error?.message ?? "");
    return { kind: daily ? "exhausted" : "rate-limited", retryAfterMs, detail };
  }

  if (status >= 500 || status === 408) return { kind: "transient", retryAfterMs, detail };

  // An unfamiliar 4xx is more likely about the request than the key.
  return { kind: null, detail };
}

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

      const { kind, retryAfterMs, detail } = classify(res.status, await res.text());

      // Our request is wrong, not this key. Another key would fail the same way.
      if (kind === null) {
        console.warn(`[gemini] request rejected (${detail}) — not retrying`);
        return null;
      }

      reportFailure(state, kind, retryAfterMs);
      console.warn(
        `[gemini] key ${state.label} failed (${detail}), trying ${keys.length - attempt - 1} other key(s)`,
      );

      // A key that is out of credit or rejected will not recover in 400ms, so
      // move straight on. Only back off for something that might pass on retry.
      if (kind === "transient" || kind === "rate-limited") {
        await sleep(250 * 2 ** attempt);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      reportFailure(state, "transient");
      console.warn(`[gemini] key ${state.label} errored: ${(err as Error).message}`);
      await sleep(250 * 2 ** attempt);
    }
  }

  // The line that should tell you a key needs replacing, rather than leaving
  // you to notice the bill.
  const status = poolStatus()
    .map((k) => `${k.label}: ${k.usable ? "usable" : `${k.reason} for ${k.benchedForSeconds}s`}`)
    .join(", ");
  console.error(`[gemini] every key failed — ${status}`);
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
