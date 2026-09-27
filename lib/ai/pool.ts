/**
 * Rotating pool over several Gemini API keys.
 *
 * The point is throughput and resilience: a rate-limited, exhausted or revoked
 * key must never stall the nightly ingest, and per-key quota is the binding
 * constraint when summarizing hundreds of jobs.
 *
 * How long a key is benched depends on *why* it failed. Treating "out of
 * credit" like a blip meant a dead key came back every minute and failed again
 * all day, costing a round trip and a backoff wait each time.
 *
 * State is per-process. On serverless that means per instance, so the bench is
 * an optimization rather than a guarantee.
 */

/** Why a key failed, which decides how long it sits out. */
export type FailureKind =
  /** Network error or 5xx. Probably nothing to do with this key. */
  | "transient"
  /** Too many requests right now. Comes back on its own. */
  | "rate-limited"
  /** Quota or credit used up. Not coming back for a while. */
  | "exhausted"
  /** Key rejected, revoked or mistyped. Not coming back without a human. */
  | "invalid";

const COOLDOWN_MS: Record<FailureKind, number> = {
  transient: 30_000,
  "rate-limited": 60_000,
  exhausted: 60 * 60_000,
  // Long enough to stay out of the way, short enough to recover on its own if
  // the key is re-enabled without a redeploy.
  invalid: 24 * 60 * 60_000,
};

/** Only a transient failure gets the benefit of the doubt. A definite quota or
 *  auth failure benches the key on the first response — a second attempt just
 *  confirms what the API already told us plainly. */
const FAILURES_BEFORE_COLD: Record<FailureKind, number> = {
  transient: 2,
  "rate-limited": 1,
  exhausted: 1,
  invalid: 1,
};

export interface KeyState {
  key: string;
  /** Safe to log: the last four characters, never the key itself. */
  label: string;
  failures: number;
  /** Epoch ms before which this key is skipped. */
  coldUntil: number;
  /** Why it is benched, for the log line that explains an outage. */
  reason: FailureKind | null;
}

let pool: KeyState[] | null = null;
let cursor = 0;

function load(): KeyState[] {
  // GEMINI_API_KEYS is the comma-separated pool. GEMINI_API_KEY is accepted as a
  // single-key fallback so the prototype's .env.local keeps working.
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return [...new Set(keys)].map((key, i) => ({
    key,
    label: `#${i + 1} …${key.slice(-4)}`,
    failures: 0,
    coldUntil: 0,
    reason: null,
  }));
}

function states(): KeyState[] {
  if (pool === null) pool = load();
  return pool;
}

export function poolSize(): number {
  return states().length;
}

/**
 * Keys to try for one logical request, warm keys first, starting after the last
 * key handed out so load spreads evenly. Cold keys are kept at the end rather
 * than dropped: if every key is benched we would still rather try one than fail
 * without attempting anything.
 */
export function candidates(): KeyState[] {
  const all = states();
  if (all.length === 0) return [];

  const now = Date.now();
  const ordered = all.map((_, i) => all[(cursor + i) % all.length]);
  cursor = (cursor + 1) % all.length;

  const warm = ordered.filter((s) => s.coldUntil <= now);
  const cold = ordered.filter((s) => s.coldUntil > now);
  return [...warm, ...cold];
}

export function reportSuccess(state: KeyState): void {
  state.failures = 0;
  state.coldUntil = 0;
  state.reason = null;
}

/**
 * Records a failure and benches the key if it has earned it.
 *
 * `retryAfterMs` comes from the API's own RetryInfo when it sends one — it
 * knows better than our defaults do.
 */
export function reportFailure(
  state: KeyState,
  kind: FailureKind = "transient",
  retryAfterMs?: number,
): void {
  state.failures += 1;
  if (state.failures < FAILURES_BEFORE_COLD[kind]) return;

  const wait = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : COOLDOWN_MS[kind];
  state.coldUntil = Date.now() + wait;
  state.reason = kind;
  state.failures = 0;

  console.warn(
    `[gemini] key ${state.label} benched for ${Math.round(wait / 1000)}s (${kind})` +
      (kind === "invalid" || kind === "exhausted"
        ? " — this one needs attention: replace it in GEMINI_API_KEYS or top up its quota"
        : ""),
  );
}

/** Which keys are usable right now. Per-process, so it describes this instance
 *  rather than the deployment as a whole. */
export function poolStatus(): {
  label: string;
  usable: boolean;
  reason: FailureKind | null;
  benchedForSeconds: number;
}[] {
  const now = Date.now();
  return states().map((s) => ({
    label: s.label,
    usable: s.coldUntil <= now,
    reason: s.coldUntil > now ? s.reason : null,
    benchedForSeconds: s.coldUntil > now ? Math.round((s.coldUntil - now) / 1000) : 0,
  }));
}

/** Test seam: forces the pool to be re-read from the environment. */
export function resetPool(): void {
  pool = null;
  cursor = 0;
}
