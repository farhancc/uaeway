"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setAnswerActive, setAnswerOpener } from "../actions";

export interface AnswerSummary {
  id: string;
  slug: string;
  question: string;
  service_slug: string | null;
  is_opener: boolean;
  active: boolean;
  uses: number;
  /** The chips this answer offers next, as their questions. */
  suggests: string[];
  /** No opener flag and nothing links here, so the only way in is to type it —
   *  and a typed question is the only input that can reach the model. */
  unreachable: boolean;
}

export function AnswerRow({ answer }: { answer: AnswerSummary }) {
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
        <Link
          href={`/admin/answers/${answer.id}`}
          className="text-sm text-ink underline-offset-2 hover:underline"
        >
          {answer.question}
        </Link>
        <span className="mt-0.5 block text-xs text-ink-faint">{answer.slug}</span>
      </td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft">{answer.service_slug ?? "—"}</td>
      <td className="py-2.5 pr-3">
        {answer.suggests.length === 0 ? (
          <span className="text-xs text-ink-faint">
            None — the chat falls back to this service, then the openers
          </span>
        ) : (
          <ul className="space-y-0.5">
            {answer.suggests.map((question) => (
              <li key={question} className="text-xs leading-snug text-ink-soft">
                {question}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft" title="Times served in a conversation">
        {answer.uses}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap gap-1.5">
          {answer.is_opener && (
            <span className="rounded-md border border-rule px-1.5 py-0.5 text-xs text-ink-faint">
              Opener
            </span>
          )}
          {answer.unreachable && answer.active && (
            <span
              title="Not an opener and no other answer suggests it, so the only way anyone reaches this is by typing the question — which is what costs a model call."
              className="rounded-md border border-seal/30 bg-seal/5 px-1.5 py-0.5 text-xs text-seal"
            >
              No way in
            </span>
          )}
          <span
            className={
              answer.active
                ? "rounded-md border border-brass/40 bg-brass/5 px-1.5 py-0.5 text-xs text-brass-deep"
                : "rounded-md border border-rule px-1.5 py-0.5 text-xs text-ink-faint"
            }
          >
            {answer.active ? "Live" : "Retired"}
          </span>
        </div>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setAnswerOpener(answer.id, !answer.is_opener))}
            className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50"
          >
            {answer.is_opener ? "Not an opener" : "Make opener"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setAnswerActive(answer.id, !answer.active))}
            className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50"
          >
            {answer.active ? "Retire" : "Restore"}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-seal">{error}</p>}
      </td>
    </tr>
  );
}
