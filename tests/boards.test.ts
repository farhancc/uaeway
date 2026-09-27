import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { htmlToText } from "@/lib/ingest/source";

/**
 * Employer boards.
 *
 * The two things worth pinning: the UAE filter, because a board is the whole
 * employer and most of it is somewhere else — paying a model to summarise a job
 * in Berlin that a human then rejects is the cost this filter exists to avoid;
 * and the markup, because Greenhouse escapes its HTML *twice* and a single
 * decode leaves "&nbsp;" sitting in text that reaches a prompt and the review
 * queue.
 */

const greenhouse = {
  jobs: [
    {
      title: "Senior Engineer",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/1",
      company_name: "Acme",
      location: { name: "Dubai, United Arab Emirates" },
      updated_at: "2026-09-14T02:22:32-04:00",
      content: "&lt;p&gt;Build things. R&amp;amp;amp;D focus.&amp;nbsp;Apply within.&lt;/p&gt;",
    },
    {
      title: "Berlin Engineer",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/2",
      location: { name: "Berlin, Germany" },
      content: "Not our market.",
    },
    {
      title: "Remote, no location",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/3",
      location: { name: "" },
      content: "Nowhere stated.",
    },
  ],
};

const lever = [
  {
    text: "Product Manager",
    hostedUrl: "https://jobs.lever.co/acme/abc",
    descriptionPlain: "Own the roadmap.",
    createdAt: 1565990241800,
    categories: { location: "Abu Dhabi", allLocations: ["Abu Dhabi"] },
  },
  {
    text: "Second office",
    hostedUrl: "https://jobs.lever.co/acme/def",
    descriptionPlain: "Listed under two places, one of them here.",
    categories: { location: "London, UK", allLocations: ["London, UK", "Sharjah"] },
  },
  {
    text: "Elsewhere entirely",
    hostedUrl: "https://jobs.lever.co/acme/ghi",
    categories: { location: "Toronto", allLocations: ["Toronto"] },
  },
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const { fetchBoards } = await import("@/lib/ingest/boards");

describe("Greenhouse boards", () => {
  const board = { ats: "greenhouse" as const, slug: "acme", name: "Acme" };

  it("keeps only UAE listings", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(greenhouse), { status: 200 }));

    const { jobs } = await fetchBoards([board]);

    expect(jobs.map((j) => j.title)).toEqual(["Senior Engineer"]);
  });

  it("unescapes the double-escaped HTML Greenhouse actually sends", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(greenhouse), { status: 200 }));

    const { jobs } = await fetchBoards([board]);

    expect(jobs[0].description).toBe("Build things. R&D focus. Apply within.");
    expect(jobs[0].description).not.toMatch(/<[a-z/]|&[a-z]+;/i);
  });

  it("credits the employer, not the applicant-tracking system", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(greenhouse), { status: 200 }));

    const { jobs } = await fetchBoards([board]);

    expect(jobs[0].sourceName).toBe("Acme");
    expect(jobs[0].sourceUrl).toBe("https://boards.greenhouse.io/acme/jobs/1");
  });
});

describe("Lever boards", () => {
  const board = { ats: "lever" as const, slug: "acme", name: "Acme" };

  it("keeps a listing whose UAE office is only in allLocations", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(lever), { status: 200 }));

    const { jobs } = await fetchBoards([board]);

    expect(jobs.map((j) => j.title)).toEqual(["Product Manager", "Second office"]);
  });

  it("treats a 200 that is not an array as a missing board", async () => {
    // Lever answers 200 with an error object for a slug that does not exist.
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 200 }));

    const { jobs, errors } = await fetchBoards([board]);

    expect(jobs).toEqual([]);
    expect(errors[0].message).toBe("board not found");
  });
});

describe("a board that is gone", () => {
  it("reports it and still returns what the other boards found", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(greenhouse), { status: 200 }));

    const { jobs, errors } = await fetchBoards([
      { ats: "greenhouse", slug: "gone", name: "Gone Co" },
      { ats: "greenhouse", slug: "acme", name: "Acme" },
    ]);

    expect(jobs).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].board.slug).toBe("gone");
    expect(errors[0].message).toBe("HTTP 404");
  });
});

describe("htmlToText", () => {
  it("strips a tag that was hidden behind two layers of escaping", () => {
    // Decoding must run to a fixed point, but stripping must come after it —
    // the other order would leave this as a live tag.
    expect(htmlToText("ok &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt; done")).toBe(
      "ok done",
    );
  });

  it("does not spin on a long chain of escaped ampersands", () => {
    expect(() => htmlToText("&amp;".repeat(500) + "lt;b&gt;")).not.toThrow();
  });

  it("leaves plain prose alone", () => {
    expect(htmlToText("Own the roadmap.")).toBe("Own the roadmap.");
  });
});
