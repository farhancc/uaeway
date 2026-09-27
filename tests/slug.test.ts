import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Slug allocation.
 *
 * The case that matters is a batch: the database only knows about committed
 * rows, so a caller that builds many rows and inserts them at the end will ask
 * for the same slug twice if two titles match. A real ingest of eight searches
 * failed on exactly that — "Sales Executive" is not a rare title — and because
 * it is one insert, one collision loses the entire batch.
 */

let existing: string[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        like: async (_col: string, pattern: string) => {
          const base = pattern.replace(/%$/, "");
          return { data: existing.filter((s) => s.startsWith(base)).map((slug) => ({ slug })), error: null };
        },
      }),
    }),
  }),
}));

const { uniqueSlug } = await import("@/lib/slug");

beforeEach(() => {
  existing = [];
});
afterEach(() => vi.restoreAllMocks());

describe("uniqueSlug", () => {
  it("uses the plain slug when nothing has taken it", async () => {
    expect(await uniqueSlug("jobs", "Sales Executive")).toBe("sales-executive");
  });

  it("steps past a slug already in the database", async () => {
    existing = ["sales-executive"];
    expect(await uniqueSlug("jobs", "Sales Executive")).toBe("sales-executive-2");
  });

  it("does not hand the same slug to two rows in one uncommitted batch", async () => {
    const reserved = new Set<string>();
    const first = await uniqueSlug("jobs", "Sales Executive", reserved);
    const second = await uniqueSlug("jobs", "Sales Executive", reserved);
    const third = await uniqueSlug("jobs", "Sales Executive", reserved);

    expect([first, second, third]).toEqual([
      "sales-executive",
      "sales-executive-2",
      "sales-executive-3",
    ]);
  });

  it("counts the database and the batch together", async () => {
    existing = ["sales-executive", "sales-executive-2"];
    const reserved = new Set<string>();

    expect(await uniqueSlug("jobs", "Sales Executive", reserved)).toBe("sales-executive-3");
    expect(await uniqueSlug("jobs", "Sales Executive", reserved)).toBe("sales-executive-4");
  });

  it("still works for callers that commit as they go and pass no set", async () => {
    existing = ["sales-executive"];
    expect(await uniqueSlug("jobs", "Sales Executive")).toBe("sales-executive-2");
    expect(await uniqueSlug("jobs", "Sales Executive")).toBe("sales-executive-2");
  });

  it("falls back to something usable for a title with no usable characters", async () => {
    expect(await uniqueSlug("jobs", "!!!")).toBe("post");
  });
});
