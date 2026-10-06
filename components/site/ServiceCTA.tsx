import Link from "next/link";
import { href } from "@/lib/i18n";
import type { Service } from "@/lib/services";

/**
 * The contextual call to action, as a sign.
 *
 * Takes the service the surrounding page is actually about, so a driver\'s job
 * page offers licence translation rather than a generic "contact us". It is a
 * panel because it is the one thing on the page that points somewhere — and
 * the chevron is on the plate, where a direction belongs, rather than appended
 * to the words.
 */
export function ServiceCTA({ service, locale }: { service: Service; locale: string }) {
  return (
    <aside className="panel">
      <span dir="rtl" className="arabic block text-left text-[0.8125rem] leading-tight text-onink" aria-hidden="true">
        {service.nameAr}
      </span>
      <h2 className="sign mt-1 text-[1.375rem] text-white">{service.name}</h2>
      <p className="mt-2.5 max-w-[58ch] text-[0.9375rem] leading-relaxed text-onink">
        {service.summary}
      </p>

      {/* One button, and it goes where the enquiry form is. White on green:
          the plate on a sign, not a third colour. */}
      <Link
        href={href(locale, `/services/${service.slug}`)}
        className="mt-5 inline-flex items-center gap-2.5 rounded-md bg-white px-4 py-2 text-[0.9375rem] font-semibold text-sign-deep transition-colors hover:bg-paper"
      >
        See how it works
        <span aria-hidden="true" className="chev" />
      </Link>
    </aside>
  );
}
