import { requireAdmin } from "@/lib/admin/auth";
import { listProposals } from "@/lib/chat/flow/proposals";
import { freeShare, loadSignals } from "@/lib/chat/flow/signals";
import { listVersions } from "@/lib/chat/flow/store";
import { describe } from "@/lib/chat/flow/patch";
import { ProposalCard } from "./ProposalCard";

export const metadata = { title: "Suggestions" };

/**
 * What last month's conversations suggest changing.
 *
 * Every card carries the visitor messages that motivated it, because that is
 * what a suggestion should be judged on — a confidence score is the model's
 * opinion of itself, while the transcript is what someone actually asked.
 */
export default async function ProposalsPage() {
  await requireAdmin();

  const [open, applied, rejected, signals, versions] = await Promise.all([
    listProposals("open"),
    listProposals("applied"),
    listProposals("rejected"),
    loadSignals(30),
    listVersions(),
  ]);

  // Version by version, because a suggestion is only worth applying if the
  // number it is meant to move actually moves. Newest first, and only versions
  // that answered anyone.
  const scored = versions
    .map((v) => ({ version: v.version, live: v.live, stats: signals.versions.get(v.id) }))
    .filter((row) => row.stats && row.stats.turns > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Suggestions</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Read from the last 30 days of conversations, every night. Nothing here has changed
        anything — approving adds it to the draft, and the draft still has to be published.
      </p>

      {open.length === 0 ? (
        <p className="mt-8 text-sm text-ink-faint">
          Nothing to look at. Either the flow is answering what people ask, or there has not been
          enough traffic since the last run to be sure of anything.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {open.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard
                id={proposal.id}
                title={proposal.patch ? describe(proposal.patch) : "A question nothing on the site answers"}
                reason={proposal.reason}
                evidence={proposal.evidence}
                detail={detailOf(proposal.patch)}
                applicable={proposal.patch !== null}
              />
            </li>
          ))}
        </ul>
      )}

      {scored.length > 0 && (
        <section className="mt-10 border-t border-rule pt-6">
          <h2 className="sign text-sm text-ink">How each version is doing</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Share of replies that cost nothing — the number these suggestions are trying to move.
            Last 30 days.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-1 font-medium">Version</th>
                <th className="py-1 font-medium">Replies</th>
                <th className="py-1 font-medium">Free</th>
                <th className="py-1 font-medium">Paid for</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((row) => (
                <tr key={row.version} className="border-b border-rule/50">
                  <td className="py-1.5 text-ink">
                    v{row.version}
                    {row.live && <span className="ml-2 text-xs text-ink-faint">live</span>}
                  </td>
                  <td className="py-1.5 tabular-nums text-ink-soft">{row.stats!.turns}</td>
                  <td className="py-1.5 tabular-nums text-ink">
                    {(freeShare(row.stats!) * 100).toFixed(0)}%
                  </td>
                  <td className="py-1.5 tabular-nums text-ink-soft">{row.stats!.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-10 text-xs text-ink-faint">
        {applied.length} applied · {rejected.length} rejected. A rejected suggestion is not raised
        again.
      </p>
    </div>
  );
}

/** The change itself, in the terms the admin edits in. */
function detailOf(patch: Parameters<typeof describe>[0] | null): string[] {
  if (!patch) return [];
  switch (patch.op) {
    case "addPhrases":
      return patch.phrases;
    case "addAnswer":
      return [patch.answerMd];
    case "retireIntent":
      return [];
  }
}
