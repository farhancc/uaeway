"use client";

import { useState, useTransition } from "react";
import { deleteJobBoard, setJobBoardActive } from "../actions";
import type { JobBoardRow } from "@/lib/supabase/types";

const ATS_LABEL = { greenhouse: "Greenhouse", lever: "Lever" } as const;

function boardUrl(board: JobBoardRow): string {
  return board.ats === "greenhouse"
    ? `https://boards.greenhouse.io/${board.slug}`
    : `https://jobs.lever.co/${board.slug}`;
}

export function AddBoard() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const el = event.currentTarget;
        setError(null);
        start(async () => {
          try {
            const { addJobBoard } = await import("../actions");
            await addJobBoard(form);
            el.reset();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="field mt-6 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_auto]">
        <div>
          <label htmlFor="ats" className="block text-xs font-medium text-ink-faint">
            Where
          </label>
          <select
            id="ats"
            name="ats"
            className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>
        </div>

        <div>
          <label htmlFor="slug" className="block text-xs font-medium text-ink-faint">
            Board slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            placeholder="careem"
            className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-xs font-medium text-ink-faint">
            Employer
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Careem"
            className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
          >
            {pending ? "Checking…" : "Add board"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        The slug is the part of the board&apos;s own URL that names the employer —{" "}
        <code>careem</code> from <code>boards.greenhouse.io/careem</code>. We check it against the
        live board before saving, so a typo fails here rather than quietly returning nothing every
        night.
      </p>

      {error && <p className="mt-2 text-sm text-seal">{error}</p>}
    </form>
  );
}

export function BoardRow({ board }: { board: JobBoardRow }) {
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
      <td className="py-2.5 pr-3">
        <a
          href={boardUrl(board)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ink underline-offset-2 hover:underline"
        >
          {board.name}
        </a>
        <span className="mt-0.5 block text-xs text-ink-faint">
          {ATS_LABEL[board.ats]} · {board.slug}
        </span>
      </td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft">
        {board.last_run_at ? new Date(board.last_run_at).toLocaleDateString("en-GB") : "never"}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap gap-1.5">
          {/* A board that has stopped answering is worth seeing before you
              wonder why a familiar employer went quiet. */}
          {board.last_error && (
            <span
              title={board.last_error}
              className="rounded-md border border-seal/30 bg-seal/5 px-1.5 py-0.5 text-xs text-seal"
            >
              Failing
            </span>
          )}
          <span
            className={
              board.active
                ? "rounded-md border border-brass/40 bg-brass/5 px-1.5 py-0.5 text-xs text-brass-deep"
                : "rounded-md border border-rule px-1.5 py-0.5 text-xs text-ink-faint"
            }
          >
            {board.active ? "Running" : "Paused"}
          </span>
        </div>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setJobBoardActive(board.id, !board.active))}
            className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50"
          >
            {board.active ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteJobBoard(board.id))}
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
