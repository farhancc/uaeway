import { beforeEach, describe, expect, it } from "vitest";
import { candidates, poolSize, reportFailure, reportSuccess, resetPool } from "@/lib/ai/pool";

describe("Gemini key pool", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEYS = "a,b,c";
    resetPool();
  });

  it("de-duplicates keys and ignores blanks", () => {
    process.env.GEMINI_API_KEYS = "a, b ,,a,";
    resetPool();
    expect(poolSize()).toBe(2);
  });

  it("starts each request at a different key so load spreads", () => {
    const first = candidates()[0].key;
    const second = candidates()[0].key;
    expect(first).not.toBe(second);
  });

  it("offers every key, so one failure is never fatal", () => {
    expect(candidates().map((s) => s.key).sort()).toEqual(["a", "b", "c"]);
  });

  it("moves a key to the back after repeated failures, without dropping it", () => {
    const state = candidates().find((s) => s.key === "b")!;
    reportFailure(state);
    reportFailure(state);

    const order = candidates().map((s) => s.key);
    expect(order).toContain("b");
    expect(order[order.length - 1]).toBe("b");
  });

  it("brings a key back once it succeeds", () => {
    const state = candidates().find((s) => s.key === "c")!;
    reportFailure(state);
    reportFailure(state);
    reportSuccess(state);

    expect(candidates().filter((s) => s.key === "c")[0].coldUntil).toBe(0);
  });

  it("returns nothing when no keys are configured", () => {
    process.env.GEMINI_API_KEYS = "";
    process.env.GEMINI_API_KEY = "";
    resetPool();
    expect(candidates()).toEqual([]);
  });
});
