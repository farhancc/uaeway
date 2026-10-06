import { describe, expect, it } from "vitest";
import { flowDoc, type FlowDoc } from "@/lib/chat/flow/schema";
import { arrange } from "@/lib/chat/flow/layout";

/**
 * Where the boxes go.
 *
 * The rule is "a block per service", and it is worth saying why, because the
 * obvious rule is a different one. Measured on the real flow: forty-one of its
 * ninety-five arrows leave the start box, and no arrangement shortens those.
 * What an arrangement *can* shorten is the follow-ups within a service — and
 * laying boxes out by distance from the start, which is what a flowchart
 * usually wants, scattered each service and took those from 23 long to 33.
 * Keeping a service together took them to 18.
 */

const say = (id: string, serviceSlug: string | null) => ({
  kind: "say",
  id,
  text: `${id}.`,
  serviceSlug,
  position: { x: 0, y: 0 },
});

const doc: FlowDoc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start", position: { x: 900, y: 40 } },
    say("visa-a", "visa"),
    say("visa-b", "visa"),
    say("visa-c", "visa"),
    say("attest-a", "attestation"),
    say("shared", null),
    { kind: "model", id: "fallback", guidance: "", position: { x: 0, y: 0 } },
  ],
  intents: [{ id: "i", name: "topic", phrases: ["topic"] }],
  slots: [],
  edges: [
    { id: "e1", from: "start", to: "visa-a", when: { kind: "intent", intentId: "i" }, position: 0 },
    { id: "e2", from: "start", to: "attest-a", when: { kind: "always" }, position: 1 },
    { id: "e3", from: "start", to: "fallback", when: { kind: "fallback" }, position: 9 },
    // A chain inside one service: a → b → c.
    { id: "e4", from: "visa-a", to: "visa-b", when: { kind: "always" }, position: 0 },
    { id: "e5", from: "visa-b", to: "visa-c", when: { kind: "always" }, position: 0 },
  ],
});

const arranged = arrange(doc);
const at = (id: string) => arranged.nodes.find((n) => n.id === id)!.position;

describe("arranging a flow", () => {
  it("puts the start box on its own at the left", () => {
    expect(at("start")).toEqual({ x: 0, y: 0 });
    for (const node of arranged.nodes) {
      if (node.id !== "start") expect(node.position.x).toBeGreaterThan(0);
    }
  });

  it("keeps a service's boxes in one column", () => {
    expect(at("visa-a").x).toBe(at("visa-b").x);
    expect(at("visa-b").x).toBe(at("visa-c").x);
  });

  it("gives another service its own column", () => {
    expect(at("attest-a").x).not.toBe(at("visa-a").x);
  });

  // The point of walking the chains: an answer leading to a question leading to
  // a handoff should be three boxes in a row, because then those arrows are one
  // row apart and get drawn rather than tagged.
  it("puts a chain in consecutive rows, so its arrows stay short", () => {
    expect(at("visa-b").y - at("visa-a").y).toBe(at("visa-c").y - at("visa-b").y);
    expect(Math.abs(at("visa-b").y - at("visa-a").y)).toBeLessThan(220);
  });

  it("puts the boxes that belong to no service after the named ones", () => {
    expect(at("shared").x).toBeGreaterThan(at("visa-a").x);
    expect(at("fallback").x).toBeGreaterThan(at("attest-a").x);
  });

  // A column taller than the screen is one you scroll rather than read; the
  // first attempt at this produced one 4,800px tall.
  it("wraps a block instead of growing a column past seven rows", () => {
    const many = flowDoc.parse({
      ...doc,
      nodes: [
        doc.nodes[0],
        ...Array.from({ length: 10 }, (_, i) => say(`n${i}`, "visa")),
      ],
      edges: [{ id: "e", from: "start", to: "n0", when: { kind: "fallback" }, position: 0 }],
    });

    const placed = arrange(many).nodes.filter((n) => n.kind !== "start");
    const columns = new Set(placed.map((n) => n.position.x));
    expect(columns.size).toBeGreaterThan(1);
    for (const x of columns) {
      expect(placed.filter((n) => n.position.x === x)).toHaveLength(5);
    }
  });

  it("changes nothing but positions", () => {
    expect(arranged.edges).toEqual(doc.edges);
    expect(arranged.nodes.map((n) => n.id)).toEqual(doc.nodes.map((n) => n.id));
  });

  it("leaves a flow with no start alone rather than guessing", () => {
    const headless = { ...doc, nodes: doc.nodes.filter((n) => n.kind !== "start") };
    expect(arrange(headless)).toBe(headless);
  });
});
