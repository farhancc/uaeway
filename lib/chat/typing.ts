/**
 * How much of a reply should be on screen by now.
 *
 * Pulled out of the widget so it can be tested, because the one place it
 * cannot be observed is a browser: an unfocused tab throttles both setTimeout
 * and requestAnimationFrame — measured at a 38ms timer firing anywhere between
 * 40ms and 1020ms — so watching the animation says more about the tab's focus
 * than about the pacing.
 *
 * Hence the shape of it. The answer is computed from elapsed wall-clock time
 * rather than accumulated per-frame deltas, so a frame that arrives late takes
 * a proportionally bigger bite and the reply still lands in about REVEAL_MS.
 * Pacing by frame count stretched a one-second reveal to five.
 */

/** Roughly how long a reply of any length takes to appear. */
export const REVEAL_MS = 900;

/**
 * A floor, in characters per millisecond, so a two-word answer still reads as
 * typed instead of appearing whole. Without it, "No." would be instant while a
 * long answer took a second, and the short ones are the canned ones — the
 * difference would be exactly the tell this feature exists to remove.
 */
export const MIN_RATE = 0.05;

/**
 * Characters that should be visible `elapsed` ms into revealing `queued` of
 * them. Never more than are available, never fewer than one once started.
 */
export function charsVisible(elapsed: number, queued: number): number {
  if (queued <= 0) return 0;
  if (elapsed <= 0) return 0;

  const rate = Math.max(MIN_RATE, queued / REVEAL_MS);
  return Math.min(queued, Math.ceil(elapsed * rate));
}
