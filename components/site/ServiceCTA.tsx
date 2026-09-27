import Link from "next/link";
import { href } from "@/lib/i18n";
import type { Service } from "@/lib/services";

/**
 * The contextual call to action. Takes the service the surrounding page is
 * actually about, so a driver's job page offers licence translation rather than
 * a generic "contact us".
 */
export function ServiceCTA({ service, locale }: { service: Service; locale: string }) {
  return (
    <aside className="field p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="sign text-lg text-ink">{service.name}</h2>
        <span aria-hidden="true" className="arabic ml-auto text-sm text-ink-faint">
          {service.nameAr}
        </span>
      </div>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">{service.summary}</p>

      {/* One button, and it goes where the enquiry form is. */}
      <div className="mt-4">
        <Link
          href={href(locale, `/services/${service.slug}`)}
          className="inline-block rounded-md bg-go px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-go-dark"
        >
          See how it works
        </Link>
      </div>
    </aside>
  );
}
