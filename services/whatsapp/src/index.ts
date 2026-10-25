import { createServer } from "node:http";
import { MongoClient } from "mongodb";
import cron from "node-cron";
import { countApprovedSince, fetchUnpostedJobs } from "./board.js";
import { WhatsAppClient } from "./client.js";
import { config } from "./config.js";
import { composeMessage } from "./message.js";
import {
  nextWindowOpen,
  pickBatchSize,
  pickDelay,
  windowClosesAt,
  windowOpenedAt,
  withinWindow,
  type Window,
} from "./pacing.js";
import { PostedLog } from "./posted.js";
import { pushListings } from "./push.js";
import { fetchSerperListings } from "./serper.js";

/**
 * The worker: find jobs on Google, hand them to the site, post the approved
 * ones to WhatsApp.
 *
 * The two halves move at different speeds and are scheduled differently:
 *
 *   scrape  a cron, twice a day — Google's index of a job board does not
 *           change by the hour, and every query costs a Serper credit
 *   post    no cron at all. Everything the site took in today goes out today,
 *           from every source, in batches of a few, each post choosing its own
 *           delay before the next. See `pacing.ts`: a fixed count at a fixed
 *           minute is the most obvious sign that nobody is typing these.
 *
 * Two pools, paced differently. The day's intake has to clear by the time the
 * window closes, so it sets the rhythm. Behind it sit the hundreds of listings
 * the board already held, which get a small allowance per day — without one
 * they would never be posted at all, and with no limit a single catch-up day
 * would swamp the group.
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
let stopping = false;
let poll: NodeJS.Timeout | null = null;
let nextPostAt: Date | null = null;

/**
 * How often the worker asks itself whether a post is due.
 *
 * The decision is a wall-clock comparison against `nextPostAt`, checked on a
 * short interval, rather than one long timer set for the gap. That is because
 * this runs on a laptop: Node's timers count monotonic time, which does not
 * advance while the machine is suspended, so a two-hour timer across an
 * overnight sleep would fire two hours after waking — and a day's posting
 * could be skipped entirely. A date survives suspend; a timer does not.
 */
const POLL_MS = 60_000;

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

  const window: Window = {
    startHour: config.windowStartHour,
    endHour: config.windowEndHour,
    timezone: config.timezone,
  };

  /**
   * What is still owed today, split by pool.
   *
   * `intake` is every listing the site took in since the window opened that
   * the group has not been sent — all of it is due today. `backlog` is the
   * allowance left for older listings, counted from the log rather than
   * stored, so a restart cannot double it.
   */
  const owed = async (now: Date) => {
    const since = windowOpenedAt(now, window);
    const [intakeTotal, intakePosted, backlogPosted] = await Promise.all([
      countApprovedSince(since),
      posted.countSince(since, { backlog: false }),
      posted.countSince(since, { backlog: true }),
    ]);

    return {
      since,
      intake: Math.max(intakeTotal - intakePosted, 0),
      backlog: Math.max(config.backlogPerDay - backlogPosted, 0),
    };
  };

  /**
   * One message.
   *
   * `want` is how many listings to carry and `addedSince` which pool to draw
   * from. A manual trigger passes neither and gets a full batch from anywhere,
   * because someone testing wants to see a post rather than wait for a pool to
   * have something in it.
   */
  const post = async (
    trigger: string,
    opts: { want?: number; addedSince?: Date; backlog?: boolean } = {},
  ): Promise<RunOutcome> => {
    if (posting) return { ok: false, detail: "already posting", at: iso() };
    posting = true;

    try {
      const want = opts.want ?? config.maxPerPost;
      if (want <= 0) {
        return (lastPost = { ok: true, detail: "nothing due", at: iso() });
      }

      // Walks the board from the newest until it finds enough the group has
      // not been sent. Paging matters: the board holds far more approved
      // listings than one page, and every one of them is meant to go out.
      const { ready: batch, approved } = await fetchUnpostedJobs(
        want,
        (jobs) => posted.unposted(jobs),
        { addedSince: opts.addedSince },
      );

      if (batch.length === 0) {
        const detail = `nothing new (${approved} approved in that pool, all already sent)`;
        console.log(`[worker] ${trigger}: ${detail}`);
        return (lastPost = { ok: true, detail, at: iso() });
      }

      const message = composeMessage(batch);
      if (!message) {
        return (lastPost = { ok: true, detail: "nothing to say", at: iso() });
      }

      await client.sendText(config.groupJid, message);

      // Only now, and only for what actually went out. See `markPosted`.
      await posted.markPosted(
        batch.map((j) => j.slug),
        { backlog: opts.backlog === true },
      );

      const detail = `posted ${batch.length} ${opts.backlog ? "from the backlog" : "of today's intake"}`;
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

  /** Records when the next post is due. Nothing sleeps on it; `tick` compares
   *  the clock against it. */
  const planNext = (delayMs: number, why: string): void => {
    nextPostAt = new Date(Date.now() + delayMs);
    console.log(
      `[worker] next post ${nextPostAt.toLocaleString("en-GB", { timeZone: config.timezone })} (${why})`,
    );
  };

  const untilNextWindow = (from: Date) => nextWindowOpen(from, window).getTime() - from.getTime();

  /**
   * Is a post due, and if so, when is the one after it?
   *
   * Runs every minute and almost always returns immediately. Everything it
   * needs comes from the clock, the board and the posted log, so a restart, a
   * suspend or a day that ran dry all resolve themselves with no stored
   * schedule.
   */
  const tick = async (): Promise<void> => {
    if (stopping || posting) return;

    const now = new Date();
    if (nextPostAt && now.getTime() < nextPostAt.getTime()) return;

    if (!withinWindow(now, window)) {
      planNext(untilNextWindow(now), "window closed");
      return;
    }

    const due = await owed(now);
    const remaining = due.intake + due.backlog;

    if (remaining <= 0) {
      planNext(untilNextWindow(now), "today's intake is clear");
      return;
    }

    // Today's intake first, always. The backlog only gets a turn once there is
    // nothing left that arrived today, so a busy ingest never stalls behind
    // catch-up.
    const fromIntake = due.intake > 0;
    const pool = fromIntake ? due.intake : due.backlog;
    const size = pickBatchSize(pool, config.minPerPost, config.maxPerPost, Math.random);

    await post("scheduled", {
      want: size,
      addedSince: fromIntake ? due.since : undefined,
      backlog: !fromIntake,
    });

    const after = await owed(new Date());
    const left = after.intake + after.backlog;
    const msLeft = windowClosesAt(now, window).getTime() - Date.now();

    if (left <= 0 || msLeft <= 0) {
      planNext(
        untilNextWindow(new Date()),
        left <= 0 ? "today's intake is clear" : "window closed",
      );
      return;
    }

    planNext(
      pickDelay({
        // Paced on the intake alone when there is any: that is the part with a
        // deadline. The backlog allowance rides along at whatever rhythm the
        // intake sets, and sets its own once the intake is clear.
        remaining: after.intake > 0 ? after.intake : after.backlog,
        minPerPost: config.minPerPost,
        maxPerPost: config.maxPerPost,
        msLeftInWindow: msLeft,
        rng: Math.random,
      }),
      `${after.intake} of today's intake + ${after.backlog} backlog left`,
    );
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
      trigger("manual post", () => post("manual", {}));
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
        posting: {
          rule: "everything taken in today, plus a backlog allowance",
          backlogPerDay: config.backlogPerDay,
          perMessage: `${config.minPerPost}-${config.maxPerPost}`,
          window: `${config.windowStartHour}:00-${config.windowEndHour}:59 ${config.timezone}`,
          nextPostAt: nextPostAt?.toISOString() ?? null,
        },
        scrape: `${config.scrapeCron} (${config.timezone})`,
        lastPost,
        lastScrape,
      }),
    );
  });

  server.listen(config.port, config.host, () => {
    console.log(`[worker] status on http://${config.host}:${config.port}`);
  });

  cron.schedule(config.scrapeCron, () => void scrape("scheduled"), {
    timezone: config.timezone,
  });
  console.log(
    `[worker] today's intake + up to ${config.backlogPerDay} older, ` +
      `${config.minPerPost}-${config.maxPerPost} a message, ` +
      `${config.windowStartHour}:00-${config.windowEndHour}:59 ${config.timezone}; ` +
      `scraping "${config.scrapeCron}"`,
  );

  // The first post is soon but not instant: posting the moment the process
  // starts would make every restart, and every laptop lid, visible in the
  // group.
  planNext(
    withinWindow(new Date(), window)
      ? 60_000 + Math.random() * 4 * 60_000
      : untilNextWindow(new Date()),
    "startup",
  );
  poll = setInterval(() => void tick(), POLL_MS);

  // Started last and not awaited: a session that needs re-pairing must not stop
  // the scrape from running or the status endpoint from answering.
  client.start().catch((err) => {
    console.error(`[worker] whatsapp did not start: ${(err as Error).message}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} — shutting down`);
    stopping = true;
    if (poll) clearInterval(poll);
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
