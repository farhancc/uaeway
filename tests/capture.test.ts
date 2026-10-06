import { findContact, looksContactable } from "@/lib/leads/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * captureLead's two promises to the business:
 *   - a repeat enquiry inside 24h does not page sales twice;
 *   - nothing is ever stored without recorded consent.
 * Supabase and the alerting are stubbed so the test covers the logic, not the
 * network.
 */

const insert = vi.fn();
const recentLeads = vi.fn();
const alertSales = vi.fn(async () => {});

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => {
      const existing = {
        select: () => existing,
        eq: () => existing,
        gte: () => existing,
        order: () => existing,
        limit: async () => ({ data: recentLeads(), error: null }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              insert(row);
              return { data: { id: "lead-1", ...row }, error: null };
            },
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({ single: async () => ({ data: null, error: null }) }),
          }),
        }),
      };
      return existing;
    },
  }),
}));

vi.mock("@/lib/leads/alerts", () => ({ alertSales }));

const { captureLead } = await import("@/lib/leads/capture");

const enquiry = {
  serviceSlug: "attestation",
  name: "Farhan",
  contact: "+971 50 123 4567",
  need: "Degree from India",
  consent: true as const,
};

describe("captureLead", () => {
  beforeEach(() => {
    insert.mockClear();
    alertSales.mockClear();
    recentLeads.mockReturnValue([]);
  });

  it("stores a new lead and tells sales once", async () => {
    const { lead, duplicate } = await captureLead(enquiry);

    expect(duplicate).toBe(false);
    expect(alertSales).toHaveBeenCalledTimes(1);
    // Stored normalised, so the next form fill matches this one.
    expect(insert.mock.calls[0][0]).toMatchObject({ contact: "971501234567" });
    expect(lead.id).toBe("lead-1");
  });

  it("records when consent was given", async () => {
    await captureLead(enquiry);
    expect(insert.mock.calls[0][0].consent_at).toBeTypeOf("string");
  });

  it("does not page sales again for the same person and service", async () => {
    recentLeads.mockReturnValue([
      { id: "lead-0", contact: "971501234567", service_slug: "attestation", need: "Degree from India" },
    ]);

    const { duplicate } = await captureLead(enquiry);

    expect(duplicate).toBe(true);
    expect(insert).not.toHaveBeenCalled();
    expect(alertSales).not.toHaveBeenCalled();
  });

  it("refuses to store anything without consent", async () => {
    await expect(captureLead({ ...enquiry, consent: false })).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("finding a contact in what someone typed", () => {
  /**
   * Only ever used to prefill the callback form, never to create a lead: the
   * visitor still sees the value, can correct it, and still ticks the consent
   * box. So a wrong answer here costs a retyped field, and a false positive on
   * a document count or a year would be the annoying one.
   */
  it("finds a number however it was written", () => {
    expect(findContact("call me on 0501234567")).toBe("0501234567");
    expect(findContact("my number is +971 50 123 4567")).toBe("+971 50 123 4567");
    expect(findContact("050-123-4567 please")).toBe("050-123-4567");
  });

  it("finds an email, including the awkward ones", () => {
    expect(findContact("reach me at a.b+x@mail.co.uk")).toBe("a.b+x@mail.co.uk");
  });

  it("prefers the email when both are present", () => {
    // The one they are more likely to have typed deliberately.
    expect(findContact("0501234567 or me@example.com")).toBe("me@example.com");
  });

  it("finds nothing in ordinary sentences", () => {
    expect(findContact("call me tomorrow")).toBeNull();
    expect(findContact("I need 5 documents attested")).toBeNull();
    expect(findContact("what will it cost in 2026")).toBeNull();
    expect(findContact("")).toBeNull();
  });

  it("never returns something the form would then reject", () => {
    // Everything it does return must pass the same gate as a submitted form.
    for (const text of ["call me on 0501234567", "mail me at x@y.com", "+971 4 123 4567"]) {
      const found = findContact(text);
      expect(found).not.toBeNull();
      expect(looksContactable(found!)).toBe(true);
    }
  });
});
