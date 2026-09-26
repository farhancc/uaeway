import { describe, expect, it } from "vitest";
import { leadInput, looksContactable, normalizeContact } from "@/lib/leads/schema";

describe("contact normalisation", () => {
  it("treats the same UAE number written differently as one person", () => {
    const forms = ["+971 50 123 4567", "971501234567", "00971501234567", "050 123 4567"];
    const normalised = new Set(forms.map(normalizeContact));
    expect(normalised).toEqual(new Set(["971501234567"]));
  });

  it("lowercases email addresses", () => {
    expect(normalizeContact("  Farhan@Example.COM ")).toBe("farhan@example.com");
  });

  it("rejects strings too short to be a contact", () => {
    expect(looksContactable("12345")).toBe(false);
    expect(looksContactable("not-an-email")).toBe(false);
    expect(looksContactable("0501234567")).toBe(true);
    expect(looksContactable("a@b.co")).toBe(true);
  });
});

describe("lead validation", () => {
  const valid = {
    serviceSlug: "attestation",
    contact: "0501234567",
    consent: true as const,
  };

  it("accepts a consented enquiry", () => {
    expect(leadInput.parse(valid).serviceSlug).toBe("attestation");
  });

  it("refuses a lead without consent — PDPL requires an explicit agreement", () => {
    expect(() => leadInput.parse({ ...valid, consent: false })).toThrow();
    expect(() => leadInput.parse({ serviceSlug: "attestation", contact: "0501234567" })).toThrow();
  });

  it("refuses an unknown service", () => {
    expect(() => leadInput.parse({ ...valid, serviceSlug: "free-money" })).toThrow();
  });
});
