import { describe, expect, it } from "vitest";
import { JOB_SEARCH_FLOWS } from "@/scripts/seed-data/job-search-flows";
import { buildAuthoredFlow, type AuthoredFlow } from "@/lib/chat/flow/authored";
import { indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase, normalizeQuestion } from "@/lib/chat/flow/lookup";
import { phraseRun } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * Two hundred and fifty answers nobody will read end to end.
 *
 * Same reasoning as tests/notarisation.test.ts, and the same failure mode: the
 * risk at this size is not a wrong answer — someone reviews those — it is two
 * answers quietly competing, so that the loser becomes unreachable without
 * anything failing. `matchByPhrase` takes the first candidate whose phrase
 * appears in the message, so a phrase repeated across two entries silently
 * kills one. The test for that is to ask every question and check the answer
 * that comes back is its own.
 *
 * This pack adds one rule the others do not have, and most of the routing tests
 * below are about it: "what will you charge me for a CV" is a money question
 * and must end at a callback, while "what salary should I ask for" is a
 * question about the visitor's own livelihood and must not. Both contain the
 * words people use about money, and getting them the wrong way round would
 * either hide the lead form or push a nervous job seeker at a sales form when
 * they asked for advice.
 */

const doc = buildAuthoredFlow(JOB_SEARCH_FLOWS);
const flow = indexFlow(doc);
const intentOf = (id: string) => `i-${id}`;
const nodeOf = (id: string) => `n-${id}`;

/** Where a cold visitor's first message lands, through the whole engine. */
const landOn = (message: string): string | undefined => {
  const step = runTurn(indexFlow(doc), emptyState(), { message }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask")?.nodeId;
};

describe("the job search set", () => {
  it("is the two hundred plus flows that were asked for", () => {
    expect(JOB_SEARCH_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the namespace agreed with the other authors", () => {
    // `job-` is this module's allocation. `att-`, `not-`, `biz-` and the visa
    // pack's ids belong to modules concatenated with this one before the graph
    // is built, and a collision there is a silently overwritten answer.
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(flow.id.startsWith("job-"), `${flow.id} is outside the job- namespace`).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    const ids = JOB_SEARCH_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * A job seeker's questions span four of the eight service lines, and the
   * service is what decides which team the callback reaches — so an attestation
   * cost routed to the CV writers is a wasted call for both sides. Kept to a
   * closed list so that a fifth one has to be a decision rather than a typo.
   */
  it("routes every entry to one of the four services a job seeker touches", () => {
    const allowed = new Set(["cv-resume", "attestation", "visa-processing", "legal-translation"]);
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(allowed.has(flow.service ?? ""), `${flow.id} names "${flow.service}"`).toBe(true);
    }
  });
});

describe("what the answers are allowed to say", () => {
  /**
   * The guardrail the chatbot's own replies go through, applied to written
   * content — lib/chat/prompt.ts forbids stating a fee whether a model wrote
   * the sentence or a person did, and a figure published under the company's
   * name is worse when a person wrote it: there is no model in the loop to
   * hedge it. Here it catches a second thing as well, because a salary figure
   * has the same shape as a fee and would be read as advice on what to accept.
   */
  it("states no money figure anywhere", () => {
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(findUnsupportedAmounts(flow.answer, ""), `${flow.id} quotes a figure`).toEqual([]);
    }
  });

  it("still bans a bare rate", () => {
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(flow.answer), `${flow.id} states a rate`).toBe(false);
    }
  });

  /**
   * The claim this pack exists next to and must never make. We list vacancies
   * and write CVs; a sentence saying we place people, find someone a job or
   * guarantee an interview would be false, and on this subject it is the exact
   * claim every advance-fee scam on the same page makes.
   */
  it("never claims we place people or guarantee an outcome", () => {
    // First person only, deliberately. The first version of this also banned
    // "guaranteed job" and "guaranteed visa" anywhere in an answer, and it
    // failed on the entry warning people about exactly those promises — the
    // scam-awareness content has to quote the scam's own vocabulary to name it.
    // What may never appear is US making the claim.
    const claims = /\bwe (place|recruit|hire|guarantee|sponsor|find you|get you)\b|\bwe (notarise|attest|legalise)\b/i;
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(claims.test(flow.answer), `${flow.id} claims something we do not do`).toBe(false);
    }
  });

  /**
   * Nothing with a shelf life. Narrow on purpose, exactly as in the notarisation
   * pack: a blanket duration ban would forbid true sentences about what an
   * authority expects, so this fires only where a duration shares a sentence
   * with the vocabulary of a promise — "the permit takes 3 working days" is the
   * sentence being banned, and it is the one job seekers are told constantly.
   */
  it("promises no turnaround", () => {
    const NUM = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|ninety)`;
    const UNIT = String.raw`(?:working\s+)?(?:days?|weeks?|months?|years?)`;
    const duration = new RegExp(String.raw`\b${NUM}(?:\s*(?:to|-|–|or)\s*${NUM})?\s*${UNIT}\b`, "i");
    const promise = /\b(takes?|taking|ready|complete[ds]?|finish(?:ed|es)?|turnaround|deliver(?:ed|y|s)?|guarantee[ds]?|within\s+(?:just|only))\b/i;

    for (const flow of JOB_SEARCH_FLOWS) {
      for (const sentence of flow.answer.split(/(?<=[.!?])\s+/)) {
        expect(
          duration.test(sentence) && promise.test(sentence),
          `${flow.id} promises a turnaround: "${sentence}"`,
        ).toBe(false);
      }
    }
  });
});

describe("every question reaches its own answer", () => {
  const candidates = doc.intents;

  /**
   * Exact equality is `matchByPhrase`'s first pass, so a phrasing listed twice
   * makes the winner arbitrary and the loser unreachable. Checked as a set
   * before the routing tests below, because this is the failure those tests
   * would report in a much less obvious form.
   */
  it("never writes the same phrasing down twice", () => {
    const owner = new Map<string, string>();
    for (const flow of JOB_SEARCH_FLOWS) {
      for (const text of [flow.question, ...flow.phrases]) {
        const normalised = normalizeQuestion(text);
        const already = owner.get(normalised);
        expect(already ?? flow.id, `"${text}" is on both ${already} and ${flow.id}`).toBe(flow.id);
        owner.set(normalised, flow.id);
      }
    }
  }, 30_000);

  it("routes each entry's own question to itself", () => {
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(matchByPhrase(flow.question, candidates), `"${flow.question}"`).toBe(intentOf(flow.id));
    }
  }, 30_000);

  it("routes every listed phrasing to the entry that listed it", () => {
    for (const flow of JOB_SEARCH_FLOWS) {
      for (const phrase of flow.phrases) {
        expect(matchByPhrase(phrase, candidates), `"${phrase}" on ${flow.id}`).toBe(intentOf(flow.id));
      }
    }
  }, 30_000);

  /** And through the whole engine rather than the matcher alone — the keyword
   *  matcher is what answers on the days no embedding key is usable, so it is
   *  the floor the flow has to work at. */
  it("walks the real engine from a cold start to the right node", () => {
    for (const flow of JOB_SEARCH_FLOWS) {
      expect(landOn(flow.question), `"${flow.question}"`).toBe(nodeOf(flow.id));
    }
  }, 30_000);
});

describe("the graph it builds", () => {
  it("is publishable — no blocking lint findings", () => {
    const findings = lintFlow(doc);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.map((e) => `${e.nodeId ?? e.intentId ?? ""}: ${e.message}`)).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  it("leaves nothing stranded", () => {
    const unreachable = lintFlow(doc).filter((f) => f.message.includes("Nothing leads here"));
    expect(unreachable).toEqual([]);
  });

  it("offers a way in for someone who has not typed anything", () => {
    expect(JOB_SEARCH_FLOWS.filter((f) => f.opener).length).toBeGreaterThan(0);
  });

  it("keeps chips to what the runtime will actually show", () => {
    // `suggestions` shows three. A fourth is invisible, which reads as an
    // author's decision having no effect.
    for (const flow of JOB_SEARCH_FLOWS) {
      expect((flow.next ?? []).length, `${flow.id}`).toBeLessThanOrEqual(3);
    }
  });
});

describe("a money question reaches a person, not a paragraph", () => {
  it("asks for money questions to exist at all", () => {
    // Someone deleting the last `quote` entry would make the tests below
    // vacuously pass.
    expect(JOB_SEARCH_FLOWS.some((f) => f.quote)).toBe(true);
  });

  it("walks every money question into that service's qualification", () => {
    for (const flow of JOB_SEARCH_FLOWS.filter((f) => f.quote)) {
      const out = doc.edges.filter((e) => e.from === nodeOf(flow.id));
      expect(out.map((e) => e.to), `${flow.id}`).toEqual([`q-${flow.service}`]);
      expect(out[0].when.kind).toBe("always");
    }
  });

  /**
   * The behavioural half, and the one that catches the failure review does not:
   * a prose entry or a cluster hub carrying a price phrasing and intercepting
   * the question with an answer instead of walking it into the qualification.
   * Every phrasing here is a question about what WE charge.
   */
  it("routes a price question about our work to a callback", () => {
    const asked = [
      "what do you charge to write a cv",
      "how much does cv writing cost in dubai",
      "cv writing price",
      "resume writing charges",
      "cv writing fee",
      "how much for a professional cv",
      "what is the cost of your cv service",
      "how much is degree attestation for a dubai employer",
      "cost to attest my certificate for a job",
      "attestation charges for my job documents",
      "how much is legal translation for my job documents",
      "price to translate my degree into arabic",
      "translation charges for a uae employment contract",
    ];

    for (const question of asked) {
      const landed = landOn(question);
      const entry = JOB_SEARCH_FLOWS.find((f) => nodeOf(f.id) === landed);
      expect(entry?.quote, `"${question}" landed on ${landed}, which is not a quote entry`).toBe(true);
    }
  });

  /**
   * The other direction, and the reason this pack needed its own rule. A job
   * seeker asking what they should be paid is not asking what we cost, and
   * answering them with a callback form would be both useless and grubby. These
   * all have to land on content.
   */
  it("never answers a question about the visitor's own pay with a lead form", () => {
    const asked = [
      "what salary should i ask for",
      "how much should i ask for in a dubai interview",
      "what is the market rate for my job in dubai",
      "how do i research salaries in the uae",
      "what do people earn in my profession in dubai",
      "how much notice do i have to give in my uae job",
      "who pays for the work permit and residence visa",
      "is it normal to pay a fee before starting a job in dubai",
      "a recruitment agency is asking me for a fee",
      "do you charge job seekers anything",
    ];

    for (const question of asked) {
      const landed = landOn(question);
      const entry = JOB_SEARCH_FLOWS.find((f) => nodeOf(f.id) === landed);
      expect(entry?.quote ?? false, `"${question}" landed on the quote entry ${entry?.id}`).toBe(false);
      expect(entry, `"${question}" reached no answer at all`).toBeDefined();
    }
  });

  /**
   * The structural half of the same rule. `matchByPhrase` runs before any
   * embedding and takes the first candidate whose phrase appears in the
   * message, and hubs sort first — so a hub listing "how much does a CV cost"
   * silently puts a menu between someone asking about money and someone calling
   * them back.
   */
  it("keeps price phrasings off the cluster hubs", () => {
    const priceEnquiry = /how much|\bcost of\b|\bprice (for|of)\b|\bfees (in|for)\b|cheapest/i;
    for (const flow of JOB_SEARCH_FLOWS.filter((f) => f.faq === false)) {
      for (const text of [flow.question, ...flow.phrases]) {
        expect(priceEnquiry.test(text), `hub ${flow.id} claims "${text}"`).toBe(false);
      }
    }
  });

  /**
   * The scoped groups must not reach into another pack's subject. A bare
   * ["fee"] or ["cost"] catch-all would fix any fall-through here and would
   * fight the attestation and notarisation packs over questions that are not
   * ours — and those packs' money entries end at a callback of their own, so
   * stealing one loses the lead rather than winning it.
   */
  it("leaves another pack's money questions alone", () => {
    for (const question of [
      "attestation fee",
      "how much does notarisation cost",
      "company setup cost",
      "trade licence cost",
      "notary fee",
    ]) {
      expect(landOn(question), `"${question}" was claimed by this pack`).toBeUndefined();
    }
  });
});

describe("the keyword groups", () => {
  /**
   * A group is an AND-group ranked by its LENGTH, so padding one with question
   * scaffolding inflates its weight without adding discrimination.
   * `["what","is","attestation"]` scores three and fires on anything containing
   * those three tokens.
   */
  it("is built out of content words, not question scaffolding", () => {
    const scaffolding = new Set([
      "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
      "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
      "will", "would", "should", "if", "it", "this", "that", "there", "from", "as",
      "not", "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
    ]);
    for (const flow of JOB_SEARCH_FLOWS) {
      for (const group of flow.keywords ?? []) {
        const content = group.filter((w) => !scaffolding.has(w.toLowerCase()));
        expect(
          content.length,
          `${flow.id} group [${group.join(", ")}] has ${content.length} content word(s); it scores ${group.length}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  /**
   * A content word that silently becomes a function word. `keywordPresent`
   * reaches `sameWord`, which folds related forms — that is what makes
   * ["attest"] find "attestation". It also makes "withdrawn" match a bare
   * "with" and "yourself" match "your", both of which were written here and
   * both of which turn a group into a near-universal trigger. Nothing about
   * either word suggests it, so this cannot be found by reading.
   */
  it("has no keyword that stems onto a function word", () => {
    const functionWords = [
      "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
      "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
      "will", "would", "should", "if", "it", "this", "that", "there", "from", "as", "not",
      "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
      "your", "you", "we", "us", "some", "one", "all", "any", "more", "most", "much",
      "many", "other", "such", "only", "own", "same", "than", "too", "very", "just", "now",
    ];
    for (const flow of JOB_SEARCH_FLOWS) {
      for (const group of flow.keywords ?? []) {
        for (const word of group) {
          if (functionWords.includes(word.toLowerCase())) continue;
          const folds = functionWords.filter((fn) => phraseRun([word], fn));
          expect(folds, `${flow.id} [${group.join(", ")}]: "${word}" stems onto ${folds.join("/")}`).toEqual([]);
        }
      }
    }
  });
});

describe("what it costs the merged draft", () => {
  it("reports its size", () => {
    // Not an assertion about the caps — those bind on the merged document,
    // which this module is only one contributor to. Recorded so the number is
    // visible when someone has to decide what fits.
    expect({
      entries: JOB_SEARCH_FLOWS.length,
      nodes: doc.nodes.length,
      intents: doc.intents.length,
      edges: doc.edges.length,
    }).toMatchObject({ entries: expect.any(Number) });
  });
});

/**
 * The pack does not ship alone.
 *
 * Everything above proves the pack is coherent by itself, which is exactly the
 * state every pack is in when it breaks another one: `mergeFlows` folds six or
 * seven of these into one draft, `matchByPhrase` then runs one candidate list
 * containing all of them, and `matchByKeywords` ranks groups across packs by
 * length. So the questions are asked again against whatever else is on disk.
 *
 * The other packs are imported the way `scripts/seed-authored-flows.ts` imports
 * them — dynamically, tolerating a module that is mid-rewrite — because they are
 * being written by other people right now and a half-saved file next door should
 * not fail this pack's test.
 */
describe("in the merged draft", () => {
  const merged = (async () => {
    // Literal paths rather than a template: a computed specifier makes the
    // bundler glob the directory, and the point here is to name exactly the
    // packs that are merged in production.
    const optional: [string, () => Promise<Record<string, unknown>>][] = [
      ["ATTESTATION_FLOWS", () => import("@/scripts/seed-data/attestation-flows")],
      ["NOTARISATION_FLOWS", () => import("@/scripts/seed-data/notarisation")],
      ["BUSINESS_SETUP_FLOWS", () => import("@/scripts/seed-data/business-setup-flows")],
      ["HIGHER_STUDIES_FLOWS", () => import("@/scripts/seed-data/higher-studies-notarisation")],
      ["VISA_FLOWS", () => import("@/scripts/seed-data/visa-flows")],
      ["TRANSLATION_FLOWS", () => import("@/scripts/seed-data/translation-flows")],
    ];
    const others: AuthoredFlow[] = [];
    for (const [exported, load] of optional) {
      try {
        const loaded = await load();
        if (Array.isArray(loaded[exported])) others.push(...(loaded[exported] as AuthoredFlow[]));
      } catch {
        // Mid-rewrite next door. The seed script skips it too.
      }
    }
    const all = [...others, ...JOB_SEARCH_FLOWS];
    const doc = buildAuthoredFlow(all);
    return { all, others, doc, flow: indexFlow(doc) };
  })();

  const landMerged = async (message: string): Promise<string | undefined> => {
    const { flow } = await merged;
    const step = runTurn(flow, emptyState(), { message }, { match: keywordMatcher });
    return step.effects.find((e) => e.kind === "say" || e.kind === "ask")?.nodeId;
  };

  it("collides with no other pack's ids", async () => {
    const { all } = await merged;
    const ids = all.map((f) => f.id);
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicated).toEqual([]);
  });

  it("still routes every job question to its own answer", async () => {
    const { doc } = await merged;
    for (const flow of JOB_SEARCH_FLOWS) {
      for (const text of [flow.question, ...flow.phrases]) {
        expect(matchByPhrase(text, doc.intents), `"${text}" on ${flow.id}`).toBe(intentOf(flow.id));
      }
    }
  }, 30_000);

  it("steals nothing from the packs it sits beside", async () => {
    const { others, doc } = await merged;
    const stolen: string[] = [];
    for (const flow of others) {
      const got = matchByPhrase(flow.question, doc.intents);
      if (got?.startsWith("i-job-")) stolen.push(`"${flow.question}" (${flow.id}) -> ${got}`);
    }
    expect(stolen).toEqual([]);
  }, 30_000);

  /**
   * Money phrasings nobody wrote down. A price question that matches no entry
   * falls through to `fallback-model` and is answered in prose by a paid model
   * call — which is both the expensive outcome and the one thing `quote` exists
   * to prevent. Landing on another pack's site-wide money catch-all is a pass:
   * that ends at a callback too, which is the rule this is protecting.
   */
  it("lets no colloquial money question reach the model", async () => {
    const { all } = await merged;
    const quoteNodes = new Set(all.filter((f) => f.quote).map((f) => nodeOf(f.id)));
    for (const question of [
      "how much am i looking at for a cv",
      "is your cv service expensive",
      "give me an estimate for writing my cv",
      "what is your cv writing budget",
      "can i afford your resume service",
      "do you have a price list for cv writing",
      "quote for a cv rewrite",
      "how much to attest my degree for my job offer",
      "estimate for translating my employment contract",
    ]) {
      const landed = await landMerged(question);
      expect(landed && quoteNodes.has(landed), `"${question}" landed on ${landed ?? "fallback-model"}`).toBe(true);
    }
  }, 30_000);

  /**
   * Recorded rather than asserted against the schema's own numbers, because the
   * caps bind on a draft this module is one of seven contributors to and they
   * have been raised twice already. What this does assert is that the merged
   * document parses — `buildAuthoredFlow` runs it through `flowDoc`, so a pack
   * that pushed the total over a cap fails here rather than inside the seed.
   */
  it("reports what the merged draft costs", async () => {
    const { all, doc } = await merged;
    console.log(
      `merged: ${all.length} entries, ${doc.nodes.length} nodes, ${doc.intents.length} intents, ${doc.edges.length} edges`,
    );
    expect(doc.nodes.length).toBeGreaterThan(JOB_SEARCH_FLOWS.length);
  });
});
