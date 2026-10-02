/**
 * Turning written-down questions into a piece of flow.
 *
 * A hundred and thirty answers about attestation and notarisation are content,
 * not graph work: whoever writes them should be writing sentences, not dragging
 * boxes or inventing edge ids. So the authored form is one flat record per
 * question — what people ask, what we say back, what they would ask next — and
 * this turns a list of those into nodes, edges and intents.
 *
 * The one thing it does that a list of FAQs cannot is `quote`. A question about
 * money does not get a number, because on a regulated service we do not have
 * one to give; it gets an honest sentence and then walks straight into that
 * service's qualification, which ends at the callback form. That is the
 * difference between an FAQ and a flow, and it is the reason this content lives
 * here rather than in the answer bank.
 *
 * Pure and browser-safe, like the rest of this directory: no database, no Node
 * builtins, so the same build runs in a test.
 */

import { getService } from "../../services";
import { SERVICE_SLOT } from "../page-context";
import { flowDoc, type FlowDoc, type FlowEdge, type FlowNode, type Intent } from "./schema";

/** One question, as a person writes it down. */
export interface AuthoredFlow {
  /** Stable and unique. Node and intent ids are derived from it, so renaming
   *  one detaches every edge that pointed at it — treat it as permanent. */
  id: string;
  /** The intent's name, the FAQ heading, and the label on a suggestion chip. */
  question: string;
  /** The reply, in markdown. */
  answer: string;
  /** Which service this belongs to. Required when `quote` is set, because that
   *  is the qualification the reply walks into. */
  service: string | null;
  /** Ways people ask it. Embedded at publish time; this is what actually
   *  matches a question nobody predicted. */
  phrases: string[];
  /**
   * Exact AND-groups, for typing hints in the browser and for the days no
   * embedding key is usable.
   *
   * Keep them discriminating. `matchByKeywords` ranks by how many words of a
   * group matched, so a one-word group like `["attestation"]` on forty intents
   * makes all forty tie and hands the question to whichever edge sorts first.
   */
  keywords?: string[][];
  /** Other entries to offer as chips afterwards. */
  next?: string[];
  /** Buttons. Each is an exact, free transition to another entry. */
  choices?: { label: string; to: string }[];
  /** Offered before anyone has typed. Four of these are shown. */
  opener?: boolean;
  /** Set false to keep it in the chat but off the service page's FAQ block. */
  faq?: boolean;
  /**
   * A question about money.
   *
   * The reply is followed, with no further prompting, by the service's
   * qualification and then the callback form — so asking what something costs
   * puts someone in front of a person instead of in front of a made-up number.
   */
  quote?: boolean;
}

/* ── The boxes every flow has ────────────────────────────────────────────── */

/** Shared with `scripts/migrate-answers-to-flow.ts`: both builders write into
 *  the same draft, and two start nodes is a document that will not parse. */
export const START_NODE = "start";
export const FALLBACK_NODE = "fallback-model";
export const FALLBACK_EDGE = "e-start-fallback";

export const qualifyNodeId = (serviceId: string): string => `q-${serviceId}`;
export const handoffNodeId = (serviceId: string): string => `h-${serviceId}`;

const nodeId = (id: string): string => `n-${id}`;
const intentId = (id: string): string => `i-${id}`;

const NO_OFFSET = { x: 0, y: 0 };

/** Non-openers sort behind every opener while keeping their authored order.
 *  Past the migration's own band, so migrated answers keep their place. */
const NON_OPENER_BASE = 1000;

/** Laid out in a grid. The builder has an arrange button; this only has to be
 *  readable enough that the first person to open it is not looking at a knot. */
const COLUMN = 340;
const ROW = 150;
const ROWS_PER_COLUMN = 12;

export class AuthoringError extends Error {}

/* ── Building ────────────────────────────────────────────────────────────── */

/**
 * The authored questions as a flow that stands on its own.
 *
 * Complete rather than a fragment — start node, fallback, and a qualification
 * and callback per service mentioned — so the result is publishable whether or
 * not anything else has been migrated into the draft yet. Where it overlaps an
 * existing flow it does so by id, which is what makes `mergeFlows` a no-op on
 * the second run.
 */
export function buildAuthoredFlow(flows: AuthoredFlow[], origin = { x: 0, y: 0 }): FlowDoc {
  const known = new Set<string>();
  for (const flow of flows) {
    if (known.has(flow.id)) throw new AuthoringError(`duplicate authored id: ${flow.id}`);
    known.add(flow.id);
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const intents: Intent[] = [];
  const services = new Set<string>();

  let cell = 0;
  const place = () => {
    const x = origin.x + Math.floor(cell / ROWS_PER_COLUMN) * COLUMN;
    const y = origin.y + (cell % ROWS_PER_COLUMN) * ROW;
    cell++;
    return { x, y };
  };

  flows.forEach((flow, index) => {
    if (flow.quote && !flow.service) {
      throw new AuthoringError(`"${flow.id}" asks for a quote but names no service`);
    }
    if (flow.service && !getService(flow.service)) {
      throw new AuthoringError(`"${flow.id}" names unknown service "${flow.service}"`);
    }
    if (flow.service) services.add(flow.service);
    if (flow.phrases.length === 0 && (flow.keywords ?? []).length === 0) {
      throw new AuthoringError(`"${flow.id}" has no phrases and no keywords, so it can never match`);
    }

    nodes.push({
      kind: "say",
      id: nodeId(flow.id),
      position: place(),
      text: flow.answer,
      serviceSlug: flow.service,
      faqQuestion: flow.faq === false ? null : flow.question,
    });

    intents.push({
      id: intentId(flow.id),
      name: flow.question,
      phrases: [...new Set(flow.phrases.map((p) => p.trim()).filter(Boolean))],
      hintKeywords: (flow.keywords ?? []).filter((group) => group.length > 0),
    });

    edges.push({
      id: `e-start-${flow.id}`,
      from: START_NODE,
      to: nodeId(flow.id),
      when: { kind: "intent", intentId: intentId(flow.id) },
      position: flow.opener ? index : NON_OPENER_BASE + index,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
  });

  for (const flow of flows) {
    // A money question is the one reply that leads somewhere on its own. The
    // `always` edge is what makes it a walk rather than a suggestion: the
    // qualification asks its first question in the same turn as the answer.
    if (flow.quote && flow.service) {
      edges.push({
        id: `e-${flow.id}-quote`,
        from: nodeId(flow.id),
        to: qualifyNodeId(flow.service),
        when: { kind: "always" },
        position: 0,
        labelOffset: NO_OFFSET,
        tagOffset: NO_OFFSET,
      });
      // Chips after a `say` that walks on are never reached, and a button would
      // compete with the question the qualification just asked.
      continue;
    }

    (flow.next ?? []).forEach((target, i) => {
      if (!known.has(target)) {
        throw new AuthoringError(`"${flow.id}" offers unknown follow-up "${target}"`);
      }
      edges.push({
        id: `e-${flow.id}-next-${target}`,
        from: nodeId(flow.id),
        to: nodeId(target),
        when: { kind: "intent", intentId: intentId(target) },
        position: i,
        labelOffset: NO_OFFSET,
        tagOffset: NO_OFFSET,
      });
    });

    (flow.choices ?? []).forEach((choice, i) => {
      if (!known.has(choice.to)) {
        throw new AuthoringError(`"${flow.id}" offers unknown choice target "${choice.to}"`);
      }
      edges.push({
        id: `e-${flow.id}-choice-${i}`,
        from: nodeId(flow.id),
        to: nodeId(choice.to),
        when: { kind: "choice", label: choice.label },
        position: i,
        labelOffset: NO_OFFSET,
        tagOffset: NO_OFFSET,
      });
    });
  }

  nodes.push({ kind: "start", id: START_NODE, position: { x: origin.x - COLUMN, y: origin.y } });
  nodes.push({
    kind: "model",
    id: FALLBACK_NODE,
    position: { x: origin.x - COLUMN, y: origin.y + ROW * 2 },
    guidance: "",
  });
  edges.push({
    id: FALLBACK_EDGE,
    from: START_NODE,
    to: FALLBACK_NODE,
    when: { kind: "fallback" },
    position: 9999,
    labelOffset: NO_OFFSET,
    tagOffset: NO_OFFSET,
  });

  // One qualification and one callback per service, reached from a money
  // question and from the service page a visitor opened the widget on.
  [...services].sort().forEach((serviceId, row) => {
    const service = getService(serviceId)!;
    const y = origin.y + row * ROW * 2;

    nodes.push({
      kind: "qualify",
      id: qualifyNodeId(serviceId),
      position: { x: origin.x - COLUMN * 2, y },
      serviceId,
    });
    nodes.push({
      kind: "handoff",
      id: handoffNodeId(serviceId),
      position: { x: origin.x - COLUMN * 3, y },
      text: `Thank you — that is everything we need. Our ${service.shortName.toLowerCase()} team will call you back with a price and the exact steps for your case.`,
      reason: "qualified",
      serviceSlug: serviceId,
    });

    edges.push({
      id: `e-${serviceId}-qualified`,
      from: qualifyNodeId(serviceId),
      to: handoffNodeId(serviceId),
      when: { kind: "always" },
      position: 0,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
    edges.push({
      id: `e-start-page-${serviceId}`,
      from: START_NODE,
      to: qualifyNodeId(serviceId),
      when: { kind: "slot", slot: SERVICE_SLOT, op: "eq", value: serviceId },
      position: 9000 + row,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
  });

  return flowDoc.parse({
    nodes,
    edges,
    intents,
    slots: [{ key: SERVICE_SLOT, label: "Service from the page", kind: "text", options: [] }],
  });
}

/* ── Merging ─────────────────────────────────────────────────────────────── */

/**
 * `addition` laid over `base`, by id.
 *
 * Content wins, layout does not: a node that already exists keeps the position
 * someone dragged it to, because re-running the seed after an edit should not
 * undo an afternoon of arranging. Everything else about the node is replaced,
 * which is what makes fixing a typo in the content file and re-running the
 * script the way to fix a typo in the flow.
 */
export function mergeFlows(base: FlowDoc, addition: FlowDoc): FlowDoc {
  const nodes = new Map(base.nodes.map((n) => [n.id, n]));
  for (const node of addition.nodes) {
    const existing = nodes.get(node.id);
    nodes.set(node.id, existing ? { ...node, position: existing.position } : node);
  }

  const edges = new Map(base.edges.map((e) => [e.id, e]));
  for (const edge of addition.edges) {
    const existing = edges.get(edge.id);
    edges.set(
      edge.id,
      existing
        ? { ...edge, labelOffset: existing.labelOffset, tagOffset: existing.tagOffset }
        : edge,
    );
  }

  const intents = new Map(base.intents.map((i) => [i.id, i]));
  for (const intent of addition.intents) intents.set(intent.id, intent);

  const slots = new Map(base.slots.map((s) => [s.key, s]));
  for (const slot of addition.slots) slots.set(slot.key, slot);

  return flowDoc.parse({
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    intents: [...intents.values()],
    slots: [...slots.values()],
  });
}

/**
 * What `mergeFlows` will produce, counted without producing it.
 *
 * Exists because `mergeFlows` ends in `flowDoc.parse`, and the schema's caps
 * are enforced there. A seeder that wants to report "you are 40 nodes over,
 * here is why" has to know the counts *before* the parse, or the parse throws
 * first and the explanation is dead code — which is exactly what happened.
 *
 * The invariant is that this agrees with the real merge, which is what
 * `tests/attestation-flows.test.ts` pins.
 */
export function mergedCounts(
  base: FlowDoc,
  addition: FlowDoc,
): { nodes: number; intents: number; edges: number } {
  const union = <T>(a: T[], b: T[], key: (item: T) => string) =>
    new Set([...a.map(key), ...b.map(key)]).size;

  return {
    nodes: union(base.nodes, addition.nodes, (n) => n.id),
    intents: union(base.intents, addition.intents, (i) => i.id),
    edges: union(base.edges, addition.edges, (e) => e.id),
  };
}
