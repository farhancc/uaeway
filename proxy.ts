import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/**
 * Every public page lives under a locale segment, so bare paths are redirected
 * to the default locale: /jobs -> /en/jobs. Permanent, because these are the
 * canonical addresses and we want the redirect cached.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Everything except API routes, the admin area, Next internals and files with
  // an extension (favicon.ico, robots.txt, sitemap.xml, images).
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
