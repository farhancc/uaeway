"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { href } from "@/lib/i18n";

const NAV = [
  { path: "/jobs", label: "Jobs" },
  { path: "/services", label: "Services" },
  { path: "/guides", label: "Guides" },
  { path: "/blog", label: "Blog" },
  { path: "/about", label: "About" },
];

/** Ignore sub-pixel jitter so a resting finger does not flap the row. */
const THRESHOLD = 6;
/** Below this the nav is always shown — at the top of a page there is nothing
 *  to reclaim, and hiding it there just looks broken. */
const ALWAYS_SHOW_ABOVE = 24;

/**
 * The second row of the mobile header: it folds away as you read down the page
 * and comes back the moment you scroll up, while the logo and the WhatsApp
 * button above it never move.
 *
 * One `nav` element, not two. It wraps to its own row on a phone and sits
 * inline beside the logo from `sm` up, where the `sm:` classes also pin it
 * open — so the scroll state simply stops mattering on a laptop.
 */
export function SiteNav({ locale }: { locale: string }) {
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    let last = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      if (y <= ALWAYS_SHOW_ABOVE) setFolded(false);
      else if (y > last + THRESHOLD) setFolded(true);
      else if (y < last - THRESHOLD) setFolded(false);
      last = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main"
      // A keyboard user tabbing in must not land inside a folded row, so
      // focus reopens it.
      onFocus={() => setFolded(false)}
      className={[
        "order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 overflow-hidden",
        "text-[0.9375rem] transition-all duration-200 ease-out",
        folded ? "max-h-0 pb-0 opacity-0" : "max-h-16 pb-1 opacity-100",
        // From sm up the row is inline and permanently open.
        "sm:order-2 sm:ml-auto sm:max-h-none sm:w-auto sm:flex-nowrap sm:pb-0 sm:opacity-100",
      ].join(" ")}
    >
      {NAV.map((item) => (
        <Link
          key={item.path}
          href={href(locale, item.path)}
          className="whitespace-nowrap text-ink-soft underline-offset-8 transition-colors hover:text-teal-deep hover:underline hover:decoration-brass"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
