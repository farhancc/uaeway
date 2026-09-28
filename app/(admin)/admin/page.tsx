import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { chatSavings } from "@/lib/admin/stats";
import { supabaseServer } from "@/lib/supabase/server";
import type { ReviewItem } from "./ReviewCard";
import { ReviewQueue } from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  await requireAdmin();
  const db = await supabaseServer();

  const [savings, jobs, articles, pendingJobs, pendingArticles] = await Promise.all([
    chatSavings(),
    db
      .from("jobs")
      .select("id, title, summary, company, emirate, source_name, source_url, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    db
      .from("articles")
      .select("id, title, body_md, kind, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    // The real totals. The page shows the oldest fifty, and a header counting
    // only those would hide a backlog of hundreds behind a reassuring number.
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("articles").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const waiting = (pendingJobs.count ?? 0) + (pendingArticles.count ?? 0);

  const items: ReviewItem[] = [
    ...((articles.data ?? []) as Record<string, string>[]).map((a) => ({
      id: a.id,
      table: "articles" as const,
      title: a.title,
      body: a.body_md ?? "",
      bodyField: "body_md" as const,
      meta: `${a.kind}  —  drafted ${new Date(a.created_at).toLocaleDateString("en-GB")}`,
    })),
    ...((jobs.data ?? []) as Record<string, string>[]).map((j) => ({
      id: j.id,
      table: "jobs" as const,
      title: j.title,
      body: j.summary ?? "",
      bodyField: "summary" as const,
      meta: [j.company, j.emirate, `from ${j.source_name}`].filter(Boolean).join("  —  "),
      sourceUrl: j.source_url,
    })),
  ];

  const error = jobs.error ?? articles.error;



  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink">
        Review queue{waiting > 0 && <span className="ml-2 text-ink-faint">{waiting}</span>}
      </h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Nothing here is public yet. Read it as a stranger would: if a fee, a date or a requirement
        looks invented, it probably is — reject it and say why.
        {waiting > items.length && (
          <>
            {" "}
            Showing the oldest {items.length}; clear them and the next batch appears.
          </>
        )}
      </p>

      {/* The one number that says whether the answer bank is earning its keep.
          Low share means people are asking things the bank does not cover, or
          the follow-up suggestions are not leading anywhere useful. */}
      {savings.share !== null && (
        <p className="field mt-6 px-4 py-3 text-sm text-ink-soft">
          <strong className="sign text-ink">{savings.share}%</strong> of chatbot replies in the
          last 7 days were answered without calling the AI ({savings.free} of {savings.total}).{" "}
          <Link href="/admin/answers" className="text-brass-deep underline underline-offset-4">
            Improve the answers
          </Link>
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-md border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load the queue: {error.message}
        </p>
      )}

      <div className="mt-6">
        {items.length === 0 && !error ? (
          <p className="rounded-md border border-rule bg-paper px-4 py-6 text-sm text-ink-soft">
            Queue is empty. The next ingest will fill it.
          </p>
        ) : (
          <ReviewQueue items={items} />
        )}
      </div>
    </div>
  );
}
