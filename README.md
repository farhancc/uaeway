# UAEvia

An automated UAE content portal — job openings, guides and news — that turns
organic search traffic into leads for UAE service providers: attestation,
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

Node 22 or newer — `.nvmrc` pins 24 LTS. `@supabase/supabase-js` needs a native
WebSocket, which Node 20 does not have, so the seed scripts fail on it.

```bash
nvm use
npm install
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `GEMINI_API_KEYS` | AI Studio keys, comma separated. One is enough; more only buys headroom |
| `GEMINI_MODEL` | Optional. Overrides the pinned chat model (see `lib/ai/gemini.ts`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `CAREERJET_API_KEY` | Careerjet **v4** publisher key — see below |
| `WHATSAPP_NUMBER` | Sales number, international format, no `+` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | @BotFather |
| `RESEND_API_KEY`, `LEAD_ALERT_EMAIL`, `LEAD_ALERT_FROM` | resend.com |
| `CRON_SECRET` | `openssl rand -hex 32` |

Apply the schema by running the files in `supabase/migrations/` in order
(`0001_init.sql` … `0004_answers.sql`) in the Supabase SQL editor,
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
npm run seed:answers    # fill the answer bank from the launch FAQs and paths
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

`lib/ai/pool.ts` rotates across every key in `GEMINI_API_KEYS`. How long a
failing key sits out depends on *why* it failed, because "briefly rate-limited"
and "out of credit" arrive as the same HTTP status but need opposite handling:

| What happened | Bench |
| --- | --- |
| Network error or 5xx | 30s, after two failures in a row |
| Per-minute rate limit (429) | The API's own `RetryInfo`, else 60s |
| Quota or credit used up (429) | 1 hour |
| Key rejected or revoked (400 `API_KEY_INVALID`, or 403) | 24 hours |

Two things worth knowing:

- **A rejected key answers 400, not 401.** Anything that reads every 400 as "our
  request was wrong" will abandon the whole call instead of trying the next key.
- **A key that is out of credit is not coming back in a minute.** Benching it
  briefly means retrying a dead key every minute all day, paying a round trip
  and a backoff wait each time.

Every call degrades to `null` rather than throwing, so the ingest falls back to
a non-AI summary instead of dying half way through.

### Rotating a key

When a key runs out of credit or is revoked, the logs name it by its last four
characters — keys are never written to logs in full:

```
[gemini] key #3 …7f2a benched for 3600s (exhausted) — this one needs attention:
         replace it in GEMINI_API_KEYS or top up its quota
```

Edit `GEMINI_API_KEYS` (comma-separated, order is irrelevant, duplicates are
ignored) and restart or redeploy — the pool is read once per process, so a
running server keeps the old list.

`poolStatus()` reports which keys are usable, but only for the process that
calls it. On serverless each instance keeps its own view, so trust the logs over
any single snapshot.

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

## Two AI providers, one job each

Gemini answers the chatbot and summarises jobs. Claude (Sonnet) drafts blog
posts. They do not overlap, and neither file knows the other exists:

- `lib/ai/gemini.ts` — pooled across five keys, because the ingest is
  quota-bound and the chatbot needs to stream.
- `lib/ai/claude.ts` — a single key, because there is one job (long-form
  drafting) and one Anthropic account behind it. Structured output goes
  through Anthropic's tool-use rather than "reply with only JSON": an
  800-word draft is long enough that free-text JSON genuinely breaks on a
  stray quote or markdown fence in the body.

Set `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`, default
`claude-sonnet-5`) to turn blog drafting on. Nothing else needs it.

### Blog drafting

`lib/content/blog-drafts.ts` turns a published guide into a companion blog
post — a different angle on the same topic, not a rehash of its steps — and
saves it as `status: pending`, the same review queue as everything else. A
Claude-authored paragraph that states a wrong fee is exactly the same problem
as a Gemini-authored one; the guardrail is who reviews it, not which model
wrote it.

Which guides still need a post is read from the blog posts that already
exist, not a new column: every draft cites its source guide's URL, so a blog
article citing `/guides/<slug>` means that guide is covered — whatever
happened to the draft afterward, approved or rejected. A rejected draft is
not retried automatically; regenerating an angle a human already turned down
would just refill the queue with the same rejection.

The service a post points to is never taken on the model's word: it is
checked against the real service list and falls back to the same keyword
matcher (`matchServices`) the rest of the site uses if the model names
something that does not exist.

Runs twice a week by default (`vercel.json`, Monday and Thursday at 02:00
UTC — 06:00 Gulf time) via `/api/cron/draft-blog`, or on demand:

```bash
npm run draft:blog        # up to 3 posts
npm run draft:blog 10     # up to 10
```

If every guide already has a companion post, it says so and drafts nothing —
this does not run just to fill a schedule.

## The answer bank, and what the chatbot costs

The chatbot used to call Gemini on every turn — around 2,500–4,000 input tokens
each — including for the twenty questions we had already written answers to.

Now most turns cost nothing:

```
tapped suggestion ─────────────> exact lookup by slug            0 tokens
typed question ──> confident keyword match? ──yes──> the bank    0 tokens
                            └──no──> Gemini, trimmed prompt
                                      └─ used its 8 model replies? ──> handoff + WhatsApp
```

**Suggestions are the mechanism, not decoration.** A tapped chip is an exact
lookup, so the follow-ups set on each answer are what keeps a whole conversation
free rather than just its opening. They appear before the first message and
after every reply. Set them in `/admin/answers`.

**Typed questions are matched conservatively.** A single common word is
deliberately not enough, and two answers that fit equally well both lose — the
question goes to Gemini instead. Telling someone the golden visa fee when they
asked about family sponsorship costs more than the tokens do.

The turns that still reach Gemini are about 42% smaller: the instructions no
longer embed the per-turn context, so the system instruction is byte-identical
across calls and can hit Gemini's implicit cache; retrieval dropped from 6
snippets to 4 with shorter excerpts; history from 12 turns to 8; and service
grounding no longer repeats the FAQs the bank already answers.

**Each conversation gets 8 model replies.** After that the bank still answers,
suggestions still work, and the visitor is offered WhatsApp — so a capped
session stays useful and costs nothing. Lead capture is exempt: a lead is worth
far more than the tokens.

`/admin` shows the figure that matters: **percentage of replies answered without
calling the AI, last 7 days.** A low share means people are asking things the
bank does not cover, or the follow-ups are not leading anywhere — both fixable
in `/admin/answers`.

### One source for answers

The `answers` table feeds both the chatbot and the "Questions we get" block on
each service page, including its `FAQPage` markup. `Service.faqs` was removed
from `lib/services.ts` when this landed; `scripts/seed-data/faqs.ts` holds the
launch content purely as the seed. Edit answers in the admin, not in code.

The trade-off: if Supabase is unreachable, service pages render without their
FAQ block. Worth it for one editable definition of what we tell people.

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

- [ ] **Decide which services are delivered in-house vs referred out.** Set
      `licence` on each entry in `lib/services.ts` to `direct` (we do it) or
      `partner` (a licensed provider does it, and the page says so). Most are
      `unconfirmed` today and the copy stays neutral until you change them.
      Visa processing, attestation, notary and legal translation are regulated
      activities in the UAE — this site must not imply it performs them.
- [ ] Have `/privacy` and `/terms` reviewed by a UAE legal adviser.
- [ ] Get a Careerjet v4 key and run one real ingest.
- [ ] Add at least one admin to the `admins` table.

## Deliberate decisions

- **No `JobPosting` structured data.** Google requires it on the page hosting the
  full listing; emitting it on a summary that links out risks a manual action.
  Job pages use `Article` and `BreadcrumbList` instead.
- **No vector database.** Retrieval is Postgres full-text search. A few thousand
  short English documents do not need embeddings.
- **Services live in code, not a table.** Eight rows that change once a year are
  configuration, not content.
- **Light theme only.** A second theme would double the QA surface for no user
  gain here.
- **Navy leads, brass is a material.** The palette is ink navy `#0E1B33`,
  ivory `#FAF8F4` and brass `#B0873C`, with Fraunces for display and Inter for
  text. Two rules keep it from looking like every other consultancy site: the
  masthead and hero are full-bleed navy rather than an ivory page with navy
  text, and brass appears only as hairlines, numerals and small marks — never a
  filled button, which is what makes these sites read as gold-plated. Each
  colour has one job: navy for actions, brass for rules and numerals, green for
  WhatsApp only, red for warnings only. Brass fails contrast as text on ivory,
  so `--color-brass-deep` exists for links and numerals on light grounds.
- **WhatsApp Cloud API deferred.** It needs Meta business verification and
  template approval. Leads reach sales through Telegram and email today, and
  visitors reach the team through `wa.me` click-to-chat.
