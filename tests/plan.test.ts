import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/chat/session";

/** How each turn gets routed: the decision that controls both the bill and
 *  whether the bot ever answers the wrong question. */

const answer = {
  id: "1",
  slug: "attestation-photocopy",
  question: "Can you attest a photocopy?",
  answer_md: "No. Attestation is performed on the original document.",
  service_slug: "attestation",
  keywords: ["attest photocopy"],
  follow_up_slugs: [],
  is_opener: true,
  show_on_page: true,
  position: 0,
};

vi.mock("@/lib/chat/answers", () => ({
  getAnswer: async (slug: string) => (slug === answer.slug ? answer : null),
  matchAnswer: async (text: string) =>
    text.includes("photocopy") ? { answer, score: 9, confident: true } : null,
  // The exact-trigger pass runs ahead of the scored one. These cases are about
  // the scored path, so nothing here triggers.
  matchTriggers: async (text: string) => (text.includes("visa cost") ? answer : null),
}));

const retrieve = vi.fn(async () => []);
vi.mock("@/lib/chat/retrieve", () => ({
  retrieve,
  renderContext: () => "(context)",
}));

const { planReply } = await import("@/lib/chat/plan");
const { MAX_AI_TURNS } = await import("@/lib/chat/session");

const session = (aiTurns: number): Session => ({
  id: "s1",
  turnCount: 1,
  aiTurns,
  // The bank's planner does not read the flow cursor; it is here because a
  // session carries one from the turn the flow takes over.
  flowVersionId: null,
  flowState: { nodeId: null, slots: {}, visited: [], pending: null },
});

describe("planning a reply", () => {
  it("answers a tapped suggestion from the bank", async () => {
    const plan = await planReply("", "attestation-photocopy", session(0), []);
    expect(plan.kind).toBe("canned");
    expect(plan.kind === "canned" && plan.viaChip).toBe(true);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("answers a confident typed match from the bank", async () => {
    const plan = await planReply("can you attest a photocopy", undefined, session(0), []);
    expect(plan.kind).toBe("canned");
    expect(plan.kind === "canned" && plan.viaChip).toBe(false);
  });

  it("sends an unmatched question to the model", async () => {
    const plan = await planReply("what is a free zone establishment card", undefined, session(0), []);
    expect(plan.kind).toBe("model");
  });

  it("stops calling the model once a conversation has used its budget", async () => {
    const plan = await planReply("another brand new question", undefined, session(MAX_AI_TURNS), []);
    expect(plan.kind).toBe("capped");
  });

  it("still answers from the bank after the budget is gone", async () => {
    // A capped conversation must stay useful: suggestions keep working.
    const plan = await planReply("", "attestation-photocopy", session(MAX_AI_TURNS), []);
    expect(plan.kind).toBe("canned");
  });

  it("handles a suggestion pointing at a retired answer", async () => {
    const plan = await planReply("", "since-removed", session(0), []);
    expect(plan.kind).toBe("retired");
  });

  it("uses the typed words when a retired suggestion came with a question", async () => {
    const plan = await planReply("can you attest a photocopy", "since-removed", session(0), []);
    expect(plan.kind).toBe("canned");
  });
});

/**
 * Order of precedence.
 *
 * An exact trigger is an author saying "when they ask this, say that". The
 * scored matcher is a guess about what they probably meant. A guess must never
 * beat an instruction.
 */
describe("exact triggers", () => {
  it("answers from a trigger before the scored matcher is consulted", async () => {
    const plan = await planReply("what does a visa cost", undefined, session(0), []);
    expect(plan.kind).toBe("canned");
    if (plan.kind === "canned") expect(plan.viaChip).toBe(false);
  });

  it("still reaches the model when nothing triggers and nothing scores", async () => {
    const plan = await planReply("tell me about camel racing", undefined, session(0), []);
    expect(plan.kind).toBe("model");
  });
});
