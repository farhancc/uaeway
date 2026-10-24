import type { BoardJob } from "./board.js";
import { config } from "./config.js";

/**
 * The WhatsApp message.
 *
 * Sixteen posts a day from the same template reads as a bot within about two
 * days, and a group mutes a bot. So the framing varies — the greeting follows
 * the hour, the lead-in rotates, the sign-off is not always there — while
 * every fact stays exactly as the site holds it.
 *
 * That line matters. The variation is in authored phrasing picked by a clock,
 * not in a model rewriting the post: the listings already carry a Gemini
 * summary that a person either approved or that passed the narrow auto-approve
 * gate, and handing that prose to a second model to make it chatty is how a
 * salary nobody advertised ends up in a group of jobseekers. Nothing here
 * rewrites, infers or rounds a fact. Pay appears only when the employer stated
 * it, and then word for word.
 */

/** The hour in the posting timezone, not the machine's. */
function localHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  return Number(hour) % 24;
}

/**
 * Rotation that cannot repeat two posts running.
 *
 * Keyed on the hour rather than random: a random pick repeats roughly one hour
 * in five, and two identical openers in a row is exactly what makes a feed
 * look automated. Hour-keyed means the phrasing only comes round once the list
 * has been through.
 */
function rotate<T>(options: readonly T[], now: Date): T {
  const hours = Math.floor(now.getTime() / 3_600_000);
  // `noUncheckedIndexedAccess` is on, and a non-empty list is the caller's
  // contract, so the fallback is for the compiler rather than for runtime.
  return options[hours % options.length] ?? options[0]!;
}

const MORNING = [
  "Morning — a few new openings just went up:",
  "Good morning. Fresh on the board:",
  "Morning, everyone. These came in:",
  "Starting the day with a few new ones:",
] as const;

const AFTERNOON = [
  "Just added to the board:",
  "A couple more came through:",
  "New this afternoon:",
  "Still coming in — these are new:",
] as const;

const EVENING = [
  "Last few for today:",
  "Evening update — these are new:",
  "Posted this evening:",
  "Wrapping up the day with these:",
] as const;

function opener(now: Date, count: number): string {
  const hour = localHour(now);
  const pool = hour < 12 ? MORNING : hour < 17 ? AFTERNOON : EVENING;
  const line = rotate(pool, now);

  // "a few new openings" is wrong for one job, and the one-job case is the
  // common one late in the day when the pool is nearly drained.
  if (count === 1) {
    return line
      .replace(/a few new openings just went up/i, "one new opening just went up")
      .replace(/a few new ones/i, "one more")
      .replace(/a couple more came through/i, "one more came through")
      .replace(/these came in/i, "this one came in")
      .replace(/these are new/i, "this one is new")
      .replace(/Last few for today/i, "Last one for today")
      .replace(/with these/i, "with this one");
  }
  return line;
}

/** Shown only now and then. Every hour and it is wallpaper; never and nobody
 *  learns that attestation is a thing they will need. */
const NUDGES = [
  `Most UAE employers want your degree and experience certificates translated and attested before the work permit is issued. If you are not sure what yours needs, ask here: ${config.siteUrl}/en/services/attestation`,
  `Worth sorting early: certificates usually need attesting before a work permit goes through. ${config.siteUrl}/en/services/attestation`,
] as const;

/** A summary long enough to be useful, short enough that three fit on a phone
 *  screen. Cut at a word, never mid-word. */
function trim(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

function renderJob(job: BoardJob): string[] {
  const lines = [`*${job.title}*`];

  // Where and who, on one line, skipping whatever the listing does not have.
  const where = [job.emirate, job.company].filter(Boolean).join(" · ");
  if (where) lines.push(where);

  // Verbatim or absent. The site only fills this in when the employer stated a
  // figure, and this is the end of the chain that carries it unchanged.
  if (job.salaryText) lines.push(job.salaryText);

  if (job.summary) lines.push(trim(job.summary));
  lines.push(job.url);

  return lines;
}

/**
 * The post, or null when there is nothing new to say.
 *
 * Null rather than a "no jobs today" message on purpose: a group that gets
 * sixteen "nothing new" notices a day is a group that mutes this.
 */
export function composeMessage(jobs: BoardJob[], now = new Date()): string | null {
  if (jobs.length === 0) return null;

  const lines = [opener(now, jobs.length), ""];

  for (const job of jobs) {
    lines.push(...renderJob(job));
    lines.push("");
  }

  // Not rotated and not softened. People are asked for money for these jobs
  // every day, and it is the one line in the message worth repeating verbatim
  // every single time.
  lines.push("Never pay a fee to be given a job.");

  // Roughly every third post, so it lands often enough to be read.
  const hours = Math.floor(now.getTime() / 3_600_000);
  if (hours % 3 === 0) {
    lines.push("");
    lines.push(rotate(NUDGES, now));
  }

  return lines.join("\n");
}
