/**
 * The questions our own jobs board can answer, and nothing else.
 *
 * Every other pack in this directory is written answers: somebody asks what
 * attestation costs or whether they can job-hunt on a visit visa, and a person
 * wrote the reply. This pack is the opposite arrangement. The questions here —
 * "any nurse jobs in Dubai", "what do drivers get paid here", "is this one
 * still open" — have no written answer, because the answer is 258 rows that
 * turn over every week. Writing them down would be a node per role per emirate,
 * stale the day after the ingest runs, in a graph whose node budget is nearly
 * spent (see the ceilings in lib/chat/flow/schema.ts).
 *
 * So each entry here carries `board`, which makes it a `jobs` box instead of a
 * `say` box: the reply is composed from matching listings by
 * `lib/chat/jobs/board.ts`, with the employer's own figures and a link to each
 * listing. Nine entries answer every role on the board, in every emirate, at
 * the cost of an indexed query and no model call at all — where today each of
 * these questions falls through to `fallback-model` and is answered in prose
 * built around two retrieved rows.
 *
 * WHAT THE `answer` FIELD IS FOR HERE
 *
 * The fallback, and only the fallback: what to say when the board has nothing
 * for that search, or when too few of the matching listings state a salary to
 * quote a range. That division is deliberate. A figure comes from the listing
 * it is printed beside, and the advice around it was written by a person — so
 * "there is nothing in Fujairah this week, here is what to do instead" is prose
 * and "AED 6,000 – 8,000" never is.
 *
 * WHAT MAY BE SAID HERE
 *
 * ./job-search-flows.ts's rules, unchanged and for the same reasons: we are not
 * a recruitment agency, we place nobody, we charge no job seeker, and every
 * listing links out to whoever posted it. The one rule this pack adds is about
 * pay. `lib/chat/jobs/answer.ts` will quote a range only when at least three
 * matching listings state one, and always as what those employers advertised
 * rather than as a market rate — because of 258 live listings, 17 state a
 * salary we can read, and a "range" drawn from one of them is a number someone
 * takes into a negotiation. Below that floor the honest sentence in
 * `job-pay-market-rate` is what they get, which is why that entry is the
 * salary box's fallback rather than a competitor to it.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * Anything ./job-search-flows.ts already answers. "Will you find me a job",
 * "how does your jobs page work", "I am a fresher, will anyone hire me" are
 * explanation and advice, and they stay prose. This pack only answers the
 * question "what have you actually got", which none of them do.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every entry here is the CV team's: the board is free, and the thing we sell
 *  to someone reading it is the application and the paperwork behind it. */
const CV = "cv-resume";

/** Said after an empty search, under the sentence that admits it is empty. */
const NOTHING_TODAY =
  "New vacancies arrive through the week and expired ones come off the page automatically, so this is worth asking again in a few days rather than taking as the state of the market. Two things are worth doing meanwhile: the routes that fill fastest here are referrals and applying to employers directly rather than the big portals, and the document side is worth starting before you hold an offer — attestation is the part that delays a start date, not the interview.";

export const JOB_BOARD_FLOWS: AuthoredFlow[] = [
  /* ── The one box that answers any role, in any emirate ─────────────────── */
  {
    id: "board-search",
    question: "What is on your jobs board right now?",
    answer: NOTHING_TODAY,
    service: CV,
    board: { answers: "listings" },
    phrases: [
      "what is on your jobs board right now",
      "what jobs do you have",
      "what jobs do you have at the moment",
      "show me your vacancies",
      "what vacancies have you got",
      "are there any jobs available",
      "any jobs in dubai",
      "any jobs in abu dhabi",
      "any jobs in sharjah",
      "what jobs are available in dubai",
      "do you have any vacancies in dubai",
      "list the current openings",
      "show me the latest jobs",
      "which jobs are you hiring for",
      // Role-shaped phrasings. The role itself is read off the message rather
      // than listed here — that is the whole point of the box — so these are
      // the *shapes* a role question takes, with a common role standing in.
      "are there any nurse jobs in dubai",
      "any driver jobs in sharjah",
      "do you have engineering jobs in abu dhabi",
      "is there a vacancy for an accountant",
      "looking for a sales job in dubai",
      "i am looking for receptionist work in dubai",
      "jobs paying over 10000 a month",
      "jobs paying more than 15k in dubai",
    ],
    // Two words each, deliberately. A box that answers a vague message sorts
    // ahead of everything on `matchByKeywords`, so at three words it would
    // start intercepting the specific questions other packs own — the rule
    // that cost an afternoon in tests/higher-studies-notarisation.test.ts.
    keywords: [
      ["jobs", "available"],
      ["vacancies", "any"],
      ["openings", "current"],
      ["hiring", "now"],
      // The role is unbounded, so a keyword group cannot name it — these pair
      // the generic word with the place, which is what is left to match on
      // when no embedding key is usable and `matchByKeywords` is doing the
      // work. Two words each, like the rest: they lose to anything more
      // specific, which is what keeps them from intercepting other packs.
      ["jobs", "dubai"],
      ["jobs", "sharjah"],
      ["jobs", "abu"],
      ["vacancies", "dubai"],
    ],
    // Tapping a field searches it without typing a word. Six, because the
    // board has volume in these and a seventh button is a menu nobody reads.
    choices: [
      { label: "Healthcare", to: "board-field-health" },
      { label: "Engineering", to: "board-field-engineering" },
      { label: "Accounts & finance", to: "board-field-accounts" },
      { label: "Sales & marketing", to: "board-field-sales" },
      { label: "Admin & reception", to: "board-field-admin" },
      { label: "Driving & logistics", to: "board-field-driving" },
    ],
    next: ["board-freshers", "job-us-jobs-board", "job-us-find-jobs"],
  },

  /* ── One per field, for tapping rather than typing ─────────────────────── */
  {
    id: "board-field-health",
    question: "Healthcare and nursing jobs",
    answer:
      "Nothing clinical is listed at the moment. Worth knowing while you wait: a clinical role here also needs the regulator's own licence — DHA in Dubai, DoH in Abu Dhabi, MOHAP federally — and that evaluation runs alongside the job search rather than after it, so starting it early is the difference between an offer you can accept and one that lapses. Their current guidance is what counts on eligibility, and your degree and registration documents have to be attested before any of it.",
    service: CV,
    board: { answers: "listings", query: "nurse" },
    phrases: ["nursing jobs", "healthcare vacancies", "hospital jobs in the uae", "clinic jobs"],
    keywords: [["nursing", "jobs"], ["healthcare", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },
  {
    id: "board-field-engineering",
    question: "Engineering and construction jobs",
    answer:
      "Nothing engineering-side is listed at the moment. The document that holds engineers up here is the degree: for most engineering titles an employer — and the society or authority registering you — will want it attested from the issuing country and, in many cases, translated. That chain starts in the country that issued the certificate, which is why it is worth beginning before you have an offer rather than after.",
    service: CV,
    board: { answers: "listings", query: "engineer" },
    phrases: ["engineering jobs", "engineer vacancies", "construction jobs in dubai", "site engineer jobs"],
    keywords: [["engineering", "jobs"], ["engineer", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },
  {
    id: "board-field-accounts",
    question: "Accounting and finance jobs",
    answer:
      "Nothing in accounts is listed at the moment. For finance roles the two things employers here ask for beyond the CV are the attested degree and, where you hold one, the professional qualification — and a certificate issued by a body abroad goes through the same legalisation chain as a university degree. Corporate tax and VAT experience is the line most finance adverts here are screening on, so it belongs near the top of the CV rather than in a list of duties.",
    service: CV,
    board: { answers: "listings", query: "accountant" },
    phrases: ["accounting jobs", "accountant vacancies", "finance jobs in dubai", "audit jobs"],
    keywords: [["accounting", "jobs"], ["accountant", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },
  {
    id: "board-field-sales",
    question: "Sales and marketing jobs",
    answer:
      "Nothing in sales or marketing is listed at the moment. This is the field where the package matters most to read carefully: a large share of these adverts are commission-weighted, so the figure in the advert and the figure you take home can be different questions. Ask what the basic is, what the target is, and what the last person in the role actually earned before you judge an offer.",
    service: CV,
    board: { answers: "listings", query: "sales" },
    phrases: ["sales jobs", "marketing vacancies", "business development jobs in dubai", "retail sales jobs"],
    keywords: [["sales", "jobs"], ["marketing", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },
  {
    id: "board-field-admin",
    question: "Admin and reception jobs",
    answer:
      "Nothing in admin is listed at the moment. These roles get the highest volume of applications of anything on the board, so the CV is doing most of the work: name the systems you have actually used, say how many people or how much correspondence you handled, and keep it to one page. Arabic is an advantage in a great many of these adverts even where it is not stated as a requirement.",
    service: CV,
    board: { answers: "listings", query: "receptionist" },
    phrases: ["admin jobs", "receptionist vacancies", "office assistant jobs in dubai", "secretary jobs"],
    keywords: [["admin", "jobs"], ["receptionist", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },
  {
    id: "board-field-driving",
    question: "Driving and logistics jobs",
    answer:
      "Nothing in driving or logistics is listed at the moment. The qualifying document here is the licence rather than a degree: a UAE licence of the right class, which for most of these roles means converting or sitting for a licence locally, and for heavy vehicles a separate class again. Check which class the advert asks for before applying, because it is the one requirement nobody waives.",
    service: CV,
    board: { answers: "listings", query: "driver" },
    phrases: ["driver jobs", "driving vacancies", "delivery jobs in dubai", "logistics jobs"],
    keywords: [["driver", "jobs"], ["driving", "vacancies"]],
    faq: false,
    next: ["board-search", "board-freshers"],
  },

  /* ── The two questions about a listing rather than about the board ─────── */
  {
    id: "board-freshers",
    question: "Which of your listings are open to freshers?",
    answer:
      "None of the current listings are marked as open to someone with no experience, which is a fact about this week's adverts rather than about your chances. The titles worth filtering for are assistant, junior, trainee and graduate, and the evidence that stands in for years is a final-year project, an internship, a certification or anything you have run yourself — which is a CV problem rather than a vacancy problem, and the part we can help with.",
    service: CV,
    board: { answers: "listings" },
    phrases: [
      "which of your listings are open to freshers",
      "do you have any jobs for freshers",
      "any vacancies with no experience needed",
      "do you have entry level vacancies on your board",
      "jobs for fresh graduates on your site",
    ],
    keywords: [["listings", "freshers"], ["vacancies", "experience", "needed"]],
    faq: false,
    next: ["board-search", "job-people-fresher"],
  },
  {
    id: "board-this-job",
    question: "Tell me about this job",
    answer: NOTHING_TODAY,
    service: CV,
    board: { answers: "posting" },
    phrases: [
      "tell me about this job",
      "what does this job pay",
      "is this vacancy still open",
      "is this listing still available",
      "what documents does this job need",
      "how do i apply for this one",
      "what experience does this job want",
      "when does this job close",
    ],
    keywords: [
      ["this", "job", "pay"],
      ["this", "vacancy", "open"],
      ["this", "listing", "still"],
      ["apply", "this", "one"],
    ],
    faq: false,
    next: ["board-search", "job-us-jobs-board"],
  },
];
