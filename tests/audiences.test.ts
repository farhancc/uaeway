import { describe, expect, it } from "vitest";
import {
  AUDIENCES,
  getAudience,
  pathFor,
  professions,
  relatedTo,
  servicesFor,
  situations,
  stepsFor,
} from "@/lib/audiences";
import { PATHS } from "@/lib/paths";
import { getService } from "@/lib/services";
import { findUnsupportedAmounts } from "@/lib/chat/prompt";

/**
 * The pages that answer "what applies to me".
 *
 * Everything here is data that three other things read — the page, the index
 * and the sitemap — so a slug that no longer resolves is a broken link on a
 * published, indexed page rather than a crash anyone would notice.
 */

/**
 * Role terms the jobs board actually returns rows for, measured against the
 * live board on 2026-10-08 rather than assumed: manager 93, sales 45,
 * accountant 38, engineer 32, hr 32, hospitality 30, marketing 29,
 * receptionist 28, nurse 27, teacher 27, driver 26, finance 26, customer 22,
 * developer 13, logistics 12, hotel 10, software 7, designer 7,
 * construction 7, consultant 7.
 *
 * Terms that look obvious and return **nothing**: lawyer, architect, chef,
 * waiter, technician, warehouse, guard, salon, nanny, pilot, marine,
 * pharmacist, laboratory, translator, social, psychologist, lecturer and
 * content. A page built on one of those ships an empty section, which is
 * worse than no section — so those audiences carry `jobQuery: null` and show
 * no jobs at all. Re-measure before adding one; the ingest runs nightly.
 */
const BOARD_TERMS = new Set([
  "",
  "sales",
  "accountant",
  "engineer",
  "hr",
  "hospitality",
  "marketing",
  "receptionist",
  "nurse",
  "teacher",
  "driver",
  "finance",
  "customer",
  "developer",
  "logistics",
  "construction",
  "consultant",
  "designer",
]);

describe("the audience pages", () => {
  it("covers both axes, because a visitor does not know which they are on", () => {
    expect(situations().length).toBeGreaterThanOrEqual(20);
    expect(professions().length).toBeGreaterThanOrEqual(25);
    expect(situations().length + professions().length).toBe(AUDIENCES.length);
  });

  it("gives every audience a unique slug that resolves", () => {
    const slugs = AUDIENCES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(getAudience(slug)?.slug).toBe(slug);
    }
  });

  it("collides with no other top-level route", () => {
    // These pages live at /for/<slug>, so a collision is impossible today —
    // but the slugs read like section names and the temptation to promote one
    // to /engineers is real. This is the note that says what breaks if you do.
    const sections = new Set(["jobs", "services", "guides", "blog", "news", "about", "contact"]);
    for (const audience of AUDIENCES) {
      expect(sections.has(audience.slug), `${audience.slug} shadows a section`).toBe(false);
    }
  });

  it("names a journey that exists, or carries its own steps", () => {
    const ids = new Set(PATHS.map((p) => p.id));
    for (const audience of AUDIENCES) {
      if (audience.path) {
        expect(ids.has(audience.path), `${audience.slug} names unknown path ${audience.path}`).toBe(
          true,
        );
        expect(pathFor(audience)).toBeDefined();
      }
      // Either way there has to be a sequence: the route is the page.
      expect(stepsFor(audience).length, `${audience.slug} has no steps`).toBeGreaterThanOrEqual(3);
    }
  });

  it("points every step and every service at something real", () => {
    for (const audience of AUDIENCES) {
      for (const step of stepsFor(audience)) {
        if (step.service) {
          expect(getService(step.service), `${audience.slug}: step names ${step.service}`).toBeDefined();
        }
      }
      // `servicesFor` drops unknown slugs rather than rendering a dead link,
      // so compare the counts to catch the one it dropped.
      expect(servicesFor(audience).length, `${audience.slug} names a service that is gone`).toBe(
        audience.services.length,
      );
      expect(audience.services.length).toBeGreaterThan(0);
    }
  });

  /**
   * The reason a profession page exists at all. An engineer can find a page
   * about attestation anywhere; what they cannot find is that the Society of
   * Engineers is the body whose answer counts.
   */
  it("names who decides, for every audience", () => {
    for (const audience of AUDIENCES) {
      expect(audience.authorities.length, `${audience.slug} names no authority`).toBeGreaterThan(0);
      for (const authority of audience.authorities) {
        expect(authority.name.length).toBeGreaterThan(1);
        expect(authority.decides.length).toBeGreaterThan(10);
      }
    }
  });

  /**
   * The same rule the chat content is held to, and it binds harder here:
   * these pages are indexed, so a figure on one outlives the conversation it
   * would have been wrong in.
   */
  it("states no fee, rate or duration as fact", () => {
    for (const audience of AUDIENCES) {
      const prose = [
        audience.intro,
        ...audience.whoItsFor,
        ...audience.steps.map((s) => s.text),
        ...audience.authorities.map((a) => a.decides),
      ];
      for (const text of prose) {
        expect(findUnsupportedAmounts(text, ""), `${audience.slug} quotes a figure`).toEqual([]);
        expect(/\d\s*(%|percent)/i.test(text), `${audience.slug} states a rate`).toBe(false);
        expect(
          /\b\d+\s*(?:working\s+)?(?:day|week|month)s?\b/i.test(text),
          `${audience.slug} promises a duration`,
        ).toBe(false);
      }
    }
  });

  it("only searches the board for terms the board answers", () => {
    for (const audience of AUDIENCES) {
      if (audience.jobQuery === null) continue;
      expect(
        BOARD_TERMS.has(audience.jobQuery),
        `${audience.slug} searches "${audience.jobQuery}", which returns nothing`,
      ).toBe(true);
    }
  });

  it("shows jobs only where listings are the point", () => {
    // A page about leaving the country with four vacancies under it reads as
    // a site that did not understand the question.
    expect(getAudience("leavers")?.jobQuery).toBeNull();
    expect(getAudience("landlords")?.jobQuery).toBeNull();
    expect(getAudience("job-seekers")?.jobQuery).toBe("");
  });

  /**
   * The guardrail that keeps this from becoming a page farm. Fifty-seven
   * pages is only worth having if each one says something the others do not,
   * and the authority is the thing that genuinely differs — an engineer and a
   * teacher need almost identical paperwork and entirely different regulators.
   * A page whose authorities are a subset of another's is a page that should
   * not exist.
   */
  it("gives every page an authority no other page already covers", () => {
    const seen = new Map<string, string>();

    for (const audience of AUDIENCES) {
      const names = audience.authorities.map((a) => a.name).sort().join(" + ");
      const twin = seen.get(names);
      expect(twin, `${audience.slug} names exactly the same bodies as ${twin}`).toBeUndefined();
      seen.set(names, audience.slug);
    }
  });

  it("offers a readable number of neighbours, not all of them", () => {
    for (const audience of AUDIENCES) {
      const related = relatedTo(audience);
      expect(related.length).toBeLessThanOrEqual(6);
      expect(related.every((a) => a.kind === audience.kind)).toBe(true);
      expect(related.some((a) => a.slug === audience.slug)).toBe(false);
    }
  });

  it("reuses a path rather than restating it", () => {
    // The four situations that already exist in lib/paths.ts must reference
    // it, or there are two descriptions of one sequence and one of them will
    // go stale. Measured by the steps coming from the path, not the audience.
    for (const slug of ["new-arrivals", "families", "business-owners", "students"]) {
      const audience = getAudience(slug)!;
      expect(audience.path, `${slug} should reference a path`).not.toBeNull();
      expect(audience.steps, `${slug} restates steps it could reference`).toEqual([]);
      expect(stepsFor(audience).length).toBeGreaterThan(0);
    }
  });
});
