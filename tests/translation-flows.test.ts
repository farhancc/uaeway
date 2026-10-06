import { describe, expect, it } from "vitest";
import { TRANSLATION_FLOWS } from "@/scripts/seed-data/translation-flows";
import { buildAuthoredFlow } from "@/lib/chat/flow/authored";
import { indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase } from "@/lib/chat/flow/lookup";
import { phraseRun } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * Two hundred and twenty-eight answers nobody will read end to end.
 *
 * Which is the reason for this file, and the same reason tests/notarisation.
 * test.ts exists. The risk at this size is not that one answer is wrong —
 * someone reviews those — it is that two of them quietly compete and the loser
 * becomes unreachable with nothing failing. `matchByPhrase` takes the first
 * candidate whose phrase appears in the message, so one phrasing repeated
 * across two entries silently kills one of them. The test for that is to ask
 * every question and check the answer that comes back is its own.
 */

const doc = buildAuthoredFlow(TRANSLATION_FLOWS);
const flow = indexFlow(doc);
const intentOf = (id: string) => `i-${id}`;
const nodeOf = (id: string) => `n-${id}`;

describe("the translation set", () => {
  it("is the two hundred flows that were asked for", () => {
    expect(TRANSLATION_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the namespace agreed with the other authors", () => {
    // `tr-` is this module's allocation. `att-`, `not-`, `biz-`, `visa-` and
    // `hs-` belong to the other content modules, which are concatenated with
    // this one before the graph is built; a collision there is a silently
    // overwritten answer rather than an error.
    for (const entry of TRANSLATION_FLOWS) {
      expect(entry.id.startsWith("tr-"), `${entry.id} is outside the tr- namespace`).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    const ids = TRANSLATION_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("belongs to the legal translation service throughout", () => {
    for (const entry of TRANSLATION_FLOWS) expect(entry.service).toBe("legal-translation");
  });
});

describe("what the answers are allowed to say", () => {
  /**
   * The guardrail the chatbot's own replies go through, applied to written
   * content — lib/chat/prompt.ts forbids stating a fee whether a model wrote
   * the sentence or a person did, and a figure published under the company's
   * name is worse when a person wrote it: there is no model in the loop to
   * hedge it.
   */
  it("states no money figure anywhere", () => {
    for (const entry of TRANSLATION_FLOWS) {
      expect(findUnsupportedAmounts(entry.answer, ""), `${entry.id} quotes a figure`).toEqual([]);
    }
  });

  /**
   * The one claim that would be both false and a licensing problem. Legal
   * translation here is performed by translators licensed by the Ministry of
   * Justice; the site works out what a case needs and makes an introduction.
   */
  it("never claims we translate or interpret ourselves", () => {
    const claims = /\bwe (translate|interpret|certify|notarise|notarize|attest|legalise|legalize)\b/i;
    for (const entry of TRANSLATION_FLOWS) {
      expect(claims.test(entry.answer), `${entry.id} claims we do it ourselves`).toBe(false);
    }
  });

  it("promises no outcome", () => {
    const promises = /\b(we guarantee|guaranteed approval|will definitely be accepted|always accepted)\b/i;
    for (const entry of TRANSLATION_FLOWS) {
      expect(promises.test(entry.answer), `${entry.id} promises an outcome`).toBe(false);
    }
  });

  it("still bans a bare rate", () => {
    // Unconditional, unlike a duration: a percentage in an answer here is
    // always a specific claim about fees or outcomes, and we have neither.
    for (const entry of TRANSLATION_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(entry.answer), `${entry.id} states a rate`).toBe(false);
    }
  });

  /**
   * Nothing with a shelf life. Currency is caught above; this catches the other
   * half — "ready in 2 to 3 working days" is the kind of sentence that is wrong
   * within a year and wrong in our name.
   *
   * Narrow on purpose, exactly as in tests/notarisation.test.ts: a blanket
   * duration ban would forbid accurate content ("a police clearance issued
   * within the last three months" is a statement about what an authority
   * expects). This fires only where a duration shares a sentence with the
   * vocabulary of a promise.
   */
  it("promises no turnaround", () => {
    const NUM = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|ninety)`;
    const UNIT = String.raw`(?:working\s+)?(?:days?|weeks?|months?|years?|hours?)`;
    const duration = new RegExp(String.raw`\b${NUM}(?:\s*(?:to|-|–|or)\s*${NUM})?\s*${UNIT}\b`, "i");
    const promise = /\b(takes?|taking|ready|complete[ds]?|finish(?:ed|es)?|turnaround|deliver(?:ed|y|s)?|guarantee[ds]?|within\s+(?:just|only))\b/i;

    for (const entry of TRANSLATION_FLOWS) {
      for (const sentence of entry.answer.split(/(?<=[.!?])\s+/)) {
        const stated = duration.test(sentence) && promise.test(sentence);
        expect(stated, `${entry.id} promises a turnaround: "${sentence}"`).toBe(false);
      }
    }
  });
});

describe("every question reaches its own answer", () => {
  const candidates = doc.intents;

  /**
   * The one that matters most. Every authored question, matched against all
   * 228 intents at once exactly as a cold visitor's first message is.
   */
  it("routes each entry's own question to itself", () => {
    for (const entry of TRANSLATION_FLOWS) {
      expect(matchByPhrase(entry.question, candidates), `"${entry.question}"`).toBe(
        intentOf(entry.id),
      );
    }
  }, 30_000);

  it("routes every listed phrasing to the entry that listed it", () => {
    for (const entry of TRANSLATION_FLOWS) {
      for (const phrase of entry.phrases) {
        expect(matchByPhrase(phrase, candidates), `"${phrase}" on ${entry.id}`).toBe(
          intentOf(entry.id),
        );
      }
    }
  }, 30_000);

  /**
   * And through the whole engine rather than the matcher alone — the keyword
   * matcher answers on the days no embedding key is usable, so it is the floor
   * the flow has to work at.
   */
  it("walks the real engine from a cold start to the right node", () => {
    for (const entry of TRANSLATION_FLOWS) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: entry.question }, {
        match: keywordMatcher,
      });
      const said = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(said?.nodeId, `"${entry.question}" landed on ${said?.nodeId}`).toBe(nodeOf(entry.id));
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
    expect(TRANSLATION_FLOWS.filter((f) => f.opener).length).toBeGreaterThan(0);
  });

  it("keeps chips to what the runtime will actually show", () => {
    // `suggestions` shows three. A fourth is invisible, which reads as an
    // author's decision having no effect.
    for (const entry of TRANSLATION_FLOWS) {
      expect((entry.next ?? []).length, `${entry.id}`).toBeLessThanOrEqual(3);
    }
  });
});

describe("a money question reaches a person, not a paragraph", () => {
  it("asks for money questions to exist at all", () => {
    // Someone deleting the last `quote` entry would otherwise make the tests
    // below vacuously pass.
    expect(TRANSLATION_FLOWS.filter((f) => f.quote).length).toBeGreaterThan(20);
  });

  /**
   * The `always` edge out of a `quote` entry is what makes it a walk rather
   * than a suggestion: the qualification asks its first question in the same
   * turn as the answer, and it ends at the callback form.
   */
  it("walks every money question into the translation qualification", () => {
    for (const entry of TRANSLATION_FLOWS.filter((f) => f.quote)) {
      const out = doc.edges.filter((e) => e.from === nodeOf(entry.id));
      expect(out.map((e) => e.to), `${entry.id}`).toEqual(["q-legal-translation"]);
      expect(out[0].when.kind).toBe("always");
    }
  });

  /**
   * The failure this guards is invisible in review: a prose entry, or a cluster
   * hub, carrying a price phrasing and intercepting the question with an answer
   * instead of walking it into the qualification. It is found by running the
   * questions rather than by reading the file, so the test runs them — including
   * the short, bare phrasings people actually type.
   */
  it("routes a price question to a callback rather than to prose", () => {
    const asked = [
      "how much does legal translation cost",
      "how much does a certified translation cost",
      "what is the price of translating my degree certificate",
      "translation cost",
      "translation price",
      "translation fee",
      "translation charges",
      "what are your translation rates",
      "is legal translation expensive",
      "cost per page for translation",
      "what is the per page rate for translation",
      "per word rate for translation",
      "sworn translation cost",
      "certified translation price",
      "attested translation cost",
      "mofa attested translation cost",
      "technical translation cost",
      "how much does an interpreter cost",
      "interpreter rate",
      "interpreter fee",
      "interpreter charges",
      "hourly rate for an interpreter",
      "court interpreter cost",
      "conference interpreting cost",
      "full day interpreter price",
      "minimum charge for translation",
      "bulk translation pricing",
      "is vat included in the translation price",
      "do i pay in advance for translation",
      "what do extra copies cost",
      "why is there no price list for translation",
      "is there a cheaper way to do this",
      "how do i compare two translation quotes",
      "can you give me a quote for my document",
      "can someone call me about translation costs",
      "urgent translation cost",
      "rare language more expensive",
      "refund if my translation is rejected",
      "second opinion on a translation cost",
      "is there a price list for translation",
    ];

    for (const question of asked) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: question }, {
        match: keywordMatcher,
      });
      const landed = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      const entry = TRANSLATION_FLOWS.find((f) => nodeOf(f.id) === landed?.nodeId);
      expect(
        entry?.quote,
        `"${question}" landed on ${landed?.nodeId}, which is not a quote entry`,
      ).toBe(true);
    }
  });

  /**
   * The structural half of the same rule. `matchByPhrase` runs before anything
   * else and takes the first candidate whose phrase appears in the message, and
   * hubs sort first — so a hub listing a price phrasing silently puts a menu
   * between someone asking about money and someone calling them back.
   */
  it("keeps price phrasings off the cluster hubs", () => {
    const priceEnquiry = /how much|\bcost of\b|\bprice (for|of)\b|\bfees? (in|for)\b|cheapest|\bquote\b/i;
    for (const entry of TRANSLATION_FLOWS.filter((f) => f.faq === false)) {
      for (const text of [entry.question, ...entry.phrases]) {
        expect(priceEnquiry.test(text), `hub ${entry.id} claims "${text}"`).toBe(false);
      }
    }
  });

  /**
   * The scoped groups must not reach into another pack's subject. A bare
   * ["cost"] catch-all would fix the fall-throughs above and would also fire on
   * "what does attestation cost", fighting the attestation pack over a question
   * that is not ours. Two-word groups scoped to this service win at weight two
   * only when the question is about translation.
   */
  it("leaves another pack's money questions alone", () => {
    const elsewhere = [
      "attestation fee",
      "notary fee",
      "poa cost",
      "visa fees",
      "trade licence cost",
      "company setup cost",
      "how much is a golden visa",
      "what does equivalency cost",
    ];
    for (const question of elsewhere) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: question }, {
        match: keywordMatcher,
      });
      const landed = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(landed, `"${question}" was claimed by ${landed?.nodeId}`).toBeUndefined();
    }
  });
});

describe("the keyword groups", () => {
  const SCAFFOLDING = [
    "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
    "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
    "will", "would", "should", "if", "it", "this", "that", "there", "from", "as",
    "not", "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
  ];

  /**
   * A group is an AND-group ranked by its LENGTH, so padding one with question
   * scaffolding inflates its weight without adding discrimination.
   * `["what","is","legal","translation"]` scores four and fires on anything
   * containing those four tokens — which is how "what is the legal translation
   * fee" gets answered with a definition instead of routed to a callback.
   */
  it("builds groups out of content words, not question scaffolding", () => {
    const scaffolding = new Set(SCAFFOLDING);
    for (const entry of TRANSLATION_FLOWS) {
      for (const group of entry.keywords ?? []) {
        const content = group.filter((w) => !scaffolding.has(w.toLowerCase()));
        expect(
          content.length,
          `${entry.id} group [${group.join(", ")}] has ${content.length} content word(s); it scores ${group.length}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  /**
   * A content word that silently becomes a function word.
   *
   * `keywordPresent` reaches `sameWord`, which folds related forms on a shared
   * five-character prefix — that is what makes ["attest"] find "attestation".
   * It also makes "without" match a bare "with" and "justice" match "just".
   * Nothing about those words suggests it, so this cannot be found by reading.
   */
  it("has no keyword that stems onto a function word", () => {
    const functionWords = [
      ...SCAFFOLDING,
      "your", "you", "we", "us", "some", "one", "all", "any", "more", "most", "much",
      "many", "other", "such", "only", "own", "same", "than", "too", "very", "just", "now",
    ];
    for (const entry of TRANSLATION_FLOWS) {
      for (const group of entry.keywords ?? []) {
        for (const word of group) {
          if (functionWords.includes(word.toLowerCase())) continue;
          const folds = functionWords.filter((fn) => phraseRun([word], fn));
          expect(
            folds,
            `${entry.id} [${group.join(", ")}]: "${word}" stems onto ${folds.join("/")}`,
          ).toEqual([]);
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
      entries: TRANSLATION_FLOWS.length,
      nodes: doc.nodes.length,
      intents: doc.intents.length,
      edges: doc.edges.length,
      quotes: TRANSLATION_FLOWS.filter((f) => f.quote).length,
    }).toMatchObject({ entries: expect.any(Number) });
  });
});
