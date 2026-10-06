import { describe, expect, it } from "vitest";
import { HIGHER_STUDIES_FLOWS } from "@/scripts/seed-data/higher-studies-notarisation";
import { ATTESTATION_FLOWS } from "@/scripts/seed-data/attestation-flows";
import { NOTARISATION_FLOWS } from "@/scripts/seed-data/notarisation";
import { BUSINESS_SETUP_FLOWS } from "@/scripts/seed-data/business-setup-flows";
import { buildAuthoredFlow, type AuthoredFlow } from "@/lib/chat/flow/authored";
import { indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase } from "@/lib/chat/flow/lookup";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";
import { sameWord } from "@/lib/text";

/**
 * Two hundred and eleven answers for students, and the thing that can actually
 * go wrong with them.
 *
 * Not that one answer is wrong — a person reviews those. The failure mode at this
 * size is that two entries quietly compete for a phrasing and the loser becomes
 * unreachable with nothing failing. And because this is the fourth pack merged
 * into one graph, the competition is not inside this file: `matchByPhrase` walks
 * every candidate in the merged set and takes the first whose phrase appears in
 * the message. So the routing tests below are run twice — once against this pack
 * alone, and once against all four packs together, which is the graph a visitor
 * actually meets.
 */

const MERGED: AuthoredFlow[] = [
  ...ATTESTATION_FLOWS,
  ...NOTARISATION_FLOWS,
  ...BUSINESS_SETUP_FLOWS,
  ...HIGHER_STUDIES_FLOWS,
];

const doc = buildAuthoredFlow(HIGHER_STUDIES_FLOWS);
const mergedDoc = buildAuthoredFlow(MERGED);
const mergedFlow = indexFlow(mergedDoc);
const intentOf = (id: string) => `i-${id}`;
const nodeOf = (id: string) => `n-${id}`;

/** Where a cold visitor's first message lands, through the whole engine. */
function landing(question: string, flow = mergedFlow): string | undefined {
  const step = runTurn(flow, emptyState(), { message: question }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask")?.nodeId;
}

describe("the higher studies set", () => {
  it("is the two hundred plus flows that were asked for", () => {
    expect(HIGHER_STUDIES_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the namespace the other packs left free", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(flow.id.startsWith("hst-"), `${flow.id} is outside the hst- namespace`).toBe(true);
    }
  });

  it("has no duplicate ids, here or against the other three packs", () => {
    const ids = MERGED.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("belongs to the higher studies service throughout", () => {
    // One service for the whole pack on purpose: `quote` walks into the named
    // service's qualification, and a student asking what a notarised transcript
    // costs must be asked what they want to study, not what their business sells.
    for (const flow of HIGHER_STUDIES_FLOWS) expect(flow.service).toBe("higher-studies");
  });

  it("covers the subjects a student asks about", () => {
    // A guard against the pack drifting into one narrow cluster on a later edit.
    const subject = (re: RegExp) =>
      HIGHER_STUDIES_FLOWS.filter((f) => re.test(`${f.question} ${f.answer}`)).length;
    expect(subject(/equivalenc/i)).toBeGreaterThan(8);
    expect(subject(/transcript|marksheet/i)).toBeGreaterThan(10);
    expect(subject(/notaris/i)).toBeGreaterThan(15);
    expect(subject(/visa/i)).toBeGreaterThan(8);
    expect(subject(/translat/i)).toBeGreaterThan(8);
  });
});

describe("what the answers are allowed to say", () => {
  it("states no money figure anywhere", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(findUnsupportedAmounts(flow.answer, ""), `${flow.id} quotes a figure`).toEqual([]);
    }
  });

  it("never claims we perform the notarisation or attestation ourselves", () => {
    const claims = /\bwe (notarise|notarize|attest|legalise|legalize|certify)\b/i;
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(claims.test(flow.answer), `${flow.id} claims we do it ourselves`).toBe(false);
    }
  });

  it("promises no admission, visa or equivalency outcome", () => {
    const promises =
      /\b(we guarantee|guaranteed (approval|admission|acceptance)|definitely be accepted|sure to be accepted|assured admission)\b/i;
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(promises.test(flow.answer), `${flow.id} promises an outcome`).toBe(false);
    }
  });

  it("promises no turnaround", () => {
    // Same shape as the notarisation pack's: a duration is only banned where it
    // sits in a sentence with the vocabulary of a promise, because "a clearance
    // issued within the last three months" is a true statement about what an
    // authority expects and a blanket ban would delete it.
    const NUM = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|ninety)`;
    const UNIT = String.raw`(?:working\s+)?(?:days?|weeks?|months?|years?|semesters?)`;
    const duration = new RegExp(String.raw`\b${NUM}(?:\s*(?:to|-|–|or)\s*${NUM})?\s*${UNIT}\b`, "i");
    const promise =
      /\b(takes?|taking|ready|complete[ds]?|finish(?:ed|es)?|turnaround|deliver(?:ed|y|s)?|guarantee[ds]?|within\s+(?:just|only))\b/i;

    for (const flow of HIGHER_STUDIES_FLOWS) {
      for (const sentence of flow.answer.split(/(?<=[.!?])\s+/)) {
        expect(
          duration.test(sentence) && promise.test(sentence),
          `${flow.id} promises a turnaround: "${sentence}"`,
        ).toBe(false);
      }
    }
  });

  it("states no grade, fee or eligibility rule as a bare rate", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(flow.answer), `${flow.id} states a rate`).toBe(false);
    }
  });

  it("states the one hard fact it is allowed to state, and states it consistently", () => {
    // The UAE is not a party to the Hague Apostille Convention: stable,
    // checkable, and the single most expensive thing students arrive wrong about.
    // What is banned is the opposite claim.
    // Anchored on the affirmative claim itself rather than on co-occurrence: an
    // earlier version matched "the UAE is not a party ... issued in a member
    // state", which is the correct sentence.
    const wrong =
      /\buae\s+(?:is|has|was)\s+(?:a\s+|an\s+)?(?:member|party|signatory|contracting)\b|\buae\s+(?:acceded|joined|signed)\b/i;
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(wrong.test(flow.answer), `${flow.id} says the UAE is an Apostille party`).toBe(false);
    }
    const apostille = HIGHER_STUDIES_FLOWS.filter((f) => /apostille/i.test(f.answer));
    expect(apostille.length).toBeGreaterThanOrEqual(3);
  });
});

describe("every question reaches its own answer", () => {
  it("routes each entry's own question to itself within the pack", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(matchByPhrase(flow.question, doc.intents), `"${flow.question}"`).toBe(
        intentOf(flow.id),
      );
    }
  });

  it("routes every listed phrasing to the entry that listed it within the pack", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      for (const phrase of flow.phrases) {
        expect(matchByPhrase(phrase, doc.intents), `"${phrase}" on ${flow.id}`).toBe(
          intentOf(flow.id),
        );
      }
    }
  });

  /**
   * The one that earns its keep. Four packs, ~2900 phrasings, matched against
   * every intent in the merged graph exactly as a cold first message is — which
   * is where a bare sentence written here loses to a notary answer written there.
   */
  it(
    "routes every phrasing to its own entry in the four-pack merged graph",
    () => {
      const candidates = mergedDoc.intents;
      for (const flow of HIGHER_STUDIES_FLOWS) {
        for (const phrase of [flow.question, ...flow.phrases]) {
          expect(matchByPhrase(phrase, candidates), `"${phrase}" on ${flow.id}`).toBe(
            intentOf(flow.id),
          );
        }
      }
    },
    // ~1,300 phrasings against ~680 intents, both passes. Slow on purpose: this
    // is the check that the four packs do not quietly compete.
    30_000,
  );

  it("walks the real engine from a cold start to the right node, merged", () => {
    // The keyword matcher is what answers on the days no embedding key is
    // usable, so it is the floor the flow has to work at.
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect(landing(flow.question), `"${flow.question}"`).toBe(nodeOf(flow.id));
    }
  });

  it("does not steal another pack's questions", () => {
    // The mirror of the test above, and the half that a within-pack check cannot
    // see: a student-shaped keyword group that fires on a business or notary
    // question answers the wrong subject from this file.
    const elsewhere = [
      "how much does it cost to set up a company in dubai",
      "what documents do i need for a trade licence",
      "can i revoke a power of attorney",
      "how do i attest a marriage certificate",
      "what is a memorandum of association",
      "how much is a freelance permit",
      "do i need a local sponsor for an llc",
      "how do i attest my birth certificate for a family visa",
      "what does a notarised translation cost",
      "how much does notarisation cost",
    ];
    for (const question of elsewhere) {
      const landed = landing(question) ?? "";
      expect(landed.startsWith("n-hst-"), `"${question}" landed on ${landed}`).toBe(false);
    }
  });
});

describe("money puts the student in front of a person", () => {
  it("walks every money question into the higher studies qualification", () => {
    for (const flow of HIGHER_STUDIES_FLOWS.filter((f) => f.quote)) {
      const out = doc.edges.filter((e) => e.from === nodeOf(flow.id));
      expect(out.map((e) => e.to), `${flow.id}`).toEqual(["q-higher-studies"]);
      expect(out[0].when.kind).toBe("always");
    }
  });

  it("has enough of them to cover how people ask", () => {
    expect(HIGHER_STUDIES_FLOWS.filter((f) => f.quote).length).toBeGreaterThanOrEqual(25);
  });

  /**
   * The primary guard, and the only one that has ever caught a real bug of this
   * kind: run real price questions through the merged engine and assert each
   * lands on a `quote` entry. A prose answer or a cluster hub intercepting one of
   * these is invisible in review — it looks like a helpful paragraph.
   */
  it("routes a student's price question to a callback rather than to prose", () => {
    const asked = [
      "how much does it cost to attest my degree certificate for university",
      "what is the cost of equivalency for my degree in the uae",
      "how much to get my transcripts attested for my masters application",
      "price for translating my marksheets for a university",
      "how much does a notarised affidavit for my university application cost",
      "what does the student visa paperwork cost",
      "how much for my school certificate attestation for college",
      "can i get a quote for my study documents",
      "why can nobody give me a fixed price for my education documents",
      "what is the cheapest way to attest my study documents",
      "i cannot afford the attestation charges as a student",
      "roughly how much are we talking for all this",
      "my parents want to know the total before i start",
      "are there hidden charges in student document work",
      "another agent quoted me less for my certificate attestation",
      "how much extra for urgent processing before my intake deadline",
      "is my student document work charged per document",
      "how much of this is government fees and how much is your fee",
      "do i get my money back if my education document is rejected",
      "can i pay for my student document work in instalments",
      "how much for the certified documents my education loan needs",
      "what does the paperwork for a scholarship application cost",
      "is it cheaper to attest my degree in my home country or in dubai",
      "how much does a power of attorney for my study documents cost",
      "what does an extra attested copy of my certificate cost",
      "is it worth paying someone or should i do my student paperwork myself",
      "my documents come from two different countries what does that cost",
      "why is getting my certificates ready for university so expensive",
    ];

    for (const question of asked) {
      const landed = landing(question);
      const entry = MERGED.find((f) => nodeOf(f.id) === landed);
      expect(
        entry?.quote,
        `"${question}" landed on ${landed}, which is not a quote entry`,
      ).toBe(true);
    }
  });

  /**
   * The same rule asked mechanically rather than from a list.
   *
   * Every price stem crossed with every subject this pack sells — 147 questions —
   * because the curated list above only covers phrasings someone thought of, and
   * the failures found while writing this pack were all in phrasings nobody had:
   * a prose entry in another pack owning "<noun> attestation", a cluster hub
   * padded to three words, and a price word the groups did not include.
   */
  it("routes a generated matrix of price questions to a callback", () => {
    const stems = [
      "how much for",
      "how much does it cost for",
      "what is the cost of",
      "what is the price of",
      "what are the fees for",
      "what are the charges for",
      "is there a cheaper way to do",
    ];
    const subjects = [
      "degree certificate attestation",
      "transcript attestation for university",
      "my school certificate attestation for college",
      "equivalency for my degree",
      "translating my degree certificate",
      "a notarised affidavit for my university application",
      "a power of attorney for my study documents",
      "my student visa paperwork",
      "my marksheet attestation for university",
      "attesting my grade twelve certificate",
      "my education documents",
      "my university documents",
      "my student documents",
      "an extra attested copy of my certificate",
      "my scholarship documents",
      "my education loan documents",
      "attesting my masters degree for a job",
      "my transcripts attested for my masters application",
      "notarising my student declaration",
      "translating my marksheets for a university",
      "urgent attestation of my degree",
    ];

    const missed: string[] = [];
    for (const subject of subjects) {
      for (const stem of stems) {
        const question = `${stem} ${subject}`;
        const landed = landing(question);
        if (!MERGED.find((f) => nodeOf(f.id) === landed)?.quote) {
          missed.push(`${question} -> ${landed ?? "(model fallback)"}`);
        }
      }
    }
    expect(missed).toEqual([]);
  }, 20_000);

  /**
   * The structural halves of the same rule, kept as supplements to the
   * behavioural tests above rather than as the primary guard — a pattern check
   * has twice flagged a group that could not fire while missing one that did.
   */
  it("gives every money entry a group that contains a price word", () => {
    const priceWord =
      /^(cost|costs|much|price|fees|charges|cheaper|cheapest|afford|budget|total|quote|expensive|refund|instalments|payment|paying|money)$/i;
    // The three entries that carry `quote` without being money questions: they
    // ask for a person, and `quote` is simply the mechanism that reaches one.
    const askingForAPerson = new Set([
      "hst-talk-to-someone",
      "hst-callback-request",
      "hst-can-you-handle-everything",
    ]);
    for (const flow of HIGHER_STUDIES_FLOWS.filter((f) => f.quote && !askingForAPerson.has(f.id))) {
      const groups = flow.keywords ?? [];
      expect(
        groups.some((g) => g.length >= 2 && g.some((w) => priceWord.test(w))),
        `${flow.id} has no keyword group carrying a price word, so a price question reaches it only by score`,
      ).toBe(true);
    }
  });

  /**
   * A group that asks for the same word twice.
   *
   * `sameWord` matches on a five-character shared prefix, so "translating",
   * "transcripts" and "transfer" are one word, as are "certified" and
   * "certificate". A group pairing two of them reads as discriminating and is
   * not: its weight is inflated by a word that adds nothing, and
   * `["transcripts","translating"]` on the translation hub fired on "estimate for
   * translating my employment contract" — a job-search question answered from
   * this pack. Fifteen of these existed when the rule was written.
   */
  it("never asks for the same word twice in one keyword group", () => {
    const duplicated: string[] = [];
    for (const flow of HIGHER_STUDIES_FLOWS) {
      for (const group of flow.keywords ?? []) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            if (sameWord(group[i].toLowerCase(), group[j].toLowerCase())) {
              duplicated.push(`${flow.id} [${group.join(", ")}] — "${group[i]}" is "${group[j]}"`);
            }
          }
        }
      }
    }
    expect(duplicated).toEqual([]);
  });

  it("holds the cluster hubs to two-word keyword groups", () => {
    // `matchByKeywords` ranks by group LENGTH and ties go to the earlier
    // candidate, and hubs sort ahead of everything. At three words a hub beats
    // the money entries outright; at two it loses to anything more specific,
    // which makes it the answer to a vague message and never an interception.
    for (const flow of HIGHER_STUDIES_FLOWS.filter((f) => f.faq === false && !f.quote)) {
      for (const group of flow.keywords ?? []) {
        expect(group.length, `hub ${flow.id} group [${group.join(", ")}]`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("puts someone who asks for a person in front of one", () => {
    // `quote` is the mechanism for "walk into the qualification and end at the
    // callback form", which is exactly what these ask for.
    for (const question of [
      "can i speak to someone about my university documents",
      "please call me back about my study documents",
      "can you handle my whole university document process for me",
    ]) {
      const landed = landing(question);
      const entry = MERGED.find((f) => nodeOf(f.id) === landed);
      expect(entry?.quote, `"${question}" landed on ${landed}`).toBe(true);
    }
  });

  it("keeps price phrasings off the cluster hubs", () => {
    // Hubs are menus and they sort first, so a hub owning a price phrasing puts a
    // tap between a student asking about money and a person calling them back.
    const priceEnquiry = /how much|\bcost of\b|\bprice (for|of)\b|\bfees (in|for)\b|cheapest/i;
    for (const flow of HIGHER_STUDIES_FLOWS.filter((f) => f.faq === false && !f.quote)) {
      for (const text of [flow.question, ...flow.phrases]) {
        expect(priceEnquiry.test(text), `hub ${flow.id} claims "${text}"`).toBe(false);
      }
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
    const unreachable = lintFlow(doc).filter((f) => f.message.includes("Nothing leads here"));
    expect(unreachable).toEqual([]);
  });

  it("offers a way in for someone who has not typed anything", () => {
    expect(HIGHER_STUDIES_FLOWS.filter((f) => f.opener).length).toBeGreaterThan(0);
  });

  it("keeps chips to what the runtime will actually show", () => {
    for (const flow of HIGHER_STUDIES_FLOWS) {
      expect((flow.next ?? []).length, `${flow.id}`).toBeLessThanOrEqual(3);
    }
  });

  /**
   * A keyword group is an AND-group ranked by its LENGTH, so padding one with
   * question scaffolding inflates its weight without adding discrimination:
   * `["what","is","equivalency"]` scores three and fires on "what is the
   * equivalency fee", answering a price question with a definition.
   */
  it("builds keyword groups out of content words, not question scaffolding", () => {
    const scaffolding = new Set([
      "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
      "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
      "will", "would", "should", "if", "it", "this", "that", "there", "from", "as",
      "not", "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
      "need", "needs", "get", "got",
    ]);
    for (const flow of HIGHER_STUDIES_FLOWS) {
      for (const group of flow.keywords ?? []) {
        const content = group.filter((w) => !scaffolding.has(w.toLowerCase()));
        expect(
          content.length,
          `${flow.id} group [${group.join(", ")}] has ${content.length} content word(s); it scores ${group.length}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("reports what it costs the merged draft", () => {
    // Recorded rather than asserted: the caps bind on the merged document, which
    // this pack is one of four contributors to. Visible here so the next author
    // can see what is left before raising them again.
    expect({
      entries: HIGHER_STUDIES_FLOWS.length,
      nodes: doc.nodes.length,
      edges: doc.edges.length,
      mergedNodes: mergedDoc.nodes.length,
      mergedIntents: mergedDoc.intents.length,
      mergedEdges: mergedDoc.edges.length,
    }).toMatchObject({ entries: expect.any(Number) });
  });
});
