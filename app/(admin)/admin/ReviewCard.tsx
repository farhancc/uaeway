"use client";

import { useState, useTransition } from "react";
import { approve, reject, saveEdit } from "./actions";

export interface ReviewItem {
  id: string;
  table: "jobs" | "articles";
  title: string;
  body: string;
  bodyField: "summary" | "body_md";
  meta: string;
  sourceUrl?: string | null;
}

/** One pending item. Editing before approving is the common case — the draft is
 *  usually nearly right — so the text is directly editable rather than hidden
 *  behind an edit mode. */
export function ReviewCard({ item }: { item: ReviewItem }) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [pending, start] = useTransition();

  const edited = title !== item.title || body !== item.body;

  return (
    <article className="rounded-md border border-rule bg-paper p-4">
      <p className="text-xs text-ink-faint">{item.meta}</p>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Title"
        className="mt-2 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-base font-semibold text-ink hover:border-rule focus:border-rule focus:bg-field"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Body"
        rows={item.bodyField === "body_md" ? 10 : 4}
        className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-sm leading-relaxed text-ink-soft hover:border-rule focus:border-rule focus:bg-field"
      />

      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-go hover:underline"
        >
          Open the source listing
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (edited) {
                await saveEdit(item.table, item.id, {
                  title,
                  [item.bodyField]: body,
                });
              }
              await approve(item.table, item.id);
            })
          }
          className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {edited ? "Save and publish" : "Publish"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setRejecting((v) => !v)}
          className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft"
        >
          Reject
        </button>

        {edited && <span className="text-xs text-ink-faint">edited</span>}
      </div>

      {rejecting && (
        <div className="mt-2 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why? (this is how we fix the prompts)"
            className="flex-1 rounded-md border border-rule px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => start(async () => reject(item.table, item.id, reason))}
            className="rounded-md bg-seal px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
    </article>
  );
}
