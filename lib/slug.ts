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
  /**
   * Slugs handed out during this run but not yet written.
   *
   * The database only knows about committed rows, so a caller that builds a
   * batch and inserts it at the end gets the same slug twice for two listings
   * with the same title — "Sales Executive" is not a rare title — and the whole
   * insert fails on the unique constraint. Serial execution does not help: it
   * prevents a race between concurrent calls, not the fact that none of them
   * have committed yet.
   *
   * Pass a Set and this adds to it.
   */
  reserved?: Set<string>,
): Promise<string> {
  const base = slugify(title) || "post";
  const db = supabaseAdmin();

  // One query: every existing slug that could collide.
  const { data, error } = await db.from(table).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`slug lookup failed on ${table}: ${error.message}`);

  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  for (const slug of reserved ?? []) taken.add(slug);

  const claim = (slug: string) => {
    reserved?.add(slug);
    return slug;
  };

  if (!taken.has(base)) return claim(base);

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return claim(candidate);
  }
  // Pathological case only.
  return claim(`${base}-${Date.now().toString(36)}`);
}
