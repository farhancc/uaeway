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

/** Navy, to bookend the masthead: the ivory content sits between two dark
 *  bands rather than trailing off. */
export function Footer({ locale }: { locale: string }) {
  return (
    <footer className="mt-24 bg-ink">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-12 sm:grid-cols-3">
          <div>
            <p className="sign text-xl text-paper">{SITE.name}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-onink">
              Independent. Based in {SITE.area}.
            </p>
          </div>

          <nav aria-label="Services">
            <p className="sign text-[0.9375rem] text-brass">Services</p>
            <ul className="mt-4 space-y-2 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={href(locale, `/services/${s.slug}`)}
                    className="text-onink underline-offset-4 transition-colors hover:text-paper hover:underline"
                  >
                    {s.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Site">
            <p className="sign text-[0.9375rem] text-brass">Site</p>
            <ul className="mt-4 space-y-2 text-sm">
              {SITE_LINKS.map((l) => (
                <li key={l.path}>
                  <Link
                    href={href(locale, l.path)}
                    className="text-onink underline-offset-4 transition-colors hover:text-paper hover:underline"
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
        <div className="mt-14 space-y-3 border-t border-onink-rule pt-8 text-xs leading-relaxed text-onink/80">
          <p>
            Job listings are summarised from public sources and link to the original posting. Check
            the details with the employer before applying.{" "}
            <strong className="font-semibold text-brass">
              Never pay a fee to be given a job.
            </strong>
          </p>
          <p>
            Guides here are general information, not legal or immigration advice. Government fees
            and rules change — confirm anything that affects a decision with the relevant UAE
            authority.
          </p>
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
