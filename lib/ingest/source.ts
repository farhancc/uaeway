/**
 * What a job source has to produce, independent of who it is.
 *
 * These types used to live in `careerjet.ts`, so `ingest/jobs.ts` imported its
 * vocabulary from one particular vendor. Swapping the source then meant editing
 * the consumer too. They live here now, and a source is anything that turns
 * searches into RawJobs.
 */

export interface RawJob {
  title: string;
  company: string | null;
  sourceUrl: string;
  /** Shown on the listing as the attribution. */
  sourceName: string;
  locations: string | null;
  salary: string | null;
  /** An excerpt. We summarise in our own words and link out; never republished. */
  description: string;
  postedAt: string;
}

export interface JobSearch {
  keywords: string;
  location: string;
}

export type JobSource = (searches: JobSearch[]) => Promise<RawJob[]>;

/** The same listing matches several searches; the source URL is its identity. */
export function dedupe(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => (seen.has(j.sourceUrl) ? false : (seen.add(j.sourceUrl), true)));
}

/**
 * HTML from a feed, as prose.
 *
 * Every source hands us markup somewhere — Jooble wraps matched terms in <b>,
 * Greenhouse HTML-escapes an entire document into a JSON string. That text goes
 * into a model prompt and onto the review queue, so it has to arrive readable.
 *
 * Greenhouse escapes twice: the wire carries "&amp;nbsp;", so one pass leaves
 * "&nbsp;" sitting in the text. Decoding therefore runs to a fixed point rather
 * than once. That is safe because tags are stripped *after* all decoding, so
 * "&amp;lt;script&gt;" resolves to a tag and is then removed — the order that
 * would be unsafe is stripping first and decoding after.
 */
const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&ldquo;": "\u201c",
  "&rdquo;": "\u201d",
  "&hellip;": "\u2026",
  "&amp;": "&",
};

/** Bounded so a string of "&amp;amp;amp;…" cannot spin. Three covers the
 *  double-escaping seen in the wild with one to spare. */
const MAX_DECODE_PASSES = 3;

export function htmlToText(input: string): string {
  let text = input;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    const decoded = text
      .replace(
        /&(nbsp|lt|gt|quot|#39|apos|mdash|ndash|rsquo|lsquo|ldquo|rdquo|hellip|amp);/g,
        (m) => ENTITIES[m] ?? m,
      )
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
    if (decoded === text) break;
    text = decoded;
  }

  return text
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
