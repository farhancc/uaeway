import { assertCron } from "@/lib/cron";
import { buildDigest } from "@/lib/social/jobs-digest";

/** Daily. Returns the post for someone to paste, and sends it to the team's
 *  Telegram so it is waiting for them. */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  const digest = await buildDigest();
  if (!digest) return Response.json({ ok: true, skipped: "no approved jobs" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (token && chat) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: digest, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error(`[cron/jobs-digest] telegram HTTP ${res.status}`);
  }

  return new Response(digest, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
