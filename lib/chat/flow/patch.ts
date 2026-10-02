/**
 * The only shape a proposed change to a flow may take.
 *
 * The improver never returns a rewritten flow. It returns one of these, and
 * `flowPatch.parse()` is the wall between "a model suggested something" and
 * "the graph changed": an operation it invents, a field it mistypes or an
 * intent id it hallucinates is rejected here, before anyone is asked to approve
 * it.
 *
 * Three operations, and each exists because a signal in the transcripts calls
 * for it. There is no operation for anything we cannot observe going wrong.
 *
 * Pure and browser-safe: the proposals page renders these.
 */

import { z } from "zod";
import { flowDoc, type FlowDoc } from "./schema";
import { normalizeQuestion } from "./lookup";

const trimmed = z.string().trim();

/**
 * The cheap, safe one, and the one that pays most.
 *
 * A phrasing added to an intent is recognised by the exact lookup *and* by the
 * browser as someone types — so it turns a question that cost a model call into
 * one answered before the sentence is finished. It changes nothing a visitor
 * reads.
 */
const addPhrases = z.object({
  op: z.literal("addPhrases"),
  intentId: trimmed.min(1).max(128),
  phrases: z.array(trimmed.min(3).max(300)).min(1).max(12),
});

/**
 * A question the flow has no answer for at all.
 *
 * The drafted answer is written from the site's own approved content, the same
 * grounding the chatbot answers from — not from what the model happens to know
 * about UAE paperwork. It is still a draft, and it is still read by a person
 * before it can reach anyone.
 */
const addAnswer = z.object({
  op: z.literal("addAnswer"),
  question: trimmed.min(5).max(200),
  answerMd: trimmed.min(20).max(2000),
  serviceSlug: trimmed.max(80).nullable().default(null),
  phrases: z.array(trimmed.min(3).max(300)).max(12).default([]),
});

/** An intent nothing has matched in months is a phrase list nobody maintains
 *  and a candidate that only ever makes other matches ambiguous. */
const retireIntent = z.object({
  op: z.literal("retireIntent"),
  intentId: trimmed.min(1).max(128),
});

export const flowPatch = z.discriminatedUnion("op", [addPhrases, addAnswer, retireIntent]);
export type FlowPatch = z.infer<typeof flowPatch>;

/** A short, stable identity for a patch, so the same suggestion is not made
 *  again next week after someone rejected it. */
export function fingerprint(patch: FlowPatch): string {
  switch (patch.op) {
    case "addPhrases":
      return `addPhrases:${patch.intentId}:${patch.phrases.map(normalizeQuestion).sort().join("|")}`;
    case "addAnswer":
      return `addAnswer:${normalizeQuestion(patch.question)}`;
    case "retireIntent":
      return `retireIntent:${patch.intentId}`;
  }
}

/** One line, as the proposals page shows it. */
export function describe(patch: FlowPatch): string {
  switch (patch.op) {
    case "addPhrases":
      return `Teach ${patch.phrases.length} more way${patch.phrases.length === 1 ? "" : "s"} of asking it`;
    case "addAnswer":
      return `Answer a question the flow has no box for: "${patch.question}"`;
    case "retireIntent":
      return "Retire a topic nothing matches";
  }
}

export class PatchFailed extends Error {}

/** Where a new box is dropped. Off to one side of everything, so it is obvious
 *  it arrived rather than being placed; "Tidy" puts it where it belongs. */
function freeSpot(doc: FlowDoc): { x: number; y: number } {
  const right = Math.max(0, ...doc.nodes.map((n) => n.position.x));
  const bottom = Math.max(0, ...doc.nodes.map((n) => n.position.y));
  return { x: right + 360, y: bottom + 160 };
}

function idFrom(question: string, taken: Set<string>, prefix: string): string {
  const base = `${prefix}-${normalizeQuestion(question).replace(/\s+/g, "-").slice(0, 48)}`;
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
}

/**
 * Applies one patch to a draft, returning a new document.
 *
 * Re-parsed on the way out, so a patch that would produce a graph the runtime
 * cannot read fails here rather than being stored. The caller is applying this
 * to the *draft*; nothing reaches a visitor until someone publishes.
 */
export function applyPatch(doc: FlowDoc, patch: FlowPatch): FlowDoc {
  switch (patch.op) {
    case "addPhrases": {
      const intent = doc.intents.find((i) => i.id === patch.intentId);
      if (!intent) throw new PatchFailed(`no topic called ${patch.intentId}`);

      const seen = new Set([intent.name, ...intent.phrases].map(normalizeQuestion));
      const fresh = patch.phrases.filter((p) => !seen.has(normalizeQuestion(p)));

      return flowDoc.parse({
        ...doc,
        intents: doc.intents.map((i) =>
          i.id === patch.intentId ? { ...i, phrases: [...i.phrases, ...fresh] } : i,
        ),
      });
    }

    case "addAnswer": {
      const start = doc.nodes.find((n) => n.kind === "start");
      if (!start) throw new PatchFailed("this flow has no start box");

      const nodeId = idFrom(patch.question, new Set(doc.nodes.map((n) => n.id)), "n");
      const intentId = idFrom(patch.question, new Set(doc.intents.map((i) => i.id)), "i");

      return flowDoc.parse({
        ...doc,
        nodes: [
          ...doc.nodes,
          {
            kind: "say",
            id: nodeId,
            position: freeSpot(doc),
            text: patch.answerMd,
            serviceSlug: patch.serviceSlug,
            faqQuestion: patch.question,
          },
        ],
        intents: [
          ...doc.intents,
          { id: intentId, name: patch.question, phrases: patch.phrases, hintKeywords: [] },
        ],
        edges: [
          ...doc.edges,
          {
            id: `e-start-${nodeId}`,
            from: start.id,
            to: nodeId,
            when: { kind: "intent", intentId },
            // Behind everything an author placed deliberately, and ahead of the
            // fallback.
            position: 8000,
            labelOffset: { x: 0, y: 0 },
            tagOffset: { x: 0, y: 0 },
          },
        ],
      });
    }

    case "retireIntent": {
      if (!doc.intents.some((i) => i.id === patch.intentId)) {
        throw new PatchFailed(`no topic called ${patch.intentId}`);
      }

      // The edges go with it: an edge on a topic that no longer exists is a
      // document the schema refuses, which is the right refusal.
      return flowDoc.parse({
        ...doc,
        intents: doc.intents.filter((i) => i.id !== patch.intentId),
        edges: doc.edges.filter(
          (e) => !(e.when.kind === "intent" && e.when.intentId === patch.intentId),
        ),
      });
    }
  }
}
