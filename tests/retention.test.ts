import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Job retention.
 *
 * Taking a listing off the site and deleting the row are different acts. Rows
 * were only ever marked `rejected`, so everything the ingest had ever seen
 * stayed in the table for good.
 *
 * The condition that matters is the one that spares a listing still on the
 * site: the shelf life is shorter than the retention window so it almost never
 * applies, but "delete anything over sixty days" would otherwise be able to
 * remove a job someone is reading.
 */

const calls: { method: string; args: unknown[] }[] = [];

function recorder() {
  const chain: Record<string, unknown> = {};
  for (const method of ["delete", "update", "select", "eq", "lt", "or"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [{ id: "1" }], error: null });
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ from: () => recorder() }),
}));
vi.mock("@/lib/ai/gemini", () => ({ generateJSON: async () => null }));

const { deleteStaleJobs } = await import("@/lib/ingest/jobs");
const { JOB_RETENTION_DAYS, SHELF_LIFE_DAYS } = await import("@/lib/jobs");

beforeEach(() => {
  calls.length = 0;
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("deleteStaleJobs", () => {
  it("deletes rather than marking, which is the whole point", async () => {
    await deleteStaleJobs();
    expect(calls.some((c) => c.method === "delete")).toBe(true);
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });

  it("measures age from when we added it, not the date the source claimed", async () => {
    // Feeds backdate. One bad posted_at should not evict a row on arrival.
    await deleteStaleJobs();

    const cutoff = calls.find((c) => c.method === "lt");
    expect(cutoff?.args[0]).toBe("created_at");

    const days = (Date.now() - new Date(cutoff?.args[1] as string).getTime()) / 86_400_000;
    expect(days).toBeCloseTo(JOB_RETENTION_DAYS, 1);
  });

  it("spares a listing that is still on the site", async () => {
    await deleteStaleJobs();

    const clause = calls.find((c) => c.method === "or")?.args[0] as string;
    expect(clause).toContain("status.neq.approved");
    expect(clause).toContain("expires_at.lt.");
    expect(clause).toContain("apply_by.lt.");
  });
});

describe("the two windows", () => {
  it("keeps rows for longer than they are shown, so an expired one can be looked at", async () => {
    // A job leaves the site at SHELF_LIFE_DAYS and the row goes at
    // JOB_RETENTION_DAYS. If these ever met, a listing would vanish from the
    // admin the moment it expired.
    expect(JOB_RETENTION_DAYS).toBeGreaterThan(SHELF_LIFE_DAYS);
  });
});
