import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  SECTION_LIST,
  articlePath,
  sectionBySlug,
  sectionFor,
} from "@/lib/content/sections";

describe("article sections", () => {
  it("gives every kind its own URL segment", () => {
    expect(articlePath("guide", "attesting-a-degree")).toBe("/guides/attesting-a-degree");
    expect(articlePath("news", "new-fee")).toBe("/news/new-fee");
    expect(articlePath("blog", "why-refusals-happen")).toBe("/blog/why-refusals-happen");
  });

  it("does not let a blog post fall through to /guides", () => {
    // The previous mapping was `kind === "news" ? "news" : "guides"`, which
    // silently served blog posts from guide URLs.
    expect(articlePath("blog", "x")).not.toContain("/guides/");
  });

  it("round-trips a section through its slug", () => {
    for (const section of SECTION_LIST) {
      expect(sectionBySlug(section.slug)).toBe(section);
      expect(sectionFor(section.kind)).toBe(section);
    }
  });

  it("uses a distinct slug and label per section", () => {
    expect(new Set(SECTION_LIST.map((s) => s.slug)).size).toBe(SECTION_LIST.length);
    expect(new Set(SECTION_LIST.map((s) => s.label)).size).toBe(SECTION_LIST.length);
  });

  it("lists every kind, so no kind can exist without a route", () => {
    expect(SECTION_LIST.map((s) => s.kind).sort()).toEqual(Object.keys(SECTIONS).sort());
  });

  it("has copy for an empty section, because all three start empty", () => {
    for (const section of SECTION_LIST) {
      expect(section.empty.length).toBeGreaterThan(20);
      expect(section.intro.length).toBeGreaterThan(20);
    }
  });

  it("returns an unknown kind as a guide rather than throwing", () => {
    // Defends the page against a kind added to the database before the route.
    expect(sectionFor("mystery" as never)).toBe(SECTIONS.guide);
  });
});
