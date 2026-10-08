import { ImageResponse } from "next/og";
import { BRAND, WORDMARK } from "@/lib/brand";
import { SITE } from "@/lib/site";

/**
 * The card every share of this site produces.
 *
 * It was `/logo.png` — the previous brand's artwork, with "UAEvia" and "YOUR
 * WAY THROUGH THE UAE" drawn into the pixels. A share card is the one place a
 * stale wordmark travels further than the page it came from: it is cached by
 * whoever rendered it and keeps circulating after the site itself has changed.
 * So the reference was removed from `lib/seo.ts` and from the Twitter card in
 * the site layout, and this took its place.
 *
 * Set in type, which is the same decision the masthead took when the artwork
 * could not come along. It is the one component here that cannot use the site's
 * own Barlow: `ImageResponse` renders outside the document, so it has no access
 * to the `next/font` faces and falls back to the renderer's own sans. Supplying
 * Barlow means shipping a TTF or fetching one at build, and a build-time
 * network call for a placeholder is a worse trade than a slightly different
 * grotesque. Replace the whole file when there is artwork.
 *
 * Next uses this for `og:image` **and** `twitter:image`, because neither
 * metadata object names an image of its own. Keep it that way.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: BRAND.ink,
          padding: "0 90px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: BRAND.paper }}>{WORDMARK.lead}</span>
          <span style={{ color: BRAND.brass }}>{WORDMARK.tail}</span>
        </div>

        {/* The brass rule is the masthead's accent doing the work a keyline
            does on a sign panel: it separates the name from the sentence
            without needing a second colour or a box. */}
        <div
          style={{
            width: 160,
            height: 8,
            background: BRAND.brass,
            margin: "44px 0",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 44,
            lineHeight: 1.3,
            color: BRAND.paper,
            opacity: 0.86,
            maxWidth: 900,
          }}
        >
          {SITE.tagline}
        </div>
      </div>
    ),
    size,
  );
}
