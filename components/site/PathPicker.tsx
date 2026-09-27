"use client";

import { useState } from "react";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { PATHS } from "@/lib/paths";
import { getService } from "@/lib/services";

/**
 * The hero, sitting on the navy.
 *
 * Nearly everyone who contacts us knows what they want and not what order it
 * happens in, so the most useful thing the page can do is lay out the sequence
 * for their situation. The paths are tabs with a brass underline rather than
 * boxes — the selection is shown by a mark, not by a container.
 */
export function PathPicker({ locale }: { locale: string }) {
  const [openId, setOpenId] = useState(PATHS[0].id);
  const open = PATHS.find((p) => p.id === openId)!;

  return (
    <div>
      <div role="tablist" aria-label="Your situation" className="flex flex-wrap gap-x-7 gap-y-2">
        {PATHS.map((path) => {
          const selected = path.id === openId;
          return (
            <button
              key={path.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setOpenId(path.id)}
              className={[
                "border-b-2 pb-2 text-left text-[0.9375rem] transition-colors",
                selected
                  ? "border-brass text-paper"
                  : "border-transparent text-onink hover:text-paper",
              ].join(" ")}
            >
              {path.label}
            </button>
          );
        })}
      </div>

      <p className="mt-7 max-w-[62ch] leading-relaxed text-onink">{open.intro}</p>

      <ol key={open.id} className="steps mt-7 max-w-[62ch]">
        {open.steps.map((step, i) => {
          const service = step.service ? getService(step.service) : undefined;
          return (
            <li
              key={step.text}
              className="flex gap-5 border-t border-onink-rule py-4 first:border-t-0 first:pt-0"
            >
              <span className="numeral mt-0.5 w-4 shrink-0 text-base text-brass">{i + 1}</span>
              <div className="min-w-0">
                <p className="leading-relaxed text-paper">{step.text}</p>
                {service ? (
                  <Link
                    href={href(locale, `/services/${service.slug}`)}
                    className="mt-1.5 inline-block text-sm text-brass underline underline-offset-4 hover:text-paper"
                  >
                    We handle this: {service.shortName}
                  </Link>
                ) : (
                  <p className="mt-1.5 text-sm text-onink/70">Your employer handles this part.</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
