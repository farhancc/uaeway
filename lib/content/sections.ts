import type { ArticleKind } from "../supabase/types";

/**
 * What each kind of article is, and where it lives.
 *
 * One definition, because the kind-to-path mapping was previously repeated in
 * the article page, the sitemap, the chatbot's retrieval and each index page —
 * and had already drifted: `blog` existed in the database but every mapping
 * fell through to `/guides`, so a blog post would have been served from a
 * guide URL.
 *
 * Adding a fourth kind means adding it here, to the `article_kind` enum, and
 * creating the two route files.
 */
export interface Section {
  kind: ArticleKind;
  /** URL segment: /guides, /news, /blog. */
  slug: string;
  /** Nav and breadcrumb label. */
  label: string;
  /** Page H1. */
  title: string;
  titleAr: string;
  /** Meta description. */
  description: string;
  /** The sentence under the H1, saying what this section is for. */
  intro: string;
  /** Shown when nothing is published yet — an invitation, not an apology. */
  empty: string;
}

export const SECTIONS: Record<ArticleKind, Section> = {
  guide: {
    kind: "guide",
    slug: "guides",
    label: "Guides",
    title: "Guides",
    titleAr: "أدلة إرشادية",
    description:
      "Plain-English guides to UAE visas, certificate attestation, legal translation and company setup — what each process involves and what it needs from you.",
    intro:
      "How the paperwork actually works, written for people doing it for the first time. Every guide lists its sources, and a person reads it before it goes up.",
    empty:
      "No guides published yet. When one is, it will explain a process end to end and name every source it used.",
  },
  news: {
    kind: "news",
    slug: "news",
    label: "News",
    title: "UAE business news",
    titleAr: "أخبار الأعمال",
    description:
      "Business and regulatory news for people working, hiring or running a company in the UAE. What actually changed, when it takes effect, and the source it came from.",
    intro:
      "What changed for people working, hiring or running a company here. Each item cites its source and is checked before it goes up.",
    empty:
      "No news published yet. Items appear here when a rule, fee or process actually changes — not to fill a schedule.",
  },
  blog: {
    kind: "blog",
    slug: "blog",
    label: "Blog",
    title: "Blog",
    titleAr: "المدونة",
    description:
      "Notes from handling UAE paperwork every day — what goes wrong, what it costs in time, and what we would do differently.",
    intro:
      "Longer pieces from doing this work every day: why applications get refused, what the process feels like from the applicant's side, and the things nobody tells you until it is too late.",
    empty:
      "No posts yet. The first ones will cover the refusals we see most often and how to avoid them.",
  },
};

export const SECTION_LIST: Section[] = [SECTIONS.guide, SECTIONS.blog, SECTIONS.news];

/** The section an article belongs to. */
export function sectionFor(kind: ArticleKind): Section {
  return SECTIONS[kind] ?? SECTIONS.guide;
}

/** An article's path within a locale, e.g. "/blog/why-attestations-fail". */
export function articlePath(kind: ArticleKind, slug: string): string {
  return `/${sectionFor(kind).slug}/${slug}`;
}

/** Looks a section up by its URL segment. */
export function sectionBySlug(slug: string): Section | undefined {
  return SECTION_LIST.find((s) => s.slug === slug);
}
