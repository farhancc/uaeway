import { describe, expect, it } from "vitest";
import { foldText, phraseRun, sameWord, tokenize } from "@/lib/text";
import { matchByPhrase, normalizeQuestion, phraseHit } from "@/lib/chat/flow/lookup";

/**
 * Matching in scripts other than Latin.
 *
 * This file exists because the failure was silent. `tokenize` split on
 * `[^a-z0-9]`, so every Arabic, Hindi, Urdu and Malayalam message came out as
 * an empty array — phrase lookup found nothing, keyword groups fired never, the
 * hint while typing stayed blank, and not one of them reported an error. The
 * bot would simply have been mute in those languages.
 */

/** The site's own Arabic, from `lib/services.ts`. */
const ATTESTATION_AR = "تصديق الشهادات";
const TRANSLATION_AR = "ترجمة قانونية معتمدة";

describe("words come out whole, whatever the script", () => {
  it("reads Arabic", () => {
    expect(tokenize(ATTESTATION_AR)).toEqual(["تصديق", "الشهادات"]);
    expect(tokenize("كم تكلفة تصديق الشهادة؟")).toEqual(["كم", "تكلفة", "تصديق", "الشهادة"]);
  });

  // The second bug, and a subtler one: `\p{L}` does not match combining marks,
  // and in these scripts the matras and the virama *are* half the word. Splitting
  // on them tore one word into five.
  it("reads Devanagari without tearing words at their vowel marks", () => {
    expect(tokenize("प्रमाणपत्र सत्यापन")).toEqual(["प्रमाणपत्र", "सत्यापन"]);
  });

  it("reads Malayalam", () => {
    expect(tokenize("സർട്ടിഫിക്കറ്റ് അറ്റസ്റ്റേഷൻ")).toEqual([
      "സർട്ടിഫിക്കറ്റ്",
      "അറ്റസ്റ്റേഷൻ",
    ]);
  });

  it("reads Urdu", () => {
    expect(tokenize("ویزا کی قیمت کیا ہے؟")).toEqual(["ویزا", "کی", "قیمت", "کیا", "ہے"]);
  });

  it("still reads English exactly as it did", () => {
    expect(tokenize("How much does attestation cost?")).toEqual([
      "how",
      "much",
      "does",
      "attestation",
      "cost",
    ]);
    expect(tokenize("golden-visa, please!")).toEqual(["golden", "visa", "please"]);
  });

  it("keeps digits in any numbering", () => {
    expect(tokenize("971501234567")).toEqual(["971501234567"]);
  });
});

describe("two spellings of one word", () => {
  // The same word can arrive composed or decomposed depending on the keyboard,
  // and two spellings of one string are two strings to every comparison.
  it("are one word once composed", () => {
    expect(tokenize("café")).toEqual(tokenize("café"));
  });

  // Optional in writing and almost never typed, so a question written with them
  // must match the same question written without.
  it("ignores Arabic short vowels and tatweel", () => {
    expect(tokenize("الشَّهادات")).toEqual(tokenize("الشهادات"));
    expect(foldText("شـــهادة")).toBe(foldText("شهادة"));
  });
});

describe("finding an Arabic question", () => {
  const intents = [
    { id: "attest", name: ATTESTATION_AR, phrases: ["كم تكلفة التصديق"] },
    { id: "translate", name: TRANSLATION_AR, phrases: [] },
  ];

  it("matches it written exactly", () => {
    expect(matchByPhrase("تصديق الشهادات", intents)).toBe("attest");
    expect(matchByPhrase("تصديق الشهادات؟", intents)).toBe("attest");
  });

  // Arabic attaches its article and prepositions, so a phrase of ordinary
  // length is two words where the English is four. Counting words alone made
  // every Arabic phrase too short to be looked for inside a sentence.
  it("finds it inside a longer message", () => {
    expect(matchByPhrase("مرحبا، كم تكلفة تصديق الشهادات هنا؟", intents)).toBe("attest");
    expect(phraseHit("كم تكلفة تصديق الشهادات؟", [ATTESTATION_AR])).toBe(true);
  });

  it("normalises punctuation and spacing away", () => {
    expect(normalizeQuestion("  كم   تكلفة  تصديق الشهادة؟  ")).toBe("كم تكلفة تصديق الشهادة");
  });

  // The guard that made the rule strict in the first place: one common word
  // appearing somewhere says almost nothing about what is being asked.
  it("still refuses a single short word buried in a sentence", () => {
    const visa = [{ id: "visa", name: "visa", phrases: [] }];
    expect(matchByPhrase("my friend had a visa problem in Dubai", visa)).toBeNull();
  });
});

describe("the word rules themselves", () => {
  it("compare Arabic words without falling over", () => {
    expect(sameWord("الشهادات", "الشهادات")).toBe(true);
    expect(sameWord("تصديق", "ترجمة")).toBe(false);
  });

  it("find an Arabic phrase as a run of adjacent words", () => {
    expect(phraseRun(tokenize("كم تكلفة تصديق الشهادات هنا"), ATTESTATION_AR)).toBe(true);
    expect(phraseRun(tokenize("تصديق شيء آخر الشهادات"), ATTESTATION_AR)).toBe(false);
  });
});
