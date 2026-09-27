import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { JobBoardRow } from "@/lib/supabase/types";
import { AddBoard, BoardRow } from "./BoardRows";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  await requireAdmin();
  const db = await supabaseServer();

  const { data, error } = await db
    .from("job_boards")
    .select("*")
    .order("active", { ascending: false })
    .order("name");

  const boards = (data ?? []) as JobBoardRow[];
  const running = boards.filter((b) => b.active).length;
  const failing = boards.filter((b) => b.active && b.last_error).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Employer boards</h1>
      <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
        Companies whose own hiring pages the nightly ingest reads. Greenhouse and Lever publish
        these openly, so unlike the keyword searches these cost nothing and need no key — but they
        only cover employers you add here. Anything outside the UAE is dropped before it reaches
        the review queue.
      </p>

      <AddBoard />

      {error && (
        <p className="mt-6 rounded-md border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load boards: {error.message}
        </p>
      )}

      {boards.length === 0 && !error ? (
        <p className="field mt-6 px-4 py-6 text-sm leading-relaxed text-ink-soft">
          No employer boards yet. Add one above and the next ingest will read it.
        </p>
      ) : (
        <>
          <div className="field mt-6 overflow-x-auto px-4 py-2">
            <table className="w-full">
              <caption className="sr-only">Employer boards read by the nightly ingest</caption>
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-3 text-xs font-medium text-ink-faint">
                    Employer
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
                {boards.map((board) => (
                  <BoardRow key={board.id} board={board} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 max-w-[64ch] text-xs leading-relaxed text-ink-faint">
            {running} running.
            {failing > 0 &&
              ` ${failing} failing — a board stops answering when the employer renames or closes it,
                and the slug needs updating.`}
          </p>
        </>
      )}
    </div>
  );
}
