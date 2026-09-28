import { describe, expect, it } from "vitest";
import { triggersMatch } from "@/lib/chat/matching";
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
