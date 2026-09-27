"use client";

import { useState, useTransition } from "react";
import { importArticles, importJobs, type ImportResult } from "../actions";

type Kind = "jobs" | "articles";

/** Shown in the box so the shape is in front of you while you write, rather
 *  than in documentation you would have to go and find. */
const EXAMPLE: Record<Kind, string> = {
  jobs: `[
  {
    "title": "Registered Nurse",
    "company": "Emirates Hospital",
    "applyLink": "https://careers.example.ae/nurse-123",
    "emirate": "Dubai",
    "category": "Healthcare",
    "summary": "DHA-licensed nurse for a private clinic in Jumeirah.",
    "documentsNeeded": ["DHA licence", "Attested degree"]
  }
]`,
  articles: `[
  {
    "kind": "blog",
    "title": "What attestation actually costs in 2026",
    "excerpt": "Why nobody publishes a single figure.",
    "bodyMd": "## The short answer\\n\\nIt depends on the issuing country…",
    "serviceSlug": "attestation",
    "sources": ["MoFAIC fee schedule | https://www.mofa.gov.ae/"]
  }
]`,
};

const FIELDS: Record<Kind, { required: string; optional: string }> = {
  jobs: {
    required: "title, company, applyLink",
    optional: "emirate, category, summary, documentsNeeded[], sourceName, postedAt",
  },
  articles: {
    required: "title, bodyMd",
    optional: 'kind ("blog" | "guide" | "news"), excerpt, locale, serviceSlug, sources[]',
  },
};

export function ImportForm() {
  const [kind, setKind] = useState<Kind>("jobs");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const run = kind === "jobs" ? importJobs : importArticles;
        const outcome = await run(text);
        setResult(outcome);
        // Only clear on a clean run — leaving the paste in place is the whole
        // point when rows need fixing.
        if (outcome.errors.length === 0) setText("");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2" role="tablist" aria-label="What to import">
        {(["jobs", "articles"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={kind === option}
            onClick={() => {
              setKind(option);
              setResult(null);
              setError(null);
            }}
            className={
              kind === option
                ? "rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
                : "rounded-md border border-rule px-4 py-2 text-sm text-ink-soft hover:border-ink"
            }
          >
            {option === "jobs" ? "Jobs" : "Posts"}
          </button>
        ))}
      </div>

      <div className="field mt-4 p-4">
        <p className="text-xs leading-relaxed text-ink-faint">
          <strong className="font-medium text-ink-soft">Required:</strong> {FIELDS[kind].required}
          <br />
          <strong className="font-medium text-ink-soft">Optional:</strong> {FIELDS[kind].optional}
        </p>

        <label htmlFor="payload" className="mt-3 block text-sm font-medium text-ink">
          JSON
        </label>
        <textarea
          id="payload"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={16}
          spellCheck={false}
          placeholder={EXAMPLE[kind]}
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 font-mono text-xs leading-relaxed"
        />
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">
          One object or an array of them.{" "}
          <strong className="font-medium text-brass-deep">
            These go live immediately — they do not pass through the review queue.
          </strong>{" "}
          Validation checks that a row is well formed, not that it is true, so read the paste
          before you send it.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
          >
            {pending ? "Publishing…" : `Publish ${kind === "jobs" ? "jobs" : "posts"}`}
          </button>
          <button
            type="button"
            onClick={() => setText(EXAMPLE[kind])}
            className="text-sm text-ink-soft underline underline-offset-2"
          >
            Paste the example
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-seal/30 bg-seal/5 px-3 py-2 text-sm text-seal">
            {error}
          </p>
        )}

        {result && result.errors.length > 0 && (
          <div className="mt-3 rounded-md border border-seal/30 bg-seal/5 px-3 py-2">
            <p className="text-sm font-medium text-seal">
              Nothing was imported. {result.errors.length}{" "}
              {result.errors.length === 1 ? "row needs" : "rows need"} fixing first:
            </p>
            <ul className="mt-1.5 space-y-1">
              {result.errors.map((rowError) => (
                <li key={rowError.row} className="text-xs leading-relaxed text-seal">
                  <span className="font-medium">Row {rowError.row}:</span> {rowError.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result && result.errors.length === 0 && (
          <p className="mt-3 rounded-md border border-brass/40 bg-brass/5 px-3 py-2 text-sm text-brass-deep">
            Published {result.imported}
            {result.duplicates > 0 && `, skipped ${result.duplicates} already held`}. Live on the
            site now.
          </p>
        )}
      </div>
    </div>
  );
}
