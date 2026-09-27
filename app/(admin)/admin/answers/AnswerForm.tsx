"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnswer, updateAnswer } from "../actions";
import type { Answer } from "@/lib/chat/answers";
import { SERVICES } from "@/lib/services";

/** As many follow-ups as the server action stores. */
const MAX_FOLLOW_UPS = 6;

/** Writing or editing one canned answer. Shared by the new and edit pages. */
export function AnswerForm({
  answer,
  others,
}: {
  answer?: Answer & { active?: boolean };
  others: { slug: string; question: string; service_slug: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [followUps, setFollowUps] = useState<string[]>(answer?.follow_up_slugs ?? []);

  // Grouped by service, because that is how you think about what someone would
  // ask next — and with 24 answers and rising, an ungrouped list is unreadable.
  const grouped = SERVICES.map((service) => ({
    name: service.shortName,
    options: others.filter((o) => o.service_slug === service.slug),
  }))
    .concat({ name: "No service", options: others.filter((o) => !o.service_slug) })
    .filter((g) => g.options.length > 0);

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
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm leading-relaxed"
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
            className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          One phrase per line. Two-word phrases work best — a single common word is deliberately
          not enough to serve a canned answer, so that nobody gets an answer to a question they
          did not ask.
        </p>
      </div>

      {/* Checkboxes, not a multi-select. This is the one control that decides
          whether the next turn is free, and a multi-select hides what is
          chosen behind a scrollbar and loses the lot on a stray click. */}
      <fieldset>
        <legend className="block text-sm font-medium text-ink">
          Suggest next{" "}
          <span className="font-normal text-ink-faint">
            ({followUps.length} of {MAX_FOLLOW_UPS})
          </span>
        </legend>
        <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-ink-faint">
          The chips offered after this answer. Every one a visitor taps is served from the bank
          without calling the AI, so this is where the saving comes from. The chat shows the first
          three it has not already used.
        </p>

        {grouped.length === 0 ? (
          <p className="mt-2 text-xs text-ink-faint">
            Nothing else in the bank yet — add a second answer and you can chain them.
          </p>
        ) : (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-rule bg-paper px-3 py-2">
            {grouped.map((group) => (
              <div key={group.name} className="py-1">
                <p className="text-xs font-medium text-ink-faint">{group.name}</p>
                {group.options.map((other) => {
                  const checked = followUps.includes(other.slug);
                  const full = followUps.length >= MAX_FOLLOW_UPS;
                  return (
                    <label
                      key={other.slug}
                      className={`flex items-start gap-2 py-1 text-sm ${
                        !checked && full ? "text-ink-faint" : "text-ink-soft"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="follow_up_slugs"
                        value={other.slug}
                        checked={checked}
                        disabled={!checked && full}
                        onChange={(event) =>
                          setFollowUps((prev) =>
                            event.target.checked
                              ? [...prev, other.slug]
                              : prev.filter((s) => s !== other.slug),
                          )
                        }
                        className="mt-0.5"
                      />
                      {other.question}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </fieldset>

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
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        {pending ? "Saving…" : answer ? "Save changes" : "Add answer"}
      </button>
    </form>
  );
}
