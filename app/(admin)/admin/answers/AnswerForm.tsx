"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnswer, updateAnswer } from "../actions";
import type { Answer } from "@/lib/chat/answers";
import { SERVICES } from "@/lib/services";

/** Writing or editing one canned answer. Shared by the new and edit pages. */
export function AnswerForm({
  answer,
  others,
}: {
  answer?: Answer & { active?: boolean };
  others: { slug: string; question: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          try {
            if (answer) await updateAnswer(answer.id, form);
            else await createAnswer(form);
            router.push("/admin/answers");
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="field mt-6 space-y-4 p-5"
    >
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-ink">
          Question
        </label>
        <input
          id="question"
          name="question"
          required
          defaultValue={answer?.question}
          maxLength={200}
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          This is the label on the suggestion chip, so write it the way a visitor would ask it.
        </p>
      </div>

      <div>
        <label htmlFor="answer_md" className="block text-sm font-medium text-ink">
          Answer
        </label>
        <textarea
          id="answer_md"
          name="answer_md"
          required
          rows={8}
          defaultValue={answer?.answer_md}
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm leading-relaxed"
        />
        <p className="mt-1 text-xs text-ink-faint">
          Markdown. This goes out word for word — no model rewrites it — so do not state a
          government fee you have not checked.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="service_slug" className="block text-sm font-medium text-ink">
            Service
          </label>
          <select
            id="service_slug"
            name="service_slug"
            defaultValue={answer?.service_slug ?? ""}
            className="mt-1 w-full rounded-[2px] border border-rule bg-paper px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {SERVICES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.shortName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="position" className="block text-sm font-medium text-ink">
            Position
          </label>
          <input
            id="position"
            name="position"
            type="number"
            min={0}
            defaultValue={answer?.position ?? 0}
            className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-ink-faint">Order within the service, lowest first.</p>
        </div>
      </div>

      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-ink">
          Matching keywords
        </label>
        <textarea
          id="keywords"
          name="keywords"
          rows={4}
          defaultValue={answer?.keywords.join("\n")}
          placeholder={"attest photocopy\ncopy attestation"}
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          One phrase per line. Two-word phrases work best — a single common word is deliberately
          not enough to serve a canned answer, so that nobody gets an answer to a question they
          did not ask.
        </p>
      </div>

      <div>
        <label htmlFor="follow_up_slugs" className="block text-sm font-medium text-ink">
          Suggest next
        </label>
        <select
          id="follow_up_slugs"
          name="follow_up_slugs"
          multiple
          size={6}
          defaultValue={answer?.follow_up_slugs}
          className="mt-1 w-full rounded-[2px] border border-rule bg-paper px-3 py-2 text-sm"
        >
          {others.map((other) => (
            <option key={other.slug} value={other.slug}>
              {other.question}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-faint">
          What someone asking this would want next. Every one they tap is answered without calling
          the AI, so this is where the saving comes from.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="is_opener" defaultChecked={answer?.is_opener} />
          Offer this before the visitor has typed anything
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="show_on_page"
            defaultChecked={answer?.show_on_page ?? true}
          />
          Show in the FAQ block on its service page
        </label>
        {answer && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="active" defaultChecked={answer.active ?? true} />
            Active
          </label>
        )}
      </div>

      {error && <p className="text-sm text-seal">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[2px] bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Saving…" : answer ? "Save changes" : "Add answer"}
      </button>
    </form>
  );
}
