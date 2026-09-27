import { describe, expect, it, vi } from "vitest";

/**
 * Job filtering.
 *
 * The query is built from untrusted search params, so what matters is that a
 * hand-typed or stale URL narrows the list or is ignored — never that it widens
 * it past `status = approved`, and never that it throws.
 */

const calls: { method: string; args: unknown[] }[] = [];

function recorder() {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "or", "in", "contains", "gte", "order", "limit", "textSearch"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return chain;
}

vi.mock("@/lib/supabase/public", () => ({
  isPublicDbConfigured: () => true,
  supabasePublic: () => ({ from: () => recorder() }),
}));

const { listJobs, isJobSort } = await import("@/lib/content/queries");

function used(method: string) {
  return calls.filter((c) => c.method === method);
}

describe("what reaches the database", () => {
  it("never widens past approved, whatever the filters say", async () => {
    calls.length = 0;
    await listJobs({ emirates: ["Dubai"], q: "nurse" });

    expect(used("eq").some((c) => c.args[0] === "status" && c.args[1] === "approved")).toBe(true);
  });

  it("hides listings that have already expired", async () => {
    // The prune cron runs weekly, so without this a job that closed on Monday
    // would still be on the site on Saturday.
    calls.length = 0;
    await listJobs({});

    expect(used("or")[0].args[0]).toContain("expires_at");
  });

  it("treats several emirates as OR, not as an impossible AND", async () => {
    calls.length = 0;
    await listJobs({ emirates: ["Dubai", "Sharjah"] });

    expect(used("in")[0].args).toEqual(["emirate", ["Dubai", "Sharjah"]]);
  });

  it("ignores empty arrays rather than filtering on nothing", async () => {
    calls.length = 0;
    await listJobs({ emirates: [], categories: [] });

    expect(used("in")).toHaveLength(0);
  });

  it("matches a document inside the array column", async () => {
    calls.length = 0;
    await listJobs({ document: "Attested degree" });

    expect(used("contains")[0].args).toEqual(["documents_needed", ["Attested degree"]]);
  });

  it("turns a day window into a posted-after bound", async () => {
    calls.length = 0;
    await listJobs({ postedWithinDays: 7 });

    const [column, value] = used("gte")[0].args as [string, string];
    expect(column).toBe("posted_at");
    const days = (Date.now() - new Date(value).getTime()) / 86_400_000;
    expect(days).toBeCloseTo(7, 1);
  });
});

describe("salary and experience", () => {
  it("does not lose an open-ended listing from a floor filter", async () => {
    // "AED 25,000+" parses to min 25000 with no max. Comparing a floor against
    // salary_max alone dropped it — hiding exactly the jobs that pay best.
    calls.length = 0;
    await listJobs({ salaryMin: 10000 });

    const clause = used("or").map((c) => c.args[0]).join(" ");
    expect(clause).toContain("salary_max.gte.10000");
    expect(clause).toContain("and(salary_max.is.null,salary_min.gte.10000)");
  });

  it("does the mirror of that for a ceiling", async () => {
    calls.length = 0;
    await listJobs({ salaryMax: 6000 });

    const clause = used("or").map((c) => c.args[0]).join(" ");
    expect(clause).toContain("salary_min.lte.6000");
    expect(clause).toContain("and(salary_min.is.null,salary_max.lte.6000)");
  });

  it("keeps listings that never stated their requirement", async () => {
    // "Not stated" is not "requires twenty years", and treating it as such
    // would hide most of the board from anyone using this filter.
    calls.length = 0;
    await listJobs({ experienceYears: 3 });

    expect(used("or").map((c) => c.args[0]).join(" ")).toContain(
      "experience_years.is.null,experience_years.lte.3",
    );
  });

  it("treats a fresher search as a real filter, not an absent one", async () => {
    // 0 is falsy; an `if (filters.experienceYears)` would silently ignore it.
    calls.length = 0;
    await listJobs({ experienceYears: 0 });

    expect(used("or").map((c) => c.args[0]).join(" ")).toContain("experience_years.lte.0");
  });

  it("hides a listing whose deadline has passed", async () => {
    calls.length = 0;
    await listJobs({});

    expect(used("or").map((c) => c.args[0]).join(" ")).toContain("apply_by.is.null");
  });
});

describe("sort order", () => {
  it("defaults to newest first", async () => {
    calls.length = 0;
    await listJobs({});

    expect(used("order")[0].args).toEqual(["posted_at", { ascending: false }]);
  });

  it("sorts by title when asked", async () => {
    calls.length = 0;
    await listJobs({ sort: "title" });

    expect(used("order")[0].args).toEqual(["title", { ascending: true }]);
  });

  it("rejects a sort key that is not one of ours", () => {
    // ?sort=; drop table, or just an old bookmark.
    expect(isJobSort("newest")).toBe(true);
    expect(isJobSort("salary")).toBe(false);
    expect(isJobSort(undefined)).toBe(false);
  });
});
