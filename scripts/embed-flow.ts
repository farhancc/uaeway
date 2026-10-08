/**
 * Fills in the vectors a published flow is missing.
 *
 *   npx tsx --env-file=.env.local scripts/embed-flow.ts
 *
 * Publishing embeds as it goes and is deliberately not fatal when it cannot:
 * an embedding outage must never stop someone shipping a fix to what the
 * chatbot says. The cost of that choice is a flow that is live and matching on
 * its authors' keyword groups alone, which is a *silent* degradation — the
 * replies still come, they are just worse for any phrasing nobody wrote down.
 * This is how that is repaired without republishing.
 *
 * Safe to run at any time and as often as you like. `flow_vectors` is
 * content-addressed, so a phrase that already has a vector costs nothing and a
 * run that gets half way through leaves the half it did behind.
 *
 * WHY IT PACES ITSELF
 *
 * The three Gemini keys in the pool have separate limits and they recover on
 * different clocks — a per-minute rate limit frees up in under a minute, a
 * daily cap does not. A single pass over ten thousand phrases exhausts all
 * three in seconds and then fails the rest instantly; waiting between rounds
 * is what turns one bad minute into a complete run. `lib/ai/pool.ts` already
 * benches an exhausted key, so this only has to leave it time to come back.
 *
 * AFTER IT FINISHES, RESTART THE SERVER
 *
 * `vectorsForVersion` caches the space per version id for the life of the
 * process and never invalidates it, because a published version does not
 * change. A process that has already served a turn on this version is holding
 * whatever was embedded at the time, so new vectors do not reach it until it
 * restarts. That is the one manual step here and it is easy to forget.
 */

import { embeddablePhrases, type FlowDoc } from "../lib/chat/flow/schema";
import { loadFlowVectors, ensureVectors } from "../lib/chat/flow/vectors";
import { loadLiveFlow, loadSubjectDocs } from "../lib/chat/flow/store";

/** Long enough for a per-minute limit to lapse, short enough to be worth
 *  waiting through. A key on a daily cap will not come back in this and the
 *  run will report it as still missing rather than hanging on it. */
const PAUSE_MS = 65_000;
const ROUNDS = 8;

/** Two rounds in a row with nothing embedded means the keys are on a daily cap
 *  rather than a per-minute one, and no amount of waiting inside one run will
 *  fix that. Measured the hard way: eight rounds and eight minutes of waiting
 *  for zero phrases. */
const GIVE_UP_AFTER_STALLED = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Everything the live version serves: the main document and every pack
 *  behind a `subject` door. The packs are most of the phrases. */
async function liveDocs(): Promise<{ label: string; doc: FlowDoc }[]> {
  const live = await loadLiveFlow();
  if (!live) throw new Error("nothing is published, so there is nothing to embed");

  const packs = await loadSubjectDocs(live.id);
  return [
    { label: `v${live.version} main`, doc: live.flow.doc },
    ...packs.map(({ subject, doc }) => ({ label: `pack ${subject}`, doc })),
  ];
}

async function missing(docs: { label: string; doc: FlowDoc }[]): Promise<number> {
  let gap = 0;
  for (const { label, doc } of docs) {
    const phrases = embeddablePhrases(doc);
    const have = await loadFlowVectors(doc);
    const short = phrases.length - have.size;
    gap += short;
    console.log(
      `  ${label.padEnd(22)} ${String(have.size).padStart(5)}/${String(phrases.length).padEnd(5)} embedded` +
        (short > 0 ? `  — ${short} missing` : "  ✓"),
    );
  }
  return gap;
}

async function main(): Promise<void> {
  const docs = await liveDocs();

  console.log("Before:");
  let gap = await missing(docs);
  if (gap === 0) {
    console.log("\nNothing missing. The live flow matches semantically.");
    return;
  }

  let stalled = 0;
  for (let round = 1; round <= ROUNDS && gap > 0; round++) {
    console.log(`\nRound ${round} of ${ROUNDS} — ${gap} phrases to go.`);
    for (const { doc } of docs) await ensureVectors(embeddablePhrases(doc));

    const before = gap;
    gap = await missing(docs);

    if (gap === 0) break;

    stalled = gap === before ? stalled + 1 : 0;
    if (stalled >= GIVE_UP_AFTER_STALLED) {
      console.log("  no progress for two rounds — the keys are on a daily cap, not a rate limit.");
      break;
    }
    if (gap === before) console.log("  no progress this round — every key is exhausted.");

    if (round < ROUNDS) {
      console.log(`  waiting ${PAUSE_MS / 1000}s for a key to come back…`);
      await sleep(PAUSE_MS);
    }
  }

  console.log(
    gap === 0
      ? "\nDone. Restart the server so it picks the new vectors up — the space is cached per version."
      : `\nStopped with ${gap} phrases still missing. A key is on a long cap; run this again when it resets.`,
  );
}

main()
  .catch((err) => {
    console.error(`\n${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
