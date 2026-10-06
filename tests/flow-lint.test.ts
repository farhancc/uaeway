import { describe, expect, it } from "vitest";
import { flowDoc } from "@/lib/chat/flow/schema";
import { lintFlow, publishable, type Finding } from "@/lib/chat/flow/lint";

/**
 * What stops a publish.
 *
 * A node canvas makes it easy to build something that looks finished and
 * answers nobody — an intent wired to no edge, a branch with no way out, a
 * start node with no fallback. Errors block the publish; warnings are the
 * author's to judge, because a half-wired node is a normal state to save in.
 */

const base = {
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "a", text: "An answer." },
    { kind: "model", id: "fallback", guidance: "" },
  ],
  edges: [
    { id: "e1", from: "start", to: "a", when: { kind: "intent", intentId: "i1" }, position: 0 },
    { id: "e2", from: "start", to: "fallback", when: { kind: "fallback" }, position: 9 },
  ],
  intents: [{ id: "i1", name: "a thing", phrases: ["a thing"] }],
  slots: [],
};

const lint = (doc: unknown) => lintFlow(flowDoc.parse(doc));
const errors = (f: Finding[]) => f.filter((x) => x.severity === "error").map((x) => x.message);
const warnings = (f: Finding[]) => f.filter((x) => x.severity === "warning").map((x) => x.message);

describe("a flow that is ready", () => {
  it("has nothing to say about it", () => {
    const findings = lint(base);
    expect(findings).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });
});

describe("errors", () => {
  // The single most consequential thing to get wrong, and the one an author is
  // least likely to notice: every question they try is one they wrote.
  it("blocks a flow where an unrecognised question gets no answer", () => {
    const findings = lint({ ...base, edges: [base.edges[0]] });
    expect(errors(findings)).toContain(
      "No fallback leaves the start node, so an unrecognised question gets no answer.",
    );
    expect(publishable(findings)).toBe(false);
  });

  it("blocks an intent that can never match", () => {
    const findings = lint({ ...base, intents: [{ id: "i1", name: "a thing" }] });
    expect(errors(findings)).toContain(
      '"a thing" has no phrases and no keywords, so it can never match.',
    );
  });

  it("blocks two edges leaving one node on the same intent", () => {
    const findings = lint({
      ...base,
      nodes: [...base.nodes, { kind: "say", id: "b", text: "Another." }],
      edges: [
        ...base.edges,
        { id: "e3", from: "start", to: "b", when: { kind: "intent", intentId: "i1" }, position: 1 },
      ],
    });
    expect(errors(findings)).toContain('Two edges leave this node on "a thing".');
  });

  it("blocks two buttons with the same label", () => {
    const findings = lint({
      ...base,
      edges: [
        ...base.edges,
        { id: "e3", from: "a", to: "fallback", when: { kind: "choice", label: "More" }, position: 0 },
        { id: "e4", from: "a", to: "start", when: { kind: "choice", label: "more" }, position: 1 },
      ],
    });
    expect(errors(findings)).toContain('Two buttons on this node are both labelled "more".');
  });

  it("blocks a question with nowhere to take the answer", () => {
    const findings = lint({
      ...base,
      nodes: [...base.nodes, { kind: "ask", id: "q", text: "Which country?", slot: "country" }],
      slots: [{ key: "country", label: "Country", kind: "text" }],
    });
    expect(errors(findings)).toContain(
      "This asks a question and then has nowhere to go with the answer.",
    );
  });

  it("blocks a branch that cannot route", () => {
    const findings = lint({ ...base, nodes: [...base.nodes, { kind: "branch", id: "b" }] });
    expect(errors(findings)).toContain("A branch with no outgoing edges cannot route anywhere.");
  });

  it("blocks a choice slot with no options to offer", () => {
    const findings = lint({
      ...base,
      nodes: [
        ...base.nodes,
        { kind: "ask", id: "q", text: "Which?", slot: "pick" },
        { kind: "say", id: "after", text: "Right." },
      ],
      slots: [{ key: "pick", label: "Pick", kind: "enum", options: [] }],
      edges: [...base.edges, { id: "e3", from: "q", to: "after", when: { kind: "always" }, position: 0 }],
    });
    expect(errors(findings)).toContain('Slot "pick" offers a choice but has no options.');
  });
});

describe("warnings", () => {
  it("mentions a node nothing leads to, without blocking the publish", () => {
    const findings = lint({
      ...base,
      nodes: [...base.nodes, { kind: "say", id: "orphan", text: "Unreachable." }],
    });
    expect(warnings(findings)).toContain("Nothing leads here, so no visitor can reach it.");
    expect(publishable(findings)).toBe(true);
  });

  it("mentions an intent wired to nothing", () => {
    const findings = lint({
      ...base,
      intents: [...base.intents, { id: "i2", name: "unused", phrases: ["unused"] }],
    });
    expect(warnings(findings)).toContain(
      '"unused" is not wired to any edge, so matching it does nothing.',
    );
  });

  // An answer with no follow-ups is not a dead end: suggestions top up from the
  // start node, which is exactly what stops it being one.
  it("says nothing about an answer with no outgoing edges", () => {
    expect(lint(base)).toEqual([]);
  });
});
