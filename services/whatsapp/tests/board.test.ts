import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnpostedJobs, type BoardJob } from "../src/board.js";
import { config } from "../src/config.js";

/**
 * Walking the board.
 *
 * This is the regression guard for the bug that mattered most: the worker used
 * to ask for one page of approved listings and skip what it had sent, which
 * meant 161 of 221 listings could never reach the group — and once that page
 * was sent, every later run found nothing and the group fell silent for good
 * while the board stayed full.
 *
 * The site is stubbed, so these tests describe the contract the worker depends
 * on rather than the site's implementation of it.
 */

function board(total: number): BoardJob[] {
  return Array.from({ length: total }, (_, i) => ({
    slug: `job-${i}`,
    title: `Job ${i}`,
    company: null,
    emirate: "Dubai",
    category: "Other",
    summary: null,
    salaryText: null,
    postedAt: new Date().toISOString(),
    url: `https://example.test/en/jobs/job-${i}`,
  }));
}

/** Stands in for `/api/digest?format=json`, honouring limit and offset. */
function serve(jobs: BoardJob[]) {
  const requests: { limit: number; offset: number }[] = [];

  const fetchMock = vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    requests.push({ limit, offset });

    return {
      ok: true,
      json: async () => ({ total: jobs.length, jobs: jobs.slice(offset, offset + limit) }),
    } as Response;
  });

  vi.stubGlobal("fetch", fetchMock);
  return requests;
}

const unpostedExcept = (sent: Set<string>) => async (jobs: BoardJob[]) =>
  jobs.filter((j) => !sent.has(j.slug));

afterEach(() => vi.unstubAllGlobals());

describe("finding listings the group has not been sent", () => {
  it("stops at the first page when that page has enough", () => {
    const requests = serve(board(221));

    return fetchUnpostedJobs(3, unpostedExcept(new Set())).then(({ ready, approved }) => {
      expect(ready.map((j) => j.slug)).toEqual(["job-0", "job-1", "job-2"]);
      expect(approved).toBe(221);
      // No point paying for pages it does not need.
      expect(requests).toHaveLength(1);
    });
  });

  it("walks past a fully sent page instead of going silent", async () => {
    // The actual bug. Everything on the first page has been sent; the old code
    // returned nothing here, for ever.
    const jobs = board(221);
    serve(jobs);
    const sent = new Set(jobs.slice(0, config.boardPoolSize).map((j) => j.slug));

    const { ready } = await fetchUnpostedJobs(3, unpostedExcept(sent));

    expect(ready).toHaveLength(3);
    for (const job of ready) expect(sent.has(job.slug)).toBe(false);
  });

  it("reaches the very last listing on the board", async () => {
    const jobs = board(221);
    const requests = serve(jobs);
    // All but the final one already sent.
    const sent = new Set(jobs.slice(0, 220).map((j) => j.slug));

    const { ready } = await fetchUnpostedJobs(3, unpostedExcept(sent));

    expect(ready.map((j) => j.slug)).toEqual(["job-220"]);
    // It had to page to get there rather than give up after the first.
    expect(requests.length).toBeGreaterThan(1);
  });

  it("goes quiet rather than repeating once everything has been sent", async () => {
    const jobs = board(221);
    serve(jobs);
    const sent = new Set(jobs.map((j) => j.slug));

    const { ready, approved } = await fetchUnpostedJobs(3, unpostedExcept(sent));

    // Silence is the correct output. A group that gets sixteen "nothing new"
    // notices a day is a group that mutes this.
    expect(ready).toEqual([]);
    expect(approved).toBe(221);
  });

  it("never returns more than one message holds", async () => {
    serve(board(221));
    const { ready } = await fetchUnpostedJobs(3, unpostedExcept(new Set()));
    expect(ready).toHaveLength(3);
  });

  it("asks for consecutive pages, so nothing is skipped or read twice", async () => {
    const jobs = board(221);
    const requests = serve(jobs);
    const sent = new Set(jobs.slice(0, 200).map((j) => j.slug));

    await fetchUnpostedJobs(3, unpostedExcept(sent));

    let expected = 0;
    for (const r of requests) {
      expect(r.offset).toBe(expected);
      expected += r.limit;
    }
  });

  it("copes with an empty board", async () => {
    serve(board(0));
    const { ready, approved } = await fetchUnpostedJobs(3, unpostedExcept(new Set()));
    expect(ready).toEqual([]);
    expect(approved).toBe(0);
  });

  it("stops when the board runs out, even if the total disagrees", async () => {
    // A total that overstates what the pages return must not spin the walk.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ total: 10_000, jobs: [] }) }) as Response),
    );

    const { ready } = await fetchUnpostedJobs(3, unpostedExcept(new Set()));
    expect(ready).toEqual([]);
  });

  it("throws on an unauthorized digest rather than reporting an empty board", async () => {
    // A 401 and "no jobs today" must never be confused: one is a broken
    // secret, the other is a quiet morning.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 }) as Response));

    await expect(fetchUnpostedJobs(3, unpostedExcept(new Set()))).rejects.toThrow("401");
  });
});
