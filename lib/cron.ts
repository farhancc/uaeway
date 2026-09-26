/** Shared guard for the scheduled routes. Without it they are public endpoints
 *  that cost money to call. */
export function assertCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set — refusing to run");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
