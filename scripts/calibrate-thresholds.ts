/**
 * Picking the similarity thresholds from evidence.
 *
 *   npx tsx --env-file=.env.local scripts/calibrate-thresholds.ts
 *
 * Two numbers decide how the chatbot behaves: how close a match must be to be
 * used, and how far ahead of the runner-up it must be. Chosen by intuition,
 * they either answer the wrong question or never fire — and both look, from
 * outside, like the bot simply being stupid.
 *
 * So this sweeps them against the questions we actually have: every question
 * and trigger an author wrote, plus every recorded turn the bank answered. For
 * each pair it reports what fraction land on the right node, and what fraction
 * abstain — because abstaining is not a failure. An abstention becomes a
 * fallback, which is a model call or a clarifying question; a *wrong* answer is
 * someone acting on the wrong advice about their visa.
 *
 * Held out, and that is the whole point. Every case is scored with *its own
 * phrasing removed from the intent it belongs to*, so what is measured is
 * whether the other ways of asking recognise this one. Scored the obvious way,
 * every question is one of the embedded phrases and scores exactly 1.000 —
 * a perfect result that says nothing.
 *
 * Reports only. Set the winner with CHAT_SIMILARITY_FLOOR / _MARGIN.
 */

import { answersCollection, messagesCollection } from "../lib/mongo/chat-db";
import { rankIntents } from "../lib/chat/flow/intents";
import { globalIntents } from "../lib/chat/flow/run";
import { loadDraft } from "../lib/chat/flow/store";
import { embed } from "../lib/ai/embed";
import type { Intent } from "../lib/chat/flow/schema";
import { buildSpace, embedFlow, loadFlowVectors, normalizePhrase, project } from "../lib/chat/flow/vectors";

const FLOORS = [0.2, 0.3, 0.4, 0.5, 0.6];
const MARGINS = [0, 0.03, 0.06, 0.1, 0.15];

async function main(): Promise<void> {
  const draft = await loadDraft();
  if (!draft) throw new Error("no flow — run scripts/migrate-answers-to-flow.ts first");

  const { total, embedded } = await embedFlow(draft.flow.doc);
  console.log(`Embedded ${embedded}/${total} phrases.`);
  if (embedded === 0) throw new Error("nothing embedded — check GEMINI_API_KEYS");

  const space = buildSpace(await loadFlowVectors(draft.flow.doc));
  const phrases = space.phrases;

  // Which node each global topic leads to, so a ranking can be scored against
  // the answer the bank gave.
  const nodeForIntent = new Map<string, string>();
  for (const edge of draft.flow.doc.edges) {
    if (edge.from === draft.flow.start.id && edge.when.kind === "intent") {
      nodeForIntent.set(edge.when.intentId, edge.to);
    }
  }

  const bank = await (await answersCollection())
    .find({ active: true }, { projection: { slug: 1, question: 1, trigger_groups: 1 } })
    .toArray();

  const cases: { question: string; expected: string; source: string }[] = [];
  for (const a of bank) {
    if (a.question) cases.push({ question: a.question, expected: `n-${a.slug}`, source: "authored" });
    for (const group of a.trigger_groups ?? []) {
      if (group.length > 0) {
        cases.push({ question: group.join(" "), expected: `n-${a.slug}`, source: "authored" });
      }
    }
  }

  // The honest cases: what visitors actually typed, which was never embedded.
  const messages = await (await messagesCollection())
    .find({}, { projection: { session_id: 1, role: 1, content: 1, source: 1, answer_slug: 1 } })
    .sort({ session_id: 1, created_at: 1, _id: 1 })
    .toArray();

  const questionBySlug = new Map(bank.map((a) => [a.slug, a.question ?? ""]));
  for (let i = 1; i < messages.length; i++) {
    const reply = messages[i];
    const asked = messages[i - 1];
    if (reply.role !== "model" || reply.source !== "canned" || !reply.answer_slug) continue;
    if (asked.role !== "user" || asked.session_id !== reply.session_id) continue;
    // A tapped suggestion is stored as the answer's own question and proves
    // nothing about matching.
    if (asked.content.trim() === (questionBySlug.get(reply.answer_slug) ?? "").trim()) continue;
    cases.push({ question: asked.content, expected: `n-${reply.answer_slug}`, source: "recorded" });
  }

  console.log(`Scoring ${cases.length} questions…`);
  const vectors = await embed(cases.map((c) => normalizePhrase(c.question)));
  if (!vectors) throw new Error("could not embed the questions");

  const globals = globalIntents(draft.flow);

  /** The same topics with one phrasing taken out — see the note at the top. */
  const without = (query: string): Intent[] => {
    const key = normalizePhrase(query);
    return globals.map((intent) => ({
      ...intent,
      name: normalizePhrase(intent.name) === key ? "" : intent.name,
      phrases: intent.phrases.filter((p) => normalizePhrase(p) !== key),
    }));
  };

  // Score once; the sweep is then pure arithmetic over the results rather than
  // one embedding call per threshold pair.
  const scored = cases.map((c, i) => {
    const ranked = rankIntents(project(space, vectors[i]), without(c.question), phrases);
    const best = ranked[0];
    const runnerUp = ranked[1];
    return {
      right: best ? nodeForIntent.get(best.id) === c.expected : false,
      score: best?.score ?? 0,
      gap: best && runnerUp ? best.score - runnerUp.score : 1,
    };
  });

  console.log("\n floor  margin    right    wrong   abstain");
  for (const floor of FLOORS) {
    for (const margin of MARGINS) {
      let right = 0;
      let wrong = 0;
      let abstain = 0;

      for (const s of scored) {
        if (s.score < floor || s.gap < margin) abstain++;
        else if (s.right) right++;
        else wrong++;
      }

      const pct = (n: number) => `${((n / scored.length) * 100).toFixed(1)}%`.padStart(7);
      console.log(`${floor.toFixed(2).padStart(6)}${margin.toFixed(2).padStart(8)}${pct(right)}${pct(wrong)}${pct(abstain)}`);
    }
  }

  const recorded = scored.filter((_, i) => cases[i].source === "recorded");
  console.log(
    `\n${scored.length} cases (${recorded.length} of them recorded from real visitors).`,
  );

  const top = scored.filter((s) => s.right).map((s) => s.score).sort((a, b) => a - b);
  const bad = scored.filter((s) => !s.right).map((s) => s.score).sort((a, b) => b - a);
  console.log(`\nRight answers score as low as ${top[0]?.toFixed(3)} (median ${top[Math.floor(top.length / 2)]?.toFixed(3)}).`);
  console.log(`Wrong answers score as high as ${bad[0]?.toFixed(3) ?? "n/a"}.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
