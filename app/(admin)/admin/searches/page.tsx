import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { JobSearchRow } from "@/lib/supabase/types";
import { AddSearch, SearchRow } from "./SearchRows";

export const dynamic = "force-dynamic";

export default async function SearchesPage() {
  await requireAdmin();
  const db = await supabaseServer();

  const { data, error } = await db
    .from("job_searches")
    .select("*")
    .order("active", { ascending: false })
    .order("keywords");

  const searches = (data ?? []) as JobSearchRow[];
  const running = searches.filter((s) => s.active).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Job searches</h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        What the nightly ingest looks for on Careerjet. Each running search is one API call and
        costs AI summaries for whatever it finds, so keep the list to roles you would actually
        publish.
      </p>

      <AddSearch />

      {error && (
        <p className="mt-6 rounded-[2px] border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load searches: {error.message}
        </p>
      )}

      {searches.length === 0 && !error ? (
        <p className="field mt-6 px-4 py-6 text-sm text-ink-soft">
          No searches yet. Add one above and the next ingest will use it.
        </p>
      ) : (
        <div className="field mt-6 overflow-x-auto px-4 py-2">
          <table className="w-full">
            <caption className="sr-only">Job searches run by the nightly ingest</caption>
            <thead>
              <tr className="border-b border-rule text-left">
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                  Keyword
                </th>
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                  Location
                </th>
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                  Last run
                </th>
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                  Status
                </th>
                <th scope="col" className="py-2 text-right text-xs font-medium text-ink-faint">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {searches.map((search) => (
                <SearchRow key={search.id} search={search} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {searches.length > 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          {running} of {searches.length} running. The ingest runs daily at 04:00 Gulf time.
        </p>
      )}
    </div>
  );
}
