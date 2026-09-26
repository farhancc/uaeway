import Link from "next/link";
import { href } from "@/lib/i18n";
import { whatsappLink } from "@/lib/site";

const NAV = [
  { path: "/jobs", label: "Jobs" },
  { path: "/services", label: "Services" },
  { path: "/guides", label: "Guides" },
  { path: "/blog", label: "Blog" },
  { path: "/about", label: "About" },
];

export function Header({ locale }: { locale: string }) {
  const wa = whatsappLink("Hello — I have a question about your services.");

  return (
    <header className="border-b-2 border-ink bg-paper">
      {/* On a phone the nav wraps onto its own full-width row rather than
          scrolling out of sight; no hamburger, because four links do not need
          to be hidden behind one. WhatsApp stays visible at every size — it is
          the action most of this audience takes, and they are on phones. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <Link href={href(locale)} className="sign shrink-0 text-lg text-ink">
          UAE Gateway
        </Link>

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="order-2 ml-auto shrink-0 rounded-[2px] bg-go px-3 py-1.5 text-sm font-semibold text-paper transition-colors hover:bg-go-dark sm:order-3"
          >
            WhatsApp us
          </a>
        )}

        <nav
          aria-label="Main"
          className="order-3 -mx-1 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[0.9375rem] sm:order-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:pt-0"
        >
          {NAV.map((item) => (
            <Link
              key={item.path}
              href={href(locale, item.path)}
              className="whitespace-nowrap px-1 text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
