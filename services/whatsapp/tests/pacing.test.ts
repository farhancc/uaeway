import { describe, expect, it } from "vitest";
import {
  MIN_GAP_MS,
  localHour,
  nextWindowOpen,
  pickBatchSize,
  pickDelay,
  windowClosesAt,
  windowOpenedAt,
  withinWindow,
  type Window,
} from "../src/pacing.js";

/**
 * Pacing.
 *
 * The brief: ten listings a day, one or two a message, at intervals nobody can
 * predict, between 7am and 10pm India time. The risks are all quiet ones — a
 * day that posts four listings or thirty, gaps that turn out regular after
 * all, or a timezone slip that shifts the whole window by five and a half
 * hours and posts in the small hours.
 */

const IST: Window = { startHour: 7, endHour: 22, timezone: "Asia/Kolkata" };

/** 2026-10-25 at the given IST hour, as the instant it refers to. */
const ist = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 25, hour - 5, minute - 30));

describe("reading the clock in the posting zone", () => {
  it("reads the hour in Asia/Kolkata, not in UTC", () => {
    // 03:30Z is 09:00 IST. Anything reading UTC would see 3am and stay silent
    // all morning.
    expect(localHour(new Date("2026-10-25T03:30:00Z"), "Asia/Kolkata")).toBe(9);
    expect(localHour(new Date("2026-10-25T18:30:00Z"), "Asia/Kolkata")).toBe(0);
  });

  it("knows when it may post", () => {
    expect(withinWindow(ist(7), IST)).toBe(true);
    expect(withinWindow(ist(22, 59), IST)).toBe(true);
    expect(withinWindow(ist(6, 59), IST)).toBe(false);
    expect(withinWindow(ist(23), IST)).toBe(false);
    expect(withinWindow(ist(3), IST)).toBe(false);
  });
});

describe("which day a post belongs to", () => {
  it("counts the budget from this morning's opening", () => {
    const opened = windowOpenedAt(ist(14), IST);
    expect(localHour(opened, IST.timezone)).toBe(7);
    expect(opened.getTime()).toBeLessThan(ist(14).getTime());
    // Same day, seven hours earlier.
    expect(ist(14).getTime() - opened.getTime()).toBe(7 * 3_600_000);
  });

  it("still counts yesterday's budget before the window opens", () => {
    // A tick at 03:00 belongs to the night after yesterday's run, not to a day
    // that has not started posting. Resetting here would allow ten more
    // listings at 3am.
    const opened = windowOpenedAt(ist(3), IST);
    expect(localHour(opened, IST.timezone)).toBe(7);
    expect(opened.getTime()).toBeLessThan(ist(3).getTime());
    expect(ist(3).getTime() - opened.getTime()).toBe(20 * 3_600_000);
  });

  it("points at tomorrow morning once the day is done", () => {
    const next = nextWindowOpen(ist(23), IST);
    expect(localHour(next, IST.timezone)).toBe(7);
    expect(next.getTime()).toBeGreaterThan(ist(23).getTime());
    expect(next.getTime() - ist(23).getTime()).toBe(8 * 3_600_000);
  });

  it("points at this morning when it has not opened yet", () => {
    const next = nextWindowOpen(ist(5), IST);
    expect(localHour(next, IST.timezone)).toBe(7);
    expect(next.getTime() - ist(5).getTime()).toBe(2 * 3_600_000);
  });

  it("closes at the end of the last posting hour", () => {
    const closes = windowClosesAt(ist(9), IST);
    // 07:00 plus sixteen hours is 23:00, so 22:59 is still inside.
    expect(closes.getTime() - windowOpenedAt(ist(9), IST).getTime()).toBe(16 * 3_600_000);
    expect(withinWindow(new Date(closes.getTime() - 60_000), IST)).toBe(true);
  });
});

describe("how many listings a message carries", () => {
  it("is one or two, and varies", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) seen.add(pickBatchSize(10, 2, Math.random));

    expect([...seen].sort()).toEqual([1, 2]);
  });

  it("never exceeds what the day has left", () => {
    // The day must end on its number, not overshoot it.
    expect(pickBatchSize(1, 2, () => 0.99)).toBe(1);
    expect(pickBatchSize(0, 2, () => 0.99)).toBe(0);
  });

  it("honours a wider maximum if one is configured", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 80; i++) seen.add(pickBatchSize(10, 4, Math.random));
    expect(Math.max(...seen)).toBeGreaterThan(2);
    expect(Math.max(...seen)).toBeLessThanOrEqual(4);
  });
});

describe("how long until the next one", () => {
  const base = { remaining: 8, maxPerPost: 2, msLeftInWindow: 12 * 3_600_000 };

  it("spreads the remaining listings across the remaining window", () => {
    // 8 listings at ~1.5 a message is ~6 messages in 12 hours: about 2 hours
    // apart, and the band is 40%-160% of that.
    const mean = base.msLeftInWindow / 6;
    expect(pickDelay({ ...base, rng: () => 0.5 })).toBeGreaterThan(mean * 0.9);
    expect(pickDelay({ ...base, rng: () => 0.5 })).toBeLessThan(mean * 1.1);
  });

  it("gives different gaps for different draws", () => {
    const gaps = new Set(
      [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => pickDelay({ ...base, rng: () => r })),
    );
    // Six draws, six distinct gaps — nothing rounds them onto a grid.
    expect(gaps.size).toBe(6);
  });

  it("posts closer together when the day is behind", () => {
    const relaxed = pickDelay({ ...base, remaining: 2, rng: () => 0.5 });
    const behind = pickDelay({ ...base, remaining: 10, rng: () => 0.5 });

    expect(behind).toBeLessThan(relaxed);
  });

  it("never puts two posts on top of each other", () => {
    // Even with no window left, which is what a late restart looks like.
    const delay = pickDelay({ ...base, remaining: 10, msLeftInWindow: 0, rng: () => 0 });
    expect(delay).toBeGreaterThanOrEqual(MIN_GAP_MS);
  });

  it("does not schedule far beyond the window it has left", () => {
    const msLeft = 2 * 3_600_000;
    const delay = pickDelay({ ...base, msLeftInWindow: msLeft, rng: () => 0.99 });
    expect(delay).toBeLessThanOrEqual(msLeft);
  });
});

describe("a day, simulated", () => {
  it("spends its budget inside the window, at irregular gaps", () => {
    // Walks a whole day the way the worker does: post, pick a delay, repeat.
    const perDay = 10;
    const maxPerPost = 2;
    let now = ist(7);
    let sent = 0;
    const gaps: number[] = [];
    const sizes: number[] = [];
    let guard = 0;

    while (sent < perDay && withinWindow(now, IST) && guard++ < 100) {
      const size = pickBatchSize(perDay - sent, maxPerPost, Math.random);
      sent += size;
      sizes.push(size);
      if (sent >= perDay) break;

      const delay = pickDelay({
        remaining: perDay - sent,
        maxPerPost,
        msLeftInWindow: windowClosesAt(now, IST).getTime() - now.getTime(),
        rng: Math.random,
      });
      gaps.push(delay);
      now = new Date(now.getTime() + delay);
    }

    expect(sent).toBe(perDay);
    expect(withinWindow(now, IST)).toBe(true);
    expect(sizes.every((s) => s >= 1 && s <= maxPerPost)).toBe(true);

    // The gaps must not be a constant — that is the whole point.
    expect(new Set(gaps).size).toBeGreaterThan(gaps.length - 2);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_GAP_MS);
  });
});
