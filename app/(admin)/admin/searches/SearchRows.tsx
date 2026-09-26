"use client";

import { useState, useTransition } from "react";
import { addJobSearch, deleteJobSearch, setJobSearchActive } from "../actions";
import type { JobSearchRow } from "@/lib/supabase/types";

/** Add a search. Kept separate so a failure here does not clear the list. */
export function AddSearch() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const element = event.currentTarget;
        setError(null);
        start(async () => {
          try {
            await addJobSearch(form);
            element.reset();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="field mt-6 p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="keywords" className="block text-xs text-ink-faint">
            Keyword
          </label>
          <input
            id="keywords"
            name="keywords"
            required
            placeholder="welder"
            className="mt-1 rounded-[2px] border border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-xs text-ink-faint">
            Location
          </label>
          <input
            id="location"
            name="location"
            required
            placeholder="Abu Dhabi"
            className="mt-1 rounded-[2px] border border-rule px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[2px] bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add search"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-seal">{error}</p>}
    </form>
  );
}

export function SearchRow({ search }: { search: JobSearchRow }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await action();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="py-2.5 pr-3 text-sm text-ink">{search.keywords}</td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft">{search.location}</td>
      <td className="py-2.5 pr-3 text-xs text-ink-faint">
        {search.last_run_at
          ? new Date(search.last_run_at).toLocaleDateString("en-GB")
          : "Not run yet"}
      </td>
      <td className="py-2.5 pr-3">
        <span
          className={
            search.active
              ? "rounded-[2px] border border-go/40 bg-go/5 px-1.5 py-0.5 text-xs text-go-dark"
              : "rounded-[2px] border border-rule px-1.5 py-0.5 text-xs text-ink-faint"
          }
        >
          {search.active ? "Running" : "Paused"}
        </span>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setJobSearchActive(search.id, !search.active))}
            className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50"
          >
            {search.active ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteJobSearch(search.id))}
            className="text-sm text-seal underline underline-offset-2 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-seal">{error}</p>}
      </td>
    </tr>
  );
}
