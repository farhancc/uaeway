"use client";

import { useState, useTransition } from "react";
import { approveProposal, rejectProposal } from "../actions";

/**
 * One suggestion, with its evidence.
 *
 * The evidence is shown before the change rather than behind a toggle: the
 * question worth asking of any of these is "did people really ask this?", and
 * hiding the answer to that behind a click is how proposals get approved
 * without being read.
 */
export function ProposalCard({
  id,
  title,
  reason,
  evidence,
  detail,
  applicable,
}: {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  detail: string[];
  applicable: boolean;
}) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return <p className="rounded-md border border-rule bg-field px-4 py-3 text-sm text-ink-soft">{done}</p>;
  }

  return (
    <article className="rounded-md border border-rule bg-field p-4">
      <h2 className="sign text-sm text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{reason}</p>

      {detail.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-brass pl-3">
          {detail.map((line, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink">
              {line}
            </li>
          ))}
        </ul>
      )}

      {evidence.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-ink-faint">What people actually typed</p>
          <ul className="mt-1 space-y-0.5">
            {evidence.map((line, i) => (
              <li key={i} className="text-xs italic text-ink-soft">
                &ldquo;{line}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        {applicable && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                try {
                  const result = await approveProposal(id);
                  setDone(
                    result.canPublish
                      ? "Added to the draft. Publish it from the flow when you are happy."
                      : "Added to the draft, but the flow has errors to fix before it can be published.",
                  );
                } catch (err) {
                  setError((err as Error).message);
                }
              })
            }
            className="rounded bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            Add to the draft
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await rejectProposal(id);
                setDone(applicable ? "Rejected. It will not be suggested again." : "Dismissed.");
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="rounded border border-rule px-3 py-1.5 text-xs text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"
        >
          {applicable ? "No thanks" : "Dismiss"}
        </button>
      </div>
    </article>
  );
}
