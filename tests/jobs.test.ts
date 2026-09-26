import { describe, expect, it } from "vitest";
import { isEmailLink, jobExpiry, normalizeApplyLink, SHELF_LIFE_DAYS } from "@/lib/jobs";

describe("apply links", () => {
  it("accepts a normal URL", () => {
    expect(normalizeApplyLink("https://employer.ae/careers/123")).toBe(
      "https://employer.ae/careers/123",
    );
  });

  it("adds a scheme to a bare domain", () => {
    expect(normalizeApplyLink("employer.ae/careers")).toBe("https://employer.ae/careers");
  });

  it("turns an email address into a mailto link", () => {
    expect(normalizeApplyLink("HR@Employer.ae")).toBe("mailto:hr@employer.ae");
    expect(normalizeApplyLink("mailto:hr@employer.ae")).toBe("mailto:hr@employer.ae");
  });

  it("refuses a scheme that would execute rather than navigate", () => {
    // These would otherwise become a link we render and a visitor clicks.
    expect(normalizeApplyLink("javascript:alert(1)")).toBeNull();
    expect(normalizeApplyLink("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeApplyLink("file:///etc/passwd")).toBeNull();
  });

  it("refuses something that is neither a link nor an address", () => {
    expect(normalizeApplyLink("call the office")).toBeNull();
    expect(normalizeApplyLink("")).toBeNull();
    expect(normalizeApplyLink("hr@employer")).toBeNull();
  });

  it("knows which links are email", () => {
    expect(isEmailLink("mailto:hr@employer.ae")).toBe(true);
    expect(isEmailLink("https://employer.ae")).toBe(false);
  });
});

describe("shelf life", () => {
  it("expires a listing the agreed number of days after it was posted", () => {
    const posted = "2026-01-01T00:00:00.000Z";
    const expires = new Date(jobExpiry(posted));
    const days = (expires.getTime() - new Date(posted).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(SHELF_LIFE_DAYS);
  });

  it("applies the same rule to an ingested and a hand-added job", () => {
    const now = new Date();
    expect(jobExpiry(now)).toBe(jobExpiry(now.toISOString()));
  });
});
