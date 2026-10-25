import { describe, expect, it } from "vitest";
import { TARGETS, cleanTitle, toListing, type Target } from "../src/serper.js";

/**
 * The refusal layer.
 *
 * A Google search for UAE jobs returns mostly *category* pages, whose titles
 * read like job titles and whose snippets are several unrelated roles mashed
 * together. Letting one through produces a Gemini summary of a page of links,
 * published as a real vacancy and sent to a group of jobseekers.
 *
 * Every URL below is one Google actually returned on 2026-10-23/24. If a
 * pattern is ever loosened, this is where it shows — and the failure mode it
 * guards against is silent, because a category page looks like a listing in
 * every other respect.
 */

function target(site: string): Target {
  const found = TARGETS.find((t) => t.site === site);
  if (!found) throw new Error(`no target configured for ${site}`);
  return found;
}

const indeed = () => target("ae.indeed.com/viewjob");
const bayt = () => target("bayt.com/en/uae/jobs");

const accept = (t: Target, link: string, title = "Accountant") =>
  toListing({ title, link, snippet: "x" }, t, "Dubai");

describe("what counts as one posting", () => {
  it("accepts an Indeed posting, which carries its id in the query", () => {
    const listing = accept(indeed(), "https://ae.indeed.com/viewjob?jk=560f93323321bea7");

    expect(listing?.sourceUrl).toBe("https://ae.indeed.com/viewjob?jk=560f93323321bea7");
    expect(listing?.sourceName).toBe("Indeed");
  });

  it("accepts a Bayt posting, which ends in its numeric id", () => {
    const listing = accept(bayt(), "https://www.bayt.com/en/uae/jobs/accountant-dubai-office-75094456/");

    expect(listing?.sourceUrl).toContain("accountant-dubai-office-75094456");
    expect(listing?.sourceName).toBe("Bayt");
  });

  it("rejects an Indeed search page that has no posting id", () => {
    // The path alone matches the pattern, so without the id requirement this
    // dead link would be ingested as a job.
    expect(accept(indeed(), "https://ae.indeed.com/viewjob")).toBeNull();
    expect(accept(indeed(), "https://ae.indeed.com/jobs?q=accountant")).toBeNull();
  });

  it("rejects every Bayt category page Google returned", () => {
    // Eight of ten results for "accountant dubai site:bayt.com/en/uae/jobs"
    // were these. Their titles read "Accountant Jobs in Dubai (Oct 2026)".
    const categories = [
      "https://www.bayt.com/en/uae/jobs/accountant-jobs/",
      "https://www.bayt.com/en/uae/jobs/accountant-jobs-in-dubai/",
      "https://www.bayt.com/en/uae/jobs/urgent-hiring-accountant-jobs-in-dubai/",
      "https://www.bayt.com/en/uae/jobs/chartered-accountant-jobs/",
      "https://www.bayt.com/en/uae/jobs/senior-accountant-jobs/",
      "https://www.bayt.com/en/international/jobs/accountant-jobs/",
    ];
    for (const link of categories) {
      expect(accept(bayt(), link), link).toBeNull();
    }
  });

  it("rejects the index pages of boards that are not configured at all", () => {
    // gulftalent returned only these, which is why it is not a target.
    for (const t of TARGETS) {
      expect(accept(t, "https://www.gulftalent.com/jobs/title/fund-accountant")).toBeNull();
      expect(accept(t, "https://www.naukrigulf.com/accountant-jobs-in-dubai")).toBeNull();
    }
  });

  it("rejects anything that is not a URL", () => {
    expect(accept(indeed(), "not a url")).toBeNull();
    expect(accept(indeed(), "javascript:alert(1)")).toBeNull();
  });

  it("needs both a title and a link", () => {
    const t = indeed();
    expect(toListing({ link: "https://ae.indeed.com/viewjob?jk=abc" }, t, "Dubai")).toBeNull();
    expect(toListing({ title: "Accountant" }, t, "Dubai")).toBeNull();
  });
});

describe("the posting's identity", () => {
  it("drops tracking parameters, so one posting is not two rows", () => {
    // source_url is unique on the site; two spellings would be two listings
    // on the board and two messages in the group.
    const a = accept(indeed(), "https://ae.indeed.com/viewjob?jk=abc123&from=serp&vjs=3");
    const b = accept(indeed(), "https://ae.indeed.com/viewjob?jk=abc123");

    expect(a?.sourceUrl).toBe(b?.sourceUrl);
    expect(a?.sourceUrl).toBe("https://ae.indeed.com/viewjob?jk=abc123");
  });

  it("drops the fragment too", () => {
    const listing = accept(indeed(), "https://ae.indeed.com/viewjob?jk=abc123#apply");
    expect(listing?.sourceUrl).toBe("https://ae.indeed.com/viewjob?jk=abc123");
  });
});

describe("what the listing carries", () => {
  it("never states a salary, even when the snippet does", () => {
    // The snippets really do carry pay. A regex over one turns "From AED5,000"
    // into a fixed figure, and a wrong salary is the most damaging thing this
    // site can assert — so the field stays empty and Gemini is forbidden from
    // filling it.
    const listing = toListing(
      {
        title: "Senior Accountant",
        link: "https://ae.indeed.com/viewjob?jk=544614c9380b2331",
        snippet: "Apply for the Senior Accountant job! AED6,000 - AED8,000 a month Dubai.",
      },
      indeed(),
      "Dubai",
    );

    expect(listing?.salary).toBeNull();
    // But the pay is still in the excerpt, which is what reaches the model.
    expect(listing?.description).toContain("AED6,000");
  });

  it("never claims a company, because Google does not give one", () => {
    const listing = toListing(
      { title: "Onsite Sales Executive-IT at Careers International - Dubai", link: "https://ae.indeed.com/viewjob?jk=a1" },
      indeed(),
      "Dubai",
    );
    expect(listing?.company).toBeNull();
  });

  it("dates a listing from an absolute date, never from a relative one", () => {
    const t = indeed();
    const link = "https://ae.indeed.com/viewjob?jk=a1";

    const dated = toListing({ title: "A", link, date: "2026-10-01" }, t, "Dubai");
    expect(dated?.postedAt.slice(0, 10)).toBe("2026-10-01");

    // "3 days ago" is not a date, and a guessed posting date sets a wrong
    // expiry on the site.
    const before = Date.now();
    const relative = toListing({ title: "A", link, date: "3 days ago" }, t, "Dubai");
    expect(new Date(relative!.postedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("titles, as Google hands them over", () => {
  it("strips the board name and the city it was searched in", () => {
    expect(cleanTitle("Tax Accountant - Dubai - Indeed.com")).toBe("Tax Accountant");
    expect(cleanTitle("Nurse - Abu Dhabi - Indeed.com")).toBe("Nurse");
    expect(cleanTitle("Accountant (Apply via link) - Dubai Jobs")).toBe("Accountant (Apply via link)");
  });

  it("strips a label the employer typed in front of the title", () => {
    // This one reached a WhatsApp message and a slug reading
    // job-title-civil-structural-engineer-consultancy.
    expect(cleanTitle("Job Title: Civil / Structural Engineer – Consultancy")).toBe(
      "Civil / Structural Engineer – Consultancy",
    );
    expect(cleanTitle("Position: Spa Therapist")).toBe("Spa Therapist");
  });

  it("leaves words that only look like furniture", () => {
    // Each of these would be mangled by a looser rule.
    expect(cleanTitle("Job Captain - Architecture")).toBe("Job Captain - Architecture");
    expect(cleanTitle("Position Available - Driver")).toBe("Position Available - Driver");
    expect(cleanTitle("Jobsite Supervisor")).toBe("Jobsite Supervisor");
    expect(cleanTitle("Accountant - Dubai Office at Bestaxca")).toBe("Accountant - Dubai Office at Bestaxca");
    expect(cleanTitle("Registered Nurse for a specialty hospital in Abu Dhabi")).toBe(
      "Registered Nurse for a specialty hospital in Abu Dhabi",
    );
  });

  it("leaves a title Google truncated truncated", () => {
    // There is nothing here to restore it from, and inventing the rest of
    // someone's job title is not an option.
    expect(cleanTitle("Assistant Accountant cum Document Controller ...")).toBe(
      "Assistant Accountant cum Document Controller",
    );
  });
});
