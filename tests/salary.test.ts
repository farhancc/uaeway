import { describe, expect, it } from "vitest";
import { deadlineLabel, experienceLabel, formatSalary, parseSalary, postedLabel } from "@/lib/salary";

/**
 * Salary parsing.
 *
 * A wrong salary is the most damaging thing this site could assert, so the
 * governing rule is that uncertainty returns nulls. A job missing from a range
 * filter is a small harm; a job appearing under the wrong range is not.
 */

describe("ranges", () => {
  it("reads the common UAE form", () => {
    expect(parseSalary("AED 8,000 - 12,000")).toEqual({ min: 8000, max: 12000 });
  });

  it("reads it with the currency trailing and a period stated", () => {
    expect(parseSalary("8000 to 12000 AED per month")).toEqual({ min: 8000, max: 12000 });
  });

  it("assumes dirhams when no currency is named, as UAE ads do", () => {
    expect(parseSalary("10,000 - 15,000")).toEqual({ min: 10000, max: 15000 });
  });

  it("expands a k suffix", () => {
    expect(parseSalary("AED 8k - 12k")).toEqual({ min: 8000, max: 12000 });
  });

  it("collapses a single figure into both ends", () => {
    expect(parseSalary("AED 9,500")).toEqual({ min: 9500, max: 9500 });
  });
});

describe("periods", () => {
  it("converts a yearly figure to monthly so ranges compare", () => {
    expect(parseSalary("AED 120,000 per year")).toEqual({ min: 10000, max: 10000 });
  });

  it("converts a yearly range", () => {
    expect(parseSalary("AED 120,000 - 180,000 per annum")).toEqual({ min: 10000, max: 15000 });
  });

  it("refuses an hourly or daily rate, which needs hours we were not given", () => {
    expect(parseSalary("AED 120 per hour")).toEqual({ min: null, max: null });
    expect(parseSalary("AED 900 per day")).toEqual({ min: null, max: null });
  });
});

describe("one-sided figures", () => {
  it("keeps 'up to' as a ceiling with no floor invented", () => {
    expect(parseSalary("Up to AED 15,000")).toEqual({ min: null, max: 15000 });
  });

  it("keeps 'from' as a floor with no ceiling invented", () => {
    expect(parseSalary("From AED 10,000 monthly")).toEqual({ min: 10000, max: null });
  });

  it("reads a trailing plus as a floor", () => {
    expect(parseSalary("AED 20,000+")).toEqual({ min: 20000, max: null });
  });
});

describe("refusing to guess", () => {
  it("returns nothing for a currency it cannot convert", () => {
    // Converting would mean inventing an exchange rate.
    expect(parseSalary("$5,000 - $7,000")).toEqual({ min: null, max: null });
    expect(parseSalary("USD 60,000 per year")).toEqual({ min: null, max: null });
    expect(parseSalary("₹ 90,000")).toEqual({ min: null, max: null });
  });

  it("returns nothing for words that are not a number", () => {
    for (const text of ["Competitive", "Negotiable", "Salary on application", "", null, undefined]) {
      expect(parseSalary(text)).toEqual({ min: null, max: null });
    }
  });

  it("discards figures too small or too large to be a monthly salary", () => {
    // A reference number, or an annual figure that lost its period.
    expect(parseSalary("AED 12")).toEqual({ min: null, max: null });
    expect(parseSalary("AED 9,000,000")).toEqual({ min: null, max: null });
  });

  it("keeps the plausible end of a mixed pair rather than the whole thing", () => {
    // "Ref 42, AED 10,000" — the 42 is not a salary.
    expect(parseSalary("Ref 42 AED 10,000")).toEqual({ min: 10000, max: 10000 });
  });

  it("does not throw on anything", () => {
    for (const text of ["---", "AED", "k", "1.2.3", "٣٠٠٠"]) {
      expect(() => parseSalary(text)).not.toThrow();
    }
  });
});

describe("formatting a parsed range", () => {
  it("writes a range, a single figure, and each one-sided case", () => {
    expect(formatSalary({ min: 8000, max: 12000 })).toBe("AED 8,000 – AED 12,000 per month");
    expect(formatSalary({ min: 9500, max: 9500 })).toBe("AED 9,500 per month");
    expect(formatSalary({ min: 10000, max: null })).toBe("From AED 10,000 per month");
    expect(formatSalary({ min: null, max: 15000 })).toBe("Up to AED 15,000 per month");
    expect(formatSalary({ min: null, max: null })).toBeNull();
  });
});

describe("experience labels", () => {
  it("gives freshers their own words rather than '0+ years'", () => {
    expect(experienceLabel(0)).toBe("Open to freshers");
    expect(experienceLabel(1)).toBe("1+ year experience");
    expect(experienceLabel(5)).toBe("5+ years experience");
  });

  it("says nothing when the listing said nothing", () => {
    // Not the same as zero, and must never be shown as if it were.
    expect(experienceLabel(null)).toBeNull();
    expect(experienceLabel(undefined)).toBeNull();
  });
});

describe("deadlines", () => {
  const now = new Date("2026-09-27T14:30:00Z");

  it("does not shift a plain date across midnight for eastern timezones", () => {
    // apply_by has no timezone. Letting Date localise it turned 31 December
    // into 1 January on a UTC+5:30 machine — a deadline shown a day late.
    expect(deadlineLabel("2026-12-31", now)?.text).toBe("Apply by 31 Dec 2026");
  });

  it("counts whole days rather than rounding a partial one up", () => {
    expect(deadlineLabel("2026-10-02", now)?.text).toBe("Closes in 5 days");
  });

  it("marks the last week as urgent and anything further out as not", () => {
    expect(deadlineLabel("2026-09-27", now)).toEqual({ text: "Closes today", urgent: true });
    expect(deadlineLabel("2026-09-28", now)).toEqual({ text: "Closes tomorrow", urgent: true });
    expect(deadlineLabel("2026-12-31", now)?.urgent).toBe(false);
  });

  it("returns nothing for a date that has passed or is not a date", () => {
    expect(deadlineLabel("2026-09-01", now)).toBeNull();
    expect(deadlineLabel("soon", now)).toBeNull();
    expect(deadlineLabel(null)).toBeNull();
  });
});

describe("posted labels", () => {
  const now = new Date("2026-09-27T14:30:00Z");

  it("reads as freshness, not as a date", () => {
    expect(postedLabel("2026-09-27T09:00:00Z", now)).toBe("Posted today");
    expect(postedLabel("2026-09-26T09:00:00Z", now)).toBe("Posted yesterday");
    expect(postedLabel("2026-09-20T09:00:00Z", now)).toBe("Posted 7 days ago");
    expect(postedLabel("2026-08-01T09:00:00Z", now)).toBe("Posted last month");
  });
});
