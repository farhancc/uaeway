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

/**
 * The honeypot.
 *
 * It answers 200 and writes nothing, which is right for a bot and catastrophic
 * for a person: the form says "Got it" and the enquiry is gone. The field was
 * called "website" — a name browsers and password managers autofill, and
 * `autocomplete="off"` is widely ignored — so an autofill would have discarded
 * a real lead with nothing in any log to explain it.
 */
describe("the honeypot field name", () => {
  it("is not a name autofill recognises", async () => {
    const { readFile } = await import("fs/promises");
    const sources = await Promise.all([
      readFile("components/site/LeadForm.tsx", "utf8"),
      readFile("components/chat/LeadCapture.tsx", "utf8"),
      readFile("app/api/leads/route.ts", "utf8"),
    ]);

    // Names browsers fill in: website, url, company, address, organization.
    for (const source of sources) {
      const fields = [...source.matchAll(/name="([a-z_]+)"/g)].map((m) => m[1]);
      expect(fields).not.toContain("website");
      expect(fields).not.toContain("url");
      expect(fields).not.toContain("organization");
    }
  });

  it("uses the same field name on both forms and the route", async () => {
    // A mismatch would mean the trap never fires, or fires on everyone.
    const { readFile } = await import("fs/promises");
    for (const path of [
      "components/site/LeadForm.tsx",
      "components/chat/LeadCapture.tsx",
      "app/api/leads/route.ts",
    ]) {
      expect(await readFile(path, "utf8")).toContain("hp_ref");
    }
  });
});
