import Link from "next/link";
import { SiteNav } from "./SiteNav";
import { href } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * The masthead, as the board above an arrivals hall.
 *
 * Dark bar, lettered name. The bar is the site's green-black and the name is
 * set in it, in the same two tones the footer uses.
 *
 * It was `public/logo.png` on a plate of paper until the site was renamed to
 * Gulfizz: that file is raster artwork with the words "UAEvia" drawn into it,
 * so it could not come along. The plate went with it — it existed only because
 * the artwork is a mostly transparent PNG (mean alpha 52 of 255) drawn for a
 * light ground, 92% lit composited on white and 11% on black. The file is
 * still in `public/` and still has that property, so if new artwork arrives
 * **measure it before deciding whether it needs a plate**; do not assume
 * either way from how it looks in a viewer, which supplies its own backdrop.
 *
 * Brass on this bar is a different measurement from brass on the green panel,
 * which is why it is allowed here and not there: #d9a441 on #0a1f16 reads at
 * 7.65, where the same gold on the sign green reads at 3.41 and needs
 * `--color-glow` instead.
 *
 * Quiet on purpose. The green panel is this site's loud device and it is spent
 * on the one thing that matters — telling someone where they are — so the
 * furniture around it stays dark and still.
 *
 * There is no contact button. The assistant is the way in, and it has its own
 * launcher pinned to every page; a second call to action beside it only split
 * the one decision we want people to make.
 */
export function Header({ locale }: { locale: string }) {
  return (
    // Sticky so the nav stays reachable on a phone, where the page is long and
    // the alternative is scrolling back to the top to go anywhere. z-30 keeps
    // it under the chat panel, which must sit over everything.
    <header className="sticky top-0 z-30 bg-ink">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-7 gap-y-1 px-5 py-2">
        <Link
          href={href(locale)}
          className="shrink-0 rounded-md py-1.5"
          aria-label={`${SITE.name} — home`}
        >
          {/* One element and two tones, matching the footer exactly, so the two
              marks cannot drift apart. `aria-hidden` because the link above
              already carries the name — a screen reader should hear it once,
              not as two fragments either side of it. */}
          <span aria-hidden="true" className="sign block text-3xl leading-none sm:text-4xl">
            <span className="text-paper">Gulf</span>
            <span className="text-brass">izz</span>
          </span>
        </Link>

        <SiteNav locale={locale} />
      </div>
    </header>
  );
}
