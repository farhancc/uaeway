"use client";

import { useState } from "react";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { PATHS } from "@/lib/paths";
import { getService } from "@/lib/services";

/**
 * The hero.
 *
 * Nearly everyone who contacts us knows what they want and not what order it
 * happens in, so the most useful thing the page can do is show them the
 * sequence for their own situation. Opening a path is the one moment of motion
 * on the page, and it answers a tap.
 */
export function PathPicker({ locale }: { locale: string }) {
  const [openId, setOpenId] = useState(PATHS[0].id);
  const open = PATHS.find((p) => p.id === openId)!;

  return (
    <div className="field">
      <div className="grid sm:grid-cols-2">
        {PATHS.map((path, i) => {
          const isOpen = path.id === openId;
          return (
            <button
              key={path.id}
              type="button"
              aria-expanded={isOpen}
              aria-controls="path-steps"
              onClick={() => setOpenId(path.id)}
              className={[
                "flex items-baseline gap-3 border-rule px-4 py-4 text-left transition-colors",
                // A form grid: cells divide, they do not float. One column on a
                // phone, two on a wider screen, so the dividing rules differ.
                i < PATHS.length - 1 ? "border-b" : "",
                i >= 2 ? "sm:border-b-0" : "",
                i % 2 === 0 ? "sm:border-r" : "",
                isOpen ? "bg-ink text-paper" : "hover:bg-field",
              ].join(" ")}
            >
              <span className="sign text-[0.9375rem] leading-tight sm:text-base">{path.label}</span>
              <span
                aria-hidden="true"
                className={`arabic ml-auto shrink-0 whitespace-nowrap text-sm ${
                  isOpen ? "text-paper/70" : "text-ink-faint"
                }`}
              >
                {path.labelAr}
              </span>
            </button>
          );
        })}
      </div>

      <div id="path-steps" className="border-t border-rule bg-paper px-4 py-5 sm:px-6">
        <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-soft">{open.intro}</p>

        <ol key={open.id} className="steps mt-5 space-y-0">
          {open.steps.map((step, i) => {
            const service = step.service ? getService(step.service) : undefined;
            return (
              <li
                key={step.text}
                className="flex gap-4 border-t border-rule py-3.5 first:border-t-0 first:pt-0"
              >
                <span className="sign mt-0.5 w-5 shrink-0 text-sm text-seal">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[0.9375rem] leading-relaxed text-ink">{step.text}</p>
                  {service ? (
                    <Link
                      href={href(locale, `/services/${service.slug}`)}
                      className="mt-1 inline-block text-sm font-medium text-go underline underline-offset-2 hover:text-go-dark"
                    >
                      We do this: {service.shortName}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm text-ink-faint">Your employer does this part.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
