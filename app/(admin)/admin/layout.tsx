import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Archivo_Black } from "next/font/google";
import "../../globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin — UAE Gateway",
  // Never index the admin area, whatever robots.txt says.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper">
        <header className="border-b-2 border-ink bg-field">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
            <Link href="/admin" className="sign text-sm text-ink">
              Review queue
            </Link>
            <Link href="/admin/leads" className="text-sm text-ink-soft hover:text-ink">
              Leads
            </Link>
            <Link href="/admin/new" className="text-sm text-ink-soft hover:text-ink">
              Write a post
            </Link>
            <Link href="/en" className="ml-auto text-sm text-ink-faint hover:text-ink">
              View site
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
