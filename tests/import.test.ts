import { describe, expect, it } from "vitest";
import {
  articleImport,
  asArray,
  checkApplyLinks,
  jobImport,
  parseRows,
  toCitations,
} from "@/lib/admin/import";

/**
 * Pasted-JSON import.
 *
 * The behaviour that matters is what happens to a batch with one bad row in
 * it. Importing the good ones leaves you guessing which half landed, so the
 * batch is refused and every bad row is named — and because nothing was
 * written, fixing and re-pasting is free.
 *
 * That gate carries more weight than it used to: imported rows publish straight
 * to the live site rather than queueing for review, so validation is the only
 * thing standing between a paste and the public.
 */

const job = {
  title: "Registered Nurse",
  company: "Emirates Hospital",
  applyLink: "https://careers.example.ae/nurse-123",
  emirate: "Dubai",
  category: "Healthcare",
};

describe("accepting either shape", () => {
  it("takes a single object as a batch of one", () => {
    expect(asArray({ a: 1 })).toEqual([{ a: 1 }]);
  });

  it("takes an array as it is", () => {
    expect(asArray([{ a: 1 }, { a: 2 }])).toHaveLength(2);
  });
});

describe("validating jobs", () => {
  it("accepts a minimal row and fills in the defaults", () => {
    const { rows, errors } = parseRows(jobImport, [
      { title: "Driver", company: "Acme", applyLink: "https://acme.ae/apply" },
    ]);

    expect(errors).toEqual([]);
    expect(rows[0].value.category).toBe("Other");
    expect(rows[0].value.documentsNeeded).toEqual([]);
  });

  it("names the row and the field when something is missing", () => {
    const { rows, errors } = parseRows(jobImport, [job, { title: "No employer" }]);

    expect(rows).toHaveLength(1);
    expect(errors[0].row).toBe(2);
    expect(errors[0].message).toContain("company");
    expect(errors[0].message).toContain("applyLink");
  });

  it("rejects an emirate or category that is not one of ours", () => {
    const { errors } = parseRows(jobImport, [
      { ...job, emirate: "Doha" },
      { ...job, category: "Wizardry" },
    ]);

    expect(errors.map((e) => e.row)).toEqual([1, 2]);
  });

  it("catches an apply link that is neither a URL nor an email", () => {
    const { rows } = parseRows(jobImport, [
      { ...job, applyLink: "call the office" },
      { ...job, applyLink: "hr@employer.ae" },
    ]);

    const errors = checkApplyLinks(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(1);
    expect(errors[0].message).toContain("call the office");
  });

  it("refuses a link that would execute rather than navigate", () => {
    const { rows } = parseRows(jobImport, [{ ...job, applyLink: "javascript:alert(1)" }]);
    expect(checkApplyLinks(rows)).toHaveLength(1);
  });

  it("numbers a bad link by its place in the paste, not among the survivors", () => {
    // Row 2 fails validation and is dropped, so the bad link is the second
    // surviving row but the *third* line the person is looking at. Reporting
    // the array index sent them to the wrong row.
    const { rows } = parseRows(jobImport, [
      job,
      { title: "no employer" },
      { ...job, applyLink: "call the office" },
    ]);

    expect(checkApplyLinks(rows)[0].row).toBe(3);
  });
});

describe("validating articles", () => {
  it("defaults to a blog post in English", () => {
    const { rows, errors } = parseRows(articleImport, [{ title: "A post", bodyMd: "Words." }]);

    expect(errors).toEqual([]);
    expect(rows[0].value.kind).toBe("blog");
    expect(rows[0].value.locale).toBe("en");
  });

  it("requires a body, because an empty post is not a post", () => {
    const { errors } = parseRows(articleImport, [{ title: "Title only" }]);
    expect(errors[0].message).toContain("bodyMd");
  });

  it("rejects a kind that has no section", () => {
    const { errors } = parseRows(articleImport, [
      { title: "X", bodyMd: "Y", kind: "newsletter" },
    ]);
    expect(errors).toHaveLength(1);
  });
});

describe("citations", () => {
  it("reads the 'Title | URL' shorthand", () => {
    const [citation] = toCitations(["MoFAIC fees | https://www.mofa.gov.ae/"]);
    expect(citation.title).toBe("MoFAIC fees");
    expect(citation.url).toBe("https://www.mofa.gov.ae/");
  });

  it("falls back to the URL as its own title", () => {
    const [citation] = toCitations(["https://www.mofa.gov.ae/"]);
    expect(citation.title).toBe("https://www.mofa.gov.ae/");
  });
});
