import { answerSlugs } from "./chat/answers";
import { supabaseAdmin } from "./supabase/admin";

/** Everything that hands out slugs. */
export type SlugTable = "jobs" | "articles" | "answers";

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
  table: SlugTable,
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

  const taken = new Set(await slugsFrom(table, base));
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

/**
 * Every existing slug that could collide with `base`.
 *
 * Two stores, because the answer bank moved to the chat database while jobs and
 * articles stayed in Postgres. The counter above does not care which: it needs
 * the set of names already spoken for, and nothing else.
 */
async function slugsFrom(table: SlugTable, base: string): Promise<string[]> {
  // Tens of answers in total, so filtering in process costs less than a
  // prefix query would.
  if (table === "answers") return (await answerSlugs()).filter((slug) => slug.startsWith(base));

  const { data, error } = await supabaseAdmin().from(table).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`slug lookup failed on ${table}: ${error.message}`);
  return (data ?? []).map((r) => (r as { slug: string }).slug);
}
