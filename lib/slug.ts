import { supabaseAdmin } from "./supabase/admin";

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/**
 * A slug not already taken in `table`, appending -2, -3 … when needed.
 *
 * The prototype appended four random characters instead. That guaranteed
 * uniqueness but produced unstable, ugly URLs — the same job re-ingested got a
 * different address, which breaks shares and backlinks. A counter keeps the
 * first (and almost always only) instance clean.
 */
export async function uniqueSlug(
  table: "jobs" | "articles" | "answers",
  title: string,
): Promise<string> {
  const base = slugify(title) || "post";
  const db = supabaseAdmin();

  // One query: every existing slug that could collide.
  const { data, error } = await db.from(table).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`slug lookup failed on ${table}: ${error.message}`);

  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  if (!taken.has(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Pathological case only.
  return `${base}-${Date.now().toString(36)}`;
}
