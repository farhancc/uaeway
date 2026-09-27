import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What we collect, why, and how to have it deleted.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">Privacy</h1>

      <div className="prose-doc mt-8">
        <p>
          This explains what {SITE.name} collects, why, and how to have it
          removed. It is written to follow UAE Federal Decree-Law No. 45 of 2021 on the Protection
          of Personal Data.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Enquiries.</strong> If you send an enquiry through a form or the assistant, we
            store the name, phone number, email address and description you give us, along with the
            page you sent it from.
          </li>
          <li>
            <strong>Assistant conversations.</strong> We store what you type to the assistant so we
            can answer you and improve the answers. Do not send passport numbers, Emirates ID
            numbers or payment details through it — we do not ask for them and we do not want them.
          </li>
          <li>
            <strong>Technical data.</strong> We store a one-way hash of your IP address to limit
            abuse. We do not keep the address itself.
          </li>
        </ul>

        <h2>Why we hold it</h2>
        <p>
          To answer your enquiry and provide the service you asked about. We ask for your agreement
          before storing your contact details, and we do not add you to a marketing list on the
          strength of an enquiry.
        </p>

        <h2>Who sees it</h2>
        <p>
          Our own team, and the services we use to run the site: Supabase (database hosting) and
          Google (the AI model behind the assistant). We do not sell your data and we do not share
          it with other advertisers or agents.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Enquiries are kept for two years from your last contact with us, then deleted. Assistant
          conversations are kept for twelve months.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us what we hold about you, ask us to correct it, ask us to delete it, or
          withdraw your agreement to be contacted — at any time, by message. We will act on it and
          confirm when it is done.
        </p>

        <h2>Cookies</h2>
        <p>
          The site sets no advertising or tracking cookies. If we add analytics later, this page
          will say so before it happens.
        </p>
      </div>

      <p className="mt-8 rounded-md border border-rule bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft">
        This page describes what the site actually does today. Have it reviewed by a UAE legal
        adviser before launch, and update it whenever the data we collect changes.
      </p>
    </div>
  );
}
