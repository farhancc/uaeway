import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE.name} is run by ${SITE.company} in ${SITE.area}.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">About {SITE.name}</h1>

      <div className="prose-doc mt-8">
        <p>
          {SITE.name} is run by {SITE.company}, based in {SITE.area}. We handle the paperwork
          behind moving to, working in and doing business in the UAE — attestation, certified legal
          translation, visa applications, notary documents and company formation — and we write
          about how that paperwork actually works.
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
          We use AI to draft summaries and article material. Nothing reaches the site
          automatically: a person reviews every job and every article before it is published, and
          articles carry their sources. If you find something wrong here, tell us and we will fix
          or remove it.
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
