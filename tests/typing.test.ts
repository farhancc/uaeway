import { describe, expect, it } from "vitest";
import { charsVisible, MIN_RATE, REVEAL_MS } from "@/lib/chat/typing";

/**
 * Typing pacing.
 *
 * Tested here because it cannot be watched in a browser under automation: an
 * unfocused tab throttles setTimeout and requestAnimationFrame alike — a 38ms
 * timer was measured firing anywhere between 40ms and 1020ms — so what you see
 * tells you about the tab's focus, not the pacing.
 *
 * That throttling is also why the function takes elapsed time rather than a
 * step count. A late frame must take a bigger bite, not make the reply slower.
 */

describe("how much should be visible", () => {
  it("shows nothing before any time has passed", () => {
    expect(charsVisible(0, 200)).toBe(0);
  });

  it("has revealed the lot by the end of the window", () => {
    expect(charsVisible(REVEAL_MS, 200)).toBe(200);
  });

  it("never runs past what has actually arrived", () => {
    expect(charsVisible(REVEAL_MS * 10, 200)).toBe(200);
  });

  it("takes about the same time whatever the length", () => {
    // The point of pacing by proportion: a long answer must not drag.
    for (const length of [60, 300, 900, 2000]) {
      expect(charsVisible(REVEAL_MS, length)).toBe(length);
      expect(charsVisible(REVEAL_MS / 2, length)).toBeLessThan(length);
    }
  });
});

describe("surviving a throttled frame", () => {
  it("takes a bigger bite after a long stall rather than falling behind", () => {
    // Two frames 40ms apart, versus one frame 800ms late: the late one must
    // have caught up to where the clock says it should be.
    const steady = charsVisible(80, 600);
    const stalled = charsVisible(800, 600);

    expect(stalled).toBeGreaterThan(steady * 5);
    expect(stalled).toBeLessThanOrEqual(600);
  });

  it("is a pure function of elapsed time, so it cannot drift", () => {
    // Called twice with the same elapsed time it gives the same answer,
    // which is what makes it self-correcting rather than accumulating error.
    expect(charsVisible(450, 300)).toBe(charsVisible(450, 300));
  });
});

describe("short replies", () => {
  it("still reads as typed rather than appearing whole", () => {
    // "No." is a stored answer. If short answers appeared instantly and long
    // ones did not, the instant ones would be recognisable as canned — which
    // is the tell this exists to remove.
    expect(charsVisible(1, 3)).toBeLessThan(3);
    expect(charsVisible(3 / MIN_RATE, 3)).toBe(3);
  });

  it("does not drag a two-word answer out to the full window", () => {
    // The floor is a rate, so a very short reply finishes well before
    // REVEAL_MS rather than being slowed to fill it.
    expect(charsVisible(REVEAL_MS / 4, 8)).toBe(8);
  });
});

describe("nothing to show", () => {
  it("handles an empty or negative case without misbehaving", () => {
    expect(charsVisible(500, 0)).toBe(0);
    expect(charsVisible(-10, 100)).toBe(0);
  });
});
