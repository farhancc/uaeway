# Jobs worker

Finds UAE jobs on Google, hands them to the site, and drip-feeds the approved
ones into a WhatsApp group — ten listings a day, one or two at a time, between
7am and 10pm India time.

Runs on your own machine, in a terminal. There is no web interface and nothing
to deploy.

```
  Google (via Serper)                 this worker                    the site
          │                                │                             │
          │  twice a day: 6 keywords  ─────▶  filter out category pages  │
          │                                │  ─── POST /api/ingest/jobs ─▶ Gemini,
          │                                │                             │ slug,
          │                                │                             │ review
          │                                │                             │
          │              10 a day, 1-2 at  │ ◀── GET /api/digest?json ───┤ approved
          │              a time, irregular │     (approved listings)     │ only
          │                                ▼                             │
          │                     WhatsApp group                           │
```

## What it will and will not post

**Only approved listings.** `/api/digest` is the public board's own query, so a
listing waiting for review, one that expired, and one past the employer's
closing date are all already absent. The worker never decides what is postable.

**Never the same listing twice.** It keeps the slugs it has sent in Mongo
(`whatsapp_posted`) and posts only what is left. When there is nothing new it
says nothing — a group that gets a string of "no jobs today" notices is a group
that mutes this.

**Nothing on a schedule anyone can spot.** There is no posting cron. A cron
sends the same number of listings at the same minute of every hour, which is
the clearest possible sign that nobody is typing these. Instead the day has a
budget of ten listings, each message carries one or two at random, and each
post works out its own delay before the next from how much of the day and the
budget are left. Gaps come out irregular, the day spreads itself, and a worker
restarted at noon counts what the morning already sent rather than starting the
ten again. All of that is `src/pacing.ts`, and it is covered by tests so the
irregularity can be checked without waiting a day.

**Never a salary the employer did not state.** The board stores pay verbatim or
not at all, and the message passes it through unchanged. The Google snippets do
contain pay, but a regex over a snippet turns "From AED5,000" into a fixed
figure, so `serper.ts` does not read it at all.

## How jobs get approved

Scraped listings go through the same pipeline as the Jooble and Careerjet
feeds, and most of them **wait for you in the admin queue**.

One narrow exception, in the site's `lib/ingest/jobs.ts` (`autoApprove`): a
listing goes straight to approved only when all three hold — the URL matched a
known single-posting pattern, Gemini actually returned a summary, and it put
the role in a real category rather than "Other". Anything failing one of the
three waits. Roughly half the board sits in "Other", so the gate is narrow on
purpose; it is not there to clear the queue.

If the group goes quiet for a day, the queue is where to look.

## Why Google needs filtering, not just fetching

A Google search for "accountant jobs in Dubai" **does not return jobs**. It
returns boards' category pages — `bayt.com/en/uae/jobs/accountant-jobs/`,
`gulftalent.com/jobs/category/accounting` — whose titles read like job titles
and whose snippets are six unrelated roles mashed together. Measured on
2026-10-23, that query's first page was ten category pages and zero postings.

So `src/serper.ts` restricts each query to the URL prefix where a board keeps
its individual postings, and then discards every result that does not match a
pattern known to identify one. Measured yields:

| Target | Postings per 10 results |
| --- | --- |
| `ae.indeed.com/viewjob` | 10/10 (accountant, driver, nurse) |
| `bayt.com/en/uae/jobs` | 2/10 — the rest are category pages |

`gulftalent.com/jobs` returned only index pages and `naukrigulf.com/job-listings`
returned nothing, so neither is configured. **Before adding a board, run the
search by hand and look at the links.** A pattern that is too loose is worse
than no board at all, because what gets through is a Gemini summary of a page
of links, posted to a group of jobseekers as a real vacancy.

## Serper credits: read this before adding keywords

**Every query is one credit**, and a run is `keywords × locations × boards`.
Two boards are configured, so the defaults are:

```
6 keywords × 2 locations × 2 boards  =  24 credits per run
SCRAPE_CRON twice a day              =  48 credits a day  ≈  1,440 a month
```

Serper's free allowance is a fixed pot of credits, not a monthly one. Each
extra keyword costs 4 credits a run, 8 a day, about 240 a month.

This is why the scrape is **not** hourly. Sixteen scrapes a day would be 384
credits a day, and Google's index of a job board does not change within an
hour anyway. The hourly schedule is the *posting*, which costs nothing.

## Setup

### 1. Install and configure

```bash
cd services/whatsapp
npm install
cp .env.example .env
```

Fill in `.env`. `MONGODB_URI`, `MONGODB_DB` and `CRON_SECRET` are the same
values the site uses, and `CRON_SECRET` must match or both endpoints answer 401.

**Point `DIGEST_URL` at your deployed site, not localhost.** The job links in
the message are built by the site from its own `NEXT_PUBLIC_SITE_URL`, so
running against a local dev server sends `http://localhost:3000/...` links to
the group, which work for nobody.

### 2. Pair the account

```bash
npm run pair
```

Scan the QR from WhatsApp on the phone: **Settings → Linked devices → Link a
device**. When it connects it prints every group the account is in with its
JID; copy the one you want into `WHATSAPP_GROUP_JID`.

Re-run it any time to look up a JID — once a session exists it skips the QR.
`npm run pair -- --reset` throws the session away and relinks.

The session lives in Mongo rather than on disk, so it survives moving the
checkout and does not need a new QR each time.

### 3. Test the Google half first

The scrape needs no group, no pairing and no deployed site, so check it before
anything else:

```bash
npm run scrape -- --dry
```

It searches, prints every posting that passed the single-listing filter, and
**writes nothing anywhere** — it costs only Serper credits. Drop `--dry` to
push the results to the site, where they get enriched and queued for review.

This is also the right way to try a new keyword or a new board pattern:

```bash
SERPER_KEYWORDS="welder,storekeeper" SERPER_LOCATIONS=Sharjah npm run scrape -- --dry
```

If a board logs `0 postings from 10 results`, its URLs have changed and its
pattern in `src/serper.ts` needs re-measuring.

### 4. Run it

```bash
npm start
```

It stays in the foreground and prints what it does, including when it intends
to post next. Leave it running — the pacing lives inside the process, so
nothing happens while it is closed. Nothing is lost if it stops: the next run
posts whatever is still unsent, and the day's budget is recounted from the log
rather than restarted.

### 5. Check the posting without waiting for the hour

```bash
curl -X POST localhost:3100/scrape -H "Authorization: Bearer $CRON_SECRET"
curl -X POST localhost:3100/run    -H "Authorization: Bearer $CRON_SECRET"
curl localhost:3100
```

`/scrape` searches and pushes, `/run` posts immediately — ignoring the day's
budget and the window, because someone testing wants to see a message rather
than a coin toss — and a plain `GET` shows the connection status, the posting
rules, when the next post is due and the last outcome of each. The server is
bound to loopback, so it is not reachable from the network.

## Things that will bite you

**The number can get banned.** Baileys is an unofficial client and WhatsApp's
terms prohibit those. A handful of posts a day into one group, at irregular
intervals, from a linked device that stays connected is about as unremarkable
as this can be made — but it is not safe. Use a dedicated SIM you can afford to
lose: not a personal number, and not one anything else depends on.

**Baileys is on a release candidate.** `baileys@latest` is `7.0.0-rc14`; the
6.x line is tagged `legacy` and no longer tracks WhatsApp's protocol. The
version here is pinned exactly rather than to a range, because release
candidates change behaviour between builds. Upgrade deliberately.

**Re-pairing.** If the log says `logged out`, the session was revoked from the
phone and reconnecting will not help — run `npm run pair -- --reset`. Ordinary
disconnects reconnect on their own with backoff.

**Boards change their URLs.** The patterns in `serper.ts` are the only thing
standing between a category page and the group. If a board reorganises, the
yield silently drops to zero for that board. The per-query counts are logged on
every run; a board that logs `0 postings from 10 results` twice in a row has
changed its URLs.

**It is not a server.** Closing the terminal stops the posting. There is no
catch-up for the time it was down; the next run posts whatever is still
unposted and the day's remaining budget is whatever the log says it is. Nothing
is lost, it just arrives later.

## Local development

`npm run typecheck` checks the worker on its own. With
`DIGEST_URL=http://localhost:3000/api/digest` it works against the site's dev
server, which is fine for testing the pipeline as long as you do not post the
resulting localhost links to a real group.

The repository root still has a `render.yaml` from when this was going to be
hosted. Nothing here needs it.
