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

## Deploy

Vercel, building from GitHub (`farhancc/uaeway`). A push to `main` deploys to
production; any other branch gets a preview. Environment variables live in the
Vercel project, not in the repo — `.env*` is gitignored and only `.env.example`
is committed.

## Job sources

A source turns the searches in `/admin/searches` into `RawJob`s. The contract is
`lib/ingest/source.ts`; `lib/ingest/jobs.ts` runs every source in parallel and
de-duplicates by source URL, so a source with no key simply contributes nothing.

**Jooble** (`lib/ingest/jooble.ts`) is the default. Free, covers the Emirates,
and built for publishers. Get a key from the short form at
<https://jooble.org/api/about> and set `JOOBLE_API_KEY`.

**Employer boards** (`lib/ingest/boards.ts`) read companies' own hiring pages.
Greenhouse and Lever publish every customer's board as open JSON — no key, no
signup, nothing to be rate-limited out of. Manage the employer list at
`/admin/boards`; adding one checks the slug against the live board first, so a
typo fails at the form rather than returning nothing every night.

The trade-off is breadth. An aggregator answers *"who is hiring nurses in
Dubai"*; a board answers *"what is Careem hiring for"*. So boards complement
Jooble rather than replace it — but what they give up in coverage they gain in
quality: the employer's own posting, and an apply link that goes to the employer
rather than through a redirect. A board is the whole company, so listings
outside the UAE are dropped before they reach the review queue; paying a model
to summarise a job in Berlin that a human then rejects is the cost that filter
exists to avoid.

**Careerjet** (`lib/ingest/careerjet.ts`) is an optional third source, dormant
unless `CAREERJET_API_KEY` is set. Also free, but it needs publisher approval,
which is why it is not the default. Its legacy `public.api.careerjet.net/search`
endpoint is closed — *"only accessible for authenticated legacy users"* — and
was plain HTTP. Do not go back to it; v4 is HTTPS with Basic auth.

### Why not the other keyless feeds

There is no free, keyless, *general* UAE job feed — employer boards are keyless
but only cover employers you name. Measured, not assumed:

| Source | Key | UAE listings |
| --- | --- | --- |
| Arbeitnow | none | 0 of 325 |
| The Muse | none | 0 across 60 |
| Jobicy, Remotive | none | remote boards only |
| Adzuna | free tier | no `adzuna.ae` — no UAE market |
| Greenhouse / Lever | none | per employer (Careem: 11 of 18) |

Every source here is used because it is built for publishers to display an
excerpt and link back. The Gulf boards block server-side requests and scraping
them would breach their terms anyway. Never add a source that lists pay-to-apply
jobs.

### Markup

Feeds hand us HTML in fields that reach a model prompt and the review queue, so
`htmlToText` in `lib/ingest/source.ts` is not cosmetic. Greenhouse escapes its
HTML **twice** — the wire carries `&amp;nbsp;` — so decoding runs to a fixed
point, and tags are stripped *after* all decoding. The reverse order would let
`&amp;lt;script&amp;gt;` survive as a live tag.

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

### How long a listing lives

Two windows, deliberately different lengths (`lib/jobs.ts`):

| | Days | What happens |
| --- | --- | --- |
| `SHELF_LIFE_DAYS` | 45 | `expires_at` passes, the weekly prune marks it `rejected`, and it comes off the site |
| `JOB_RETENTION_DAYS` | 60 | The row is deleted |

The gap is the point: for a fortnight an expired listing can still be opened in
the admin — to see what ran, restore one taken down early, or check what an
applicant is asking about. Until this existed nothing was ever deleted, so
every listing the ingest had seen stayed in the table for good.

Age is measured from `created_at`, not the posting date the source claimed —
some feeds backdate, and one bad date should not evict a row on arrival. A
listing still on the site is spared even once it is old enough; the shelf life
is shorter than the retention window so this rarely applies, but housekeeping
should never be able to delete a job someone is reading. It goes on the next
run.

Both run from `/api/cron/prune`, weekly.

## The Gemini key pool

`lib/ai/pool.ts` round-robins across every key in `GEMINI_API_KEYS`, so
consecutive requests start on different keys and per-key quota goes further.
Both formats Google issues are accepted — the `AIza…` keys from AI Studio and
the `AQ.…` ones — and they can be mixed in one pool.

How long a failing key sits out depends on *why* it failed, because "briefly
rate-limited" and "out of credit" arrive as the same HTTP status but need
opposite handling:

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
                                      └─ used its 8 model replies? ──> the enquiry form
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
suggestions still work, and the visitor is pointed at the enquiry form on the
service page that fits — so a capped session stays useful and costs nothing. Lead capture is exempt: a lead is worth
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

## Leads, and being told about them

Two ways a conversation becomes a lead, and they cost different amounts:

- **The callback form in the chat.** A button under every reply opens name,
  contact, service and a consent box. Deterministic, no model call, and consent
  is a ticked box rather than something a model inferred from prose.
- **Typed in conversation.** If someone writes their number into a sentence
  instead, a second model call reads the last four turns to pull out the
  contact and decide whether they agreed to be contacted. It runs only when the
  message plausibly holds a contact, and it is strict about consent — a wrong
  `true` means messaging someone who never asked.

Both land in `leads` with `consent_at` set, deduplicated per contact and
service, and both call `alertSales`.

### Telegram

This is the channel that tells you a lead arrived. Without it a lead is saved
and nobody is told — so `alertSales` now logs that loudly rather than returning
in silence.

1. Message [@BotFather](https://t.me/BotFather) → `/newbot`, and copy the token
   into `TELEGRAM_BOT_TOKEN`.
2. **Open your new bot and send it `/start`.** A bot cannot message someone who
   has never messaged it, and skipping this is what produces `chat not found`.
3. Get the chat id: open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read
   `result[0].message.chat.id`. Put it in `TELEGRAM_CHAT_ID`.
   For a team group, add the bot to the group, post any message there, and use
   the group's negative id instead.
4. Prove it:

```bash
npm run check:alerts
```

That sends a clearly-marked test message through every configured channel and
writes nothing to the database. Run it after any change to these variables —
finding out from a missed lead is the expensive way.

Email alerts through Resend are optional and independent: set `RESEND_API_KEY`,
`LEAD_ALERT_EMAIL` and `LEAD_ALERT_FROM`. Either channel failing is logged and
swallowed; the database row is the source of truth.

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

- [x] **Which services are in-house vs referred out.** `delivery` on each entry
      in `lib/services.ts` is `in-house` (CV writing, websites) or `referred`
      (everything else). Visa processing, attestation, notary and legal
      translation are regulated activities in the UAE — this site must not imply
      it performs them, so anything that describes a service reads its
      `delivery` rather than hardcoding a claim. `scripts/seed-answers.ts` got
      this wrong once and shipped four chat answers saying "we handle this"
      about attestation; if you add another such surface, take the wording from
      the service.
- [ ] Have `/privacy` and `/terms` reviewed by a UAE legal adviser.
- [ ] Get a Jooble key (<https://jooble.org/api/about>) and run one real ingest.
- [ ] Add at least one admin to the `admins` table.
- [ ] Set up Telegram alerts and run `npm run check:alerts`. Until a channel is
      configured, every lead is saved and nobody is told.

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
  the one button that starts an enquiry, red for warnings only. Brass fails contrast as text on ivory,
  so `--color-brass-deep` exists for links and numerals on light grounds.
- **One inbound channel: the assistant.** No WhatsApp, no phone number, no
  mailto. Every route in goes through the chat or a service page's enquiry
  form, so every enquiry arrives as a `leads` row with recorded consent rather
  than as a message in someone's personal app. Leads reach sales through
  Telegram and email.
