/**
 * When to post next, and how much.
 *
 * The old model was a cron: every hour on the hour, three listings. That is
 * three things a reader notices — the same count, the same minute, and far
 * more volume than a person would ever post. The brief now is ten listings a
 * day, one or two at a time, at intervals nobody can predict.
 *
 * A cron cannot express that, so posting is no longer scheduled: each post
 * picks its own delay before the next one. The daily budget is not stored
 * either — it is counted from the posted log, which already timestamps every
 * listing sent. That matters for restarts: a worker that comes back at noon
 * recounts what the morning already sent instead of starting the day again.
 *
 * Everything here is pure and takes its randomness as an argument, so the
 * pacing can be tested without waiting for a day to pass.
 */

/** A source of randomness in [0, 1). `Math.random` in production. */
export type Rng = () => number;

export interface Window {
  /** Local hour the day's posting may start, inclusive. */
  startHour: number;
  /** Local hour after which nothing is posted. 22 means the last post may
   *  land at 22:59. */
  endHour: number;
  /** IANA zone the hours are read in. */
  timezone: string;
}

/**
 * The offset between a zone's wall clock and UTC at a given instant.
 *
 * Doing this with `Intl` rather than a date library: formatting an instant in
 * the zone gives its wall-clock reading, and the gap between that reading
 * taken as UTC and the instant itself is the offset. One pass is enough for a
 * zone without DST, which Asia/Kolkata is.
 */
function offsetMs(at: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const read: Record<string, string> = {};
  for (const part of parts) read[part.type] = part.value;

  const asUtc = Date.UTC(
    Number(read.year),
    Number(read.month) - 1,
    Number(read.day),
    // Some ICU builds render midnight as "24" under hour12: false.
    Number(read.hour) % 24,
    Number(read.minute),
    Number(read.second),
  );
  return asUtc - at.getTime();
}

/** The zone's wall-clock fields for an instant. */
function zoned(at: Date, timezone: string) {
  const shifted = new Date(at.getTime() + offsetMs(at, timezone));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** A zone's wall-clock time, as the instant it refers to. */
function fromZoned(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, 0, 0);
  return new Date(guess - offsetMs(new Date(guess), timezone));
}

export function localHour(at: Date, timezone: string): number {
  return zoned(at, timezone).hour;
}

export function withinWindow(at: Date, window: Window): boolean {
  const hour = localHour(at, window.timezone);
  return hour >= window.startHour && hour <= window.endHour;
}

/**
 * The instant the current day's posting window opened.
 *
 * This is what the daily budget is counted from, so it has to be the *most
 * recent* opening rather than "midnight today": a post at 00:30 belongs to the
 * previous day's run, not to a day that has not started posting yet.
 */
export function windowOpenedAt(at: Date, window: Window): Date {
  const { year, month, day, hour } = zoned(at, window.timezone);

  if (hour >= window.startHour) {
    return fromZoned(year, month, day, window.startHour, window.timezone);
  }

  // Before the window opened, so the live budget is still yesterday's.
  const yesterday = new Date(at.getTime() - 24 * 3_600_000);
  const y = zoned(yesterday, window.timezone);
  return fromZoned(y.year, y.month, y.day, window.startHour, window.timezone);
}

/** The next time the window opens after `at`. */
export function nextWindowOpen(at: Date, window: Window): Date {
  const { year, month, day, hour } = zoned(at, window.timezone);

  if (hour < window.startHour) {
    return fromZoned(year, month, day, window.startHour, window.timezone);
  }

  const tomorrow = new Date(at.getTime() + 24 * 3_600_000);
  const t = zoned(tomorrow, window.timezone);
  return fromZoned(t.year, t.month, t.day, window.startHour, window.timezone);
}

/** When the window closes on the day `at` falls in. `endHour` is inclusive, so
 *  the window runs to the end of that hour. */
export function windowClosesAt(at: Date, window: Window): Date {
  const opened = windowOpenedAt(at, window);
  const o = zoned(opened, window.timezone);
  const hoursOpen = window.endHour - window.startHour + 1;
  return new Date(
    fromZoned(o.year, o.month, o.day, window.startHour, window.timezone).getTime() +
      hoursOpen * 3_600_000,
  );
}

/**
 * How many listings the next message carries.
 *
 * One or two, chosen at random, because a constant is the most obvious tell
 * that nobody is typing these. Never more than the budget has left, so the
 * day ends on its number rather than overshooting it.
 */
export function pickBatchSize(remaining: number, max: number, rng: Rng): number {
  const ceiling = Math.min(max, remaining);
  if (ceiling <= 1) return Math.max(ceiling, 0);
  return 1 + Math.floor(rng() * ceiling);
}

/** Never two posts within this of each other, however the arithmetic falls. */
export const MIN_GAP_MS = 11 * 60_000;

/**
 * How long to wait before the next post.
 *
 * Paced from what is left rather than fixed: the mean gap is the time
 * remaining in the window divided by the posts the remaining budget still
 * needs, and the actual delay is a wide random band around that mean. So the
 * day spreads itself out, the gaps are unpredictable, and a worker that
 * started late or was restarted catches up by posting a little closer together
 * instead of running past the window.
 */
export function pickDelay(
  opts: { remaining: number; maxPerPost: number; msLeftInWindow: number; rng: Rng },
): number {
  const { remaining, maxPerPost, msLeftInWindow, rng } = opts;

  const averageBatch = (1 + Math.min(maxPerPost, Math.max(remaining, 1))) / 2;
  const postsLeft = Math.max(Math.ceil(remaining / averageBatch), 1);
  const meanGap = msLeftInWindow / postsLeft;

  // 40%–160% of the mean. Wide enough to be genuinely irregular, not so wide
  // that two posts land on top of each other or the budget misses the window.
  const delay = meanGap * (0.4 + rng() * 1.2);

  return Math.max(Math.min(delay, Math.max(msLeftInWindow, 0)), MIN_GAP_MS);
}
