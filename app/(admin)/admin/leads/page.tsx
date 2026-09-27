import { requireAdmin } from "@/lib/admin/auth";
import { getService } from "@/lib/services";
import { supabaseServer } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/supabase/types";
import { LeadStatus } from "./LeadStatus";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await requireAdmin();
  const db = await supabaseServer();

  const { data, error } = await db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const leads = (data ?? []) as LeadRow[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink">Leads</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Newest first. Everyone here agreed to be contacted.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-seal/30 bg-seal/5 px-4 py-3 text-sm text-seal">
          Could not load leads: {error.message}
        </p>
      )}

      {leads.length === 0 && !error ? (
        <p className="mt-6 rounded-md border border-rule bg-paper px-4 py-6 text-sm text-ink-soft">
          No leads yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-md border border-rule bg-paper p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-medium text-ink">{lead.name || "No name given"}</p>
                {!lead.contact.includes("@") ? (
                  <a
                    href={`tel:+${lead.contact}`}
                    className="text-sm text-brass-deep hover:underline"
                  >
                    +{lead.contact}
                  </a>
                ) : (
                  <a href={`mailto:${lead.contact}`} className="text-sm text-go hover:underline">
                    {lead.contact}
                  </a>
                )}
                <span className="text-xs text-ink-faint">
                  {getService(lead.service_slug)?.shortName ?? lead.service_slug}, via{" "}
                  {lead.origin}, {new Date(lead.created_at).toLocaleString("en-GB")}
                </span>
                <span className="ml-auto">
                  <LeadStatus id={lead.id} status={lead.status} />
                </span>
              </div>

              {lead.need && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                  {lead.need}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
