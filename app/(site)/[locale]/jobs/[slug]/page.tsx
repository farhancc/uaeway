import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { ServiceCTA } from "@/components/site/ServiceCTA";
import { getJob } from "@/lib/content/queries";
import { href } from "@/lib/i18n";
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
  return {
    title: `${job.title}${job.company ? ` at ${job.company}` : ""} — ${where}`,
    description: job.summary ?? `${job.title} in ${where}.`,
    alternates: { canonical: `${SITE.url}${href(locale, `/jobs/${job.slug}`)}` },
  };
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={href(locale, "/jobs")} className="text-go underline underline-offset-2">
          Jobs
        </Link>
      </nav>

      <h1 className="sign mt-4 max-w-[20ch] text-3xl text-ink sm:text-4xl">{job.title}</h1>

      {/* A boxed record rather than a dot-joined string: each fact is labelled,
          the way a listing reference would be. */}
      <dl className="field mt-5 grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-4">
        {[
          { label: "Employer", value: job.company },
          { label: "Emirate", value: job.emirate },
          { label: "Field", value: job.category },
          {
            label: "Posted",
            value: posted.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
        ].map((entry) => (
          <div key={entry.label} className="px-3 py-2.5">
            <dt className="text-xs text-ink-faint">{entry.label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{entry.value ?? "Not stated"}</dd>
          </div>
        ))}
      </dl>

      {job.summary && (
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{job.summary}</p>
      )}

      <div className="field mt-8 p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          This is a summary. The full description, salary and application process are on the
          original posting at {job.source_name}.
        </p>
        <a
          href={job.source_url}
          target="_blank"
          // nofollow: these are aggregated outbound links we do not vouch for.
          rel="nofollow noopener noreferrer"
          className="mt-4 inline-block rounded-[2px] bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-go"
        >
          View and apply on {job.source_name}
        </a>
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
        <ServiceCTA service={service} locale={locale} context={job.title} />
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
