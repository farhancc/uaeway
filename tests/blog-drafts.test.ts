import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two things this pipeline must get right: never regenerate a post for a
 * guide already covered (however that earlier draft turned out), and never
 * trust the model's own claim about which service a post belongs to.
 */

const guides = [
  { id: "g1", slug: "attest-a-degree", title: "How to attest a degree", excerpt: "e1", body_md: "b1" },
  { id: "g2", slug: "family-visa-steps", title: "Family visa, step by step", excerpt: "e2", body_md: "b2" },
];

const existingBlogCitations = [
  { citations: [{ title: "x", url: "https://example.com/en/guides/attest-a-degree" }] },
];

const inserted: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "articles") {
        const q = {
          select: (cols: string) => ({
            eq: () => {
              // Distinguish the two queries by which columns were asked for.
              if (cols.includes("slug")) {
                return {
                  eq: () => ({ order: async () => ({ data: guides, error: null }) }),
                };
              }
              return Promise.resolve({ data: existingBlogCitations, error: null });
            },
          }),
          insert: async (row: Record<string, unknown>) => {
            inserted.push(row);
            return { error: null };
          },
        };
        return q;
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const generateJSON = vi.fn();
vi.mock("@/lib/ai/claude", () => ({ generateJSON }));

vi.mock("@/lib/slug", () => ({
  uniqueSlug: async (_table: string, title: string) => title.toLowerCase().replace(/\s+/g, "-"),
}));

const { undraftedGuides, draftBlogPosts } = await import("@/lib/content/blog-drafts");

beforeEach(() => {
  inserted.length = 0;
  generateJSON.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("finding guides without a derived post", () => {
  it("excludes a guide already cited by an existing blog post", async () => {
    const result = await undraftedGuides();
    expect(result.map((g) => g.slug)).toEqual(["family-visa-steps"]);
  });
});

describe("drafting", () => {
  it("cites the source guide it drafted from", async () => {
    generateJSON.mockResolvedValueOnce({
      title: "What people get wrong about family sponsorship",
      excerpt: "e",
      body_md: "body",
      service_slug: "visa-processing",
    });

    await draftBlogPosts(1);

    expect(inserted).toHaveLength(1);
    expect(inserted[0].kind).toBe("blog");
    expect(inserted[0].status).toBe("pending");
    expect(inserted[0].citations).toEqual([
      expect.objectContaining({ url: expect.stringContaining("/guides/family-visa-steps") }),
    ]);
  });

  it("keeps a service_slug the model returns when it is real", async () => {
    generateJSON.mockResolvedValueOnce({
      title: "T",
      excerpt: "e",
      body_md: "b",
      service_slug: "visa-processing",
    });
    await draftBlogPosts(1);
    expect(inserted[0].service_slug).toBe("visa-processing");
  });

  it("does not trust an invented service_slug from the model", async () => {
    generateJSON.mockResolvedValueOnce({
      title: "Family visa help",
      excerpt: "sponsor your spouse",
      body_md: "b",
      service_slug: "family-law-consulting", // not a real service
    });
    await draftBlogPosts(1);
    // Falls back to the keyword matcher rather than the model's own claim.
    expect(inserted[0].service_slug).toBe("visa-processing");
  });

  it("skips a guide the model returned nothing usable for, without crashing", async () => {
    generateJSON.mockResolvedValueOnce(null);
    const result = await draftBlogPosts(1);
    expect(result.drafted).toBe(0);
    expect(inserted).toHaveLength(0);
  });

  it("never publishes directly — everything lands pending", async () => {
    generateJSON.mockResolvedValueOnce({ title: "T", excerpt: "e", body_md: "b", service_slug: null });
    await draftBlogPosts(1);
    expect(inserted[0].status).toBe("pending");
  });
});
