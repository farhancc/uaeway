import Link from "next/link";
import { href } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/lib/services";

const SITE_LINKS = [
  { path: "/jobs", label: "Jobs" },
  { path: "/guides", label: "Guides" },
  { path: "/blog", label: "Blog" },
  { path: "/news", label: "News" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
  { path: "/privacy", label: "Privacy" },
  { path: "/terms", label: "Terms" },
];

export function Footer({ locale }: { locale: string }) {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-field">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="sign text-lg text-ink">{SITE.name}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
              Operated by {SITE.company}, {SITE.area}.
            </p>
          </div>

          <nav aria-label="Services">
            <p className="sign text-sm text-ink">Services</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={href(locale, `/services/${s.slug}`)}
                    className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  >
                    {s.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Site">
            <p className="sign text-sm text-ink">Site</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {SITE_LINKS.map((l) => (
                <li key={l.path}>
                  <Link
                    href={href(locale, l.path)}
                    className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Not boilerplate. This is what stops a reader treating an aggregated
            listing as an offer or a guide as legal advice — and it is what a
            scam-wary job seeker looks for before trusting a site. */}
        <div className="mt-10 space-y-2 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
          <p>
            Job listings are summarised from public sources and link to the original posting. Check
            the details with the employer before applying.{" "}
            <strong className="font-semibold text-seal">Never pay a fee to be given a job.</strong>
          </p>
          <p>
            Guides here are general information, not legal or immigration advice. Government fees
            and rules change — confirm anything that affects a decision with the relevant UAE
            authority.
          </p>
          <p>
            © {new Date().getFullYear()} {SITE.company}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
