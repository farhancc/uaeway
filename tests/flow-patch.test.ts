import { describe, expect, it } from "vitest";
import { flowDoc } from "@/lib/chat/flow/schema";
import { applyPatch, fingerprint, flowPatch, PatchFailed } from "@/lib/chat/flow/patch";

/** `flowPatch` is a union, so a test that reads `question` has to say which
 *  member it parsed. */
function addAnswerPatch(input: unknown) {
  const parsed = flowPatch.parse(input);
  if (parsed.op !== "addAnswer") throw new Error("expected an addAnswer patch");
  return parsed;
}

/**
 * The wall between "a model suggested something" and "the graph changed".
 *
 * Every proposal passes through `flowPatch.parse()` and then through
 * `applyPatch`, which re-parses the whole document on the way out. An operation
 * the model invents, a field it mistypes or an intent id it makes up fails
 * here, before anyone is asked to approve it.
 */

const doc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "n-cost", text: "Fees vary by country.", serviceSlug: "attestation" },
    { kind: "model", id: "fallback", guidance: "" },
  ],
  intents: [
    { id: "i-cost", name: "How much does attestation cost?", phrases: ["attestation fees"] },
    { id: "i-dead", name: "never matched", phrases: ["never matched"] },
  ],
  slots: [],
  edges: [
    { id: "e1", from: "start", to: "n-cost", when: { kind: "intent", intentId: "i-cost" }, position: 0 },
    { id: "e2", from: "start", to: "fallback", when: { kind: "intent", intentId: "i-dead" }, position: 1 },
    { id: "e3", from: "start", to: "fallback", when: { kind: "fallback" }, position: 9 },
  ],
});

describe("what a patch may be", () => {
  it("rejects an operation nobody defined", () => {
    expect(flowPatch.safeParse({ op: "deleteEverything" }).success).toBe(false);
    expect(flowPatch.safeParse({ op: "rewordNode", nodeId: "n-cost", text: "…" }).success).toBe(false);
  });

  it("rejects an empty or malformed phrase list", () => {
    expect(flowPatch.safeParse({ op: "addPhrases", intentId: "i-cost", phrases: [] }).success).toBe(false);
    expect(flowPatch.safeParse({ op: "addPhrases", intentId: "i-cost", phrases: [5] }).success).toBe(false);
  });
});

describe("teaching a topic another phrasing", () => {
  const patch = flowPatch.parse({
    op: "addPhrases",
    intentId: "i-cost",
    phrases: ["what do the stamps cost", "attestation fees"],
  });

  it("adds what is new and leaves what is already there", () => {
    const after = applyPatch(doc, patch);
    const intent = after.intents.find((i) => i.id === "i-cost")!;
    expect(intent.phrases).toEqual(["attestation fees", "what do the stamps cost"]);
  });

  it("changes nothing a visitor reads", () => {
    const after = applyPatch(doc, patch);
    expect(after.nodes).toEqual(doc.nodes);
    expect(after.edges).toEqual(doc.edges);
  });

  it("fails on a topic that is not there, rather than inventing one", () => {
    const bad = flowPatch.parse({ op: "addPhrases", intentId: "i-ghost", phrases: ["anything"] });
    expect(() => applyPatch(doc, bad)).toThrow(PatchFailed);
  });
});

describe("answering something new", () => {
  // Narrowed at the point of parsing, so the assertions below can read the
  // fields this operation actually has.
  const patch = addAnswerPatch({
    op: "addAnswer",
    question: "Do you handle police clearance certificates?",
    answerMd: "Yes — a police clearance certificate goes through the same chain of stamps.",
    serviceSlug: "attestation",
    phrases: ["pcc attestation"],
  });

  it("adds a box, a topic and the arrow that reaches it", () => {
    const after = applyPatch(doc, patch);
    expect(after.nodes).toHaveLength(doc.nodes.length + 1);
    expect(after.intents).toHaveLength(doc.intents.length + 1);

    const added = after.nodes.find((n) => n.kind === "say" && n.faqQuestion === patch.question);
    expect(added).toBeDefined();
    expect(after.edges.some((e) => e.to === added!.id && e.from === "start")).toBe(true);
  });

  it("puts it behind everything an author placed, and ahead of the fallback", () => {
    const after = applyPatch(doc, patch);
    const added = after.edges.find((e) => e.id.startsWith("e-start-n-do-you-handle"))!;
    expect(added.position).toBeGreaterThan(1);
    expect(added.position).toBeLessThan(9999);
  });

  it("does not collide with a box that is already there", () => {
    const once = applyPatch(doc, patch);
    const twice = applyPatch(once, patch);
    expect(new Set(twice.nodes.map((n) => n.id)).size).toBe(twice.nodes.length);
    expect(new Set(twice.intents.map((i) => i.id)).size).toBe(twice.intents.length);
  });
});

describe("retiring a topic", () => {
  it("takes its arrows with it, because the schema refuses an orphaned one", () => {
    const after = applyPatch(doc, flowPatch.parse({ op: "retireIntent", intentId: "i-dead" }));
    expect(after.intents.map((i) => i.id)).toEqual(["i-cost"]);
    expect(after.edges.map((e) => e.id)).toEqual(["e1", "e3"]);
  });

  it("leaves the fallback alone, so unrecognised questions still get an answer", () => {
    const after = applyPatch(doc, flowPatch.parse({ op: "retireIntent", intentId: "i-cost" }));
    expect(after.edges.some((e) => e.when.kind === "fallback")).toBe(true);
  });
});

describe("fingerprints", () => {
  // What stops a suggestion someone rejected arriving again every night.
  it("are the same however the phrases are ordered or written", () => {
    const a = flowPatch.parse({ op: "addPhrases", intentId: "i", phrases: ["One thing", "another"] });
    const b = flowPatch.parse({ op: "addPhrases", intentId: "i", phrases: ["another", "one thing!"] });
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("differ between topics", () => {
    const a = flowPatch.parse({ op: "retireIntent", intentId: "i-one" });
    const b = flowPatch.parse({ op: "retireIntent", intentId: "i-two" });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});
