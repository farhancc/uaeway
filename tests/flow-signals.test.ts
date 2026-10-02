import { describe, expect, it } from "vitest";
import { freeShare, mineSignals, type Turn } from "@/lib/chat/flow/signals";

/**
 * What the transcripts say.
 *
 * Every conversation was already being recorded and read by nobody. The mining
 * is pure so it can be checked against fixed rows — which matters, because
 * these signals are what the improver argues from, and a signal read wrongly
 * becomes a confident suggestion to change the wrong thing.
 */

const at = (minute: number) => new Date(2026, 0, 1, 12, minute);

const turn = (over: Partial<Turn> & { role: Turn["role"]; content: string }): Turn => ({
  sessionId: "s1",
  source: null,
  flowNodeId: null,
  createdAt: at(0),
  ...over,
});

describe("questions we had no answer for", () => {
  it("counts a turn the flow handed to a model", () => {
    const signals = mineSignals(
      [
        turn({ role: "user", content: "do you do police clearance" }),
        turn({ role: "model", content: "…", source: "model", flowNodeId: "fallback" }),
      ],
      new Map(),
    );
    expect(signals.gaps.map((g) => g.question)).toEqual(["do you do police clearance"]);
  });

  // One is a budget and the other an outage. Proposing answers from either
  // would be learning from our own failures rather than from what people asked.
  it("does not count a capped or unavailable turn as a gap", () => {
    const signals = mineSignals(
      [
        turn({ role: "user", content: "anything" }),
        turn({ role: "model", content: "…", source: "capped" }),
        turn({ role: "user", content: "anything else" }),
        turn({ role: "model", content: "…", source: "unavailable" }),
      ],
      new Map(),
    );
    expect(signals.gaps).toEqual([]);
  });

  it("does not attribute a question from one conversation to another", () => {
    const signals = mineSignals(
      [
        turn({ sessionId: "a", role: "user", content: "asked in a" }),
        turn({ sessionId: "b", role: "model", content: "…", source: "model" }),
      ],
      new Map(),
    );
    expect(signals.gaps).toEqual([]);
  });
});

describe("answers people did not accept", () => {
  it("notices the same question asked again straight after being answered", () => {
    const signals = mineSignals(
      [
        turn({ role: "user", content: "how much does attestation cost" }),
        turn({ role: "model", content: "…", source: "canned", flowNodeId: "n-cost" }),
        turn({ role: "user", content: "but what does the attestation actually cost me" }),
      ],
      new Map(),
    );
    expect(signals.rephrases).toEqual([
      {
        asked: "how much does attestation cost",
        thenAsked: "but what does the attestation actually cost me",
        nodeId: "n-cost",
      },
    ]);
  });

  // Moving from one topic to a related one is not a complaint, and treating it
  // as one would propose changes to answers that were right.
  it("stays quiet when they simply move on", () => {
    const signals = mineSignals(
      [
        turn({ role: "user", content: "how much does attestation cost" }),
        turn({ role: "model", content: "…", source: "canned", flowNodeId: "n-cost" }),
        turn({ role: "user", content: "and can you translate my degree into arabic" }),
      ],
      new Map(),
    );
    expect(signals.rephrases).toEqual([]);
  });
});

describe("which boxes have answered anyone", () => {
  it("collects them, so a topic nothing matches can be spotted", () => {
    const signals = mineSignals(
      [
        turn({ role: "model", content: "…", source: "canned", flowNodeId: "n-one" }),
        turn({ role: "model", content: "…", source: "canned", flowNodeId: "n-two" }),
        turn({ role: "model", content: "…", source: "canned", flowNodeId: "n-one" }),
      ],
      new Map(),
    );
    expect([...signals.servedNodes].sort()).toEqual(["n-one", "n-two"]);
  });
});

describe("how a version is doing", () => {
  const signals = mineSignals(
    [
      turn({ sessionId: "a", role: "model", content: "…", source: "canned" }),
      turn({ sessionId: "a", role: "model", content: "…", source: "canned" }),
      turn({ sessionId: "b", role: "model", content: "…", source: "model" }),
      turn({ sessionId: "c", role: "model", content: "…", source: "canned" }),
    ],
    new Map([
      ["a", "v1"],
      ["b", "v1"],
      ["c", "v2"],
    ]),
  );

  it("counts each version's replies separately", () => {
    expect(signals.versions.get("v1")).toMatchObject({ turns: 3, canned: 2, model: 1 });
    expect(signals.versions.get("v2")).toMatchObject({ turns: 1, canned: 1, model: 0 });
  });

  // The number a change to the flow is trying to move.
  it("reports how much of the work cost nothing", () => {
    expect(freeShare(signals.versions.get("v1")!)).toBeCloseTo(2 / 3);
    expect(freeShare(signals.versions.get("v2")!)).toBe(1);
    expect(freeShare({ turns: 0, model: 0, canned: 0, capped: 0, unavailable: 0 })).toBe(0);
  });

  it("ignores a session whose version we never recorded", () => {
    const orphan = mineSignals([turn({ role: "model", content: "…", source: "model" })], new Map());
    expect(orphan.versions.size).toBe(0);
  });
});
