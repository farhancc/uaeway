import { href } from "@/lib/i18n";
import Link from "next/link";
import { getService } from "@/lib/services";
import type { Stage } from "@/lib/paths";

/**
 * Where you are, on the journey this page is a step of.
 *
 * The strip over a motorway tells you the next four exits and which one you are
 * taking; this does the same job for a process nobody can see the shape of. It
 * is the one thing the old design had no way to say — a service page could
 * describe attestation perfectly and still leave someone with no idea that it
 * comes after the offer and before the permit.
 *
 * Steps are stops. The ones behind you are filled, the one you are reading is
 * gold, the ones ahead are hollow. Each stop that belongs to a service we can
 * do is a link, so the strip is also the navigation between them.
 *
 * Every stop is labelled in words. A reader who cannot tell the three dot
 * states apart still gets the sequence and the position, because "Stage 2 of 4"
 * is written out above it.
 */
export function Gantry({ stage, locale }: { stage: Stage; locale: string }) {
  const { path, index } = stage;

  return (
    <nav aria-label={`Where this sits in: ${path.label}`} className="panel panel-tight">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span dir="rtl" className="arabic text-[0.75rem] leading-tight text-onink" aria-hidden="true">
          {path.labelAr}
        </span>
        <span className="sign text-[1.0625rem] text-white">{path.label}</span>
        <span className="ml-auto text-[0.8125rem] font-semibold text-glow">
          Stage {index + 1} of {path.steps.length}
        </span>
      </p>

      <ol className="gantry mt-4">
        {path.steps.map((step, i) => {
          const service = step.service ? getService(step.service) : undefined;
          const state = i < index ? "stop-done" : i === index ? "stop-here" : "";
          const label = service ? service.shortName : "Employer";

          return (
            <li key={step.text} className={`stop ${state}`}>
              {service && i !== index ? (
                <Link
                  href={href(locale, `/services/${service.slug}`)}
                  className="underline-offset-4 hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <span aria-current={i === index ? "step" : undefined}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
