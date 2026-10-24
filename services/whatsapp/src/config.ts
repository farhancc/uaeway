/**
 * Everything the worker needs from the environment, read once at startup so a
 * missing variable fails immediately rather than at 7am.
 *
 * Importing this module *is* the check, so anything that does not need the full
 * set — `pair.ts`, which runs before `WHATSAPP_GROUP_JID` can even be known —
 * imports `env.ts` instead.
 */

import { list, required } from "./env.js";

function digestUrl(): string {
  return required("DIGEST_URL");
}

/** The public site, for the links the worker writes itself. The listing links
 *  come from the site already built, so this is only the attestation nudge. */
function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return new URL(digestUrl()).origin;
}

export const config = {
  mongoUri: required("MONGODB_URI"),
  mongoDb: required("MONGODB_DB"),

  /** Returns the approved listings. `?format=json` is the shape used here. */
  digestUrl: digestUrl(),
  /** Where scraped listings are posted for enrichment and review. */
  ingestUrl: process.env.INGEST_URL || new URL("/api/ingest/jobs", digestUrl()).toString(),
  /** Same secret the site's scheduled routes use; both endpoints are behind it. */
  cronSecret: required("CRON_SECRET"),
  siteUrl: siteUrl(),

  /**
   * Looks like 120363041234567890@g.us — `npm run pair` prints it.
   *
   * Not `required()`, unlike everything else here, because the scrape half of
   * this worker never touches WhatsApp: `npm run scrape` is how you test the
   * Google pipeline before a group exists, and demanding a group JID to do it
   * would mean inventing a fake one. `index.ts` asserts it at startup instead,
   * so `npm start` still refuses to run half-configured.
   */
  groupJid: process.env.WHATSAPP_GROUP_JID ?? "",

  // --- Google, through Serper -------------------------------------------------

  serperKey: required("SERPER_API_KEY"),
  /**
   * What to search for. Each keyword is run against each location against each
   * board target, and **every query costs one Serper credit** — the defaults
   * are 6 × 2 × 2 = 24 credits a run. Read the credit arithmetic in the README
   * before adding to either list.
   */
  serperKeywords: list("SERPER_KEYWORDS", [
    "accountant",
    "sales executive",
    "driver",
    "nurse",
    "receptionist",
    "engineer",
  ]),
  /** The two emirates with real volume. The board has almost nothing outside
   *  Dubai, Abu Dhabi and Sharjah. */
  serperLocations: list("SERPER_LOCATIONS", ["Dubai", "Abu Dhabi"]),
  /** Results per query. 10 is one credit; asking for more costs more. */
  serperNum: Number(process.env.SERPER_NUM ?? 10),

  // --- Schedules --------------------------------------------------------------

  /**
   * Every hour from 7am to 10pm, which is sixteen posts a day.
   *
   * The post only goes out if there are approved listings the group has not
   * already been sent, so a quiet stretch is silence rather than a repeat.
   */
  postCron: process.env.POST_CRON ?? "0 7-22 * * *",
  /**
   * The scrape runs twice a day, not hourly, for two reasons: Google's index of
   * a job board does not meaningfully change within an hour, and sixteen
   * scrapes a day would be 384 Serper credits a day on the defaults.
   */
  scrapeCron: process.env.SCRAPE_CRON ?? "0 7,14 * * *",
  timezone: process.env.POST_TZ ?? "Asia/Kolkata",

  // --- Posting shape ----------------------------------------------------------

  /** At most this many listings per message; fewer when fewer are new. Three
   *  fits a phone screen without scrolling past the safety line. */
  jobsPerPost: Number(process.env.JOBS_PER_POST ?? 3),
  /** How many approved listings to pull and filter against the posted log. It
   *  has to exceed what a day of posting can drain. */
  boardPoolSize: Number(process.env.BOARD_POOL_SIZE ?? 60),
  /**
   * Posts land up to this many minutes after the hour, at random.
   *
   * A message at exactly 09:00:00.4 every hour is a robot, and WhatsApp's own
   * abuse heuristics are not the only thing reading it — so is the group.
   */
  jitterMinutes: Number(process.env.JITTER_MINUTES ?? 7),

  /**
   * The local status/trigger server. Bound to loopback, not every interface:
   * this runs on a laptop, often on a shared network, and `POST /run` is
   * guarded by nothing but CRON_SECRET.
   */
  port: Number(process.env.PORT ?? 3100),
  host: process.env.HOST ?? "127.0.0.1",
} as const;
