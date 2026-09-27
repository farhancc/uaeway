import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bulk approval.
 *
 * It publishes straight to the public site, so the two guards matter more than
 * the convenience: it acts only on ids it was given, and only on rows still
 * pending. A "publish everything waiting" button would push out rows the page
 * never showed, and an unfiltered update would let one open tab un-reject what
 * another tab had just rejected.
 */

const calls: { method: string; args: unknown[] }[] = [];

function recorder() {
  const chain: Record<string, unknown> = {};
  for (const method of ["update", "in", "eq", "select"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: [{ id: "a" }, { id: "b" }], error: null });
  return chain;
}

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ from: () => recorder() }),
}));

const { approveMany } = await import("@/app/(admin)/admin/actions");

beforeEach(() => {
  calls.length = 0;
});
afterEach(() => vi.restoreAllMocks());

function argsOf(method: string) {
  return calls.filter((c) => c.method === method).map((c) => c.args);
}

describe("approveMany", () => {
  it("acts only on the ids it was handed", async () => {
    await approveMany("jobs", ["a", "b"]);
    expect(argsOf("in")[0]).toEqual(["id", ["a", "b"]]);
  });

  it("touches only rows that are still pending", async () => {
    await approveMany("jobs", ["a"]);
    expect(argsOf("eq")).toContainEqual(["status", "pending"]);
  });

  it("records who approved it, so a bulk action is still attributable", async () => {
    await approveMany("jobs", ["a"]);
    const patch = argsOf("update")[0][0] as Record<string, unknown>;
    expect(patch.status).toBe("approved");
    expect(patch.reviewed_by).toBe("admin-1");
    expect(patch.reviewed_at).toBeTruthy();
  });

  it("gives an article the publish date it needs to be visible", async () => {
    // Articles are gated on published_at as well as status; without it an
    // approved article stays invisible and nobody knows why.
    await approveMany("articles", ["a"]);
    expect((argsOf("update")[0][0] as Record<string, unknown>).published_at).toBeTruthy();
  });

  it("does not set a publish date on a job, which uses posted_at", async () => {
    await approveMany("jobs", ["a"]);
    expect(argsOf("update")[0][0]).not.toHaveProperty("published_at");
  });

  it("does nothing at all for an empty selection", async () => {
    expect(await approveMany("jobs", [])).toEqual({ approved: 0 });
    expect(calls).toHaveLength(0);
  });

  it("refuses a batch big enough to be a mistake", async () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => String(i));
    await expect(approveMany("jobs", tooMany)).rejects.toThrow(/at most 100/);
  });

  it("refuses a table that is not reviewable", async () => {
    await expect(approveMany("leads", ["a"])).rejects.toThrow(/unknown table/);
  });

  it("reports how many actually changed, not how many were asked for", async () => {
    // Rows someone else already handled are filtered out by the pending check.
    expect(await approveMany("jobs", ["a", "b", "c"])).toEqual({ approved: 2 });
  });
});
