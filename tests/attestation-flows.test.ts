import { describe, expect, it } from "vitest";
import { ATTESTATION_FLOWS } from "../scripts/seed-data/attestation-flows";
import {
  buildAuthoredFlow,
  mergeFlows,
  mergedCounts,
  qualifyNodeId,
  type AuthoredFlow,
} from "@/lib/chat/flow/authored";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { indexFlow } from "@/lib/chat/flow/schema";
import { emptyState, globalIntents, openingSuggestions, runTurn } from "@/lib/chat/flow/run";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { phraseRun } from "@/lib/text";

/**
 * The attestation content, checked the way it will actually be used.
 *
 * The build is the real `buildAuthoredFlow` and the walk is the real `runTurn`,
 * so what passes here is what the route does — in particular the one property
 * the whole set exists for: asking what something costs must end at the
 * callback form, never at a number.
 */

/**
 * The notarisation ids this module links into, owned by the notarisation
 * content module and reserved by agreement.
 *
 * Stubbed rather than removed: the link is the point — someone asking whether a
 * representative can attest for them should be offered the power of attorney
 * answer — and the seed script builds all modules concatenated, where these
 * resolve for real. Listing them here means a rename over there fails a test
 * rather than silently dropping a chip.
 */
const EXTERNAL = [
  // Reserved in the first exchange.
  "not-affidavit",
  "not-what-it-costs",
  "not-all-signatories",
  "not-bilingual-required",
  "not-emirates-id",
  "not-poa-general",
  "not-then-attestation",
  "not-what-can-be-notarised",
  // Reserved in the second, once the document and country sections were written.
  // not-what-it-costs above is the notarisation module's own fee answer: the
  // callback menu defers to it rather than keeping a duplicate here.
  "not-how-to-book",
  "not-board-resolution",
  "not-marriage-documents",
  "not-moa",
  "not-poa-from-abroad",
  "not-poa-property-sale",
  "not-document-abroad",
  "not-will-options",
];

const stub = (id: string): AuthoredFlow => ({
  id,
  question: id,
  answer: `Stands in for the ${id} answer.`,
  service: "notary",
  phrases: [id],
});

const OWNED = new Set(ATTESTATION_FLOWS.map((f) => f.id));
const referenced = [
  ...ATTESTATION_FLOWS.flatMap((f) => f.next ?? []),
  ...ATTESTATION_FLOWS.flatMap((f) => (f.choices ?? []).map((c) => c.to)),
];

const doc = buildAuthoredFlow([...ATTESTATION_FLOWS, ...EXTERNAL.map(stub)]);
const flow = indexFlow(doc);

describe("the authored set", () => {
  it("is more than a hundred entries", () => {
    expect(ATTESTATION_FLOWS.length).toBeGreaterThanOrEqual(100);
  });

  it("has no duplicate ids", () => {
    expect(new Set(OWNED).size).toBe(ATTESTATION_FLOWS.length);
  });

  it("stays inside the id namespaces this module owns", () => {
    const mine = /^(att|doc|cty|use|price|meta)-/;
    expect(ATTESTATION_FLOWS.filter((f) => !mine.test(f.id)).map((f) => f.id)).toEqual([]);
  });

  it("links out only to the notarisation ids that were reserved", () => {
    const outside = [...new Set(referenced.filter((id) => !OWNED.has(id)))].sort();
    expect(outside).toEqual([...EXTERNAL].sort());
  });
});

describe("what it is allowed to say", () => {
  /**
   * No figures, anywhere.
   *
   * Government fees differ by country and document and are revised without
   * notice, so a number written here is wrong eventually and quoted back at us
   * meanwhile. This is the guardrail on a content file three people can edit.
   */
  it("never quotes a price", () => {
    const money = /\bAED\b|\bdirhams?\b|\bdhs\b|[$£€]\s?\d/i;
    const offenders = ATTESTATION_FLOWS.filter((f) => money.test(f.answer)).map((f) => f.id);
    expect(offenders).toEqual([]);
  });

  it("asks for a service on every money question, because the callback needs one", () => {
    const loose = ATTESTATION_FLOWS.filter((f) => f.quote && !f.service).map((f) => f.id);
    expect(loose).toEqual([]);
  });

  it("wastes no follow-ups on a money question, which walks on instead", () => {
    const wasted = ATTESTATION_FLOWS.filter((f) => f.quote && (f.next ?? []).length > 0);
    expect(wasted.map((f) => f.id)).toEqual([]);
  });
});

describe("the graph it builds", () => {
  it("has nothing that blocks a publish", () => {
    const findings = lintFlow(doc);
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  it("offers the openers before anyone has typed", () => {
    const labels = openingSuggestions(flow).map((s) => s.label);
    expect(labels).toContain("What is certificate attestation?");
    expect(labels).toContain("How much does attestation cost?");
  });

  it("is reached from a service page without anyone saying anything", () => {
    const step = runTurn(
      flow,
      { ...emptyState(), slots: { service_id: "attestation" } },
      { message: "" },
      { match: keywordMatcher },
    );
    expect(step.effects.some((e) => e.kind === "ask" || e.kind === "handoff")).toBe(true);
  });
});

describe("a question about money", () => {
  const quotes = ATTESTATION_FLOWS.filter((f) => f.quote);

  it("is most of what a lead-generating flow needs", () => {
    expect(quotes.length).toBeGreaterThanOrEqual(10);
  });

  /**
   * The requirement, stated as a walk: every money question ends at the
   * callback form. With no qualifier wired the `qualify` box steps straight
   * through to the handoff, which is exactly the effect the route turns into
   * the form opening.
   */
  it.each(quotes.map((f) => [f.id, f.service] as const))(
    "%s walks into the callback box",
    (id, service) => {
      const step = runTurn(
        flow,
        emptyState(),
        { message: "", targetNodeId: `n-${id}` },
        { match: keywordMatcher },
      );

      expect(step.effects.some((e) => e.kind === "say" && e.nodeId === `n-${id}`)).toBe(true);

      const handoff = step.effects.find((e) => e.kind === "handoff");
      expect(handoff, `${id} never reached a handoff`).toBeDefined();
      expect(handoff).toMatchObject({ reason: "qualified", serviceSlug: service });
      expect(step.usedModel).toBe(false);
    },
  );

  it("routes through that service's qualification, not straight past it", () => {
    for (const quote of quotes) {
      const onward = doc.edges.find((e) => e.from === `n-${quote.id}` && e.when.kind === "always");
      expect(onward?.to, `${quote.id} skips qualification`).toBe(qualifyNodeId(quote.service!));
    }
  });

  it("costs nothing, because no money question reaches the model", () => {
    for (const quote of quotes) {
      const step = runTurn(
        flow,
        emptyState(),
        { message: "", targetNodeId: `n-${quote.id}` },
        { match: keywordMatcher },
      );
      expect(step.usedModel).toBe(false);
    }
  });
});

describe("re-running the seed", () => {
  it("changes nothing the second time", () => {
    const once = mergeFlows(doc, doc);
    const twice = mergeFlows(once, doc);
    expect(twice).toEqual(once);
  });

  it("keeps a layout someone arranged by hand", () => {
    const moved = {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === "n-att-what-is" ? { ...n, position: { x: 4242, y: 2424 } } : n,
      ),
    };
    const merged = mergeFlows(moved, doc);
    expect(merged.nodes.find((n) => n.id === "n-att-what-is")?.position).toEqual({
      x: 4242,
      y: 2424,
    });
  });
});

/**
 * Every phrasing lands on its own answer.
 *
 * The shape of this one came from the notarisation module's test, and it earns
 * its place for a reason nothing else covers: when two entries claim the same
 * phrasing, no lint fires, no type breaks and the graph is perfectly valid —
 * one answer simply swallows the other's question forever, and you find out
 * from a visitor.
 *
 * Asked against the *global* intents, because that is what `resolve` actually
 * matches a first message against: every entry hangs off the start node, so
 * every entry competes with all 111 others on every turn.
 */
describe("what a visitor types", () => {
  const globals = globalIntents(flow);
  const cases = ATTESTATION_FLOWS.flatMap((f) =>
    [f.question, ...f.phrases].map((phrase) => [f.id, phrase] as const),
  );

  it("is more than five hundred phrasings", () => {
    expect(cases.length).toBeGreaterThan(500);
  });

  it.each(cases)("%s answers %j", (id, phrase) => {
    expect(keywordMatcher(phrase, globals)).toBe(`i-${id}`);
  });
});

/**
 * No prose entry may carry money vocabulary.
 *
 * The subtle way the callback routing breaks. `matchByPhrase` and
 * `matchByKeywords` run before anything is weighed, so an ordinary FAQ whose
 * question happens to read "do I have to budget for it?" will win a typed price
 * question outright — and answer it with prose instead of walking into the
 * qualification. Nothing fails: the graph is valid, the answer is accurate, and
 * the lead silently never happens.
 *
 * So money words live only on entries that route to a callback. Found by the
 * business-setup module's test, kept here because the failure is invisible and
 * this file is edited by more than one person.
 */
describe("money vocabulary", () => {
  const MONEY =
    /\b(cost|costs|price|pricing|fee|fees|quote|quotation|budget|how much|cheap|cheapest|expensive|afford|charge|charges|instalment|installment|refund|discount|payment|pay)\b/i;

  it.each(ATTESTATION_FLOWS.filter((f) => !f.quote).map((f) => [f.id, f] as const))(
    "%s is prose, so it claims none",
    (_id, flow) => {
      const claimed = [
        flow.question,
        ...flow.phrases,
        ...(flow.keywords ?? []).flat(),
      ].filter((text) => MONEY.test(text));
      expect(claimed).toEqual([]);
    },
  );

  it("is claimed by entries that all route to a callback", () => {
    const quotes = ATTESTATION_FLOWS.filter((f) => f.quote);
    expect(quotes.every((f) => MONEY.test([f.question, ...f.phrases].join(" ")))).toBe(true);
  });
});

/**
 * No money question falls through to the model.
 *
 * The blind spot in every test above: they check that the phrasings we *wrote
 * down* route correctly, which catches an entry stealing another's question but
 * never catches a phrasing no entry claims at all. That one fails silently —
 * it lands on the fallback, costs a model call, and answers a pricing question
 * with prose instead of opening the callback form.
 *
 * These are deliberately phrasings that are NOT in any entry's `phrases`, so
 * they exercise the keyword catch-all rather than the exact-phrase lookup.
 * Found by the business-setup module, whose narrowing opened exactly this hole.
 */
describe("a money question nobody wrote down", () => {
  const unwritten = [
    "i would like a quote",
    "could you quote me",
    "please send your rates",
    "whats your pricing like",
    "i need a quotation for this",
    "can you quote for this job",
    "any idea on pricing",
    "quote please",
    "how much would you charge",
    "what do you charge for this",
    "what is the total price",
    "give me an estimate",
    "how much roughly",
    "is it expensive",
    "what would it cost me",
    "can i afford this",
    "do you have a price list",
    "how much am i looking at",
    "what are the charges",
    "ballpark figure please",
    "i want to know the cost",
  ];


  it.each(unwritten)("%j still reaches a callback", (message) => {
    const step = runTurn(flow, emptyState(), { message }, { match: keywordMatcher });

    const handoff = step.effects.find((e) => e.kind === "handoff");
    const asking = step.effects.find((e) => e.kind === "ask");
    expect(handoff ?? asking, `"${message}" reached neither a callback nor a question`).toBeDefined();
    expect(step.usedModel, `"${message}" cost a model call`).toBe(false);
  });
});

/**
 * No answer promises a turnaround.
 *
 * `findUnsupportedAmounts` in lib/chat/prompt.ts guards the model against
 * inventing currency, and the test above holds this file to the same rule. A
 * duration is the other half of it and the repo has no guard for it: "attestation
 * takes 5 working days" is the single most tempting sentence to add here, it will
 * be quoted back at us, and it is not ours to promise — the timeline belongs to
 * a university's records office and an embassy's queue.
 *
 * Deliberately narrower than banning every duration. "Most authorities want a
 * police clearance issued within the last three to six months" is a fact about
 * what a receiving authority expects, and deleting it to satisfy a blunt regex
 * would make the content worse. What is banned is a duration standing next to
 * the vocabulary of a promise.
 */
describe("how long it takes", () => {
  const DURATION =
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:to\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*)?(?:working\s+)?(?:hour|day|week|month|year)s?\b/gi;
  // Verbs only. "within" was in this list and flagged "issued within the last
  // three to six months" — a requirement, not a promise. It earned nothing
  // either: "ready within five days" still trips on `ready`, and "delivered
  // within two weeks" on `delivered`.
  const PROMISE = /\b(takes?|ready|complete[ds]?|finish(?:ed|es)?|turnaround|delivered|deliver|guarantee[ds]?)\b/i;

  /** The words either side of a duration, which is where a promise would sit. */
  const around = (text: string, at: number, length: number) =>
    text.slice(Math.max(0, at - 45), at) + text.slice(at + length, at + length + 45);

  it.each(ATTESTATION_FLOWS.map((f) => [f.id, f.answer] as const))(
    "%s states a duration only as someone else's requirement",
    (_id, answer) => {
      const promised = [...answer.matchAll(DURATION)]
        .filter((m) => PROMISE.test(around(answer, m.index!, m[0].length)))
        .map((m) => m[0]);
      expect(promised).toEqual([]);
    },
  );
});

/**
 * A price question is never answered with prose.
 *
 * The only guard that catches this, and it took three goes to learn why.
 * `matchByKeywords` ranks a group by how many of its words matched, so an
 * ordinary answer can outrank a money answer without containing a single money
 * word — by being padded. Three distinct ways, all found in this file:
 *
 *   scaffolding  ["what","attestation"] scores 2 and fires on "what is the
 *                attestation fee", beating ["fee"] at 1. The two words discriminate
 *                like one.
 *   stemming     `sameWord` folds "yourself" onto "your", so
 *                ["attestation","yourself"] scored 2 on "what are your attestation
 *                rates" — a content word silently acting as a function word.
 *   omission     "fee" was simply missing from the catch-all.
 *
 * None of those is visible to the phrase-level checks or to the money-vocabulary
 * rule: the theft happens in `matchByKeywords`, and the thief holds no money word.
 * Only asking real price questions and looking at where they land finds it. When
 * this fails, read it as "some group is outranking the money path", not as "add
 * another phrase".
 */
describe("a price question", () => {
  const priced = [
    "do you charge for attestation",
    "what is the attestation fee",
    "how long and how much for attestation",
    "who does attestation and what does it cost",
    "what is the cost of apostille",
    "why is attestation so expensive",
    "do i need an agent and what do they charge",
    "what does mofaic charge",
    "is translation needed and what is the price",
    "what do you charge",
    "how much do you charge for a degree",
    "what is the total attestation charge",
    "tell me the price please",
    "what are your attestation rates",
    "what does your company charge",
    "what is the fee for a degree certificate",
    "how much is the embassy fee",
    // Short, keyword-shaped phrasings. These are the ones that fall THROUGH
    // rather than being mis-routed: nothing claims them, so they reach the
    // model — a paid call on a money question, which `quote` exists to prevent.
    // Found by the notarisation module, where 13 of 15 were falling through.
    "attestation fee",
    "attestation cost",
    "attestation price",
    "degree attestation cost",
    "degree attestation fee",
    "mofa fee",
    "embassy fee",
    "attestation charges",
    "attestation rates",
    "attestation quote",
    "cost of attestation",
  ];

  const quoteNodes = new Set(
    ATTESTATION_FLOWS.filter((f) => f.quote).map((f) => `n-${f.id}`),
  );

  it.each(priced)("%j is answered by a callback, not prose", (message) => {
    const step = runTurn(flow, emptyState(), { message }, { match: keywordMatcher });

    const spoke = step.effects.find((e) => e.kind === "say");
    expect(
      spoke === undefined || quoteNodes.has(spoke.nodeId),
      `answered with prose from ${spoke?.nodeId}`,
    ).toBe(true);
    expect(step.effects.some((e) => e.kind === "handoff" || e.kind === "ask")).toBe(true);
    expect(step.usedModel).toBe(false);
  });
});

/**
 * No keyword word may stem onto a function word.
 *
 * `sameWord` folds related forms together, which is what makes "attest" find
 * "attestation" — and also what let "yourself" match "your". A group holding
 * such a word scores as though it discriminated, and outranks groups that
 * actually do. Only words that are not themselves function words are checked:
 * a literal "do" in a group is the scaffolding problem above, not this one.
 */
describe("keyword groups", () => {
  const FUNCTION_WORDS = [
    "a", "an", "the", "is", "are", "do", "does", "can", "will", "i", "my", "me",
    "we", "our", "you", "your", "it", "to", "for", "of", "in", "on", "at", "and",
    "or", "if", "how", "what", "when", "where", "why", "who", "much", "many",
    "need", "get", "have", "has", "with", "from", "about", "that", "this", "no", "not",
  ];
  const isFunctionWord = (word: string) => FUNCTION_WORDS.includes(word.toLowerCase());

  const words = ATTESTATION_FLOWS.flatMap((f) =>
    (f.keywords ?? []).flatMap((group) => group.map((w) => [f.id, w] as const)),
  ).filter(([, w]) => !isFunctionWord(w));

  it.each(words)("%s: %j does not secretly match a function word", (_id, word) => {
    const collides = FUNCTION_WORDS.filter((fn) => phraseRun([fn], word));
    expect(collides).toEqual([]);
  });
});

/**
 * The count the seeder reports is the count the merge produces.
 *
 * `mergeFlows` ends in `flowDoc.parse`, and the schema's caps are enforced
 * there — so a seeder that reports "you are N over the cap, here is why" has to
 * count before the parse rather than after it. The first version of that check
 * ran on the merged document and was therefore unreachable: a flow over the cap
 * died in zod with a raw dump, and the explanation never printed. Nobody saw it
 * until someone ran the seed for real, because the script itself has no test.
 *
 * This pins the invariant the fix depends on: predicted counts equal actual.
 */
describe("counting a merge before making it", () => {
  const other = buildAuthoredFlow([
    { id: "x-one", question: "One?", answer: "One.", service: null, phrases: ["one"] },
    { id: "x-two", question: "Two?", answer: "Two.", service: null, phrases: ["two"] },
  ]);

  it("agrees with the merge for two overlapping documents", () => {
    const predicted = mergedCounts(doc, other);
    const actual = mergeFlows(doc, other);

    expect(predicted).toEqual({
      nodes: actual.nodes.length,
      intents: actual.intents.length,
      edges: actual.edges.length,
    });
  });

  it("counts a document merged onto itself once, not twice", () => {
    expect(mergedCounts(doc, doc)).toEqual({
      nodes: doc.nodes.length,
      intents: doc.intents.length,
      edges: doc.edges.length,
    });
  });
});
