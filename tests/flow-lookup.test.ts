import { describe, expect, it } from "vitest";
import { matchByPhrase, normalizeQuestion, phraseHit } from "@/lib/chat/flow/lookup";

/**
 * "Has someone already written this question down?"
 *
 * The first thing asked of any typed message and the cheapest, and the one
 * answer nothing below is allowed to overrule — not a similarity score, not a
 * disambiguation call, and certainly not a model. It runs in the browser as the
 * visitor types and again on the server when they send, which is why it lives
 * where both can import it.
 */

const intents = [
  {
    id: "cost",
    name: "How much does attestation cost?",
    phrases: ["what does attestation cost", "attestation fees"],
  },
  {
    id: "photocopy",
    name: "Can you attest a photocopy?",
    phrases: ["is a copy enough", "do you need the original"],
  },
  { id: "visa", name: "visa", phrases: ["visa"] },
];

describe("normalising a question", () => {
  it("makes punctuation and case stop mattering", () => {
    expect(normalizeQuestion("How much does attestation COST?")).toBe(
      normalizeQuestion("how much does attestation cost"),
    );
  });

  it("collapses the spacing people type", () => {
    expect(normalizeQuestion("  how   much  ")).toBe("how much");
  });
});

describe("recognising a question someone wrote down", () => {
  it("matches the intent's own name", () => {
    expect(matchByPhrase("How much does attestation cost?", intents)).toBe("cost");
  });

  it("matches any of the ways people ask it", () => {
    expect(matchByPhrase("attestation fees", intents)).toBe("cost");
    expect(matchByPhrase("do you need the original", intents)).toBe("photocopy");
  });

  it("finds a phrase inside a longer message", () => {
    expect(matchByPhrase("hi there, what does attestation cost these days?", intents)).toBe("cost");
  });

  // The whole point of matching on runs rather than on words: "attest my
  // degrees" is the same request as "attest my degree".
  it("is not defeated by an inflection", () => {
    expect(matchByPhrase("do you need the originals", intents)).toBe("photocopy");
  });

  // A single common word appearing somewhere says almost nothing about what is
  // being asked, and would let it outrank everything below.
  it("refuses to match a short phrase buried in a sentence", () => {
    expect(matchByPhrase("my friend had a visa problem last year in Dubai", intents)).toBeNull();
    expect(matchByPhrase("visa", intents)).toBe("visa");
  });

  // A message that *is* one intent's question must not lose to another that
  // happens to contain it.
  it("prefers an exact question over one merely containing it", () => {
    const shadowed = [
      { id: "long", name: "tell me what does attestation cost and how long it takes", phrases: [] },
      ...intents,
    ];
    expect(matchByPhrase("what does attestation cost", shadowed)).toBe("cost");
  });

  it("says nothing when nobody wrote this down", () => {
    expect(matchByPhrase("do you sell camels", intents)).toBeNull();
    expect(matchByPhrase("   ", intents)).toBeNull();
  });
});

describe("the check that runs as someone types", () => {
  it("is the same rule, so the hint and the answer agree", () => {
    const phrases = [intents[0].name, ...intents[0].phrases];
    expect(phraseHit("How much does attestation cost?", phrases)).toBe(true);
    expect(phraseHit("what does attestation cost", phrases)).toBe(true);
    expect(phraseHit("how much", phrases)).toBe(false);
  });

  it("stays quiet on an empty box", () => {
    expect(phraseHit("", ["anything"])).toBe(false);
  });
});
