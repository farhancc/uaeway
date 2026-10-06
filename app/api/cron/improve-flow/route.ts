import { assertCron } from "@/lib/cron";
import { improveFlow } from "@/lib/chat/flow/improve";

/**
 * Nightly. Reads the last month of conversations and leaves suggestions for a
 * person.
 *
 * It writes only to `flow_proposals` — it cannot touch the draft, let alone the
 * live flow. Nothing a visitor sees changes without someone approving it at
 * /admin/flow/proposals.
 */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const report = await improveFlow();
    console.info(
      `[cron/improve-flow] ${report.gaps} unanswered questions → ${report.clusters} group(s) → ` +
        `${report.stored} new suggestion(s); ${report.skipped} already decided, ${report.unresolved} unresolved`,
    );
    return Response.json({ ok: true, ...report });
  } catch (err) {
    console.error(`[cron/improve-flow] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
