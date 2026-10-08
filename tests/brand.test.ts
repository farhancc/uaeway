import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BRAND, WORDMARK } from "@/lib/brand";
import { SITE } from "@/lib/site";
import { OG_DEFAULTS } from "@/lib/seo";

/**
 * The name, as a search engine meets it.
 *
 * A rename is the easiest change in a codebase to leave nine-tenths done, and
 * the tenth is always the part nobody looks at: a share card cached by whoever
 * rendered it, a favicon beside every mobile result, the `logo` a knowledge
 * panel reuses. Those are also the parts that keep circulating the old name
 * after the site has changed.
 *
 * So the checks here are not about taste. Each one is a place the previous
 * name was still being published from after everything visible had been
 * renamed, and each was found by looking rather than by anything failing.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const SEO_SURFACES = [
  "lib/seo.ts",
  "lib/site.ts",
  "app/(site)/[locale]/layout.tsx",
  "app/opengraph-image.tsx",
  "app/icon.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
];

describe("the brand, as published", () => {
  it("splits the wordmark into the two tones the masthead and footer use", () => {
    expect(WORDMARK.lead + WORDMARK.tail).toBe(SITE.name);
    expect(WORDMARK.lead).toBe("Gulf");
    expect(WORDMARK.tail).toBe("izz");
  });

  it("keeps the generated images on the tokens globals.css defines", () => {
    // `ImageResponse` renders outside the document and cannot read `:root`, so
    // these are literals — and a literal is exactly what drifts when the
    // palette moves.
    const css = read("app/globals.css");
    for (const [name, value] of Object.entries(BRAND)) {
      expect(css.includes(value), `--color-${name} is no longer ${value}`).toBe(true);
    }
  });

  /**
   * The one that matters most. `public/logo.png` is raster artwork with
   * "UAEvia" drawn into it; it stayed in the repo deliberately, and the risk
   * is not the file but a reference to it coming back.
   */
  it("publishes no reference to the previous brand's artwork", () => {
    for (const path of SEO_SURFACES) {
      // Comments stripped first. Several of these files explain at length why
      // they no longer point at it, and those sentences name the file — so a
      // naive search for the string reports the explanation as the fault.
      const code = read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code.includes("logo.png"), `${path} points at /logo.png`).toBe(false);
    }
  });

  it("names the site in its own description", () => {
    // This is the whole of the brand-name signal for a coined word: there is
    // no other term in the sentence that would lead a search engine to
    // associate the two. It was absent until the rename.
    expect(SITE.description).toContain(SITE.name);
    expect(SITE.description.length).toBeLessThanOrEqual(160);
  });

  it("gives every page a share card that is generated from the name", () => {
    const images = OG_DEFAULTS.images;
    expect(Array.isArray(images) && images.length === 1).toBe(true);
    const [card] = images as { url: string; alt?: string }[];
    expect(card.url).toBe("/opengraph-image");
    expect(card.alt).toContain(SITE.name);
  });

  /**
   * `app/icon.tsx` and `app/opengraph-image.tsx` are served at `/icon` and
   * `/opengraph-image`, which have **no extension** — so the proxy's
   * `.*\..*` clause does not exclude them and rule (1) redirects them into
   * the locale, where they 404. The symptom is a missing favicon and an empty
   * share card, with nothing in any log to connect it to a redirect rule.
   */
  it("keeps the generated metadata routes out of the locale redirect", () => {
    const [matcher] = /matcher:\s*\[\s*"([^"]+)"/.exec(read("proxy.ts"))!.slice(1);
    const pattern = new RegExp(`^${matcher.replace(/\\\\/g, "\\")}$`);

    for (const path of ["/icon", "/opengraph-image"]) {
      expect(pattern.test(path), `${path} would be redirected to /en${path}`).toBe(false);
    }
    // And the ordinary pages still are, or the whole locale scheme is off.
    for (const path of ["/jobs", "/services/attestation"]) {
      expect(pattern.test(path), `${path} is no longer redirected to its locale`).toBe(true);
    }
  });
});
