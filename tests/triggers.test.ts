import { describe, expect, it } from "vitest";
import { anyKeywordMatches, triggersMatch } from "@/lib/chat/matching";
import { tokenize } from "@/lib/text";

/**
 * Exact triggers.
 *
 * The opposite of the scored matcher next door: nothing is weighed, nothing is
 * compared against a runner-up. Every word of a group must be present, and then
 * that is the answer. Someone wrote the group meaning "when they ask this, say
 * that", and the job here is to honour it literally.
 */

const fires = (groups: string[][], text: string) => triggersMatch(groups, tokenize(text));

describe("all words, not some", () => {
  const groups = [["visa", "cost"]];

  it("fires when every word is there", () => {
    expect(fires(groups, "what does a visa cost")).toBe(true);
  });

  it("does not fire on a partial match", () => {
    // The whole reason for this feature over the scored matcher.
    expect(fires(groups, "how long does a visa take")).toBe(false);
    expect(fires(groups, "what does attestation cost")).toBe(false);
  });

  it("ignores word order and anything else in the sentence", () => {
    expect(fires(groups, "hi, roughly what is the cost of a UAE visa these days?")).toBe(true);
  });
});

describe("several groups", () => {
  const groups = [
    ["visa", "cost"],
    ["visa", "price"],
    ["visa", "fee"],
  ];

  it("fires when any one group is complete", () => {
    expect(fires(groups, "visa price please")).toBe(true);
    expect(fires(groups, "what is the visa fee")).toBe(true);
  });

  it("does not fire on words taken from different groups", () => {
    // "cost" and "price" without "visa" is not any group.
    expect(fires(groups, "cost and price")).toBe(false);
  });
});

describe("matching the way people type", () => {
  it("accepts an inflection of the keyword", () => {
    // A trigger written as "attestation" has to fire on "attest", or these
    // would almost never fire and nobody would notice.
    expect(fires([["attestation", "cost"]], "how much does it cost to attest a degree")).toBe(true);
  });

  it("keeps words that are merely similar apart", () => {
    expect(fires([["visa", "cost"]], "what does a visit cost")).toBe(false);
  });

  it("matches a multi-word keyword as all of its words", () => {
    expect(fires([["golden visa", "cost"]], "what does the golden visa cost")).toBe(true);
    expect(fires([["golden visa", "cost"]], "what does a visa cost")).toBe(false);
  });
});

describe("refusing to fire on nothing", () => {
  it("ignores an empty group, which would otherwise match everything", () => {
    expect(fires([[]], "anything at all")).toBe(false);
    expect(fires([[], ["visa", "cost"]], "unrelated sentence")).toBe(false);
  });

  it("does nothing when there are no groups or no words", () => {
    expect(fires([], "what does a visa cost")).toBe(false);
    expect(fires([["visa", "cost"]], "")).toBe(false);
    expect(fires([["visa", "cost"]], "!!! ???")).toBe(false);
  });
});

describe("partial typing", () => {
  const groups = [["visa", "cost"]];

  it("stays quiet until the last word arrives", () => {
    // This runs on every keystroke, so a half-typed question must not fire.
    expect(fires(groups, "what does a vi")).toBe(false);
    expect(fires(groups, "what does a visa")).toBe(false);
    expect(fires(groups, "what does a visa co")).toBe(false);
    expect(fires(groups, "what does a visa cost")).toBe(true);
  });
});

describe("a keyword with a space is a phrase", () => {
  // The whole reason this rule exists: both words being present somewhere says
  // nothing about whether the question is about the thing they name together.
  const groups = [["golden visa"]];

  it("fires when the words are adjacent", () => {
    expect(fires(groups, "how much is a golden visa")).toBe(true);
    expect(fires(groups, "golden visa cost please")).toBe(true);
  });

  it("does not fire when the words are merely both present", () => {
    expect(fires(groups, "is my visa golden or blue")).toBe(false);
    expect(fires(groups, "golden retriever visa")).toBe(false);
  });

  it("ignores punctuation between the words", () => {
    expect(fires(groups, "the golden-visa route")).toBe(true);
  });

  it("still matches the way people inflect words", () => {
    expect(fires([["legal translation"]], "i need a legal translator")).toBe(true);
  });
});

describe("the ANY category", () => {
  const any = (keywords: string[], text: string) => anyKeywordMatches(keywords, tokenize(text));
  const keywords = ["golden visa", "emirates id", "residence permit"];

  it("fires on any single keyword", () => {
    expect(any(keywords, "how do I renew my emirates id")).toBe(true);
    expect(any(keywords, "tell me about the golden visa")).toBe(true);
    expect(any(keywords, "residence permit question")).toBe(true);
  });

  it("does not fire when none of them appear", () => {
    expect(any(keywords, "how much does attestation cost")).toBe(false);
    // "visa" alone is not "golden visa" — the phrase rule applies here too.
    expect(any(keywords, "i need a visa")).toBe(false);
  });

  it("is empty-safe at both ends", () => {
    expect(any([], "anything at all")).toBe(false);
    expect(any(keywords, "")).toBe(false);
    // A blank line in the admin textarea must not become a keyword that
    // matches everything.
    expect(any(["", "   "], "anything at all")).toBe(false);
  });
});
