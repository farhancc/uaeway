import { describe, expect, it } from "vitest";
import { sitePath, splitReply } from "@/lib/chat/links";

/** The visible text of a reply, which must survive the split unchanged apart
 *  from the markdown punctuation a link is written with. */
const shown = (text: string) =>
  splitReply(text)
    .map((s) => s.text)
    .join("");

describe("paths in a reply", () => {
  it("links the markdown a seeded answer is written with", () => {
    // scripts/seed-answers.ts writes the path as its own label.
    const text = "we can help with this: [/services/attestation](/services/attestation)";
    expect(splitReply(text)).toEqual([
      { text: "we can help with this: " },
      { text: "/services/attestation", path: "/services/attestation" },
    ]);
  });

  it("links the bare path a model answer writes", () => {
    expect(splitReply("Start at /services/attestation and come back.")).toEqual([
      { text: "Start at " },
      { text: "/services/attestation", path: "/services/attestation" },
      { text: " and come back." },
    ]);
  });

  it("leaves the sentence's punctuation outside the link", () => {
    const [, link, tail] = splitReply("See /guides.");
    expect(link).toEqual({ text: "/guides", path: "/guides" });
    expect(tail).toEqual({ text: "." });
  });

  it("strips a locale so the reader stays in their own", () => {
    expect(sitePath("/en/services/attestation")).toBe("/services/attestation");
  });

  it("does not link a path that is not a page", () => {
    for (const text of ["open 24/7", "mainland and/or free zone", "/nowhere/at-all"]) {
      expect(splitReply(text)).toEqual([{ text }]);
    }
  });

  it("does not link the tail of somebody else's URL", () => {
    const text = "Confirm it at https://u.ae/en/services before you pay.";
    expect(splitReply(text)).toEqual([{ text }]);
  });

  it("keeps every other character of the reply", () => {
    const text = "Two steps: /services/attestation, then /services/visa-processing. 24/7.";
    expect(shown(text)).toBe(text);
  });
});
