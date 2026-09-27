/**
 * Turns published guides into blog post drafts using Sonnet.
 *
 * Guides (kind='guide') are the site's evergreen how-to content. Blog posts
 * (kind='blog') are meant to complement them with a different angle — a
 * mistakes-people-make piece, a what-it-actually-feels-like piece — not
 * restate the same steps. Every draft still lands as 'pending': an AI-written
 * paragraph that states a wrong fee or invents a rule is our problem once it
 * is on our domain, whichever model wrote it.
 */

import { generateJSON } from "../ai/claude";
import { uniqueSlug } from "../slug";
import { matchServices, serviceSlugs } from "../services";
import { SITE } from "../site";
import { supabaseAdmin } from "../supabase/admin";
import type { ArticleRow, Citation } from "../supabase/types";

export interface DraftResult {
  eligible: number;
  drafted: number;
  skipped: number;
}

type GuideSource = Pick<ArticleRow, "id" | "slug" | "title" | "excerpt" | "body_md">;

interface Draft {
  title: string;
  excerpt: string;
  body_md: string;
  service_slug: string | null;
}

/** The rotating set of angles handed to the model, one per call. Fixed here
 *  rather than left to the model's own judgement: without it, ten posts in a
 *  row tend to converge on the same "here is how X works" shape a guide
 *  already covers. */
const ANGLES = [
  "the mistakes people most often make with this, and what they cost",
  "what the process actually feels like for someone doing it for the first time",
  "a myth or assumption people have about this that is not true",
  "how long this really takes in practice, and why it varies",
  "the question people ask us most about this, answered at length",
] as const;

function angleFor(index: number): string {
  return ANGLES[index % ANGLES.length];
}

/** The guide's own page, as the one citation a derived post needs. Built here
 *  rather than left to the model: an internal link is a fact we already know,
 *  not something worth asking an LLM to get right. */
function sourceCitation(guide: GuideSource): Citation {
  return {
    title: guide.title,
    url: `${SITE.url}/en/guides/${guide.slug}`,
    publisher: SITE.name,
    retrieved_at: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `You write blog posts for ${SITE.name}, a UAE guidance site. Its
readers are moving to, working in, or starting a business in the UAE.

Ground rules, without exception:
- Never state a government fee, processing time, validity period or eligibility rule unless it
  is already present in the source guide you are given. If the guide does not say, do not guess —
  write around it or say plainly that it varies and depends on the case.
- Never invent a statistic, a named case, a quote, or a date.
- This is general information, not legal or immigration advice, and the post must not read as
  either.
- No marketing language, no "in today's fast-paced world" filler, no rhetorical questions as
  section openers.
- Write in plain sentences a non-native English reader can follow. Short paragraphs.
- Do not repeat the guide's own steps as a list; that content already exists on the site. Give a
  genuinely different angle on the same underlying topic.`;

function buildPrompt(guide: GuideSource, angle: string): string {
  return `Source guide (already published on the site — treat everything in it as the only facts
you may rely on for specifics):

Title: ${guide.title}
${guide.excerpt ? `Standfirst: ${guide.excerpt}\n` : ""}${guide.body_md}

---

Write one blog post that takes this angle: ${angle}

Return it as a call to the "respond" tool with:
- "title": a specific, plain-language title. Not the same title as the guide.
- "excerpt": one or two sentences, for a listing page.
- "body_md": the post body in Markdown, 350-600 words. Start with a paragraph, not a heading.
  Use "##" for any section headings.
- "service_slug": which one of these the post should point a reader toward, if any, else null:
  ${serviceSlugs().join(", ")}`;
}

const DRAFT_PROPERTIES = {
  title: { type: "string" },
  excerpt: { type: "string" },
  body_md: { type: "string" },
  service_slug: { type: ["string", "null"] },
};

/**
 * Guides that do not already have a derived blog post.
 *
 * "Already covered" is read from citations rather than a new column: every
 * post this pipeline writes cites its source guide, so a blog article citing
 * `/guides/<slug>` means that guide has been drafted from, whatever became of
 * the draft afterward — approved, still pending, or rejected. A rejected
 * draft is not retried automatically; regenerating an identical angle a human
 * already turned down would just refill the queue with the same rejection.
 */
export async function undraftedGuides(): Promise<GuideSource[]> {
  const db = supabaseAdmin();

  const [guides, posts] = await Promise.all([
    db
      .from("articles")
      .select("id, slug, title, excerpt, body_md")
      .eq("kind", "guide")
      .eq("status", "approved")
      .order("published_at", { ascending: true }),
    db.from("articles").select("citations").eq("kind", "blog"),
  ]);

  if (guides.error) throw new Error(`could not read guides: ${guides.error.message}`);
  if (posts.error) throw new Error(`could not read blog posts: ${posts.error.message}`);

  const covered = new Set<string>();
  for (const row of (posts.data ?? []) as { citations: Citation[] }[]) {
    for (const citation of row.citations ?? []) {
      const match = citation.url?.match(/\/guides\/([^/?#]+)/);
      if (match) covered.add(match[1]);
    }
  }

  return ((guides.data ?? []) as GuideSource[]).filter((g) => !covered.has(g.slug));
}

/** Drafts up to `limit` posts, one per eligible guide, oldest guide first —
 *  the guides that have waited longest for a companion post go first. */
export async function draftBlogPosts(limit = 3): Promise<DraftResult> {
  const eligible = await undraftedGuides();
  const batch = eligible.slice(0, Math.max(0, limit));

  if (eligible.length === 0) {
    console.log("[blog-drafts] every published guide already has a derived post");
  }

  const db = supabaseAdmin();
  let drafted = 0;

  for (let i = 0; i < batch.length; i++) {
    const guide = batch[i];
    const angle = angleFor(i);

    const result = await generateJSON<Draft>(buildPrompt(guide, angle), {
      system: SYSTEM_PROMPT,
      properties: DRAFT_PROPERTIES,
      required: ["title", "excerpt", "body_md"],
      maxOutputTokens: 2000,
    });

    if (!result?.title || !result.body_md) {
      console.warn(`[blog-drafts] Claude produced nothing usable for "${guide.title}", skipping`);
      continue;
    }

    // The model is asked for a service_slug but is not trusted with it: any
    // value outside the known list, ours or invented, falls back to the same
    // keyword matcher the rest of the site uses to route a job or a question.
    const serviceSlug = serviceSlugs().includes(result.service_slug ?? "")
      ? result.service_slug
      : (matchServices(`${result.title} ${result.excerpt}`, 1)[0]?.slug ?? null);

    const { error } = await db.from("articles").insert({
      slug: await uniqueSlug("articles", result.title),
      locale: "en",
      kind: "blog",
      title: result.title,
      excerpt: result.excerpt,
      body_md: result.body_md,
      citations: [sourceCitation(guide)],
      service_slug: serviceSlug,
      status: "pending",
    });

    if (error) {
      console.warn(`[blog-drafts] could not save draft for "${guide.title}": ${error.message}`);
      continue;
    }

    drafted++;
    console.log(`[blog-drafts] drafted "${result.title}" from guide "${guide.title}"`);
  }

  return { eligible: eligible.length, drafted, skipped: batch.length - drafted };
}
