import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { dirFor, isLocale, LOCALES } from "@/lib/i18n";
import { SITE, whatsappLink } from "@/lib/site";
import "../../globals.css";

/* Fraunces for display — a variable serif with enough character to carry a
   headline without the Didone contrast that reads as a stock choice. Inter for
   everything read at length. Noto Naskh Arabic for the bilingual layer, chosen
   over a geometric Kufi because Naskh reads classical rather than technical. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_AE",
  },
  robots: { index: true, follow: true },
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${fraunces.variable} ${inter.variable} ${naskh.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        <Header locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
        <ChatWidget whatsappHref={whatsappLink("Hello — I was using the assistant on your site.")} />
      </body>
    </html>
  );
}
