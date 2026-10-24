import { pushListings } from "./push.js";
import { fetchSerperListings } from "./serper.js";

/**
 * One scrape, on demand, with no WhatsApp involved.
 *
 *   npm run scrape           search, push, report
 *   npm run scrape -- --dry  search and report, push nothing
 *
 * This exists because the two halves of the worker can be tested
 * independently, and the Google half is the one worth checking first: it needs
 * no group, no pairing and no deployed site. A dry run costs only Serper
 * credits and writes nothing anywhere, which makes it the right way to check a
 * new keyword or a new board pattern.
 */
async function main(): Promise<void> {
  const dry = process.argv.includes("--dry");

  const listings = await fetchSerperListings();

  console.log(`\n${listings.length} postings passed the single-listing filter:\n`);
  for (const listing of listings) {
    console.log(`  ${listing.title}`);
    console.log(`    ${listing.sourceName} · ${listing.locations} · ${listing.sourceUrl}`);
  }

  if (listings.length === 0) {
    console.log("  (none — if every board logged 0 of 10, their URLs have changed)");
  }

  if (dry) {
    console.log("\n--dry: nothing was pushed to the site.");
    return;
  }

  console.log("");
  const result = await pushListings(listings);
  console.log(
    `\n${result.inserted} new on the site: ${result.approved} approved, ` +
      `${result.inserted - result.approved} waiting in the admin queue, ` +
      `${result.skipped} already held.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\nscrape failed: ${(err as Error).message}`);
    process.exit(1);
  });
