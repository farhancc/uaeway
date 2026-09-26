import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anon-key client for rendering public pages.
 *
 * Deliberately not the service-role client: RLS then physically prevents an
 * unreviewed draft reaching a public page, even if a query forgets its status
 * filter. The filters in lib/content are the first line; this is the second.
 */

let cached: SupabaseClient | null = null;

export function supabasePublic(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public credentials are not configured");

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export function isPublicDbConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
