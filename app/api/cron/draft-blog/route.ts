import { assertCron } from "@/lib/cron";
import { draftBlogPosts } from "@/lib/content/blog-drafts";

/** Scheduled. Turns published guides into blog post drafts with Claude and
 *  queues them for review — it never publishes anything. */
export async function GET(request: Request) {
  const denied = assertCron(request);
  if (denied) return denied;

  try {
    const result = await draftBlogPosts();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[cron/draft-blog] ${(err as Error).message}`);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// Drafting a full post per guide is slower than the default limit.
export const maxDuration = 300;
