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
 * line running sign into gold is the logo's ribbon.
 *
 * Choosing a path is the one moment of motion on the site, and it answers a
 * tap rather than playing on its own.
 */
export function PathPicker({ locale }: { locale: string }) {
  const [openId, setOpenId] = useState(PATHS[0].id);
  const open = PATHS.find((p) => p.id === openId)!;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Your situation"
        className="flex flex-wrap gap-x-8 gap-y-4 border-b border-onink-rule pb-1"
      >
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
                "-mb-px border-b-[3px] pb-2.5 text-left transition-colors",
                selected ? "border-brass" : "border-transparent",
              ].join(" ")}
            >
              <span
                dir="rtl"
                aria-hidden="true"
                className={[
                  "arabic block text-left text-[0.6875rem] leading-tight transition-colors",
                  selected ? "text-brass" : "text-onink/55",
                ].join(" ")}
              >
                {path.labelAr}
              </span>
              <span
                className={[
                  "sign block text-[1.0625rem] transition-colors",
                  selected ? "text-paper" : "text-onink hover:text-paper",
                ].join(" ")}
              >
                {path.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* The chosen route, on its own board. Keyed on the path so the steps
          re-run their reveal when someone picks a different one — the motion
          is what shows that the answer changed. */}
      <div key={open.id} className="panel mt-8">
        <p className="here">
          <span dir="rtl" className="arabic ml-0 text-[0.75rem] text-glow/90" aria-hidden="true">
            أنت هنا
          </span>
          You are here
        </p>

        <p className="mt-3 max-w-[60ch] leading-relaxed text-onink">{open.intro}</p>

        <ol className="steps route mt-7 max-w-[58ch] text-white">
        {open.steps.map((step) => {
          const service = step.service ? getService(step.service) : undefined;
          return (
            <li key={step.text} className="relative pb-6 last:pb-0">
              <span
                aria-hidden="true"
                className={service ? "waypoint" : "waypoint waypoint-theirs"}
              />
              <p className="leading-relaxed text-white">{step.text}</p>
              {service ? (
                <Link
                  href={href(locale, `/services/${service.slug}`)}
                  className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-glow underline underline-offset-4 hover:text-white"
                >
                  We can help with this: {service.shortName}
                  <span aria-hidden="true" className="chev" />
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
        <p className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/20 pt-4 text-xs text-onink">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-brass" />
            We can help with this
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white/55"
            />
            You or your employer do this
          </span>
        </p>
      </div>
    </div>
  );
}
