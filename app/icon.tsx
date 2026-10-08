import { ImageResponse } from "next/og";
import { BRAND, WORDMARK } from "@/lib/brand";

/**
 * The favicon, generated rather than drawn.
 *
 * This replaced `app/icon.png`, which was a crop of the previous brand's
 * artwork: a photographic swirl over a Dubai skyline, in the old teal and
 * gold. Two things were wrong with it after the rename, and the second was
 * true before it. It belonged to a name the site no longer uses — and Google
 * renders this at 16 CSS pixels beside every mobile result, where a detailed
 * illustration is a smudge and a single letter is a brand.
 *
 * One letter, in the accent, on the masthead's ground. Brass on ink measures
 * 7.65, so it survives being shrunk and recompressed by whoever is displaying
 * it.
 *
 * Generated so it cannot go stale: rename the site and this follows. When real
 * artwork arrives, delete this file and drop the PNG in beside it — Next's
 * file convention takes either.
 */

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.ink,
          color: BRAND.brass,
          // Tight and heavy: at 16px the counter of a lighter G closes up and
          // the letter reads as a blob.
          fontSize: 190,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          // Optical centring. The cap sits high in the em box, so centring the
          // box leaves the letter looking as though it is falling out of the
          // top of the square.
          paddingBottom: 18,
        }}
      >
        {WORDMARK.lead[0]}
      </div>
    ),
    size,
  );
}
