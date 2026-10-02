import { describe, expect, it } from "vitest";
import { similarity } from "@/lib/ai/embed";
import { buildSpace, project } from "@/lib/chat/flow/vectors";
import {
  ambiguousIntents,
  matchByEmbedding,
  rankIntents,
  semanticMatcher,
  SIMILARITY_FLOOR,
  SIMILARITY_MARGIN,
} from "@/lib/chat/flow/intents";
import type { Intent } from "@/lib/chat/flow/schema";

/**
 * Matching on meaning.
 *
 * Everything here is arithmetic over vectors handed in, so none of it calls an
 * API. The vectors are contrived; the gates they pass through are the real
 * ones, and those gates are what decide whether someone is told about the wrong
 * visa.
 */

const unit = (values: number[]): number[] => {
  const length = Math.sqrt(values.reduce((t, v) => t + v * v, 0));
  return values.map((v) => v / length);
};

const intent = (id: string, phrases: string[]): Intent => ({
  id,
  name: id,
  phrases,
  hintKeywords: [],
});

describe("similarity", () => {
  it("is 1 for the same direction and 0 for a right angle", () => {
    expect(similarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    expect(similarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it("is 0 rather than an error when the sizes disagree", () => {
    expect(similarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

/**
 * The measured problem this solves: scored raw, every phrase in this bank sat
 * between 0.84 and 0.97 of every other, because they are all short questions
 * about UAE paperwork and that shared direction dominates. No margin can
 * discriminate inside a band that narrow.
 */
describe("centring the space", () => {
  const raw = new Map([
    ["a", unit([1, 0.9, 0])],
    ["b", unit([1, 0.9, 0.1])],
    ["c", unit([1, 0.85, -0.1])],
  ]);

  it("pulls apart phrases that a shared direction had crowded together", () => {
    const before = similarity(raw.get("a")!, raw.get("b")!);
    const space = buildSpace(raw);
    const after = similarity(space.phrases.get("a")!, space.phrases.get("b")!);
    expect(before).toBeGreaterThan(0.99);
    expect(after).toBeLessThan(before);
  });

  it("keeps every phrase a unit vector, so a dot product is still a cosine", () => {
    for (const vector of buildSpace(raw).phrases.values()) {
      expect(Math.sqrt(vector.reduce((t, v) => t + v * v, 0))).toBeCloseTo(1);
    }
  });

  it("moves a query through the same mean", () => {
    const space = buildSpace(raw);
    const moved = project(space, unit([1, 0.9, 0]));
    expect(similarity(moved, space.phrases.get("a")!)).toBeCloseTo(1);
  });

  it("leaves an empty index alone rather than dividing by nothing", () => {
    const space = buildSpace(new Map());
    expect(space.centroid).toEqual([]);
    expect(project(space, [1, 0, 0])).toEqual([1, 0, 0]);
  });
});

describe("ranking", () => {
  const phrases = new Map([
    ["attest my degree", unit([1, 0, 0, 0])],
    ["translate my certificate", unit([0, 1, 0, 0])],
    ["cost of a visa", unit([0, 0, 1, 0])],
  ]);
  /** Nothing like any of them — the fourth axis exists so this can be written
   *  at all. */
  const unrelated = unit([0, 0, 0, 1]);
  const candidates = [
    intent("attestation", ["attest my degree"]),
    intent("translation", ["translate my certificate"]),
    intent("visa", ["cost of a visa"]),
  ];

  it("scores an intent as its closest phrasing, not its average", () => {
    const wide = [intent("attestation", ["attest my degree", "cost of a visa"])];
    expect(rankIntents(unit([1, 0, 0, 0]), wide, phrases)[0].score).toBeCloseTo(1);
  });

  // A phrase with no vector — published during an outage — must fall back to
  // its keywords rather than be ranked below things it should beat.
  it("leaves out an intent none of whose phrases are embedded", () => {
    const ranked = rankIntents(unit([1, 0, 0, 0]), [...candidates, intent("unembedded", ["nothing"])], phrases);
    expect(ranked.map((r) => r.id)).not.toContain("unembedded");
  });

  it("takes a clear winner", () => {
    expect(matchByEmbedding(unit([1, 0, 0, 0]), candidates, phrases)).toBe("attestation");
  });

  it("refuses to choose between two that score alike", () => {
    // Exactly between attestation and translation.
    expect(matchByEmbedding(unit([1, 1, 0, 0]), candidates, phrases)).toBeNull();
  });

  it("refuses anything below the floor", () => {
    expect(rankIntents(unrelated, [candidates[0]], phrases)[0].score).toBeLessThan(SIMILARITY_FLOOR);
    expect(matchByEmbedding(unrelated, [candidates[0]], phrases)).toBeNull();
  });

  describe("what JEV is handed", () => {
    it("is the candidates that could not be separated", () => {
      const ranked = rankIntents(unit([1, 1, 0, 0]), candidates, phrases);
      expect(ambiguousIntents(ranked).map((r) => r.id).sort()).toEqual(["attestation", "translation"]);
    });

    it("is nothing when one candidate clearly won", () => {
      expect(ambiguousIntents(rankIntents(unit([1, 0, 0, 0]), candidates, phrases))).toEqual([]);
    });

    it("is nothing when everything is a bad match", () => {
      expect(ambiguousIntents(rankIntents(unrelated, candidates, phrases))).toEqual([]);
    });
  });

  describe("the matcher the runtime uses", () => {
    const withKeywords = [
      { ...candidates[0], hintKeywords: [["attest"]] },
      candidates[1],
      candidates[2],
    ];

    // A group an author wrote is a decision about what a question means. No
    // similarity score should overrule it.
    it("lets an exact keyword beat the closest vector", () => {
      const match = semanticMatcher({ query: unit([0, 1, 0, 0]), phrases });
      expect(match("attest this", withKeywords)).toBe("attestation");
    });

    it("honours a decision JEV already made for this turn", () => {
      const match = semanticMatcher({ query: unit([1, 1, 0, 0]), phrases, decided: "translation" });
      expect(match("my papers need to be legal", candidates)).toBe("translation");
    });

    it("ignores a JEV decision where it is not a candidate", () => {
      const match = semanticMatcher({ query: unit([1, 0, 0, 0]), phrases, decided: "translation" });
      expect(match("attest my degree", [candidates[0]])).toBe("attestation");
    });

    // The embedding call failing must not stop the chatbot matching — this is
    // what answered every question before phase two.
    it("falls back to keywords when the message could not be embedded", () => {
      const match = semanticMatcher({ query: null, phrases });
      expect(match("attest this", withKeywords)).toBe("attestation");
    });

    it("says nothing when there is nothing to choose from", () => {
      expect(semanticMatcher({ query: unit([1, 0, 0, 0]), phrases })("anything", [])).toBeNull();
    });
  });
});

describe("the gates are set where they were measured", () => {
  // Guards the calibration: these came from scripts/calibrate-thresholds.ts
  // against held-out phrasings, and moving them without re-running it is how a
  // chatbot quietly starts answering the wrong question.
  it("keeps the floor and margin at the calibrated values", () => {
    expect(SIMILARITY_FLOOR).toBeCloseTo(0.4);
    expect(SIMILARITY_MARGIN).toBeCloseTo(0.1);
  });
});
