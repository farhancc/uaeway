"use client";

import { useMemo, useState, useTransition } from "react";
import { approveMany } from "./actions";
import { ReviewCard, type ReviewItem } from "./ReviewCard";

/**
 * The queue, with selection.
 *
 * Bulk approval is a real tension with the reason this queue exists, so the
 * design is "approve what you have picked", never "approve everything". Ids are
 * sent explicitly: the page shows at most fifty of what may be hundreds, and a
 * button meaning "all pending" would publish rows nobody had seen.
 *
 * Jobs and articles are approved separately because they are different tables
 * with different rules — an article also needs a publish date — so the bar
 * offers one action per kind rather than hiding that behind a single count.
 */
export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const byTable = useMemo(() => {
    const jobs = items.filter((i) => i.table === "jobs");
    const articles = items.filter((i) => i.table === "articles");
    return {
      jobs: jobs.filter((i) => selected.has(i.id)).map((i) => i.id),
      articles: articles.filter((i) => selected.has(i.id)).map((i) => i.id),
      jobCount: jobs.length,
      articleCount: articles.length,
    };
  }, [items, selected]);

  const total = byTable.jobs.length + byTable.articles.length;

  function toggle(id: string, isSelected: boolean) {
    setDone(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAllShown() {
    setDone(null);
    setSelected(new Set(items.map((i) => i.id)));
  }

  function run() {
    setError(null);
    setDone(null);
    start(async () => {
      try {
        let approved = 0;
        if (byTable.jobs.length > 0) approved += (await approveMany("jobs", byTable.jobs)).approved;
        if (byTable.articles.length > 0) {
          approved += (await approveMany("articles", byTable.articles)).approved;
        }
        setSelected(new Set());
        setDone(`${approved} published. They are live on the site now.`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <>
      {items.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-rule bg-field px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={selected.size === items.length ? () => setSelected(new Set()) : selectAllShown}
              className="text-sm text-ink-soft underline underline-offset-2"
            >
              {selected.size === items.length ? "Clear selection" : `Select all ${items.length} shown`}
            </button>

            <button
              type="button"
              onClick={run}
              disabled={pending || total === 0}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
            >
              {pending ? "Publishing…" : `Approve ${total || ""} selected`.trim()}
            </button>

            {total > 0 && (
              <span className="text-xs text-ink-faint">
                Publishes immediately. Read what you are approving — nothing here has been seen by
                anyone yet.
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-seal">{error}</p>}
          {done && <p className="mt-2 text-sm text-brass-deep">{done}</p>}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <ReviewCard
            key={`${item.table}-${item.id}`}
            item={item}
            selected={selected.has(item.id)}
            onSelect={toggle}
          />
        ))}
      </div>
    </>
  );
}
