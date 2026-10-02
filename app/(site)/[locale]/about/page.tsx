import type { Metadata } from "next";
import { metaDescription, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/about",
    title: "About",
    description: metaDescription(
      `${SITE.name} is an independent UAE jobs and guidance site based in ${SITE.area}.`,
      "We publish openings and plain-English guides, and introduce people to licensed providers.",
    ),
  });
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">About {SITE.name}</h1>

      <div className="prose-doc mt-8">
        <p>
          {SITE.name} is an independent site based in {SITE.area}. We publish job openings and
          plain-English guides to the paperwork behind moving to, working in and doing business in
          the UAE — attestation, certified legal translation, visas, notary documents and company
          formation — and we put people in touch with the licensed providers who carry that work
          out.
        </p>
        <p>
          We do not perform regulated work ourselves. Attestation, legal translation, notarisation
          and visa filing are done by licensed providers; our part is working out what you actually
          need and introducing you to someone who can do it properly. CV writing and website
          building we do in-house — those are the two we handle start to finish.
        </p>

        <h2>Why the site exists</h2>
        <p>
          Most of the questions we are asked have the same shape: someone has a job offer, an
          admission letter or a business idea, and nobody has told them which stamps they need or
          in what order. The guides and job listings here are our answer to that, published so they
          are useful whether or not you ever become a client.
        </p>

        <h2>How we publish</h2>
        <p>
          Job listings are gathered from public sources, summarised in our own words, and linked
          back to the original posting. We do not republish listings and we do not list roles that
          charge candidates a fee.
        </p>
        <p>
          We use AI to draft summaries and article material. Nothing AI-written reaches the site
          automatically: a person reviews every drafted job and article before it is published, and
          articles carry their sources. Listings and posts we write ourselves we publish directly.
          If you find something wrong here, tell us and we will fix or remove it.
        </p>

        <h2>What we will not do</h2>
        <p>
          We will not promise a visa approval, a job or a university place — those are not ours to
          give. We will not quote a government fee we have not checked. And if a job you have been
          offered asks you to pay for your own recruitment, we will tell you plainly that it is a
          scam.
        </p>
      </div>
    </div>
  );
}
