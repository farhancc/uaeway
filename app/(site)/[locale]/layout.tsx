import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, Noto_Naskh_Arabic, Outfit } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { dirFor, isLocale, LOCALES } from "@/lib/i18n";
import { SITE, whatsappLink } from "@/lib/site";
import "../../globals.css";

/* Outfit for display: geometric, signage-like, and close to the lettering in
   the logo's own wordmark — this is a wayfinding brand, not a heritage one.
   Inter for anything read at length, because the audience reads carefully in a
   second or third language. Noto Naskh Arabic for the bilingual layer. */
const outfit = Outfit({
  variable: "--font-outfit",
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
    images: [{ url: "/logo.png", width: 1536, height: 1024, alt: SITE.name }],
  },
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
      className={`${outfit.variable} ${inter.variable} ${naskh.variable} h-full`}
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
        {/* Organization, not LocalBusiness: this site is not a storefront with
            an address and opening hours, it is a place people research from and
            get introduced to providers. Kept to facts we can stand behind. */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            areaServed: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
          }}
        />
      </body>
    </html>
  );
}
