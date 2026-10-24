import { createServer } from "node:http";
import { MongoClient } from "mongodb";
import cron from "node-cron";
import { fetchUnpostedJobs } from "./board.js";
import { WhatsAppClient } from "./client.js";
import { config } from "./config.js";
import { composeMessage } from "./message.js";
import { PostedLog } from "./posted.js";
import { pushListings } from "./push.js";
import { fetchSerperListings } from "./serper.js";

/**
 * The worker: find jobs on Google, hand them to the site, post the approved
 * ones to WhatsApp.
 *
 * Two schedules, on purpose, because the two halves move at different speeds:
 *
 *   scrape  twice a day   Google's index of a job board does not change by the
 *                         hour, and every query costs a Serper credit
 *   post    hourly, 7-22  drains the pool of approved listings the group has
 *                         not seen, a few at a time, and says nothing when
 *                         there is nothing new
 *
 * They are not chained. A scrape produces listings that mostly wait for review
 * in the admin queue, so there is no moment when "the scrape finished" means
 * "there is something to post" — the post reads whatever is approved now,
 * whenever that approval happened.
 */

type RunOutcome = { ok: boolean; detail: string; at: string };

let lastPost: RunOutcome | null = null;
let lastScrape: RunOutcome | null = null;
let posting = false;
let scraping = false;

function iso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  // Checked here rather than in `config`, so the scrape script can run without
  // a group. This is the process that posts, so for this one it is fatal.
  if (!config.groupJid) {
    throw new Error(
      "WHATSAPP_GROUP_JID is not set — run `npm run pair` to list your groups and copy its JID into .env",
    );
  }

  const mongo = new MongoClient(config.mongoUri);
  await mongo.connect();
  const db = mongo.db(config.mongoDb);
  console.log(`[worker] mongo connected (${config.mongoDb})`);

  const posted = new PostedLog(db);
  await posted.init();

  const client = new WhatsAppClient(db);

  /** Google -> the site. Enrichment and the review decision happen there. */
  const scrape = async (trigger: string): Promise<RunOutcome> => {
    if (scraping) return { ok: false, detail: "already scraping", at: iso() };
    scraping = true;

    try {
      const listings = await fetchSerperListings();
      const result = await pushListings(listings);
      const detail =
        `found ${listings.length}, ${result.inserted} new ` +
        `(${result.approved} approved, ${result.inserted - result.approved} for review)`;
      console.log(`[worker] ${trigger} scrape: ${detail}`);
      return (lastScrape = { ok: true, detail, at: iso() });
    } catch (err) {
      const detail = (err as Error).message;
      console.error(`[worker] ${trigger} scrape failed: ${detail}`);
      return (lastScrape = { ok: false, detail, at: iso() });
    } finally {
      scraping = false;
    }
  };

  /**
   * One hour's post.
   *
   * `jitter` is only for the scheduled run: a manual trigger should answer now,
   * and nothing is watching a hand-typed curl for machine-like timing.
   */
  const post = async (trigger: string, jitter: boolean): Promise<RunOutcome> => {
    if (posting) return { ok: false, detail: "already posting", at: iso() };
    posting = true;

    try {
      // Walks the board from the newest until it finds enough the group has
      // not been sent. Paging matters: the board holds far more approved
      // listings than one page, and every one of them is meant to go out.
      const { ready: batch, approved } = await fetchUnpostedJobs(
        config.jobsPerPost,
        (jobs) => posted.unposted(jobs),
      );

      if (batch.length === 0) {
        const detail = `nothing new (${approved} approved, all already sent)`;
        console.log(`[worker] ${trigger}: ${detail}`);
        return (lastPost = { ok: true, detail, at: iso() });
      }

      const message = composeMessage(batch);
      if (!message) {
        return (lastPost = { ok: true, detail: "nothing to say", at: iso() });
      }

      if (jitter && config.jitterMinutes > 0) {
        const delay = Math.floor(Math.random() * config.jitterMinutes * 60_000);
        console.log(`[worker] ${trigger}: waiting ${Math.round(delay / 1000)}s before posting`);
        await sleep(delay);
      }

      await client.sendText(config.groupJid, message);

      // Only now, and only for what actually went out. See `markPosted`.
      await posted.markPosted(batch.map((j) => j.slug));

      const detail = `posted ${batch.length} of ${approved} approved listing(s)`;
      console.log(`[worker] ${trigger}: ${detail}`);
      return (lastPost = { ok: true, detail, at: iso() });
    } catch (err) {
      const detail = (err as Error).message;
      console.error(`[worker] ${trigger} failed: ${detail}`);
      return (lastPost = { ok: false, detail, at: iso() });
    } finally {
      posting = false;
    }
  };

  // A small loopback server, so a run can be triggered and the state inspected
  // without reading the log. Not a web interface and not reachable off the
  // machine — see `config.host`.
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const authorized = req.headers.authorization === `Bearer ${config.cronSecret}`;

    const trigger = (
      name: string,
      run: () => Promise<RunOutcome>,
    ): void => {
      if (!authorized) {
        res.writeHead(401).end("unauthorized");
        return;
      }
      void run().then((outcome) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ trigger: name, ...outcome }));
      });
    };

    if (req.method === "POST" && url.pathname === "/run") {
      trigger("manual post", () => post("manual", false));
      return;
    }

    if (req.method === "POST" && url.pathname === "/scrape") {
      trigger("manual scrape", () => scrape("manual"));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        whatsapp: client.getStatus(),
        schedules: {
          post: `${config.postCron} (${config.timezone})`,
          scrape: `${config.scrapeCron} (${config.timezone})`,
        },
        lastPost,
        lastScrape,
      }),
    );
  });

  server.listen(config.port, config.host, () => {
    console.log(`[worker] status on http://${config.host}:${config.port}`);
  });

  cron.schedule(config.postCron, () => void post("scheduled", true), {
    timezone: config.timezone,
  });
  cron.schedule(config.scrapeCron, () => void scrape("scheduled"), {
    timezone: config.timezone,
  });
  console.log(
    `[worker] posting "${config.postCron}", scraping "${config.scrapeCron}" (${config.timezone})`,
  );

  // Started last and not awaited: a session that needs re-pairing must not stop
  // the scrape from running or the status endpoint from answering.
  client.start().catch((err) => {
    console.error(`[worker] whatsapp did not start: ${(err as Error).message}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} — shutting down`);
    client.stop();
    server.close();
    await mongo.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(`[worker] fatal: ${(err as Error).message}`);
  process.exit(1);
});
