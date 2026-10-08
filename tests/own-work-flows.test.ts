import { describe, expect, it } from "vitest";
import { OWN_WORK_FLOWS } from "@/scripts/seed-data/own-work-flows";
import { OWN_WORK, OWN_WORK_DOORS } from "@/scripts/seed-data/own-work-doors";
import {
  buildAuthoredFlow,
  buildSubjectPack,
  FALLBACK_NODE,
  type AuthoredFlow,
} from "@/lib/chat/flow/authored";
import { indexFlow } from "@/lib/chat/flow/schema";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { sameWord } from "@/lib/text";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * The pack about the two things we build ourselves, and the four doors into it.
 *
 * This is the first pack that is **not** merged into the one flow every turn
 * loads. It is published as its own document and reached through `subject`
 * doors, which moves the whole routing risk from one place to another and is
 * the reason this file is shaped differently from its eight predecessors.
 *
 * What stopped being a risk: cross-pack theft of an entry. Inside the pack the
 * only competition is other entries in the pack, because the attestation and
 * visa packs are not in the document. Most of what
 * `tests/relocation-flows.test.ts` spends its length on cannot happen here.
 *
 * What became the risk instead, and what most of this file is about:
 *
 *   - **A door that does not win is two hundred and forty-two answers nobody
 *     can reach.** Nothing downstream can rescue a missed door, and nothing
 *     fails loudly when one is missed — the question simply goes to the model.
 *     So the doors are walked against the *merged* flow, which is the graph a
 *     visitor actually meets.
 *   - **A door that wins too much silently breaks job search.** That pack owns
 *     thirty CV questions — format, length, the photo, ATS, gaps, the cover
 *     letter — and the boundary between "how should a CV look" and "will you
 *     write mine" is a judgement made in phrasing, not in code. It is asserted
 *     here from both sides.
 *   - **A money question must still end at a person.** Unchanged in substance
 *     from every other pack, but now it has to survive two matches: the door in
 *     the main flow, then the quote entry inside the pack.
 */

/** The packs the doors are concatenated with, in the seeder's order, so the
 *  merged candidate list here is the one production builds. Dynamic, tolerating
 *  a module mid-rewrite, exactly as the seed script does. */
const OTHERS: [string, () => Promise<Record<string, unknown>>][] = [
  ["ATTESTATION_FLOWS", () => import("@/scripts/seed-data/attestation-flows")],
  ["NOTARISATION_FLOWS", () => import("@/scripts/seed-data/notarisation")],
  ["BUSINESS_SETUP_FLOWS", () => import("@/scripts/seed-data/business-setup-flows")],
  ["HIGHER_STUDIES_FLOWS", () => import("@/scripts/seed-data/higher-studies-notarisation")],
  ["VISA_FLOWS", () => import("@/scripts/seed-data/visa-flows")],
  ["TRANSLATION_FLOWS", () => import("@/scripts/seed-data/translation-flows")],
  ["JOB_SEARCH_FLOWS", () => import("@/scripts/seed-data/job-search-flows")],
  ["RELOCATION_FLOWS", () => import("@/scripts/seed-data/relocation-flows")],
  ["JOB_BOARD_FLOWS", () => import("@/scripts/seed-data/job-board-flows")],
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

const pack = buildSubjectPack(OWN_WORK_FLOWS);
const packFlow = indexFlow(pack);

const MAIN = [...others, ...OWN_WORK_DOORS];
const mainDoc = buildAuthoredFlow(MAIN);
const mainFlow = indexFlow(mainDoc);

const nodeOf = (id: string) => `n-${id}`;
const DOOR_NODES = new Set(OWN_WORK_DOORS.map((d) => nodeOf(d.id)));

/** Where a cold visitor's first message lands in a given document. */
const landing = (message: string, index = packFlow): string | undefined => {
  const step = runTurn(index, emptyState(), { message }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask" || e.kind === "subject")
    ?.nodeId;
};

/** The whole two-stage walk, as `lib/chat/flow/serve.ts` performs it: match in
 *  the main flow, and if that lands on a door, match again inside the pack. */
const twoStage = (message: string): { nodeId: string | undefined; usedModel: boolean } => {
  const outer = runTurn(mainFlow, emptyState(), { message }, { match: keywordMatcher });
  const door = outer.effects.find((e) => e.kind === "subject");
  if (!door) {
    const spoke = outer.effects.find((e) => e.kind === "say" || e.kind === "ask");
    return { nodeId: spoke?.nodeId, usedModel: outer.usedModel };
  }

  const inner = runTurn(
    packFlow,
    { ...outer.state, nodeId: null, subject: door.subject },
    { message },
    { match: keywordMatcher },
  );
  // A miss inside the pack walks back out to the main flow, which is where the
  // only fallback lives.
  if (!inner.matched) {
    return { nodeId: FALLBACK_NODE, usedModel: true };
  }
  const spoke = inner.effects.find(
    (e) => e.kind === "say" || e.kind === "ask" || e.kind === "handoff",
  );
  return { nodeId: spoke?.nodeId, usedModel: outer.usedModel || inner.usedModel };
};

const entryById = new Map(OWN_WORK_FLOWS.map((f) => [f.id, f]));
const isHub = (entry: AuthoredFlow) => entry.id.startsWith("own-hub-");

describe("the own-work pack", () => {
  it("is the several hundred answers the two in-house services need", () => {
    expect(OWN_WORK_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the namespace the other packs left free", () => {
    for (const entry of [...OWN_WORK_FLOWS, ...OWN_WORK_DOORS]) {
      expect(entry.id.startsWith("own-"), `${entry.id} is outside the own- namespace`).toBe(true);
    }
  });

  it("collides with no id in any other pack", () => {
    // The pack is its own document, so a collision would not corrupt anything —
    // but the doors are not, and an author grepping for an id should find one
    // answer rather than two in different files.
    const elsewhere = new Set(others.map((f) => f.id));
    for (const entry of [...OWN_WORK_FLOWS, ...OWN_WORK_DOORS]) {
      expect(elsewhere.has(entry.id), `${entry.id} already exists in another pack`).toBe(false);
    }
  });

  it("names only the two services we actually deliver ourselves", () => {
    const allowed = new Set(["cv-resume", "web-development"]);
    for (const entry of [...OWN_WORK_FLOWS, ...OWN_WORK_DOORS]) {
      expect(allowed.has(entry.service ?? ""), `${entry.id} names "${entry.service}"`).toBe(true);
    }
  });

  it("builds and lints clean as a subject pack", () => {
    const findings = lintFlow(pack, { requiresFallback: false });
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  /**
   * The property the whole walk-back-out path depends on.
   *
   * A pack carrying its own fallback would answer everything, including the
   * attestation question somebody asks after their CV question — `runTurn`
   * would report `matched`, and `serve.ts` would never hand the turn back to
   * the main flow. The visitor would be stuck in the CV pack for the rest of
   * the conversation with no error anywhere.
   */
  it("has no fallback of its own, so a miss can leave the pack", () => {
    expect(pack.nodes.some((n) => n.id === FALLBACK_NODE)).toBe(false);
    expect(pack.edges.some((e) => e.when.kind === "fallback")).toBe(false);

    const step = runTurn(
      packFlow,
      emptyState(),
      { message: "how do i attest my degree certificate from india" },
      { match: keywordMatcher },
    );
    expect(step.matched).toBe(false);
  });

  it("costs the main flow almost nothing", () => {
    // The point of the whole exercise. Two hundred and forty-two answers reach
    // visitors while the document every conversation loads grows by the four
    // doors and the boxes their two services need.
    const withoutDoors = buildAuthoredFlow(others);
    expect(mainDoc.nodes.length - withoutDoors.nodes.length).toBeLessThanOrEqual(10);
    expect(mainDoc.intents.length - withoutDoors.intents.length).toBe(OWN_WORK_DOORS.length);
  });

  it("leaves the merged flow inside the schema's caps", () => {
    // `buildAuthoredFlow` ends in `flowDoc.parse`, so exceeding a cap would
    // already have thrown above. Asserted as numbers so the failure reads as a
    // budget rather than as a zod dump, and so the headroom is visible.
    expect(mainDoc.nodes.length).toBeLessThanOrEqual(1750);
    expect(mainDoc.intents.length).toBeLessThanOrEqual(1750);
    expect(mainDoc.edges.length).toBeLessThanOrEqual(7000);
  });
});

describe("what the pack is allowed to say", () => {
  it("quotes no figure anywhere", () => {
    for (const entry of [...OWN_WORK_FLOWS, ...OWN_WORK_DOORS]) {
      expect(findUnsupportedAmounts(entry.answer, ""), `${entry.id} quotes a figure`).toEqual([]);
    }
  });

  it("states no bare rate or percentage", () => {
    for (const entry of OWN_WORK_FLOWS) {
      expect(/\d\s*(%|percent)/i.test(entry.answer), `${entry.id} states a rate`).toBe(false);
    }
  });

  /**
   * The one promise this pack is most tempted to make, because it is selling
   * our own work rather than describing somebody else's. A guaranteed interview
   * and a guaranteed search ranking are the two claims that would make every
   * other answer here worth less.
   */
  it("guarantees no outcome", () => {
    const promises = [
      /\bwe guarantee\b/i,
      /\bguaranteed (?:interview|ranking|result|position|placement)/i,
      /\byou will (?:get|rank|be hired)\b/i,
      /\bfirst page of google\b(?!.{0,80}(cannot|no one|nobody|not))/i,
    ];
    for (const entry of OWN_WORK_FLOWS) {
      for (const promise of promises) {
        expect(promise.test(entry.answer), `${entry.id} promises an outcome`).toBe(false);
      }
    }
  });

  /**
   * Regulated ground is named and handed on rather than settled here. Each of
   * these subjects has an authority that decides, and an answer that decides
   * for them is the kind of confident wrong answer `lib/chat/prompt.ts` exists
   * to prevent.
   */
  it("hands licensing and advertising decisions to the body that makes them", () => {
    const mustDefer: [string, RegExp][] = [
      ["own-cv-field-healthcare-licence", /DHA|DOH|MOHAP|authority|regulator/i],
      ["own-cv-field-engineering-registration", /Society of Engineers|municipality/i],
      ["own-web-shop-licence", /DED|free zone|licensing authority|authority/i],
      ["own-web-rules-regulated", /DHA|DOH|regulator|approval/i],
      ["own-web-rules-vat", /Federal Tax Authority|accountant/i],
      ["own-web-type-nonprofit", /permit|authority/i],
    ];
    for (const [id, expected] of mustDefer) {
      const entry = entryById.get(id);
      expect(entry, `${id} is missing`).toBeDefined();
      expect(expected.test(entry!.answer), `${id} does not name who decides`).toBe(true);
    }
  });

  it("refuses to put anything untrue on a CV", () => {
    for (const id of [
      "own-cv-limit-invented",
      "own-cv-limit-qualification",
      "own-cv-limit-hide-gap",
      "own-cv-limit-titles",
      "own-cv-reference-letters",
    ]) {
      const entry = entryById.get(id);
      expect(entry, `${id} is missing`).toBeDefined();
      expect(/^No[.,]|\bNo\.\s|\bwe will not\b|\bnot negotiable\b/i.test(entry!.answer)).toBe(true);
    }
  });
});

describe("matching inside the pack", () => {
  /**
   * The first of the three checks every pack before this one copied, and the
   * one that has found the most real holes: every way an author wrote a
   * question down has to reach that author's answer.
   *
   * Run against the pack alone, which here is also the real graph — the pack is
   * its own document, so there is nothing else in the room.
   */
  it("lands every authored phrasing on its own entry", () => {
    const misses: string[] = [];

    for (const entry of OWN_WORK_FLOWS) {
      for (const phrasing of [entry.question, ...entry.phrases]) {
        const got = landing(phrasing);
        if (got !== nodeOf(entry.id)) {
          misses.push(`${entry.id} ← "${phrasing}" landed on ${got ?? "nothing"}`);
        }
      }
    }

    expect(misses).toEqual([]);
  }, 30_000);

  /**
   * `sameWord` folds any two words sharing five leading characters, so a group
   * pairing two of them asks for one word twice: the weight goes up and the
   * discrimination does not. Fifteen such pairs existed in one pack's first
   * draft, and none of them is visible by reading.
   */
  it("never asks for the same word twice in one keyword group", () => {
    const doubled: string[] = [];

    for (const entry of [...OWN_WORK_FLOWS, ...OWN_WORK_DOORS]) {
      for (const group of entry.keywords ?? []) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            if (sameWord(group[i], group[j])) {
              doubled.push(`${entry.id}: "${group[i]}" and "${group[j]}" are one word`);
            }
          }
        }
      }
    }

    expect(doubled).toEqual([]);
  });

  /**
   * A hub is a menu and sorts ahead of everything, so at three words it beats
   * the specific answers outright — a hub group once intercepted "what is the
   * price of a notarised affidavit". At two it loses to anything more specific,
   * which makes a hub the answer to a vague message and never an interception.
   */
  it("holds every hub to two-word groups", () => {
    for (const entry of OWN_WORK_FLOWS.filter(isHub)) {
      for (const group of entry.keywords ?? []) {
        expect(group.length, `${entry.id} has a ${group.length}-word group`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("offers no chip or button that points nowhere", () => {
    const known = new Set(OWN_WORK_FLOWS.map((f) => f.id));
    for (const entry of OWN_WORK_FLOWS) {
      for (const target of entry.next ?? []) {
        expect(known.has(target), `${entry.id} offers unknown follow-up ${target}`).toBe(true);
      }
      for (const choice of entry.choices ?? []) {
        expect(known.has(choice.to), `${entry.id} offers unknown choice ${choice.to}`).toBe(true);
      }
    }
  });
});

describe("the doors, against the graph a visitor actually meets", () => {
  it("opens the subject the seeder publishes", () => {
    for (const door of OWN_WORK_DOORS) {
      expect(door.opens).toBe(OWN_WORK);
    }
    expect(OWN_WORK).toBe("own-work");
  });

  /**
   * The gap that cost a paid model call per question and failed silently.
   *
   * A door's phrases get a visitor *into* the pack. They are not phrases of
   * anything inside it, so a message that matched the door could match nothing
   * behind it — and then `serve.ts` walks back out to the main flow's
   * fallback, which is the model. Measured before this test existed: 51 of
   * own-work's 88 door phrasings, including "will you write my cv for me",
   * which is the most obvious question the site is asked.
   *
   * Worse, the first version of that walk-back-out looped: the main flow
   * matched the same door, which loaded the same pack, for ever. The request
   * never returned. `deps.entered` in ./serve.ts is the guard; this is the
   * check that the guard almost never has to fire.
   */
  it("answers every one of its door's phrasings from inside the pack", () => {
    const unanswered: string[] = [];

    for (const door of OWN_WORK_DOORS) {
      for (const phrasing of [door.question, ...door.phrases]) {
        const step = runTurn(packFlow, emptyState(), { message: phrasing }, { match: keywordMatcher });
        if (!step.matched) unanswered.push(`${door.id}: "${phrasing}" reaches the model`);
      }
    }

    expect(unanswered).toEqual([]);
  }, 30_000);

  /**
   * A door's phrases are the only route to the pack behind it. A phrasing that
   * misses reaches the model instead, in prose, at a cost — and nothing reports
   * it, which is why this is asserted rather than reviewed.
   */
  it("reaches a door from every phrasing written on one", () => {
    const misses: string[] = [];

    for (const door of OWN_WORK_DOORS) {
      for (const phrasing of [door.question, ...door.phrases]) {
        const got = landing(phrasing, mainFlow);
        if (got !== nodeOf(door.id)) {
          misses.push(`${door.id} ← "${phrasing}" landed on ${got ?? "nothing"}`);
        }
      }
    }

    expect(misses).toEqual([]);
  }, 30_000);

  /**
   * The reverse walk, and the check that caught three duplicate answers when
   * the relocation pack was written. Adding four intents to a flow of 1,581 can
   * make an existing entry unreachable, and the loser fails silently.
   */
  it("steals nothing from the nine packs it was added to", () => {
    const withoutDoors = indexFlow(buildAuthoredFlow(others));
    const stolen: string[] = [];

    for (const entry of others) {
      for (const phrasing of [entry.question, ...entry.phrases]) {
        const before = landing(phrasing, withoutDoors);
        const after = landing(phrasing, mainFlow);
        if (before !== after && DOOR_NODES.has(after ?? "")) {
          stolen.push(`"${phrasing}" moved from ${before ?? "nothing"} to ${after}`);
        }
      }
    }

    expect(stolen).toEqual([]);
  }, 60_000);

  /**
   * The boundary with job search, from the side that matters most.
   *
   * Those are advice questions and that pack answers them well. A door that
   * caught them would send somebody asking how long a Gulf CV should be into a
   * sales conversation, which is both worse for them and worse for us.
   */
  it("leaves CV advice with the pack that already answers it", () => {
    const advice = [
      "what format should a uae cv be in",
      "how long should my cv be",
      "should i put a photo on my cv",
      "how do i get my cv past the screening software",
      "how do i explain a gap on my cv",
      "does anyone here read cover letters",
      "what should my linkedin headline say",
      "should i send my cv as a pdf or a word file",
    ];

    for (const message of advice) {
      const got = landing(message, mainFlow);
      expect(DOOR_NODES.has(got ?? ""), `"${message}" was taken by a door`).toBe(false);
    }
  });

  /** And from the other side: commissioning the work has to reach us. */
  it("takes the question job search does not answer", () => {
    const commissioning = [
      "will you write my cv for me",
      "can you rewrite my resume",
      "i want someone to write my cv",
      "can you build me a website",
      "i need a website for my company",
      "can you redesign my website",
    ];

    for (const message of commissioning) {
      const got = landing(message, mainFlow);
      expect(DOOR_NODES.has(got ?? ""), `"${message}" did not reach a door`).toBe(true);
    }
  });
});

describe("money reaches a person, through two documents", () => {
  it("walks every quote entry into a callback without a model call", () => {
    for (const entry of OWN_WORK_FLOWS.filter((f) => f.quote)) {
      const step = runTurn(
        packFlow,
        emptyState(),
        { message: "", targetNodeId: nodeOf(entry.id) },
        { match: keywordMatcher },
      );
      expect(step.usedModel, `${entry.id} cost a model call`).toBe(false);
      // Without a qualifier the `qualify` box steps straight through to the
      // handoff, which is the callback. With one it asks its first question in
      // the same turn; either way the walk has left prose behind.
      const landed = step.effects.some((e) => e.kind === "handoff" || e.kind === "ask");
      expect(landed, `${entry.id} stopped at prose`).toBe(true);
    }
  });

  /**
   * Generated rather than curated, because the curated version passed while
   * twenty-four generated variants failed. Every price stem crossed with every
   * subject these two services could be asked to price, walked through both
   * stages exactly as `serve.ts` performs them.
   */
  it("routes a generated matrix of price questions to a callback", () => {
    const stems = [
      "how much for",
      "how much does it cost for",
      "what is the cost of",
      "what is the price of",
      "what are the fees for",
      "what are the charges for",
      "is there a cheaper option for",
    ];
    const subjects = [
      "a cv",
      "a resume",
      "cv writing",
      "resume writing",
      "a website",
      "a business website",
      "web design",
      "an ecommerce website",
      "seo",
    ];

    const failures: string[] = [];
    for (const stem of stems) {
      for (const subject of subjects) {
        const message = `${stem} ${subject}`;
        const { nodeId, usedModel } = twoStage(message);
        const entry = OWN_WORK_FLOWS.find((f) => nodeOf(f.id) === nodeId);
        // Landing on another pack's money entry would be a pass too — that ends
        // at a callback as well — but reaching the model is not, because the
        // model would then answer a price question in prose.
        if (usedModel || nodeId === FALLBACK_NODE) {
          failures.push(`"${message}" reached the model`);
        } else if (entry && !entry.quote && !isHub(entry)) {
          failures.push(`"${message}" was answered in prose by ${entry.id}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 30_000);

  /**
   * The phrasings nobody lists. A price question no entry claims falls through
   * to the model and gets answered in prose, which is the exact failure the
   * `quote` mechanism exists to prevent.
   */
  it("catches colloquial price phrasings as well as the written ones", () => {
    const colloquial = [
      "give me an estimate for a cv",
      "is your cv service expensive",
      "how much am i looking at for a website",
      "what would a website set me back",
      "whats the damage for a resume rewrite",
      "ballpark for a business website",
    ];

    for (const message of colloquial) {
      const { nodeId, usedModel } = twoStage(message);
      expect(usedModel, `"${message}" cost a model call`).toBe(false);
      expect(nodeId, `"${message}" reached the model`).not.toBe(FALLBACK_NODE);
    }
  });
});
