import { assertCron } from "@/lib/cron";
import { pruneJobs } from "@/lib/ingest/jobs";

/** Weekly. Takes expired listings off the site so we never show a job that
 *  closed a month ago. */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const expired = await pruneJobs();
    return Response.json({ ok: true, expired });
  } catch (err) {
    console.error(`[cron/prune] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
