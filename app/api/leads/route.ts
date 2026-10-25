import { headers } from "next/headers";
import { ZodError } from "zod";
import { assertCron } from "@/lib/cron";
import { leadSummary } from "@/lib/leads/alerts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeadRow } from "@/lib/supabase/types";
import { captureLead } from "@/lib/leads/capture";
import { hashIp } from "@/lib/chat/session";

/** Per-instance submission limiter. Not a security boundary — just enough to
 *  stop a single script filling the sales inbox. */
const MAX_PER_HOUR = 8;
const recent = new Map<string, number[]>();

function overLimit(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 3600_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_HOUR;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a real person never sees this field, so anything in it is a bot.
  // Answer 200 so the bot does not learn it was caught.
  //
  // It used to be called "website", which is a field name browsers and password
  // managers autofill — and `autocomplete="off"` is widely ignored. An autofill
  // would have silently discarded a real enquiry: 200, "Got it", no lead, and
  // nothing in any log to explain it. The name is now one nothing recognises.
  //
  // And it says when it fires. A trap that cannot be observed cannot be told
  // apart from a trap that is eating your leads.
  const trap = body.hp_ref;
  if (typeof trap === "string" && trap.trim() !== "") {
    console.warn(
      `[leads] discarded a submission that filled the honeypot (path: ${String(body.pagePath ?? "unknown")})`,
    );
    return Response.json({ ok: true });
  }
  delete body.hp_ref;

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "0.0.0.0").trim();
  if (overLimit(hashIp(ip))) {
    return Response.json(
      { error: "Too many submissions from here. Please try again shortly." },
      { status: 429 },
    );
  }

  try {
    const { duplicate } = await captureLead(body);
    return Response.json({ ok: true, duplicate });
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return Response.json(
        { error: first?.message ?? "Please check the form and try again.", field: first?.path?.[0] },
        { status: 422 },
      );
    }
    console.error(`[leads] ${(err as Error).message}`);
    return Response.json(
      { error: "We could not save that. Please try again in a moment." },
      { status: 500 },
    );
  }
}

/** Nothing needs more than a handful; the cap stops a stale cursor pulling the
 *  whole table. */
const MAX_LEADS = 50;

/**
 * Recent leads, for a notifier that cannot be pushed to.
 *
 * Lead alerts go out from `captureLead` the moment a lead lands — Telegram and
 * email, both best-effort. WhatsApp cannot work that way: it needs a socket
 * that outlives a serverless invocation, so the only client that can send is
 * the worker on a laptop, and it has to come and ask.
 *
 * Behind `CRON_SECRET`, and that is not belt-and-braces here. A lead is a
 * name, a phone number and what someone needs, recorded under PDPL consent to
 * be contacted about that enquiry. This endpoint is the one place that hands
 * those out, so it is guarded by the same secret as the scheduled routes and
 * returns a ready-made summary rather than the raw row — the notifier has no
 * use for `utm` or `consent_at`, and data nobody needs should not travel.
 */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("limit") ?? MAX_LEADS);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LEADS)
    : MAX_LEADS;

  try {
    const { data, error } = await supabaseAdmin()
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    const leads = ((data ?? []) as LeadRow[]).map((lead) => ({
      id: lead.id,
      createdAt: lead.created_at,
      summary: leadSummary(lead),
    }));

    return Response.json({ leads });
  } catch (err) {
    console.error(`[api/leads] ${(err as Error).message}`);
    return Response.json({ error: "leads unavailable" }, { status: 500 });
  }
}
