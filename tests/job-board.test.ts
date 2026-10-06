import { describe, expect, it } from "vitest";
import { JOB_BOARD_FLOWS } from "@/scripts/seed-data/job-board-flows";
import { buildAuthoredFlow, mergedCounts, type AuthoredFlow } from "@/lib/chat/flow/authored";
import { flowDoc, indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase } from "@/lib/chat/flow/lookup";
import { sameWord } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";
import { JOB_SLOT } from "@/lib/chat/page-context";
import { boardPath, describeQuery, parseBoardQuery } from "@/lib/chat/jobs/query";
import {
  MIN_STATING,
  renderListings,
  renderPosting,
  renderSalary,
  salarySpread,
  type BoardResult,
} from "@/lib/chat/jobs/answer";
import { formatSalary } from "@/lib/salary";
import type { JobSummary } from "@/lib/content/queries";

/**
 * The half of the chat that answers from data rather than from written answers.
 *
 * Three different things can go wrong here and they fail in different places,
 * so the file is in three parts.
 *
 *   - The parser can read the question wrongly. Postgres ANDs the terms it is
 *     given, so one stopword left in turns a search that would have matched
 *     twenty-seven listings into one that matches none — and the failure is
 *     silent, because an empty board is a legitimate answer.
 *   - The renderer can state a figure the listings do not support. That is the
 *     one failure with a cost attached to it: somebody takes a salary we
 *     invented into a negotiation. The floor below (`MIN_STATING`) and the
 *     `findUnsupportedAmounts` tests are the guard, and they are the reason
 *     this module is pure.
 *   - The routing can steal a question. The board entries are nine more
 *     candidates in a merged graph of 1,588, and the ones they sit next to are
 *     the money questions that must reach a human — "what do you charge to
 *     write a CV" and "what does a nurse earn in Dubai" are one word apart in
 *     vocabulary and opposite in what they require of us.
 */

/* ── Fixtures ────────────────────────────────────────────────────────────── */

const job = (over: Partial<JobSummary> = {}): JobSummary => ({
  slug: "registered-nurse-al-noor",
  title: "Registered Nurse",
  company: "Al Noor Hospital",
  emirate: "Dubai",
  category: "Healthcare",
  summary: "Ward nursing on rotating shifts.",
  documents_needed: ["Degree certificate", "Nursing licence"],
  posted_at: "2026-10-01T00:00:00.000Z",
  salary_text: null,
  salary_min: null,
  salary_max: null,
  experience_years: null,
  apply_by: null,
  ...over,
});

const NOW = new Date("2026-10-06T00:00:00.000Z");

const result = (over: Partial<BoardResult> = {}): BoardResult => {
  const query = over.query ?? parseBoardQuery("nurse jobs in dubai");
  return { query, asked: query, rows: [job()], total: 1, relaxed: null, ...over };
};

/* ── 1. Reading the question ─────────────────────────────────────────────── */

describe("reading a board search out of a message", () => {
  it("keeps the role and drops everything that is not the job", () => {
    expect(parseBoardQuery("are there any nurse jobs in dubai right now?").terms).toEqual(["nurse"]);
  });

  it("takes the emirate as a filter rather than as a search term", () => {
    const query = parseBoardQuery("any driver vacancies in sharjah");
    expect(query.terms).toEqual(["driver"]);
    expect(query.emirate).toBe("Sharjah");
  });

  it("reads the emirates whose names are several words", () => {
    expect(parseBoardQuery("jobs in abu dhabi").emirate).toBe("Abu Dhabi");
    expect(parseBoardQuery("anything in ras al khaimah").emirate).toBe("Ras Al Khaimah");
    expect(parseBoardQuery("jobs in RAK").emirate).toBe("Ras Al Khaimah");
  });

  /**
   * `normalizeEmirate` matches its aliases by substring, which is right for a
   * feed's location field and wrong for a sentence — "bur" is one of them. The
   * parser hands it whole words, so an alias can only be found as a word.
   */
  it("does not find an emirate inside an ordinary word", () => {
    expect(parseBoardQuery("i want a job as a burger chef").emirate).toBeNull();
    expect(parseBoardQuery("looking for bartender work").emirate).toBeNull();
  });

  it("strips the pay vocabulary out of a salary question", () => {
    // "nurse salary dubai" is a question about nurses. Searching the text for
    // "salary" as well would drop every listing that did not use the word.
    expect(parseBoardQuery("what does a nurse earn in dubai").terms).toEqual(["nurse"]);
    expect(parseBoardQuery("average monthly salary for an accountant").terms).toEqual(["accountant"]);
  });

  it("reads a floor only where one was actually named", () => {
    expect(parseBoardQuery("jobs paying over 10k in dubai").salaryMin).toBe(10_000);
    expect(parseBoardQuery("anything paying more than 12,000 a month").salaryMin).toBe(12_000);
    expect(parseBoardQuery("sales jobs 15k+").salaryMin).toBe(15_000);
    // A number that is not a demand. Reading "2" as a salary floor would empty
    // the board; reading "2 years" as one would be worse.
    expect(parseBoardQuery("nurse jobs with 2 years experience").salaryMin).toBeNull();
    expect(parseBoardQuery("is 8000 a good salary in dubai").salaryMin).toBeNull();
  });

  it("recognises the question a lot of this site's traffic arrives with", () => {
    expect(parseBoardQuery("jobs for freshers in dubai").freshersOnly).toBe(true);
    expect(parseBoardQuery("any vacancies with no experience").freshersOnly).toBe(true);
    expect(parseBoardQuery("entry-level jobs in sharjah").freshersOnly).toBe(true);
    expect(parseBoardQuery("senior engineer jobs").freshersOnly).toBe(false);
  });

  it("falls back to the box's own terms when the message names no role", () => {
    // A tapped chip sends its label, which is a sentence about us rather than a
    // role: "What does this job pay?" contains no searchable word at all.
    expect(parseBoardQuery("What does this job pay?", "nurse").terms).toEqual(["nurse"]);
    expect(parseBoardQuery("what jobs do you have", "receptionist").terms).toEqual(["receptionist"]);
    // And the visitor's own words win over the preset, because the chip is a
    // starting point and the sentence is the question.
    expect(parseBoardQuery("any welder jobs", "nurse").terms).toEqual(["welder"]);
  });

  /** Found against the real board: the chip's own label was being searched, so
   *  "Which of your listings…" looked for vacancies containing the word
   *  "listings" and found three out of 258. */
  it("does not search for the words we use about our own board", () => {
    expect(parseBoardQuery("which of your listings are open to freshers").terms).toEqual([]);
    expect(parseBoardQuery("what is on your jobs board right now").terms).toEqual([]);
    expect(parseBoardQuery("anything on your site for a welder").terms).toEqual(["welder"]);
  });

  it("keeps the abbreviations people really do search by", () => {
    expect(parseBoardQuery("any hr jobs in dubai").terms).toEqual(["hr"]);
    // "it" is not one of them: it is a pronoun far more often than a field, so
    // it stays stopped and "support" carries the search on its own.
    expect(parseBoardQuery("it support vacancies").terms).toEqual(["support"]);
  });

  it("links back to the board with the same search the reply answered", () => {
    const path = boardPath(parseBoardQuery("nurse jobs in dubai paying over 8k"));
    expect(path).toBe("/en/jobs?q=nurse&emirate=Dubai&salaryMin=8000");
  });

  it("describes the search without reading the visitor's words back as ours", () => {
    expect(describeQuery(parseBoardQuery("any nurse jobs in dubai"))).toBe("nurse jobs in Dubai");
    expect(describeQuery(parseBoardQuery("what have you got"))).toBe("jobs in the UAE");
  });
});

/* ── 2. What the reply is allowed to say ─────────────────────────────────── */

describe("listings, said out loud", () => {
  it("shows the employer's own salary string rather than our reconstruction", () => {
    const reply = renderListings(
      result({ rows: [job({ salary_text: "AED 8k-10k negotiable", salary_min: 8000, salary_max: 10_000 })] }),
      "fallback",
      "en",
      NOW,
    );
    expect(reply).toContain("AED 8k-10k negotiable");
    expect(reply).not.toContain("AED 8,000 – AED 10,000");
  });

  it("links every listing it names", () => {
    const reply = renderListings(result(), "fallback", "en", NOW);
    expect(reply).toContain("[Registered Nurse](/en/jobs/registered-nurse-al-noor)");
  });

  it("says how many there are, not just how many it showed", () => {
    const reply = renderListings(result({ total: 27 }), "fallback", "en", NOW);
    expect(reply).toContain("27 listings");
    expect(reply).toContain("See all 27 listings on the board");
  });

  it("admits what it had to give up to find anything", () => {
    const reply = renderListings(
      result({
        query: parseBoardQuery("nurse jobs"),
        asked: parseBoardQuery("nurse jobs in fujairah"),
        relaxed: "emirate",
      }),
      "fallback",
      "en",
      NOW,
    );
    expect(reply).toContain("Nothing in Fujairah right now");
  });

  /**
   * Found against the real board. "Which of your listings are open to
   * freshers" came back with 249 of 258, because the page's experience filter
   * keeps every listing that stated no requirement — which is the right answer
   * to "what could I apply for" and the wrong one to this.
   */
  it("counts only the listings that say they are open to freshers", () => {
    const query = parseBoardQuery("which of your listings are open to freshers", "");
    expect(query.freshersOnly).toBe(true);
    expect(describeQuery(query)).toBe("jobs open to freshers in the UAE");

    const reply = renderListings(result({ query, asked: query, total: 4 }), "fallback", "en", NOW);
    expect(reply).toContain("4 listings for jobs open to freshers");
    expect(reply).toContain("is not the same as one that welcomes a fresher");
  });

  it("answers an empty board with the authored advice and no invention", () => {
    const reply = renderListings(result({ rows: [], total: 0 }), "the authored fallback", "en", NOW);
    expect(reply).toContain("I have nothing on the board");
    expect(reply).toContain("the authored fallback");
    expect(reply).toContain("/en/jobs");
  });
});

describe("what the board says a role pays", () => {
  const paying = [
    job({ slug: "a", salary_min: 4000, salary_max: 6000 }),
    job({ slug: "b", salary_min: 5000, salary_max: 9000 }),
    job({ slug: "c", salary_min: 7000, salary_max: 7000 }),
  ];

  it("spreads the range across every figure the listings state", () => {
    expect(salarySpread(paying)).toEqual({ min: 4000, max: 9000 });
    expect(salarySpread([job()])).toEqual({ min: null, max: null });
  });

  it("quotes a range once enough listings state one, labelled as theirs", () => {
    const reply = renderSalary(
      { query: parseBoardQuery("what does a nurse earn in dubai"), asked: parseBoardQuery("what does a nurse earn in dubai"), total: 27, stating: 3, rows: paying },
      "the authored fallback",
      "en",
      NOW,
    );
    expect(reply).toContain("3 of the 27 listings");
    expect(reply).toContain("AED 4,000 – AED 9,000 per month");
    expect(reply).toContain("not a market rate");
  });

  /**
   * The rule the whole module exists for. Of 258 live listings, 17 state a
   * salary — so for most roles a "range" would be one employer's advert read as
   * the going rate, and the person asking is about to negotiate with it.
   */
  it("refuses a range below the floor and hands over to the written answer", () => {
    for (const stating of [0, 1, 2]) {
      const reply = renderSalary(
        {
          query: parseBoardQuery("what does a welder earn in dubai"),
          asked: parseBoardQuery("what does a welder earn in dubai"),
          total: 14,
          stating,
          rows: paying.slice(0, stating),
        },
        "we deliberately do not publish a figure of our own",
        "en",
        NOW,
      );
      expect(reply, `${stating} stating`).toContain("too few");
      // One listing states, two listings state.
      if (stating === 1) expect(reply).toContain("states a salary");
      if (stating === 2) expect(reply).toContain("state a salary");
      expect(reply).toContain("we deliberately do not publish a figure of our own");
      // What is forbidden is the aggregate — a spread presented as what the
      // role pays. A figure printed beside the one listing that stated it is
      // the opposite of that, and is the useful half of the answer.
      expect(reply).not.toContain("those advertise");
    }
    expect(MIN_STATING).toBe(3);
  });

  it("states no figure the listings do not carry", () => {
    // The guardrail the model's own replies go through, pointed at the composed
    // reply: every amount in it has to appear in the rows it was built from.
    // The context a reader has: the figures as they appear beside the listings.
    const context = paying
      .map((r) => formatSalary({ min: r.salary_min, max: r.salary_max }))
      .join(" ");
    const reply = renderSalary(
      { query: parseBoardQuery("nurse salary dubai"), asked: parseBoardQuery("nurse salary dubai"), total: 27, stating: 3, rows: paying },
      "fallback",
      "en",
      NOW,
    );
    expect(findUnsupportedAmounts(reply, context)).toEqual([]);
  });

  it("says so plainly when the board holds nothing for the role at all", () => {
    const reply = renderSalary(
      { query: parseBoardQuery("what does a blacksmith earn"), asked: parseBoardQuery("what does a blacksmith earn"), total: 0, stating: 0, rows: [] },
      "the authored fallback",
      "en",
      NOW,
    );
    expect(reply).toContain("I have nothing on the board");
    expect(reply).toContain("the authored fallback");
  });
});

describe("the listing someone is reading", () => {
  it("quotes the pay verbatim and refuses to guess when there is none", () => {
    expect(renderPosting(job({ salary_text: "AED 7,500 per month" }), "en", NOW)).toContain(
      "AED 7,500 per month, as the employer advertised it",
    );
    expect(renderPosting(job(), "en", NOW)).toContain("does not state one, and I will not guess");
  });

  it("turns what the employer wants into the paperwork it implies", () => {
    const reply = renderPosting(job(), "en", NOW);
    expect(reply).toContain("Degree certificate");
    expect(reply).toContain("attested");
  });

  it("carries the deadline while there is one to carry", () => {
    expect(renderPosting(job({ apply_by: "2026-10-08" }), "en", NOW)).toContain("Closes in 2 days");
    expect(renderPosting(job({ apply_by: "2026-09-01" }), "en", NOW)).not.toContain("Deadline");
  });
});

/* ── 3. The graph ────────────────────────────────────────────────────────── */

/** The packs this one is concatenated with, in the seeder's order, so the
 *  candidate list here is the one production builds. */
const OTHERS: [string, () => Promise<Record<string, unknown>>][] = [
  ["ATTESTATION_FLOWS", () => import("@/scripts/seed-data/attestation-flows")],
  ["NOTARISATION_FLOWS", () => import("@/scripts/seed-data/notarisation")],
  ["BUSINESS_SETUP_FLOWS", () => import("@/scripts/seed-data/business-setup-flows")],
  ["HIGHER_STUDIES_FLOWS", () => import("@/scripts/seed-data/higher-studies-notarisation")],
  ["VISA_FLOWS", () => import("@/scripts/seed-data/visa-flows")],
  ["TRANSLATION_FLOWS", () => import("@/scripts/seed-data/translation-flows")],
  ["JOB_SEARCH_FLOWS", () => import("@/scripts/seed-data/job-search-flows")],
  ["RELOCATION_FLOWS", () => import("@/scripts/seed-data/relocation-flows")],
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

const MERGED = [...others, ...JOB_BOARD_FLOWS];
const mergedDoc = buildAuthoredFlow(MERGED);
const mergedFlow = indexFlow(mergedDoc);

const nodeOf = (id: string) => `n-${id}`;
const entryAt = (nodeId: string | undefined) => MERGED.find((f) => nodeOf(f.id) === nodeId);

/** Where a cold visitor's first message lands. A board box speaks too, so it
 *  counts as a landing — otherwise every test here passes on silence. */
const landing = (message: string): string | undefined => {
  const step = runTurn(mergedFlow, emptyState(), { message }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask" || e.kind === "jobs")?.nodeId;
};

describe("the board pack as content", () => {
  it("keeps every id inside the namespace the other packs left free", () => {
    for (const entry of JOB_BOARD_FLOWS) {
      expect(entry.id.startsWith("board-"), `${entry.id} is outside board-`).toBe(true);
    }
  });

  it("has no duplicate ids against the eight packs beside it", () => {
    const ids = MERGED.map((f) => f.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("answers every entry from the board rather than from prose", () => {
    for (const entry of JOB_BOARD_FLOWS) {
      expect(entry.board, `${entry.id} is prose in a data pack`).toBeDefined();
    }
  });

  /** The fallbacks are published sentences like any other, so they are held to
   *  the same rule: no figure, no promise. The figures come from the listings. */
  it("states no money figure and no turnaround in any fallback", () => {
    for (const entry of JOB_BOARD_FLOWS) {
      expect(findUnsupportedAmounts(entry.answer, ""), `${entry.id} quotes a figure`).toEqual([]);
      expect(/\bwe (place|hire|guarantee|find you)\b/i.test(entry.answer), entry.id).toBe(false);
    }
  });

  /**
   * `sameWord` folds any two words sharing five leading characters, so a group
   * pairing two of them asks for one word twice at double the weight — which is
   * how a group written for one subject starts firing on another.
   */
  it("never asks for the same word twice in one keyword group", () => {
    for (const entry of [...JOB_BOARD_FLOWS, ...MERGED.filter((f) => f.id === "job-pay-market-rate")]) {
      for (const group of entry.keywords ?? []) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            expect(
              sameWord(group[i], group[j]),
              `${entry.id}: "${group[i]}" and "${group[j]}" are one word`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("builds, lints and publishes inside the schema's ceilings", () => {
    expect(() => flowDoc.parse(mergedDoc)).not.toThrow();
    expect(publishable(lintFlow(mergedDoc))).toBe(true);

    const empty = flowDoc.parse({ nodes: [{ kind: "start", id: "start" }], edges: [], intents: [], slots: [] });
    const counts = mergedCounts(empty, mergedDoc);
    expect(counts.nodes).toBeLessThanOrEqual(1750);
    expect(counts.intents).toBeLessThanOrEqual(1750);
    expect(counts.edges).toBeLessThanOrEqual(7000);
  });
});

describe("routing, against all nine packs at once", () => {
  it("reaches each board entry by every phrasing it claims", () => {
    const candidates = mergedDoc.intents.map((i) => ({ id: i.id, name: i.name, phrases: i.phrases }));
    for (const entry of JOB_BOARD_FLOWS) {
      for (const phrase of [entry.question, ...entry.phrases]) {
        expect(matchByPhrase(phrase, candidates), `"${phrase}" (${entry.id})`).toBe(`i-${entry.id}`);
      }
    }
  });

  it("answers a role search from the board", () => {
    for (const asked of [
      "are there any nurse jobs in dubai",
      "any driver jobs in sharjah",
      "what jobs do you have",
      "show me your vacancies",
    ]) {
      const entry = entryAt(landing(asked));
      expect(entry?.board, `"${asked}" landed on ${entry?.id}`).toBeDefined();
    }
  });

  /**
   * The same searches with no embedding key usable, which is not a hypothetical
   * — the keys hit quota regularly. `matchByKeywords` is then doing the work,
   * and it cannot be given the role, because the role is whatever the visitor
   * does for a living. So the generic word paired with the place is what has to
   * carry it.
   */
  it("still reaches the board on phrasings nobody wrote down", () => {
    for (const asked of [
      "any welder jobs in dubai",
      "accountant vacancies in dubai",
      "are there jobs in sharjah",
    ]) {
      const entry = entryAt(landing(asked));
      expect(entry?.board, `"${asked}" landed on ${entry?.id}`).toBeDefined();
    }
  });

  /**
   * The asymmetry this pack has to hold. A question about what WE charge ends
   * at a person and a callback; a question about what a ROLE pays is answered
   * from the board. They share most of their vocabulary, and getting them the
   * wrong way round either hides the lead form or answers a negotiation with a
   * sales call.
   */
  it("leaves a question about our own price on the callback path", () => {
    for (const asked of [
      "what do you charge to write a cv",
      "how much does your cv writing cost",
      "what does it cost to attest my certificate for a job",
      "how much is legal translation for my job documents",
    ]) {
      const entry = entryAt(landing(asked));
      expect(entry?.quote, `"${asked}" landed on ${entry?.id}`).toBe(true);
      expect(entry?.board).toBeUndefined();
    }
  });

  it("answers a question about what a role pays from the board", () => {
    for (const asked of [
      "what does a nurse earn in dubai",
      "what is the salary for an accountant in dubai",
      "how much do drivers get paid in sharjah",
      "what do your listings pay",
    ]) {
      const entry = entryAt(landing(asked));
      expect(entry?.id, `"${asked}"`).toBe("job-pay-market-rate");
      expect(entry?.board?.answers).toBe("salary");
    }
  });

  it("steals nothing from the packs it was added beside", () => {
    // A sample of questions the other packs own, each of which has to still
    // reach prose rather than a listing search.
    for (const asked of [
      "will you find me a job",
      "how does your jobs page work",
      "i am a fresher with no experience will anyone hire me",
      "can i job hunt on a tourist visa",
      "what salary should i ask for",
      "where are uae jobs advertised",
    ]) {
      const entry = entryAt(landing(asked));
      expect(entry?.board, `"${asked}" was taken by ${entry?.id}`).toBeUndefined();
    }
  });
});

describe("walking onto a board box", () => {
  const flow = indexFlow(buildAuthoredFlow(JOB_BOARD_FLOWS.map((f) => ({ ...f, next: [], choices: [] }))));

  it("asks the route to read the board, and spends nothing doing it", () => {
    const step = runTurn(
      flow,
      emptyState(),
      { message: "are there any nurse jobs in dubai" },
      { match: keywordMatcher },
    );
    const effect = step.effects.find((e) => e.kind === "jobs");

    expect(effect).toBeDefined();
    expect(step.usedModel, "a board answer must never be charged to the model budget").toBe(false);
    expect(effect && "fallback" in effect && effect.fallback.length).toBeGreaterThan(0);
  });

  it("carries the box's own search terms and mode to the route", () => {
    const step = runTurn(
      flow,
      emptyState(),
      { message: "", targetNodeId: nodeOf("board-field-driving") },
      { match: keywordMatcher },
    );
    const effect = step.effects.find((e) => e.kind === "jobs");
    expect(effect && "query" in effect && effect.query).toBe("driver");
    expect(effect && "answers" in effect && effect.answers).toBe("listings");
  });

  it("names the listing slot the runtime writes from the page", () => {
    // The box set to answer about "this one" reads it from here, so the key
    // being declared is what makes opening the widget on a job page enough.
    expect(flow.slot.has(JOB_SLOT)).toBe(true);
  });
});
