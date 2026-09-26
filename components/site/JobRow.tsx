import Link from "next/link";
import { href } from "@/lib/i18n";
import type { JobSummary } from "@/lib/content/queries";

/** A listing in a list. The documents-needed stamps are the point: they turn a
 *  job someone wants into the paperwork they will need help with. */
export function JobRow({ job, locale }: { job: JobSummary; locale: string }) {
  return (
    <article className="border-b border-rule py-5">
      <h3 className="sign text-[1.0625rem] leading-snug">
        <Link href={href(locale, `/jobs/${job.slug}`)} className="text-ink hover:text-go">
          {job.title}
        </Link>
      </h3>

      {(job.company || job.emirate) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {job.company}
          {job.emirate && (
            <span className="rounded-[2px] border border-rule px-1.5 py-0.5 text-xs text-ink-faint">
              {job.emirate}
            </span>
          )}
        </p>
      )}

      {job.summary && (
        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-soft">{job.summary}</p>
      )}

      {job.documents_needed.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-faint">Documents you will need</span>
          {job.documents_needed.map((doc) => (
            <span key={doc} className="stamp">
              {doc}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
