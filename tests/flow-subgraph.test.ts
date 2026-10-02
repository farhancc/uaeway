import { describe, expect, it } from "vitest";
import { flowDoc } from "@/lib/chat/flow/schema";
import { servicesInFlow, subgraphFor } from "@/lib/chat/flow/subgraph";

/**
 * "Show me what happens for visa processing."
 *
 * Forty-two boxes is past the point where that can be answered by looking, so
 * it is answered by this. Forward without limit, backwards by exactly one — and
 * that asymmetry is the whole rule: everything downstream is part of this
 * service's conversation, while everything upstream is eventually the entire
 * flow.
 */

const doc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "visa-cost", text: "Visa fees vary.", serviceSlug: "visa" },
    { kind: "qualify", id: "q-visa", serviceId: "visa" },
    { kind: "handoff", id: "h-visa", text: "We will call.", serviceSlug: "visa" },
    { kind: "say", id: "shared", text: "Everyone needs a medical." },
    { kind: "say", id: "attest", text: "Attestation is a chain of stamps.", serviceSlug: "attestation" },
    { kind: "model", id: "fallback", guidance: "" },
  ],
  intents: [
    { id: "i-visa", name: "visa", phrases: ["visa"] },
    { id: "i-attest", name: "attestation", phrases: ["attest"] },
  ],
  slots: [],
  edges: [
    { id: "e1", from: "start", to: "visa-cost", when: { kind: "intent", intentId: "i-visa" }, position: 0 },
    { id: "e2", from: "start", to: "attest", when: { kind: "intent", intentId: "i-attest" }, position: 1 },
    { id: "e3", from: "start", to: "fallback", when: { kind: "fallback" }, position: 9 },
    { id: "e4", from: "visa-cost", to: "q-visa", when: { kind: "choice", label: "Quote" }, position: 0 },
    { id: "e5", from: "q-visa", to: "h-visa", when: { kind: "always" }, position: 0 },
    { id: "e6", from: "h-visa", to: "shared", when: { kind: "always" }, position: 0 },
    // Leads *into* the service from elsewhere.
    { id: "e7", from: "attest", to: "visa-cost", when: { kind: "intent", intentId: "i-visa" }, position: 0 },
  ],
});

const shown = (service: string) => [...subgraphFor(doc, service)].sort();

describe("one service's conversation", () => {
  it("takes the boxes that belong to it, whichever way they say so", () => {
    // `serviceSlug` on a say and a handoff, `serviceId` on a qualify.
    expect(shown("visa")).toEqual(expect.arrayContaining(["visa-cost", "q-visa", "h-visa"]));
  });

  it("follows the arrows forward as far as they go", () => {
    // Reached only through q-visa → h-visa → shared, and belongs to no service.
    expect(shown("visa")).toContain("shared");
  });

  it("shows one hop back, so you can see how people arrive", () => {
    expect(shown("visa")).toContain("attest");
  });

  // Everything upstream is, eventually, the whole flow.
  it("does not keep walking backwards past that one hop", () => {
    expect(shown("visa")).not.toContain("fallback");
  });

  // Attestation links to a visa answer. Following that through would return the
  // whole visa qualification, which is most of the graph — so the link is
  // shown and the walk stops there.
  it("shows the box another service starts at, but not what follows it", () => {
    expect(shown("attestation")).toContain("visa-cost");
    expect(shown("attestation")).not.toContain("q-visa");
    expect(shown("attestation")).not.toContain("h-visa");
  });

  it("always keeps the start box, which is where conversations begin", () => {
    expect(shown("visa")).toContain("start");
    expect(shown("nothing-like-this")).toEqual(["start"]);
  });

  it("leaves out another service's boxes", () => {
    expect(shown("visa")).not.toContain("fallback");
  });

  it("is smaller than the whole flow, which is the point", () => {
    expect(subgraphFor(doc, "visa").size).toBeLessThan(doc.nodes.length);
  });
});

/**
 * Which services the builder could open on.
 *
 * It opens on one rather than on all 1,588 boxes, and a service with nothing
 * written about it yet would open an empty canvas on a flow that is not empty.
 */
describe("services that have boxes", () => {
  it("finds a service however its boxes name it", () => {
    // visa is named by a say, a qualify and a handoff; attestation by a say.
    expect([...servicesInFlow(doc)].sort()).toEqual(["attestation", "visa"]);
  });

  it("leaves out plumbing that belongs to no service", () => {
    // `shared`, `start` and `fallback` name none, and must not become one.
    const found = servicesInFlow(doc);
    expect(found.has("")).toBe(false);
    expect(found.size).toBe(2);
  });

  it("is empty for a flow nobody has written yet", () => {
    const starter = flowDoc.parse({
      nodes: [
        { kind: "start", id: "start" },
        { kind: "model", id: "fallback", guidance: "" },
      ],
      edges: [{ id: "e", from: "start", to: "fallback", when: { kind: "fallback" }, position: 0 }],
      intents: [],
      slots: [],
    });
    expect(servicesInFlow(starter).size).toBe(0);
  });
});
