import { getService } from "../services";
import type { LeadRow } from "../supabase/types";

/**
 * Notifies sales about a new lead. Alerts are best-effort: the database row is
 * the source of truth, so a Telegram outage must never lose an enquiry. Every
 * failure is logged and swallowed.
 */

function summary(lead: LeadRow): string {
  const service = getService(lead.service_slug);
  const lines = [
    `New lead — ${service?.name ?? lead.service_slug}`,
    `Name: ${lead.name || "not given"}`,
    `Contact: ${lead.contact}`,
  ];
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.need) lines.push(`Need: ${lead.need}`);
  lines.push(`Via: ${lead.origin}${lead.page_path ? ` on ${lead.page_path}` : ""}`);
  return lines.join("\n");
}

async function telegram(lead: LeadRow): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  // No reply link. The visitor consented to phone or email, and Telegram makes
  // a bare number tappable anyway.
  const text = summary(lead);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`telegram HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function email(lead: LeadRow): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_ALERT_EMAIL;
  const from = process.env.LEAD_ALERT_FROM;
  if (!key || !to || !from) return;

  const service = getService(lead.service_slug);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New lead: ${service?.shortName ?? lead.service_slug} — ${lead.name || lead.contact}`,
      text: summary(lead),
    }),
  });
  if (!res.ok) throw new Error(`resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function alertSales(lead: LeadRow): Promise<void> {
  const results = await Promise.allSettled([telegram(lead), email(lead)]);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[leads] alert failed for ${lead.id}: ${r.reason}`);
    }
  }
}
