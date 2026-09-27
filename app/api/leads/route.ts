import { headers } from "next/headers";
import { ZodError } from "zod";
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
