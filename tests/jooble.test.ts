import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Jooble adapter, tested against a recorded response shape.
 *
 * Two things here are not cosmetic. Jooble puts HTML in the snippet and the
 * title — bold tags around whatever matched the search — and that text goes
 * into a model prompt and onto the review queue, so it must arrive as prose.
 * And `source` names the board the ad actually came from, which is the
 * attribution shown on the listing; losing it would credit the aggregator for
 * someone else's posting.
 */

const response = {
  totalCount: 2,
  jobs: [
    {
      title: "Registered <b>Nurse</b> — Dubai",
      location: "Dubai, <b>Dubai</b>",
      snippet: "We are seeking a registered <b>nurse</b>&nbsp;with DHA licence. R&amp;D exposure.",
      salary: "AED 8,000 - 12,000",
      source: "bayt.com",
      link: "https://ae.jooble.org/jdp/123",
      company: "Emirates Hospital",
      updated: "2026-09-20T10:00:00.0000000",
      id: 123,
    },
    // Same listing reached by a second search — must collapse to one.
    {
      title: "Registered Nurse — Dubai",
      location: "Dubai",
      snippet: "Duplicate by link.",
      source: "bayt.com",
      link: "https://ae.jooble.org/jdp/123",
      company: "Emirates Hospital",
      updated: "2026-09-20T10:00:00.0000000",
      id: 123,
    },
    // No link: nothing to send an applicant to, so it must be dropped.
    { title: "Ghost role", company: "Nowhere", snippet: "No link here." },
  ],
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  process.env.JOOBLE_API_KEY = "test-key";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.JOOBLE_API_KEY;
});

const { fetchJooble } = await import("@/lib/ingest/jooble");
const search = [{ keywords: "nurse", location: "Dubai" }];

describe("fetchJooble", () => {
  it("maps a listing, strips the markup, and credits the original board", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));

    const jobs = await fetchJooble(search);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Registered Nurse — Dubai");
    expect(jobs[0].description).not.toContain("<b>");
    expect(jobs[0].description).toBe(
      "We are seeking a registered nurse with DHA licence. R&D exposure.",
    );
    expect(jobs[0].locations).toBe("Dubai, Dubai");
    expect(jobs[0].sourceName).toBe("bayt.com");
    expect(jobs[0].sourceUrl).toBe("https://ae.jooble.org/jdp/123");
    expect(jobs[0].company).toBe("Emirates Hospital");
  });

  it("posts the key in the path and the search in the body", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ jobs: [] }), { status: 200 }));

    await fetchJooble(search);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://jooble.org/api/test-key");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ keywords: "nurse", location: "Dubai" });
  });

  it("does nothing at all without a key, rather than calling the API", async () => {
    delete process.env.JOOBLE_API_KEY;
    expect(await fetchJooble(search)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns what the other searches found when one of them fails", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("upstream is down", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }));

    const jobs = await fetchJooble([
      { keywords: "nurse", location: "Dubai" },
      { keywords: "driver", location: "Abu Dhabi" },
    ]);

    // The ingest must degrade to fewer listings, never die half way through.
    expect(jobs).toHaveLength(1);
  });

  it("survives a body that is not the shape we expect", async () => {
    fetchMock.mockResolvedValue(new Response("<html>nope</html>", { status: 200 }));
    expect(await fetchJooble(search)).toEqual([]);
  });
});
