import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "./SiteNav";
import { href } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * The masthead, as the board above an arrivals hall.
 *
 * Dark bar, light plate. The bar is the site's green-black; the logo sits on a
 * plate of paper inside it, the way an illuminated sign panel sits in a dark
 * gantry.
 *
 * The plate is not a style choice, it is what the file requires. logo.png is a
 * mostly transparent artwork — mean alpha 52 of 255 — drawn for a light
 * ground: the navy half of the wordmark is near-black ink, and the gold half
 * is a glow that only reads against something bright. Composited on white it
 * is 92% lit; composited on black it is 11%, which is a black rectangle with a
 * faint smudge in it. Anyone tempted to "fix" the masthead by dropping the
 * plate and letting the mark sit on the dark should composite it first.
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
        <Link href={href(locale)} className="shrink-0 rounded-md" aria-label={`${SITE.name} — home`}>
          {/* The crop is measured, not eyeballed. Composited on paper, every
              pixel of ink in the file sits between 14% and 85.8% of its width
              and 5.2% and 95% of its height — so the artwork is squarer (6:5)
              than the 3:2 file it was saved in, and a 6:5 window with
              `object-cover` throws away only empty margin. The mark grows by
              about a fifth for free, which is the difference between a legible
              wordmark and the smudge this was at 48px on the old masthead. */}
          <span className="block aspect-[6/5] h-14 overflow-hidden rounded-md bg-paper px-0.5 sm:h-16">
            <Image
              src="/logo.png"
              alt={SITE.name}
              width={1536}
              height={1024}
              priority
              className="h-full w-full object-cover object-center"
            />
          </span>
        </Link>

        <SiteNav locale={locale} />
      </div>
    </header>
  );
}
