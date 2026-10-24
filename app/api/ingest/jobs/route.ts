import { ZodError } from "zod";
import { assertCron } from "@/lib/cron";
import { ingestRawJobs } from "@/lib/ingest/jobs";
import { ingestBody } from "@/lib/ingest/schema";

/**
 * Listings found somewhere this server cannot reach.
 *
 * The Google scraper runs on a laptop, not here: it holds its own Serper key,
 * and the WhatsApp worker it shares a process with needs a socket that no
 * serverless function can keep open. So it posts what it finds, and this
 * endpoint runs it through the same pipeline as the nightly feeds —
 * `ingestRawJobs` does the enrichment, the slugs, the duplicate check and the
 * review status, so a listing from the laptop is built exactly like a listing
 * from Jooble.
 *
 * Guarded by `CRON_SECRET`. This writes to the public jobs board and spends
 * money on Gemini, so it is the one endpoint here that must never be open.
 */
export async function POST(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const { jobs } = ingestBody.parse(await request.json());
    const result = await ingestRawJobs(jobs);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ZodError) {
      // The scraper is the only caller and it is being changed by hand, so the
      // detail is worth returning: a silent 400 here looks like a dead feed.
      return Response.json(
        { ok: false, error: "invalid body", issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof SyntaxError) {
      return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
    }
    console.error(`[api/ingest/jobs] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// A full batch is 200 listings through Gemini, same as the scheduled ingest.
export const maxDuration = 300;
