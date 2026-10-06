import { describe, expect, it } from "vitest";
import {
  findProviderOpening,
  findUnsupportedAmounts,
  SYSTEM_PROMPT,
  withContext,
} from "@/lib/chat/prompt";
import { matchServices } from "@/lib/services";
import { normalizeEmirate } from "@/lib/uae";

describe("chatbot fee guardrail", () => {
  it("flags a figure the model invented", () => {
    const context = "Attestation fees vary by country and are quoted per case.";
    const reply = "Attestation costs AED 2,000 in total.";
    expect(findUnsupportedAmounts(reply, context)).toContain("AED 2,000");
  });

  it("allows a figure that came from our own content", () => {
    const context = "The service fee is AED 350 per document.";
    const reply = "Our fee is AED 350 per document.";
    expect(findUnsupportedAmounts(reply, context)).toEqual([]);
  });

  it("ignores formatting differences when comparing amounts", () => {
    expect(findUnsupportedAmounts("It is 2,500 AED.", "priced at AED 2500")).toEqual([]);
  });

  it("says nothing about a reply with no figures", () => {
    expect(findUnsupportedAmounts("It depends on the issuing country.", "")).toEqual([]);
  });
});

describe("answering from the visitor's side", () => {
  it("flags an answer that leads with what we do", () => {
    expect(
      findProviderOpening(
        "How do I know which authorities need to stamp my document?",
        "We map the required chain of stamps based on the issuing country. You then send us the original.",
      ),
    ).toBe("We map the required chain of stamps based on the issuing country.");
  });

  it("allows the offer of help once the question has been answered", () => {
    expect(
      findProviderOpening(
        "How do I know which authorities need to stamp my document?",
        "The issuing body, then that country's foreign ministry, then the UAE embassy there. We can confirm the order for your country.",
      ),
    ).toBeNull();
  });

  it("lets a question about us be answered in the first person", () => {
    expect(
      findProviderOpening(
        "Do you write the CV from scratch?",
        "We rewrite rather than invent. Everything on it has to be true.",
      ),
    ).toBeNull();
  });

  it("treats a yes or no before the we as the answer it is", () => {
    expect(
      findProviderOpening(
        "Can I have several documents attested at once?",
        "Yes, we can take several documents in one case.",
      ),
    ).toBeNull();
  });

  it("sees through markdown emphasis on the opening sentence", () => {
    expect(
      findProviderOpening(
        "What happens if my visa application is rejected?",
        "**We review the rejection notice** and work out the reason.",
      ),
    ).toBe("We review the rejection notice and work out the reason.");
  });

  it("catches the possessive opening too", () => {
    expect(
      findProviderOpening(
        "What if my document is in a language other than English?",
        "Our service focuses on Arabic and English.",
      ),
    ).toBe("Our service focuses on Arabic and English.");
  });
});

describe("service matching", () => {
  it("routes a translation question to legal translation", () => {
    expect(matchServices("I need to translate my degree certificate")[0].slug).toBe(
      "legal-translation",
    );
  });

  it("routes a company question to business setup", () => {
    expect(matchServices("how do I get a trade licence in a free zone")[0].slug).toBe(
      "business-setup",
    );
  });

  it("matches the way people actually write, not the keyword's exact form", () => {
    expect(matchServices("where do I attest a degree from Kerala")[0].slug).toBe("attestation");
    expect(matchServices("I want to notarise a power of attorney")[0].slug).toBe("notary");
    expect(matchServices("help me rewrite my resume")[0].slug).toBe("cv-resume");
  });

  it("requires every word of a multi-word keyword", () => {
    // "business" alone must not fire the business-setup keyword "business setup".
    const slugs = matchServices("business", 8).map((s) => s.slug);
    expect(slugs).not.toContain("business-setup");
  });

  it("does not confuse similar-looking words", () => {
    // visa/visit and company/compare share a short prefix but are different words.
    expect(matchServices("I want to visit the Dubai mall")).toEqual([]);
  });

  it("returns nothing for an unrelated question", () => {
    expect(matchServices("what is the weather tomorrow")).toEqual([]);
  });
});

describe("emirate normalisation", () => {
  it("maps the spellings that actually appear in job feeds", () => {
    expect(normalizeEmirate("Jebel Ali Free Zone, Dubai")).toBe("Dubai");
    expect(normalizeEmirate("RAK")).toBe("Ras Al Khaimah");
    expect(normalizeEmirate("Al Ain")).toBe("Abu Dhabi");
  });

  it("returns null rather than guessing", () => {
    expect(normalizeEmirate("Remote")).toBeNull();
    expect(normalizeEmirate(null)).toBeNull();
  });
});

describe("prompt shape", () => {
  it("keeps the instructions free of per-turn content, so the prefix is cacheable", () => {
    // The old buildSystemPrompt(context) made every request byte-different and
    // forfeited Gemini's implicit caching on each one.
    expect(SYSTEM_PROMPT).not.toContain("CONTEXT:\n");
    expect(SYSTEM_PROMPT).not.toMatch(/\[\d+\] (SERVICE|ARTICLE|JOB):/);
  });

  it("carries the grounding on the visitor's own message", () => {
    const turn = withContext("how long does it take?", "[1] SERVICE: Attestation\nSome text");
    expect(turn).toContain("CONTEXT:");
    expect(turn).toContain("[1] SERVICE: Attestation");
    expect(turn).toContain("VISITOR: how long does it take?");
  });

  it("produces the same instructions whatever the context", () => {
    const a = SYSTEM_PROMPT;
    withContext("x", "one context");
    withContext("y", "a completely different context");
    expect(SYSTEM_PROMPT).toBe(a);
  });
});
