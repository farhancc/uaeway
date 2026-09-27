/** Row shapes for the tables in supabase/migrations. Hand-written: the schema is
 *  small and stable, and a generated-types step would add a build dependency for
 *  little gain. Keep in step with the migrations. */

export type ContentStatus = "pending" | "approved" | "rejected";
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type LeadOrigin = "chat" | "form" | "whatsapp" | "import";
export type ArticleKind = "news" | "guide" | "blog";

export interface JobRow {
  id: string;
  slug: string;
  title: string;
  company: string | null;
  /** Where to apply. Null when the listing gave no link. */
  source_url: string | null;
  source_name: string;
  emirate: string | null;
  category: string | null;
  summary: string | null;
  documents_needed: string[];
  /** Verbatim from the source. Display only — never rewritten. */
  salary_text: string | null;
  /** AED per month, normalised for comparison. Null when not certain. */
  salary_min: number | null;
  salary_max: number | null;
  /** Minimum years asked for. 0 = open to freshers. Null = not stated. */
  experience_years: number | null;
  /** The employer's own deadline. Null = not stated. Ours is expires_at. */
  apply_by: string | null;
  posted_at: string;
  expires_at: string | null;
  status: ContentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  title: string;
  url: string;
  publisher?: string;
  retrieved_at?: string;
}

export interface ArticleRow {
  id: string;
  slug: string;
  locale: string;
  kind: ArticleKind;
  title: string;
  excerpt: string | null;
  body_md: string;
  hero_image_url: string | null;
  citations: Citation[];
  service_slug: string | null;
  status: ContentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  service_slug: string;
  name: string | null;
  contact: string;
  email: string | null;
  need: string | null;
  origin: LeadOrigin;
  chat_session_id: string | null;
  page_path: string | null;
  utm: Record<string, string>;
  status: LeadStatus;
  notes: string | null;
  consent_at: string;
  created_at: string;
  updated_at: string;
}

export interface JobSearchRow {
  id: string;
  keywords: string;
  location: string;
  active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export type Ats = "greenhouse" | "lever";

export interface JobBoardRow {
  id: string;
  ats: Ats;
  slug: string;
  name: string;
  active: boolean;
  last_run_at: string | null;
  /** Why the last run of this board failed, or null if it worked. */
  last_error: string | null;
  created_at: string;
}

export interface ChatSessionRow {
  id: string;
  ip_hash: string | null;
  user_agent: string | null;
  page_path: string | null;
  turn_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
}
