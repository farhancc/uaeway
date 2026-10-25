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
  /** Recent leads, for forwarding to a phone. Guarded by the same secret. */
  leadsUrl: process.env.LEADS_URL || new URL("/api/leads", digestUrl()).toString(),
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

  /**
   * Phone number new leads are forwarded to, with country code and no symbols.
   *
   * Empty switches the forwarding off, which is the right default: the site's
   * own Telegram and email alerts fire the moment a lead lands and are the
   * reliable channel. This one only works while the laptop is on.
   */
  leadNumber: (process.env.LEAD_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  /** How often to ask the site for new leads. A lead wants a callback, so this
   *  is the one thing here that should not wait an hour. */
  leadPollMs: Number(process.env.LEAD_POLL_SECONDS ?? 120) * 1000,

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
  /**
   * Listings per request to the site.
   *
   * Small because the site enriches every one through Gemini before it answers,
   * and that is the slow part: measured 2026-10-24, five listings took 49
   * seconds and seven took 78 — about 40 seconds per round of five. The route
   * allows itself 300 seconds, so fifteen (three rounds, ~120s) leaves real
   * headroom for a slow day.
   *
   * The first run ignored this and posted all 145 findings in one request,
   * which never finished and lost the lot to `fetch failed`. A run is now ten
   * requests that each either land or lose fifteen listings Google will
   * return again tomorrow.
   */
  ingestBatch: Number(process.env.INGEST_BATCH ?? 15),

  // --- Schedules --------------------------------------------------------------

  /**
   * Listings per message.
   *
   * The day no longer has a fixed budget: everything the site took in that day
   * is meant to go out that day, from every source. Which makes the batch size
   * the thing that decides whether the group is readable — forty-seven
   * listings at one or two a message is thirty-one messages, and a heavy
   * scrape day would be ninety. At three to eight it is a handful, and the
   * count still varies message to message.
   */
  minPerPost: Number(process.env.MIN_PER_POST ?? 3),
  maxPerPost: Number(process.env.MAX_PER_POST ?? 8),
  /**
   * How many listings from *before* today may go out in a day.
   *
   * The board already held hundreds of approved listings before any of this,
   * and they would otherwise never be posted — the day's intake is the only
   * thing the pacing is obliged to clear. This drains the rest steadily
   * without letting one day's catch-up swamp the group.
   */
  backlogPerDay: Number(process.env.BACKLOG_PER_DAY ?? 10),
  /** Posting hours, local to the zone below. 22 means the last post may land
   *  at 22:59. */
  windowStartHour: Number(process.env.POST_START_HOUR ?? 7),
  windowEndHour: Number(process.env.POST_END_HOUR ?? 22),
  /**
   * The scrape runs twice a day, not hourly, for two reasons: Google's index of
   * a job board does not meaningfully change within an hour, and sixteen
   * scrapes a day would be 384 Serper credits a day on the defaults.
   */
  scrapeCron: process.env.SCRAPE_CRON ?? "0 7,14 * * *",
  timezone: process.env.POST_TZ ?? "Asia/Kolkata",

  // --- Posting shape ----------------------------------------------------------

  /** How many approved listings to pull and filter against the posted log. It
   *  has to exceed what a day of posting can drain. */
  boardPoolSize: Number(process.env.BOARD_POOL_SIZE ?? 60),

  /**
   * The local status/trigger server. Bound to loopback, not every interface:
   * this runs on a laptop, often on a shared network, and `POST /run` is
   * guarded by nothing but CRON_SECRET.
   */
  port: Number(process.env.PORT ?? 3100),
  host: process.env.HOST ?? "127.0.0.1",
} as const;
