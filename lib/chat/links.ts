/**
 * The pages a reply names, turned into somewhere a finger can land.
 *
 * Replies point at a page two ways, and neither of them was reaching it. An
 * authored answer carries a markdown link — scripts/seed-answers.ts writes
 * `[/services/attestation](/services/attestation)` — and the bubble renders
 * plain text, so the visitor read the brackets. A model answer writes the bare
 * path, because lib/chat/prompt.ts tells it to, and that was text too.
 *
 * Split here rather than rendering the bubble as markdown: a reply is revealed
 * a character at a time, so a parser would run on every animation frame, and
 * the numbered steps an authored answer is built from would become an `ol` and
 * stop looking like something a person typed.
 */

import { SECTION_LIST } from "../content/sections";
import { isLocale } from "../i18n";

/**
 * The top-level segments that are real routes under app/(site)/[locale].
 *
 * A whitelist, not a shape test: without it "24/7", "and/or" and a date would
 * all become links to pages that do not exist. The article sections come from
 * lib/content/sections.ts so a fourth kind is linkable the day it is added.
 */
const SECTIONS = new Set([
  "services",
  "jobs",
  "about",
  "contact",
  "privacy",
  "terms",
  ...SECTION_LIST.map((s) => s.slug),
]);

/**
 * A markdown link to a path, or a bare path.
 *
 * Written without a lookbehind on purpose. `splitReply` checks the character
 * before a bare path in code instead, because a lookbehind is a syntax error
 * on Safari below 16.4 — and a regex that throws at module load would take the
 * whole widget down rather than one link.
 */
const LINK = /\[([^\]\n]+)\]\((\/[^\s)]+)\)|(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*\/?)/gi;

export interface ReplySegment {
  /** What the visitor reads. */
  text: string;
  /** Where it goes, without a locale, or absent for ordinary prose. */
  path?: string;
}

/**
 * A path on this site, with any locale stripped off.
 *
 * The locale comes off because the reader's own is added back when the link is
 * built: a reply that hardcoded /en would send an Arabic reader out of the
 * language they are reading in, which is a reload and a lost place.
 */
export function sitePath(raw: string): string | null {
  const parts = raw.toLowerCase().split("/").filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) parts.shift();
  if (parts.length === 0 || !SECTIONS.has(parts[0])) return null;
  return `/${parts.join("/")}`;
}

/** A reply as the runs of prose and the links between them. */
export function splitReply(text: string): ReplySegment[] {
  const segments: ReplySegment[] = [];
  let cut = 0;

  for (const match of text.matchAll(LINK)) {
    const [whole, label, target, bare] = match;
    const path = sitePath(target ?? bare);
    // A bare path only counts at the start of a word. "u.ae/en/services" is
    // somebody else's URL with one of our segments inside it, and linking the
    // tail of it would send someone to the wrong site's page on ours.
    const midWord = bare && match.index > 0 && !/\s/.test(text[match.index - 1]);
    if (!path || midWord) continue;

    if (match.index > cut) segments.push({ text: text.slice(cut, match.index) });
    segments.push({ text: label ?? bare, path });
    cut = match.index + whole.length;
  }

  if (cut < text.length) segments.push({ text: text.slice(cut) });
  return segments;
}
