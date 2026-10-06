import { describe, expect, it } from "vitest";
import { embeddablePhrases, flowDoc, indexFlow } from "@/lib/chat/flow/schema";

/**
 * What a flow document may be.
 *
 * The rule this file exists to hold: referential integrity is *storage*, not
 * advice. An edge pointing at a node that is not there is corruption, and the
 * builder must not be able to save it — whereas an unreachable node is merely a
 * mistake, and `lint.ts` reports that one so you can save halfway through
 * fixing it.
 */

const base = {
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "a", text: "Attestation starts in the issuing country." },
  ],
  edges: [
    { id: "e1", from: "start", to: "a", when: { kind: "intent", intentId: "i1" } },
  ],
  intents: [{ id: "i1", name: "attestation", phrases: ["attest my degree"] }],
  slots: [],
};

const parse = (doc: unknown) => flowDoc.safeParse(doc);

describe("a document that can be stored", () => {
  it("accepts the smallest real flow and fills the defaults", () => {
    const result = parse(base);
    expect(result.success).toBe(true);

    const doc = result.success ? result.data : null;
    expect(doc?.edges[0].position).toBe(0);
    expect(doc?.edges[0].when).toEqual({ kind: "intent", intentId: "i1" });
    expect(doc?.nodes[1]).toMatchObject({ serviceSlug: null, faqQuestion: null });
    expect(doc?.intents[0].hintKeywords).toEqual([]);
  });

  it("keeps a readable edge id built from two slugs", () => {
    const doc = {
      ...base,
      edges: [{ ...base.edges[0], id: "e-visa-processing-timeline-choice-degree-or-diploma-2" }],
    };
    expect(parse(doc).success).toBe(true);
  });
});

describe("references must resolve", () => {
  it("rejects an edge into a node that is not there", () => {
    const doc = { ...base, edges: [{ ...base.edges[0], to: "ghost" }] };
    expect(parse(doc).success).toBe(false);
  });

  it("rejects an edge on an intent that is not there", () => {
    const doc = { ...base, edges: [{ ...base.edges[0], when: { kind: "intent", intentId: "i9" } }] };
    expect(parse(doc).success).toBe(false);
  });

  it("rejects a branch on a slot nothing declares", () => {
    const doc = {
      ...base,
      edges: [
        { id: "e1", from: "start", to: "a", when: { kind: "slot", slot: "country", op: "exists" } },
      ],
    };
    expect(parse(doc).success).toBe(false);
  });

  it("rejects an ask that writes a slot nothing declares", () => {
    const doc = {
      ...base,
      nodes: [...base.nodes, { kind: "ask", id: "q", text: "Which country?", slot: "country" }],
    };
    expect(parse(doc).success).toBe(false);
  });

  it("accepts the same ask once the slot is declared", () => {
    const doc = {
      ...base,
      nodes: [...base.nodes, { kind: "ask", id: "q", text: "Which country?", slot: "country" }],
      slots: [{ key: "country", label: "Issuing country", kind: "text" }],
    };
    expect(parse(doc).success).toBe(true);
  });
});

describe("identity", () => {
  it("rejects two nodes on one id", () => {
    const doc = { ...base, nodes: [...base.nodes, { kind: "say", id: "a", text: "Twice." }] };
    expect(parse(doc).success).toBe(false);
  });

  it("rejects two intents on one id", () => {
    const doc = { ...base, intents: [...base.intents, { id: "i1", name: "again" }] };
    expect(parse(doc).success).toBe(false);
  });

  // Not one, not two: a conversation has one place it begins, and everything
  // global — the openers, the fallback — hangs off it.
  it("insists on exactly one start node", () => {
    expect(parse({ ...base, nodes: [base.nodes[1]] }).success).toBe(false);
    expect(parse({ ...base, nodes: [...base.nodes, { kind: "start", id: "s2" }] }).success).toBe(false);
  });
});

describe("indexFlow", () => {
  it("orders a node's outgoing edges by position, not by array order", () => {
    const doc = flowDoc.parse({
      ...base,
      nodes: [...base.nodes, { kind: "say", id: "b", text: "Second." }],
      intents: [...base.intents, { id: "i2", name: "translation" }],
      edges: [
        { id: "e2", from: "start", to: "b", when: { kind: "intent", intentId: "i2" }, position: 5 },
        { id: "e1", from: "start", to: "a", when: { kind: "intent", intentId: "i1" }, position: 1 },
      ],
    });

    expect(indexFlow(doc).out.get("start")?.map((e) => e.id)).toEqual(["e1", "e2"]);
  });
});

describe("embeddablePhrases", () => {
  it("includes the intent name, and says each phrase once", () => {
    const doc = flowDoc.parse({
      ...base,
      intents: [
        { id: "i1", name: "attestation", phrases: ["attest my degree", "Attest My Degree"] },
      ],
    });

    expect(embeddablePhrases(doc)).toEqual(["attestation", "attest my degree"]);
  });
});
