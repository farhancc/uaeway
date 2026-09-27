import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/**
 * Two unrelated jobs share this file because Next only runs one proxy per app.
 *
 * 1. Public pages: redirect a bare path to its locale, /jobs -> /en/jobs.
 * 2. /admin/*: refresh the Supabase Auth session cookie before the page runs.
 *
 * (2) was previously a stale comment rather than real code: lib/supabase/server.ts
 * says "session refresh happens in proxy.ts instead" of writing cookies from a
 * Server Component, but this file's matcher excluded /admin entirely, so nothing
 * ever refreshed it. A near-expiry session would only be renewed by a
 * client-side call, so a server-rendered admin page could read a stale cookie
 * and bounce someone to /admin/login while their browser still held a good one.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return refreshSupabaseSession(request);
  }

  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

/**
 * Reads the session, which is what makes the Supabase client renew it when it
 * is close to expiring, and carries the renewed cookie back out. Building a
 * fresh NextResponse inside setAll — Supabase's own pattern — is what gets the
 * refreshed cookie to the browser at all: middleware can write response
 * cookies, a Server Component further down the request cannot.
 *
 * Degrades to a no-op when Supabase is not configured, so local setup without
 * a database yet does not break every /admin request.
 */
async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: request.headers } });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // The read is the point: it is what triggers a refresh. requireAdmin()
  // downstream still does the actual sign-in and admins-table check.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // /admin is now included, so its session can be refreshed. API routes, Next
  // internals and any file with an extension stay excluded either way.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
