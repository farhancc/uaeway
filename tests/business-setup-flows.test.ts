import { describe, expect, it } from "vitest";

import { BUSINESS_SETUP_FLOWS } from "@/scripts/seed-data/business-setup-flows";
import { buildAuthoredFlow, qualifyNodeId } from "@/lib/chat/flow/authored";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { indexFlow } from "@/lib/chat/flow/schema";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { emptyState, runTurn } from "@/lib/chat/flow/run";

/**
 * The business setup pack, and the one rule it exists to enforce.
 *
 * Content usually does not get a test. This does, because two of its properties
 * are load-bearing and neither is visible by reading one entry at a time:
 *
 *   - **No figure is ever quoted.** A number in a published answer is a number
 *     someone plans around, and UAE government fees move.
 *   - **A money question reaches a person, not prose.** That only holds while
 *     the money vocabulary belongs exclusively to the `quote` entries. The day
 *     someone adds "what does it cost" to an ordinary answer's phrases,
 *     `matchByPhrase` — which runs before embeddings and takes the first
 *     candidate whose phrase appears in the message — starts answering price
 *     questions with an FAQ instead of routing them. That regression would be
 *     invisible in review and obvious to a visitor.
 *
 * The last case walks the built graph rather than inspecting it, because what
 * matters is where a typed sentence actually ends up.
 */

const flow = buildAuthoredFlow(BUSINESS_SETUP_FLOWS);
const index = indexFlow(flow);

const quotes = BUSINESS_SETUP_FLOWS.filter((f) => f.quote);
const prose = BUSINESS_SETUP_FLOWS.filter((f) => !f.quote);

describe("the pack", () => {
  it("covers the ground it was asked to cover", () => {
    expect(BUSINESS_SETUP_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("gives every entry a unique biz- id", () => {
    const ids = BUSINESS_SETUP_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !id.startsWith("biz-"))).toEqual([]);
  });

  it("attaches every entry to the business setup service", () => {
    expect(BUSINESS_SETUP_FLOWS.filter((f) => f.service !== "business-setup")).toEqual([]);
  });

  it("points every follow-up at an entry that exists", () => {
    const known = new Set(BUSINESS_SETUP_FLOWS.map((f) => f.id));
    const dangling = BUSINESS_SETUP_FLOWS.flatMap((f) =>
      (f.next ?? []).filter((id) => !known.has(id)).map((id) => `${f.id} → ${id}`),
    );
    expect(dangling).toEqual([]);
  });

  it("builds into a flow that would publish", () => {
    const findings = lintFlow(flow);
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });
});

/**
 * Anything that reads as a sum of money, a rate or a hard duration.
 *
 * Deliberately not "any digit": "1 to 3 working days" is banned, but an answer
 * is still allowed to say "four things, in order".
 */
const FIGURES =
  /\b(aed|dhs?|dirhams?|usd|eur|gbp)\b|[$€£]|\d\s*(%|percent|per\s?cent)|\b\d[\d,.]*\s*(k|million|thousand)\b|\b\d[\d,.]*\s*(days?|weeks?|months?|working\s+days?)\b/i;

describe("no answer quotes a figure", () => {
  it.each(BUSINESS_SETUP_FLOWS.map((f) => [f.id, f.answer] as const))(
    "%s",
    (_id, answer) => {
      expect(answer).not.toMatch(FIGURES);
    },
  );
});

/**
 * The money vocabulary, and the two different jobs it does.
 *
 * An earlier version of this file banned these words from every prose entry
 * outright. That was too blunt, and it cost something: it flagged the question
 * "What is end of service gratuity and do I have to budget for it?", which
 * cannot intercept anything — `matchByPhrase` matches a phrase by *containment*,
 * and no visitor types a thirteen-word sentence. A rule that forces good
 * questions to be reworded to satisfy it gets switched off eventually.
 *
 * What actually makes a phrasing dangerous is being SHORT. "trade licence cost"
 * is three words, so it is contained in "what is the trade licence cost" and
 * steals it; the long sentence is effectively exact-match only and steals
 * nothing. So the length is the rule, not the vocabulary.
 *
 * Keyword groups are different and stay strict: they are AND-groups, they fire
 * on scattered words regardless of sentence length, and a group like
 * ["licence", "cost"] intercepts every price question about a licence.
 */
const MONEY =
  /\b(cost|costs|price|prices|pricing|fee|fees|quote|quotation|budget|cheapest|cheaper|expensive|afford|charge|charges|instalments?|refund(able)?)\b|\bhow much\b/i;

/**
 * A phrasing that *means* "what does this cost", whatever its length.
 *
 * Length excuses a long sentence from stealing a question by containment. It
 * does not excuse it from being a price enquiry answered in prose — if an entry
 * is named this, it is a money question and belongs on the routed path.
 */
const ASKS_PRICE =
  /\bhow much\b|\bcost (of|to|for)\b|\bprice (of|for)\b|\bfees? (in|for|of)\b|\bcheapest\b|\bwhat (do|does) .*(cost|charge)\b|\bcan i (get|have) a quote\b/i;

/** The threshold at which containment stops being a realistic risk. Anything
 *  this short can sit inside a sentence a visitor actually types. */
const SHORT = 6;

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

describe("money vocabulary belongs to the routed entries", () => {
  it("has enough routed entries to catch the ways people ask", () => {
    expect(quotes.length).toBeGreaterThanOrEqual(20);
  });

  // The one that would actually mis-route a visitor.
  it("lets no prose entry own a short money phrasing", () => {
    const risky = prose.flatMap((f) =>
      [f.question, ...f.phrases]
        .filter((p) => MONEY.test(p) && tokens(p).length <= SHORT)
        .map((p) => `${f.id}: ${p}`),
    );
    expect(risky).toEqual([]);
  });

  // Length is no excuse for answering a price question in prose.
  it("lets no prose entry be named as a price enquiry", () => {
    const misfiled = prose.flatMap((f) =>
      [f.question, ...f.phrases].filter((p) => ASKS_PRICE.test(p)).map((p) => `${f.id}: ${p}`),
    );
    expect(misfiled).toEqual([]);
  });

  it("keeps money words out of every prose entry's keyword groups", () => {
    const leaked = prose.flatMap((f) =>
      (f.keywords ?? [])
        .filter((group) => group.some((word) => MONEY.test(word)))
        .map((group) => `${f.id}: ${group.join(" ")}`),
    );
    expect(leaked).toEqual([]);
  });

  /**
   * The question is the intent's NAME, and `matchByPhrase` matches
   * `[name, ...phrases]` before any keyword group runs.
   *
   * Length gates *containment*, which is why a long prose question is safe. It
   * does not gate *equality* — the first pass compares the whole normalised
   * question, at any length — so a routed entry named for no service can still
   * be claimed verbatim. And when a routed entry loses, the visitor does not get
   * a wrong answer, they get the wrong service's qualification: someone asking
   * about a power of attorney is asked what their business will sell. That is
   * the worst version of this bug, so routed entries are scoped regardless of
   * length.
   */
  const SCOPED =
    /compan|business|licence|setup|set up|free zone|mainland|visa|bank|audit|office|capital|corporate|first year|renew/i;

  it("names every routed entry for the service it qualifies", () => {
    const unscoped = quotes
      .filter((f) => !SCOPED.test(f.question))
      .map((f) => `${f.id}: ${f.question}`);
    expect(unscoped).toEqual([]);
  });

  // The builder skips `next` on a quote entry, so one written there is a
  // follow-up an author believes they offered and no visitor will ever see.
  it("never gives a routed entry follow-ups it cannot reach", () => {
    expect(quotes.filter((f) => f.next?.length).map((f) => f.id)).toEqual([]);
  });
});

/* ── Keyword groups ──────────────────────────────────────────────────────── */

/**
 * Question scaffolding, which carries no information about the subject.
 */
const SCAFFOLD = new Set([
  "what", "is", "are", "do", "does", "did", "my", "the", "a", "an", "to", "of", "can", "will",
  "how", "why", "who", "which", "i", "me", "we", "our", "you", "your", "it", "in", "on", "at",
  "for", "and", "or", "if", "be", "have", "has", "need", "get", "this", "that", "from", "with",
  "about", "not", "no", "am", "was", "were", "should", "would", "could", "much", "many",
]);

const content = (group: string[]) => group.filter((w) => !SCAFFOLD.has(w.toLowerCase()));

/**
 * A group scores its own LENGTH, so padding it with question words inflates its
 * weight without adding any discrimination.
 *
 * `["what", "is", "ejari"]` scored 3 off a single content word, which beat every
 * honest two-word group — including the money groups that should have taken a
 * price question. A lone distinctive word is fine at weight 1; a padded one is
 * lying about how much it knows.
 *
 * Prose entries only. On a routed entry the padding is the point: "how much" is
 * scaffolding everywhere else and the entire signal here.
 */
describe("keyword groups earn their weight", () => {
  it("lets no prose group inflate its weight with question words", () => {
    const padded = prose.flatMap((f) =>
      (f.keywords ?? [])
        .filter((g) => content(g).length < 2 && content(g).length < g.length)
        .map((g) => `${f.id}: [${g.join(", ")}]`),
    );
    expect(padded).toEqual([]);
  });
});

/**
 * The cross-pack guard, stated structurally so it holds without importing a pack
 * this file does not own.
 *
 * The attestation pack's catch-all carries bare one-word money groups —
 * `["cost"]`, `["fee"]` — deliberately, so that a short unscoped money question
 * reaches a person instead of the model. They fire at weight 1 and win whenever
 * nothing longer fires, which is how "trade licence cost" ended up qualifying
 * against attestation: this pack had the phrase but no keyword group holding the
 * money word, so nothing of ours outranked weight 1.
 *
 * So every short money phrasing a visitor might type about business setup needs a
 * group of at least two words that includes the money word. Asserting the group
 * exists, rather than asserting the merged routing, is what keeps this true when
 * another pack changes its catch-all.
 */
describe("short money phrasings outrank a bare one-word catch-all", () => {
  const phrasings = [
    "company setup cost",
    "business setup cost",
    "business setup fee",
    "trade licence cost",
    "trade licence fee",
    "licence fee dubai",
    "setup charges",
    "formation cost",
    "free zone cost",
    "freezone cost",
    "mainland cost",
    "company visa cost",
    "renewal cost",
  ];

  const groups = quotes.flatMap((f) => (f.keywords ?? []).map((g) => g.map((w) => w.toLowerCase())));

  it.each(phrasings)("%s", (phrasing) => {
    const words = tokens(phrasing);
    const covering = groups.filter(
      (g) => g.length >= 2 && g.every((w) => words.includes(w)) && g.some((w) => MONEY.test(w)),
    );
    expect(covering.length).toBeGreaterThan(0);
  });
});

/* ── What actually happens when someone asks ─────────────────────────────── */

/** One turn from a cold start, as the route would run it with no model and no
 *  qualification schema loaded. */
function ask(message: string) {
  return runTurn(index, emptyState(), { message }, { match: keywordMatcher });
}

/**
 * Where a turn ended up.
 *
 * Without a qualifier the `qualify` box has nothing to ask and steps through to
 * the handoff, which is the effect the widget turns into the callback form. So
 * "reached the callback" is `handoff`, and `visited` proves it went through the
 * qualification rather than around it.
 */
function reachedCallback(step: ReturnType<typeof ask>): boolean {
  return (
    step.effects.some((e) => e.kind === "handoff") &&
    step.state.visited.includes(qualifyNodeId("business-setup"))
  );
}

/**
 * These are business-setup phrasings, and the omissions are deliberate.
 *
 * "can i get a quote", "i would like a quote" and "can i pay in instalments" are
 * site-wide questions. In the merged flow they belong to the catch-all quote
 * entries in the attestation pack, and this pack does not compete for them: with
 * no page context no service is the right guess, and two packs claiming one bare
 * phrase makes the winner an accident of edge order.
 *
 * Note where that claim actually lives. It is not the `phrases` array — an
 * entry's `question` is the intent's *name*, and `matchByPhrase` matches
 * `[name, ...phrases]` before any keyword group runs. So a bare question here
 * would own that phrasing however narrow the keyword groups were. Both money
 * entries below are named for the service ("Can I get a quote for setting up a
 * company?") for exactly that reason, which also makes them honest chip labels
 * on a site with more than one service.
 *
 * Consequence for this file: a bare "can i get a quote" does not route in a
 * standalone build of this pack, and should not. That the merged flow answers
 * it is the seed script's test to make, not this one's.
 */
describe("a money question reaches the callback form", () => {
  const asked = [
    "how much does it cost to set up a company in the uae",
    "what is the cost of company formation in dubai",
    "how much is a trade licence",
    "what are your fees for company formation",
    "can i get a quote for setting up a company",
    "can you quote me for company formation",
    "i would like a quote for company formation",
    "what is the cheapest free zone",
    "how much does a company visa cost",
    "is dubai expensive to set up a business in",
    "what will my first year cost in total",
    "can i pay for the company setup in instalments",
    "how much share capital do i need",
    "what does an audit cost in dubai",
    "how much does it cost to renew a trade licence",
    "another company quoted me a lower price for setup",
    "i have a limited budget for setting up a company",
    "are government fees refundable in the uae",
    "what are the hidden costs of a uae business",
  ];

  it.each(asked)("%s", (message) => {
    expect(reachedCallback(ask(message))).toBe(true);
  });

  it("says why there is no figure before it asks anything", () => {
    const step = ask("how much does it cost to set up a company in the uae");
    const said = step.effects.find((e) => e.kind === "say");
    expect(said).toBeDefined();
    expect(said && "text" in said ? said.text : "").not.toMatch(FIGURES);
  });

  it("costs nothing — no money question reaches the model", () => {
    for (const message of asked) expect(ask(message).usedModel).toBe(false);
  });
});

describe("an ordinary question is still answered", () => {
  const asked: [string, string][] = [
    ["what is the difference between mainland and free zone", "biz-mainland-vs-free-zone"],
    ["what is an establishment card", "biz-establishment-card"],
    ["what is the wage protection system", "biz-wps"],
    ["which company documents need to be notarised in dubai", "biz-notarise-company-documents"],
    ["do i need to be in the uae to set up a company", "biz-be-in-uae"],
    ["what is ejari and why do i need it", "biz-ejari"],
  ];

  it.each(asked)("%s", (message, expected) => {
    const step = ask(message);
    const said = step.effects.find((e) => e.kind === "say");
    expect(said && "nodeId" in said ? said.nodeId : null).toBe(`n-${expected}`);
    expect(step.effects.some((e) => e.kind === "handoff")).toBe(false);
  });
});
