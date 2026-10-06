import { describe, expect, it } from "vitest";
import { flowDoc, indexFlow, type FlowIndex } from "@/lib/chat/flow/schema";
import { emptyState, openingSuggestions, runTurn, type Effect, type FlowState } from "@/lib/chat/flow/run";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { looksLikeQuestion } from "@/lib/text";
import { acceptValue } from "@/lib/chat/qualify/engine";

/**
 * Walking the flow.
 *
 * The engine is pure, so these are the real thing rather than a mock of it —
 * the same function the route calls and the same one the replay harness runs
 * over recorded transcripts.
 */

const doc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start" },
    { kind: "say", id: "attest", text: "Attestation starts in the issuing country.", serviceSlug: "attestation", faqQuestion: "How does attestation work?" },
    { kind: "say", id: "cost", text: "Fees differ by country, so a provider quotes per case." },
    { kind: "say", id: "translate", text: "A translator licensed by the Ministry of Justice." },
    { kind: "say", id: "intro", text: "Let us narrow that down." },
    { kind: "ask", id: "ask-country", text: "Which country issued it?", slot: "country" },
    { kind: "branch", id: "by-country" },
    { kind: "say", id: "india", text: "India needs an MEA apostille first." },
    { kind: "say", id: "elsewhere", text: "Start with the issuing country's foreign ministry." },
    { kind: "say", id: "greeting", text: "Hello — ask me anything about {{country}}." },
    { kind: "model", id: "fallback", guidance: "" },
    { kind: "handoff", id: "callback", text: "Shall we call you?", reason: "requested", serviceSlug: "attestation" },
  ],
  slots: [{ key: "country", label: "Issuing country", kind: "text" }],
  intents: [
    { id: "i-attest", name: "attestation", hintKeywords: [["attest"]], phrases: ["get my degree attested"] },
    { id: "i-cost", name: "what it costs", hintKeywords: [["cost"]], phrases: ["how much does it cost"] },
    { id: "i-translate", name: "legal translation", hintKeywords: [["translation"]], phrases: ["translate my certificate"] },
  ],
  edges: [
    { id: "e1", from: "start", to: "attest", when: { kind: "intent", intentId: "i-attest" }, position: 0 },
    { id: "e2", from: "start", to: "translate", when: { kind: "intent", intentId: "i-translate" }, position: 1 },
    { id: "e3", from: "start", to: "fallback", when: { kind: "fallback" }, position: 999 },
    { id: "e4", from: "attest", to: "cost", when: { kind: "intent", intentId: "i-cost" }, position: 0 },
    { id: "e5", from: "attest", to: "callback", when: { kind: "choice", label: "Have someone call you" }, position: 1 },
    { id: "e6", from: "intro", to: "ask-country", when: { kind: "always" }, position: 0 },
    { id: "e7", from: "ask-country", to: "by-country", when: { kind: "always" }, position: 0 },
    { id: "e8", from: "by-country", to: "india", when: { kind: "slot", slot: "country", op: "eq", value: "India" }, position: 0 },
    { id: "e9", from: "by-country", to: "elsewhere", when: { kind: "slot", slot: "country", op: "exists" }, position: 1 },
  ],
});

const flow: FlowIndex = indexFlow(doc);

const turn = (state: FlowState, input: Parameters<typeof runTurn>[2]) =>
  runTurn(flow, state, input, { match: keywordMatcher });

const said = (effects: Effect[]) =>
  effects.flatMap((e) => (e.kind === "say" ? [e.nodeId] : []));

const chips = (effects: Effect[]) =>
  effects.flatMap((e) => (e.kind === "chips" ? e.chips.map((c) => c.nodeId) : []));

describe("finding the answer", () => {
  it("matches an intent wired to the start node", () => {
    const step = turn(emptyState(), { message: "I need to attest my degree" });
    expect(said(step.effects)).toEqual(["attest"]);
    expect(step.usedModel).toBe(false);
  });

  // The whole reason this is a graph: "how much" means something different
  // after an answer about attestation than it does cold.
  it("prefers an intent wired to where the conversation is", () => {
    const first = turn(emptyState(), { message: "attest my degree" });
    const second = turn(first.state, { message: "and the cost" });
    expect(said(second.effects)).toEqual(["cost"]);
  });

  it("still lets someone change the subject to a global intent", () => {
    const first = turn(emptyState(), { message: "attest my degree" });
    const second = turn(first.state, { message: "I need a translation" });
    expect(said(second.effects)).toEqual(["translate"]);
  });

  it("falls back to the model when nothing matches", () => {
    const step = turn(emptyState(), { message: "tell me about camel racing" });
    expect(step.effects.some((e) => e.kind === "model")).toBe(true);
    expect(step.usedModel).toBe(true);
  });

  it("reports no match when the flow offers no fallback at all", () => {
    const stripped = indexFlow(flowDoc.parse({ ...doc, edges: doc.edges.filter((e) => e.id !== "e3") }));
    const step = runTurn(stripped, emptyState(), { message: "camel racing" }, { match: keywordMatcher });
    expect(step.matched).toBe(false);
    expect(step.effects).toEqual([]);
  });
});

describe("tapping instead of typing", () => {
  it("jumps straight to a suggested node, with no matching and no model", () => {
    const step = turn(emptyState(), { message: "", targetNodeId: "cost" });
    expect(said(step.effects)).toEqual(["cost"]);
    expect(step.usedModel).toBe(false);
  });

  it("takes the choice edge for a tapped button", () => {
    const first = turn(emptyState(), { message: "attest my degree" });
    const second = turn(first.state, { message: "", choice: "Have someone call you" });
    expect(second.effects.some((e) => e.kind === "handoff" && e.nodeId === "callback")).toBe(true);
  });

  it("offers the node's buttons as choices", () => {
    const step = turn(emptyState(), { message: "attest my degree" });
    const buttons = step.effects.find((e) => e.kind === "choices");
    expect(buttons).toMatchObject({ choices: [{ nodeId: "callback", label: "Have someone call you" }] });
  });
});

describe("suggestions", () => {
  it("offers the node's own follow-ups first, labelled by the target's question", () => {
    const step = turn(emptyState(), { message: "attest my degree" });
    expect(chips(step.effects)).toContain("cost");
  });

  // The rule the old answer bank learned the hard way: offering a question you
  // just answered reads as not listening.
  it("never offers a node already spoken in this conversation", () => {
    const first = turn(emptyState(), { message: "attest my degree" });
    const second = turn(first.state, { message: "and the cost" });
    expect(chips(second.effects)).not.toContain("attest");
    expect(chips(second.effects)).not.toContain("cost");
  });

  it("tops up from the start node so a reply is never a dead end", () => {
    const step = turn(emptyState(), { message: "", targetNodeId: "cost" });
    expect(chips(step.effects)).toContain("translate");
  });

  it("opens on the start node's intents in author order", () => {
    expect(openingSuggestions(flow).map((s) => s.nodeId)).toEqual(["attest", "translate"]);
    expect(openingSuggestions(flow)[0].label).toBe("How does attestation work?");
  });
});

describe("asking and branching", () => {
  it("runs straight through an always edge into the question", () => {
    const step = turn(emptyState(), { message: "", targetNodeId: "intro" });
    expect(said(step.effects)).toEqual(["intro"]);
    expect(step.effects.some((e) => e.kind === "ask" && e.nodeId === "ask-country")).toBe(true);
  });

  it("stores what they answer and branches on it", () => {
    const asked = turn(emptyState(), { message: "", targetNodeId: "intro" });
    const answered = turn(asked.state, { message: "India" });
    expect(answered.state.slots.country).toBe("India");
    expect(said(answered.effects)).toEqual(["india"]);
  });

  it("takes the later slot edge when the specific one does not hold", () => {
    const asked = turn(emptyState(), { message: "", targetNodeId: "intro" });
    const answered = turn(asked.state, { message: "Philippines" });
    expect(said(answered.effects)).toEqual(["elsewhere"]);
  });

  it("does not bury a question under three other things to talk about", () => {
    const step = turn(emptyState(), { message: "", targetNodeId: "intro" });
    expect(step.effects.some((e) => e.kind === "chips")).toBe(false);
  });

  it("substitutes a collected slot into a later reply", () => {
    const asked = turn(emptyState(), { message: "", targetNodeId: "intro" });
    const answered = turn(asked.state, { message: "India" });
    const step = turn(answered.state, { message: "", targetNodeId: "greeting" });
    expect(step.effects[0]).toMatchObject({ text: "Hello — ask me anything about India." });
  });
});

describe("what the turn reports back", () => {
  it("names the service so the callback form opens on the right one", () => {
    const step = turn(emptyState(), { message: "attest my degree" });
    expect(step.effects).toContainEqual({ kind: "topic", serviceSlug: "attestation" });
  });

  it("leaves the cursor where the walk stopped", () => {
    const step = turn(emptyState(), { message: "attest my degree" });
    expect(step.state.nodeId).toBe("attest");
    expect(step.state.visited).toContain("attest");
  });
});

/**
 * The qualify node.
 *
 * Six required fields used to mean six boxes on the canvas and six edges
 * between them. Here they are six rows of data and one box, which is the whole
 * reason the node exists — so these tests are about the loop, not the schema
 * (that is tests/qualify.test.ts).
 */
describe("qualifying through one node", () => {
  const withQualify = indexFlow(
    flowDoc.parse({
      ...doc,
      nodes: [
        ...doc.nodes,
        { kind: "qualify", id: "q-attest", serviceId: "attestation" },
        { kind: "handoff", id: "done", text: "Our team will call you.", reason: "requested" },
      ],
      edges: [
        ...doc.edges,
        { id: "e10", from: "attest", to: "q-attest", when: { kind: "choice", label: "Get a quote" }, position: 2 },
        { id: "e11", from: "q-attest", to: "done", when: { kind: "always" }, position: 0 },
      ],
    }),
  );

  // Stands in for lib/chat/qualify: two required fields, the second validating.
  const qualifier = {
    accept: (_s: string, slot: string, raw: string) =>
      slot === "phone" && !/\d{7}/.test(raw)
        ? { error: "That does not look like a number we could reach you on." }
        : { value: raw.trim() },
    next: (_s: string, known: Record<string, string>) =>
      !known.document_type
        ? { slot: "document_type", question: "What needs attesting?", options: ["Degree", "Marriage"] }
        : !known.phone
          ? { slot: "phone", question: "What number can we call?", options: [] }
          : null,
    collected: (_s: string, known: Record<string, string>) => ({
      document_type: known.document_type,
      phone: known.phone,
    }),
  };

  const step = (state: FlowState, input: Parameters<typeof runTurn>[2]) =>
    runTurn(withQualify, state, input, { match: keywordMatcher, qualifier });

  it("asks the first missing field, and offers its options as buttons", () => {
    const first = step(emptyState(), { message: "", targetNodeId: "q-attest" });
    expect(first.effects).toContainEqual({
      kind: "ask",
      nodeId: "q-attest",
      text: "What needs attesting?",
      slot: "document_type",
      options: ["Degree", "Marriage"],
    });
    expect(first.effects.find((e) => e.kind === "choices")).toMatchObject({
      choices: [
        { nodeId: "q-attest", label: "Degree" },
        { nodeId: "q-attest", label: "Marriage" },
      ],
    });
  });

  it("walks one field per turn and remembers what it is waiting on", () => {
    const first = step(emptyState(), { message: "", targetNodeId: "q-attest" });
    expect(first.state.pending).toEqual({ slot: "document_type", serviceId: "attestation" });

    const second = step(first.state, { message: "", choice: "Degree", targetNodeId: "q-attest" });
    expect(second.state.slots.document_type).toBe("Degree");
    expect(second.effects.some((e) => e.kind === "ask" && e.slot === "phone")).toBe(true);
  });

  // A rejected answer must never advance the conversation — that is how a lead
  // ends up with a phone number nobody can call.
  it("says what was wrong and asks the same question again", () => {
    const first = step(emptyState(), { message: "", targetNodeId: "q-attest" });
    const second = step(first.state, { message: "Degree", targetNodeId: "q-attest" });
    const bad = step(second.state, { message: "later", targetNodeId: "q-attest" });

    expect(bad.effects[0]).toMatchObject({ kind: "say", text: expect.stringContaining("reach you") });
    expect(bad.effects.some((e) => e.kind === "ask" && e.slot === "phone")).toBe(true);
    expect(bad.state.slots.phone).toBeUndefined();
    expect(bad.state.pending).toEqual({ slot: "phone", serviceId: "attestation" });
  });

  it("announces the lead and moves on once nothing required is missing", () => {
    const state: FlowState = {
      nodeId: "q-attest",
      slots: { document_type: "Degree", phone: "971501234567" },
      visited: [],
      pending: null,
    };
    const done = step(state, { message: "", targetNodeId: "q-attest" });

    expect(done.effects).toContainEqual({
      kind: "qualified",
      nodeId: "q-attest",
      serviceId: "attestation",
      fields: { document_type: "Degree", phone: "971501234567" },
    });
    expect(done.effects.some((e) => e.kind === "handoff" && e.nodeId === "done")).toBe(true);
  });

  // Without definitions loaded, claiming a lead we collected nothing for would
  // be worse than doing nothing.
  it("steps straight through when there is no qualifier at all", () => {
    const through = runTurn(withQualify, emptyState(), { message: "", targetNodeId: "q-attest" }, {
      match: keywordMatcher,
    });
    expect(through.effects.some((e) => e.kind === "qualified")).toBe(false);
    expect(through.effects.some((e) => e.kind === "handoff")).toBe(true);
  });

  it("lets someone change the subject instead of answering", () => {
    const first = step(emptyState(), { message: "", targetNodeId: "q-attest" });
    const away = step(first.state, { message: "", targetNodeId: "translate" });
    expect(said(away.effects)).toEqual(["translate"]);
  });
});

/**
 * Asking something in the middle of being asked something.
 *
 * From a real failure: asked "which country issued it?", a visitor typed "what
 * is the cost for attestation". That was stored as their country, the
 * qualification completed, and a lead went to sales saying the degree was
 * issued in "What Is The Cost For Attastation".
 *
 * Two things had to be true to fix it. The question has to be answered rather
 * than swallowed — and the form has to still be there afterwards.
 */
describe("a question instead of an answer", () => {
  const flowWithQualify = indexFlow(
    flowDoc.parse({
      ...doc,
      nodes: [...doc.nodes, { kind: "qualify", id: "q-attest", serviceId: "attestation" }],
      edges: [
        ...doc.edges,
        { id: "e20", from: "attest", to: "q-attest", when: { kind: "choice", label: "Get a quote" }, position: 2 },
      ],
    }),
  );

  // The real validator for a real field, so these exercise the ladder rather
  // than a fake that accepts everything.
  const country = {
    key: "issuing_country",
    label: "Country",
    question: "Which country issued it?",
    type: "country" as const,
    required: true,
    options: [],
    order: 10,
  };

  const qualifier = {
    accept: (_s: string, _slot: string, raw: string) => acceptValue(country, raw),
    next: (_s: string, known: Record<string, string>) =>
      known.issuing_country ? null : { slot: country.key, question: country.question, options: [] },
    collected: (_s: string, known: Record<string, string>) => known,
  };

  const step = (state: FlowState, input: Parameters<typeof runTurn>[2]) =>
    runTurn(flowWithQualify, state, input, { match: keywordMatcher, qualifier });

  const asked = () => step(emptyState(), { message: "", targetNodeId: "q-attest" }).state;

  it("does not store the question as the answer", () => {
    const after = step(asked(), { message: "what is the cost for attastation" });
    expect(after.state.slots.issuing_country).toBeUndefined();
  });

  it("answers it from a topic when there is one, without paying for a model", () => {
    const after = step(asked(), { message: "I need a translation" });
    expect(said(after.effects)).toContain("translate");
    expect(after.usedModel).toBe(false);
  });

  it("falls to the model when no topic covers it", () => {
    const after = step(asked(), { message: "what is the cost for attastation" });
    expect(after.effects.some((e) => e.kind === "model")).toBe(true);
  });

  // Answering their question and then carrying on as if the form had been
  // abandoned is how someone ends up half-qualified and never followed up.
  it("asks the pending question again afterwards, and stays there", () => {
    const after = step(asked(), { message: "I need a translation" });
    expect(after.effects.filter((e) => e.kind === "ask")).toHaveLength(1);
    expect(after.effects.some((e) => e.kind === "ask" && e.slot === "issuing_country")).toBe(true);
    expect(after.state.nodeId).toBe("q-attest");
    expect(after.state.pending).toEqual({ slot: "issuing_country", serviceId: "attestation" });
  });

  it("then takes the real answer on the next turn", () => {
    const diverted = step(asked(), { message: "I need a translation" });
    const answered = step(diverted.state, { message: "India" });
    expect(answered.state.slots.issuing_country).toBe("India");
  });

  it("never mistakes a tapped option for a question", () => {
    const after = step(asked(), { choice: "Nepal", message: "", targetNodeId: "q-attest" });
    expect(after.state.slots.issuing_country).toBe("Nepal");
  });

  // Not every wrong answer is a change of subject. "Degre" deserves "please
  // pick one of", not a paid model call.
  it("corrects a plain mistake instead of diverting", () => {
    const after = step(asked(), { message: "somewhere over there in the east" });
    expect(after.effects[0]).toMatchObject({ kind: "say", text: expect.stringContaining("country name") });
    expect(after.effects.some((e) => e.kind === "model")).toBe(false);
    expect(after.state.slots.issuing_country).toBeUndefined();
  });

  // The bug had a second half: with the answer taken, the box was left through
  // its onward edge instead of being re-entered, so the form "finished" with
  // three fields still empty.
  it("re-enters the box rather than leaving it once a field is filled", () => {
    const answered = step(asked(), { message: "India" });
    expect(answered.state.slots.issuing_country).toBe("India");
    expect(answered.state.nodeId).toBe("q-attest");
  });
});

describe("looksLikeQuestion", () => {
  it("catches the shapes people actually use", () => {
    for (const text of [
      "what is the cost for attastation",
      "How long does it take",
      "india?",
      "can you do it faster",
      "i was wondering whether you handle this for me too",
    ]) {
      expect(looksLikeQuestion(text)).toBe(true);
    }
  });

  it("leaves a real answer alone", () => {
    for (const text of ["India", "+971 50 123 4567", "Ahmed Al Mansouri", "Degree or diploma certificate"]) {
      expect(looksLikeQuestion(text)).toBe(false);
    }
  });
});
