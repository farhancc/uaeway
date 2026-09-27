import Link from "next/link";
import { href } from "@/lib/i18n";
import type { JobSummary } from "@/lib/content/queries";
import { deadlineLabel, experienceLabel, postedLabel } from "@/lib/salary";

/** A listing in a list. The documents-needed stamps are the point: they turn a
 *  job someone wants into the paperwork they will need help with. */
export function JobRow({ job, locale }: { job: JobSummary; locale: string }) {
  // Every one of these is optional, and an absent fact is simply not shown —
  // no "Salary: not specified" rows, which take up the space of information
  // while carrying none.
  const experience = experienceLabel(job.experience_years);
  const deadline = deadlineLabel(job.apply_by);

  return (
    <article className="border-b border-rule py-6">
      <h3 className="sign text-[1.125rem] leading-snug">
        <Link href={href(locale, `/jobs/${job.slug}`)} className="text-ink transition-colors hover:text-brass-deep">
          {job.title}
        </Link>
      </h3>

      {(job.company || job.emirate) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {job.company}
          {job.emirate && (
            <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-faint">
              {job.emirate}
            </span>
          )}
        </p>
      )}

      {(job.salary_text || experience) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {job.salary_text && (
            <span className="font-medium text-teal-deep">{job.salary_text}</span>
          )}
          {experience && <span className="text-ink-soft">{experience}</span>}
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

      {/* Freshness and urgency last, in the smallest type on the row: they
          decide whether to bother, they are not what the job is. */}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
        <span>{postedLabel(job.posted_at)}</span>
        {deadline && (
          <span className={deadline.urgent ? "font-medium text-seal" : undefined}>
            {deadline.text}
          </span>
        )}
      </p>
    </article>
  );
}
