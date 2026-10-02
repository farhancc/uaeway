import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { ServiceCTA } from "@/components/site/ServiceCTA";
import { getJob } from "@/lib/content/queries";
import { deadlineLabel, experienceLabel } from "@/lib/salary";
import { isEmailLink } from "@/lib/jobs";
import { href } from "@/lib/i18n";
import { metaDescription, pageMetadata } from "@/lib/seo";
import { getService, matchServices } from "@/lib/services";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const job = await getJob(slug);
  if (!job) return { title: "Job not found" };

  const where = job.emirate ?? "the UAE";
  return pageMetadata({
    locale,
    path: `/jobs/${job.slug}`,
    title: `${job.title}${job.company ? ` at ${job.company}` : ""} — ${where}`,
    // An ingested listing may carry no summary at all, so the fallback still
    // has to say where the role is and what it leads to rather than be empty.
    description: metaDescription(
      job.summary ?? `${job.title} in ${where}.`,
      job.summary ? undefined : "Requirements, the documents it needs attested or translated, and how to apply.",
    ),
    openGraph: { type: "article" },
  });
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[slug]">) {
  const { slug, locale } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  // The service this listing most plausibly leads to. Falls back to the two
  // everyone applying for a UAE job ends up needing.
  const matched = matchServices(
    [job.title, job.category, job.documents_needed.join(" ")].filter(Boolean).join(" "),
    1,
  );
  const service = matched[0] ?? getService("attestation")!;

  const posted = new Date(job.posted_at);
  // A directly submitted vacancy may take applications by email rather than at
  // a web page, which changes what the button can honestly say.
  const applyLink = job.source_url;
  const byEmail = applyLink ? isEmailLink(applyLink) : false;
  // Who is hiring, or nothing.
  //
  // This used to fall back to `source_name`, which is where the ingest found
  // the listing — and on an aggregated feed that is a board's domain, so the
  // button read "View and apply at buzzon.khaleejtimes.com". Naming the
  // middleman is the thing we took out; naming it only when we know least
  // about a listing is worse than saying nothing.
  const employer = job.company;
  const deadline = deadlineLabel(job.apply_by);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={href(locale, "/jobs")} className="text-brass-deep underline underline-offset-4">
          Jobs
        </Link>
      </nav>

      <h1 className="sign mt-4 max-w-[20ch] text-3xl text-ink sm:text-4xl">{job.title}</h1>

      {/* A boxed record rather than a dot-joined string: each fact is labelled,
          the way a listing reference would be. */}
      <dl className="field mt-5 grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-4">
        {/* Only the facts this listing actually carries. An absent one is left
            out rather than printed as "Not stated", which fills the space of
            information without being any. */}
        {[
          { label: "Employer", value: job.company },
          { label: "Emirate", value: job.emirate },
          { label: "Field", value: job.category },
          { label: "Salary", value: job.salary_text },
          { label: "Experience", value: experienceLabel(job.experience_years) },
          {
            label: "Posted",
            value: posted.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
          { label: "Apply by", value: deadline?.text ?? null },
        ]
          .filter((entry) => entry.value)
          .map((entry) => (
          <div key={entry.label} className="px-3 py-2.5">
            <dt className="text-xs text-ink-faint">{entry.label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{entry.value}</dd>
          </div>
        ))}
      </dl>

      {job.summary && (
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{job.summary}</p>
      )}

      <div className="field mt-8 p-5">
        {/* Named by who is hiring, not by where we happened to find it. A
            visitor is deciding whether to apply to this employer; which
            aggregator the listing came through is our plumbing, not their
            business. The outbound link still goes to the original posting. */}
        <p className="text-sm leading-relaxed text-ink-soft">
          {!applyLink
            ? `This is a summary, and this listing did not come with an application link.${employer ? ` Look for the role on ${employer}'s own careers page, or ask us and we will point you at it.` : " Ask us and we will try to trace it."}`
            : byEmail
              ? `This is a summary. ${employer ?? "The employer"} takes applications by email — ask them for the full description, salary and process.`
              : `This is a summary. The full description, salary and application process are on ${employer ? `${employer}'s original posting` : "the original posting"}.`}
        </p>
        {applyLink && (
          <a
            href={applyLink}
            {...(byEmail ? {} : { target: "_blank" })}
            // nofollow: outbound links on listings we did not write and do not vouch for.
            rel="nofollow noopener noreferrer"
            className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            {byEmail
              ? `Email your application to ${applyLink.slice(7)}`
              : employer
                ? `View and apply at ${employer}`
                : "View the original posting"}
          </a>
        )}
      </div>

      {job.documents_needed.length > 0 && (
        <section className="mt-10">
          <h2 className="sign text-xl text-ink">Documents you will likely need</h2>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
            UAE employers generally ask for these translated, attested, or both, before a work
            permit can be issued. Check with the employer — this list is a guide, not their
            requirement.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.documents_needed.map((doc) => (
              <span key={doc} className="stamp">
                {doc}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <ServiceCTA service={service} locale={locale} />
      </div>

      <p className="mt-8 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
        <strong className="font-semibold text-seal">Never pay a fee to be given a job.</strong>{" "}
        Legitimate UAE employers do not charge candidates for recruitment, visas or medicals.
      </p>

      {/*
        Deliberately NOT JobPosting structured data. Google requires JobPosting
        markup to sit on the page that hosts the full listing; emitting it on a
        summary that links elsewhere risks a structured-data manual action.
      */}
      <JsonLd
        data={breadcrumbs(SITE.url, [
          { name: "Jobs", path: href(locale, "/jobs") },
          { name: job.title, path: href(locale, `/jobs/${job.slug}`) },
        ])}
      />
    </div>
  );
}
