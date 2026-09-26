import { supabaseAdmin } from "../supabase/admin";
import type { LeadRow } from "../supabase/types";
import { alertSales } from "./alerts";
import { leadInput, normalizeContact, type LeadInput } from "./schema";

/** Repeat enquiries inside this window are treated as the same lead. */
const DEDUPE_HOURS = 24;

export interface CaptureResult {
  lead: LeadRow;
  /** True when we matched a recent lead instead of creating one. */
  duplicate: boolean;
}

/**
 * The single path a lead takes into the system, used by the service forms and by
 * the chatbot. Validate, de-duplicate, store, then notify — in that order, so an
 * alerting failure can never cost us the enquiry.
 */
export async function captureLead(raw: unknown): Promise<CaptureResult> {
  const input: LeadInput = leadInput.parse(raw);
  const db = supabaseAdmin();
  const contact = normalizeContact(input.contact);

  // Someone who fills the form and then also asks the chatbot should reach sales
  // once, not twice.
  const since = new Date(Date.now() - DEDUPE_HOURS * 3600_000).toISOString();
  const { data: existing } = await db
    .from("leads")
    .select("*")
    .eq("contact", contact)
    .eq("service_slug", input.serviceSlug)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing?.length) {
    const lead = existing[0] as LeadRow;
    // Keep anything new they told us the second time round.
    if (input.need && input.need !== lead.need) {
      const merged = [lead.need, input.need].filter(Boolean).join("\n---\n");
      const { data } = await db
        .from("leads")
        .update({ need: merged })
        .eq("id", lead.id)
        .select("*")
        .single();
      return { lead: (data as LeadRow) ?? lead, duplicate: true };
    }
    return { lead, duplicate: true };
  }

  const { data, error } = await db
    .from("leads")
    .insert({
      service_slug: input.serviceSlug,
      name: input.name ?? null,
      contact,
      email: input.email ?? (contact.includes("@") ? contact : null),
      need: input.need ?? null,
      origin: input.origin,
      chat_session_id: input.chatSessionId ?? null,
      page_path: input.pagePath ?? null,
      utm: input.utm,
      // Validation guarantees consent was given; this records when.
      consent_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(`could not save lead: ${error.message}`);

  const lead = data as LeadRow;
  await alertSales(lead);
  return { lead, duplicate: false };
}
