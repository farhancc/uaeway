"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArticle } from "../actions";
import { SECTION_LIST } from "@/lib/content/sections";
import { SERVICES } from "@/lib/services";

/** Writing a post. Markdown in, review queue out. */
export function ComposeForm() {
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
            await createArticle(form);
            router.push("/admin");
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="field mt-6 space-y-4 p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className="block text-sm font-medium text-ink">
            Section
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue="blog"
            className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
          >
            {SECTION_LIST.map((section) => (
              <option key={section.kind} value={section.kind}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="service_slug" className="block text-sm font-medium text-ink">
            Service this should lead to
          </label>
          <select
            id="service_slug"
            name="service_slug"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
          >
            <option value="">Work it out from the text</option>
            {SERVICES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          The URL is made from this and cannot be changed afterwards.
        </p>
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-ink">
          Standfirst
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          One or two sentences. Used on the listing and as the search description.
        </p>
      </div>

      <div>
        <label htmlFor="body_md" className="block text-sm font-medium text-ink">
          Body
        </label>
        <textarea
          id="body_md"
          name="body_md"
          required
          rows={16}
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 font-mono text-sm leading-relaxed"
          placeholder={"## A heading\n\nMarkdown. Raw HTML is not rendered."}
        />
      </div>

      <div>
        <label htmlFor="sources" className="block text-sm font-medium text-ink">
          Sources
        </label>
        <textarea
          id="sources"
          name="sources"
          rows={3}
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
          placeholder={"ICP visa fees | https://icp.gov.ae/...\nhttps://u.ae/..."}
        />
        <p className="mt-1 text-xs text-ink-faint">
          One per line, optionally &quot;Title | URL&quot;. Anything asserting a fee, a rule or a
          date needs one.
        </p>
      </div>

      {error && <p className="text-sm text-seal">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save to review queue"}
      </button>
    </form>
  );
}
