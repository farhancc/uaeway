import Link from "next/link";
import { href } from "@/lib/i18n";
import type { Service } from "@/lib/services";
import { SITE, whatsappLink } from "@/lib/site";

/**
 * The contextual call to action. Takes the service the surrounding page is
 * actually about, so a driver's job page offers licence translation rather than
 * a generic "contact us".
 */
export function ServiceCTA({
  service,
  locale,
  context,
}: {
  service: Service;
  locale: string;
  context?: string;
}) {
  const message = context
    ? `Hello — I saw "${context}" on ${SITE.name} and I need help with ${service.shortName.toLowerCase()}.`
    : `Hello — I need help with ${service.shortName.toLowerCase()}.`;
  const wa = whatsappLink(message);

  return (
    <aside className="field p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="sign text-lg text-ink">{service.name}</h2>
        <span aria-hidden="true" className="arabic ml-auto text-sm text-ink-faint">
          {service.nameAr}
        </span>
      </div>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">{service.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-go px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-go-dark"
          >
            Ask on WhatsApp
          </a>
        )}
        <Link
          href={href(locale, `/services/${service.slug}`)}
          className="rounded-md border border-ink px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
        >
          See how it works
        </Link>
      </div>
    </aside>
  );
}
