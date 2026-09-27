import Link from "next/link";
import { href } from "@/lib/i18n";
import { SITE, whatsappLink } from "@/lib/site";

const NAV = [
  { path: "/jobs", label: "Jobs" },
  { path: "/services", label: "Services" },
  { path: "/guides", label: "Guides" },
  { path: "/blog", label: "Blog" },
  { path: "/about", label: "About" },
];

/**
 * A navy masthead on every page. On the home page the hero continues the same
 * navy so the two read as one block; elsewhere the change to ivory below gives
 * the edge without needing a rule.
 */
export function Header({ locale }: { locale: string }) {
  const wa = whatsappLink("Hello — I have a question about your services.");

  return (
    <header className="bg-ink">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-5">
        <Link href={href(locale)} className="sign shrink-0 text-xl text-paper">
          {SITE.name}
        </Link>

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            // Ivory on navy rather than WhatsApp green: green on this ground is
            // muddy, and the label carries the recognition well enough.
            className="order-2 ml-auto shrink-0 rounded-md bg-paper px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 sm:order-3"
          >
            WhatsApp us
          </a>
        )}

        <nav
          aria-label="Main"
          className="order-3 flex w-full flex-wrap items-center gap-x-6 gap-y-1 text-[0.9375rem] sm:order-2 sm:ml-auto sm:w-auto sm:flex-nowrap"
        >
          {NAV.map((item) => (
            <Link
              key={item.path}
              href={href(locale, item.path)}
              className="whitespace-nowrap text-onink underline-offset-8 transition-colors hover:text-paper hover:underline hover:decoration-brass"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
