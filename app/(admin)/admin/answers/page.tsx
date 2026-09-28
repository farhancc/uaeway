import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { answerUses } from "@/lib/admin/stats";
import { listAnswers } from "@/lib/chat/answers";
import { AnswerRow, type AnswerSummary } from "./AnswerRows";

export const dynamic = "force-dynamic";

export default async function AnswersPage() {
  await requireAdmin();

  // An answer nobody reaches is either badly worded or missing from the
  // follow-ups, so the list is only useful next to how often each was served.
  let raw: Awaited<ReturnType<typeof listAnswers>> = [];
  let counts = new Map<string, number>();
  let loadError: string | null = null;
  try {
    [raw, counts] = await Promise.all([listAnswers(), answerUses()]);
  } catch (err) {
    loadError = (err as Error).message;
  }

  const questionBySlug = new Map(raw.map((a) => [a.slug, a.question]));
  // Every slug some other live answer points at. What is missing from this set,
  // and is not an opener, cannot be reached by tapping at all.
  const linked = new Set(raw.filter((a) => a.active).flatMap((a) => a.follow_up_slugs));

  const rows: AnswerSummary[] = raw.map((a) => ({
    ...a,
    uses: counts.get(a.slug) ?? 0,
    suggests: a.follow_up_slugs
      .map((slug) => questionBySlug.get(slug))
      .filter((q): q is string => Boolean(q)),
    unreachable: !a.is_opener && !linked.has(a.slug),
  }));

  const live = rows.filter((r) => r.active).length;
  const openers = rows.filter((r) => r.active && r.is_opener).length;
  const stranded = rows.filter((r) => r.active && r.unreachable).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="sign text-xl text-ink">Answers</h1>
        <Link
          href="/admin/answers/new"
          className="ml-auto rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper"
        >
          Add answer
        </Link>
      </div>

      <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
        What the chatbot can answer without calling the AI, and the FAQ blocks on the service
        pages. Every question someone reaches from a suggestion costs nothing, so the follow-ups
        you set on each answer are what keeps the bill down.
      </p>

      {loadError && (
        <p className="mt-6 rounded-md border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load answers: {loadError}
        </p>
      )}

      {rows.length === 0 && !loadError ? (
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
                    Suggests next
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

          <p className="mt-3 max-w-[70ch] text-xs leading-relaxed text-ink-faint">
            {live} live, {openers} offered before the visitor types.
            {openers === 0 && " With no openers the chat starts with no suggestions at all."}
            {stranded > 0 &&
              ` ${stranded} can only be reached by typing the question — put them in another
                answer's "Suggest next", or make them openers, and they become free to reach.`}
          </p>
        </>
      )}
    </div>
  );
}
