import { describe, expect, it } from "vitest";
import { RELOCATION_FLOWS } from "@/scripts/seed-data/relocation-flows";
import { buildAuthoredFlow, type AuthoredFlow } from "@/lib/chat/flow/authored";
import { flowDoc, indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase, normalizeQuestion } from "@/lib/chat/flow/lookup";
import { phraseRun, sameWord } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * Two hundred answers for someone who has accepted a UAE job and is now moving
 * their life here.
 *
 * The risk at this size is not a wrong answer — a person reviews those. It is
 * that two entries quietly compete for a phrasing and the loser becomes
 * unreachable with nothing failing, and because this is the eighth pack merged
 * into one graph the competition is mostly not inside this file: `matchByPhrase`
 * walks every candidate in the merged set and takes the first whose phrase
 * appears in the message, and `matchByKeywords` ranks groups across packs by
 * length. So every routing test here runs twice — once against this pack alone,
 * and once against all eight, which is the graph a visitor actually meets.
 *
 * Two rules are specific to this pack and most of the money tests below are
 * about them.
 *
 *   - A question about what WE charge must end at a callback. It carries
 *     `quote: true`, and the test is behavioural: a generated matrix of price
 *     phrasings has to reach a quote entry rather than prose or the model.
 *   - A question about the visitor's OWN budget — rent, deposits, school fees,
 *     what a move costs them — must land on content and must never reach a lead
 *     form. Both sets use every word people use about money, and getting them
 *     the wrong way round would either hide the lead form or push a family
 *     budgeting a move at a sales form when they asked for help.
 *
 * The other half of the pack's design is that it does NOT re-answer labour law,
 * visa mechanics or job hunting: those are the job-search and visa packs' and
 * writing a second set would make one of the two unreachable. "Steals nothing"
 * below is what holds that line.
 */

/** The packs this one is concatenated with, in the order the seeder loads them,
 *  so the merged candidate list here is the one production builds. Dynamic,
 *  tolerating a module mid-rewrite, exactly as the seed script does. */
const OTHERS: [string, () => Promise<Record<string, unknown>>][] = [
  ["ATTESTATION_FLOWS", () => import("@/scripts/seed-data/attestation-flows")],
  ["NOTARISATION_FLOWS", () => import("@/scripts/seed-data/notarisation")],
  ["BUSINESS_SETUP_FLOWS", () => import("@/scripts/seed-data/business-setup-flows")],
  ["HIGHER_STUDIES_FLOWS", () => import("@/scripts/seed-data/higher-studies-notarisation")],
  ["VISA_FLOWS", () => import("@/scripts/seed-data/visa-flows")],
  ["TRANSLATION_FLOWS", () => import("@/scripts/seed-data/translation-flows")],
  ["JOB_SEARCH_FLOWS", () => import("@/scripts/seed-data/job-search-flows")],
];

const others: AuthoredFlow[] = [];
for (const [exported, load] of OTHERS) {
  try {
    const loaded = await load();
    if (Array.isArray(loaded[exported])) others.push(...(loaded[exported] as AuthoredFlow[]));
  } catch {
    // Mid-rewrite next door. The seed script skips it too.
  }
}

const doc = buildAuthoredFlow(RELOCATION_FLOWS);

const MERGED = [...others, ...RELOCATION_FLOWS];
const mergedDoc = buildAuthoredFlow(MERGED);
const mergedFlow = indexFlow(mergedDoc);

const intentOf = (id: string) => `i-${id}`;
const nodeOf = (id: string) => `n-${id}`;

/** Where a cold visitor's first message lands, through the whole engine. */
const landing = (message: string, index = mergedFlow): string | undefined => {
  const step = runTurn(index, emptyState(), { message }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask")?.nodeId;
};

const entryAt = (nodeId: string | undefined): AuthoredFlow | undefined =>
  MERGED.find((f) => nodeOf(f.id) === nodeId);

describe("the relocation set", () => {
  it("is the two hundred plus answers the move actually needs", () => {
    expect(RELOCATION_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the namespace the other packs left free", () => {
    // `move-` is this module's allocation. `att-`, `not-`, `biz-`, `hst-`,
    // `visa-`, `tr-` and `job-` belong to modules concatenated with this one
    // before the graph is built, and a collision there is a silently
    // overwritten answer.
    for (const entry of RELOCATION_FLOWS) {
      expect(entry.id.startsWith("move-"), `${entry.id} is outside the move- namespace`).toBe(true);
    }
  });

  it("has no duplicate ids, here or against the seven packs beside it", () => {
    const ids = MERGED.map((f) => f.id);
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicated).toEqual([]);
  });

  /**
   * A relocating employee's paperwork is handled by four different teams, and the
   * service is what decides which one the callback reaches — a question about a
   * degree certificate answered by the visa desk is a wasted call for both sides.
   * Closed list so a fifth has to be a decision rather than a typo.
   */
  it("routes every entry to one of the four services a relocation touches", () => {
    const allowed = new Set(["visa-processing", "attestation", "legal-translation", "cv-resume"]);
    for (const entry of RELOCATION_FLOWS) {
      expect(allowed.has(entry.service ?? ""), `${entry.id} names "${entry.service}"`).toBe(true);
    }
  });

  it("covers every stage of the move", () => {
    // The clusters, as hubs. A pack that lost one of these silently stopped
    // answering a whole stage, which no routing test would report.
    for (const hub of [
      "move-hub-start", "move-hub-before", "move-hub-papers", "move-hub-arrival",
      "move-hub-setup", "move-hub-housing", "move-hub-money", "move-hub-transport",
      "move-hub-health", "move-hub-family", "move-hub-life", "move-hub-work",
      "move-hub-trouble", "move-hub-us",
    ]) {
      expect(RELOCATION_FLOWS.some((f) => f.id === hub), `${hub} is missing`).toBe(true);
    }
  });
});

describe("what the answers are allowed to say", () => {
  /**
   * The guardrail the chatbot's own replies go through, applied to written
   * content. A figure published under the company's name is worse when a person
   * wrote it: there is no model in the loop to hedge it, and here it would be a
   * figure somebody budgeted a move on.
   */
  it("states no money figure anywhere", () => {
    for (const entry of RELOCATION_FLOWS) {
      expect(findUnsupportedAmounts(entry.answer, ""), `${entry.id} quotes a figure`).toEqual([]);
    }
  });

  it("states no bare rate or percentage", () => {
    for (const entry of RELOCATION_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(entry.answer), `${entry.id} states a rate`).toBe(false);
    }
  });

  /**
   * The claims we may not make. We write CVs and build websites; attestation,
   * legalisation, translation, notarisation and visa filing are carried out by
   * licensed providers we introduce people to, and a relocating employee reading
   * otherwise would be relying on us for something we cannot do.
   */
  it("never claims we perform licensed work or guarantee an outcome", () => {
    const claims =
      /\bwe (attest|legalise|notarise|sponsor|file your|guarantee|place|hire)\b|\bwe will (get|guarantee)\b/i;
    for (const entry of RELOCATION_FLOWS) {
      expect(claims.test(entry.answer), `${entry.id} claims something we do not do`).toBe(false);
    }
  });

  /**
   * Nothing with a shelf life. Narrow on purpose, as in the other packs: a
   * blanket duration ban would forbid true sentences about what an authority
   * expects, so this fires only where a duration shares a sentence with the
   * vocabulary of a promise — "the Emirates ID takes 5 working days" is the
   * sentence being banned, and it is the one new arrivals are told constantly.
   */
  it("promises no turnaround", () => {
    const NUM = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|ninety)`;
    const UNIT = String.raw`(?:working\s+)?(?:days?|weeks?|months?|years?)`;
    const duration = new RegExp(String.raw`\b${NUM}(?:\s*(?:to|-|–|or)\s*${NUM})?\s*${UNIT}\b`, "i");
    const promise =
      /\b(takes?|taking|ready|complete[ds]?|finish(?:ed|es)?|turnaround|deliver(?:ed|y|s)?|guarantee[ds]?|within\s+(?:just|only))\b/i;

    for (const entry of RELOCATION_FLOWS) {
      for (const sentence of entry.answer.split(/(?<=[.!?])\s+/)) {
        expect(
          duration.test(sentence) && promise.test(sentence),
          `${entry.id} promises a turnaround: "${sentence}"`,
        ).toBe(false);
      }
    }
  });

  /**
   * The one hard fact this pack restates, and the reason it is allowed to: the
   * UAE is not a party to the Hague Apostille Convention, which is stable,
   * checkable and the single most expensive thing a relocating person gets wrong.
   * Pinned so a later edit cannot soften it into "may not be enough".
   */
  it("states the apostille position plainly and does not hedge it", () => {
    const entry = RELOCATION_FLOWS.find((f) => f.id === "move-papers-apostille-not-enough");
    expect(entry, "the apostille answer has been removed").toBeDefined();
    expect(entry!.answer).toMatch(/not a party to the Hague Apostille Convention/i);
    expect(entry!.answer).toMatch(/\bNo\b/);
  });
});

describe("every question reaches its own answer", () => {
  it("never writes the same phrasing down twice", () => {
    // Exact equality is `matchByPhrase`'s first pass, so a phrasing listed twice
    // makes the winner arbitrary and the loser unreachable.
    const owner = new Map<string, string>();
    for (const entry of RELOCATION_FLOWS) {
      for (const text of [entry.question, ...entry.phrases]) {
        const normalised = normalizeQuestion(text);
        const already = owner.get(normalised);
        expect(already ?? entry.id, `"${text}" is on both ${already} and ${entry.id}`).toBe(entry.id);
        owner.set(normalised, entry.id);
      }
    }
  });

  it("routes every phrasing to its own entry within the pack", () => {
    for (const entry of RELOCATION_FLOWS) {
      for (const text of [entry.question, ...entry.phrases]) {
        expect(matchByPhrase(text, doc.intents), `"${text}" on ${entry.id}`).toBe(intentOf(entry.id));
      }
    }
  }, 30_000);

  /** The one that earns its keep: eight packs, every phrasing matched against
   *  every intent in the merged graph exactly as a cold first message is. */
  it("routes every phrasing to its own entry in the merged graph", () => {
    for (const entry of RELOCATION_FLOWS) {
      for (const text of [entry.question, ...entry.phrases]) {
        expect(matchByPhrase(text, mergedDoc.intents), `"${text}" on ${entry.id}`).toBe(
          intentOf(entry.id),
        );
      }
    }
  }, 60_000);

  it("walks the real engine from a cold start to the right node, merged", () => {
    // The keyword matcher is what answers on the days no embedding key is
    // usable, so it is the floor the flow has to work at.
    for (const entry of RELOCATION_FLOWS) {
      expect(landing(entry.question), `"${entry.question}"`).toBe(nodeOf(entry.id));
    }
  }, 60_000);

  /**
   * The mirror, and the half a within-pack check cannot see. This pack sits next
   * to two that cover adjacent ground on purpose — the job pack owns labour law
   * and job hunting, the visa pack owns visa mechanics — so a relocation-shaped
   * keyword group firing on one of their questions answers the wrong subject
   * from this file.
   */
  it("steals nothing from the packs it sits beside", () => {
    const stolen: string[] = [];
    for (const entry of others) {
      const got = matchByPhrase(entry.question, mergedDoc.intents);
      if (got?.startsWith("i-move-")) stolen.push(`"${entry.question}" (${entry.id}) -> ${got}`);
    }
    expect(stolen).toEqual([]);
  }, 60_000);

  it("leaves the questions the job and visa packs own alone", () => {
    for (const question of [
      "how does probation work in the uae",
      "how does end of service gratuity work",
      "what is wps and does it protect me",
      "how much notice do i have to give in my uae job",
      "how is overtime treated in the uae",
      "what leave am i entitled to in the uae",
      "what is the market rate for my job in dubai",
      "what does the medical test for in the uae",
      "how do i renew my emirates id",
      "who can sponsor a residence visa in the uae",
      "how do i attest a marriage certificate",
      "how much does notarisation cost",
      "company setup cost",
    ]) {
      const landed = landing(question) ?? "";
      expect(landed.startsWith("n-move-"), `"${question}" was claimed by this pack`).toBe(false);
    }
  });
});

describe("money about our work reaches a person, not a paragraph", () => {
  it("has money questions at all", () => {
    // Someone deleting the last `quote` entry would make the tests below
    // vacuously pass.
    expect(RELOCATION_FLOWS.some((f) => f.quote)).toBe(true);
  });

  it("walks every money question into that service's qualification", () => {
    for (const entry of RELOCATION_FLOWS.filter((f) => f.quote)) {
      const out = doc.edges.filter((e) => e.from === nodeOf(entry.id));
      expect(out.map((e) => e.to), `${entry.id}`).toEqual([`q-${entry.service}`]);
      expect(out[0].when.kind).toBe("always");
    }
  });

  /**
   * The behavioural guard, generated rather than curated: every price stem
   * crossed with every subject this pack could be asked to price. Landing on
   * another pack's money entry is a pass — that ends at a callback too, which is
   * the rule being protected — and landing on prose or on `fallback-model` is
   * not, because the model would then answer a price question in prose.
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
      "my relocation documents",
      "my moving documents",
      "attesting my relocation documents",
      "my residence paperwork",
      "my relocation visa",
      "translation of my relocation documents",
      "translating my moving paperwork",
      "the whole relocation",
      "my entire relocation",
    ];

    const missed: string[] = [];
    for (const subject of subjects) {
      for (const stem of stems) {
        const question = `${stem} ${subject}`;
        const landed = landing(question);
        if (!entryAt(landed)?.quote) missed.push(`${question} -> ${landed ?? "(model fallback)"}`);
      }
    }
    expect(missed).toEqual([]);
  }, 30_000);

  /** Colloquial money phrasings nobody wrote down, which is where a price
   *  question escapes to the model and gets answered in prose by a paid call. */
  it("lets no colloquial money question about our work reach the model", () => {
    for (const question of [
      "how much am i looking at for my relocation documents",
      "is it expensive to prepare my documents for moving to the uae",
      "give me an estimate for my relocation paperwork",
      "what do you charge for relocation visa work",
      "estimate for translation of my moving paperwork",
      "all in price for relocating to the uae",
    ]) {
      const landed = landing(question);
      expect(entryAt(landed)?.quote, `"${question}" landed on ${landed ?? "fallback-model"}`).toBe(true);
    }
  });

  /**
   * The other direction, and the reason this pack needed its own rule. Somebody
   * working out whether they can afford to move is not asking what we cost, and
   * answering them with a lead form would be both useless and grubby. Every one
   * of these must land on content.
   */
  it("never answers a question about the visitor's own budget with a lead form", () => {
    for (const question of [
      "what will my first month here actually cost me",
      "how much do i need up front to move into a flat in dubai",
      "what should i expect to spend before my first payday",
      "will my salary actually cover living here",
      "how do school fees work and when are they due",
      "why do landlords here ask for the rent in cheques",
      "what deposit will i have to put down on a flat",
      "do i have to pay the estate agent as well",
      "what is the best way to send money home",
      "what taxes and charges will i actually come across",
      "who pays for my flight out and my family's",
      "my employer wants me to pay for my own work permit",
      "do i have to pay for the guidance in this chat",
    ]) {
      const landed = landing(question);
      const entry = entryAt(landed);
      expect(entry, `"${question}" reached no answer at all`).toBeDefined();
      expect(entry?.quote ?? false, `"${question}" landed on the quote entry ${entry?.id}`).toBe(false);
    }
  });

  /**
   * `matchByPhrase` runs before any embedding and takes the first candidate whose
   * phrase appears in the message, and hubs sort first — so a hub listing a price
   * phrasing silently puts a menu between someone asking about money and someone
   * calling them back.
   */
  it("keeps price phrasings off the cluster hubs", () => {
    const priceEnquiry = /how much|\bcost of\b|\bprice (for|of)\b|\bfees (in|for)\b|cheapest/i;
    for (const entry of RELOCATION_FLOWS.filter((f) => f.faq === false && !f.quote)) {
      for (const text of [entry.question, ...entry.phrases]) {
        expect(priceEnquiry.test(text), `hub ${entry.id} claims "${text}"`).toBe(false);
      }
    }
  });

  it("leaves another pack's money questions alone", () => {
    // A bare ["cost"] catch-all would fix any fall-through here and would fight
    // the attestation and visa packs over questions that are not ours — and
    // their money entries end at a callback of their own, so stealing one loses
    // the lead rather than winning it.
    for (const question of [
      "how much does attestation cost",
      "degree attestation cost",
      "how much does a uae residence visa cost",
      "what does it cost to sponsor my wife in dubai",
      "how much does cv writing cost in dubai",
      "notary fee",
      "trade licence cost",
    ]) {
      const landed = landing(question) ?? "";
      expect(landed.startsWith("n-move-"), `"${question}" was claimed by this pack`).toBe(false);
    }
  });
});

describe("the keyword groups", () => {
  it("gives every money entry a group carrying a price word", () => {
    const priceWord = /^(cost|much|price|fees|charges|cheaper)$/i;
    // The entry that carries `quote` without being a money question: it asks for
    // a person, and `quote` is simply the mechanism that reaches one.
    const askingForAPerson = new Set(["move-us-talk-to-someone"]);
    for (const entry of RELOCATION_FLOWS.filter((f) => f.quote && !askingForAPerson.has(f.id))) {
      const groups = entry.keywords ?? [];
      expect(
        groups.some((g) => g.length >= 3 && g.some((w) => priceWord.test(w))),
        `${entry.id} has no price-word group of three, so a prose entry outranks it`,
      ).toBe(true);
    }
  });

  it("holds the cluster hubs to two-word keyword groups", () => {
    // `matchByKeywords` ranks by group LENGTH and ties go to the earlier
    // candidate, and hubs sort ahead of everything. At three words a hub beats
    // the money entries outright; at two it loses to anything more specific,
    // which makes it the answer to a vague message and never an interception.
    for (const entry of RELOCATION_FLOWS.filter((f) => f.faq === false && !f.quote)) {
      for (const group of entry.keywords ?? []) {
        expect(group.length, `hub ${entry.id} group [${group.join(", ")}]`).toBeLessThanOrEqual(2);
      }
    }
  });

  /**
   * A group that asks for the same word twice. `sameWord` folds two words sharing
   * five leading characters, so "relocation" and "relocating" are one word, as
   * are "translating" and "translation". A group pairing two of them reads as
   * discriminating and is not: its weight is inflated by a word that adds
   * nothing, and it fires far wider than it looks.
   */
  it("never asks for the same word twice in one keyword group", () => {
    const duplicated: string[] = [];
    for (const entry of RELOCATION_FLOWS) {
      for (const group of entry.keywords ?? []) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            if (sameWord(group[i].toLowerCase(), group[j].toLowerCase())) {
              duplicated.push(`${entry.id} [${group.join(", ")}] — "${group[i]}" is "${group[j]}"`);
            }
          }
        }
      }
    }
    expect(duplicated).toEqual([]);
  });

  const SCAFFOLDING = [
    "what", "is", "are", "do", "does", "did", "i", "my", "me", "the", "a", "an", "to",
    "of", "in", "for", "on", "at", "and", "or", "be", "been", "have", "has", "can",
    "will", "would", "should", "if", "it", "this", "that", "there", "from", "as", "not",
    "no", "how", "why", "when", "where", "who", "which", "so", "by", "with", "about",
    "your", "you", "we", "us", "some", "one", "all", "any", "more", "most", "much",
    "many", "other", "such", "only", "own", "same", "than", "too", "very", "just", "now",
  ];

  it("is built out of content words, not question scaffolding", () => {
    // A group is an AND-group ranked by its LENGTH, so padding one with question
    // words inflates its weight without adding discrimination.
    const scaffolding = new Set(SCAFFOLDING);
    for (const entry of RELOCATION_FLOWS) {
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
   * A content word that silently becomes a function word. `sameWord` folds a
   * four-letter word onto any longer word sharing it, so "within" matches a bare
   * "with" and "yourself" matches "your" — both turn a group into a
   * near-universal trigger, and nothing about either word suggests it.
   */
  it("has no keyword that stems onto a function word", () => {
    for (const entry of RELOCATION_FLOWS) {
      for (const group of entry.keywords ?? []) {
        for (const word of group) {
          if (SCAFFOLDING.includes(word.toLowerCase())) continue;
          const folds = SCAFFOLDING.filter((fn) => phraseRun([word], fn));
          expect(folds, `${entry.id} [${group.join(", ")}]: "${word}" stems onto ${folds.join("/")}`).toEqual([]);
        }
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

  it("keeps chips to what the runtime will actually show", () => {
    // `suggestions` shows three. A fourth is invisible, which reads as an
    // author's decision having no effect.
    for (const entry of RELOCATION_FLOWS) {
      expect((entry.next ?? []).length, `${entry.id}`).toBeLessThanOrEqual(3);
    }
  });

  /**
   * Deliberately no opener. Only four opening suggestions are ever shown, sorted
   * by `position` — which is authored order across the concatenated packs — and
   * this module is appended last, so an `opener: true` here would either do
   * nothing or, moved earlier, unseat attestation's or job search's. Pinned so
   * the omission reads as a decision rather than an oversight.
   */
  it("claims no opening suggestion", () => {
    expect(RELOCATION_FLOWS.filter((f) => f.opener).map((f) => f.id)).toEqual([]);
  });

  it("reaches every hub by typing, since no chip or opener leads to one", () => {
    for (const hub of RELOCATION_FLOWS.filter((f) => f.faq === false)) {
      expect(landing(hub.question), `hub ${hub.id}`).toBe(nodeOf(hub.id));
    }
  }, 30_000);
});

describe("what it costs the merged draft", () => {
  /**
   * The caps bind on the merged draft rather than per module, and this pack is
   * the one that forced them up — so unlike the earlier packs' tests this does
   * assert against them. `scripts/migrate-answers-to-flow.ts` adds roughly 45
   * more of each on top of what is measured here, which is the headroom being
   * checked for.
   */
  it("fits the merged draft with room for the legacy migration", () => {
    const LEGACY = 45;
    const caps = { nodes: 1750, intents: 1750, edges: 7000 };
    const counts = {
      nodes: mergedDoc.nodes.length,
      intents: mergedDoc.intents.length,
      edges: mergedDoc.edges.length,
    };
    console.log(
      `merged: ${MERGED.length} entries, ${counts.nodes} nodes, ${counts.intents} intents, ${counts.edges} edges`,
    );
    expect(counts.nodes + LEGACY).toBeLessThanOrEqual(caps.nodes);
    expect(counts.intents + LEGACY).toBeLessThanOrEqual(caps.intents);
    expect(counts.edges + LEGACY * 4).toBeLessThanOrEqual(caps.edges);
  });

  it("agrees with the schema's own limits, so the seed cannot fail on a number this test passed", () => {
    // `buildAuthoredFlow` ends in `flowDoc.parse`, so the merged build above
    // already proves the document is within the schema. This pins the caps
    // asserted above to the schema itself rather than to a copied number.
    expect(() => flowDoc.parse(mergedDoc)).not.toThrow();
  });
});
