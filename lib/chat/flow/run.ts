/**
 * Walking the flow.
 *
 * One turn in, a list of effects out. Pure: no database, no model, no clock —
 * everything it needs arrives as an argument, including how to match an intent.
 * That is what makes the replay harness possible, and the replay harness is how
 * we know a flow edit did not break the twenty questions people actually ask.
 *
 * The route's job afterwards is translation, not decision. Every effect here
 * maps onto an SSE event the widget already speaks, which is why replacing the
 * answer bank with a graph barely touches the browser.
 */

import { looksLikeQuestion } from "../../text";
import type { FlowEdge, FlowIndex, FlowNode, Intent } from "./schema";

/** What the conversation has established so far. Stored on the session. */
export interface FlowState {
  /** Where the last turn stopped. Null before anything has been said. */
  nodeId: string | null;
  /** Facts collected by `ask` nodes, keyed by slot. */
  slots: Record<string, string>;
  /** Nodes already spoken, so a suggestion never offers an answer just given. */
  visited: string[];
  /**
   * The question this conversation is waiting on an answer to.
   *
   * Held in state rather than inferred from the node, because a `qualify` node
   * asks a different field each turn and the node alone no longer says which
   * one. `serviceId` is set when the question came from a qualification schema,
   * which is what tells the next turn to validate the answer against it.
   */
  pending: { slot: string; serviceId: string | null } | null;
}

export function emptyState(): FlowState {
  return { nodeId: null, slots: {}, visited: [], pending: null };
}

/** What arrived this turn. */
export interface TurnInput {
  /** What the visitor typed. Empty when they only tapped something. */
  message: string;
  /** The label of a tapped button, matched against `choice` edges. */
  choice?: string;
  /** A tapped suggestion goes straight to its node: no matching, no model. */
  targetNodeId?: string;
  /**
   * Fields a model read out of this message, already validated.
   *
   * Arrives as input rather than being fetched, so the walk stays pure and so
   * extraction is something the caller decides to pay for rather than something
   * that happens inside a function that looks free.
   */
  extracted?: Record<string, string>;
}

/**
 * One suggestion. `nodeId` is what comes back on the next turn, so a tap is an
 * exact lookup — the property that made chips the cost lever in the old bank,
 * kept here.
 */
export interface Suggestion {
  nodeId: string;
  label: string;
}

export type Effect =
  | { kind: "say"; nodeId: string; text: string }
  | { kind: "ask"; nodeId: string; text: string; slot: string; options: string[] }
  | { kind: "choices"; choices: Suggestion[] }
  | { kind: "chips"; chips: Suggestion[] }
  | { kind: "handoff"; nodeId: string; text: string; reason: string; serviceSlug: string | null }
  | { kind: "model"; nodeId: string; guidance: string }
  /** Answer this from the live jobs board. The route does the reading; the walk
   *  only decides that it happens, so this module stays pure. */
  | {
      kind: "jobs";
      nodeId: string;
      answers: "listings" | "salary" | "posting";
      query: string;
      fallback: string;
      serviceSlug: string | null;
    }
  | { kind: "topic"; serviceSlug: string }
  /** Everything a service requires has been collected. The route turns this
   *  into a lead. */
  | { kind: "qualified"; nodeId: string; serviceId: string; fields: Record<string, string> };

export interface Step {
  effects: Effect[];
  state: FlowState;
  /** True when this turn will cost a model call. The route charges the session
   *  budget on this, so a walk of say/ask/branch nodes stays free forever. */
  usedModel: boolean;
  /** False when nothing matched and there was no fallback edge to take. The
   *  route answers that with the same message it always has. */
  matched: boolean;
}

/**
 * How a typed message becomes an intent.
 *
 * Injected rather than imported so this module stays pure and so phase 2 can
 * replace keyword matching with embeddings without editing a line of the walk.
 * Given only the intents reachable from here, because what someone plausibly
 * means depends on what was just said to them.
 */
export type MatchIntent = (message: string, candidates: Intent[]) => string | null;

/**
 * How a `qualify` node reaches its service definition.
 *
 * Declared here, satisfied in `../qualify`, for the same reason `MatchIntent`
 * is: the walk stays pure and knows nothing about databases, and the rules for
 * what a valid answer is live with the schema that defines them.
 */
export interface Qualifier {
  /** Validate and normalise one answer, or say what is wrong with it. */
  accept(serviceId: string, slot: string, raw: string): { value: string } | { error: string };
  /** The next question, or null when nothing required is missing. */
  next(
    serviceId: string,
    known: Record<string, string>,
  ): { slot: string; question: string; options: string[] } | null;
  /** Just this service's fields, for the lead. */
  collected(serviceId: string, known: Record<string, string>): Record<string, string>;
}

export interface Deps {
  match: MatchIntent;
  /** Absent in tests and wherever no service definitions are loaded; a
   *  `qualify` node then steps straight through rather than claiming a lead it
   *  collected nothing for. */
  qualifier?: Qualifier;
}

const MAX_CHIPS = 3;

/** Enough hops to cross a branch or two. A flow that needs more than this per
 *  turn has a cycle, and stopping is better than looping. */
const MAX_HOPS = 12;

/** `{{slot}}` substitution. An unset slot leaves the placeholder's text empty
 *  rather than printing the braces at a visitor. */
function fill(text: string, slots: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, key: string) => slots[key] ?? "");
}

function edgesFrom(flow: FlowIndex, nodeId: string): FlowEdge[] {
  return flow.out.get(nodeId) ?? [];
}

function intentsOn(flow: FlowIndex, edges: FlowEdge[]): Intent[] {
  const out: Intent[] = [];
  for (const edge of edges) {
    if (edge.when.kind !== "intent") continue;
    const intent = flow.intent.get(edge.when.intentId);
    if (intent) out.push(intent);
  }
  return out;
}

function slotHolds(edge: FlowEdge, slots: Record<string, string>): boolean {
  if (edge.when.kind !== "slot") return false;
  const value = slots[edge.when.slot];
  switch (edge.when.op) {
    case "exists":
      return value !== undefined && value !== "";
    case "missing":
      return value === undefined || value === "";
    case "eq":
      return (value ?? "").toLowerCase() === edge.when.value.toLowerCase();
    case "neq":
      return (value ?? "").toLowerCase() !== edge.when.value.toLowerCase();
  }
}

/**
 * Which edge this turn takes, in the order a person would try them.
 *
 * A tapped button first: it is unambiguous and free. Then the intents wired to
 * this node, because what you were just told narrows what you probably mean.
 * Then the intents on `start`, which is how someone changes the subject — an
 * opener is simply a globally reachable intent, so authoring one is authoring
 * the other. Then what we already know, then the fallback.
 *
 * The exception is a `branch`, where state is checked *first*. A branch exists
 * to route on what has been collected and is reached without anyone saying
 * anything, so there is nothing for an intent to win against.
 *
 * Everywhere else state comes after intents, and the difference matters: a
 * visitor on the attestation page has `service_id` set, and if that outranked
 * what they typed, asking "can you attest a photocopy?" would be answered with
 * "what document type is it?" — the page context hijacking the question instead
 * of informing it.
 */
function resolve(
  flow: FlowIndex,
  from: FlowNode,
  input: TurnInput,
  slots: Record<string, string>,
  match: MatchIntent,
): FlowEdge | null {
  const local = edgesFrom(flow, from.id);
  const onState = () => local.find((e) => e.when.kind === "slot" && slotHolds(e, slots)) ?? null;

  if (input.choice) {
    const tapped = local.find(
      (e) => e.when.kind === "choice" && e.when.label.toLowerCase() === input.choice!.toLowerCase(),
    );
    if (tapped) return tapped;
  }

  if (from.kind === "branch") {
    const routed = onState();
    if (routed) return routed;
  }

  if (input.message) {
    const localHit = match(input.message, intentsOn(flow, local));
    if (localHit) {
      const edge = local.find((e) => e.when.kind === "intent" && e.when.intentId === localHit);
      if (edge) return edge;
    }

    const globals = edgesFrom(flow, flow.start.id);
    const globalHit = match(input.message, intentsOn(flow, globals));
    if (globalHit) {
      const edge = globals.find((e) => e.when.kind === "intent" && e.when.intentId === globalHit);
      if (edge) return edge;
    }
  }

  return (
    (from.kind === "branch" ? null : onState()) ??
    local.find((e) => e.when.kind === "always") ??
    local.find((e) => e.when.kind === "fallback") ??
    edgesFrom(flow, flow.start.id).find((e) => e.when.kind === "fallback") ??
    null
  );
}

/**
 * What to offer after the conversation stops on a node.
 *
 * The node's own intent edges first — the author decided what someone who just
 * heard this would want next. Then `start`'s, so a reply is never a dead end.
 * Never a node already spoken in this conversation: the old bank learned that
 * one, and offering someone a question you just answered reads as not listening.
 */
function suggestions(flow: FlowIndex, nodeId: string, visited: Set<string>): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();

  const collect = (edges: FlowEdge[]) => {
    for (const edge of edges) {
      if (out.length >= MAX_CHIPS) return;
      if (edge.when.kind !== "intent") continue;
      if (visited.has(edge.to) || seen.has(edge.to)) continue;

      const target = flow.node.get(edge.to);
      const intent = flow.intent.get(edge.when.intentId);
      if (!target || !intent) continue;

      const label = (target.kind === "say" && target.faqQuestion) || intent.name;
      out.push({ nodeId: target.id, label });
      seen.add(target.id);
    }
  };

  collect(edgesFrom(flow, nodeId));
  if (nodeId !== flow.start.id) collect(edgesFrom(flow, flow.start.id));
  return out;
}

/**
 * What the chat offers before anyone has said anything: the start node's intent
 * edges, in author order.
 *
 * Four rather than three, because an opening screen with nothing on it is the
 * one place a visitor has no idea what this thing knows.
 */
export function openingSuggestions(flow: FlowIndex, limit = 4): Suggestion[] {
  const out: Suggestion[] = [];
  for (const edge of edgesFrom(flow, flow.start.id)) {
    if (out.length >= limit) break;
    if (edge.when.kind !== "intent") continue;
    const target = flow.node.get(edge.to);
    const intent = flow.intent.get(edge.when.intentId);
    if (!target || !intent) continue;
    out.push({
      nodeId: target.id,
      label: (target.kind === "say" && target.faqQuestion) || intent.name,
    });
  }
  return out;
}

/**
 * What the browser matches against as the visitor types.
 *
 * Every topic the flow can be entered on, with both the ways people ask it and
 * the author's exact keyword groups. The phrases are the important half: a
 * question someone already wrote down should be recognised while it is being
 * typed, not after it is sent.
 *
 * The vectors are not sent — the browser cannot embed anything, and shipping
 * them would be a megabyte to save a round trip nobody makes. The text is a few
 * kilobytes and is the author's own words, not a secret.
 */
export function typingHints(
  flow: FlowIndex,
): { nodeId: string; label: string; groups: string[][]; phrases: string[] }[] {
  const out: { nodeId: string; label: string; groups: string[][]; phrases: string[] }[] = [];
  for (const edge of edgesFrom(flow, flow.start.id)) {
    if (edge.when.kind !== "intent") continue;
    const target = flow.node.get(edge.to);
    const intent = flow.intent.get(edge.when.intentId);
    if (!target || !intent) continue;
    if (intent.hintKeywords.length === 0 && intent.phrases.length === 0) continue;

    out.push({
      nodeId: target.id,
      label: (target.kind === "say" && target.faqQuestion) || intent.name,
      groups: intent.hintKeywords,
      // The intent's own name is a phrasing too — it is written as the question
      // an author would ask. Deduplicated because the migration often makes it
      // the first phrase as well, and this is sent to every visitor.
      phrases: [...new Set([intent.name, ...intent.phrases])],
    });
  }
  return out;
}

/**
 * Every topic the flow can be entered on — the start node's intent edges.
 *
 * Exported because the turn is disambiguated before the walk begins: these are
 * the candidates JEV chooses between, and they are the only ones knowable
 * before we know where the conversation goes.
 */
export function globalIntents(flow: FlowIndex): Intent[] {
  return intentsOn(flow, edgesFrom(flow, flow.start.id));
}

/** The buttons a node offers. Unlike suggestions these are the point of the
 *  node, so they are never trimmed or topped up. */
function choices(flow: FlowIndex, nodeId: string): Suggestion[] {
  return edgesFrom(flow, nodeId).flatMap((edge) => {
    if (edge.when.kind !== "choice") return [];
    const target = flow.node.get(edge.to);
    return target ? [{ nodeId: target.id, label: edge.when.label }] : [];
  });
}

/**
 * Runs one turn.
 *
 * `match` is called at most twice — once against the current node's intents,
 * once against the global ones — so a turn costs a bounded amount whatever the
 * matcher is doing underneath.
 */
export function runTurn(
  flow: FlowIndex,
  state: FlowState,
  input: TurnInput,
  deps: Deps,
): Step {
  const { match, qualifier } = deps;
  const slots = { ...state.slots };
  const visited = new Set(state.visited);
  const effects: Effect[] = [];
  let usedModel = false;
  let matched = true;
  let pending = state.pending;

  const waiting = state.nodeId ? flow.node.get(state.nodeId) : null;

  // A question we asked is answered by whatever comes next — typed, or tapped
  // on one of the options we offered. Tapping an option targets the node that
  // asked, which is how an answer is told apart from a suggestion that changes
  // the subject.
  const answering =
    pending !== null && (!input.targetNodeId || input.targetNodeId === state.nodeId);
  const answer = (input.choice ?? input.message).trim();

  /** The box to come back to after answering something they asked instead. */
  let divertedFrom: FlowNode | null = null;
  /** Whether the box that asked has dealt with this turn's message. */
  let consumed = false;

  // Anything the message stated outright, whichever question we happened to be
  // asking. Applied before the pending answer so that a message which answered
  // it in passing is not then asked again.
  if (answering && pending && input.extracted) {
    for (const [key, value] of Object.entries(input.extracted)) {
      if (!slots[key]) slots[key] = value;
    }
    if (slots[pending.slot]) {
      pending = null;
      consumed = true;
    }
  }

  if (answering && pending && answer) {
    // A tapped option is never a question: they picked from what we offered.
    if (!input.choice && looksLikeQuestion(answer) && waiting) {
      divertedFrom = waiting;
    } else if (pending.serviceId && qualifier) {
      const accepted = qualifier.accept(pending.serviceId, pending.slot, answer);

      if ("error" in accepted) {
        // It is not a valid answer. Before telling them so, check whether it is
        // a topic we know — "I need a translation" is not question-shaped and
        // is not a country, but it is plainly a change of subject, and
        // answering "the country name on its own is enough" to it would be
        // obtuse.
        //
        // Only an author's own intent counts here. Falling through to the model
        // on every mistyped answer would turn "Degre" into a paid call instead
        // of "please pick one of".
        const globals = edgesFrom(flow, flow.start.id);
        if (waiting && match(answer, intentsOn(flow, globals))) {
          divertedFrom = waiting;
        } else {
          // Say what was wrong and ask the same thing again. A rejected answer
          // must never advance the conversation — that is how a lead ends up
          // with a phone number nobody can call.
          effects.push({ kind: "say", nodeId: waiting?.id ?? "", text: accepted.error });
          consumed = true;
        }
      } else {
        slots[pending.slot] = accepted.value;
        pending = null;
        consumed = true;
      }
    } else {
      // A plain `ask` node has no schema behind it, so whatever they said is
      // the answer.
      slots[pending.slot] = answer;
      pending = null;
      consumed = true;
    }
  }

  // A tapped suggestion is an exact jump: no matching, no ambiguity, no cost.
  // `entry` is resolved to a real node before the walk, so the loop below never
  // has to reason about null and `switch (cursor.kind)` narrows properly.
  let entry: FlowNode | undefined;

  if (divertedFrom) {
    // They asked something instead. Answer it from a topic if we have one, and
    // from the model if we do not.
    //
    // Only those two, deliberately: `resolve` would also consider the start
    // node's state edges, and the page-context edge there would route the
    // question straight back into the qualification it is a break from — which
    // is how asking about cost got answered with "which country issued it?"
    // twice in a row.
    const globals = edgesFrom(flow, flow.start.id);
    const topic = match(answer, intentsOn(flow, globals));
    const edge =
      (topic
        ? globals.find((e) => e.when.kind === "intent" && e.when.intentId === topic)
        : undefined) ?? globals.find((e) => e.when.kind === "fallback");

    entry = edge ? flow.node.get(edge.to) : undefined;
  } else if (consumed && waiting) {
    // A qualify box owns its own loop, so it is re-entered: it asks the next
    // missing field, or finds nothing missing and takes its onward edge. Any
    // other box has had its answer and continues along its edges — re-entering
    // one of those would ask the same thing forever.
    if (waiting.kind === "qualify" || pending !== null) entry = waiting;
  } else if (input.targetNodeId) {
    entry = flow.node.get(input.targetNodeId);
  }

  if (!entry) {
    const from = waiting ?? flow.start;
    const edge = resolve(flow, from, input, slots, match);
    entry = edge ? flow.node.get(edge.to) : undefined;
  }

  if (!entry) {
    return {
      effects,
      state: { ...state, slots, pending },
      usedModel: false,
      matched: false,
    };
  }

  // Walk until something needs the visitor again.
  let cursor: FlowNode = entry;
  let stopped: FlowNode = entry;
  let hops = 0;

  while (hops++ < MAX_HOPS) {
    stopped = cursor;
    visited.add(cursor.id);

    if (cursor.kind === "say") {
      effects.push({ kind: "say", nodeId: cursor.id, text: fill(cursor.text, slots) });
      if (cursor.serviceSlug) effects.push({ kind: "topic", serviceSlug: cursor.serviceSlug });

      // A `say` stops, unless the author wired it to lead straight on — which
      // is how "here is the answer" is followed by "which country was it?".
      const onward = edgesFrom(flow, cursor.id).find((e) => e.when.kind === "always");
      const next = onward ? flow.node.get(onward.to) : undefined;
      if (!next) break;
      cursor = next;
      continue;
    }

    if (cursor.kind === "branch") {
      const edge = resolve(flow, cursor, { message: "" }, slots, match);
      const next = edge ? flow.node.get(edge.to) : undefined;
      // A branch with nothing to take is an authoring fault, not a runtime one.
      // `lint.ts` reports it; here we stop rather than loop.
      if (!next) {
        matched = false;
        break;
      }
      cursor = next;
      continue;
    }

    if (cursor.kind === "ask") {
      const slot = flow.slot.get(cursor.slot);
      effects.push({
        kind: "ask",
        nodeId: cursor.id,
        text: fill(cursor.text, slots),
        slot: cursor.slot,
        options: slot?.options ?? [],
      });
      pending = { slot: cursor.slot, serviceId: null };
      break;
    }

    if (cursor.kind === "qualify") {
      // Without a qualifier — no definitions loaded, or a test exercising the
      // graph alone — step through rather than announcing a lead we collected
      // nothing for.
      const question = qualifier?.next(cursor.serviceId, slots) ?? null;

      if (question) {
        effects.push({
          kind: "ask",
          nodeId: cursor.id,
          text: question.question,
          slot: question.slot,
          options: question.options,
        });
        pending = { slot: question.slot, serviceId: cursor.serviceId };
        break;
      }

      if (qualifier) {
        effects.push({
          kind: "qualified",
          nodeId: cursor.id,
          serviceId: cursor.serviceId,
          fields: qualifier.collected(cursor.serviceId, slots),
        });
      }

      const onward = edgesFrom(flow, cursor.id).find((e) => e.when.kind === "always");
      const next = onward ? flow.node.get(onward.to) : undefined;
      if (!next) break;
      cursor = next;
      continue;
    }

    if (cursor.kind === "jobs") {
      // Deliberately terminal, like a `say` with no onward edge: the reply is
      // a handful of listings and a link, and walking straight on from it would
      // put a question underneath an answer someone is still reading. What to
      // do next is offered as chips, which they can ignore.
      effects.push({
        kind: "jobs",
        nodeId: cursor.id,
        answers: cursor.answers,
        query: cursor.query,
        fallback: cursor.fallback,
        serviceSlug: cursor.serviceSlug,
      });
      if (cursor.serviceSlug) effects.push({ kind: "topic", serviceSlug: cursor.serviceSlug });
      break;
    }

    if (cursor.kind === "model") {
      usedModel = true;
      effects.push({ kind: "model", nodeId: cursor.id, guidance: cursor.guidance });
      break;
    }

    if (cursor.kind === "handoff") {
      effects.push({
        kind: "handoff",
        nodeId: cursor.id,
        text: fill(cursor.text, slots),
        reason: cursor.reason,
        serviceSlug: cursor.serviceSlug,
      });
      if (cursor.serviceSlug) effects.push({ kind: "topic", serviceSlug: cursor.serviceSlug });
      break;
    }

    // `start` and `end`. Landing on either means the walk is over.
    break;
  }

  // Back to what we were asking. Answering their question and then carrying on
  // as if the form had been abandoned is how someone ends up half-qualified and
  // never followed up.
  if (divertedFrom && pending && !effects.some((e) => e.kind === "ask")) {
    const resumed = pending.serviceId ? (qualifier?.next(pending.serviceId, slots) ?? null) : null;
    if (resumed) {
      effects.push({
        kind: "ask",
        nodeId: divertedFrom.id,
        text: resumed.question,
        slot: resumed.slot,
        options: resumed.options,
      });
      // The cursor goes back too, so their next message is read as the answer.
      stopped = divertedFrom;
    }
  }

  // An `ask` already asked its question; offering three other things to talk
  // about in the same breath is how a form stops being answered.
  const asking = effects.some((e) => e.kind === "ask");
  if (!asking) {
    const buttons = choices(flow, stopped.id);
    if (buttons.length > 0) effects.push({ kind: "choices", choices: buttons });

    const chips = suggestions(flow, stopped.id, visited);
    if (chips.length > 0) effects.push({ kind: "chips", chips });
  } else {
    // The options for whatever was just asked become buttons. They point back
    // at the node that asked, so tapping one reads as an answer rather than as
    // a jump somewhere else — unless the author wired that option to an edge of
    // its own, which wins.
    const question = effects.find((e) => e.kind === "ask");
    const buttons = (question?.options ?? []).map((label) => {
      const edge = edgesFrom(flow, stopped.id).find(
        (e) => e.when.kind === "choice" && e.when.label === label,
      );
      return { nodeId: edge?.to ?? stopped.id, label };
    });
    if (buttons.length > 0) effects.push({ kind: "choices", choices: buttons });
  }

  return {
    effects,
    state: { nodeId: stopped.id, slots, visited: [...visited], pending },
    usedModel,
    matched,
  };
}
