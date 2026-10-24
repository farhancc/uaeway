import { listJobs } from "@/lib/content/queries";
import { assertCron } from "@/lib/cron";
import { SITE } from "@/lib/site";
import { buildDigest } from "@/lib/social/jobs-digest";

/**
 * The approved listings, for whoever is posting them.
 *
 * `/api/cron/jobs-digest` already builds the daily text, but it also sends the
 * team's Telegram message on the way out. The WhatsApp worker has to pull
 * rather than be pushed to — Baileys needs a socket that outlives a serverless
 * invocation, so it runs on its own host and asks on its own schedule — and
 * reading the cron route every hour would mean a Telegram message every hour.
 *
 * Two shapes, because two callers want different things:
 *
 *  - no `format`: the day's digest as text, unchanged, for anything that wants
 *    something ready to paste.
 *  - `?format=json`: the approved listings as rows. The WhatsApp worker posts
 *    hourly and must not repeat itself, so it needs to know *which* jobs these
 *    are to compare against the ones it has already sent. Pre-rendered text
 *    cannot answer that, and tracking it here would mean this endpoint owning
 *    the state of a channel it does not post to.
 *
 * Guarded by the same CRON_SECRET as the scheduled routes: the listings are
 * public information, but an unauthenticated endpoint that queries the
 * database on every hit is something to be dragged, not left open.
 *
 * 204 on the text shape means nothing is approved to post, which the worker
 * treats as "stay quiet" rather than as a failure. The JSON shape says the
 * same thing with an empty array.
 */

/** The worker filters this pool down to what it has not posted, so it has to be
 *  bigger than one message — but it is still one query on a hot path. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 40;

export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  const url = new URL(request.url);

  try {
    if (url.searchParams.get("format") === "json") {
      const requested = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
      const limit = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
        : DEFAULT_LIMIT;

      const jobs = await listJobs({ limit });

      return Response.json({
        jobs: jobs.map((job) => ({
          slug: job.slug,
          title: job.title,
          company: job.company,
          emirate: job.emirate,
          category: job.category,
          summary: job.summary,
          // Verbatim employer text or null. Never a figure we worked out: the
          // board only parses a salary it is sure of, and a post that invents
          // one is the single most damaging thing this could send.
          salaryText: job.salary_text,
          postedAt: job.posted_at,
          url: `${SITE.url}/en/jobs/${job.slug}`,
        })),
      });
    }

    const digest = await buildDigest();
    if (!digest) return new Response(null, { status: 204 });

    return new Response(digest, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error(`[api/digest] ${(err as Error).message}`);
    return Response.json({ error: "digest unavailable" }, { status: 500 });
  }
}
