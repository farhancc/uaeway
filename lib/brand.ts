/**
 * The name, split the one way it is ever set.
 *
 * Three places draw the wordmark — the masthead, the footer, and the generated
 * share card and favicon in `app/` — and until this existed each of them held
 * the split as two literals. That is how `components/chat/ChatWidget.tsx` ended
 * up with a hardcoded "UV" that survived a rename of everything around it.
 *
 * Colours are the literal tokens rather than CSS variables because
 * `ImageResponse` renders outside the document and cannot read `:root`. They
 * are the same values `app/globals.css` defines, and the test pins them to it.
 */

import { SITE } from "./site";

/** Where the two tones meet. "Gulf" is the place; "izz" is the rest. */
const SPLIT = 4;

export const WORDMARK = {
  lead: SITE.name.slice(0, SPLIT),
  tail: SITE.name.slice(SPLIT),
} as const;

/**
 * The brand colours, as `app/globals.css` defines them.
 *
 * `brass` on `ink` measures 7.65, which is why the accent is allowed to be
 * brass here. On the green sign panel the same gold measures 3.41 and has to
 * be `--color-glow` instead — see `components/site/Header.tsx`.
 */
export const BRAND = {
  ink: "#0a1f16",
  paper: "#f1f3f0",
  brass: "#d9a441",
} as const;
