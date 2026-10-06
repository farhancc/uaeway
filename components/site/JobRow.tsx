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
            <span className="font-medium text-sign-deep">{job.salary_text}</span>
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

      {/* The row's only call to action, and it is worth having one: the title
          above is a link, but it is set as a heading and reads as one, so a
          list of forty of them offered a visitor no visible way to act on any
          of them.

          It goes to our own page rather than straight out to the employer on
          purpose. That page is where the application link sits beside the
          honest "this is a summary" framing and the documents this role needs
          attested — and a card that threw people out to an aggregator would
          lose them before either.

          The direction is a chevron, not an arrow glued to the words. */}
      <p className="mt-3">
        <Link
          href={href(locale, `/jobs/${job.slug}`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-sign-deep underline decoration-sign/35 underline-offset-4 transition-colors hover:text-sign hover:decoration-sign"
        >
          View this job and how to apply
          <span aria-hidden="true" className="chev" />
        </Link>
      </p>
    </article>
  );
}
