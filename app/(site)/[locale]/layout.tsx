import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Barlow, Barlow_Semi_Condensed, Noto_Kufi_Arabic } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { dirFor, isLocale, LOCALES } from "@/lib/i18n";
import { OG_DEFAULTS } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "../../globals.css";

/* One family at two widths rather than two faces pretending to agree.
   Barlow was drawn from the lettering on highway signage, which is the
   vernacular this site is built in; its semi-condensed cut is what a
   directional panel is set in, and the normal width reads at length for an
   audience doing it in a second or third language.

   Noto Kufi for the bilingual layer, not naskh: sign Arabic is drawn
   geometrically, to be read at a distance and at an angle. */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlowCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const kufi = Noto_Kufi_Arabic({
  variable: "--font-kufi",
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
  openGraph: { ...OG_DEFAULTS, type: "website" },
  twitter: { card: "summary_large_image", images: ["/logo.png"] },
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
      className={`${barlow.variable} ${barlowCondensed.variable} ${kufi.variable} h-full`}
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
        <ChatWidget />
        {/* Organization, not LocalBusiness: this site is not a storefront with
            an address and opening hours, it is a place people research from and
            get introduced to providers. Kept to facts we can stand behind.
            
            Emitted as one @graph with the WebSite so the two carry stable @ids
            and can reference each other, which is what lets a search engine
            attribute a page to a publisher rather than guessing. There is no
            sameAs: we have no verified social profiles, and inventing them is
            exactly the thing this site says it does not do. */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE.url}/#organization`,
                name: SITE.name,
                url: SITE.url,
                description: SITE.description,
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE.url}/logo.png`,
                  width: 1536,
                  height: 1024,
                },
                areaServed: [
                  "Dubai",
                  "Abu Dhabi",
                  "Sharjah",
                  "Ajman",
                  "Ras Al Khaimah",
                  "Fujairah",
                  "Umm Al Quwain",
                ],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE.url}/#website`,
                name: SITE.name,
                url: SITE.url,
                description: SITE.description,
                inLanguage: locale,
                publisher: { "@id": `${SITE.url}/#organization` },
              },
            ],
          }}
        />
      </body>
    </html>
  );
}
