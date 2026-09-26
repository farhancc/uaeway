/**
 * Rotating pool over several Gemini API keys.
 *
 * We hold 5 AI Studio keys. The point of the pool is throughput and resilience:
 * a rate-limited or revoked key must never stall the nightly ingest, and the
 * per-key quota is the binding constraint when summarizing hundreds of jobs.
 *
 * State is per-process. On serverless that means per instance, which is fine —
 * the cold-key window is an optimization, not a correctness guarantee.
 */

const COLD_MS = 60_000;
const FAILURES_BEFORE_COLD = 2;

interface KeyState {
  key: string;
  failures: number;
  /** Epoch ms before which this key is skipped. */
  coldUntil: number;
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

  return [...new Set(keys)].map((key) => ({ key, failures: 0, coldUntil: 0 }));
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
 * than dropped: if every key is cold we would rather try a cold one than fail.
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
}

export function reportFailure(state: KeyState): void {
  state.failures += 1;
  if (state.failures >= FAILURES_BEFORE_COLD) {
    state.coldUntil = Date.now() + COLD_MS;
    state.failures = 0;
  }
}

/** Test seam: forces the pool to be re-read from the environment. */
export function resetPool(): void {
  pool = null;
  cursor = 0;
}
