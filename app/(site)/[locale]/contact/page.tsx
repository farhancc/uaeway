import type { Metadata } from "next";
import { SITE, whatsappLink, whatsappNumber } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE.name}, ${SITE.area}.`,
};

export default function ContactPage() {
  const wa = whatsappLink("Hello — I have a question.");
  const number = whatsappNumber();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">Contact</h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        WhatsApp reaches us fastest. Send a photo of the document you are asking about and we can
        usually tell you what it needs in one message.
      </p>

      <div className="mt-8 space-y-4">
        {wa && number && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-go px-5 py-3 font-medium text-paper transition-colors hover:bg-go-dark"
          >
            WhatsApp +{number}
          </a>
        )}

        <div className="rounded-md border border-rule bg-field p-5">
          <h2 className="sign text-lg text-ink">{SITE.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">{SITE.area}</p>
        </div>
      </div>
    </div>
  );
}
