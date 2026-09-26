/**
 * Grounding for the chatbot: the published content that might answer a question.
 *
 * Retrieval is Postgres full-text search over the generated `search` columns.
 * The corpus is a few thousand short English documents, which Postgres handles
 * well; a vector store would be a dependency and an embedding pipeline earning
 * nothing at this size. Revisit if Arabic content makes recall visibly poor.
 *
 * Only approved content is retrievable, so the bot cannot quote an unreviewed
 * draft — the same invariant RLS enforces for the public pages.
 */

import { articlePath } from "../content/sections";
import { matchServices, type Service } from "../services";
import { supabaseAdmin } from "../supabase/admin";
import type { ArticleRow, JobRow } from "../supabase/types";

export interface Snippet {
  kind: "service" | "article" | "job";
  title: string;
  /** Path on this site, so the bot can link the visitor somewhere real. */
  path: string;
  text: string;
}

function serviceSnippet(service: Service): Snippet {
  const faqs = service.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n");
  return {
    kind: "service",
    title: service.name,
    path: `/services/${service.slug}`,
    text: [
      service.summary,
      `Turnaround: ${service.turnaround}`,
      `What we need from the client: ${service.documents.join("; ")}`,
      faqs,
    ].join("\n"),
  };
}

export async function retrieve(query: string, limit = 6): Promise<Snippet[]> {
  // Services first: they are the answer to most questions and cost no query.
  const snippets: Snippet[] = matchServices(query, 2).map(serviceSnippet);

  const db = supabaseAdmin();
  const remaining = Math.max(limit - snippets.length, 2);

  const [articles, jobs] = await Promise.all([
    db
      .from("articles")
      .select("slug, kind, title, excerpt, body_md")
      .eq("status", "approved")
      .textSearch("search", query, { type: "websearch", config: "english" })
      .limit(remaining),
    db
      .from("jobs")
      .select("slug, title, company, emirate, summary")
      .eq("status", "approved")
      .textSearch("search", query, { type: "websearch", config: "english" })
      .limit(2),
  ]);

  if (articles.error) console.warn(`[retrieve] articles: ${articles.error.message}`);
  if (jobs.error) console.warn(`[retrieve] jobs: ${jobs.error.message}`);

  for (const row of (articles.data ?? []) as Pick<
    ArticleRow,
    "slug" | "kind" | "title" | "excerpt" | "body_md"
  >[]) {
    snippets.push({
      kind: "article",
      title: row.title,
      path: articlePath(row.kind, row.slug),
      // Enough to answer from without filling the context with one article.
      text: (row.excerpt ? `${row.excerpt}\n` : "") + row.body_md.slice(0, 1200),
    });
  }

  for (const row of (jobs.data ?? []) as Pick<
    JobRow,
    "slug" | "title" | "company" | "emirate" | "summary"
  >[]) {
    snippets.push({
      kind: "job",
      title: row.title,
      path: `/jobs/${row.slug}`,
      text: [row.company, row.emirate, row.summary].filter(Boolean).join(" — "),
    });
  }

  return snippets.slice(0, limit);
}

/** The retrieved context as the block we hand the model. */
export function renderContext(snippets: Snippet[]): string {
  if (snippets.length === 0) return "(no matching content on the site)";
  return snippets
    .map((s, i) => `[${i + 1}] ${s.kind.toUpperCase()}: ${s.title} (${s.path})\n${s.text}`)
    .join("\n\n");
}
