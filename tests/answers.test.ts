import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The answer bank's job is to answer common questions for free *without ever
 * answering the wrong one*. The ambiguity test below is the important one: it
 * is what stops a visitor asking about a golden visa being told about family
 * visa fees, on a topic where people act on what we say.
 */

const bank = [
  {
    id: "1",
    slug: "attestation-photocopy",
    question: "Can you attest a photocopy?",
    answer_md: "No. Attestation is performed on the original document.",
    service_slug: "attestation",
    keywords: ["attest photocopy", "photocopy original"],
    follow_up_slugs: ["attestation-country"],
    is_opener: true,
    show_on_page: true,
    position: 0,
  },
  {
    id: "2",
    slug: "attestation-country",
    question: "My degree is from India. Does that change anything?",
    answer_md: "Yes — each country has its own route.",
    service_slug: "attestation",
    keywords: ["degree india", "india attestation"],
    follow_up_slugs: ["attestation-photocopy"],
    is_opener: false,
    show_on_page: true,
    position: 1,
  },
  {
    id: "3",
    slug: "golden-visa-cost",
    question: "How much does a golden visa cost?",
    answer_md: "Government fees depend on the category.",
    service_slug: "visa-processing",
    keywords: ["visa cost", "golden visa"],
    follow_up_slugs: [],
    is_opener: false,
    show_on_page: true,
    position: 0,
  },
  {
    id: "4",
    slug: "family-visa-cost",
    question: "How much does a family visa cost?",
    answer_md: "Government fees depend on the sponsor's salary.",
    service_slug: "visa-processing",
    keywords: ["visa cost", "family visa"],
    follow_up_slugs: [],
    is_opener: false,
    show_on_page: true,
    position: 1,
  },
];

vi.mock("@/lib/supabase/public", () => ({
  isPublicDbConfigured: () => true,
  supabasePublic: () => ({
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: async () => ({ data: bank, error: null }),
      };
      return q;
    },
  }),
}));

const { clearAnswerCache, getAnswer, matchAnswer, answersForService } = await import(
  "@/lib/chat/answers"
);
const { nextChips, openerChips } = await import("@/lib/chat/chips");

beforeEach(() => clearAnswerCache());

describe("looking an answer up by slug", () => {
  it("returns exactly the answer a suggestion points at", async () => {
    const answer = await getAnswer("attestation-photocopy");
    expect(answer?.question).toBe("Can you attest a photocopy?");
  });

  it("returns nothing for a retired slug rather than guessing", async () => {
    expect(await getAnswer("no-such-answer")).toBeNull();
  });
});

describe("matching a typed question", () => {
  it("serves a clear match without calling the model", async () => {
    const match = await matchAnswer("can you attest a photocopy of my degree");
    expect(match?.answer.slug).toBe("attestation-photocopy");
    expect(match?.confident).toBe(true);
  });

  it("matches the way people write, not the keyword's exact form", async () => {
    const match = await matchAnswer("my degree is from India, does attestation differ");
    expect(match?.answer.slug).toBe("attestation-country");
    expect(match?.confident).toBe(true);
  });

  it("refuses to pick between two answers that fit equally well", async () => {
    // "visa cost" hits both the golden and family answers. Guessing here would
    // tell someone the wrong fee, so this must fall through to the model.
    const match = await matchAnswer("how much does a visa cost");
    expect(match?.confident).toBe(false);
  });

  it("finds nothing for an unrelated question", async () => {
    expect(await matchAnswer("what is the weather tomorrow")).toBeNull();
  });

  it("needs a keyword hit, not just words shared with the question", async () => {
    // "How much does" overlaps both cost answers, but carries no keyword.
    expect(await matchAnswer("how much")).toBeNull();
  });
});

describe("suggested questions", () => {
  it("offers openers before anyone has typed", async () => {
    const chips = await openerChips();
    expect(chips.map((c) => c.slug)).toEqual(["attestation-photocopy"]);
  });

  it("offers the author's follow-ups after a canned answer", async () => {
    const answered = await getAnswer("attestation-photocopy");
    const chips = await nextChips({ answered, used: new Set() });
    expect(chips[0].slug).toBe("attestation-country");
  });

  it("never re-offers a question already answered in this conversation", async () => {
    const answered = await getAnswer("attestation-photocopy");
    const chips = await nextChips({
      answered,
      used: new Set(["attestation-country", "attestation-photocopy"]),
    });
    expect(chips.map((c) => c.slug)).not.toContain("attestation-country");
    expect(chips.map((c) => c.slug)).not.toContain("attestation-photocopy");
  });

  it("falls back to the service's other questions after a model answer", async () => {
    const chips = await nextChips({ text: "I need a family visa for my wife", used: new Set() });
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((c) => c.slug.includes("visa"))).toBe(true);
  });
});

describe("service page FAQ", () => {
  it("returns that service's answers in order", async () => {
    const faqs = await answersForService("attestation");
    expect(faqs.map((f) => f.slug)).toEqual(["attestation-photocopy", "attestation-country"]);
  });
});
