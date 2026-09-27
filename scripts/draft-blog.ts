/**
 * Drafts blog posts from published guides using Claude, for a run outside the
 * cron schedule — checking the pipeline works, or catching up after adding new
 * guides.
 *
 * Run: npm run draft:blog [count]
 */

import { draftBlogPosts } from "../lib/content/blog-drafts";

async function main() {
  const count = Number(process.argv[2]) || 3;
  const result = await draftBlogPosts(count);

  console.log(
    `\n${result.eligible} guide(s) without a derived post, ${result.drafted} drafted, ` +
      `${result.skipped} skipped.`,
  );
  if (result.drafted > 0) console.log("Review them at /admin before they publish.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
