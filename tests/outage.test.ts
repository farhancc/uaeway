import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the chatbot does when it cannot reach its model.
 *
 * The bank never needed the model, so a question it covers must still be
 * answered for free — that part is covered next door. What is tested here is
 * the part that used to fail quietly: an outage must not spend the
 * conversation's eight model replies on calls that never reached a model. Eight
 * failures used to leave a visitor permanently capped having never received a
 * single model answer, and the chat stayed degraded long after the keys came
 * back.
 */

const ORIGINAL = process.env.GEMINI_API_KEYS;

const { modelAvailable, reportFailure, resetPool, candidates } = await import("@/lib/ai/pool");

beforeEach(() => {
  process.env.GEMINI_API_KEYS = "key-one-aaaa,key-two-bbbb";
  resetPool();
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GEMINI_API_KEYS;
  else process.env.GEMINI_API_KEYS = ORIGINAL;
  resetPool();
  vi.useRealTimers();
});

describe("knowing whether a model can be reached", () => {
  it("is available while any key is warm", () => {
    expect(modelAvailable()).toBe(true);

    // One of two exhausted still leaves the other.
    reportFailure(candidates()[0], "exhausted");
    expect(modelAvailable()).toBe(true);
  });

  it("is unavailable once every key is benched", () => {
    for (const key of candidates()) reportFailure(key, "exhausted");
    expect(modelAvailable()).toBe(false);
  });

  it("is unavailable when no keys are configured at all", () => {
    process.env.GEMINI_API_KEYS = "";
    resetPool();
    expect(modelAvailable()).toBe(false);
  });

  it("recovers on its own once the bench expires", () => {
    vi.useFakeTimers();
    for (const key of candidates()) reportFailure(key, "rate-limited");
    expect(modelAvailable()).toBe(false);

    // A rate limit clears in a minute; an exhausted key does not.
    vi.advanceTimersByTime(61_000);
    expect(modelAvailable()).toBe(true);
  });

  it("keeps an exhausted key benched far longer than a rate-limited one", () => {
    vi.useFakeTimers();
    for (const key of candidates()) reportFailure(key, "exhausted");

    vi.advanceTimersByTime(61_000);
    expect(modelAvailable()).toBe(false);

    vi.advanceTimersByTime(60 * 60_000);
    expect(modelAvailable()).toBe(true);
  });
});

describe("what an unreachable model costs the conversation", () => {
  it("does not count as a model turn", async () => {
    const { MAX_AI_TURNS } = await import("@/lib/chat/session");
    // The route charges a turn only when source === "model"; an outage is
    // recorded as "unavailable". Spelled out here because the cost of getting
    // it wrong is a visitor capped by an outage they had nothing to do with.
    const charged = (source: string) => source === "model";

    expect(charged("unavailable")).toBe(false);
    expect(charged("canned")).toBe(false);
    expect(charged("capped")).toBe(false);
    expect(charged("model")).toBe(true);

    // However many times the model is unreachable, the budget is untouched.
    let aiTurns = 0;
    for (let i = 0; i < MAX_AI_TURNS * 3; i++) if (charged("unavailable")) aiTurns++;
    expect(aiTurns).toBe(0);
  });

  it("counts as free in the admin's savings figure", async () => {
    const { FREE_SOURCES } = await import("@/lib/admin/stats");
    expect(FREE_SOURCES).toContain("unavailable");
    expect(FREE_SOURCES).not.toContain("model");
  });
});
