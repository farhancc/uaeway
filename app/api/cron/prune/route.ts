import { assertCron } from "@/lib/cron";
import { deleteStaleJobs, pruneJobs } from "@/lib/ingest/jobs";

/**
 * Weekly. Two separate acts, in order.
 *
 * `pruneJobs` takes expired listings off the site so we never show a job that
 * closed a month ago. `deleteStaleJobs` removes the rows themselves once we
 * have held them past the retention window — until now nothing was ever
 * deleted, so every listing the ingest had seen stayed for good.
 *
 * Expiring first means a listing that passes its date this week is off the site
 * immediately and deleted on whichever later run it is old enough for, rather
 * than lingering an extra week in between.
 */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const expired = await pruneJobs();
    const deleted = await deleteStaleJobs();
    return Response.json({ ok: true, expired, deleted });
  } catch (err) {
    console.error(`[cron/prune] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
