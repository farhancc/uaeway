/**
 * Reading last month's conversations and suggesting what to change.
 *
 * Runs nightly. It proposes; it never edits. Everything it produces lands in
 * `flow_proposals` for a person to approve, because on a site that tells people
 * what their visa needs, a change to what the bot says is a thing a human
 * agreed to.
 *
 * Two boundaries do most of the safety work here, and both are about limiting
 * what the model is allowed to be the source of:
 *
 * **Phrasings come from the transcripts, never from the model.** When a cluster
 * of unanswered questions turns out to be an existing topic asked differently,
 * the model's entire job is to say *which topic*. The phrasings added are the
 * visitors' own words, verbatim. There is nothing for it to invent.
 *
 * **A drafted answer is written from our own approved content.** Never from
 * what the model knows about UAE paperwork. If the site does not already answer
 * the question, no answer is drafted — the gap is reported instead, for someone
 * to write. That is the same rule the public pages follow: if we have not
 * confirmed it, we do not say it.
 */

import { z } from "zod";
import { generateJSON, generateText } from "../../ai/gemini";
import { embed } from "../../ai/embed";
import { serviceSlugs } from "../../services";
import { renderContext, retrieve } from "../retrieve";
import { rankIntents } from "./intents";
import { describe, fingerprint, type FlowPatch } from "./patch";
import { knownFingerprints, recordProposals, type NewProposal } from "./proposals";
import { globalIntents } from "./run";
import { loadSignals, type Gap } from "./signals";
import { loadLiveFlow } from "./store";
import { buildSpace, loadFlowVectors, normalizePhrase, project } from "./vectors";
import type { Intent } from "./schema";

/** How alike two unanswered questions must be to be treated as one gap. In the
 *  centred space, where scores spread from about 0.4 to 0.9. */
const CLUSTER_SIMILARITY = 0.55;

/** A single person asking something once is not yet a gap worth changing the
 *  flow for. Two is a pattern. */
const MIN_CLUSTER = 2;

/** Model calls per run. A nightly job with no ceiling is a bill with no
 *  ceiling. */
const MAX_CLUSTERS = 8;

/** Below this much traffic on a version, "nothing matched this topic" means
 *  nobody visited, not that the topic is dead. */
const MIN_TURNS_TO_RETIRE = 200;

const decision = z.object({
  /** The number of an existing topic, or 0 for none of them. */
  topic: z.number().int().min(0),
  /** Only read when `topic` is 0. */
  question: z.string().trim().max(200).optional(),
  service: z.string().trim().max(80).nullish(),
});

const CLASSIFY = `Visitors asked these questions and the assistant had no answer for them.

Decide whether they are other ways of asking one of the existing topics listed, or something none of them covers.

Reply with JSON only.
- If one of the topics covers them: {"topic": <number>}
- If none does: {"topic": 0, "question": "<the question, phrased once, plainly>", "service": "<slug or null>"}

Never answer the question. Never state a fee, a timescale or a rule.`;

const DRAFT = `Answer the question using ONLY the CONTEXT below.

- If the context does not answer it, reply with exactly: NOTHING
- Never state a fee, a duration or a legal requirement that is not in the context.
- Two or three plain sentences. No preamble.`;

/** Questions grouped by what they are asking. */
function cluster(gaps: Gap[], vectors: number[][]): Gap[][] {
  const used = new Set<number>();
  const clusters: Gap[][] = [];

  for (let i = 0; i < gaps.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const group = [gaps[i]];

    for (let j = i + 1; j < gaps.length; j++) {
      if (used.has(j)) continue;
      let dot = 0;
      for (let k = 0; k < vectors[i].length; k++) dot += vectors[i][k] * vectors[j][k];
      if (dot >= CLUSTER_SIMILARITY) {
        used.add(j);
        group.push(gaps[j]);
      }
    }

    clusters.push(group);
  }

  // The most asked first, so a capped run spends its calls on what matters.
  return clusters.sort((a, b) => b.length - a.length);
}

/** The visitors' own words, deduplicated and trimmed to what a phrase list can
 *  hold. Nothing here came from a model. */
function phrasesFrom(group: Gap[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const gap of group) {
    const question = gap.question.trim();
    const key = normalizePhrase(question);
    if (!key || key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(question);
    if (out.length >= 8) break;
  }
  return out;
}

async function draftAnswer(question: string): Promise<string | null> {
  const snippets = await retrieve(question);
  const context = renderContext(snippets);

  const reply = await generateText(
    `${DRAFT}\n\nCONTEXT\n${context}\n\nQUESTION\n${question}`,
    { temperature: 0.2, maxOutputTokens: 300 },
  );

  const text = reply?.trim() ?? "";
  // "NOTHING" is the honest answer often enough that it has to be the easy one
  // to give: an invented answer about attestation is worse than a gap on a list.
  if (!text || text.toUpperCase().startsWith("NOTHING") || text.length < 20) return null;
  return text;
}

export interface ImproveReport {
  /** Questions in the window the flow had no answer for. */
  gaps: number;
  /** Groups of them asking much the same thing. */
  clusters: number;
  /** Suggestions built from those groups. */
  proposals: number;
  /** Written — the rest were suggested before and decided on. */
  stored: number;
  skipped: number;
  /** Clusters that produced nothing, and why. Without this a run that does
   *  nothing is indistinguishable from a run with nothing to do. */
  unresolved: number;
}

export async function improveFlow(days = 30): Promise<ImproveReport> {
  const live = await loadLiveFlow();
  if (!live) return { gaps: 0, clusters: 0, proposals: 0, stored: 0, skipped: 0, unresolved: 0 };

  const signals = await loadSignals(days);
  const space = buildSpace(await loadFlowVectors(live.flow.doc));
  const topics = globalIntents(live.flow);
  const seen = await knownFingerprints();

  const proposals: NewProposal[] = [];
  let skipped = 0;
  let clusters = 0;
  let unresolved = 0;

  const add = (patch: FlowPatch | null, reason: string, evidence: string[], key: string) => {
    if (seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);
    proposals.push({ fingerprint: key, patch, reason, evidence });
  };

  // ── Questions we had no answer for ──────────────────────────────────────
  const gaps = signals.gaps;
  const vectors = gaps.length > 0 ? await embed(gaps.map((g) => normalizePhrase(g.question))) : [];

  if (vectors && gaps.length > 0) {
    const projected = vectors.map((v) => project(space, v));
    const groups = cluster(gaps, projected).filter((g) => g.length >= MIN_CLUSTER);

    for (const group of groups.slice(0, MAX_CLUSTERS)) {
      const evidence = group.map((g) => g.question);
      const phrases = phrasesFrom(group);
      if (phrases.length === 0) {
        unresolved++;
        continue;
      }

      // The topics this cluster is nearest to, so the model chooses from a
      // short list rather than from everything.
      const index = gaps.indexOf(group[0]);
      const nearest = rankIntents(projected[index], topics, space.phrases)
        .slice(0, 4)
        .flatMap((r) => {
          const intent = topics.find((t) => t.id === r.id);
          return intent ? [intent] : [];
        });

      clusters++;
      const chosen = await classify(group, nearest);
      if (!chosen) {
        unresolved++;
        console.warn(`[improve] could not classify: "${group[0].question}"`);
        continue;
      }

      if (chosen.topic >= 1 && chosen.topic <= nearest.length) {
        const intent: Intent = nearest[chosen.topic - 1];
        const patch: FlowPatch = { op: "addPhrases", intentId: intent.id, phrases };
        add(
          patch,
          `${group.length} people asked this and paid for a model answer — it is "${intent.name}" in other words.`,
          evidence,
          fingerprint(patch),
        );
        continue;
      }

      const question = chosen.question?.trim();
      if (!question) {
        unresolved++;
        console.warn(`[improve] no topic and no question for: "${group[0].question}"`);
        continue;
      }

      const service =
        chosen.service && serviceSlugs().includes(chosen.service) ? chosen.service : null;
      const answerMd = await draftAnswer(question);

      if (!answerMd) {
        // A real gap the site itself cannot answer. Reported rather than
        // guessed at.
        add(
          null,
          `${group.length} people asked about this and nothing on the site answers it. Worth writing.`,
          evidence,
          `gap:${normalizePhrase(question)}`,
        );
        continue;
      }

      const patch: FlowPatch = { op: "addAnswer", question, answerMd, serviceSlug: service, phrases };
      add(
        patch,
        `${group.length} people asked this and the flow has no box for it. Drafted from the site's own pages — check it.`,
        evidence,
        fingerprint(patch),
      );
    }
  }

  // ── Topics nothing ever matches ─────────────────────────────────────────
  const busiest = [...signals.versions.values()].reduce((a, b) => (b.turns > a.turns ? b : a), {
    turns: 0,
    model: 0,
    canned: 0,
    capped: 0,
    unavailable: 0,
  });

  if (busiest.turns >= MIN_TURNS_TO_RETIRE) {
    for (const edge of live.flow.doc.edges) {
      if (edge.from !== live.flow.start.id || edge.when.kind !== "intent") continue;
      if (signals.servedNodes.has(edge.to)) continue;

      const intent = live.flow.intent.get(edge.when.intentId);
      if (!intent) continue;

      const patch: FlowPatch = { op: "retireIntent", intentId: intent.id };
      add(
        patch,
        `"${intent.name}" has answered nobody in ${days} days, and every extra topic makes the others harder to tell apart.`,
        [],
        fingerprint(patch),
      );
    }
  }

  const stored = await recordProposals(proposals);
  return { gaps: gaps.length, clusters, proposals: proposals.length, stored, skipped, unresolved };
}

/** Which existing topic, if any, a cluster belongs to. */
async function classify(
  group: Gap[],
  nearest: Intent[],
): Promise<z.infer<typeof decision> | null> {
  const questions = group.slice(0, 8).map((g, i) => `${i + 1}. ${g.question}`).join("\n");
  const list = nearest.map((intent, i) => `${i + 1}. ${intent.name}`).join("\n");

  const raw = await generateJSON<unknown>(
    `${CLASSIFY}\n\nQUESTIONS\n${questions}\n\nEXISTING TOPICS\n${list || "(none)"}`,
  );

  const parsed = decision.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export { describe };
