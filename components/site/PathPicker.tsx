"use client";

import { useState } from "react";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { PATHS } from "@/lib/paths";
import { getService } from "@/lib/services";

/**
 * The route.
 *
 * Almost everyone who contacts us knows what they want and not what order it
 * happens in, so the most useful thing the page can do is lay the sequence out
 * and say plainly which parts are ours. The waypoint carries that: filled
 * where we can help, hollow where it is yours or your employer's to do. The
 * line running teal into gold is the logo's ribbon.
 *
 * Choosing a path is the one moment of motion on the site, and it answers a
 * tap rather than playing on its own.
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

      <ol key={open.id} className="steps route mt-8 max-w-[58ch]">
        {open.steps.map((step) => {
          const service = step.service ? getService(step.service) : undefined;
          return (
            <li key={step.text} className="relative pb-7 last:pb-0">
              <span
                aria-hidden="true"
                className={service ? "waypoint" : "waypoint waypoint-theirs"}
              />
              <p className="leading-relaxed text-paper">{step.text}</p>
              {service ? (
                <Link
                  href={href(locale, `/services/${service.slug}`)}
                  className="mt-1.5 inline-block text-sm text-brass underline underline-offset-4 hover:text-glow"
                >
                  We can help with this: {service.shortName}
                </Link>
              ) : (
                <p className="mt-1.5 text-sm text-onink/70">Your employer does this part.</p>
              )}
            </li>
          );
        })}
      </ol>

      {/* The waypoints mean something, so they get a legend rather than
          leaving people to infer it from two shades of dot. */}
      <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-onink/70">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-teal" />
          We can help with this
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-onink-rule bg-ink"
          />
          You or your employer do this
        </span>
      </p>
    </div>
  );
}
