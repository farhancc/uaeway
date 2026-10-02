/**
 * Folds the authored content modules into the flow draft.
 *
 *   npx tsx --env-file=.env.local scripts/seed-authored-flows.ts
 *
 * Same bargain `migrate-answers-to-flow.ts` makes, and for the same reason:
 * this writes **the draft** and never moves the live pointer. Nothing a visitor
 * sees changes until a person looks at /admin/flow and publishes, so rolling
 * back a bad seed is "don't publish" rather than a database repair.
 *
 * Idempotent. `mergeFlows` keys on id, so re-running after fixing a sentence
 * replaces that node's text and leaves the canvas layout alone — which makes
 * editing the content file the way to edit the flow.
 *
 * Every module is concatenated and built **once**, not built separately and
 * merged. That is what lets one module's `next` point into another's, and it
 * makes the builder's duplicate-id check a cross-module check for free — worth
 * having when three people are authoring into one graph.
 */

import { loadDefinitions } from "../lib/chat/qualify/store";
import { lintFlow, publishable } from "../lib/chat/flow/lint";
import {
  buildAuthoredFlow,
  mergeFlows,
  mergedCounts,
  type AuthoredFlow,
} from "../lib/chat/flow/authored";
import { flowDoc, type FlowDoc } from "../lib/chat/flow/schema";
import { loadDraft, saveDraft } from "../lib/chat/flow/store";
import { ATTESTATION_FLOWS } from "./seed-data/attestation-flows";

/**
 * The limits in `flowDoc`, restated so exceeding them is an explained failure
 * rather than a wall of zod.
 *
 * They bind on the *merged* draft, not per module, and with several content
 * modules landing in one graph they are now a real constraint rather than a
 * theoretical one. Reporting the arithmetic is the difference between "trim
 * something" and twenty minutes of guessing what.
 */
const CAPS = { nodes: 1750, intents: 1750, edges: 7000 };

/**
 * A module that is being written by someone else right now.
 *
 * Imported dynamically so a module mid-rewrite is reported and skipped instead
 * of taking the whole seed down with it. Temporary, and the honest alternative
 * to either a static import that breaks daily or pretending the file is ours.
 */
const OPTIONAL: { path: string; exportName: string; label: string }[] = [
  { path: "./seed-data/notarisation", exportName: "NOTARISATION_FLOWS", label: "notarisation" },
  { path: "./seed-data/business-setup-flows", exportName: "BUSINESS_SETUP_FLOWS", label: "business setup" },
  { path: "./seed-data/higher-studies-notarisation", exportName: "HIGHER_STUDIES_FLOWS", label: "higher studies" },
  { path: "./seed-data/visa-flows", exportName: "VISA_FLOWS", label: "visa processing" },
  { path: "./seed-data/translation-flows", exportName: "TRANSLATION_FLOWS", label: "legal translation" },
  { path: "./seed-data/job-search-flows", exportName: "JOB_SEARCH_FLOWS", label: "job search" },
  { path: "./seed-data/relocation-flows", exportName: "RELOCATION_FLOWS", label: "relocation" },
];

async function collect(): Promise<AuthoredFlow[]> {
  const flows: AuthoredFlow[] = [...ATTESTATION_FLOWS];
  console.log(`  attestation      ${String(ATTESTATION_FLOWS.length).padStart(4)} entries`);

  for (const mod of OPTIONAL) {
    try {
      const loaded = (await import(mod.path)) as Record<string, unknown>;
      const entries = loaded[mod.exportName];
      if (!Array.isArray(entries)) {
        console.log(`  ${mod.label.padEnd(16)}    — skipped: no ${mod.exportName} export`);
        continue;
      }
      flows.push(...(entries as AuthoredFlow[]));
      console.log(`  ${mod.label.padEnd(16)} ${String(entries.length).padStart(4)} entries`);
    } catch (err) {
      console.log(`  ${mod.label.padEnd(16)}    — skipped: ${(err as Error).message.split("\n")[0]}`);
    }
  }

  return flows;
}

/** The draft to fold into, or an empty graph when there is not one yet. */
async function base(): Promise<FlowDoc> {
  const draft = await loadDraft();
  if (draft) {
    console.log(`\nFolding into draft v${draft.version} (${draft.flow.doc.nodes.length} nodes).`);
    return draft.flow.doc;
  }
  console.log("\nNo draft yet — the authored flow will be the whole of it.");
  return flowDoc.parse({
    nodes: [{ kind: "start", id: "start" }],
    edges: [],
    intents: [],
    slots: [],
  });
}

function checkCaps(counts: { nodes: number; intents: number; edges: number }): void {
  const over = Object.keys(CAPS).filter(
    (k) => counts[k as keyof typeof counts] > CAPS[k as keyof typeof CAPS],
  );

  console.log(
    `\nMerged: ${counts.nodes}/${CAPS.nodes} nodes, ` +
      `${counts.intents}/${CAPS.intents} intents, ${counts.edges}/${CAPS.edges} edges.`,
  );

  if (over.length === 0) return;

  for (const key of over) {
    const k = key as keyof typeof counts;
    console.error(
      `\n\u2717 ${counts[k]} ${key} exceeds the ${CAPS[k]} the schema allows, by ${counts[k] - CAPS[k]}.`,
    );
  }
  console.error(
    "\nThe caps are in lib/chat/flow/schema.ts and bind on the merged draft, not per module.\n" +
      "Either trim a content module, cut `next` links (each one is an edge), or raise the\n" +
      "caps deliberately \u2014 the whole document is loaded and cached on every turn, and every\n" +
      "phrase is embedded at publish, so raising them is a cost decision, not a formality.",
  );
  throw new Error("merged flow exceeds the schema's limits");
}

async function main(): Promise<void> {
  console.log("Content modules:");
  const flows = await collect();

  const definitions = await loadDefinitions();
  if (definitions.size === 0) {
    console.warn("\nNo service definitions — run scripts/seed-service-definitions.ts first, or a\n" +
      "qualify box will step straight through and no lead will be captured.");
  }

  const authored = buildAuthoredFlow(flows);
  const existing = await base();

  // Before the merge, not after: `mergeFlows` parses, and a document over the
  // cap fails there with a zod dump instead of the explanation above.
  checkCaps(mergedCounts(existing, authored));

  const merged = mergeFlows(existing, authored);

  const findings = lintFlow(merged);
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  for (const f of errors) console.log(`  ✗ ${f.nodeId ?? f.intentId ?? ""} ${f.message}`);
  if (warnings.length > 0) console.log(`  · ${warnings.length} warnings (unreachable boxes, unwired intents)`);

  const quotes = flows.filter((f) => f.quote).length;
  console.log(
    `\n${flows.length} authored entries — ${quotes} of them money questions that walk into a callback.`,
  );

  await saveDraft(merged);
  console.log(
    publishable(findings)
      ? "Draft saved, no blocking findings. Publish it from /admin/flow when you have looked at it."
      : "Draft saved with blocking findings above — fix them before publishing.",
  );
}


main()
  .catch((err) => {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
