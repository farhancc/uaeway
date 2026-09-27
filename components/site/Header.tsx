import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "./SiteNav";
import { href } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * A light bar, because that is the ground the logo was drawn for: it carries
 * its own transparency, the wordmark is navy and gold, and it reads far better
 * on sand than on a dark band.
 *
 * There is no contact button here. The assistant is the way in, and it has its
 * own launcher pinned to every page — a second call to action beside it only
 * split the one decision we want people to make.
 */
export function Header({ locale }: { locale: string }) {
  return (
    // Sticky so the nav stays reachable on a phone, where the page is long and
    // the alternative is scrolling back to the top to go anywhere. z-30 keeps
    // it under the chat panel, which must sit over everything.
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-2">
        <Link href={href(locale)} className="shrink-0">
          <Image
            src="/logo.png"
            alt={SITE.name}
            width={1536}
            height={1024}
            priority
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        <SiteNav locale={locale} />
      </div>
    </header>
  );
}
