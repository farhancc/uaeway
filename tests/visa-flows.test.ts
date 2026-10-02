import { describe, expect, it } from "vitest";

import { VISA_FLOWS } from "@/scripts/seed-data/visa-flows";
import { ATTESTATION_FLOWS } from "@/scripts/seed-data/attestation-flows";
import { NOTARISATION_FLOWS } from "@/scripts/seed-data/notarisation";
import { BUSINESS_SETUP_FLOWS } from "@/scripts/seed-data/business-setup-flows";
import { buildAuthoredFlow, qualifyNodeId } from "@/lib/chat/flow/authored";
import { lintFlow, publishable } from "@/lib/chat/flow/lint";
import { indexFlow } from "@/lib/chat/flow/schema";
import { keywordMatcher } from "@/lib/chat/flow/intents";
import { matchByPhrase } from "@/lib/chat/flow/lookup";
import { emptyState, runTurn } from "@/lib/chat/flow/run";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * The visa pack, and the four properties that are load-bearing.
 *
 * Two hundred-odd answers nobody reads end to end, on the subject where being
 * confidently wrong costs a visitor the most. None of these is visible by
 * reading one entry:
 *
 *   - **No figure is ever quoted.** UAE government fees, processing times,
 *     grace periods, age limits and salary thresholds have all moved recently,
 *     and a number published under the company's name is one a visitor budgeted
 *     on. There is no model in the loop to hedge a written sentence.
 *   - **A money question reaches a person, not prose.** That holds only while
 *     the money vocabulary belongs exclusively to the `quote` entries — the day
 *     an ordinary answer's phrases pick up "what does it cost", `matchByPhrase`
 *     starts answering price questions with an FAQ instead of routing them.
 *   - **Nothing here competes with the other three packs.** All four are
 *     concatenated before the graph is built and `matchByPhrase` takes the first
 *     candidate whose phrase appears in the message, so a phrasing already
 *     claimed by `att-`, `not-` or `biz-` silently makes our answer unreachable
 *     — with no error anywhere. That one needs the *merged* set to catch, which
 *     is why this file imports all four.
 *   - **No money question reaches the model.** A colloquial price phrasing that
 *     no entry claims falls through to `fallback-model`, which means paying a
 *     model to answer a fee question in prose. The last describe block runs the
 *     phrasings nobody would think to list.
 */

const doc = buildAuthoredFlow(VISA_FLOWS);
const index = indexFlow(doc);
const nodeOf = (id: string) => `n-${id}`;
const intentOf = (id: string) => `i-${id}`;

const quotes = VISA_FLOWS.filter((f) => f.quote);
const prose = VISA_FLOWS.filter((f) => !f.quote);

describe("the pack", () => {
  it("is the two hundred plus flows that were asked for", () => {
    expect(VISA_FLOWS.length).toBeGreaterThanOrEqual(200);
  });

  it("keeps every id inside the visa- namespace the other authors agreed", () => {
    // `att-`, `doc-`, `cty-`, `use-`, `price-`, `meta-`, `not-` and `biz-` belong
    // to the other content modules concatenated with this one before the graph is
    // built. A collision there is a silently overwritten answer.
    expect(VISA_FLOWS.filter((f) => !f.id.startsWith("visa-")).map((f) => f.id)).toEqual([]);
  });

  it("has no duplicate ids", () => {
    const ids = VISA_FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches every entry to the visa processing service", () => {
    expect(VISA_FLOWS.filter((f) => f.service !== "visa-processing").map((f) => f.id)).toEqual([]);
  });

  it("points every follow-up and every button at an entry that exists", () => {
    const known = new Set(VISA_FLOWS.map((f) => f.id));
    const dangling = VISA_FLOWS.flatMap((f) => [
      ...(f.next ?? []).filter((id) => !known.has(id)).map((id) => `${f.id} next → ${id}`),
      ...(f.choices ?? []).filter((c) => !known.has(c.to)).map((c) => `${f.id} choice → ${c.to}`),
    ]);
    expect(dangling).toEqual([]);
  });

  it("keeps chips to what the runtime will actually show", () => {
    // `suggestions` shows three. A fourth is invisible, which reads as an
    // author's decision having no effect.
    for (const f of VISA_FLOWS) expect((f.next ?? []).length, f.id).toBeLessThanOrEqual(3);
  });

  it("claims none of the four opening suggestions", () => {
    // Attestation has three and notarisation one, which is all the widget shows.
    // An opener here would be a decision with no effect, or would displace one of
    // theirs depending on authored order.
    expect(VISA_FLOWS.filter((f) => f.opener).map((f) => f.id)).toEqual([]);
  });

  it("builds into a flow that would publish", () => {
    const findings = lintFlow(doc);
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(publishable(findings)).toBe(true);
  });

  it("leaves nothing stranded", () => {
    // Every entry is wired from `start`, so an unreachable node means the build
    // dropped one.
    expect(lintFlow(doc).filter((f) => f.message.includes("Nothing leads here"))).toEqual([]);
  });
});

/* ── What the answers are allowed to say ─────────────────────────────────── */

/**
 * Anything that reads as a sum of money, a rate or a hard duration.
 *
 * Deliberately not "any digit": "1 to 3 working days" is banned, but an answer
 * may still say "three things, in order". Shared in spirit with
 * tests/business-setup-flows.test.ts, because the rule is the site's rather than
 * one pack's.
 */
const FIGURES =
  /\b(aed|dhs?|dirhams?|usd|eur|gbp)\b|[$€£]|\d\s*(%|percent|per\s?cent)|\b\d[\d,.]*\s*(k|million|thousand)\b|\b\d[\d,.]*\s*(days?|weeks?|months?|years?|working\s+days?)\b/i;

describe("no answer quotes a figure", () => {
  it.each(VISA_FLOWS.map((f) => [f.id, f.answer] as const))("%s", (_id, answer) => {
    expect(answer).not.toMatch(FIGURES);
  });

  it("passes the guardrail the chatbot's own replies go through", () => {
    // lib/chat/prompt.ts forbids stating a fee whether a model wrote the
    // sentence or a person did.
    for (const f of VISA_FLOWS) {
      expect(findUnsupportedAmounts(f.answer, ""), `${f.id} quotes a figure`).toEqual([]);
    }
  });
});

describe("no answer oversteps what we are", () => {
  it("never claims we file, approve or perform the work ourselves", () => {
    // visa-processing is `delivery: "referred"` in lib/services.ts.
    const claims = /\bwe (file|submit|lodge|process|issue|approve|attest|legalise|legalize)\b/i;
    for (const f of VISA_FLOWS) {
      expect(claims.test(f.answer), `${f.id} claims we do it ourselves`).toBe(false);
    }
  });

  it("promises no outcome", () => {
    const promises = /\b(we guarantee|guaranteed approval|will definitely be (approved|accepted|issued))\b/i;
    for (const f of VISA_FLOWS) {
      expect(promises.test(f.answer), `${f.id} promises an outcome`).toBe(false);
    }
  });
});

/* ── Money vocabulary belongs to the routed entries ──────────────────────── */

/**
 * The words that mean "this is a money question".
 *
 * `matchByPhrase` and `matchByKeywords` both run before any embedding, so
 * whichever entry owns these words owns every price question asked in them.
 * They are reserved for the `quote` entries — and the check reads `question` as
 * well as `phrases`, because the question becomes the intent's *name* and
 * `matchByPhrase` iterates `[name, ...phrases]`.
 */
const MONEY =
  /\b(cost|costs|price|prices|pricing|fee|fees|quote|quotation|budget|cheapest|cheaper|expensive|afford|charge|charges|instalments?|refund(able)?)\b|\bhow much\b/i;

describe("money vocabulary belongs to the routed entries", () => {
  it("has enough routed entries to catch the ways people ask", () => {
    expect(quotes.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps money words out of every prose entry's question and phrases", () => {
    const leaked = prose.flatMap((f) =>
      [f.question, ...f.phrases].filter((p) => MONEY.test(p)).map((p) => `${f.id}: ${p}`),
    );
    expect(leaked).toEqual([]);
  });

  it("keeps money words out of every prose entry's keyword groups", () => {
    const leaked = prose.flatMap((f) =>
      (f.keywords ?? [])
        .filter((group) => group.some((word) => MONEY.test(word)))
        .map((group) => `${f.id}: ${group.join(" ")}`),
    );
    expect(leaked).toEqual([]);
  });

  it("names every money entry for the service rather than asking it bare", () => {
    // A bare "how much does it cost" would claim that phrasing across the whole
    // merged flow and walk an attestation visitor into the visa qualification.
    const bare = quotes.filter(
      (f) => !/\b(visa|residency|residence|sponsor|golden|emirates id|permit|medical|status|maid|domestic|insurance|typing|overstay)\b/i.test(f.question),
    );
    expect(bare.map((f) => f.question)).toEqual([]);
  });

  it("never gives a routed entry follow-ups it cannot reach", () => {
    // The builder skips `next` on a quote entry, so one written there is a
    // follow-up an author believes they offered and no visitor will ever see.
    expect(quotes.filter((f) => f.next?.length).map((f) => f.id)).toEqual([]);
  });

  it("walks every money question into the visa qualification", () => {
    for (const f of quotes) {
      const out = doc.edges.filter((e) => e.from === nodeOf(f.id));
      expect(out.map((e) => e.to), f.id).toEqual([qualifyNodeId("visa-processing")]);
      expect(out[0].when.kind).toBe("always");
    }
  });
});

/* ── Every question reaches its own answer ───────────────────────────────── */

describe("every authored phrasing reaches its own answer", () => {
  it("routes each entry's own question to itself", () => {
    for (const f of VISA_FLOWS) {
      expect(matchByPhrase(f.question, doc.intents), `"${f.question}"`).toBe(intentOf(f.id));
    }
  });

  it("routes every listed phrasing to the entry that listed it", () => {
    for (const f of VISA_FLOWS) {
      for (const phrase of f.phrases) {
        expect(matchByPhrase(phrase, doc.intents), `"${phrase}" on ${f.id}`).toBe(intentOf(f.id));
      }
    }
  });

  it("walks the real engine from a cold start to the right node", () => {
    // The keyword matcher is what answers on the days no embedding key is
    // usable, so it is the floor the pack has to work at.
    for (const f of VISA_FLOWS) {
      const step = runTurn(index, emptyState(), { message: f.question }, { match: keywordMatcher });
      const said = step.effects.find((e) => e.kind === "say" || e.kind === "ask");
      expect(said?.nodeId, `"${f.question}" landed on ${said?.nodeId}`).toBe(nodeOf(f.id));
    }
  });
});

/* ── The merged flow, which is the only one that ships ───────────────────── */

/**
 * The check that cannot be made from this pack alone.
 *
 * `scripts/seed-authored-flows.ts` concatenates every content module and builds
 * once, so the candidate list a visitor's first message is matched against is
 * all four packs in authored order. `matchByPhrase` takes the first candidate
 * whose phrase appears in the message, and this pack is appended last — so any
 * phrasing an earlier pack already claimed makes our answer dead, and nothing
 * reports it. 865 of our phrasings against 680 candidates, plus the reverse for
 * the other three packs' 2145 — a few seconds each, and worth every one of
 * them, so both carry an explicit timeout rather than racing the default.
 */
const merged = buildAuthoredFlow([
  ...ATTESTATION_FLOWS,
  ...NOTARISATION_FLOWS,
  ...BUSINESS_SETUP_FLOWS,
  ...VISA_FLOWS,
]);

describe("in the merged flow", () => {
  it("builds with the other three packs and would publish", () => {
    expect(lintFlow(merged).filter((f) => f.severity === "error")).toEqual([]);
  });

  it("fits the schema's limits with all four packs folded in", () => {
    // Not a claim about headroom — a fifth pack is being written. Asserted so
    // that the pack that pushes the merged document over the edge fails in a
    // test rather than as a raw zod error inside the seed script.
    expect(merged.nodes.length).toBeLessThanOrEqual(900);
    expect(merged.intents.length).toBeLessThanOrEqual(900);
    expect(merged.edges.length).toBeLessThanOrEqual(3500);
  });

  it("loses no visa phrasing to another pack", () => {
    const hijacked = VISA_FLOWS.flatMap((f) =>
      [f.question, ...f.phrases]
        .map((p) => ({ p, hit: matchByPhrase(p, merged.intents) }))
        .filter(({ hit }) => hit !== intentOf(f.id))
        .map(({ p, hit }) => `${f.id}: "${p}" → ${hit}`),
    );
    expect(hijacked).toEqual([]);
  }, 60_000);

  it("takes no phrasing away from another pack", () => {
    const others = [...ATTESTATION_FLOWS, ...NOTARISATION_FLOWS, ...BUSINESS_SETUP_FLOWS];
    const stolen = others.flatMap((f) =>
      [f.question, ...f.phrases]
        .map((p) => ({ p, hit: matchByPhrase(p, merged.intents) }))
        .filter(({ hit }) => hit !== intentOf(f.id) && hit?.startsWith("i-visa-"))
        .map(({ p, hit }) => `${f.id}: "${p}" → ${hit}`),
    );
    expect(stolen).toEqual([]);
  }, 60_000);
});

/* ── What actually happens when someone asks about money ─────────────────── */

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
    step.state.visited.includes(qualifyNodeId("visa-processing"))
  );
}

/**
 * These are visa-flavoured money phrasings, and the omissions are deliberate.
 *
 * A bare "can i get a quote" or "is it expensive" is a site-wide question. In
 * the merged flow those belong to the catch-all quote entries in the attestation
 * pack, and this pack does not compete for them: with no page context no service
 * is the right guess, and two packs claiming one bare phrase makes the winner an
 * accident of authored order. Everything below names a visa thing, which is what
 * makes it ours to answer.
 *
 * The colloquial half of this list is the point. A price phrasing nobody listed
 * falls through to `fallback-model` — a paid model call answering a fee question
 * in prose, which is the exact failure `quote` exists to prevent, and no other
 * test in this file would notice.
 */
describe("a money question reaches the callback form", () => {
  const asked = [
    "how much does a uae residence visa cost",
    "what is the price of a residence visa in dubai",
    "how much does a family visa cost in the uae",
    "what does it cost to sponsor my wife in dubai",
    "how much does it cost to sponsor my parents in the uae",
    "how much does a uae golden visa cost",
    "how much does a freelance permit and visa cost in the uae",
    "how much does the visa medical test cost",
    "how much does an emirates id cost",
    "how much does it cost to renew a uae residence visa",
    "how much is the overstay fine in the uae",
    "how much is health insurance for a uae residence visa",
    "what do typing centres charge for visa work",
    "what do you charge to help with a uae visa",
    "what is the cheapest way to get uae residency",
    "can i pay for my visa in instalments",
    "are visa fees refundable if my application is refused",
    "what are the hidden costs of a uae residence visa",
    "how much does a uae visit visa cost",
    // Colloquial, and listed by nobody until this test was written.
    "how much am i looking at for a residence visa",
    "give me an estimate for my uae visa",
    "is a uae residence visa expensive",
    "i have a limited budget for my uae visa",
    "another agent quoted me less for the same visa",
    "my company wants me to pay my visa fees",
    "is it cheaper to exit and re enter than change status",
  ];

  it.each(asked)("%s", (message) => {
    expect(reachedCallback(ask(message))).toBe(true);
  });

  it("says why there is no figure before it asks anything", () => {
    const step = ask("how much does a uae residence visa cost");
    const said = step.effects.find((e) => e.kind === "say");
    expect(said).toBeDefined();
    expect(said && "text" in said ? said.text : "").not.toMatch(FIGURES);
  });

  it("costs nothing — no money question reaches the model", () => {
    for (const message of asked) expect(ask(message).usedModel, message).toBe(false);
  });
});

describe("an ordinary question is still answered without a handoff", () => {
  const asked: [string, string][] = [
    ["what is a change of status and do i need to leave the country", "visa-status-change"],
    ["what does the uae visa medical test check for", "visa-medical-what-tested"],
    ["can i work while i am on a family visa", "visa-work-on-family-visa"],
    ["until what age can i keep my son on my visa", "visa-son-age-limit"],
    ["what is the difference between icp and gdrfa", "visa-icp-vs-gdrfa"],
    ["my employer is keeping my passport are they allowed to", "visa-employer-holding-passport"],
    ["an absconding case has been filed against me", "visa-absconding"],
    ["how long can i stay after my visa is cancelled", "visa-grace-period"],
  ];

  it.each(asked)("%s", (message, expected) => {
    const step = ask(message);
    const said = step.effects.find((e) => e.kind === "say");
    expect(said && "nodeId" in said ? said.nodeId : null).toBe(nodeOf(expected));
    expect(step.effects.some((e) => e.kind === "handoff")).toBe(false);
    expect(step.usedModel).toBe(false);
  });
});
