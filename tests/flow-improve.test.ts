import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The nightly loop, end to end, with the model and the database stubbed.
 *
 * Two properties matter more than anything else here, and both are about
 * limiting what the model is allowed to be the source of:
 *
 *  - phrasings added to an existing topic are the **visitors' own words**;
 *  - an answer is drafted only from **our own approved content**, and when the
 *    site does not cover the question, the gap is reported rather than filled.
 */

const generateJSON = vi.fn();
const generateText = vi.fn();
const embed = vi.fn();
const recordProposals = vi.fn(async (items: unknown[]) => items.length);
const loadSignals = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({ generateJSON, generateText }));
vi.mock("@/lib/ai/embed", () => ({
  embed,
  similarity: (a: number[], b: number[]) => a.reduce((t, v, i) => t + v * b[i], 0),
  EMBED_MODEL: "test",
  EMBED_DIMS: 3,
  embedOne: async () => null,
}));
vi.mock("@/lib/chat/flow/signals", () => ({ loadSignals }));
vi.mock("@/lib/chat/flow/proposals", () => ({
  recordProposals,
  knownFingerprints: async () => new Set<string>(),
}));
vi.mock("@/lib/chat/retrieve", () => ({
  retrieve: async () => [],
  renderContext: () => "(site content)",
}));

const { flowDoc, indexFlow } = await import("@/lib/chat/flow/schema");

const doc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "n-cost", text: "Fees vary.", serviceSlug: "attestation" },
    { kind: "model", id: "fallback", guidance: "" },
  ],
  intents: [{ id: "i-cost", name: "How much does attestation cost?", phrases: ["attestation fees"] }],
  slots: [],
  edges: [
    { id: "e1", from: "start", to: "n-cost", when: { kind: "intent", intentId: "i-cost" }, position: 0 },
    { id: "e2", from: "start", to: "fallback", when: { kind: "fallback" }, position: 9 },
  ],
});

vi.mock("@/lib/chat/flow/store", () => ({
  loadLiveFlow: async () => ({ id: "v1", version: 1, flow: indexFlow(doc) }),
}));
vi.mock("@/lib/chat/flow/vectors", async () => {
  const actual = await vi.importActual<typeof import("@/lib/chat/flow/vectors")>(
    "@/lib/chat/flow/vectors",
  );
  return { ...actual, loadFlowVectors: async () => new Map([["attestation fees", [1, 0, 0]]]) };
});

const { improveFlow } = await import("@/lib/chat/flow/improve");

/** Two questions asking the same thing, which is what a cluster is. */
const gaps = [
  { question: "what does the stamping cost me", sessionId: "a", at: new Date() },
  { question: "how much for the stamps", sessionId: "b", at: new Date() },
];

const noSignals = { gaps: [], rephrases: [], servedNodes: new Set<string>(), versions: new Map() };

beforeEach(() => {
  generateJSON.mockReset();
  generateText.mockReset();
  recordProposals.mockClear();
  // Both questions on the same axis, so they cluster; the flow's phrase sits
  // elsewhere, so they did not match it.
  embed.mockResolvedValue([
    [0, 1, 0],
    [0, 1, 0],
  ]);
  loadSignals.mockResolvedValue({ ...noSignals, gaps });
});

const proposed = () => recordProposals.mock.calls[0][0] as {
  patch: Record<string, unknown> | null;
  evidence: string[];
}[];

describe("a gap that is an existing topic in other words", () => {
  it("proposes the visitors' own phrasings, not the model's", async () => {
    generateJSON.mockResolvedValue({ topic: 1 });

    const report = await improveFlow();
    expect(report.clusters).toBe(1);

    const [only] = proposed();
    expect(only.patch).toMatchObject({ op: "addPhrases", intentId: "i-cost" });
    // Verbatim from the transcript. The model only chose which topic.
    expect(only.patch!.phrases).toEqual([
      "what does the stamping cost me",
      "how much for the stamps",
    ]);
  });

  it("carries the transcript, so it can be judged on its evidence", async () => {
    generateJSON.mockResolvedValue({ topic: 1 });
    await improveFlow();
    expect(proposed()[0].evidence).toEqual(gaps.map((g) => g.question));
  });
});

describe("a gap nothing covers", () => {
  it("drafts an answer from the site's own content", async () => {
    generateJSON.mockResolvedValue({ topic: 0, question: "Do you do police clearance?", service: "attestation" });
    generateText.mockResolvedValue("Yes — a police clearance certificate takes the same route.");

    await improveFlow();
    expect(proposed()[0].patch).toMatchObject({
      op: "addAnswer",
      question: "Do you do police clearance?",
      serviceSlug: "attestation",
    });
  });

  // The rule the public pages follow: if we have not confirmed it, we do not
  // say it. An invented answer about attestation is worse than a gap on a list.
  it("reports the gap rather than inventing an answer the site cannot support", async () => {
    generateJSON.mockResolvedValue({ topic: 0, question: "Do you do police clearance?", service: null });
    generateText.mockResolvedValue("NOTHING");

    await improveFlow();
    const [only] = proposed();
    expect(only.patch).toBeNull();
    expect(only.evidence).toEqual(gaps.map((g) => g.question));
  });

  it("refuses a service that is not one of ours", async () => {
    generateJSON.mockResolvedValue({ topic: 0, question: "Something else?", service: "made-up-service" });
    generateText.mockResolvedValue("An answer drawn from the site.");

    await improveFlow();
    expect(proposed()[0].patch).toMatchObject({ serviceSlug: null });
  });
});

describe("when the model will not cooperate", () => {
  it("proposes nothing rather than guessing", async () => {
    generateJSON.mockResolvedValue(null);
    const report = await improveFlow();
    expect(report.unresolved).toBe(1);
    expect(report.proposals).toBe(0);
  });

  it("ignores a topic number that is not on the list it was given", async () => {
    generateJSON.mockResolvedValue({ topic: 99 });
    const report = await improveFlow();
    // Falls through to "new question", and there is none, so nothing is built.
    expect(report.proposals).toBe(0);
  });
});

describe("one person asking once", () => {
  it("is not yet a reason to change the flow", async () => {
    loadSignals.mockResolvedValue({ ...noSignals, gaps: [gaps[0]] });
    embed.mockResolvedValue([[0, 1, 0]]);

    const report = await improveFlow();
    expect(report.clusters).toBe(0);
    expect(generateJSON).not.toHaveBeenCalled();
  });
});
