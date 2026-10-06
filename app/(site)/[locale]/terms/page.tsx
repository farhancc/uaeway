import type { Metadata } from "next";
import { PageHead } from "@/components/site/PageHead";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/terms",
    title: "Terms",
    description:
      "The terms for using this site: what it publishes, what it does not do, and the limits of the introductions we make to third-party licensed providers.",
    robots: { index: false, follow: true },
  });
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHead title="Terms" arabic="الشروط والأحكام" />

      <div className="prose-doc mt-8">
        <h2>What this site is</h2>
        <p>
          {SITE.name} publishes job listings, guides and news, and introduces people to third-party
          providers of the services described here. We do not ourselves carry out regulated work
          such as legal translation, attestation, notarisation or visa filing — licensed providers
          do that, and your agreement for the work itself is with them. Using this site does not
          create a client relationship with us or with any provider.
        </p>

        <h2>Information, not advice</h2>
        <p>
          Everything published here is general information. It is not legal, immigration, tax or
          financial advice, and it is not a substitute for checking with the relevant UAE
          authority. Government fees, processing times and eligibility rules change, and a page
          that was correct when written may not be correct when you read it.
        </p>

        <h2>Job listings</h2>
        <p>
          Listings are summarised from public sources and link to the original posting. We are not
          the employer, we do not recruit, and we cannot confirm that a listing is current or
          genuine. Verify any offer directly with the employer. No legitimate UAE employer asks a
          candidate to pay for a job, a visa or a medical.
        </p>

        <h2>The assistant</h2>
        <p>
          The site assistant is an AI tool. It can be wrong. Do not rely on it for a decision that
          matters without confirming with our team or the relevant authority.
        </p>

        <h2>Outcomes</h2>
        <p>
          We do not guarantee any government approval, admission or search ranking. Where a process
          depends on a third party — a ministry, an embassy, a university, a bank — we can manage
          the submission and the follow-up, not the decision.
        </p>
      </div>

      <p className="mt-8 rounded-md border border-rule bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft">
        Have these terms reviewed by a UAE legal adviser before launch.
      </p>
    </div>
  );
}
