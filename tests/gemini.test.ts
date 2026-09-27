import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { poolStatus, resetPool } from "@/lib/ai/pool";
import { generateText, streamChat } from "@/lib/ai/gemini";

/**
 * Key rotation, which is the whole reason for holding several keys.
 *
 * The cases below are the two that actually bit: a rejected key answers 400 and
 * used to abort the entire request, and an exhausted key answers 429 and used
 * to come back a minute later to fail again.
 */

const ok = () =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "hello" }] } }] }), {
    status: 200,
  });

const invalidKey = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 400,
        message: "API key not valid. Please pass a valid API key.",
        status: "INVALID_ARGUMENT",
        details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID" }],
      },
    }),
    { status: 400 },
  );

const dailyQuota = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota.",
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
          },
        ],
      },
    }),
    { status: 429 },
  );

const perMinute = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [{ quotaId: "GenerateRequestsPerMinutePerProject" }],
          },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "12s" },
        ],
      },
    }),
    { status: 429 },
  );

const badPayload = () =>
  new Response(
    JSON.stringify({ error: { code: 400, message: "Invalid JSON payload", status: "INVALID_ARGUMENT" } }),
    { status: 400 },
  );

const fetchMock = vi.fn();

function keyUsed(call: number): string {
  const init = fetchMock.mock.calls[call][1] as { headers: Record<string, string> };
  return init.headers["x-goog-api-key"];
}

beforeEach(() => {
  process.env.GEMINI_API_KEYS = "keyAAAA,keyBBBB,keyCCCC";
  resetPool();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a rejected key", () => {
  it("does not take the other keys down with it", async () => {
    // Gemini answers 400 for a bad key. The old code read any 400 as "our
    // payload is wrong" and gave up without trying key two.
    fetchMock.mockResolvedValueOnce(invalidKey()).mockResolvedValueOnce(ok());

    expect(await generateText("hi")).toBe("hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(keyUsed(0)).not.toBe(keyUsed(1));
  });

  it("is benched for far longer than a blip", async () => {
    fetchMock.mockResolvedValueOnce(invalidKey()).mockResolvedValueOnce(ok());
    await generateText("hi");

    const benched = poolStatus().find((k) => !k.usable);
    expect(benched?.reason).toBe("invalid");
    expect(benched?.benchedForSeconds).toBeGreaterThan(60 * 60);
  });
});

describe("a key that is out of credit", () => {
  it("stops being tried for an hour, not a minute", async () => {
    // The reported problem: an exhausted key came back every 60 seconds and
    // failed again all day.
    fetchMock.mockResolvedValueOnce(dailyQuota()).mockResolvedValueOnce(ok());

    expect(await generateText("hi")).toBe("hello");

    const benched = poolStatus().find((k) => !k.usable);
    expect(benched?.reason).toBe("exhausted");
    expect(benched?.benchedForSeconds).toBeGreaterThan(30 * 60);
  });

  it("is not confused with a per-minute rate limit", async () => {
    fetchMock.mockResolvedValueOnce(perMinute()).mockResolvedValueOnce(ok());
    await generateText("hi");

    const benched = poolStatus().find((k) => !k.usable);
    expect(benched?.reason).toBe("rate-limited");
    // The API said 12 seconds, so we wait 12 seconds rather than our default.
    expect(benched?.benchedForSeconds).toBeLessThanOrEqual(12);
  });
});

describe("a request that is our own fault", () => {
  it("stops immediately instead of burning every key", async () => {
    fetchMock.mockResolvedValue(badPayload());

    expect(await generateText("hi")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(poolStatus().every((k) => k.usable)).toBe(true);
  });
});

describe("when every key is down", () => {
  it("gives up rather than looping, and says so", async () => {
    fetchMock.mockResolvedValue(dailyQuota());
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await generateText("hi")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(error.mock.calls[0][0]).toContain("every key failed");
    expect(error.mock.calls[0][0]).toContain("exhausted");
  });

  it("never writes a key into the logs", async () => {
    fetchMock.mockResolvedValue(dailyQuota());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await generateText("hi");

    const logged = [...warn.mock.calls, ...error.mock.calls].flat().join(" ");
    expect(logged).not.toContain("keyAAAA");
    expect(logged).toContain("…AAAA");
  });
});

/**
 * Frame splitting, which is what carries every word the chatbot says.
 *
 * Gemini separates SSE frames with CRLF. The parser split on "\n\n", which does
 * not occur in "\r\n\r\n", so every frame stayed buffered and the chat streamed
 * nothing at all — and because the request itself succeeded, no log said so.
 * Both endings are asserted: whichever one the API stops sending, the other
 * must keep working.
 */
describe("streaming replies", () => {
  const sse = (chunks: string[], sep: string) =>
    chunks
      .map((text) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}`)
      .join(sep) + sep;

  const streamed = (payload: string) =>
    new Response(new Blob([payload]).stream(), { status: 200 });

  const collect = async () => {
    let out = "";
    for await (const chunk of streamChat([{ role: "user", text: "hi" }])) out += chunk;
    return out;
  };

  it("reads frames separated by CRLF, which is what Gemini sends", async () => {
    fetchMock.mockResolvedValue(streamed(sse(["Attestation ", "takes a while."], "\r\n\r\n")));
    expect(await collect()).toBe("Attestation takes a while.");
  });

  it("still reads frames separated by LF", async () => {
    fetchMock.mockResolvedValue(streamed(sse(["Attestation ", "takes a while."], "\n\n")));
    expect(await collect()).toBe("Attestation takes a while.");
  });

  it("holds a frame split across two network chunks until it is whole", async () => {
    const payload = sse(["Half ", "a frame."], "\r\n\r\n");
    const cut = Math.floor(payload.length * 0.6);
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            const bytes = new TextEncoder().encode(payload);
            controller.enqueue(bytes.slice(0, cut));
            controller.enqueue(bytes.slice(cut));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );
    expect(await collect()).toBe("Half a frame.");
  });
});
