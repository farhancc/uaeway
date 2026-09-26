"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJob } from "../../actions";
import { EMIRATES, JOB_CATEGORIES } from "@/lib/uae";

/** Adding a vacancy an employer sent us directly. */
export function JobForm() {
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
            await createJob(form);
            router.push("/admin");
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="field mt-6 space-y-4 p-5"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink">
          Job title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="Accounts Assistant"
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">The URL is made from this.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-ink">
            Employer
          </label>
          <input
            id="company"
            name="company"
            required
            maxLength={160}
            className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="emirate" className="block text-sm font-medium text-ink">
            Emirate
          </label>
          <select
            id="emirate"
            name="emirate"
            defaultValue=""
            className="mt-1 w-full rounded-[2px] border border-rule bg-paper px-3 py-2 text-sm"
          >
            <option value="">Not stated</option>
            {EMIRATES.map((emirate) => (
              <option key={emirate} value={emirate}>
                {emirate}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-ink">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue="Other"
          className="mt-1 w-full rounded-[2px] border border-rule bg-paper px-3 py-2 text-sm"
        >
          {JOB_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="apply_link" className="block text-sm font-medium text-ink">
          Where people apply
        </label>
        <input
          id="apply_link"
          name="apply_link"
          required
          placeholder="https://employer.ae/careers/123  or  hr@employer.ae"
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          A link or an email address. Applicants apply with the employer, never through us.
        </p>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-ink">
          Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={4}
          maxLength={1200}
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm leading-relaxed"
        />
        <p className="mt-1 text-xs text-ink-faint">
          Two or three sentences in your own words. Do not paste the employer&apos;s advert.
        </p>
      </div>

      <div>
        <label htmlFor="documents_needed" className="block text-sm font-medium text-ink">
          Documents an applicant will need
        </label>
        <textarea
          id="documents_needed"
          name="documents_needed"
          rows={4}
          placeholder={"Degree certificate\nExperience certificate\nPassport"}
          className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          One per line, up to six. These become the stamps on the listing and the reason someone
          contacts us.
        </p>
      </div>

      {error && <p className="text-sm text-seal">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[2px] bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save to review queue"}
      </button>
    </form>
  );
}
