/**
 * The only place Claude (Anthropic) is called. Gemini stays the chatbot and
 * job-summary provider (lib/ai/gemini.ts); this file is for long-form content —
 * currently blog drafting — where Sonnet's writing holds up better over a full
 * article. One file per provider means adding a third later touches nothing
 * outside this directory.
 *
 * Structured output uses Anthropic's tool-use mechanism rather than
 * prompt-and-parse: forcing a tool call is the API's own guarantee of a valid
 * JSON object. That matters more here than it would for a short answer — an
 * 800-word draft is long enough that "reply with only JSON" genuinely breaks on
 * an unescaped quote or a stray markdown fence in the body text.
 *
 * Single key, not a pool: Gemini's pool exists because we hold five keys and
 * the ingest is quota-bound. There is one Anthropic key, so the only job here
 * is calling it correctly and failing quietly if it is ever wrong or exhausted.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export const SONNET = process.env.CLAUDE_MODEL || "claude-sonnet-5";

export interface GenerateOptions {
  model?: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

interface AnthropicToolUseBlock {
  type: "tool_use";
  input: unknown;
}
interface AnthropicTextBlock {
  type: "text";
  text: string;
}
interface AnthropicResponse {
  content?: (AnthropicToolUseBlock | AnthropicTextBlock)[];
  stop_reason?: string;
}
interface AnthropicError {
  error?: { type?: string; message?: string };
}

/** Anthropic's error `type` values, mapped to what the caller can do about it. */
function classify(status: number, body: string): { retryable: boolean; detail: string } {
  let parsed: AnthropicError | null = null;
  try {
    parsed = JSON.parse(body) as AnthropicError;
  } catch {
    // Not JSON; fall back to the status code.
  }
  const detail = parsed?.error?.message || parsed?.error?.type || `HTTP ${status}`;

  // 429 (rate limited) and 529 (overloaded) are the API's own words for "try
  // again shortly." Everything else — bad key, bad request, bad model name —
  // will not fix itself on a second attempt with the same input.
  const retryable = status === 429 || status === 529 || status >= 500;
  return { retryable, detail };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(payload: Record<string, unknown>, signal?: AbortSignal): Promise<Response | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn("[claude] no API key configured (ANTHROPIC_API_KEY)");
    return null;
  }

  const attempts = 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (res.ok) return res;

      const { retryable, detail } = classify(res.status, await res.text());
      console.warn(`[claude] request failed (${detail})${retryable ? ", retrying" : ""}`);
      if (!retryable) return null;
      await sleep(500 * 2 ** attempt);
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      console.warn(`[claude] request errored: ${(err as Error).message}`);
      await sleep(500 * 2 ** attempt);
    }
  }

  console.error("[claude] gave up after retries");
  return null;
}

/**
 * Structured output via a forced tool call. `properties` describes the shape
 * the caller wants back; omit it for a permissive object when any JSON shape
 * will do. Returns null on any failure so callers can fall back, the same
 * contract as lib/ai/gemini.ts's generateJSON.
 */
export async function generateJSON<T>(
  prompt: string,
  opts: GenerateOptions & { properties?: Record<string, unknown>; required?: string[] } = {},
): Promise<T | null> {
  const tool = {
    name: "respond",
    description: "Provide the answer in this exact structure.",
    input_schema: {
      type: "object",
      properties: opts.properties ?? {},
      ...(opts.required ? { required: opts.required } : {}),
    },
  };

  const res = await post(
    {
      model: opts.model || SONNET,
      max_tokens: opts.maxOutputTokens ?? 4096,
      temperature: opts.temperature ?? 0.4,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
      tools: [tool],
      tool_choice: { type: "tool", name: "respond" },
    },
    opts.signal,
  );
  if (!res) return null;

  const data = (await res.json()) as AnthropicResponse;
  const block = data.content?.find((c): c is AnthropicToolUseBlock => c.type === "tool_use");
  if (!block) {
    console.warn(`[claude] no tool call in response (stop_reason: ${data.stop_reason})`);
    return null;
  }

  return block.input as T;
}

/** Plain prose, for when the caller does not need structure back. */
export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string | null> {
  const res = await post(
    {
      model: opts.model || SONNET,
      max_tokens: opts.maxOutputTokens ?? 4096,
      temperature: opts.temperature ?? 0.6,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
    },
    opts.signal,
  );
  if (!res) return null;

  const data = (await res.json()) as AnthropicResponse;
  const text = data.content
    ?.filter((c): c is AnthropicTextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  return text || null;
}
