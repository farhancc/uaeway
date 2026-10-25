import { describe, expect, it } from "vitest";
import type { BoardJob } from "../src/board.js";
import { composeMessage } from "../src/message.js";

/**
 * The message.
 *
 * Two rules matter more than anything about how it reads. Pay is the
 * employer's own words or absent — never a figure this worker worked out — and
 * the warning about paying for a job is on every post. The rest is phrasing.
 */

const job = (over: Partial<BoardJob> = {}): BoardJob => ({
  slug: "senior-accountant",
  title: "Senior Accountant",
  company: "Bestax",
  emirate: "Dubai",
  category: "Accounting & Finance",
  summary: "Handles day-to-day accounting for a Dubai firm.",
  salaryText: null,
  postedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  url: "https://example.test/en/jobs/senior-accountant",
  ...over,
});

const MORNING = new Date("2026-10-25T03:30:00Z"); // 09:00 IST

describe("facts", () => {
  it("quotes the employer's salary exactly as the board holds it", () => {
    const text = composeMessage([job({ salaryText: "From AED 5,000 a month" })], MORNING);

    // Not "AED 5,000" — the "From" is the difference between a floor and a
    // promise.
    expect(text).toContain("From AED 5,000 a month");
  });

  it("says nothing about pay when the employer did not", () => {
    const text = composeMessage([job({ salaryText: null })], MORNING)!;

    // "Never pay a fee" is the safety line and is meant to be there, so this
    // looks for a figure rather than for the word: no currency, and no amount.
    expect(text).not.toMatch(/AED|dirham|\bsalary\b/i);
    expect(text).not.toMatch(/\d[\d,]{2,}/);
  });

  it("skips what a listing does not have, rather than printing a blank", () => {
    const text = composeMessage([job({ company: null, emirate: null, summary: null })], MORNING)!;

    expect(text).not.toContain("null");
    expect(text).not.toContain("undefined");
    expect(text).toContain("Senior Accountant");
    expect(text).toContain("https://example.test/en/jobs/senior-accountant");
  });

  it("always carries the warning about paying for a job", () => {
    for (const count of [1, 2, 3]) {
      const text = composeMessage(Array.from({ length: count }, () => job()), MORNING)!;
      expect(text).toContain("Never pay a fee to be given a job.");
    }
  });

  it("ends every message with the way to the rest of the board", () => {
    // A message carries three listings; the site carries hundreds. Whatever
    // else is in the message — one listing or eight, nudge or no nudge — the
    // last line is always the route through to the board.
    for (const count of [1, 3, 8]) {
      for (const at of [
        new Date("2026-10-25T03:30:00Z"),
        new Date("2026-10-25T04:30:00Z"),
        new Date("2026-10-25T14:30:00Z"),
      ]) {
        const text = composeMessage(Array.from({ length: count }, () => job()), at)!;
        const last = text.trimEnd().split("\n").at(-1)!;

        expect(last).toContain("Find your job here:");
        expect(last).toContain("/en/jobs");
      }
    }
  });

  it("links every listing it mentions", () => {
    const jobs = [job({ slug: "a", url: "https://example.test/a" }), job({ slug: "b", url: "https://example.test/b" })];
    const text = composeMessage(jobs, MORNING)!;

    expect(text).toContain("https://example.test/a");
    expect(text).toContain("https://example.test/b");
  });
});

describe("how it reads", () => {
  it("says nothing at all when there is nothing new", () => {
    // Null, not a "no jobs today" message: sixteen of those a day is a mute.
    expect(composeMessage([], MORNING)).toBeNull();
  });

  it("draws its opener from a different set morning and evening", () => {
    // Not every morning line says "morning" — what matters is that the two
    // parts of the day never share phrasing, so the feed tracks the clock.
    const openersBetween = (fromHourIst: number, toHourIst: number) => {
      const seen = new Set<string>();
      for (let h = fromHourIst; h <= toHourIst; h++) {
        const at = new Date(Date.UTC(2026, 9, 25, h - 5, 30));
        seen.add(composeMessage([job()], at)!.split("\n")[0]!);
      }
      return seen;
    };

    const morning = openersBetween(7, 11);
    const evening = openersBetween(17, 22);

    for (const line of morning) expect(evening.has(line)).toBe(false);
    expect(morning.size).toBeGreaterThan(1);
  });

  it("does not open with the same line two hours running", () => {
    const openers = new Set<string>();
    // A full working day, on the hour.
    for (let h = 7; h <= 22; h++) {
      const at = new Date(Date.UTC(2026, 9, 25, h - 5, 30));
      openers.add(composeMessage([job()], at)!.split("\n")[0]!);
    }
    // Several distinct openers across the day rather than one repeated.
    expect(openers.size).toBeGreaterThan(3);
  });

  it("reads as one listing, not several, when only one is new", () => {
    const text = composeMessage([job()], MORNING)!;
    expect(text).not.toMatch(/a few|a couple|these came in/i);
  });
});
