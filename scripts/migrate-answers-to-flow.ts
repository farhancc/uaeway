/**
 * Turns the answer bank into the first flow.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-answers-to-flow.ts
 *
 * Deterministic and idempotent: it reads the live answers, builds one graph and
 * saves it as **the draft**. The `answers` collection is not touched and the
 * live pointer is not moved, so nothing a visitor sees changes until a person
 * publishes — which means rollback is "don't publish", and re-running after an
 * edit in /admin/answers simply rebuilds the draft.
 *
 * The mapping is the whole point, so it is written out plainly:
 *
 *   answer          → a `say` node, keeping its markdown, service and position
 *   question        → the intent's name, and the node's FAQ question
 *   trigger_groups  → hintKeywords, unchanged: exact matching survives intact
 *   any_keywords    → hintKeywords as one-word groups, and phrases
 *   keywords        → phrases, which is what phase two embeds
 *   follow_up_slugs → intent edges out of the node
 *   choices         → choice edges out of the node
 *   is_opener       → sorts that answer's start edge to the front
 *
 * One thing is not a rename. Every answer gets an edge from `start`, not only
 * the openers, because the old matcher scanned the whole bank on every turn
 * regardless of what had been said. Wiring only the openers globally would have
 * quietly made two thirds of the bank unreachable except as a follow-up.
 */

import { answersCollection } from "../lib/mongo/chat-db";
import { loadDefinitions } from "../lib/chat/qualify/store";
import { SERVICE_SLOT } from "../lib/chat/page-context";
import { lintFlow, publishable } from "../lib/chat/flow/lint";
import { flowDoc, type FlowDoc, type FlowEdge, type FlowNode, type Intent } from "../lib/chat/flow/schema";
import { saveDraft } from "../lib/chat/flow/store";

const START = "start";
const FALLBACK = "fallback-model";

/** Non-openers sort after every opener while keeping their own order. */
const NON_OPENER_BASE = 500;

/** Labels start on the line; an author drags the ones that end up crowded. */
const NO_OFFSET = { x: 0, y: 0 };

/** Canvas geometry. Answers are laid out in a column per service so the first
 *  time someone opens the builder they see the shape of the site, not a knot. */
const COL_WIDTH = 360;
const ROW_HEIGHT = 140;

function nodeId(slug: string): string {
  return `n-${slug}`;
}

function intentId(slug: string): string {
  return `i-${slug}`;
}

interface BankRow {
  slug: string;
  question: string;
  answer_md: string;
  service_slug: string | null;
  keywords: string[];
  trigger_groups: string[][];
  any_keywords: string[];
  choices: { label: string; answer_slug: string }[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
}

async function readBank(): Promise<BankRow[]> {
  const docs = await (await answersCollection())
    .find({ active: true })
    .sort({ position: 1 })
    .toArray();

  return docs.map((d) => ({
    slug: d.slug,
    question: d.question ?? "",
    answer_md: d.answer_md ?? "",
    service_slug: d.service_slug ?? null,
    keywords: d.keywords ?? [],
    trigger_groups: d.trigger_groups ?? [],
    any_keywords: d.any_keywords ?? [],
    choices: d.choices ?? [],
    follow_up_slugs: d.follow_up_slugs ?? [],
    is_opener: d.is_opener ?? false,
    show_on_page: d.show_on_page ?? true,
    position: d.position ?? 0,
  }));
}

/**
 * Everything that could match this answer, in one list.
 *
 * Trigger groups are joined back into a sentence rather than kept as word
 * lists: "degree attestation india" is a thing someone types, and it is what an
 * embedding should be taken of. The exact-matching form of the same groups is
 * preserved separately in `hintKeywords`, so nothing is traded away here.
 */
function phrasesFor(row: BankRow): string[] {
  const all = [
    row.question,
    ...row.keywords,
    ...row.any_keywords,
    ...row.trigger_groups.map((g) => g.join(" ")),
  ];

  const seen = new Set<string>();
  return all
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
}

function build(bank: BankRow[], services: Map<string, { name: string }>): FlowDoc {
  const known = new Set(bank.map((r) => r.slug));

  // Columns by service, in first-seen order, so the layout is stable across
  // runs rather than reshuffling whenever an answer is added.
  const columns: string[] = [];
  const rowInColumn = new Map<string, number>();
  const place = (service: string | null) => {
    const key = service ?? "";
    let column = columns.indexOf(key);
    if (column === -1) column = columns.push(key) - 1;
    const row = rowInColumn.get(key) ?? 0;
    rowInColumn.set(key, row + 1);
    return { x: column * COL_WIDTH, y: row * ROW_HEIGHT };
  };

  const nodes: FlowNode[] = [
    { kind: "start", id: START, position: { x: -COL_WIDTH, y: 0 } },
    {
      kind: "model",
      id: FALLBACK,
      position: { x: -COL_WIDTH, y: ROW_HEIGHT * 2 },
      guidance: "",
    },
  ];
  const intents: Intent[] = [];
  const edges: FlowEdge[] = [];

  for (const row of bank) {
    nodes.push({
      kind: "say",
      id: nodeId(row.slug),
      position: place(row.service_slug),
      text: row.answer_md,
      serviceSlug: row.service_slug,
      faqQuestion: row.show_on_page ? row.question : null,
    });

    intents.push({
      id: intentId(row.slug),
      name: row.question,
      phrases: phrasesFor(row),
      // The two exact categories collapse into one list of AND-groups. A
      // one-word group is exactly what an `any_keyword` meant.
      hintKeywords: [
        ...row.trigger_groups.filter((g) => g.length > 0),
        ...row.any_keywords.filter((k) => k.trim()).map((k) => [k]),
      ],
    });

    edges.push({
      id: `e-start-${row.slug}`,
      from: START,
      to: nodeId(row.slug),
      when: { kind: "intent", intentId: intentId(row.slug) },
      position: (row.is_opener ? 0 : NON_OPENER_BASE) + row.position,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
  }

  for (const row of bank) {
    row.follow_up_slugs.forEach((slug, i) => {
      if (!known.has(slug)) return;
      edges.push({
        id: `e-${row.slug}-follow-${slug}`,
        from: nodeId(row.slug),
        to: nodeId(slug),
        when: { kind: "intent", intentId: intentId(slug) },
        position: i,
        labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
      });
    });

    row.choices.forEach((choice, i) => {
      if (!known.has(choice.answer_slug)) return;
      edges.push({
        id: `e-${row.slug}-choice-${i}`,
        from: nodeId(row.slug),
        to: nodeId(choice.answer_slug),
        when: { kind: "choice", label: choice.label },
        position: i,
        labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
      });
    });
  }

  // The part the bank had no shape for at all: turning a question into a lead.
  //
  // One qualify box per service, not one per field — the questions and their
  // order live in the service definition, so a six-field service is one box
  // here and six rows in the Service Builder.
  //
  // Two ways in. An intent, for someone who asks for a quote outright. And the
  // page they are on: `service_id` is set from the URL, and because state is
  // checked *after* intents, that edge catches the visitor who typed something
  // we do not recognise while standing on a service page — which used to be a
  // model call that answered nobody.
  let row = 0;
  for (const [serviceId, def] of services) {
    const qualifyId = `q-${serviceId}`;
    const handoffId = `h-${serviceId}`;
    const y = row++ * ROW_HEIGHT * 2;

    nodes.push({ kind: "qualify", id: qualifyId, position: { x: -COL_WIDTH * 2, y }, serviceId });
    nodes.push({
      kind: "handoff",
      id: handoffId,
      position: { x: -COL_WIDTH * 3, y },
      text: `Thank you — that is everything we need. Our ${def.name.toLowerCase()} team will come back to you.`,
      reason: "qualified",
      serviceSlug: serviceId,
    });

    intents.push({
      id: `i-quote-${serviceId}`,
      name: `a quote for ${def.name.toLowerCase()}`,
      phrases: [`how much for ${def.name.toLowerCase()}`, `quote for ${def.name.toLowerCase()}`, "get a quote", "i want to book this"],
      hintKeywords: [["quote"], ["book"]],
    });

    edges.push({
      id: `e-start-quote-${serviceId}`,
      from: START,
      to: qualifyId,
      when: { kind: "intent", intentId: `i-quote-${serviceId}` },
      position: NON_OPENER_BASE * 2 + row,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
    edges.push({
      id: `e-start-page-${serviceId}`,
      from: START,
      to: qualifyId,
      when: { kind: "slot", slot: SERVICE_SLOT, op: "eq", value: serviceId },
      position: 9000 + row,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
    edges.push({
      id: `e-${serviceId}-qualified`,
      from: qualifyId,
      to: handoffId,
      when: { kind: "always" },
      position: 0,
      labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
    });
  }

  // The one edge the bank had no way to express: what happens when nothing
  // matches. Until now that decision was hard-coded in `planReply`.
  edges.push({
    id: "e-start-fallback",
    from: START,
    to: FALLBACK,
    when: { kind: "fallback" },
    position: 9999,
    labelOffset: NO_OFFSET,
      tagOffset: NO_OFFSET,
  });

  return flowDoc.parse({
    nodes,
    edges,
    intents,
    // Declared so an author can branch on the page's service from anywhere.
    // Qualification fields are not declared here: they come from the service
    // definition, which the graph cannot see.
    slots: [{ key: SERVICE_SLOT, label: "Service from the page", kind: "text", options: [] }],
  });
}

async function main(): Promise<void> {
  const bank = await readBank();
  if (bank.length === 0) throw new Error("the answer bank is empty — nothing to migrate");

  const definitions = await loadDefinitions();
  if (definitions.size === 0) {
    console.warn("No service definitions — run scripts/seed-service-definitions.ts first.\n");
  }

  const doc = build(bank, definitions);
  const findings = lintFlow(doc);

  for (const f of findings) {
    console.log(`  ${f.severity === "error" ? "✗" : "·"} ${f.nodeId ?? f.intentId ?? ""} ${f.message}`);
  }

  await saveDraft(doc);

  console.log(
    `\nDraft saved: ${doc.nodes.length} nodes, ${doc.edges.length} edges, ${doc.intents.length} intents` +
      ` (from ${bank.length} answers).`,
  );
  console.log(
    publishable(findings)
      ? "No blocking findings. Publish it from /admin/flow when you have looked at it."
      : "Blocking findings above — fix them in the draft before publishing.",
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
