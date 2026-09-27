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
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true });
  }
  delete body.website;

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
