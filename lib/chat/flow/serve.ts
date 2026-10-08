/**
 * The flow, as the chat route sees it.
 *
 * Everything that needs a database or an environment variable lives here, so
 * `run.ts` stays pure and the route stays a translator. Two jobs: pick the
 * version this conversation is on, and run one turn against it.
 *
 * While `CHAT_FLOW` is off this returns null on every call and the answer bank
 * serves exactly as before. That is the whole switch — there is no half state,
 * and turning it back off is a redeploy rather than a data change.
 */

import { ambiguousIntents, keywordMatcher, rankIntents, semanticMatcher } from "./intents";
import { chooseIntent } from "./jev";
import { embedQuery, project, vectorsForVersion } from "./vectors";
import { globalIntents } from "./run";
import { loadQualifier } from "../qualify";
import { extractFields } from "../qualify/extract";
import { getDefinition } from "../qualify/store";
import { missingRequired } from "../qualify/engine";
import { MAX_AI_TURNS } from "../session";
import { JOB_SLOT, SERVICE_SLOT, type PageContext } from "../page-context";
import { FALLBACK_NODE } from "./authored";
import { runTurn, type FlowState, type Qualifier, type Step, type TurnInput } from "./run";
import { loadFlowVersion, loadLiveFlow, loadSubjectFlow, type LoadedFlow } from "./store";
import type { Session } from "../session";

/** On only when set explicitly. A missing variable must mean the old path. */
export function flowEnabled(): boolean {
  return process.env.CHAT_FLOW === "on";
}

export interface FlowTurn {
  step: Step;
  versionId: string;
  version: number;
}

/**
 * The version this conversation is answering from.
 *
 * Pinned on the session's first flow turn and honoured for the rest of it, so a
 * publish never changes the graph underneath someone mid-conversation. If the
 * pinned version has since been deleted — or no longer parses after a schema
 * change — we fall forward to live rather than ending the conversation: a
 * visitor losing their thread is worse than a visitor whose next answer comes
 * from a newer graph.
 */
async function versionFor(session: Session): Promise<LoadedFlow | null> {
  if (session.flowVersionId) {
    const pinned = await loadFlowVersion(session.flowVersionId);
    if (pinned) return pinned;
    console.warn(`[flow] session ${session.id} was pinned to a version that no longer loads`);
  }
  return loadLiveFlow();
}

/**
 * One turn, or null when the flow is not serving this conversation — switched
 * off, or nothing published yet. Null is the caller's signal to run the bank.
 */
export async function runFlowTurn(
  session: Session,
  input: TurnInput,
  context: PageContext,
): Promise<FlowTurn | null> {
  if (!flowEnabled()) return null;

  const loaded = await versionFor(session);
  if (!loaded) return null;

  // The page's service enters the conversation as a slot, so routing on it uses
  // the `slot` edge condition that already exists rather than a second
  // mechanism for the same idea. Never overwrites: once the conversation has
  // established a service, walking onto another page does not change it
  // underneath the questions already answered.
  const state = { ...session.flowState, slots: { ...session.flowState.slots } };
  if (context.serviceId && !state.slots[SERVICE_SLOT]) {
    state.slots[SERVICE_SLOT] = context.serviceId;
  }
  // The listing, by contrast, is overwritten every turn: someone reading three
  // vacancies in one conversation means "this one" to be the page they are on
  // now, where the service they are being qualified for is a thing they decided
  // once. Same mechanism, opposite rule, and the difference is the question
  // each one answers.
  if (context.jobSlug) state.slots[JOB_SLOT] = context.jobSlug;

  const deps = {
    extracted: await extractFor(state, input, session),
    qualifier: await loadQualifier(),
    // One disambiguation call per turn at most, however many documents the
    // turn touches. Without the latch a question that crosses into a subject
    // pack would pay for JEV twice — once to decide it is about CVs and again
    // to decide which CV answer — which is two model calls to answer one
    // message.
    jev: { spent: false },
    entered: new Set<string>(),
  };

  return {
    step: await turnIn(loaded, loaded, state, input, session, deps),
    versionId: loaded.id,
    version: loaded.version,
  };
}

interface TurnDeps {
  extracted: Record<string, string> | undefined;
  qualifier: Qualifier;
  jev: { spent: boolean };
  /**
   * Subjects this turn has already walked into, which is what stops it going
   * round for ever.
   *
   * A message can match a door and then match nothing behind it — "will you
   * write my CV for me" is a phrase on the door and deliberately not an
   * answer in the pack. The miss used to send the turn back to the main flow,
   * where the same message matched the same door, which loaded the same pack.
   * The request simply never came back. Found by asking the live chat that
   * exact question, not by any test: the tests walked the two stages by hand
   * and so could not loop.
   */
  entered: Set<string>;
}

/**
 * One turn, across however many documents it takes.
 *
 * A subject's answers live in their own document (`subject` nodes in
 * ./schema.ts say why), so a question about CVs is matched twice: once in the
 * main flow, which decides the question is about CVs at all, and once inside
 * the pack, which decides which answer it is. Both stages run against the same
 * embedding of the message — `embedQuery` caches it — so the second costs a
 * load and no model call.
 *
 * Three paths through here and they are all one turn to the visitor:
 *
 *   - already inside a pack, and the pack answers → one match, in the pack;
 *   - already inside a pack and it has nothing → the main flow is asked again
 *     with the cursor cleared, which is how someone walks out of a subject by
 *     changing it;
 *   - in the main flow, which routes to a `subject` door → the pack is loaded
 *     and asked in the same turn, so landing on an answer still takes one
 *     message rather than two.
 */
async function turnIn(
  main: LoadedFlow,
  here: LoadedFlow,
  state: FlowState,
  input: TurnInput,
  session: Session,
  deps: TurnDeps,
): Promise<Step> {
  const step = runTurn(
    here.flow,
    { ...state },
    { ...input, extracted: deps.extracted },
    { match: await matcherFor(here, input, session, deps.jev), qualifier: deps.qualifier },
  );

  const door = step.effects.find((e) => e.kind === "subject");
  if (door) {
    if (deps.entered.has(door.subject)) {
      // Second time through the same door this turn: the pack has already
      // said it has nothing. Take the main flow's fallback by an exact jump
      // rather than matching again, which would only find the door a third
      // time.
      return runTurn(
        main.flow,
        { ...state, nodeId: null, subject: null },
        { ...input, targetNodeId: FALLBACK_NODE },
        { match: await matcherFor(main, input, session, deps.jev), qualifier: deps.qualifier },
      );
    }
    deps.entered.add(door.subject);

    const pack = await loadSubjectFlow(main.id, door.subject);
    if (!pack) {
      // The door was published without the room. Said rather than swallowed,
      // because the alternative is a visitor getting the generic fallback to a
      // question we have two hundred answers to.
      console.warn(`[flow] no "${door.subject}" pack for version ${main.id}`);
      return {
        ...step,
        effects: [{ kind: "say", nodeId: door.nodeId, text: door.fallback }],
        state: { ...step.state, subject: null },
      };
    }

    // Entering, so the cursor starts at the pack's own start rather than at a
    // node id that belongs to the document we just left.
    const inside = await turnIn(
      main,
      pack,
      { ...step.state, nodeId: null, subject: door.subject },
      input,
      session,
      deps,
    );
    return { ...inside, usedModel: step.usedModel || inside.usedModel };
  }

  // Nothing in this pack answers it. Ask the main flow before giving up, or a
  // visitor who asked about a CV and then about attestation would be answered
  // out of the CV pack's fallback for the rest of the conversation.
  if (!step.matched && here !== main) {
    return turnIn(main, main, { ...state, nodeId: null, subject: null }, input, session, deps);
  }

  return step;
}

/**
 * How this turn's message will be matched.
 *
 * One embedding per typed message and no more. A tapped suggestion costs
 * nothing — it is an exact jump — and neither does a turn on a flow that was
 * published without vectors, which falls back to the keywords the answer bank
 * always used.
 *
 * The disambiguation call happens here, before the walk, because the walk is
 * synchronous and because the candidates worth choosing between are the topics
 * reachable from the start node, which is knowable up front.
 */
async function matcherFor(
  loaded: LoadedFlow,
  input: TurnInput,
  session: Session,
  jev: { spent: boolean },
) {
  if (!input.message) return keywordMatcher;

  const space = await vectorsForVersion(loaded.id, loaded.flow.doc);
  const phrases = space.phrases;
  if (phrases.size === 0) return keywordMatcher;

  const raw = await embedQuery(input.message);
  if (!raw) return semanticMatcher({ query: null, phrases });

  // Into the same centred space the phrases live in, or the comparison is
  // against a space the query is not in.
  const query = project(space, raw);

  const globals = globalIntents(loaded.flow);
  const ambiguous = ambiguousIntents(rankIntents(query, globals, phrases));

  // Gated on the same budget a model reply is. A conversation past its cap
  // still matches, still answers from the flow and still qualifies — it just
  // stops paying to break ties.
  if (ambiguous.length < 2 || session.aiTurns >= MAX_AI_TURNS || jev.spent) {
    return semanticMatcher({ query, phrases });
  }
  jev.spent = true;

  const byId = new Map(globals.map((i) => [i.id, i]));
  const shortlist = ambiguous.flatMap((a) => {
    const intent = byId.get(a.id);
    return intent ? [intent] : [];
  });

  const decided = await chooseIntent(input.message, shortlist);
  if (decided) {
    console.info(`[jev] ${shortlist.length} candidates → ${byId.get(decided)?.name ?? decided}`);
  }
  return semanticMatcher({ query, phrases, decided });
}

/**
 * Whether to spend a model call reading this message for several answers.
 *
 * Only mid-qualification, only when more than one thing is still missing, and
 * only within the conversation's budget — otherwise the question we are about
 * to ask collects the same value for nothing.
 *
 * Returns undefined rather than an empty object when it does not run, so the
 * walk can tell "nothing was stated" from "we did not look".
 */
async function extractFor(
  state: FlowState,
  input: TurnInput,
  session: Session,
): Promise<Record<string, string> | undefined> {
  const pending = state.pending;
  if (!pending?.serviceId || !input.message || input.choice || input.targetNodeId) return undefined;
  if (session.aiTurns >= MAX_AI_TURNS) return undefined;

  const definition = await getDefinition(pending.serviceId);
  if (!definition) return undefined;

  const missing = missingRequired(definition, state.slots);
  if (missing.length < 2) return undefined;

  const found = await extractFields(input.message, missing);
  if (Object.keys(found).length > 0) {
    console.info(`[extract] ${Object.keys(found).join(", ")} from one message`);
  }
  return found;
}
