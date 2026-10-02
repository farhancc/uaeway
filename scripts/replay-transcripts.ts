/**
 * Does the flow answer what the bank answered?
 *
 *   npx tsx --env-file=.env.local scripts/replay-transcripts.ts
 *
 * This is the gate, not a nicety. Swapping the matcher underneath a chatbot
 * that tells people what their visa needs is exactly the change where "it
 * seemed fine when I tried it" is worthless: every question you think to try is
 * one you wrote an intent for.
 *
 * Two corpora, because each answers a different question.
 *
 * **Recorded** — every turn the bank actually answered, taken from the stored
 * transcripts. Ground truth, but only covers what people have asked so far, and
 * a turn where someone tapped a suggestion proves nothing about matching, so
 * those are counted apart.
 *
 * **Authored** — every question and trigger group in the bank, replayed against
 * the flow built from it. Covers the whole bank rather than the popular corner
 * of it, and it is the one that catches a migration bug: if "how long does
 * attestation take" no longer reaches the attestation node, that is a fault
 * whether or not anyone has typed it yet.
 *
 * Reports parity and lists the misses. It changes nothing.
 */

import { answersCollection, messagesCollection } from "../lib/mongo/chat-db";
import { keywordMatcher, semanticMatcher } from "../lib/chat/flow/intents";
import { emptyState, runTurn, type MatchIntent } from "../lib/chat/flow/run";
import { loadDraft } from "../lib/chat/flow/store";
import { buildSpace, embedQuery, loadFlowVectors, project } from "../lib/chat/flow/vectors";
import type { FlowIndex } from "../lib/chat/flow/schema";

interface Case {
  question: string;
  /** The node the bank's answer became. */
  expected: string;
  /** Recorded turns only: the visitor typed it rather than tapping a chip. */
  typed: boolean;
}

interface Result {
  total: number;
  hit: number;
  misses: { question: string; expected: string; got: string }[];
}

/** Where a turn lands, or "" when nothing matched. */
function land(flow: FlowIndex, question: string, match: MatchIntent): string {
  const step = runTurn(flow, emptyState(), { message: question }, { match });
  const said = step.effects.find((e) => e.kind === "say" || e.kind === "model" || e.kind === "handoff");
  return said && "nodeId" in said ? said.nodeId : "";
}

async function replay(
  flow: FlowIndex,
  cases: Case[],
  matcherFor: (question: string) => Promise<MatchIntent>,
  keepMisses = 12,
): Promise<Result> {
  const misses: Result["misses"] = [];
  let hit = 0;

  for (const c of cases) {
    const got = land(flow, c.question, await matcherFor(c.question));
    if (got === c.expected) hit++;
    else if (misses.length < keepMisses) misses.push({ question: c.question, expected: c.expected, got: got || "(nothing)" });
  }

  return { total: cases.length, hit, misses };
}

function report(name: string, r: Result): void {
  if (r.total === 0) {
    console.log(`\n${name}: no cases.`);
    return;
  }
  const pct = ((r.hit / r.total) * 100).toFixed(1);
  console.log(`\n${name}: ${r.hit}/${r.total} (${pct}%)`);
  for (const m of r.misses) {
    console.log(`  · "${m.question}"`);
    console.log(`      expected ${m.expected}, got ${m.got}`);
  }
  if (r.misses.length < r.total - r.hit) {
    console.log(`  … and ${r.total - r.hit - r.misses.length} more`);
  }
}

async function main(): Promise<void> {
  const draft = await loadDraft();
  if (!draft) throw new Error("no flow to replay — run scripts/migrate-answers-to-flow.ts first");
  const flow = draft.flow;

  const bank = await (await answersCollection())
    .find({ active: true }, { projection: { slug: 1, question: 1, trigger_groups: 1 } })
    .toArray();

  const questionBySlug = new Map(bank.map((a) => [a.slug, a.question ?? ""]));

  // Authored: the canonical question, plus every exact trigger an author wrote.
  const authored: Case[] = [];
  for (const a of bank) {
    if (a.question) authored.push({ question: a.question, expected: `n-${a.slug}`, typed: true });
    for (const group of a.trigger_groups ?? []) {
      if (group.length > 0) {
        authored.push({ question: group.join(" "), expected: `n-${a.slug}`, typed: true });
      }
    }
  }

  // Recorded: a canned reply, and whatever the visitor said immediately before.
  const messages = await (await messagesCollection())
    .find(
      {},
      { projection: { session_id: 1, role: 1, content: 1, source: 1, answer_slug: 1 } },
    )
    .sort({ session_id: 1, created_at: 1, _id: 1 })
    .toArray();

  const recorded: Case[] = [];
  for (let i = 1; i < messages.length; i++) {
    const reply = messages[i];
    const asked = messages[i - 1];
    if (reply.role !== "model" || reply.source !== "canned" || !reply.answer_slug) continue;
    if (asked.role !== "user" || asked.session_id !== reply.session_id) continue;

    recorded.push({
      question: asked.content,
      expected: `n-${reply.answer_slug}`,
      // A tapped suggestion is stored as the answer's own question, so an exact
      // equality is the only signal we have that nothing was typed. It proves
      // nothing about matching, so it is reported separately rather than
      // inflating the score.
      typed: asked.content.trim() !== (questionBySlug.get(reply.answer_slug) ?? "").trim(),
    });
  }

  console.log(`Flow draft v${draft.version}: ${flow.doc.nodes.length} nodes, ${flow.doc.intents.length} intents`);

  // Both matchers, so the question "did adding embeddings break anything?" has
  // a number rather than an opinion. Keywords are the floor this must not fall
  // below.
  const space = buildSpace(await loadFlowVectors(flow.doc));
  const keywords = async () => keywordMatcher;
  const semantic = async (question: string) => {
    const raw = space.phrases.size > 0 ? await embedQuery(question) : null;
    return semanticMatcher({
      query: raw ? project(space, raw) : null,
      phrases: space.phrases,
    });
  };

  for (const [name, matcherFor] of [
    ["keywords only", keywords],
    ["with embeddings", semantic],
  ] as const) {
    console.log(`\n━━ ${name} ━━`);
    report("Authored (every question and trigger in the bank)", await replay(flow, authored, matcherFor));
    report("Recorded — typed questions", await replay(flow, recorded.filter((c) => c.typed), matcherFor));
    report("Recorded — tapped suggestions", await replay(flow, recorded.filter((c) => !c.typed), matcherFor));
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
