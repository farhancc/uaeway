import { describe, expect, it } from "vitest";
import { UAE_LIFE_FLOWS } from "@/scripts/seed-data/uae-life-flows";
import { TRIAGE_FLOWS } from "@/scripts/seed-data/triage-flows";
import {
  TRIAGE,
  TRIAGE_DOORS,
  UAE_LIFE,
  UAE_LIFE_DOORS,
} from "@/scripts/seed-data/uae-life-doors";
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
 * The two packs for people who are already here.
 *
 * Both sit against a pack that is already very good at the question next door
 * — `uae-life` against relocation's 203 entries on the first six months,
 * `triage` against translation's "what the words mean" section and
 * attestation's price catch-alls — and in both cases a door that reaches too
 * far breaks the neighbour **silently**: the neighbour's entry simply stops
 * being reachable and nothing fails.
 *
 * So the weight of this file is on the six doors rather than on the 211
 * entries behind them. Inside a subject document the only competition is other
 * entries in the same document, which is the property the whole subgraph was
 * built for; at the doors, the competition is 1,584 intents.
 */

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
  ["OWN_WORK_DOORS", () => import("@/scripts/seed-data/own-work-doors")],
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

const NEW_DOORS = [...UAE_LIFE_DOORS, ...TRIAGE_DOORS];
const mainFlow = indexFlow(buildAuthoredFlow([...others, ...NEW_DOORS]));
const withoutNewDoors = indexFlow(buildAuthoredFlow(others));

const PACKS = [
  { subject: UAE_LIFE, prefix: "life-", flows: UAE_LIFE_FLOWS, doors: UAE_LIFE_DOORS },
  { subject: TRIAGE, prefix: "pick-", flows: TRIAGE_FLOWS, doors: TRIAGE_DOORS },
] as const;

const nodeOf = (id: string) => `n-${id}`;
const DOOR_NODES = new Set(NEW_DOORS.map((d) => nodeOf(d.id)));

const landing = (message: string, index = mainFlow): string | undefined => {
  const step = runTurn(index, emptyState(), { message }, { match: keywordMatcher });
  return step.effects.find((e) => e.kind === "say" || e.kind === "ask" || e.kind === "subject")
    ?.nodeId;
};

describe.each(PACKS)("the $subject pack", ({ subject, prefix, flows, doors }) => {
  const pack = buildSubjectPack(flows);
  const packFlow = indexFlow(pack);
  const isHub = (entry: AuthoredFlow) => entry.id.startsWith(`${prefix}hub-`);

  it("keeps every id inside its own namespace", () => {
    for (const entry of [...flows, ...doors]) {
      expect(entry.id.startsWith(prefix), `${entry.id} is outside ${prefix}`).toBe(true);
    }
  });

  it("collides with no id in any other pack", () => {
    const elsewhere = new Set(others.map((f) => f.id));
    for (const entry of [...flows, ...doors]) {
      expect(elsewhere.has(entry.id), `${entry.id} already exists elsewhere`).toBe(false);
    }
  });

  it("opens the subject the seeder publishes", () => {
    for (const door of doors) expect(door.opens).toBe(subject);
  });

  it("builds and lints clean as a subject pack", () => {
    const findings = lintFlow(pack, { requiresFallback: false });
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  /**
   * Without this the conversation cannot leave. A pack carrying its own
   * fallback always reports `matched`, so `serve.ts` never hands the turn back
   * to the main flow and a visitor who changes the subject is stuck.
   */
  it("has no fallback of its own, so a miss can leave the pack", () => {
    expect(pack.nodes.some((n) => n.id === FALLBACK_NODE)).toBe(false);

    const step = runTurn(
      packFlow,
      emptyState(),
      { message: "how do i write a cv for a nursing job in dubai" },
      { match: keywordMatcher },
    );
    expect(step.matched).toBe(false);
  });

  it("lands every authored phrasing on its own entry", () => {
    const misses: string[] = [];

    for (const entry of flows) {
      for (const phrasing of [entry.question, ...entry.phrases]) {
        const got = landing(phrasing, packFlow);
        if (got !== nodeOf(entry.id)) {
          misses.push(`${entry.id} ← "${phrasing}" landed on ${got ?? "nothing"}`);
        }
      }
    }

    expect(misses).toEqual([]);
  }, 30_000);

  it("never asks for the same word twice in one keyword group", () => {
    const doubled: string[] = [];
    for (const entry of [...flows, ...doors]) {
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

  it("holds every hub to two-word groups", () => {
    for (const entry of flows.filter(isHub)) {
      for (const group of entry.keywords ?? []) {
        expect(group.length, `${entry.id} has a ${group.length}-word group`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("offers no chip or button that points nowhere", () => {
    const known = new Set(flows.map((f) => f.id));
    for (const entry of flows) {
      for (const target of entry.next ?? []) {
        expect(known.has(target), `${entry.id} offers unknown follow-up ${target}`).toBe(true);
      }
      for (const choice of entry.choices ?? []) {
        expect(known.has(choice.to), `${entry.id} offers unknown choice ${choice.to}`).toBe(true);
      }
    }
  });

  it("quotes no figure and states no rate", () => {
    for (const entry of [...flows, ...doors]) {
      expect(findUnsupportedAmounts(entry.answer, ""), `${entry.id} quotes a figure`).toEqual([]);
      expect(/\d\s*(%|percent)/i.test(entry.answer), `${entry.id} states a rate`).toBe(false);
    }
  });

  it("walks every money question into a callback without a model call", () => {
    for (const entry of flows.filter((f) => f.quote)) {
      const step = runTurn(
        packFlow,
        emptyState(),
        { message: "", targetNodeId: nodeOf(entry.id) },
        { match: keywordMatcher },
      );
      expect(step.usedModel, `${entry.id} cost a model call`).toBe(false);
      expect(
        step.effects.some((e) => e.kind === "handoff" || e.kind === "ask"),
        `${entry.id} stopped at prose`,
      ).toBe(true);
    }
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

    for (const door of doors) {
      for (const phrasing of [door.question, ...door.phrases]) {
        const step = runTurn(packFlow, emptyState(), { message: phrasing }, { match: keywordMatcher });
        if (!step.matched) unanswered.push(`${door.id}: "${phrasing}" reaches the model`);
      }
    }

    expect(unanswered).toEqual([]);
  }, 30_000);

  it("reaches its door from every phrasing written on one", () => {
    const misses: string[] = [];
    for (const door of doors) {
      for (const phrasing of [door.question, ...door.phrases]) {
        const got = landing(phrasing);
        if (!DOOR_NODES.has(got ?? "")) {
          misses.push(`${door.id} ← "${phrasing}" landed on ${got ?? "nothing"}`);
        }
      }
    }
    expect(misses).toEqual([]);
  }, 30_000);
});

describe("what the doors must not take", () => {
  /**
   * The reverse walk. Six intents added to a flow of 1,584 can make an
   * existing entry unreachable, and the loser fails silently — this is the
   * check that caught three duplicate answers when relocation was written.
   */
  it("steals nothing from the nine packs already in the flow", () => {
    const stolen: string[] = [];

    for (const entry of others) {
      for (const phrasing of [entry.question, ...entry.phrases]) {
        const before = landing(phrasing, withoutNewDoors);
        const after = landing(phrasing, mainFlow);
        if (before !== after && DOOR_NODES.has(after ?? "")) {
          stolen.push(`${entry.id}: "${phrasing}" moved from ${before ?? "nothing"} to ${after}`);
        }
      }
    }

    expect(stolen).toEqual([]);
  }, 90_000);

  /**
   * Relocation gets its own assertion as well as being inside the sweep above,
   * because it is the pack this border runs along and the one whose loss would
   * be hardest to notice: both packs answer a resident, and only the timing
   * tells them apart.
   */
  it("leaves the arrival vocabulary with the relocation pack", () => {
    const arriving = [
      "i am moving to the uae for a job",
      "what should i organise at home before i fly out",
      "what happens when i land in the uae to start my job",
      "how do i open a bank account here",
      "how many cheques is rent usually paid in",
      "when does the medical test happen",
      "what do i do while my passport is with the pro",
      "how do i find somewhere to live in dubai",
      "can i bring my family with me straight away",
      "what is ejari and do i need it",
    ];

    for (const message of arriving) {
      const got = landing(message);
      expect(DOOR_NODES.has(got ?? ""), `"${message}" was taken by a door`).toBe(false);
    }
  });

  /** And the other border: the words triage must not take from the packs that
   *  answer the subject properly once it is identified. */
  it("leaves the how-to questions with the packs that own them", () => {
    const howTo = [
      "how do i attest my degree certificate from india",
      "how long does mofa attestation take",
      "who can translate my documents into arabic",
      "what documents do i need for a family visa",
      "how do i get a power of attorney notarised in dubai",
    ];

    for (const message of howTo) {
      const got = landing(message);
      expect(DOOR_NODES.has(got ?? ""), `"${message}" was taken by a door`).toBe(false);
    }
  });

  it("costs the main flow only its doors", () => {
    const before = buildAuthoredFlow(others);
    const after = buildAuthoredFlow([...others, ...NEW_DOORS]);
    expect(after.intents.length - before.intents.length).toBe(NEW_DOORS.length);
    expect(after.nodes.length - before.nodes.length).toBeLessThanOrEqual(NEW_DOORS.length + 4);
    expect(after.nodes.length).toBeLessThanOrEqual(1750);
    expect(after.edges.length).toBeLessThanOrEqual(7000);
  });

  it("adds two hundred answers for six intents", () => {
    // The whole point of the subgraph, stated as a number so a later merge
    // back into the main flow fails this rather than passing quietly.
    const behind = UAE_LIFE_FLOWS.length + TRIAGE_FLOWS.length;
    expect(behind).toBeGreaterThanOrEqual(200);
    expect(NEW_DOORS.length).toBeLessThanOrEqual(8);
  });
});
