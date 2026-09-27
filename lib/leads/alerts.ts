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

/** Whether any alert channel is configured at all. */
export function alertChannels(): string[] {
  const channels: string[] = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) channels.push("telegram");
  if (process.env.RESEND_API_KEY && process.env.LEAD_ALERT_EMAIL && process.env.LEAD_ALERT_FROM) {
    channels.push("email");
  }
  return channels;
}

export async function alertSales(lead: LeadRow): Promise<void> {
  // Both senders return quietly when their own credentials are missing, which
  // is right per channel and wrong in aggregate: with neither configured a lead
  // was written to the database and nobody was told, and nothing said so. The
  // whole point of a lead is that someone answers it.
  if (alertChannels().length === 0) {
    console.error(
      `[leads] lead ${lead.id} saved but NOT sent to anyone — no alert channel is configured. ` +
        `Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (see README), or the Resend variables.`,
    );
    return;
  }

  const results = await Promise.allSettled([telegram(lead), email(lead)]);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[leads] alert failed for ${lead.id}: ${r.reason}`);
    }
  }
}
