import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AnswerRow, type AnswerSummary } from "./AnswerRows";

export const dynamic = "force-dynamic";

export default async function AnswersPage() {
  await requireAdmin();
  const db = await supabaseServer();

  const [answers, uses] = await Promise.all([
    db
      .from("answers")
      .select("id, slug, question, service_slug, is_opener, active, position")
      .order("active", { ascending: false })
      .order("service_slug")
      .order("position"),
    // How often each answer has actually been served. An answer nobody reaches
    // is either badly worded or missing from the follow-ups.
    db.from("chat_messages").select("answer_slug").not("answer_slug", "is", null),
  ]);

  const counts = new Map<string, number>();
  for (const row of (uses.data ?? []) as { answer_slug: string }[]) {
    counts.set(row.answer_slug, (counts.get(row.answer_slug) ?? 0) + 1);
  }

  const rows: AnswerSummary[] = (
    (answers.data ?? []) as Omit<AnswerSummary, "uses">[]
  ).map((a) => ({ ...a, uses: counts.get(a.slug) ?? 0 }));

  const live = rows.filter((r) => r.active).length;
  const openers = rows.filter((r) => r.active && r.is_opener).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="sign text-xl text-ink">Answers</h1>
        <Link
          href="/admin/answers/new"
          className="ml-auto rounded-[2px] bg-ink px-3 py-1.5 text-sm font-semibold text-paper"
        >
          Add answer
        </Link>
      </div>

      <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
        What the chatbot can answer without calling the AI, and the FAQ blocks on the service
        pages. Every question someone reaches from a suggestion costs nothing, so the follow-ups
        you set on each answer are what keeps the bill down.
      </p>

      {answers.error && (
        <p className="mt-6 rounded-[2px] border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load answers: {answers.error.message}
        </p>
      )}

      {rows.length === 0 && !answers.error ? (
        <p className="field mt-6 px-4 py-6 text-sm leading-relaxed text-ink-soft">
          The bank is empty. Run <code>npm run seed:answers</code> to fill it from the FAQs and
          paths already written, then edit them here.
        </p>
      ) : (
        <>
          <div className="field mt-6 overflow-x-auto px-4 py-2">
            <table className="w-full">
              <caption className="sr-only">Canned answers</caption>
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                    Question
                  </th>
                  <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                    Service
                  </th>
                  <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                    Served
                  </th>
                  <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                    Status
                  </th>
                  <th scope="col" className="py-2 text-right text-xs font-medium text-ink-faint">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((answer) => (
                  <AnswerRow key={answer.id} answer={answer} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            {live} live, {openers} offered before the visitor types.
            {openers === 0 && " With no openers the chat starts with no suggestions at all."}
          </p>
        </>
      )}
    </div>
  );
}
