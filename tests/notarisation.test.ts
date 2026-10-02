import { describe, expect, it } from "vitest";
import { NOTARISATION_FLOWS } from "@/scripts/seed-data/notarisation";
import { buildAuthoredFlow } from "@/lib/chat/flow/authored";
import { indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase } from "@/lib/chat/flow/lookup";
import { phraseRun } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * A hundred and fifty-six answers nobody will read end to end.
 *
 * Which is the reason for this file. The risk with authored content at this
 * size is not that one answer is wrong — someone reviews those — it is that two
 * of them quietly compete, and the one that loses becomes unreachable without
 * anything failing. `matchByPhrase` takes the first candidate whose phrase
 * appears in the message, so a phrase repeated across two entries silently
 * makes one of them dead. The test for that is to ask every question and check
 * the answer that comes back is its own.
 */

const doc = buildAuthoredFlow(NOTARISATION_FLOWS);
const flow = indexFlow(doc);
const intentOf = (id: string) => `i-${id}`;
const nodeOf = (id: string) => `n-${id}`;

describe("the notarisation set", () => {
  it("is the hundred-plus flows that were asked for", () => {
    expect(NOTARISATION_FLOWS.length).toBeGreaterThanOrEqual(100);
  });

  it("keeps every id inside the namespace agreed with the other authors", () => {
    // `not-` is this module's allocation. `att-`, `biz-` and the rest belong to
    // other content modules that are concatenated with this one before the
    // graph is built, and a collision there is a silently overwritten answer.
    for (const flow of NOTARISATION_FLOWS) {
      expect(flow.id.startsWith("not-"), `${flow.id} is outside the not- namespace`).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    const ids = NOTARISATION_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("belongs to the notary service throughout", () => {
    for (const flow of NOTARISATION_FLOWS) expect(flow.service).toBe("notary");
  });
});

describe("what the answers are allowed to say", () => {
  /**
   * The guardrail the chatbot's own replies go through, applied to written
   * content — because lib/chat/prompt.ts forbids stating a fee whether a model
   * wrote the sentence or a person did, and on a regulated service a figure
   * published under the company's name is worse when a person wrote it: there
   * is no model in the loop to hedge it.
   */
  it("states no money figure anywhere", () => {
    for (const flow of NOTARISATION_FLOWS) {
      expect(findUnsupportedAmounts(flow.answer, ""), `${flow.id} quotes a figure`).toEqual([]);
    }
  });

  it("never claims we perform the notarisation ourselves", () => {
    // The site introduces people to licensed providers; saying otherwise is the
    // one claim prompt.ts singles out for this service.
    const claims = /\bwe (notarise|notarize|attest|legalise|legalize)\b/i;
    for (const flow of NOTARISATION_FLOWS) {
      expect(claims.test(flow.answer), `${flow.id} claims we do it ourselves`).toBe(false);
    }
  });

  it("promises no outcome", () => {
    const promises = /\b(we guarantee|guaranteed approval|will definitely be accepted)\b/i;
    for (const flow of NOTARISATION_FLOWS) {
      expect(promises.test(flow.answer), `${flow.id} promises an outcome`).toBe(false);
    }
  });
});

describe("every question reaches its own answer", () => {
  const candidates = doc.intents;

  /**
   * The one that matters most. Every authored question, matched against all
   * 156 intents at once exactly as a cold visitor's first message is.
   */
  it("routes each entry's own question to itself", () => {
    for (const flow of NOTARISATION_FLOWS) {
      expect(matchByPhrase(flow.question, candidates), `"${flow.question}"`).toBe(
        intentOf(flow.id),
      );
    }
  });

  it("routes every listed phrasing to the entry that listed it", () => {
    for (const flow of NOTARISATION_FLOWS) {
      for (const phrase of flow.phrases) {
        expect(matchByPhrase(phrase, candidates), `"${phrase}" on ${flow.id}`).toBe(
          intentOf(flow.id),
        );
      }
    }
  });

  /**
   * And through the whole engine rather than the matcher alone — the keyword
   * matcher is what answers on the days no embedding key is usable, so it is
   * the floor the flow has to work at.
   */
  it("walks the real engine from a cold start to the right node", () => {
    for (const flow of NOTARISATION_FLOWS) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: flow.question }, {
        match: keywordMatcher,
      });
      const said = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(said?.nodeId, `"${flow.question}" landed on ${said?.nodeId}`).toBe(nodeOf(flow.id));
    }
  });
});

describe("the graph it builds", () => {
  it("is publishable — no blocking lint findings", () => {
    const findings = lintFlow(doc);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.map((e) => `${e.nodeId ?? e.intentId ?? ""}: ${e.message}`)).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  it("leaves nothing stranded", () => {
    // Every authored entry is wired from `start`, so an unreachable node here
    // would mean the build dropped one.
    const unreachable = lintFlow(doc).filter((f) => f.message.includes("Nothing leads here"));
    expect(unreachable).toEqual([]);
  });

  it("offers a way in for someone who has not typed anything", () => {
    const openers = NOTARISATION_FLOWS.filter((f) => f.opener);
    expect(openers.length).toBeGreaterThan(0);
  });

  /**
   * A money question does not get a number, it gets the callback form. The
   * `always` edge out of a `quote` entry is what makes that a walk rather than
   * a suggestion, so the qualification asks its first question in the same turn.
   */
  it("walks every money question into the notary qualification", () => {
    for (const flow of NOTARISATION_FLOWS.filter((f) => f.quote)) {
      const out = doc.edges.filter((e) => e.from === nodeOf(flow.id));
      expect(out.map((e) => e.to), `${flow.id}`).toEqual(["q-notary"]);
      expect(out[0].when.kind).toBe("always");
    }
  });

  /**
   * A money question must reach a person, not a paragraph.
   *
   * The failure this guards is invisible in review and was real here twice: a
   * prose entry, or a cluster hub, carrying a price phrasing and intercepting
   * the question with an answer instead of walking it into the qualification.
   * Both were found by running the questions rather than by reading the file,
   * so the test runs them.
   */
  it("routes a price question to a callback rather than to prose", () => {
    const asked = [
      "how much does notarisation cost",
      "what does it cost to notarise a power of attorney",
      "how much does a power of attorney cost",
      "how much are notary fees in the uae",
      "what is the cost of notarising a document in dubai",
      "price for notarising a document in dubai",
      "is there a cheaper way to notarise",
      "why will nobody give me a fixed price for notarisation",
      "is notarisation charged per page or per document",
      "is the translation charged separately from notarisation",
      "what does a notarised translation cost",
      // Short, bare phrasings. All thirteen of these reached the fallback model
      // before service-scoped keyword groups were added — which is a model call
      // on a money question, the one thing `quote` exists to prevent.
      "notary fee",
      "what is the notary fee",
      "poa cost",
      "notarisation price",
      "affidavit cost",
      "cost of an affidavit in dubai",
      "do i pay per signatory",
      "power of attorney fees",
      "notary charges",
      "what are your notarisation rates",
      "is notarisation expensive",
      "how much for a poa",
    ];

    for (const question of asked) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: question }, {
        match: keywordMatcher,
      });
      const landed = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      const entry = NOTARISATION_FLOWS.find((f) => nodeOf(f.id) === landed?.nodeId);
      expect(entry?.quote, `"${question}" landed on ${landed?.nodeId}, which is not a quote entry`).toBe(true);
    }
  });

  /**
   * And the structural half of the same rule: a hub is a menu, so it must never
   * own a price phrasing. `matchByPhrase` runs before any embedding and takes
   * the first candidate whose phrase appears in the message, and hubs sort
   * first — so a hub listing "how much does notarisation cost" silently puts a
   * tap between someone asking about money and someone calling them back.
   */
  it("keeps price phrasings off the cluster hubs", () => {
    const priceEnquiry = /how much|\bcost of\b|\bprice (for|of)\b|\bfees (in|for)\b|cheapest/i;
    for (const flow of NOTARISATION_FLOWS.filter((f) => f.faq === false)) {
      for (const text of [flow.question, ...flow.phrases]) {
        expect(priceEnquiry.test(text), `hub ${flow.id} claims "${text}"`).toBe(false);
      }
    }
    // There is deliberately no equivalent rule for a hub's KEYWORD groups. The
    // obvious one — no money word in a hub group — was written, and it was worse
    // than nothing: it flagged ["question","about","fees"] on the fees hub, which
    // cannot fire on a price question because a price question contains neither
    // "question" nor "about", while missing the group that actually stole one
    // ("what does a notarised translation cost" was taken by the translation
    // hub's ["translation","notary"], which holds no money word at all). Groups
    // are covered by the routing test above, which found that bug.
  });

  /**
   * A group is an AND-group ranked by its LENGTH, so padding one with question
   * scaffolding inflates its weight without adding any discrimination.
   * `["what","is","notarisation"]` scores three and fires on anything containing
   * those three tokens — which is how "what is the notarisation fee" was
   * answered with "What is notarisation?" instead of being routed to a callback.
   */
  it("builds keyword groups out of content words, not question scaffolding", () => {
    const scaffolding = new Set([
      "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
      "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
      "will", "would", "should", "if", "it", "this", "that", "there", "from", "as",
      "not", "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
    ]);
    for (const flow of NOTARISATION_FLOWS) {
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
   * A content word that silently becomes a function word.
   *
   * `keywordPresent` reaches `sameWord`, which folds related forms — that is what
   * makes ["attest"] find "attestation". It also makes **"without" match a bare
   * "with"** and "someone" match "some". Unlike the `will` case below, nothing
   * about "without" suggests it, so this cannot be found by reading: the stemmer
   * creates the collision, not English. ["without","an","appointment"] answered
   * "I am coming with an appointment, what do I bring?" with the walk-in answer.
   *
   * Structural rather than behavioural, because unlike the money rules this one
   * is exact — a group word either folds onto a function word or it does not.
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
    for (const flow of NOTARISATION_FLOWS) {
      for (const group of flow.keywords ?? []) {
        for (const word of group) {
          if (functionWords.includes(word.toLowerCase())) continue;
          const folds = functionWords.filter((fn) => phraseRun([word], fn));
          expect(folds, `${flow.id} [${group.join(", ")}]: "${word}" stems onto ${folds.join("/")}`).toEqual([]);
        }
      }
    }
  });

  /**
   * The scoped groups above must not reach into another pack's subject.
   *
   * A bare ["fee"] catch-all would have fixed the fall-throughs too, and would
   * have fired on "what does attestation cost" — fighting the attestation pack's
   * own generic money entry over a question that is not ours. Two-word groups
   * scoped to the service win at weight 2 only when the question is about us.
   */
  it("leaves another pack's money questions alone", () => {
    for (const question of ["attestation fee", "company setup cost", "visa fees", "trade licence cost"]) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: question }, {
        match: keywordMatcher,
      });
      const landed = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(landed, `"${question}" was claimed by ${landed?.nodeId}`).toBeUndefined();
    }
  });

  /**
   * "will" is a modal as well as the noun, so a wills group assembled from it
   * plus ordinary verbs reaches across the whole merged flow.
   * `["my","will","cover","accounts"]` scored four on "will this cover my bank
   * accounts" — a banking question answered with wills content.
   */
  it("does not answer another subject from the wills cluster", () => {
    const elsewhere = [
      "will you make a dubai company for me",
      "will this cover my bank accounts",
      "when will my documents be ready",
      "will i need a trade licence",
      "will my visa be approved",
    ];
    for (const question of elsewhere) {
      const step = runTurn(indexFlow(doc), emptyState(), { message: question }, {
        match: keywordMatcher,
      });
      const landed = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(landed?.nodeId ?? "", `"${question}" landed on ${landed?.nodeId}`).not.toMatch(/will/);
    }
  });

  /**
   * Nothing with a shelf life. Currency is caught by `findUnsupportedAmounts`
   * above; this catches the other half — "typically 1 to 3 working days" is the
   * kind of sentence that is wrong within a year and wrong in our name.
   *
   * Narrow on purpose. A blanket duration ban was the first version, and it
   * would have forbidden accurate content: "a police clearance issued within the
   * last three months" and "a power of attorney signed five years ago" are
   * statements about what a receiving authority expects, which is exactly what
   * these answers are for. A guard that deletes true sentences gets worked
   * around, so this one fires only where a duration sits in the same sentence as
   * the vocabulary of a promise — which is the thing actually being banned.
   */
  it("promises no turnaround", () => {
    const NUM = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|ninety)`;
    const UNIT = String.raw`(?:working\s+)?(?:days?|weeks?|months?|years?)`;
    const duration = new RegExp(String.raw`\b${NUM}(?:\s*(?:to|-|–|or)\s*${NUM})?\s*${UNIT}\b`, "i");
    const promise = /\b(takes?|taking|ready|complete[ds]?|finish(?:ed|es)?|turnaround|deliver(?:ed|y|s)?|guarantee[ds]?|within\s+(?:just|only))\b/i;

    for (const flow of NOTARISATION_FLOWS) {
      for (const sentence of flow.answer.split(/(?<=[.!?])\s+/)) {
        const stated = duration.test(sentence) && promise.test(sentence);
        expect(stated, `${flow.id} promises a turnaround: "${sentence}"`).toBe(false);
      }
    }
  });

  it("still bans a bare rate", () => {
    // Unconditional, unlike a duration: a percentage in an answer here is always
    // a specific claim about fees or outcomes, and we have neither to give.
    for (const flow of NOTARISATION_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(flow.answer), `${flow.id} states a rate`).toBe(false);
    }
  });

  it("asks for money questions to exist at all", () => {
    // Someone deleting the last `quote` entry would otherwise make the test
    // above vacuously pass.
    expect(NOTARISATION_FLOWS.some((f) => f.quote)).toBe(true);
  });

  it("keeps chips to what the runtime will actually show", () => {
    // `suggestions` shows three. A fourth is invisible, which reads as an
    // author's decision having no effect.
    for (const flow of NOTARISATION_FLOWS) {
      expect((flow.next ?? []).length, `${flow.id}`).toBeLessThanOrEqual(3);
    }
  });

  it("reports what it costs the merged draft", () => {
    // Not an assertion about the caps — those bind on the merged document,
    // which this module is only one contributor to. Recorded so the number is
    // visible when someone has to decide what fits.
    expect({
      entries: NOTARISATION_FLOWS.length,
      nodes: doc.nodes.length,
      intents: doc.intents.length,
      edges: doc.edges.length,
    }).toMatchObject({ entries: expect.any(Number) });
  });
});
