"use client";

import { useState, useTransition } from "react";
import { purgeOldListings } from "../actions";

/**
 * The purge control.
 *
 * Deliberately awkward: it names the number it will delete, and it asks. This
 * is the only button in the admin that destroys rows a visitor might be
 * reading, and the weekly prune already handles the unremarkable case, so the
 * reason to reach for this is always "I know what I am doing".
 */
export function PurgeOld({ counts }: { counts: { days: number; count: number }[] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const run = (days: number, count: number) => {
    if (count === 0) return;
    const months = days / 30;
    if (
      !window.confirm(
        `Delete ${count} listing${count === 1 ? "" : "s"} older than ${months} month` +
          `${months === 1 ? "" : "s"}?\n\nThis cannot be undone, and it removes listings ` +
          `that are still live on the site.`,
      )
    ) {
      return;
    }

    start(async () => {
      try {
        const { deleted } = await purgeOldListings(days);
        setResult(`Deleted ${deleted} listing${deleted === 1 ? "" : "s"}.`);
      } catch (err) {
        setResult((err as Error).message);
      }
    });
  };

  return (
    <section className="field mt-10 px-4 py-5">
      <h2 className="sign text-sm text-ink">Purge old listings</h2>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        The weekly prune takes listings off the site at 45 days and deletes them at 60, but only
        once they are no longer live. This deletes by age regardless — including listings still on
        the site. Counted from when we took each one in, not the date the source claimed.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {counts.map(({ days, count }) => (
          <button
            key={days}
            type="button"
            disabled={pending || count === 0}
            onClick={() => run(days, count)}
            className="border-2 border-ink px-3 py-2 text-sm text-ink disabled:border-rule disabled:text-ink-soft"
          >
            {count === 0
              ? `Nothing older than ${days / 30} month${days === 30 ? "" : "s"}`
              : `Delete ${count} older than ${days / 30} month${days === 30 ? "" : "s"}`}
          </button>
        ))}
      </div>

      {pending && <p className="mt-3 text-sm text-ink-soft">Deleting…</p>}
      {result && !pending && <p className="mt-3 text-sm text-ink">{result}</p>}
    </section>
  );
}
