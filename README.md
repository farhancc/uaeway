# UAE Gateway

An automated UAE content portal — job openings, guides and news — that turns
organic search traffic into leads for Wordcraft's services: attestation,
certified legal translation, visa processing, notary, business setup, higher
studies, CV writing and websites.

## How it works

```
Careerjet API ──┐
official feeds  ├─> cron ingest ─> Gemini (5-key pool) ─> Postgres (pending)
submissions ────┘                                             │
                                                    admin review queue
                                                              │ approve
                                                    published ─> ISR pages
                                                              │
visitor ─> chatbot ─> Postgres full-text search over published content
                   └─> lead ─> Telegram + email ─> sales
```

Three rules the code enforces:

1. **Nothing AI-written is published without a human approving it.** Every job
   and article lands as `pending`; RLS only exposes `approved` rows, and public
   pages read through the anon key so a forgotten filter cannot leak a draft.
2. **We summarise and link out, never republish.** Job pages carry an excerpt in
   our own words and an outbound link to the original posting.
3. **No lead is stored without recorded consent** (`leads.consent_at` is
   `NOT NULL`, and the Zod schema requires `consent: true`).

## Setup

```bash
npm install
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `GEMINI_API_KEYS` | All five AI Studio keys, comma separated |
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `CAREERJET_API_KEY` | Careerjet **v4** publisher key — see below |
| `WHATSAPP_NUMBER` | Sales number, international format, no `+` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | @BotFather |
| `RESEND_API_KEY`, `LEAD_ALERT_EMAIL`, `LEAD_ALERT_FROM` | resend.com |
| `CRON_SECRET` | `openssl rand -hex 32` |

Apply the schema by running the files in `supabase/migrations/` in order
(`0001_init.sql`, `0002_article_authoring.sql`, `0003_manual_jobs.sql`) in the
Supabase SQL editor,
then grant yourself admin access:

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'you@example.com';
```

## Run

```bash
npm run dev             # http://localhost:3000  (redirects to /en)
npm test                # unit tests
npm run build           # production build
npm run seed:prospects  # load data/dubai-b2b-leads.csv into `prospects`
```

The scheduled jobs are HTTP routes, called by Vercel Cron (`vercel.json`) with
`Authorization: Bearer $CRON_SECRET`. **Schedules are UTC; the UAE is UTC+4**, so
`0 0 * * *` runs at 04:00 Gulf time.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/ingest-jobs
```

## Job sources

The primary source is the **Careerjet Partners API v4**
(`https://search.api.careerjet.net/v4/query`, HTTP Basic auth with the API key
as the username and an empty password). Register as a publisher at
<https://www.careerjet.com/partners/api>.

The legacy `public.api.careerjet.net/search` endpoint that the earlier prototype
used is closed — it answers *"only accessible for authenticated legacy users"* —
and it was plain HTTP. Do not go back to it.

Careerjet is used because it is built for publishers to display an excerpt and
link back. Scraping job boards would breach their terms. Never add a source that
lists pay-to-apply jobs.

## Adding jobs

Two ways in. Both land as `pending` and are published from the same review
queue, so there is one route to the public site.

**The nightly ingest.** Set `CAREERJET_API_KEY`, then either wait for the cron
or run it now:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest-jobs
```

What it searches for lives in the `job_searches` table and is managed at
**`/admin/searches`** — add, pause or remove a keyword/location pair, no deploy
and no SQL. Each running search is one API call per night plus AI summaries for
whatever it finds, so the list is worth keeping tight.

**By hand,** at **`/admin/jobs/new`** — for a vacancy an employer sends you
directly. It needs a link or an email address where people apply, because
applicants always apply with the employer; we are not the recruiter. Write the
summary in your own words rather than pasting the advert, and list the documents
the role will need — those become the stamps on the listing and the reason
someone contacts you.

Never add a listing that asks the candidate to pay anything.

## The Gemini key pool

`lib/ai/pool.ts` rotates across all five keys, retries the next key on 429/503,
and benches a key for 60 seconds after two consecutive failures. This is what
makes five keys worth more than one: it multiplies the usable rate limit and
stops one exhausted key stalling a nightly run. Every call degrades to `null`
rather than throwing, so the ingest falls back to a non-AI summary instead of
dying half way through.

## Layout

```
app/(site)/[locale]/   public pages — every URL carries its locale from day one
app/(admin)/admin/     review queue and leads inbox (Supabase auth + `admins`)
app/api/               chat (SSE), leads, cron
lib/ai/                Gemini client and key pool
lib/chat/              retrieval, system prompt, guardrails, sessions
lib/ingest/            Careerjet client and the job pipeline
lib/leads/             validation, capture, alerting
lib/content/sections.ts  guides / blog / news — one definition of each
lib/services.ts        the eight service lines — the commercial core
supabase/migrations/   schema and RLS
```

`lib/services.ts` is the file to edit when a service changes: it drives the
service pages, the intake forms, the chatbot's grounding and the CTA shown on
each job.

## Writing

Three kinds of article, defined once in `lib/content/sections.ts`:

| Kind | URL | What belongs there |
| --- | --- | --- |
| `guide` | `/guides` | Evergreen how-to: what a process involves, end to end |
| `blog` | `/blog` | Longer pieces from doing the work — why applications fail |
| `news` | `/news` | A rule, fee or process actually changed |

Write one at **`/admin/new`**. It saves as a draft, appears in the review queue,
and goes live when someone publishes it there — the same route an AI draft
takes, so there is one path to publication rather than two.

Sources are part of the form for a reason: anything asserting a fee, a rule or a
date needs one, and an article that cannot say where its claims came from is
what we reject when the pipeline produces it.

Adding a fourth kind means adding it to `SECTIONS`, to the `article_kind` enum,
and creating `app/(site)/[locale]/<slug>/page.tsx` and `[slug]/page.tsx`. The
nav, sitemap, chatbot retrieval and home page pick it up from `SECTIONS`.

## Before launch

- [ ] **Confirm which services Wordcraft is licensed to deliver directly.** Set
      `licence` on each entry in `lib/services.ts` to `direct` or `partner`.
      They are all `unconfirmed` today, and the copy stays neutral until you
      change them. Visa processing, attestation, notary and legal translation
      are regulated activities in the UAE.
- [ ] Have `/privacy` and `/terms` reviewed by a UAE legal adviser.
- [ ] Get a Careerjet v4 key and run one real ingest.
- [ ] Add at least one admin to the `admins` table.
- [ ] Upgrade to **Node 22 LTS** — Supabase deprecates Node 20, and Node 20.18
      is below what parts of the toolchain now expect.

## Deliberate decisions

- **No `JobPosting` structured data.** Google requires it on the page hosting the
  full listing; emitting it on a summary that links out risks a manual action.
  Job pages use `Article` and `BreadcrumbList` instead.
- **No vector database.** Retrieval is Postgres full-text search. A few thousand
  short English documents do not need embeddings.
- **Services live in code, not a table.** Eight rows that change once a year are
  configuration, not content.
- **Light theme only.** The design is built on a paper metaphor; a second theme
  would double the QA surface for no user gain.
- **WhatsApp Cloud API deferred.** It needs Meta business verification and
  template approval. Leads reach sales through Telegram and email today, and
  visitors reach the team through `wa.me` click-to-chat.
