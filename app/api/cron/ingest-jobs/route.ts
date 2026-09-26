import { assertCron } from "@/lib/cron";
import { ingestJobs } from "@/lib/ingest/jobs";

/** Scheduled daily. Fetches, summarizes and queues jobs for review — it never
 *  publishes anything. */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const result = await ingestJobs();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[cron/ingest-jobs] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// Summarizing a batch of listings takes longer than the default limit.
export const maxDuration = 300;
