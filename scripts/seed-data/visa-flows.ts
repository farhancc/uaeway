/**
 * Every UAE residence-visa question we are prepared to answer, and how they
 * connect.
 *
 * Seed content, in the same spirit as ./notarisation.ts and
 * ./business-setup-flows.ts: this file fills the flow the first time and
 * /admin/flow is where it is edited afterwards. It is written against
 * `AuthoredFlow` so that writing an answer is writing sentences — nodes, edges
 * and intents are `buildAuthoredFlow`'s problem.
 *
 * WHERE THE LINE WITH THE OTHER PACKS RUNS
 *
 * The business setup pack already owns the **employer and owner** side of visas:
 * quota on a licence, sponsoring your own staff, an investor visa through your
 * own company, what happens to staff visas when a licence closes. The
 * attestation pack owns *which documents need attesting* for a visa, and the
 * notarisation pack owns powers of attorney and consents.
 *
 * This pack owns the **applicant's** side: the person whose visa it is. Employee
 * rather than employer, sponsored rather than sponsor, and everything the other
 * three packs stop short of — medical fitness, Emirates ID, status change,
 * renewal, cancellation, overstay, rejections, tracking.
 *
 * That boundary is not cosmetic. All four packs are concatenated before the
 * graph is built, and `matchByPhrase` runs before any embedding and takes the
 * first candidate whose phrase appears in the message. Candidates arrive in
 * concatenation order, so an existing pack wins every phrasing it already
 * claimed. Re-using one of its phrasings here does not produce a conflict that
 * anything reports — it produces an answer of ours that no visitor can reach.
 * tests/visa-flows.test.ts checks that against the real merged set.
 *
 * WHY IT IS SHAPED IN CLUSTERS
 *
 * Two hundred-odd answers all hanging off the start node is an answer bank with
 * extra steps, and it matches badly: the embedding matcher needs the winner to
 * beat the runner-up by `SIMILARITY_MARGIN`, and two hundred near-neighbours
 * rarely give it one — every renewal question looks like every other renewal
 * question.
 *
 * So there are seventeen hubs, one per subject, each offering its cluster as
 * buttons. Someone who taps arrives at an exact node with no matching at all,
 * and someone who types is matched against that hub's handful of local intents
 * rather than against everything. Every answer is also wired from `start`,
 * because someone who types "can I sponsor my wife on my salary" on the home
 * page should get that answer rather than a menu.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind written answers harder than
 * generated ones, because these are published under the company's name with no
 * model in the loop to hedge them. Immigration is the worst subject on the site
 * to be confidently wrong about:
 *
 *   - **No fee, processing time, validity period, grace period, quota, age
 *     limit or salary threshold stated as a fact.** Every one of those has moved
 *     in the last few years, several differ between Dubai's GDRFA and the
 *     federal ICP, and a visitor who acted on a stale one got it from us. Say
 *     what it depends on and who confirms it.
 *   - **No legal advice, and nothing implying we submit or approve anything.**
 *     Visa processing is `delivery: "referred"` in lib/services.ts: we work out
 *     what a file needs and introduce people to a licensed provider or typing
 *     centre. The authority decides, always.
 *   - **No promised outcome.** An application can be refused, and a medical can
 *     come back unfit.
 *
 * The first of those is enforced mechanically in tests/visa-flows.test.ts, by
 * the same `findUnsupportedAmounts` the chatbot's own replies go through plus a
 * ban on bare durations.
 *
 * A money question therefore does not get a number — it gets an honest sentence
 * and `quote: true`, which walks it into the visa qualification and ends at the
 * callback form. Set on the questions nobody can answer in the abstract, not on
 * every question: a conversation that reaches for the contact form after each
 * answer is a conversation people close.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every id here starts with `visa-`. `buildAuthoredFlow` derives node ids as
 *  `n-<id>`, which is what keeps this pack from colliding with `att-`, `not-`
 *  and `biz-` when all four are built as one graph. */
const SERVICE = "visa-processing";

export const VISA_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "visa-hub-basics",
    question: "How does getting a UAE residence visa actually work?",
    answer:
      "A UAE residence visa is permission to live here, and it always comes through a sponsor — an employer, a family member, your own company, or in some cases yourself. The steps are roughly the same whichever route you take: an entry permit, then a medical and biometrics inside the country, then the residence stamped or issued electronically alongside an Emirates ID. Where would you like to start?",
    service: SERVICE,
    phrases: [
      "explain the uae residence visa process to me",
      "i do not understand how residency in the uae works",
      "walk me through getting residency in dubai",
      "residence visa basics for the uae",
    ],
    keywords: [["explain", "residence", "visa"], ["understand", "residency", "uae"]],
    faq: false,
    choices: [
      { label: "What is a residence visa?", to: "visa-what-is-residence-visa" },
      { label: "Who can sponsor me?", to: "visa-who-can-sponsor" },
      { label: "The steps in order", to: "visa-steps-in-order" },
      { label: "Which visa do I need?", to: "visa-hub-which" },
      { label: "What will it cost?", to: "visa-quote-general" },
    ],
    next: ["visa-what-is-residence-visa", "visa-steps-in-order", "visa-hub-which"],
  },
  {
    id: "visa-hub-which",
    question: "Which UAE visa do I need for my situation?",
    answer:
      "There is no single residence visa — the route depends on why you are here and who will sponsor you. Picking the wrong one is the most expensive mistake in this whole process, because a file built for one route usually cannot be moved to another. Which of these sounds like you?",
    service: SERVICE,
    phrases: [
      "what type of residence visa should i apply for",
      "i do not know which visa applies to me",
      "help me choose the right uae visa",
      "which residency route suits me",
    ],
    keywords: [["which", "visa", "need"], ["what", "type", "visa"]],
    faq: false,
    choices: [
      { label: "I have a job offer", to: "visa-hub-employment" },
      { label: "Sponsoring my family", to: "visa-hub-family" },
      { label: "Long-term residence", to: "visa-hub-golden" },
      { label: "Working for myself", to: "visa-hub-green" },
      { label: "I am only visiting", to: "visa-hub-visit" },
    ],
    next: ["visa-hub-employment", "visa-hub-family", "visa-hub-golden"],
  },
  {
    id: "visa-hub-employment",
    question: "I am being hired in the UAE and need my visa sorted",
    answer:
      "On an employment route your employer is the sponsor and most of the filing is theirs to do, but the parts that go wrong are almost always yours: a certificate that is not attested, a name that does not match your passport, or a status that cannot be changed from inside the country. Which part are you working out?",
    service: SERVICE,
    phrases: [
      "my new employer is processing my residence visa",
      "i got a job offer in dubai what happens with the visa",
      "employment visa process for a new employee",
      "what do i have to do for my work visa as the employee",
    ],
    keywords: [["job", "offer", "visa"], ["new", "employer", "visa"]],
    faq: false,
    choices: [
      { label: "The steps for an employee", to: "visa-employment-steps" },
      { label: "Documents I must provide", to: "visa-employment-documents" },
      { label: "Offer letter and contract", to: "visa-offer-vs-contract" },
      { label: "Changing employer", to: "visa-change-employer" },
      { label: "It was refused", to: "visa-employment-refused" },
    ],
    next: ["visa-employment-steps", "visa-employment-documents", "visa-offer-vs-contract"],
  },
  {
    id: "visa-hub-family",
    question: "I want to sponsor my family in the UAE",
    answer:
      "Sponsoring a family member means you become responsible for their residence, and the authority looks at three things: your own status, your accommodation, and documents proving the relationship. That last one catches most people out, because a marriage or birth certificate issued abroad has to be attested and translated before it counts here. Who are you sponsoring?",
    service: SERVICE,
    phrases: [
      "how do i bring my family to dubai on my visa",
      "family sponsorship in the uae explained",
      "i need a residence visa for my dependants",
      "bringing my relatives to live with me in the uae",
    ],
    keywords: [["sponsor", "family", "uae"], ["bring", "family", "dubai"]],
    faq: false,
    choices: [
      { label: "My wife or husband", to: "visa-sponsor-spouse" },
      { label: "My children", to: "visa-sponsor-children" },
      { label: "My parents", to: "visa-sponsor-parents" },
      { label: "Am I eligible to sponsor?", to: "visa-sponsor-eligibility" },
      { label: "Documents I will need", to: "visa-family-documents" },
    ],
    next: ["visa-sponsor-spouse", "visa-sponsor-children", "visa-sponsor-eligibility"],
  },
  {
    id: "visa-hub-golden",
    question: "I am asking about the golden visa and long-term residence",
    answer:
      "Long-term residence is not one thing either — there are several separate categories with their own criteria, and a nomination by an authority is part of some of them. What matters first is which category you might fall into, because the evidence is completely different for each. Which describes you?",
    service: SERVICE,
    phrases: [
      "how do i get a golden visa in the uae",
      "am i eligible for long term residence in the uae",
      "explain the golden visa categories to me",
      "ten year residence visa in dubai",
    ],
    keywords: [["golden", "visa", "eligible"], ["long", "term", "residence"]],
    faq: false,
    choices: [
      { label: "The categories", to: "visa-golden-categories" },
      { label: "Through my salary or job", to: "visa-golden-salary" },
      { label: "Through property", to: "visa-golden-property" },
      { label: "As a specialised talent", to: "visa-golden-talent" },
      { label: "My family under it", to: "visa-golden-family" },
    ],
    next: ["visa-golden-categories", "visa-golden-salary", "visa-golden-property"],
  },
  {
    id: "visa-hub-green",
    question: "Can I get a UAE visa without an employer sponsoring me?",
    answer:
      "Yes, in several ways — the green visa for skilled employees and freelancers, a freelance permit, self-sponsorship routes, and the remote-work permit for people employed outside the country. They are genuinely different things that people use interchangeably, and the one you want depends on where your income comes from. Which fits you?",
    service: SERVICE,
    phrases: [
      "residence visa without a sponsor in the uae",
      "how do i sponsor myself in dubai",
      "self sponsorship options in the uae",
      "i work for myself and need uae residency",
    ],
    keywords: [["without", "employer", "sponsor"], ["sponsor", "myself", "uae"]],
    faq: false,
    choices: [
      { label: "The green visa", to: "visa-green-visa" },
      { label: "Freelancing here", to: "visa-freelance-permit" },
      { label: "Working remotely for a foreign employer", to: "visa-remote-work-visa" },
      { label: "Self-sponsorship", to: "visa-self-sponsorship" },
      { label: "Which one is right?", to: "visa-green-vs-freelance" },
    ],
    next: ["visa-green-visa", "visa-freelance-permit", "visa-remote-work-visa"],
  },
  {
    id: "visa-hub-visit",
    question: "I am asking about visit and tourist entry to the UAE",
    answer:
      "A visit or tourist entry is not residence and does not let you work, but it is where a lot of residence applications start — people arrive on one and change status from inside the country. Whether that is possible in your case depends on your nationality and the route you are switching to. What do you need to know?",
    service: SERVICE,
    phrases: [
      "how does a tourist visa for dubai work",
      "i am coming to the uae as a visitor",
      "visit visa questions for the uae",
      "entry permit for visiting dubai",
    ],
    keywords: [["tourist", "visa", "dubai"], ["visit", "visa", "uae"]],
    faq: false,
    choices: [
      { label: "Visit visa basics", to: "visa-visit-visa-basics" },
      { label: "Can I work on it?", to: "visa-work-on-visit-visa" },
      { label: "Extending it", to: "visa-extend-visit-visa" },
      { label: "Switching to residence", to: "visa-status-change" },
      { label: "Looking for a job here", to: "visa-job-seeker-visa" },
    ],
    next: ["visa-visit-visa-basics", "visa-work-on-visit-visa", "visa-status-change"],
  },
  {
    id: "visa-hub-medical",
    question: "I have questions about the UAE visa medical test",
    answer:
      "The medical fitness test is a required step for almost every residence visa, and it is a screening test rather than a health check-up — it looks for a specific short list of conditions. People worry about it far more than they need to, and worry about the wrong things. What would you like to know?",
    service: SERVICE,
    phrases: [
      "what happens at the medical fitness test in dubai",
      "explain the visa medical screening in the uae",
      "i am nervous about the residence visa medical",
      "medical test for uae residency",
    ],
    keywords: [["medical", "test", "visa"], ["medical", "fitness", "uae"]],
    faq: false,
    choices: [
      { label: "What they test for", to: "visa-medical-what-tested" },
      { label: "Where I go", to: "visa-medical-where" },
      { label: "How long results take", to: "visa-medical-results" },
      { label: "If I am declared unfit", to: "visa-medical-unfit" },
      { label: "Pregnancy and the medical", to: "visa-medical-pregnancy" },
    ],
    next: ["visa-medical-what-tested", "visa-medical-where", "visa-medical-unfit"],
  },
  {
    id: "visa-hub-eid",
    question: "I have questions about my Emirates ID",
    answer:
      "The Emirates ID is the card that proves your residence, and in practice it matters more day to day than the visa itself — banks, clinics, schools and telecoms all ask for it. It is applied for as part of the visa process rather than separately. What do you need?",
    service: SERVICE,
    phrases: [
      "how does the emirates id application work",
      "explain the emirates id to me",
      "emirates id issues and questions",
      "what do i do about my id card in the uae",
    ],
    keywords: [["emirates", "id", "application"], ["emirates", "id", "card"]],
    faq: false,
    choices: [
      { label: "How I get one", to: "visa-eid-how" },
      { label: "Biometrics appointment", to: "visa-eid-biometrics" },
      { label: "Lost or damaged", to: "visa-eid-lost" },
      { label: "Renewing it", to: "visa-eid-renewal" },
      { label: "A mistake on the card", to: "visa-eid-wrong-details" },
    ],
    next: ["visa-eid-how", "visa-eid-biometrics", "visa-eid-lost"],
  },
  {
    id: "visa-hub-docs",
    question: "What documents does a UAE visa application need?",
    answer:
      "The list changes with the route, but the reason applications get held up almost never does: a document that is missing an attestation, a translation that was not done by a licensed translator, or a name spelled differently on two papers. Getting this right before anything is submitted is most of the work. Which part is troubling you?",
    service: SERVICE,
    phrases: [
      "what paperwork do i need for uae residency",
      "list of documents for a residence visa application",
      "which papers do i have to prepare for my visa",
      "document requirements for uae immigration",
    ],
    keywords: [["documents", "visa", "application"], ["paperwork", "uae", "residency"]],
    faq: false,
    choices: [
      { label: "Passport requirements", to: "visa-passport-validity" },
      { label: "The photo", to: "visa-photo-spec" },
      { label: "Attested certificates", to: "visa-attested-certificates" },
      { label: "Translations", to: "visa-translations" },
      { label: "My name does not match", to: "visa-name-mismatch" },
    ],
    next: ["visa-passport-validity", "visa-photo-spec", "visa-attested-certificates"],
  },
  {
    id: "visa-hub-renewal",
    question: "My UAE residence visa needs renewing",
    answer:
      "A renewal is a shorter version of the original process — usually a fresh medical, updated insurance and a new Emirates ID — but it is timing that catches people, because starting late and travelling in the middle are both avoidable problems. What is your situation?",
    service: SERVICE,
    phrases: [
      "how do i renew my residence visa in dubai",
      "residence visa renewal process in the uae",
      "my residency is expiring what do i do",
      "renewing my uae residency",
    ],
    keywords: [["renew", "residence", "visa"], ["residency", "expiring", "renew"]],
    faq: false,
    choices: [
      { label: "When to start", to: "visa-renewal-when" },
      { label: "What is needed", to: "visa-renewal-documents" },
      { label: "It already expired", to: "visa-expired-visa" },
      { label: "Renewing my family's", to: "visa-renew-family" },
      { label: "I am abroad", to: "visa-renew-from-abroad" },
    ],
    next: ["visa-renewal-when", "visa-renewal-documents", "visa-expired-visa"],
  },
  {
    id: "visa-hub-cancel",
    question: "My UAE visa is being cancelled or I am leaving",
    answer:
      "Cancellation is a formal step, not just leaving — an uncancelled residence visa keeps you on the system as a resident, with all the obligations that carries. Doing it in the right order also protects whatever comes next, whether that is a new employer or a final exit. What applies to you?",
    service: SERVICE,
    phrases: [
      "how does residence visa cancellation work in the uae",
      "i am leaving the uae what happens to my visa",
      "visa cancellation process in dubai",
      "what do i do about my residency when i resign",
    ],
    keywords: [["visa", "cancellation", "uae"], ["leaving", "uae", "visa"]],
    faq: false,
    choices: [
      { label: "How cancellation works", to: "visa-cancellation-how" },
      { label: "Grace period after it", to: "visa-grace-period" },
      { label: "Cancelling my family's", to: "visa-cancel-family" },
      { label: "I am already abroad", to: "visa-cancel-from-abroad" },
      { label: "Coming back later", to: "visa-return-after-cancellation" },
    ],
    next: ["visa-cancellation-how", "visa-grace-period", "visa-cancel-family"],
  },
  {
    id: "visa-hub-problems",
    question: "Something has gone wrong with my UAE visa",
    answer:
      "Most visa problems fall into a handful of shapes: a refusal, an overstay, a ban or a case filed against you, or a file that has simply stopped moving. They are handled very differently, and guessing which one you have is how people make it worse. What has happened?",
    service: SERVICE,
    phrases: [
      "i have a problem with my residence visa application",
      "my visa application is in trouble",
      "help with a uae immigration problem",
      "my residency situation has gone wrong",
    ],
    keywords: [["problem", "residence", "visa"], ["gone", "wrong", "visa"]],
    faq: false,
    choices: [
      { label: "It was refused", to: "visa-rejection-reasons" },
      { label: "I have overstayed", to: "visa-overstay" },
      { label: "There may be a ban", to: "visa-ban-types" },
      { label: "An absconding case", to: "visa-absconding" },
      { label: "Nothing is moving", to: "visa-application-stuck" },
    ],
    next: ["visa-rejection-reasons", "visa-overstay", "visa-ban-types"],
  },
  {
    id: "visa-hub-status",
    question: "How do I check what is happening with my visa application?",
    answer:
      "Almost everything is trackable online now, but through two different systems depending on which emirate and which authority is handling your file — and the status words they use are not self-explanatory. What are you trying to find out?",
    service: SERVICE,
    phrases: [
      "where do i track my uae residence visa application",
      "how can i see my visa status online",
      "checking the progress of my residency file",
      "my visa application status in the uae",
    ],
    keywords: [["check", "visa", "status"], ["track", "visa", "application"]],
    faq: false,
    choices: [
      { label: "Where to check", to: "visa-where-to-check-status" },
      { label: "What the statuses mean", to: "visa-status-meanings" },
      { label: "ICP or GDRFA?", to: "visa-icp-vs-gdrfa" },
      { label: "Nothing has changed", to: "visa-application-stuck" },
      { label: "Typing centre or app?", to: "visa-typing-centre" },
    ],
    next: ["visa-where-to-check-status", "visa-status-meanings", "visa-icp-vs-gdrfa"],
  },
  {
    id: "visa-hub-extras",
    question: "What else is mandatory alongside a UAE residence visa?",
    answer:
      "A residence visa rarely comes alone. Health insurance is a legal requirement for residents, there is a separate unemployment insurance scheme for workers, and employees usually have a labour card as well as a visa. Which of these are you asking about?",
    service: SERVICE,
    phrases: [
      "what is compulsory when i get uae residency",
      "other requirements that come with a residence visa",
      "obligations that come with living in the uae legally",
      "what do residents have to have by law in the uae",
    ],
    keywords: [["mandatory", "residence", "visa"], ["compulsory", "uae", "residency"]],
    faq: false,
    choices: [
      { label: "Health insurance", to: "visa-health-insurance" },
      { label: "Unemployment insurance", to: "visa-unemployment-insurance" },
      { label: "Labour card", to: "visa-labour-card" },
      { label: "Emirates ID", to: "visa-hub-eid" },
      { label: "Dubai vs other emirates", to: "visa-emirate-differences" },
    ],
    next: ["visa-health-insurance", "visa-unemployment-insurance", "visa-labour-card"],
  },
  {
    id: "visa-hub-scope",
    question: "What can you actually do for me on visa processing?",
    answer:
      "We work out exactly what your case needs, check what you have against the mismatches that cause most refusals, and connect you with a licensed provider or typing centre who prepares and submits it. The authority decides, and no one outside it can promise you an outcome. What would you like to know about that?",
    service: SERVICE,
    phrases: [
      "do you handle visa applications yourselves",
      "what is your role in the visa process",
      "how do you help with uae visas",
      "are you a visa agency or an immigration lawyer",
    ],
    keywords: [["what", "you", "do", "visa"], ["handle", "visa", "applications"]],
    faq: false,
    choices: [
      { label: "Who submits it", to: "visa-who-submits" },
      { label: "Can you guarantee approval?", to: "visa-no-guarantees" },
      { label: "Legal advice", to: "visa-not-lawyers" },
      { label: "My documents", to: "visa-document-safety" },
      { label: "Outside Dubai", to: "visa-other-emirates" },
    ],
    next: ["visa-who-submits", "visa-no-guarantees", "visa-not-lawyers"],
  },

  /* ── Basics: what residency is and how it is granted ───────────────────── */
  {
    id: "visa-what-is-residence-visa",
    question: "What is a UAE residence visa?",
    answer:
      "It is permission to live in the UAE for a fixed term, granted to you through a sponsor and recorded against your passport and your Emirates ID. It is separate from permission to work: an employee holds a residence visa and a work permit, and only one of those lets you take a job. The term it is granted for depends on the route, so the validity on your file is the only one worth planning around.",
    service: SERVICE,
    phrases: [
      "what does a residence visa actually give me",
      "meaning of residence visa in the uae",
      "is a residence visa the same as a residence permit here",
    ],
    keywords: [["what", "is", "residence", "visa"]],
    next: ["visa-who-can-sponsor", "visa-visa-vs-permit", "visa-steps-in-order"],
  },
  {
    id: "visa-visa-vs-permit",
    question: "What is the difference between a UAE visa, a permit and an Emirates ID?",
    answer:
      "Three separate things that arrive together and get used interchangeably in conversation. The residence visa is permission to live here; a work permit or labour card is permission to work for one named employer; the Emirates ID is the card that proves your status to anyone who asks. They can have different expiry dates, and each has to be kept current on its own.",
    service: SERVICE,
    phrases: [
      "difference between residence visa and emirates id",
      "are the visa and the labour card the same thing",
      "why do i have three different documents for my residency",
    ],
    keywords: [["difference", "visa", "emirates", "id"]],
    next: ["visa-labour-card", "visa-hub-eid", "visa-eid-expiry-vs-visa"],
  },
  {
    id: "visa-who-can-sponsor",
    question: "Who can sponsor my UAE residence visa?",
    answer:
      "An employer, a free zone or mainland company you own, a close family member who already has residence, or in some routes an authority that grants you long-term residence directly. There are also self-sponsored routes where no third party is involved. Who your sponsor is decides which documents are asked for and who has to sign what, so it is the first thing to settle.",
    service: SERVICE,
    phrases: [
      "who is allowed to be my sponsor in the uae",
      "do i need a sponsor for uae residency",
      "what does a sponsor actually do for a residence visa",
    ],
    keywords: [["who", "can", "sponsor"], ["need", "sponsor", "residency"]],
    next: ["visa-hub-employment", "visa-hub-family", "visa-self-sponsorship"],
  },
  {
    id: "visa-steps-in-order",
    question: "What are the steps of a UAE residence visa in order?",
    answer:
      "Broadly: the sponsor gets approval to apply, an entry permit is issued, you enter on it or change your status from inside the country, then you complete the medical fitness test and Emirates ID biometrics, and the residence is issued once those clear. Health insurance has to be in place before the residence is granted. Each step depends on the one before it, which is why a single missing document stops everything rather than delaying one part.",
    service: SERVICE,
    phrases: [
      "what is the order of the residence visa process",
      "what happens first when applying for uae residency",
      "sequence of steps for a dubai residence visa",
    ],
    keywords: [["steps", "residence", "visa", "order"], ["order", "visa", "process"]],
    next: ["visa-entry-permit", "visa-hub-medical", "visa-hub-eid"],
  },
  {
    id: "visa-entry-permit",
    question: "What is an entry permit and why do I need one?",
    answer:
      "An entry permit is the document that lets you enter the country for the purpose your residence will be granted for — it is issued before the residence exists and is what you travel on. If you are already inside the UAE on another status, the equivalent step is a change of status rather than a fresh entry. It is time-limited, and letting it lapse before you complete the medical usually means applying again.",
    service: SERVICE,
    phrases: [
      "what is a uae entry permit for",
      "difference between an entry permit and a residence visa",
      "my employer sent me an entry permit what do i do",
    ],
    keywords: [["what", "is", "entry", "permit"]],
    next: ["visa-status-change", "visa-entry-permit-expired", "visa-steps-in-order"],
  },
  {
    id: "visa-entry-permit-expired",
    question: "My entry permit expired before I used it. What now?",
    answer:
      "An unused entry permit that has lapsed generally cannot be revived — the sponsor applies again, and the earlier one is cancelled or left to close itself. What matters is telling whoever is filing for you straight away rather than travelling on it and being turned back at the airport. If you were already inside the country when it lapsed, get your current status checked before you do anything else.",
    service: SERVICE,
    phrases: [
      "my entry permit expired before i used it",
      "what happens if my uae entry permit lapses",
      "can an expired entry permit be extended",
      "i did not travel in time on my entry permit",
    ],
    keywords: [["entry", "permit", "expired"]],
    next: ["visa-entry-permit", "visa-application-stuck"],
  },
  {
    id: "visa-how-long-valid",
    question: "How long is a UAE residence visa valid for?",
    answer:
      "It varies by route, and the terms have changed more than once — employment, family, green and long-term residence all run for different periods, and some free zones differ from mainland. Rather than plan on a number you read somewhere, read the validity printed on your own file or shown in the ICP or GDRFA app. We can confirm what applies to your route before anything is submitted.",
    service: SERVICE,
    phrases: [
      "what is the validity of a dubai residence visa",
      "how many years does uae residency last",
      "how long will my residence visa be issued for",
    ],
    keywords: [["how", "long", "visa", "valid"], ["validity", "residence", "visa"]],
    next: ["visa-hub-renewal", "visa-golden-categories", "visa-where-to-check-status"],
  },
  {
    id: "visa-file-number",
    question: "What is my visa file number and where do I find it?",
    answer:
      "It is the reference the immigration system holds your record under, usually printed on the residence visa itself and on entry permits, and formatted with the emirate's code at the front. Anyone filing for you will ask for it, and it stays with you across renewals. If you cannot find it, the ICP or GDRFA app will show it against your Emirates ID number.",
    service: SERVICE,
    phrases: [
      "where is the file number on a uae visa",
      "what does the unified number mean on my visa",
      "i need my immigration file number",
    ],
    keywords: [["visa", "file", "number"], ["unified", "number", "visa"]],
    next: ["visa-where-to-check-status", "visa-hub-eid"],
  },
  {
    id: "visa-visa-on-passport-or-digital",
    question: "Is the UAE residence visa still a sticker in the passport?",
    answer:
      "Not everywhere. Residence is increasingly issued electronically, with the Emirates ID as the proof you carry, and several authorities have stopped stamping passports altogether. If an employer, bank or foreign embassy asks you for a stamped page you may need to show them the electronic residence document instead. Which applies to you depends on the emirate and the authority that issued it.",
    service: SERVICE,
    phrases: [
      "do they still stamp the visa in your passport in the uae",
      "my residence visa was issued electronically",
      "i have no visa page in my passport",
    ],
    keywords: [["stamp", "visa", "passport"], ["electronic", "residence", "visa"]],
    next: ["visa-visa-vs-permit", "visa-where-to-check-status"],
  },
  {
    id: "visa-in-country-or-outside",
    question: "Do I have to be in the UAE to apply for residency?",
    answer:
      "The application is normally started by your sponsor while you are outside, and you enter on the entry permit to complete the medical and biometrics — those two steps have to happen inside the country. If you are already here on a visit status, some routes let you change status without leaving and others do not, depending on your nationality and the route. That is worth confirming before you book anything.",
    service: SERVICE,
    phrases: [
      "can my visa be processed while i am outside the country",
      "must i be in dubai for my visa application",
      "can residency be applied for before i arrive",
    ],
    keywords: [["be", "in", "uae", "apply"], ["outside", "country", "visa", "processed"]],
    next: ["visa-status-change", "visa-entry-permit", "visa-hub-medical"],
  },
  {
    id: "visa-multiple-visas",
    question: "Can I hold two UAE residence visas at once?",
    answer:
      "No — the system holds one residence status per person, and a new one requires the previous to be cancelled first. That is why a job change involves cancellation and re-issue rather than simply adding a second visa. Where people appear to have two, one is usually a residence visa and the other a permit of a different kind.",
    service: SERVICE,
    phrases: [
      "is it possible to have two residence visas in the uae",
      "can i be on my employer visa and my family visa together",
      "do i need to cancel one visa before getting another",
    ],
    keywords: [["two", "residence", "visas"], ["hold", "two", "visas"]],
    next: ["visa-change-employer", "visa-cancellation-how", "visa-switch-family-to-employment"],
  },
  {
    id: "visa-switch-family-to-employment",
    question: "Can I move from a family visa to an employment visa?",
    answer:
      "Yes, and it is common — but it is a cancellation and a fresh application rather than a transfer, and the order matters because working on a family visa without your own work permit is a separate problem. Some people keep the family residence and add only a work permit instead; whether that is open to you depends on the employer and the emirate. We can work out which of the two your case fits.",
    service: SERVICE,
    phrases: [
      "switching from my husband's visa to my own employer",
      "i am on my father's visa and got a job offer",
      "changing from dependant to employee status in the uae",
    ],
    keywords: [["family", "visa", "employment", "visa"], ["dependant", "to", "employee"]],
    next: ["visa-work-on-family-visa", "visa-change-employer", "visa-hub-employment"],
  },
  {
    id: "visa-uae-born-child",
    question: "My child was born in the UAE. What do we need to do?",
    answer:
      "A child born here needs a birth certificate, then attestation and often translation of it, then a passport from their own country's mission, and only then can residence be applied for under a parent's sponsorship. There is a window after birth within which the paperwork is expected to be started, and missing it attracts a penalty, so it is worth beginning early. Which stage are you at?",
    service: SERVICE,
    phrases: [
      "residence visa for a baby born in dubai",
      "newborn paperwork in the uae step by step",
      "how do i get my newborn on my visa",
    ],
    keywords: [["child", "born", "uae"], ["newborn", "visa", "dubai"]],
    next: ["visa-sponsor-children", "visa-newborn-deadline", "visa-family-documents"],
  },
  {
    id: "visa-newborn-deadline",
    question: "Is there a deadline to apply for a newborn's UAE visa?",
    answer:
      "Yes — there is a set window from the date of birth, and applications after it attract a fine that accrues until the file is completed. The exact window and the penalty are set by the authority and have changed, so confirm the current one with the issuing authority or with us before assuming you are late. If you are already past it, it is still fixable; it just costs.",
    service: SERVICE,
    phrases: [
      "how long do i have to get my baby's residence visa",
      "penalty for a late newborn visa in the uae",
      "we missed the deadline for our baby's visa",
    ],
    keywords: [["deadline", "newborn", "visa"], ["late", "baby", "visa"]],
    next: ["visa-uae-born-child", "visa-sponsor-children"],
  },

  /* ── Employment route, from the employee's side ────────────────────────── */
  {
    id: "visa-employment-steps",
    question: "What are the steps of a UAE employment visa for the employee?",
    answer:
      "Your employer applies for a work permit and quota approval, you sign the job offer and then the labour contract, an entry permit is issued, you enter or change status, and you complete the medical and Emirates ID biometrics. The residence and the labour card follow once those clear. Your part is the documents and the two appointments — the rest is filed by the employer or their agent.",
    service: SERVICE,
    phrases: [
      "what do i have to do at each stage of my work visa",
      "employment visa steps from the employee point of view",
      "my company is applying for my visa what happens next",
    ],
    keywords: [["steps", "employment", "visa"], ["stages", "work", "visa"]],
    next: ["visa-employment-documents", "visa-offer-vs-contract", "visa-hub-medical"],
  },
  {
    id: "visa-employment-documents",
    question: "What documents do I give my employer for a UAE work visa?",
    answer:
      "Typically your passport, passport photographs to the UAE specification, your attested highest qualification where the job requires one, and your signed offer and contract. Some roles need a professional licence or an equivalency, and some nationalities need extra clearances. Send them clear colour scans early — a rejected photograph or an unattested degree holds the whole file.",
    service: SERVICE,
    phrases: [
      "which papers does my company need from me for the visa",
      "employee documents needed for a dubai work permit",
      "what do i have to submit to hr for my residence visa",
    ],
    keywords: [["documents", "employer", "work", "visa"], ["papers", "company", "needs", "visa"]],
    next: ["visa-attested-certificates", "visa-photo-spec", "visa-degree-required"],
  },
  {
    id: "visa-offer-vs-contract",
    question: "What is the difference between the job offer and the labour contract?",
    answer:
      "The offer is signed first and registered with the labour authority before the work permit is issued; the contract is the version filed at the end and is the one that governs your employment. They are supposed to match, and a difference between them is worth raising before you sign the second, not after. Read both in the language you are comfortable in — an official translation can be requested.",
    service: SERVICE,
    phrases: [
      "why did i sign an offer letter and then a contract",
      "is the mohre offer letter binding in the uae",
      "offer letter versus employment contract in dubai",
    ],
    keywords: [["offer", "letter", "labour", "contract"], ["difference", "offer", "contract"]],
    next: ["visa-contract-mismatch", "visa-contract-language", "visa-employment-steps"],
  },
  {
    id: "visa-contract-mismatch",
    question: "My contract does not match what I was promised. What can I do?",
    answer:
      "Raise it before signing the registered version, because once a contract is filed it is the filed terms that count. Differences in salary, job title, hours or notice are the ones that matter later — a title mismatch can also affect what you are allowed to do and whether you can sponsor family. The labour authority has a complaints channel for disputes, and it is worth taking advice before you sign rather than after.",
    service: SERVICE,
    phrases: [
      "my contract does not match what i was promised",
      "the salary in my contract is different from the offer",
      "my job title was changed in the labour contract",
      "what if the registered contract terms are wrong",
    ],
    keywords: [["contract", "does", "not", "match"], ["salary", "different", "contract"]],
    next: ["visa-offer-vs-contract", "visa-job-title-matters", "visa-not-lawyers"],
  },
  {
    id: "visa-contract-language",
    question: "Can I get my UAE labour contract in my own language?",
    answer:
      "Contracts are registered in Arabic and English, and you are entitled to understand what you sign — if neither works for you, ask for a translation before signing rather than afterwards. A legal translation by a licensed translator is what an authority or a court would accept if it ever mattered. Signing something you cannot read is the single easiest problem in this process to avoid.",
    service: SERVICE,
    phrases: [
      "must the employment contract be in arabic in the uae",
      "i cannot read my labour contract",
      "do i get an english copy of my uae contract",
    ],
    keywords: [["contract", "own", "language"], ["contract", "arabic", "english"]],
    next: ["visa-translations", "visa-offer-vs-contract"],
  },
  {
    id: "visa-job-title-matters",
    question: "Does my job title on the visa matter?",
    answer:
      "More than people expect. The title on your permit is what the system treats you as, and it can affect which family members you may sponsor, whether a professional licence is required and which skill band you fall into. If the title on the paperwork is not the job you are doing, say so early — changing it later is an amendment, not a correction.",
    service: SERVICE,
    phrases: [
      "why is my designation different on my labour card",
      "can i change the profession on my uae work permit",
      "does the title on my visa affect sponsoring family",
    ],
    keywords: [["job", "title", "visa", "matter"], ["profession", "work", "permit"]],
    next: ["visa-sponsor-eligibility", "visa-degree-required", "visa-contract-mismatch"],
  },
  {
    id: "visa-degree-required",
    question: "Do I need a degree for a UAE work visa?",
    answer:
      "It depends on the job, not on the visa. Some professions require a recognised qualification and some require a licence on top of it; many do not require either. Where a degree is required it has to be attested, and for certain professions it also has to be recognised as equivalent by the relevant UAE authority. We can tell you which applies to the title on your offer.",
    service: SERVICE,
    phrases: [
      "is a university certificate compulsory for a dubai job visa",
      "can i work in the uae without a degree",
      "which jobs in the uae require an attested qualification",
    ],
    keywords: [["need", "degree", "work", "visa"], ["work", "without", "degree"]],
    next: ["visa-attested-certificates", "visa-degree-equivalency", "visa-job-title-matters"],
  },
  {
    id: "visa-degree-equivalency",
    question: "What is a certificate equivalency and do I need one?",
    answer:
      "An equivalency is a UAE authority confirming that a qualification earned abroad is comparable to a local one. It is required for some regulated professions and for certain sponsorship categories, and it is a separate step from attestation — a fully attested degree can still need it. Which authority issues it depends on the profession.",
    service: SERVICE,
    phrases: [
      "do i need my degree equated in the uae",
      "equivalency certificate for a foreign degree in dubai",
      "is attestation enough or do i need equivalency too",
    ],
    keywords: [["certificate", "equivalency"], ["degree", "equated", "uae"]],
    next: ["visa-attested-certificates", "visa-degree-required"],
  },
  {
    id: "visa-probation-visa",
    question: "Am I on a residence visa during probation?",
    answer:
      "Yes — the visa and permit are issued for the employment, and probation is a term of the contract rather than a different immigration status. What probation does change is notice, and what happens to your residence if either side ends the job early. If you are considering leaving during probation, check the notice and the cancellation consequences together rather than separately.",
    service: SERVICE,
    phrases: [
      "does my visa start before probation ends in the uae",
      "what happens to my visa if i leave during probation",
      "probation period and residence visa in dubai",
    ],
    keywords: [["visa", "during", "probation"], ["leave", "during", "probation"]],
    next: ["visa-resign-early", "visa-cancellation-how", "visa-ban-types"],
  },
  {
    id: "visa-resign-early",
    question: "What happens to my visa if I resign?",
    answer:
      "Your employer cancels the work permit and the residence visa, and a grace period usually follows during which you can stay and arrange what comes next. Resigning correctly — written notice, served properly — is what keeps the cancellation clean and avoids an absconding report. The length of the grace period and any consequences depend on your contract type and the current rules, so confirm both before you hand anything in.",
    service: SERVICE,
    phrases: [
      "does my residence visa end when i quit my job",
      "i want to resign what happens to my residency",
      "resignation and visa cancellation in the uae",
    ],
    keywords: [["visa", "if", "i", "resign"], ["resign", "residency", "happens"]],
    next: ["visa-grace-period", "visa-change-employer", "visa-cancellation-how"],
  },
  {
    id: "visa-terminated",
    question: "I was terminated. What happens to my residence visa?",
    answer:
      "The employer is required to cancel the permit and the residence, and a grace period normally follows. Termination also raises questions a cancellation does not — final settlement, whether notice was served, and whether the reason recorded affects anything afterwards. Get the cancellation paper and keep it; it is what proves your status changed lawfully.",
    service: SERVICE,
    phrases: [
      "my employer dismissed me and my visa",
      "does being fired cancel my uae residency",
      "termination and residence visa in dubai",
    ],
    keywords: [["terminated", "residence", "visa"], ["fired", "cancel", "residency"]],
    next: ["visa-grace-period", "visa-cancellation-paper", "visa-ban-types"],
  },
  {
    id: "visa-change-employer",
    question: "How do I move my visa to a new employer in the UAE?",
    answer:
      "The old employer cancels your permit and residence, and the new one applies afresh — it is a cancellation and a new application rather than a transfer, even when people call it one. Whether you can stay in the country throughout depends on the timing and on your grace period. Lining up the new offer before the cancellation is what makes this smooth.",
    service: SERVICE,
    phrases: [
      "transferring my residence visa to another company",
      "i am switching jobs in dubai what about my visa",
      "does my new employer have to start my visa from scratch",
    ],
    keywords: [["move", "visa", "new", "employer"], ["transfer", "visa", "another", "company"]],
    next: ["visa-grace-period", "visa-ban-types", "visa-noc-needed"],
  },
  {
    id: "visa-noc-needed",
    question: "Do I need a no-objection certificate to change jobs?",
    answer:
      "Under the current labour law an NOC is not generally required to move between mainland employers, but some free zones and some specific situations still ask for one, and employers sometimes request it regardless. If yours is insisting, that is a labour question rather than an immigration one. Do not assume either way — check what your zone actually requires.",
    service: SERVICE,
    phrases: [
      "is an noc still required to switch employers in the uae",
      "my employer refuses to give me an noc",
      "noc requirement for changing company in dubai",
    ],
    keywords: [["no", "objection", "certificate", "jobs"], ["noc", "change", "employer"]],
    next: ["visa-change-employer", "visa-ban-types", "visa-not-lawyers"],
  },
  {
    id: "visa-employment-refused",
    question: "My employment visa application was refused. What happens now?",
    answer:
      "Refusals on employment files usually trace back to a document — an unattested or mismatched certificate, a photograph outside specification, a name that differs across papers — or to something on your record such as a previous overstay or ban. The refusal reason determines whether it is fixed and refiled or appealed. Ask your employer for what the authority actually said; a refusal without a reason cannot be acted on.",
    service: SERVICE,
    phrases: [
      "my employment visa application was refused",
      "my work visa got rejected in the uae",
      "why would a uae work permit application be refused",
      "the company says my visa was declined",
    ],
    keywords: [["employment", "visa", "refused"], ["work", "visa", "rejected"]],
    next: ["visa-rejection-reasons", "visa-ban-types", "visa-name-mismatch"],
  },
  {
    id: "visa-two-jobs",
    question: "Can I work two jobs in the UAE?",
    answer:
      "There is a part-time permit system that makes a second job possible, but it has to be permitted rather than assumed — working for a second employer without the right permit is a breach whatever your contract says. Which permit applies depends on your existing contract type and both employers. That is worth confirming before you start, not after.",
    service: SERVICE,
    phrases: [
      "is a second job allowed on my uae residence visa",
      "part time work permit while employed full time in dubai",
      "can i freelance on the side of my job here",
    ],
    keywords: [["work", "two", "jobs"], ["second", "job", "residence", "visa"]],
    next: ["visa-freelance-permit", "visa-labour-card", "visa-hub-green"],
  },
  {
    id: "visa-work-remotely-for-foreign-employer",
    question: "Can I keep my overseas job while living in the UAE?",
    answer:
      "There is a remote-work route designed for exactly this, where your employer stays abroad and you hold a UAE permit on the strength of that employment. It is not the same as being employed here, and it does not let you work for UAE clients. Which conditions apply, and what proof of employment and income is asked for, is set by the authority.",
    service: SERVICE,
    phrases: [
      "i work remotely for a company abroad and want to live in dubai",
      "remote employee living in the uae legally",
      "keep my foreign employer and move to the uae",
    ],
    keywords: [["overseas", "job", "living", "uae"], ["remotely", "company", "abroad"]],
    next: ["visa-remote-work-visa", "visa-hub-green", "visa-self-sponsorship"],
  },
  {
    id: "visa-work-on-family-visa",
    question: "Can I work while I am on a family visa?",
    answer:
      "Yes, but not on the residence visa alone — you need a work permit issued for the job, applied for by the employer, while your residence stays under your family sponsor. Working without it is a breach even though you are lawfully resident. Many employers are used to this and some are not, so it is worth raising at the offer stage.",
    service: SERVICE,
    phrases: [
      "do i need a permit to work on my husband's visa",
      "working in dubai as a dependant",
      "can i take a job while sponsored by my father",
    ],
    keywords: [["work", "on", "family", "visa"], ["permit", "work", "dependant"]],
    next: ["visa-switch-family-to-employment", "visa-labour-card", "visa-hub-family"],
  },
  {
    id: "visa-labour-card",
    question: "What is a labour card and do I have one?",
    answer:
      "The labour card, or work permit, is the record that you are permitted to work for one named employer — separate from your residence visa and issued by the labour authority rather than immigration. Most employees have both; free zone employees have the zone's equivalent. It expires on its own schedule, and an expired permit is a problem even if your residence is current.",
    service: SERVICE,
    phrases: [
      "what does a uae work permit record",
      "is the labour card the same as the residence visa",
      "where do i see my work permit details",
    ],
    keywords: [["what", "is", "labour", "card"], ["work", "permit", "record"]],
    next: ["visa-visa-vs-permit", "visa-where-to-check-status", "visa-hub-extras"],
  },
  {
    id: "visa-free-zone-employee",
    question: "Is a free zone employment visa different?",
    answer:
      "The steps look the same but the paperwork goes through the free zone authority rather than the mainland labour ministry, and each zone has its own forms, portal and quirks. The practical differences show up in NOC expectations, medical insurance providers and how quickly a zone processes things. Which zone your employer is in decides all of that.",
    service: SERVICE,
    phrases: [
      "how does a free zone residence visa work for an employee",
      "my employer is in a free zone what changes for my visa",
      "difference between mainland and free zone employment visa",
    ],
    keywords: [["free", "zone", "employment", "visa"], ["free", "zone", "employee", "residence"]],
    next: ["visa-employment-steps", "visa-noc-needed", "visa-emirate-differences"],
  },
  {
    id: "visa-domestic-worker-visa",
    question: "How do I sponsor a domestic worker or nanny?",
    answer:
      "Domestic workers are sponsored under a separate scheme from ordinary employment, with its own channel, its own contract and its own conditions on the sponsor. It is not the same as adding someone to a family visa, and the requirements on accommodation and income are specific. Tell us your situation and we will set out what the current scheme asks for.",
    service: SERVICE,
    phrases: [
      "visa for a maid in the uae",
      "how do i bring a housemaid to dubai legally",
      "sponsoring a driver or nanny on my visa",
    ],
    keywords: [["sponsor", "domestic", "worker"], ["visa", "maid", "uae"]],
    next: ["visa-sponsor-eligibility", "visa-family-documents", "visa-quote-family"],
  },
  {
    id: "visa-student-visa",
    question: "How does a student residence visa in the UAE work?",
    answer:
      "A university or institution sponsors the student's residence, and the file is built around the offer of admission and proof of enrolment, with the same medical and Emirates ID steps as any other route. Outstanding students have separate long-term options. Documents from the previous school or university usually need attestation, which is the part worth starting early.",
    service: SERVICE,
    phrases: [
      "visa for studying at a university in dubai",
      "does my college sponsor my residence visa",
      "student residency requirements in the uae",
    ],
    keywords: [["student", "residence", "visa"], ["visa", "studying", "university"]],
    next: ["visa-attested-certificates", "visa-student-to-work", "visa-golden-students"],
  },
  {
    id: "visa-student-to-work",
    question: "I am graduating here. How do I move to a work visa?",
    answer:
      "The student residence ends with the sponsorship, so moving to employment is a cancellation and a fresh application by the employer, in the usual order. There are also routes intended for graduates and for outstanding students that do not need an employer at all. Which is better depends on whether you have an offer in hand.",
    service: SERVICE,
    phrases: [
      "from student visa to employment visa in the uae",
      "what happens to my student residence when i graduate",
      "staying in dubai after finishing university",
    ],
    keywords: [["student", "visa", "to", "work"], ["graduate", "stay", "uae"]],
    next: ["visa-student-visa", "visa-golden-students", "visa-job-seeker-visa"],
  },
  {
    id: "visa-retirement-visa",
    question: "Is there a retirement visa for the UAE?",
    answer:
      "Yes — there is a retirement route for older applicants who meet criteria based on savings, income or property, and Dubai has run its own version alongside the federal one. The thresholds and the qualifying age are set by the authority and have been adjusted, so they need confirming rather than quoting. Tell us your circumstances and we will check which version fits.",
    service: SERVICE,
    phrases: [
      "can i retire in dubai on a residence visa",
      "retirement residency options in the uae",
      "visa for retired people in dubai",
    ],
    keywords: [["retirement", "visa", "uae"], ["retire", "in", "dubai"]],
    next: ["visa-golden-categories", "visa-self-sponsorship", "visa-quote-general"],
  },
  {
    id: "visa-job-seeker-visa",
    question: "Can I come to the UAE to look for a job?",
    answer:
      "There is a job-exploration entry route for people who want to come and search without an employer sponsoring them, aimed at graduates and at certain skill levels. It is an entry permit rather than residence, and it does not let you start work — an employer still has to file a permit once you have an offer. Eligibility is set by category, so it is worth checking yours before booking.",
    service: SERVICE,
    phrases: [
      "is there a job seeker visa for dubai",
      "job exploration entry permit in the uae",
      "coming to dubai to find work without a sponsor",
    ],
    keywords: [["come", "look", "for", "job"], ["job", "seeker", "visa"]],
    next: ["visa-visit-visa-basics", "visa-work-on-visit-visa", "visa-hub-employment"],
  },
  {
    id: "visa-salary-certificate",
    question: "What is a salary certificate and when will I need one?",
    answer:
      "A letter from your employer stating your position and salary, issued on company letterhead and often stamped. It comes up when you sponsor family, apply for some long-term routes, or deal with banks and landlords. Some authorities want it in a particular format or accompanied by a labour contract copy, so ask what the recipient expects before you request it.",
    service: SERVICE,
    phrases: [
      "do i need a salary letter from my employer for a visa",
      "salary certificate for family sponsorship in the uae",
      "how do i prove my income for a uae visa",
    ],
    keywords: [["salary", "certificate", "need"], ["prove", "income", "visa"]],
    next: ["visa-sponsor-eligibility", "visa-family-documents", "visa-golden-salary"],
  },
  {
    id: "visa-bank-statement",
    question: "Will they ask for my bank statements?",
    answer:
      "For some routes yes — sponsorship, long-term residence and self-sponsored options can all involve proving income or savings, usually with stamped statements over a set recent period. What is accepted differs by route and by authority, and a statement printed from an app without a bank stamp is often refused. Ask before you gather them so you gather the right ones.",
    service: SERVICE,
    phrases: [
      "do i need bank statements for a uae residence visa",
      "proof of savings for a dubai visa application",
      "how many months of statements does immigration want",
    ],
    keywords: [["bank", "statements", "visa"], ["proof", "savings", "visa"]],
    next: ["visa-salary-certificate", "visa-golden-categories", "visa-self-sponsorship"],
  },

  /* ── Family sponsorship ────────────────────────────────────────────────── */
  {
    id: "visa-sponsor-eligibility",
    question: "Am I eligible to sponsor my family in the UAE?",
    answer:
      "It turns on your own residence status, your income, your job title and your accommodation — and every one of those thresholds is set by the authority and has been revised, so a figure you read on a forum is not one to rely on. Certain professions are treated differently, and a tenancy contract in your name is normally expected. Tell us your title, your emirate and who you want to sponsor, and we will check what currently applies.",
    service: SERVICE,
    phrases: [
      "what are the requirements to sponsor a dependant here",
      "can i sponsor family on my job title",
      "do i earn enough to sponsor my family in dubai",
    ],
    keywords: [["eligible", "sponsor", "family"], ["requirements", "sponsor", "dependant"]],
    next: ["visa-sponsor-spouse", "visa-sponsor-children", "visa-family-documents"],
  },
  {
    id: "visa-sponsor-spouse",
    question: "How do I sponsor my wife or husband in the UAE?",
    answer:
      "You apply as the sponsor with your own residence and income documents, plus a marriage certificate that has been attested in the country it was issued and legalised for use here, and translated if it is not in Arabic or English. Your spouse then completes an entry permit or status change, the medical and Emirates ID. The marriage certificate is the step that delays most of these files, so start it first.",
    service: SERVICE,
    phrases: [
      "steps to bring my spouse to dubai on my visa",
      "spouse residence visa application in the uae",
      "i want my wife to live with me in dubai",
    ],
    keywords: [["sponsor", "wife", "husband"], ["spouse", "residence", "visa"]],
    next: ["visa-family-documents", "visa-marriage-certificate", "visa-sponsor-eligibility"],
  },
  {
    id: "visa-marriage-certificate",
    question: "What has to be done to my marriage certificate?",
    answer:
      "It generally needs attesting in the country that issued it, legalising through the UAE mission there and then through the Ministry of Foreign Affairs here, and a legal translation into Arabic if it is in another language. A certificate that was only notarised at home is usually not enough. We check the chain for your issuing country before anything is submitted, and a licensed provider carries out the steps.",
    service: SERVICE,
    phrases: [
      "does my marriage certificate need legalising for a spouse visa",
      "marriage certificate requirements for uae family sponsorship",
      "my marriage certificate is in another language",
    ],
    keywords: [["marriage", "certificate", "legalising"], ["marriage", "certificate", "requirements"]],
    next: ["visa-translations", "visa-sponsor-spouse", "visa-family-documents"],
  },
  {
    id: "visa-sponsor-children",
    question: "How do I sponsor my children in the UAE?",
    answer:
      "You need each child's birth certificate, attested and legalised for use here and translated where required, alongside your own status and income documents. Age matters for sons in a way it does not for daughters, and the current age limits and the exceptions to them are set by the authority. Tell us their ages and we will tell you which route each child falls under.",
    service: SERVICE,
    phrases: [
      "residence visa for my kids in dubai",
      "bringing my son and daughter to live in the uae",
      "child residence visa application under a parent",
    ],
    keywords: [["sponsor", "children", "uae"], ["residence", "visa", "kids"]],
    next: ["visa-son-age-limit", "visa-family-documents", "visa-uae-born-child"],
  },
  {
    id: "visa-son-age-limit",
    question: "Until what age can I keep my son on my visa?",
    answer:
      "There is an age at which a son can no longer be sponsored as a dependant, with exceptions for students in full-time education and for children with disabilities. The threshold and the exceptions have both changed, so this is one to confirm against the current rule rather than a number someone quotes. When a son ages out, the usual next step is a student route or his own employment.",
    service: SERVICE,
    phrases: [
      "age limit for sponsoring a son in the uae",
      "my son is too old for my family visa",
      "can i sponsor my adult son in dubai",
    ],
    keywords: [["age", "limit", "sponsoring", "son"], ["son", "too", "old", "visa"]],
    next: ["visa-student-visa", "visa-sponsor-children", "visa-daughter-sponsorship"],
  },
  {
    id: "visa-daughter-sponsorship",
    question: "Can I sponsor my unmarried daughter at any age?",
    answer:
      "Unmarried daughters are treated differently from sons and can generally be sponsored without the same age cut-off, but the authority still asks for proof of status and the rules are not identical across emirates. Marriage changes it. Confirm the current position for your emirate before you plan around it.",
    service: SERVICE,
    phrases: [
      "is there an age limit for daughters on a family visa",
      "sponsoring my adult daughter in the uae",
      "does my daughter have to leave my visa when she turns eighteen",
    ],
    keywords: [["unmarried", "daughter", "sponsor"], ["age", "limit", "daughters"]],
    next: ["visa-son-age-limit", "visa-sponsor-children"],
  },
  {
    id: "visa-sponsor-parents",
    question: "Can I sponsor my parents in the UAE?",
    answer:
      "It is possible but it is the hardest family route — the income expected is higher than for a spouse or child, a deposit is often required per parent, and the authority generally expects both parents to be sponsored together rather than one alone. Medical insurance for them is a separate and significant requirement. Tell us your situation and we will set out what is currently asked.",
    service: SERVICE,
    phrases: [
      "bringing my mother and father to live in dubai",
      "parent residence visa requirements in the uae",
      "i want to sponsor my mother only",
    ],
    keywords: [["sponsor", "parents", "uae"], ["parent", "residence", "visa"]],
    next: ["visa-parents-one-only", "visa-sponsor-eligibility", "visa-health-insurance"],
  },
  {
    id: "visa-parents-one-only",
    question: "Can I sponsor only one parent?",
    answer:
      "The default expectation is both together, and sponsoring one alone is treated as an exception needing a reason the authority accepts — widowhood or divorce being the usual ones, with documents to prove it. It is decided case by case rather than by a rule you can read off. If that is your situation, the evidence you can produce is what the application turns on.",
    service: SERVICE,
    phrases: [
      "my father has passed away can i sponsor my mother",
      "sponsoring a single parent in the uae",
      "do both parents have to come together on a visa",
    ],
    keywords: [["sponsor", "only", "one", "parent"], ["both", "parents", "together"]],
    next: ["visa-sponsor-parents", "visa-family-documents"],
  },
  {
    id: "visa-woman-sponsoring",
    question: "Can a woman sponsor her husband or children in the UAE?",
    answer:
      "Yes. A working woman can sponsor her family, and the general conditions are the same as for any sponsor — status, income, title and accommodation — though certain professions have historically been treated more readily than others and practice varies by emirate. If you have been told you cannot, it is worth having your specific case checked rather than accepting it.",
    service: SERVICE,
    phrases: [
      "can a wife sponsor her family in dubai",
      "am i allowed to sponsor my husband as a female resident",
      "female sponsor requirements in the uae",
    ],
    keywords: [["woman", "sponsor", "husband"], ["wife", "sponsor", "family"]],
    next: ["visa-sponsor-eligibility", "visa-sponsor-spouse", "visa-sponsor-children"],
  },
  {
    id: "visa-family-documents",
    question: "What documents do I need to sponsor a family member?",
    answer:
      "Your passport and Emirates ID, your labour contract or salary certificate, a tenancy contract registered in your name, and the attested relationship document — a marriage certificate for a spouse, a birth certificate for a child. Everything issued abroad needs the attestation chain completed and a legal translation where it is not in Arabic or English. The exact list varies by emirate and by who you are sponsoring.",
    service: SERVICE,
    phrases: [
      "family visa document checklist for the uae",
      "papers required for dependant sponsorship in dubai",
      "what does immigration want from the sponsor",
    ],
    keywords: [["documents", "sponsor", "family", "member"], ["family", "visa", "checklist"]],
    next: ["visa-tenancy-contract", "visa-marriage-certificate", "visa-salary-certificate"],
  },
  {
    id: "visa-tenancy-contract",
    question: "Do I need a tenancy contract to sponsor my family?",
    answer:
      "Normally yes — a registered tenancy in the sponsor's name, and in Dubai that means an Ejari. The property is expected to be suitable for a family rather than shared or bed-space accommodation, and a contract in someone else's name usually will not do. If you live in employer-provided housing, a letter from the employer is sometimes accepted instead.",
    service: SERVICE,
    phrases: [
      "is ejari required for a family visa in dubai",
      "accommodation requirement for family sponsorship",
      "i live in company accommodation can i still sponsor",
    ],
    keywords: [["tenancy", "contract", "sponsor", "family"], ["accommodation", "requirement", "sponsorship"]],
    next: ["visa-family-documents", "visa-sponsor-eligibility", "visa-sharing-accommodation"],
  },
  {
    id: "visa-sharing-accommodation",
    question: "I share a flat. Can I still sponsor my family?",
    answer:
      "Shared or partitioned accommodation is generally not accepted for family sponsorship, because the authority is checking that the family has somewhere suitable to live. What counts as suitable is assessed on the tenancy and the property, not on a declaration. If your housing is the obstacle, that is worth solving before the application rather than during it.",
    service: SERVICE,
    phrases: [
      "can i get a family visa living in shared accommodation",
      "is bed space accepted for family sponsorship in dubai",
      "partitioned villa and family visa",
    ],
    keywords: [["share", "flat", "sponsor", "family"], ["shared", "accommodation", "family", "visa"]],
    next: ["visa-tenancy-contract", "visa-sponsor-eligibility"],
  },
  {
    id: "visa-sponsor-sibling",
    question: "Can I sponsor my brother or sister?",
    answer:
      "Siblings are not an ordinary sponsorship category, and where it happens at all it is an exception requiring the authority's approval on specific grounds — usually a sibling who has no other guardian. It is not something to plan around. For an adult sibling the realistic routes are their own employment, a study route, or one of the self-sponsored options.",
    service: SERVICE,
    phrases: [
      "sibling residence visa in the uae",
      "is it possible to bring my brother to dubai on my visa",
      "sponsoring a sister in the uae",
    ],
    keywords: [["sponsor", "brother", "sister"], ["sibling", "residence", "visa"]],
    next: ["visa-hub-green", "visa-student-visa", "visa-sponsor-eligibility"],
  },
  {
    id: "visa-stepchild",
    question: "Can I sponsor a stepchild or an adopted child?",
    answer:
      "Both are possible but neither is routine — a stepchild normally needs a no-objection from the biological parent, attested and translated, and an adoption needs the adoption order legalised for use here. Custody documents are frequently asked for. These files turn almost entirely on paperwork, so getting the chain right first is the whole job.",
    service: SERVICE,
    phrases: [
      "residence visa for my step son in the uae",
      "adopted child family visa in dubai",
      "do i need the other parent's consent to sponsor my child",
    ],
    keywords: [["sponsor", "stepchild", "adopted"], ["step", "child", "residence", "visa"]],
    next: ["visa-custody-documents", "visa-family-documents", "visa-sponsor-children"],
  },
  {
    id: "visa-custody-documents",
    question: "I am divorced. What do I need to sponsor my child?",
    answer:
      "A custody order or the other parent's no-objection, attested in the issuing country and translated, on top of the ordinary birth certificate and sponsor documents. Without one of those the application generally will not proceed, because the authority is being asked to move a child's residence. Which of the two is accepted depends on the country the order came from.",
    service: SERVICE,
    phrases: [
      "custody documents for a uae child visa",
      "single parent sponsoring a child in dubai",
      "do i need a court order to bring my child to the uae",
    ],
    keywords: [["divorced", "sponsor", "child"], ["custody", "documents", "child", "visa"]],
    next: ["visa-stepchild", "visa-family-documents", "visa-sponsor-children"],
  },
  {
    id: "visa-dependant-divorce",
    question: "What happens to my visa if I divorce my sponsor?",
    answer:
      "A dependant's residence rests on the relationship, so a divorce ends the basis for it and a grace period normally follows in which to arrange something else — your own employment, a different sponsor, or departure. It is worth starting that before the cancellation rather than after. There are also provisions for a mother retaining custody, which are assessed case by case.",
    service: SERVICE,
    phrases: [
      "divorce and my dependant residence visa in the uae",
      "i am separating from my husband and i am on his visa",
      "can i stay in dubai after a divorce",
    ],
    keywords: [["divorce", "dependant", "visa"], ["divorce", "sponsor", "residence"]],
    next: ["visa-grace-period", "visa-switch-family-to-employment", "visa-not-lawyers"],
  },
  {
    id: "visa-sponsor-died",
    question: "My sponsor has died. What happens to my residence?",
    answer:
      "The residence that rested on that sponsorship ends, and there is normally a period allowed to regularise your status — a widow or widower and their children may be able to stay on specific provisions rather than having to leave immediately. This is a case where getting proper advice quickly matters, because the clock starts on the death rather than on you finding out what to do.",
    service: SERVICE,
    phrases: [
      "death of the sponsor and the family visa in the uae",
      "my husband passed away and i am on his visa",
      "can a widow stay in dubai on her own",
    ],
    keywords: [["sponsor", "died", "residence"], ["death", "sponsor", "family", "visa"]],
    next: ["visa-grace-period", "visa-hub-green", "visa-not-lawyers"],
  },
  {
    id: "visa-dependant-outside-country",
    question: "My family is abroad. Can I apply for their visa before they come?",
    answer:
      "Yes — that is the normal way round. You apply as sponsor, an entry permit is issued, and they travel on it and complete the medical and Emirates ID after arriving. The permit is time-limited, so book travel only once it is issued rather than in anticipation of it.",
    service: SERVICE,
    phrases: [
      "applying for a dependant visa while they are overseas",
      "can i get my wife's visa ready before she flies",
      "family entry permit before arrival in the uae",
    ],
    keywords: [["family", "abroad", "apply", "visa"], ["dependant", "visa", "overseas"]],
    next: ["visa-entry-permit", "visa-sponsor-spouse", "visa-family-documents"],
  },
  {
    id: "visa-dependant-medical",
    question: "Do my dependants need the medical test too?",
    answer:
      "Adults and older children do; young children are generally exempt, and the cut-off age is set by the authority. The test is the same screening as for any other applicant and has to be done inside the country. Where a child is exempt, the Emirates ID biometrics step usually still applies.",
    service: SERVICE,
    phrases: [
      "does my wife have to do the visa medical in dubai",
      "are children exempt from the uae medical fitness test",
      "medical test for family visa applicants",
    ],
    keywords: [["dependants", "medical", "test"], ["children", "exempt", "medical"]],
    next: ["visa-hub-medical", "visa-medical-what-tested", "visa-eid-children"],
  },
  {
    id: "visa-dependant-insurance",
    question: "Do I have to insure my dependants?",
    answer:
      "Yes — health insurance is a condition of residence, and the sponsor is responsible for the dependants' cover. In Dubai and Abu Dhabi the minimum required plans are set by the local health authority, and a policy that does not meet the local standard will not be accepted even if it exists. Parents are usually the most expensive to cover, which surprises people planning a sponsorship.",
    service: SERVICE,
    phrases: [
      "is health cover compulsory for family visa holders",
      "insurance requirement for sponsoring my wife and kids",
      "does my family need medical insurance for their residence visa",
    ],
    keywords: [["insure", "dependants"], ["health", "cover", "family", "visa"]],
    next: ["visa-health-insurance", "visa-sponsor-parents", "visa-hub-extras"],
  },
  {
    id: "visa-renew-family",
    question: "How do I renew my family's residence visas?",
    answer:
      "Each dependant renews alongside or after the sponsor, and your own residence has to be valid for the renewal to be granted — which is why a sponsor renewing late holds up the whole household. A fresh medical for adults, current insurance and a valid tenancy are the usual requirements. Renewing everyone together is generally simpler than staggering them.",
    service: SERVICE,
    phrases: [
      "renewing my wife and children's visas in the uae",
      "dependant visa renewal process in dubai",
      "do the family visas renew with mine",
    ],
    keywords: [["renew", "family", "residence", "visas"], ["dependant", "visa", "renewal"]],
    next: ["visa-renewal-when", "visa-renewal-documents", "visa-hub-renewal"],
  },
  {
    id: "visa-cancel-family",
    question: "How do I cancel my family's visas?",
    answer:
      "The sponsor cancels each dependant, and it has to be done before the sponsor's own residence is cancelled — doing it the other way round leaves dependants attached to a sponsorship that no longer exists. Keep the cancellation papers for each person. If they are leaving the country, the timing of the cancellation and the flight should be planned together.",
    service: SERVICE,
    phrases: [
      "cancelling a dependant visa in the uae",
      "my wife is going home do i cancel her residence",
      "order of cancellation for sponsor and dependants",
    ],
    keywords: [["cancel", "family", "visas"], ["cancelling", "dependant", "visa"]],
    next: ["visa-cancellation-how", "visa-grace-period", "visa-cancellation-paper"],
  },
  {
    id: "visa-dependant-travel",
    question: "Can my dependants travel while their visa is being processed?",
    answer:
      "Leaving mid-process is the most common way a family file gets derailed — a status change in progress, or a medical not yet completed, can be invalidated by an exit. Once the residence is issued, travel is normal. Ask whoever is filing whether the current stage permits travel before anyone books.",
    service: SERVICE,
    phrases: [
      "can my wife leave the country during her visa application",
      "travelling in the middle of a family visa process",
      "will leaving the uae cancel my child's pending visa",
    ],
    keywords: [["dependants", "travel", "visa", "processed"], ["leave", "during", "visa", "application"]],
    next: ["visa-travel-during-processing", "visa-status-change", "visa-hub-status"],
  },

  /* ── Long-term residence ───────────────────────────────────────────────── */
  {
    id: "visa-golden-categories",
    question: "What are the golden visa categories?",
    answer:
      "Broadly: investors, entrepreneurs, people with specialised talent such as doctors, scientists and creatives, outstanding students and graduates, and certain professionals meeting salary and qualification conditions. Frontline workers and humanitarian pioneers have their own categories. Each has its own evidence and some require nomination by a UAE authority, so the category you apply under decides the whole file.",
    service: SERVICE,
    phrases: [
      "which categories qualify for a golden visa",
      "list of golden visa eligibility groups in the uae",
      "what kinds of people get long term residence here",
    ],
    keywords: [["golden", "visa", "categories"], ["categories", "qualify", "golden"]],
    next: ["visa-golden-salary", "visa-golden-property", "visa-golden-talent"],
  },
  {
    id: "visa-golden-salary",
    question: "Can I get a golden visa through my salary or profession?",
    answer:
      "There is a category for specialised professionals that looks at your salary, your qualification and your job classification together — all three, not salary alone. The thresholds are set by the authority and have been revised, so they need confirming for the month you apply in rather than quoted from an article. Send us your title, your qualification and your emirate and we will check the current position.",
    service: SERVICE,
    phrases: [
      "golden visa for skilled professionals in the uae",
      "does my job qualify me for long term residence",
      "salary requirement for a professional golden visa",
    ],
    keywords: [["golden", "visa", "salary"], ["golden", "visa", "professionals"]],
    next: ["visa-golden-categories", "visa-golden-nomination", "visa-salary-certificate"],
  },
  {
    id: "visa-golden-property",
    question: "Can I get long-term residence by buying property?",
    answer:
      "Property ownership is one of the investor routes, subject to a minimum value, the property being of a qualifying type and completed status, and the title deed being in your name. Mortgaged and off-plan properties are treated differently. The current threshold and what counts as qualifying are set by the authority, so confirm before committing to a purchase on that basis.",
    service: SERVICE,
    phrases: [
      "does buying a flat in dubai give me residency",
      "property investor visa requirements in the uae",
      "golden visa through real estate ownership",
    ],
    keywords: [["long", "term", "residence", "property"], ["property", "investor", "visa"]],
    next: ["visa-golden-categories", "visa-golden-mortgage", "visa-quote-golden"],
  },
  {
    id: "visa-golden-mortgage",
    question: "Does a mortgaged property still count for residence?",
    answer:
      "Sometimes — a mortgaged property can qualify where enough of the value has been paid and the lender provides a letter confirming it, but the conditions are specific and have changed. Off-plan property is generally treated differently again. Have the specific property assessed rather than assuming, because the decision rests on the title deed and the lender's letter.",
    service: SERVICE,
    phrases: [
      "can i get a property visa if i have a mortgage",
      "off plan property and uae residency",
      "is a bank letter needed for a property investor visa",
    ],
    keywords: [["mortgaged", "property", "residence"], ["off", "plan", "property", "residency"]],
    next: ["visa-golden-property", "visa-golden-categories"],
  },
  {
    id: "visa-golden-talent",
    question: "How does the specialised talent golden visa work?",
    answer:
      "It covers doctors, scientists, engineers, creatives, athletes and other fields, and it almost always involves a nomination or endorsement from the relevant UAE authority rather than a purely document-based application. What counts as evidence differs sharply by field — publications, a licence, awards, a portfolio. The nomination is the hard part and no one outside the authority controls it.",
    service: SERVICE,
    phrases: [
      "golden visa for doctors and scientists in the uae",
      "can an artist get long term residence in dubai",
      "talent category residence visa requirements",
    ],
    keywords: [["specialised", "talent", "golden", "visa"], ["golden", "visa", "doctors"]],
    next: ["visa-golden-nomination", "visa-golden-categories", "visa-no-guarantees"],
  },
  {
    id: "visa-golden-nomination",
    question: "What does nomination for a golden visa mean?",
    answer:
      "For several categories an application is not something you simply file — a UAE authority has to nominate or endorse you, and only then does the residence application proceed. That means the substantive decision is made before any paperwork step you control. Anyone promising to secure a nomination for you is promising something they cannot deliver.",
    service: SERVICE,
    phrases: [
      "who nominates you for long term residence in the uae",
      "can someone get me a golden visa nomination",
      "do i need to be endorsed for a golden visa",
    ],
    keywords: [["nomination", "golden", "visa"], ["nominates", "long", "term", "residence"]],
    next: ["visa-no-guarantees", "visa-golden-talent", "visa-golden-categories"],
  },
  {
    id: "visa-golden-students",
    question: "Can an outstanding student get long-term residence?",
    answer:
      "There are categories for high-achieving school leavers and for university graduates, assessed on grades and on the standing of the institution, and a student's family can sometimes be included. The criteria are specific and are administered through the education authorities. If you are close to graduating, this is worth checking before you accept an employment route by default.",
    service: SERVICE,
    phrases: [
      "golden visa for top students in the uae",
      "does a high gpa qualify for residency in dubai",
      "graduate long term residence category",
    ],
    keywords: [["outstanding", "student", "long", "term"], ["golden", "visa", "students"]],
    next: ["visa-student-to-work", "visa-golden-categories", "visa-student-visa"],
  },
  {
    id: "visa-golden-family",
    question: "Can I include my family on my golden visa?",
    answer:
      "Yes — spouse and children are generally included, and the terms are more generous than ordinary sponsorship, including for sons who would otherwise age out. Domestic staff can often be sponsored too. The dependants' residence is normally tied to the holder's, so it is issued for a matching term rather than independently.",
    service: SERVICE,
    phrases: [
      "does long term residence cover my wife and children",
      "family members under a golden visa in the uae",
      "are dependants included in the ten year visa",
    ],
    keywords: [["include", "family", "golden", "visa"], ["long", "term", "residence", "cover"]],
    next: ["visa-golden-categories", "visa-sponsor-children", "visa-golden-renewal"],
  },
  {
    id: "visa-golden-renewal",
    question: "Does a golden visa need renewing?",
    answer:
      "Yes — it is long-term, not permanent, and it renews at the end of its term with the qualifying condition still having to hold. Losing the basis for it, such as selling the property it rested on, can affect the renewal even before the term ends. Emirates ID and insurance still have to be kept current throughout.",
    service: SERVICE,
    phrases: [
      "what happens at the end of a ten year residence visa",
      "is long term residence permanent in the uae",
      "can a golden visa be revoked",
    ],
    keywords: [["golden", "visa", "renewing"], ["long", "term", "residence", "permanent"]],
    next: ["visa-hub-renewal", "visa-golden-categories", "visa-golden-family"],
  },
  {
    id: "visa-golden-no-employer",
    question: "Does a golden visa mean I do not need an employer?",
    answer:
      "It means your residence does not depend on one — you are not sponsored by a company and you do not lose your status when a job ends. It does not by itself mean you may work for anyone: taking employment still involves the employer's permit, and working for yourself still involves a licence or permit for the activity. The residence and the right to work remain two things.",
    service: SERVICE,
    phrases: [
      "can i work for anyone on a golden visa",
      "am i free to change jobs on long term residence",
      "is a golden visa holder self sponsored",
    ],
    keywords: [["golden", "visa", "employer"], ["work", "anyone", "golden", "visa"]],
    next: ["visa-visa-vs-permit", "visa-freelance-permit", "visa-golden-categories"],
  },

  /* ── Self-sponsored and independent routes ─────────────────────────────── */
  {
    id: "visa-green-visa",
    question: "What is the green visa and who is it for?",
    answer:
      "A residence route that does not need an employer as sponsor, aimed at skilled employees, freelancers and self-employed people, and at investors and partners. It generally runs longer than an ordinary employment visa and gives more generous family sponsorship. Each sub-category has its own conditions on qualification, income and permit.",
    service: SERVICE,
    phrases: [
      "green residence visa eligibility in the uae",
      "how is a green visa different from an employment visa",
      "who qualifies for the green visa in dubai",
    ],
    keywords: [["what", "is", "green", "visa"], ["green", "residence", "visa"]],
    next: ["visa-green-vs-freelance", "visa-freelance-permit", "visa-self-sponsorship"],
  },
  {
    id: "visa-freelance-permit",
    question: "How do I get a freelance permit in the UAE?",
    answer:
      "A freelance permit is issued by a free zone or an authority and licenses you to work for yourself in a defined activity; it is not itself a residence visa, though several issuers package the two together. Which issuer suits you depends on your activity and whether you already hold residence. The permit and the residence are separate approvals even when bought as one product.",
    service: SERVICE,
    phrases: [
      "freelance licence and residency in dubai",
      "can i work as a freelancer legally in the uae",
      "what does a freelance permit allow me to do",
    ],
    keywords: [["freelance", "permit", "uae"], ["freelancer", "legally", "uae"]],
    next: ["visa-green-vs-freelance", "visa-green-visa", "visa-quote-freelance"],
  },
  {
    id: "visa-green-vs-freelance",
    question: "Green visa, freelance permit or remote-work permit — which do I need?",
    answer:
      "The deciding question is where your income comes from. Clients in the UAE point to a freelance permit, usually with a green visa on top; an employer abroad points to the remote-work route; a UAE employer points to an ordinary employment visa. People buy the wrong one because the products are marketed as interchangeable and they are not.",
    service: SERVICE,
    phrases: [
      "difference between a green visa and a freelance permit",
      "should i get a freelance permit or a remote work visa",
      "which self employed route suits me in the uae",
    ],
    keywords: [["green", "visa", "freelance", "permit"], ["freelance", "or", "remote", "work"]],
    next: ["visa-freelance-permit", "visa-remote-work-visa", "visa-green-visa"],
  },
  {
    id: "visa-remote-work-visa",
    question: "How does the UAE remote-work visa work?",
    answer:
      "It lets you live here while remaining employed by a company outside the country, on proof of that employment and of income, with your own health cover. It is not a work permit for the UAE market — taking local clients or a local job is a different permission. The income and documentation conditions are set by the authority.",
    service: SERVICE,
    phrases: [
      "virtual working programme in dubai explained",
      "digital nomad residence in the uae",
      "conditions for the remote work residence permit",
    ],
    keywords: [["remote", "work", "visa"], ["virtual", "working", "programme"]],
    next: ["visa-work-remotely-for-foreign-employer", "visa-green-vs-freelance", "visa-quote-freelance"],
  },
  {
    id: "visa-self-sponsorship",
    question: "What does self-sponsorship actually mean in the UAE?",
    answer:
      "It is shorthand for any route where your residence does not depend on an employer or a relative — long-term residence, a green visa, a freelance route, or residence through a company you own. There is no single product called a self-sponsored visa, which is why the term causes confusion when an agent uses it. Which underlying route you are being sold is the thing to pin down.",
    service: SERVICE,
    phrases: [
      "is there a self sponsored visa in dubai",
      "how can i be my own sponsor for residency",
      "residency that does not depend on an employer",
    ],
    keywords: [["self", "sponsorship", "mean"], ["own", "sponsor", "residency"]],
    next: ["visa-green-visa", "visa-golden-categories", "visa-hub-green"],
  },
  {
    id: "visa-freelance-family",
    question: "Can I sponsor my family on a freelance or green visa?",
    answer:
      "Generally yes, and the green visa was designed with more generous family terms than an ordinary employment visa. The sponsor conditions still apply — income, accommodation and the attested relationship documents — and income is assessed differently when it is freelance rather than salaried. What proof is accepted for irregular income is the part to check early.",
    service: SERVICE,
    phrases: [
      "family sponsorship as a self employed resident",
      "can freelancers bring dependants to the uae",
      "proving freelance income to sponsor my wife",
    ],
    keywords: [["sponsor", "family", "green", "visa"], ["freelancers", "bring", "dependants"]],
    next: ["visa-sponsor-eligibility", "visa-green-visa", "visa-bank-statement"],
  },
  {
    id: "visa-investor-partner-visa",
    question: "Can I get residence as an investor or partner in a company?",
    answer:
      "Yes — being a shareholder or partner in a UAE company is a recognised route, and it is different from being that company's employee. The share value, the licence and the company's standing all matter. The company side of that is business setup work; the residence side is ours, and they have to line up.",
    service: SERVICE,
    phrases: [
      "partner residence visa through a uae company",
      "shareholder visa requirements in the uae",
      "residency for a company partner in dubai",
    ],
    keywords: [["investor", "partner", "residence"], ["shareholder", "visa", "requirements"]],
    next: ["visa-self-sponsorship", "visa-golden-categories", "visa-quote-general"],
  },

  /* ── Visit, tourist and status change ──────────────────────────────────── */
  {
    id: "visa-visit-visa-basics",
    question: "How does a UAE visit or tourist visa work?",
    answer:
      "It is a short-term entry permit for tourism or visiting family, sponsored by a relative, a hotel, an airline or an approved agent, or applied for directly depending on your nationality. Some nationalities get entry on arrival instead. It is not residence, it carries no right to work, and it has a fixed period with a defined consequence for staying past it.",
    service: SERVICE,
    phrases: [
      "what is a tourist entry permit for the uae",
      "who can sponsor a visit visa to dubai",
      "how do i get a visitor visa for the uae",
    ],
    keywords: [["visit", "tourist", "visa", "work"], ["visitor", "visa", "uae"]],
    next: ["visa-visa-on-arrival", "visa-extend-visit-visa", "visa-work-on-visit-visa"],
  },
  {
    id: "visa-visa-on-arrival",
    question: "Does my nationality get a UAE visa on arrival?",
    answer:
      "Many nationalities do, some get a pre-approved entry on certain conditions, and others must apply in advance — and the list is revised, including for holders of residence or valid visas from certain other countries. Check the current position for your passport with the airline or the ICP before travelling rather than relying on an old list. Arriving without the right permission means being refused boarding or entry.",
    service: SERVICE,
    phrases: [
      "which passports get visa on arrival in dubai",
      "do i need a visa in advance for the uae",
      "am i allowed to enter the uae without applying first",
    ],
    keywords: [["nationality", "visa", "on", "arrival"], ["passports", "visa", "on", "arrival"]],
    next: ["visa-visit-visa-basics", "visa-hub-visit"],
  },
  {
    id: "visa-work-on-visit-visa",
    question: "Can I work on a UAE visit visa?",
    answer:
      "No. A visit or tourist entry carries no right to work, paid or unpaid, and working on one is a breach with consequences for both you and whoever engaged you. Employers who ask you to start before your permit is issued are asking you to take a risk they are not taking. If you have an offer, the route is a permit and a status change, not starting early.",
    service: SERVICE,
    phrases: [
      "is it legal to start a job on a tourist visa in dubai",
      "my employer wants me to start before my permit is ready",
      "working while on a visitor entry permit",
    ],
    keywords: [["work", "on", "visit", "visa"], ["start", "job", "tourist", "visa"]],
    next: ["visa-status-change", "visa-hub-employment", "visa-overstay"],
  },
  {
    id: "visa-extend-visit-visa",
    question: "Can I extend a UAE visit visa?",
    answer:
      "Some visit permits can be extended from inside the country without leaving, and some cannot — it depends on the type issued and how it was sponsored. Where extension is not available, people exit and re-enter, which has its own limits and is scrutinised if repeated. Check the type on your own permit before assuming either is open to you.",
    service: SERVICE,
    phrases: [
      "how do i extend my tourist visa in dubai",
      "is a visa run still possible in the uae",
      "extending a visitor permit without leaving the country",
    ],
    keywords: [["extend", "visit", "visa"], ["extend", "tourist", "visa"]],
    next: ["visa-overstay", "visa-status-change", "visa-visit-visa-basics"],
  },
  {
    id: "visa-status-change",
    question: "What is a change of status and do I need to leave the country?",
    answer:
      "A change of status converts the permission you are already inside the country on into the one your residence will be granted under, without an exit. Whether it is available depends on your nationality, the status you hold and the route you are moving to; where it is not, you exit and re-enter on the new entry permit instead. Either way it is a step someone files for you, with a fee and a window.",
    service: SERVICE,
    phrases: [
      "can i switch to a residence visa without exiting the uae",
      "in country status adjustment in dubai",
      "do i have to fly out to activate my new visa",
    ],
    keywords: [["change", "of", "status"], ["without", "exiting", "uae"]],
    next: ["visa-entry-permit", "visa-travel-during-processing", "visa-hub-employment"],
  },
  {
    id: "visa-travel-during-processing",
    question: "Can I travel while my residence visa is being processed?",
    answer:
      "It depends entirely on the stage. Before an entry permit is used, or in the middle of a status change, an exit can invalidate what has been done and mean starting again; after the residence is issued, travel is ordinary. Ask whoever is filing for you which stage you are at before booking, and get it in writing if a trip is unavoidable.",
    service: SERVICE,
    phrases: [
      "is it safe to fly during my visa application",
      "will leaving the uae cancel my pending application",
      "can i go home in the middle of my visa process",
    ],
    keywords: [["travel", "while", "visa", "processed"], ["fly", "during", "visa", "application"]],
    next: ["visa-status-change", "visa-application-stuck", "visa-hub-status"],
  },
  {
    id: "visa-overstay",
    question: "I have overstayed in the UAE. What happens?",
    answer:
      "Overstaying attracts a daily fine that accrues from the day the permission ended, and it has to be settled before you can leave or regularise your status. A long overstay can also lead to a ban. The fines are set by the authority and change, so the amount is confirmed against your own record rather than estimated — and it is cheaper to deal with today than next week.",
    service: SERVICE,
    phrases: [
      "overstay penalty for a visa in dubai",
      "what are the consequences of overstaying my visa here",
      "i stayed past my grace period in the uae",
    ],
    keywords: [["overstayed", "uae"], ["overstay", "penalty", "visa"]],
    next: ["visa-overstay-fine-paid-by", "visa-ban-types", "visa-grace-period"],
  },
  {
    id: "visa-overstay-fine-paid-by",
    question: "Who pays an overstay fine, me or my employer?",
    answer:
      "It depends on why the overstay happened. Where an employer failed to renew or cancel on time, the liability is usually theirs; where the person stayed past a grace period by choice, it is theirs. The authority collects from whoever presents themselves, so in practice it often gets paid first and argued afterwards. Keep the paperwork that shows when your status actually ended.",
    service: SERVICE,
    phrases: [
      "is my company liable for my overstay penalty",
      "my employer did not renew my visa on time",
      "who is responsible when a visa lapses in the uae",
    ],
    keywords: [["pays", "overstay", "fine"], ["employer", "liable", "overstay"]],
    next: ["visa-overstay", "visa-expired-visa", "visa-not-lawyers"],
  },
  {
    id: "visa-exit-reentry",
    question: "Do I need permission to re-enter the UAE as a resident?",
    answer:
      "A valid residence visa is normally what you re-enter on, but staying outside the country beyond the permitted absence can invalidate it, and the permitted period differs for ordinary residence and for long-term routes. If you have been away a long time, check your status before you fly rather than at the gate. There are provisions for people who were stuck abroad, assessed case by case.",
    service: SERVICE,
    phrases: [
      "how long can i stay outside the uae on a residence visa",
      "does my residency lapse if i am away too long",
      "returning to dubai after a long time abroad",
    ],
    keywords: [["re", "enter", "uae", "resident"], ["stay", "outside", "residence", "visa"]],
    next: ["visa-expired-visa", "visa-hub-renewal", "visa-return-after-cancellation"],
  },

  /* ── The medical fitness test ──────────────────────────────────────────── */
  {
    id: "visa-medical-what-tested",
    question: "What does the UAE visa medical test check for?",
    answer:
      "It is a screening rather than a general check-up: a blood test and a chest X-ray, looking for a short list of communicable conditions that the authority screens residents for. It is not a fitness assessment and it does not test for things unrelated to that list. Which conditions are screened, and what happens if one is found, is set by health regulation.",
    service: SERVICE,
    phrases: [
      "which diseases are screened in the dubai visa medical",
      "is the residence medical a blood test and x ray",
      "what are they looking for in the visa medical",
    ],
    keywords: [["medical", "test", "check", "for"], ["diseases", "screened", "medical"]],
    next: ["visa-medical-where", "visa-medical-results", "visa-medical-unfit"],
  },
  {
    id: "visa-medical-where",
    question: "Where do I do the visa medical test?",
    answer:
      "At an approved government health centre or an authorised private centre in the emirate handling your file, with your passport, entry permit or Emirates ID application and a photograph. Several centres offer a faster processing option. Your employer or the typing centre usually books it; if you are arranging it yourself, use an approved centre — a result from anywhere else is not accepted.",
    service: SERVICE,
    phrases: [
      "which centres are approved for the dubai visa medical",
      "do i need an appointment for the residence medical",
      "can i do my visa medical at any clinic",
    ],
    keywords: [["where", "visa", "medical", "test"], ["approved", "centres", "medical"]],
    next: ["visa-medical-results", "visa-medical-what-tested", "visa-typing-centre"],
  },
  {
    id: "visa-medical-results",
    question: "How long do visa medical results take?",
    answer:
      "Standard processing runs to a few working days and most centres offer express and premium options that are faster, at a higher fee. The result goes to the authority electronically rather than to you, so your employer or agent usually knows before you do. If the file is urgent, ask for the faster tier at the time of booking — it cannot be applied retrospectively.",
    service: SERVICE,
    phrases: [
      "when will my medical fitness result come out",
      "is there an express option for the visa medical",
      "how quickly can i get my medical test result in dubai",
    ],
    keywords: [["medical", "results", "take"], ["medical", "fitness", "result"]],
    next: ["visa-medical-where", "visa-medical-unfit", "visa-hub-status"],
  },
  {
    id: "visa-medical-unfit",
    question: "What happens if I am declared medically unfit?",
    answer:
      "An unfit result means the residence application cannot proceed on that basis, and for some conditions it means departure; for others treatment or a further test resolves it, and some conditions are handled differently for people already resident here. The result is a health authority decision and is communicated confidentially. If this has happened, get proper advice quickly rather than reapplying blind.",
    service: SERVICE,
    phrases: [
      "i failed the uae visa medical test",
      "unfit result on my residence medical in dubai",
      "can i appeal a medical fitness decision here",
    ],
    keywords: [["declared", "medically", "unfit"], ["failed", "visa", "medical"]],
    next: ["visa-medical-retest", "visa-medical-confidentiality", "visa-not-lawyers"],
  },
  {
    id: "visa-medical-retest",
    question: "Can I retake the visa medical test?",
    answer:
      "Where a result was inconclusive or a sample needs repeating, a retest is normal and the centre will tell you. Where a specific condition was found, a retest does not change it — what follows is a clinical process rather than another screening. Do not pay a third party who claims they can change a result; that is not something anyone can do.",
    service: SERVICE,
    phrases: [
      "my medical result was inconclusive what now",
      "do i have to repeat my blood test for the visa",
      "second medical test for uae residency",
    ],
    keywords: [["retake", "visa", "medical"], ["repeat", "blood", "test", "visa"]],
    next: ["visa-medical-unfit", "visa-medical-results"],
  },
  {
    id: "visa-medical-pregnancy",
    question: "I am pregnant. Does that affect the visa medical?",
    answer:
      "Tell the centre before the X-ray — that is the part that matters, and they have a protocol for it, usually a shielded or deferred X-ray with a declaration. Pregnancy itself is not a bar to residence. Do not go through the X-ray without telling them in order to avoid a delay.",
    service: SERVICE,
    phrases: [
      "can i do the chest x ray while pregnant in dubai",
      "pregnancy and the uae residence medical test",
      "is the visa medical safe during pregnancy",
    ],
    keywords: [["pregnant", "visa", "medical"], ["x", "ray", "while", "pregnant"]],
    next: ["visa-medical-what-tested", "visa-medical-where"],
  },
  {
    id: "visa-medical-old-tb",
    question: "I have an old TB scar on my X-ray. Is that a problem?",
    answer:
      "A healed or treated finding on an X-ray is not automatically a refusal — it is often assessed further, and there are provisions for people who are treated and not infectious, including conditional arrangements for residents. Bring any medical records and treatment history you have, because that is what the assessment turns on. This is decided by the health authority, not by whoever files your papers.",
    service: SERVICE,
    phrases: [
      "healed tuberculosis and a uae residence visa",
      "will a past lung infection fail my visa medical",
      "my chest x ray showed a shadow from an old illness",
    ],
    keywords: [["tb", "scar", "x", "ray"], ["healed", "tuberculosis", "visa"]],
    next: ["visa-medical-unfit", "visa-medical-confidentiality", "visa-medical-what-tested"],
  },
  {
    id: "visa-medical-confidentiality",
    question: "Will my employer see my medical results?",
    answer:
      "The result the authority acts on is fit or unfit; the clinical detail behind it is confidential health information and is not routinely shared with an employer. What an employer learns is whether the file can proceed. If you are worried about a specific condition, raise it with the health centre rather than with HR.",
    service: SERVICE,
    phrases: [
      "is the uae visa medical confidential",
      "does my company find out what the medical found",
      "who can access my visa medical report",
    ],
    keywords: [["employer", "see", "medical", "results"], ["visa", "medical", "confidential"]],
    next: ["visa-medical-unfit", "visa-document-safety"],
  },
  {
    id: "visa-medical-renewal",
    question: "Do I need a new medical test to renew my visa?",
    answer:
      "Usually yes — a fresh screening is part of most renewals, with some exemptions by category and by emirate. It is the same screening as the first time. Where a renewal is running close to the expiry, the medical is the step most likely to be the bottleneck, so book it early.",
    service: SERVICE,
    phrases: [
      "is the medical repeated at residence visa renewal",
      "medical fitness test for renewing residency in dubai",
      "do i have to do the blood test again on renewal",
    ],
    keywords: [["new", "medical", "renew", "visa"], ["medical", "repeated", "renewal"]],
    next: ["visa-renewal-documents", "visa-renewal-when", "visa-hub-medical"],
  },

  /* ── Emirates ID ───────────────────────────────────────────────────────── */
  {
    id: "visa-eid-how",
    question: "How do I get an Emirates ID?",
    answer:
      "You do not apply for it separately — it is applied for as part of the residence process, and you attend a biometrics appointment where fingerprints and a photograph are taken. The card is produced afterwards and delivered or collected. The application, not the card, is what proves your status in the meantime.",
    service: SERVICE,
    phrases: [
      "emirates id application steps in the uae",
      "do i apply for the id card separately from my visa",
      "when in the process do i get my emirates id",
    ],
    keywords: [["how", "get", "emirates", "id"], ["emirates", "id", "application", "steps"]],
    next: ["visa-eid-biometrics", "visa-eid-delivery", "visa-eid-expiry-vs-visa"],
  },
  {
    id: "visa-eid-biometrics",
    question: "What happens at the Emirates ID biometrics appointment?",
    answer:
      "Fingerprints, a photograph and a signature, at an authorised centre, with your passport and the application form or reference. It takes minutes when the appointment is booked and much longer when it is not. Children below a certain age are handled differently, and the threshold is set by the authority.",
    service: SERVICE,
    phrases: [
      "do i need to give fingerprints for my emirates id",
      "emirates id typing and biometrics centre visit",
      "what do i take to my id card appointment",
    ],
    keywords: [["emirates", "id", "biometrics", "appointment"], ["fingerprints", "emirates", "id"]],
    next: ["visa-eid-how", "visa-eid-children", "visa-typing-centre"],
  },
  {
    id: "visa-eid-delivery",
    question: "When will my Emirates ID card arrive?",
    answer:
      "The card is printed after the residence is issued and the biometrics are complete, and is delivered by courier to the address on the application or held for collection. Delays are usually an address problem rather than a processing one. You can check the status online with the application number, and travel and most transactions are possible before the physical card arrives.",
    service: SERVICE,
    phrases: [
      "where is my emirates id delivery",
      "how do i track my id card in the uae",
      "my emirates id has not been delivered yet",
    ],
    keywords: [["emirates", "id", "card", "arrive"], ["emirates", "id", "delivery"]],
    next: ["visa-where-to-check-status", "visa-eid-how", "visa-eid-lost"],
  },
  {
    id: "visa-eid-lost",
    question: "I lost my Emirates ID. What do I do?",
    answer:
      "Report it and apply for a replacement — it is a defined process with its own fee, and a lost card should be reported rather than simply replaced quietly, because it is an identity document. You will need your details and usually a police report in some circumstances. Living without one is awkward: banks, clinics and telecoms all ask for it.",
    service: SERVICE,
    phrases: [
      "how do i replace a lost id card in the uae",
      "my emirates id was stolen",
      "damaged emirates id replacement in dubai",
    ],
    keywords: [["lost", "emirates", "id"], ["replace", "lost", "id", "card"]],
    next: ["visa-eid-how", "visa-eid-renewal", "visa-eid-wrong-details"],
  },
  {
    id: "visa-eid-renewal",
    question: "How do I renew my Emirates ID?",
    answer:
      "It renews with your residence in most cases, and there is a window after expiry within which renewing is expected before a fine starts. Renewing it is not automatic just because your visa was renewed, so check the card's own expiry rather than assuming. The fine for a late renewal accrues, so the date on the card is worth a calendar reminder.",
    service: SERVICE,
    phrases: [
      "emirates id renewal process and deadline",
      "my id card has expired but my visa is valid",
      "is there a fine for a late emirates id renewal",
    ],
    keywords: [["renew", "emirates", "id"], ["emirates", "id", "renewal", "deadline"]],
    next: ["visa-eid-expiry-vs-visa", "visa-hub-renewal", "visa-eid-lost"],
  },
  {
    id: "visa-eid-expiry-vs-visa",
    question: "My Emirates ID and my visa expire on different dates. Is that normal?",
    answer:
      "It happens, and it means each has to be tracked on its own — an expired card with a valid residence is still a problem, and a valid card does not extend an expired residence. They are issued by processes that can fall out of step, particularly after a renewal or a change of employer. Check both in the ICP or GDRFA app rather than relying on one.",
    service: SERVICE,
    phrases: [
      "my emirates id and my visa expire on different dates",
      "why is my id card expiry different from my residence",
      "does the emirates id expire with the visa",
      "id card valid but residence expired in the uae",
    ],
    keywords: [["emirates", "id", "visa", "different", "dates"], ["id", "card", "expiry", "different"]],
    next: ["visa-eid-renewal", "visa-expired-visa", "visa-where-to-check-status"],
  },
  {
    id: "visa-eid-wrong-details",
    question: "There is a mistake on my Emirates ID. How is it fixed?",
    answer:
      "Report it and apply for a correction — a wrong name spelling, date of birth or nationality on an identity card causes problems everywhere it is used, and it gets worse the longer it stands. Bring the passport that shows the correct detail, because the card is supposed to match it. Where the error came from the original application, the correction is straightforward; where it came from the passport, fix that first.",
    service: SERVICE,
    phrases: [
      "my name is spelled wrong on my id card",
      "wrong date of birth on my emirates id",
      "how do i correct details on my uae id card",
    ],
    keywords: [["mistake", "emirates", "id"], ["name", "spelled", "wrong", "id"]],
    next: ["visa-name-mismatch", "visa-eid-lost", "visa-eid-how"],
  },
  {
    id: "visa-eid-children",
    question: "Do children need an Emirates ID?",
    answer:
      "Yes — every resident including a newborn is issued one, though very young children are exempt from the fingerprint part of biometrics. Schools, clinics and travel all ask for it. It renews with the child's residence, so it follows the sponsor's renewal cycle.",
    service: SERVICE,
    phrases: [
      "emirates id for a baby in the uae",
      "does my newborn get an id card",
      "at what age do kids give fingerprints for the emirates id",
    ],
    keywords: [["children", "need", "emirates", "id"], ["emirates", "id", "baby"]],
    next: ["visa-uae-born-child", "visa-eid-biometrics", "visa-sponsor-children"],
  },

  /* ── Documents, photographs and names ──────────────────────────────────── */
  {
    id: "visa-passport-validity",
    question: "What passport validity is needed for a UAE visa?",
    answer:
      "A minimum remaining validity is required and it differs by route and authority, with long-term routes generally expecting more than short ones. If yours is close, renew it first — a residence issued against a passport that then expires has to be transferred to the new one anyway. Confirm the current minimum for your route before you file.",
    service: SERVICE,
    phrases: [
      "minimum passport validity for dubai residency",
      "my passport expires soon can i still apply for a visa",
      "does my passport have to be valid for a certain period",
    ],
    keywords: [["passport", "validity", "visa"], ["minimum", "passport", "validity"]],
    next: ["visa-new-passport", "visa-hub-docs", "visa-name-mismatch"],
  },
  {
    id: "visa-new-passport",
    question: "I got a new passport. Do I have to update my visa?",
    answer:
      "Yes — the residence and the Emirates ID record are tied to a passport number, so a new passport means transferring the residence details onto it. Travelling without doing that causes problems at immigration even though your residence is valid. Take both passports when it is done, because the old one carries the record.",
    service: SERVICE,
    phrases: [
      "transferring my residence visa to a new passport",
      "my old passport has my visa and it is full",
      "renewed passport and uae residency records",
    ],
    keywords: [["new", "passport", "update", "visa"], ["transfer", "residence", "new", "passport"]],
    next: ["visa-passport-validity", "visa-eid-wrong-details", "visa-hub-docs"],
  },
  {
    id: "visa-photo-spec",
    question: "What are the photo requirements for a UAE visa?",
    answer:
      "A recent colour photograph against a white background, head and shoulders, full face, with specific size and framing rules, and a religious head covering is acceptable while the face stays visible. Glasses, shadows, a coloured background and a cropped holiday snap are all common rejections. Get them taken at a photo studio that does UAE specification rather than printing your own.",
    service: SERVICE,
    phrases: [
      "what size photograph does dubai immigration want",
      "white background photo for a residence visa application",
      "my visa photo was rejected",
    ],
    keywords: [["photo", "requirements", "visa"], ["photograph", "size", "immigration"]],
    next: ["visa-hub-docs", "visa-employment-documents", "visa-rejection-reasons"],
  },
  {
    id: "visa-attested-certificates",
    question: "Which of my documents have to be attested before my visa is filed?",
    answer:
      "It depends on the route: qualifications where the profession requires one, marriage certificates for spouse sponsorship, birth certificates for children, and custody or adoption orders where they apply. Attestation is a chain — the issuing country, the UAE mission there, then the ministry here — and a document that skipped a link is refused. We work out which of your documents need it, and a licensed provider carries the steps out.",
    service: SERVICE,
    phrases: [
      "why is my certificate not accepted by uae immigration",
      "do i need my qualification legalised for uae residency",
      "which papers need legalising for a residence application",
    ],
    keywords: [["documents", "attested", "visa", "filed"], ["certificate", "not", "accepted", "immigration"]],
    next: ["visa-translations", "visa-degree-equivalency", "visa-hub-docs"],
  },
  {
    id: "visa-translations",
    question: "Do my documents need translating into Arabic?",
    answer:
      "Anything not in Arabic or English usually does, and it has to be done by a translator licensed in the UAE — a translation from home, however good, is generally not accepted, and neither is your own. The translation is normally attached to the legalised original rather than replacing it. Which documents need it depends on the route and the authority.",
    service: SERVICE,
    phrases: [
      "does immigration accept a translation done abroad",
      "who is allowed to translate documents for a uae visa",
      "legal translation requirement for a residence application",
    ],
    keywords: [["documents", "translating", "arabic"], ["translation", "done", "abroad"]],
    next: ["visa-attested-certificates", "visa-hub-docs", "visa-marriage-certificate"],
  },
  {
    id: "visa-name-mismatch",
    question: "Immigration says my name does not match. How is that fixed?",
    answer:
      "A name that reads differently across your passport, certificates and application is one of the most common causes of a stalled file, and it is fixed by making the documents agree rather than by explaining the difference. Usually that means an affidavit or a corrected document, and sometimes a notarised declaration. Which is accepted depends on which document is wrong, so it is worth identifying that first.",
    service: SERVICE,
    phrases: [
      "the spelling of my name differs between my passport and my certificates",
      "my visa file is stuck because of my name",
      "different name order on my documents in the uae",
    ],
    keywords: [["name", "does", "not", "match"], ["spelling", "name", "differs"]],
    next: ["visa-single-name", "visa-eid-wrong-details", "visa-rejection-reasons"],
  },
  {
    id: "visa-single-name",
    question: "My passport has only one name. Is that a problem?",
    answer:
      "It can be, because several UAE systems expect a first and a family name and some routes and countries are stricter than others. It is usually worked around rather than blocked, but it is worth flagging at the start rather than discovering it mid-application. Where a country's mission can issue a supporting document, that is often the cleanest fix.",
    service: SERVICE,
    phrases: [
      "single name on my passport and uae visa",
      "i have no surname on my passport",
      "mononym passport and dubai immigration",
    ],
    keywords: [["only", "one", "name", "passport"], ["no", "surname", "passport"]],
    next: ["visa-name-mismatch", "visa-hub-docs"],
  },
  {
    id: "visa-missing-documents",
    question: "I cannot get one of the documents they are asking for. What now?",
    answer:
      "Say so early, because there is often an alternative — a replacement issued by the original authority, a declaration, or a different document that satisfies the same requirement. What does not work is submitting without it and hoping, which turns into a refusal on the record. Tell us which document and why, and we will tell you whether a substitute exists.",
    service: SERVICE,
    phrases: [
      "i cannot get one of the documents they are asking for",
      "what if a required paper is impossible to obtain",
      "my original certificate is lost and i need it for my visa",
      "alternatives when a document cannot be produced",
    ],
    keywords: [["cannot", "get", "documents", "asking"], ["required", "paper", "impossible"]],
    next: ["visa-attested-certificates", "visa-rejection-reasons", "visa-hub-scope"],
  },
  {
    id: "visa-document-originals",
    question: "Do I have to hand over my original documents?",
    answer:
      "Some steps need originals sighted or submitted, and others take certified copies — attestation in particular involves the original leaving your hands for a period. Get a receipt for anything you hand over, and never give originals to someone who cannot tell you where they are going. We tell you which of your documents actually need to travel and which do not.",
    service: SERVICE,
    phrases: [
      "will immigration keep my original certificates",
      "is it safe to give my originals to an agent",
      "do they need the original or a copy for my visa",
    ],
    keywords: [["hand", "over", "original", "documents"], ["keep", "original", "certificates"]],
    next: ["visa-document-safety", "visa-attested-certificates", "visa-hub-scope"],
  },

  /* ── Renewal ───────────────────────────────────────────────────────────── */
  {
    id: "visa-renewal-when",
    question: "When should I start renewing my residence visa?",
    answer:
      "Before it expires, with enough room for a medical, insurance and the Emirates ID to complete — the process has several steps and each can slip. There is a period after expiry in which renewal is still possible before fines begin, but planning to use it is planning to pay. If you have travel booked, renew before you go rather than after you return.",
    service: SERVICE,
    phrases: [
      "how early can i renew my uae residency",
      "how long before expiry should i begin my visa renewal",
      "best time to start a residence visa renewal in dubai",
    ],
    keywords: [["when", "start", "renewing", "residence"], ["how", "early", "renew", "residency"]],
    next: ["visa-renewal-documents", "visa-expired-visa", "visa-medical-renewal"],
  },
  {
    id: "visa-renewal-documents",
    question: "What is needed to renew a UAE residence visa?",
    answer:
      "Typically your passport with sufficient remaining validity, a fresh medical fitness test for adults, current health insurance meeting the local standard, an updated Emirates ID application, and for family sponsorship a valid tenancy. Employment renewals also involve the labour permit being renewed. The exact list depends on the route and the emirate.",
    service: SERVICE,
    phrases: [
      "renewal checklist for dubai residency",
      "which documents are required for a visa renewal here",
      "do i need new insurance to renew my residence",
    ],
    keywords: [["needed", "renew", "residence", "visa"], ["renewal", "checklist", "residency"]],
    next: ["visa-medical-renewal", "visa-health-insurance", "visa-renewal-when"],
  },
  {
    id: "visa-expired-visa",
    question: "My residence visa has already expired. What do I do?",
    answer:
      "Act now rather than later, because a fine accrues daily once any grace period ends and it does not stop on its own. Whether you renew, cancel or regularise depends on why it lapsed and what your sponsor has done. Get your current record checked first — people are sometimes further into an overstay than they realise, and sometimes not in one at all.",
    service: SERVICE,
    phrases: [
      "my uae residency lapsed and i am still here",
      "what happens when a residence visa expires in dubai",
      "i did not renew my visa in time",
    ],
    keywords: [["residence", "visa", "already", "expired"], ["residency", "lapsed", "still", "here"]],
    next: ["visa-overstay", "visa-renewal-when", "visa-overstay-fine-paid-by"],
  },
  {
    id: "visa-renew-from-abroad",
    question: "Can I renew my residence visa while I am outside the UAE?",
    answer:
      "The medical and the Emirates ID steps have to be done inside the country, so a renewal generally needs you here for part of it. Staying outside too long has its own effect on the residence, which can turn a renewal into a fresh application. If you are abroad and your visa is near expiry, get your status checked before you book.",
    service: SERVICE,
    phrases: [
      "renewing dubai residency from my home country",
      "i am abroad and my residence visa is about to expire",
      "does renewal require me to be in the country",
    ],
    keywords: [["renew", "visa", "outside", "uae"], ["renewing", "residency", "from", "abroad"]],
    next: ["visa-exit-reentry", "visa-renewal-when", "visa-expired-visa"],
  },
  {
    id: "visa-renewal-after-job-change",
    question: "I changed jobs. Does my visa renew or restart?",
    answer:
      "It restarts — a new employer means a new permit and a new residence rather than a renewal of the old one, even if the timing makes it feel continuous. That matters for the validity you end up with and for anything counting continuous residence. The old visa has to be cancelled before the new one is issued.",
    service: SERVICE,
    phrases: [
      "is a new employer visa a renewal or a new application",
      "does my residence period carry over to a new company",
      "continuity of residence when changing employer in the uae",
    ],
    keywords: [["changed", "jobs", "visa", "renew"], ["new", "employer", "renewal", "application"]],
    next: ["visa-change-employer", "visa-multiple-visas", "visa-cancellation-how"],
  },

  /* ── Cancellation and leaving ──────────────────────────────────────────── */
  {
    id: "visa-cancellation-how",
    question: "How does UAE residence visa cancellation work?",
    answer:
      "The sponsor files the cancellation, the work permit and the residence are closed on the system, and a cancellation document is issued. Dependants are cancelled before the sponsor. It is not complete because you left the country or because your employer said it was done — ask for the paper and check your status yourself.",
    service: SERVICE,
    phrases: [
      "what are the steps to cancel a residence visa",
      "who files the visa cancellation in dubai",
      "how do i know my residence has actually been cancelled",
    ],
    keywords: [["residence", "visa", "cancellation", "work"], ["steps", "cancel", "residence", "visa"]],
    next: ["visa-cancellation-paper", "visa-grace-period", "visa-cancel-family"],
  },
  {
    id: "visa-cancellation-paper",
    question: "Why do I need the visa cancellation paper?",
    answer:
      "It is the proof your residence ended lawfully and on what date, and you will be asked for it by a new employer, by immigration if any question arises, and sometimes by a bank closing an account. Without it you are relying on someone else's records. Get a copy at the time — chasing it from a former employer months later is much harder.",
    service: SERVICE,
    phrases: [
      "what is the residence cancellation certificate for",
      "my employer will not give me the cancellation document",
      "proof that my uae visa was cancelled",
    ],
    keywords: [["visa", "cancellation", "paper"], ["cancellation", "certificate", "for"]],
    next: ["visa-cancellation-how", "visa-return-after-cancellation", "visa-absconding"],
  },
  {
    id: "visa-grace-period",
    question: "How long can I stay after my visa is cancelled?",
    answer:
      "There is a grace period after cancellation during which you can remain and arrange what comes next, and its length depends on the route and the current rules — it has been extended and varied by category. Fines begin when it ends. Confirm the exact period against your own cancellation date rather than a number someone quotes, because that date is what it runs from.",
    service: SERVICE,
    phrases: [
      "what is the grace period after residence cancellation",
      "how many days do i have to leave the uae after cancellation",
      "can i stay in dubai while looking for another job after cancellation",
    ],
    keywords: [["stay", "after", "visa", "cancelled"], ["grace", "period", "after", "cancellation"]],
    next: ["visa-change-employer", "visa-overstay", "visa-cancellation-how"],
  },
  {
    id: "visa-cancel-from-abroad",
    question: "Can my visa be cancelled while I am outside the UAE?",
    answer:
      "Yes, and it often is — an employer can complete the cancellation without you present, which is normal when someone has already left. What matters is that it is actually done, because an uncancelled residence leaves you recorded as a resident with the obligations that carries. Ask for the cancellation document to be sent to you.",
    service: SERVICE,
    phrases: [
      "cancelling my residence after i have already left",
      "i left the country and nobody cancelled my visa",
      "does my employer need me present to cancel my residence",
    ],
    keywords: [["cancelled", "while", "outside", "uae"], ["cancelling", "residence", "already", "left"]],
    next: ["visa-cancellation-paper", "visa-absconding", "visa-exit-reentry"],
  },
  {
    id: "visa-return-after-cancellation",
    question: "Can I come back to the UAE after my visa is cancelled?",
    answer:
      "Normally yes — an ordinary cancellation is not a ban, and people return on a visit permit or a new residence routinely. What stops a return is a ban, an unsettled fine or an open case, none of which a cancellation creates by itself. If you are unsure whether something is on your record, that can be checked before you book.",
    service: SERVICE,
    phrases: [
      "does cancellation stop me returning to dubai",
      "is there a waiting period before i can return to the uae",
      "coming back on a new visa after leaving the country",
    ],
    keywords: [["come", "back", "after", "cancelled"], ["cancellation", "stop", "returning"]],
    next: ["visa-ban-types", "visa-ban-check", "visa-cancellation-paper"],
  },
  {
    id: "visa-final-exit-checklist",
    question: "What should I settle before I leave the UAE for good?",
    answer:
      "Cancellation of your residence and your dependants', final settlement with your employer, closing or transferring utilities, tenancy and telecom accounts, clearing loans and credit cards, and any fines. Unpaid debts are the thing that most often turns a departure into a problem later, because a case can be filed after you have gone. Keep copies of every clearance you obtain.",
    service: SERVICE,
    phrases: [
      "final exit checklist for leaving dubai",
      "things to close before permanently leaving the uae",
      "what happens to my loans if i leave the country",
    ],
    keywords: [["settle", "before", "leave", "uae"], ["final", "exit", "checklist"]],
    next: ["visa-cancellation-how", "visa-travel-ban-debt", "visa-cancel-family"],
  },

  /* ── Refusals, bans and things going wrong ─────────────────────────────── */
  {
    id: "visa-rejection-reasons",
    question: "Why do UAE residence visa applications get refused?",
    answer:
      "Far more often for a document problem than for anything about the person: an unattested or unlegalised certificate, a photograph outside specification, a name that differs across papers, a missing translation, or a profession that needs a licence nobody applied for. The rest are record-based — a previous overstay, an unsettled fine, a ban, or a medical result. Knowing which category yours falls into is what decides whether it is refiled or appealed.",
    service: SERVICE,
    phrases: [
      "most common reasons for a residency refusal here",
      "what causes immigration to reject a visa file in dubai",
      "why was my residence application declined",
    ],
    keywords: [["reasons", "residence", "visa", "refused"], ["immigration", "reject", "visa", "file"]],
    next: ["visa-appeal-refusal", "visa-name-mismatch", "visa-ban-types"],
  },
  {
    id: "visa-appeal-refusal",
    question: "Can a UAE visa refusal be appealed?",
    answer:
      "Sometimes — there are channels for reconsideration and for lifting certain bars, and which one applies depends on the reason recorded. A document refusal is usually fixed and refiled rather than appealed; a record-based one may need a formal application to the authority. What you cannot do is refile the same file unchanged and expect a different answer.",
    service: SERVICE,
    phrases: [
      "is there a way to challenge an immigration decision here",
      "how do i ask for reconsideration of my visa rejection",
      "can a refusal be overturned in dubai",
    ],
    keywords: [["visa", "refusal", "appealed"], ["challenge", "immigration", "decision"]],
    next: ["visa-rejection-reasons", "visa-not-lawyers", "visa-no-guarantees"],
  },
  {
    id: "visa-ban-types",
    question: "What kinds of ban can stop me getting a UAE visa?",
    answer:
      "Several distinct things get called a ban: a labour restriction from how an employment ended, an immigration ban recorded against your entry, and a security or judicial bar arising from a case. They are imposed by different authorities and lifted in different ways, so the first job is finding out which one exists. Assuming the wrong kind is how people waste months.",
    service: SERVICE,
    phrases: [
      "difference between a labour ban and an immigration ban",
      "types of ban recorded against a person in the uae",
      "i have been told there is a ban on my name",
    ],
    keywords: [["kinds", "ban", "stop", "visa"], ["labour", "ban", "immigration", "ban"]],
    next: ["visa-ban-check", "visa-ban-lift", "visa-absconding"],
  },
  {
    id: "visa-ban-check",
    question: "How do I check whether I have a ban or a case against me?",
    answer:
      "There are official channels for checking immigration status and for checking whether a case exists, through the relevant authority or police portal, and they are the only reliable answers — a friend's guess or an agent's assurance is not. Check before you book travel or accept a job that depends on a visa being issued. We can point you to the right channel for your emirate.",
    service: SERVICE,
    phrases: [
      "where can i see if there is a travel ban on me in the uae",
      "how to find out if i am blacklisted in dubai",
      "checking for an immigration bar before i travel",
    ],
    keywords: [["check", "ban", "case", "against"], ["blacklisted", "dubai"]],
    next: ["visa-ban-types", "visa-travel-ban-debt", "visa-return-after-cancellation"],
  },
  {
    id: "visa-ban-lift",
    question: "Can a ban be lifted?",
    answer:
      "Depending on the kind, yes — some lapse with time, some are lifted by settling what caused them, and some require a formal application to the authority that imposed them. Nobody outside that authority can lift one, whatever they charge. Start by establishing which kind you have, because the route out is completely different for each.",
    service: SERVICE,
    phrases: [
      "how do i get an immigration ban removed in the uae",
      "does a labour restriction expire on its own",
      "someone offered to remove my ban if i pay them",
    ],
    keywords: [["ban", "be", "lifted"], ["immigration", "ban", "removed"]],
    next: ["visa-ban-types", "visa-ban-check", "visa-no-guarantees"],
  },
  {
    id: "visa-absconding",
    question: "An absconding case has been filed against me. What does that mean?",
    answer:
      "It is a report by an employer that you stopped attending without notice, and it has serious consequences for your status and for any future permit. It can be contested, and it can be withdrawn, but not by ignoring it — and it does not go away because you left the country. If one has been filed, get proper advice quickly; this is one of the few situations where speed genuinely changes the outcome.",
    service: SERVICE,
    phrases: [
      "an absconding case has been filed against me",
      "my employer reported me as absconding in the uae",
      "what does an absconding report do to my visa",
      "can an absconding complaint be withdrawn",
    ],
    keywords: [["absconding", "case", "filed"], ["reported", "me", "absconding"]],
    next: ["visa-ban-types", "visa-not-lawyers", "visa-cancellation-paper"],
  },
  {
    id: "visa-travel-ban-debt",
    question: "Can a debt stop me leaving or returning to the UAE?",
    answer:
      "An unpaid loan, a bounced cheque or an unsettled judgment can result in a case that bars travel, and it is one of the most common reasons someone is stopped at the airport. It attaches to the case rather than to your visa, so cancelling a residence does not clear it. Settle or check before you plan a departure, not on the day.",
    service: SERVICE,
    phrases: [
      "will an unpaid loan prevent me flying out of dubai",
      "bounced cheque and a travel restriction in the uae",
      "does a bank case stop me getting a new visa",
    ],
    keywords: [["debt", "stop", "leaving", "uae"], ["unpaid", "loan", "travel"]],
    next: ["visa-ban-check", "visa-final-exit-checklist", "visa-not-lawyers"],
  },
  {
    id: "visa-application-stuck",
    question: "My visa application has not moved for weeks. What can I do?",
    answer:
      "Find out what state it is actually in before chasing it, because a file that is waiting on a document you were never asked for looks identical to one queued for approval. Check the status yourself in the authority's app, then ask whoever filed it what the last recorded step was. If it is genuinely stalled, the authority has escalation channels.",
    service: SERVICE,
    phrases: [
      "my visa application has not moved for weeks",
      "my residence file seems to be stuck",
      "nothing is happening with my visa and nobody can tell me why",
      "who do i escalate a delayed visa application to",
    ],
    keywords: [["application", "not", "moved"], ["residence", "file", "stuck"]],
    next: ["visa-where-to-check-status", "visa-status-meanings", "visa-icp-vs-gdrfa"],
  },
  {
    id: "visa-wrong-data-on-visa",
    question: "There is wrong information on my issued visa. Does it matter?",
    answer:
      "Yes — a wrong name spelling, date of birth, nationality or profession on an issued residence causes problems at every point it is checked, and the longer it stands the more records inherit the error. It is corrected through the issuing authority, usually by amendment. Raise it as soon as you see it rather than at renewal.",
    service: SERVICE,
    phrases: [
      "there is wrong information on my issued visa",
      "my profession is wrong on my residence visa",
      "incorrect date of birth on my uae visa",
      "how do i amend details on an issued residence permit",
    ],
    keywords: [["wrong", "information", "issued", "visa"], ["incorrect", "details", "residence", "visa"]],
    next: ["visa-eid-wrong-details", "visa-name-mismatch", "visa-job-title-matters"],
  },
  {
    id: "visa-agent-took-money",
    question: "An agent took my money and disappeared. What can I do?",
    answer:
      "Report it — there are consumer and economic-department channels for complaints against a business, and a police report where money was taken by deception. Keep every message, receipt and transfer record. Whether the visa work can be salvaged depends on what was actually filed, which can be checked against your own record in the authority's system.",
    service: SERVICE,
    phrases: [
      "an agent took my money and disappeared",
      "i was scammed by a visa agent in dubai",
      "the typing centre took payment and did nothing",
      "how do i complain about a visa consultant in the uae",
    ],
    keywords: [["agent", "took", "money"], ["scammed", "visa", "agent"]],
    next: ["visa-where-to-check-status", "visa-who-submits", "visa-hub-scope"],
  },
  {
    id: "visa-fake-documents",
    question: "Someone offered me a shortcut with documents. Should I?",
    answer:
      "No. A forged or bought certificate, a fabricated attestation or a purchased medical result is a criminal matter here, and the checks are better than the people selling shortcuts admit. The consequence is not a refusal — it is a case, a ban and potentially prosecution, years after the fact. If a document is genuinely unobtainable, there is usually a lawful alternative worth finding instead.",
    service: SERVICE,
    phrases: [
      "someone offered me a shortcut with documents",
      "can i use a fake degree for a uae work visa",
      "is it safe to buy an attestation certificate",
      "what happens if immigration finds a forged document",
    ],
    keywords: [["shortcut", "with", "documents"], ["fake", "degree", "work", "visa"]],
    next: ["visa-missing-documents", "visa-rejection-reasons", "visa-not-lawyers"],
  },

  /* ── Tracking a file ───────────────────────────────────────────────────── */
  {
    id: "visa-where-to-check-status",
    question: "Where do I check my visa application status?",
    answer:
      "Through the federal ICP channels or, for files handled in Dubai, the GDRFA channels, using your application number, file number or Emirates ID number. Both have apps as well as websites. Use the authority's own channel rather than a third-party site, and note the reference the moment it is issued — it is much harder to recover later.",
    service: SERVICE,
    phrases: [
      "which website shows my uae residence application progress",
      "how do i look up my visa using my application number",
      "app for checking residency status in the uae",
    ],
    keywords: [["where", "check", "application", "status"], ["look", "up", "visa", "application", "number"]],
    next: ["visa-icp-vs-gdrfa", "visa-status-meanings", "visa-file-number"],
  },
  {
    id: "visa-status-meanings",
    question: "What do the visa application statuses actually mean?",
    answer:
      "The wording is terse and not self-explanatory: under process, under review, awaiting payment, pending document, approved, and issued all mean different things about whose turn it is. Some statuses mean the authority is waiting on you and nobody has told you. If yours is unclear, read it alongside the last recorded step rather than guessing.",
    service: SERVICE,
    phrases: [
      "my application says under process what does that mean",
      "meaning of pending document on my visa status",
      "immigration status wording explained",
    ],
    keywords: [["application", "statuses", "mean"], ["under", "process", "mean"]],
    next: ["visa-application-stuck", "visa-where-to-check-status", "visa-icp-vs-gdrfa"],
  },
  {
    id: "visa-icp-vs-gdrfa",
    question: "What is the difference between ICP and GDRFA?",
    answer:
      "ICP is the federal identity and citizenship authority, and GDRFA is Dubai's own residency and foreigners affairs directorate — Dubai files are generally handled through GDRFA, and files in most other emirates through ICP. Which one holds your file decides which app shows it, which channel answers questions and sometimes which rules apply in detail. If your status does not appear in one, try the other.",
    service: SERVICE,
    phrases: [
      "is my visa handled by dubai immigration or the federal authority",
      "which authority processes residence visas in dubai",
      "icp smart services or gdrfa which one do i use",
    ],
    keywords: [["difference", "icp", "gdrfa"], ["which", "authority", "processes", "visas"]],
    next: ["visa-where-to-check-status", "visa-emirate-differences", "visa-typing-centre"],
  },
  {
    id: "visa-typing-centre",
    question: "What does a typing centre do and do I need one?",
    answer:
      "A typing centre is an approved office that submits applications on your behalf and gets the forms right, which is most of the value — the systems are unforgiving about detail. Some steps can be done yourself in the authority's app, and some are easier not to. Use an approved centre, and keep your own copy of everything they submit.",
    service: SERVICE,
    phrases: [
      "should i use an amer centre or apply myself",
      "what is a tasheel office for",
      "can i submit my own visa application without an agent",
    ],
    keywords: [["typing", "centre", "do"], ["amer", "centre", "apply", "myself"]],
    next: ["visa-who-submits", "visa-where-to-check-status", "visa-hub-scope"],
  },

  /* ── Insurance and the mandatory extras ────────────────────────────────── */
  {
    id: "visa-health-insurance",
    question: "Is health insurance compulsory for UAE residents?",
    answer:
      "Yes — cover is a legal condition of residence, and in Dubai and Abu Dhabi the minimum plan is defined by the local health authority, so a policy that does not meet the local standard is not accepted even though it exists. Employers must cover employees; sponsors must cover dependants. A residence will not be issued or renewed without it in place.",
    service: SERVICE,
    phrases: [
      "do i need medical cover to get a residence visa",
      "minimum health plan required for dubai residency",
      "will my visa be refused without insurance",
    ],
    keywords: [["health", "insurance", "compulsory", "residents"], ["medical", "cover", "residence", "visa"]],
    next: ["visa-dependant-insurance", "visa-insurance-overseas", "visa-renewal-documents"],
  },
  {
    id: "visa-insurance-overseas",
    question: "Will my international health policy be accepted?",
    answer:
      "Not automatically. The health authorities check against their own minimum benefits and against approved insurers, and a good international policy can still fail that test. Ask the insurer for confirmation that the plan meets the requirement for your emirate before relying on it for a visa step.",
    service: SERVICE,
    phrases: [
      "does a foreign insurance plan work for uae residency",
      "is my global medical cover valid for a dubai visa",
      "does my employer's overseas policy count for my residence",
    ],
    keywords: [["international", "health", "policy", "accepted"], ["foreign", "insurance", "residency"]],
    next: ["visa-health-insurance", "visa-dependant-insurance"],
  },
  {
    id: "visa-unemployment-insurance",
    question: "What is the UAE unemployment insurance scheme?",
    answer:
      "A mandatory scheme for employees in the private sector and federal government, paying a limited benefit if you lose your job involuntarily, funded by a small subscription you pay rather than your employer. Not subscribing attracts a penalty and can affect a new permit. It is separate from your health insurance and from end-of-service entitlements.",
    service: SERVICE,
    phrases: [
      "do i have to subscribe to iloe in the uae",
      "is job loss insurance mandatory for employees here",
      "what happens if i do not register for unemployment insurance",
    ],
    keywords: [["unemployment", "insurance", "scheme"], ["iloe", "subscribe"]],
    next: ["visa-labour-card", "visa-hub-extras", "visa-resign-early"],
  },
  {
    id: "visa-emirate-differences",
    question: "Do visa rules differ between Dubai and the other emirates?",
    answer:
      "In practice yes. The federal framework is common, but Dubai processes its own residence files through GDRFA, health insurance minimums are set locally, and free zones each add their own requirements. A rule someone confirmed in Abu Dhabi or Sharjah may not be how your file is handled. Which emirate your sponsor is in is the thing that decides it.",
    service: SERVICE,
    phrases: [
      "are residency requirements the same across the uae",
      "is sharjah different from dubai for residence visas",
      "does abu dhabi have its own visa rules",
    ],
    keywords: [["rules", "differ", "dubai", "emirates"], ["requirements", "same", "across", "uae"]],
    next: ["visa-icp-vs-gdrfa", "visa-other-emirates", "visa-free-zone-employee"],
  },

  /* ── What we do, and what nobody can do ────────────────────────────────── */
  {
    id: "visa-who-submits",
    question: "Who actually submits my visa application?",
    answer:
      "Your sponsor, or an approved typing centre or licensed provider acting for them — visa filing is regulated and we are not the submitting party. What we do is work out exactly what your case needs, check what you have against the mismatches that cause most refusals, and connect you with a provider who files it. That division is deliberate and it is on our service page.",
    service: SERVICE,
    phrases: [
      "do you file the application with immigration yourselves",
      "which party lodges a residence visa in the uae",
      "is my employer or an agent the one who applies",
    ],
    keywords: [["who", "submits", "visa", "application"], ["file", "application", "immigration"]],
    next: ["visa-typing-centre", "visa-no-guarantees", "visa-hub-scope"],
  },
  {
    id: "visa-no-guarantees",
    question: "Can you guarantee my UAE visa will be approved?",
    answer:
      "No, and nobody honestly can — the decision belongs to the authority, and a medical result or something on your record can change it whatever the paperwork looks like. What can be done is to remove the avoidable reasons for refusal before anything is filed, which is where most refusals actually come from. Anyone promising you an approval is selling something they do not control.",
    service: SERVICE,
    phrases: [
      "is approval certain if i use your service",
      "someone promised me a guaranteed residence visa",
      "can anyone guarantee an immigration outcome here",
    ],
    keywords: [["guarantee", "visa", "approved"], ["guaranteed", "residence", "visa"]],
    next: ["visa-rejection-reasons", "visa-golden-nomination", "visa-hub-scope"],
  },
  {
    id: "visa-not-lawyers",
    question: "Can you give me legal advice on my immigration case?",
    answer:
      "No — we are not immigration lawyers and we do not advise on cases, bans, disputes or court matters. Where your situation needs that, the honest answer is to say so and point you to someone licensed to give it. What we can do is explain the process, work out what a file needs, and connect you with a licensed provider for the filing.",
    service: SERVICE,
    phrases: [
      "are you immigration lawyers in dubai",
      "i need a legal opinion about my residency situation",
      "can you represent me against my employer",
    ],
    keywords: [["legal", "advice", "immigration", "case"], ["are", "you", "immigration", "lawyers"]],
    next: ["visa-hub-scope", "visa-who-submits", "visa-absconding"],
  },
  {
    id: "visa-document-safety",
    question: "What happens to my documents and my data?",
    answer:
      "We tell you which documents actually need to leave your hands and which do not, and anything handed to a provider should come with a receipt. Personal data is handled under UAE data protection rules, and we do not pass your details to anyone without telling you who and why. If you are uneasy about handing over an original, say so — there is often another way.",
    service: SERVICE,
    phrases: [
      "how do you look after my passport and certificates",
      "is my personal information kept private in this process",
      "who will you share my details with for my visa",
    ],
    keywords: [["happens", "documents", "data"], ["personal", "information", "kept", "private"]],
    next: ["visa-document-originals", "visa-hub-scope", "visa-who-submits"],
  },
  {
    id: "visa-other-emirates",
    question: "Can you help if my visa is not in Dubai?",
    answer:
      "Yes. We are based in Dubai and most of what we handle is here, but the federal framework is common and we work with providers covering the other emirates. What changes is which authority holds the file and which local requirements apply. Tell us the emirate and the sponsor and we will tell you what differs.",
    service: SERVICE,
    phrases: [
      "do you handle residence visas in abu dhabi and sharjah",
      "i am based in another emirate can you still help",
      "do you cover the northern emirates for visa work",
    ],
    keywords: [["help", "visa", "not", "dubai"], ["handle", "visas", "abu", "dhabi"]],
    next: ["visa-emirate-differences", "visa-icp-vs-gdrfa", "visa-hub-scope"],
  },
  {
    id: "visa-timeline-honesty",
    question: "How long will my visa actually take?",
    answer:
      "It depends on the route, the authority, whether your documents are already attested, and whether anything on your record needs clearing — which is why an honest answer needs your details rather than an average. The medical and the Emirates ID steps have their own queues, and a single missing document resets the clock. We give you a current estimate for your case at the start rather than a figure that flatters us.",
    service: SERVICE,
    phrases: [
      "what is a realistic timeline for uae residency",
      "when can i expect my residence visa to be issued",
      "why can nobody tell me how long my visa will take",
    ],
    keywords: [["how", "long", "visa", "take"], ["realistic", "timeline", "residency"]],
    next: ["visa-application-stuck", "visa-hub-status", "visa-steps-in-order"],
  },
  {
    id: "visa-arabic-support",
    question: "Can you help me in Arabic or another language?",
    answer:
      "Yes — you can write to us in Arabic and we will reply in Arabic, and we work with licensed translators for documents that need it. If you are more comfortable in another language, say so at the start; misunderstanding a requirement is how documents get prepared twice.",
    service: SERVICE,
    phrases: [
      "do you speak arabic for visa questions",
      "can i ask about my residency in my own language",
      "language support for visa help in dubai",
    ],
    keywords: [["help", "in", "arabic"], ["speak", "arabic", "visa"]],
    next: ["visa-translations", "visa-hub-scope"],
  },
  {
    id: "visa-what-we-need-from-you",
    question: "What do you need from me to start on my visa?",
    answer:
      "Your situation in a few sentences — which route, who the sponsor is, which emirate, what documents you already hold and whether anything has gone wrong before. From that we can tell you what the file needs and what is missing, before any money is spent on the wrong step. Scans of documents come later, once we know which ones matter.",
    service: SERVICE,
    phrases: [
      "what information should i send you about my residency",
      "how do we begin working on my visa case",
      "what should i tell you first about my visa situation",
    ],
    keywords: [["need", "from", "me", "start"], ["information", "send", "residency"]],
    next: ["visa-hub-which", "visa-hub-scope", "visa-timeline-honesty"],
  },

  /* ── Living here: the questions that follow the visa ───────────────────── */
  {
    id: "visa-employer-holding-passport",
    question: "My employer is keeping my passport. Are they allowed to?",
    answer:
      "No. Your passport is your property and an employer holding it against your will is not permitted, whatever a contract says or however common the practice is. It is handed over temporarily for specific steps and returned. If yours is being withheld, the labour authority has a complaints channel, and it is worth using rather than accepting it.",
    service: SERVICE,
    phrases: [
      "can a uae company hold my passport",
      "my sponsor will not return my passport",
      "is passport confiscation legal in dubai",
    ],
    keywords: [["employer", "keeping", "passport"], ["company", "hold", "passport"]],
    next: ["visa-document-originals", "visa-not-lawyers", "visa-absconding"],
  },
  {
    id: "visa-company-closed",
    question: "My company has shut down. What happens to my visa?",
    answer:
      "Your residence rests on a sponsorship that no longer has a functioning sponsor, so it has to be resolved rather than left — usually cancellation and a move to another employer, and there are channels for employees whose company stopped operating without cancelling anything. Do not wait for the former employer to act. Get your own status checked so you know whether a clock is already running.",
    service: SERVICE,
    phrases: [
      "my employer closed and nobody cancelled my residence",
      "the business i work for stopped operating and i am still on their visa",
      "what do i do if my sponsor company disappears",
    ],
    keywords: [["company", "shut", "down", "visa"], ["employer", "closed", "residence"]],
    next: ["visa-cancellation-how", "visa-change-employer", "visa-ban-check"],
  },
  {
    id: "visa-study-on-family-visa",
    question: "Can my child study here on a family visa?",
    answer:
      "Yes — residence under a parent's sponsorship is the normal basis on which children attend school here, and schools ask for the residence visa and Emirates ID at admission. What they also ask for is attested previous school records, which is the part families are caught out by when moving mid-year. Start those before you move, not after.",
    service: SERVICE,
    phrases: [
      "does my son need his own visa to go to school in dubai",
      "school admission requirements for a dependant child",
      "can a child on a parent visa attend university here",
    ],
    keywords: [["child", "study", "family", "visa"], ["school", "admission", "dependant"]],
    next: ["visa-sponsor-children", "visa-attested-certificates", "visa-student-visa"],
  },
  {
    id: "visa-school-admission",
    question: "The school is asking for visa documents we do not have yet. What do we do?",
    answer:
      "Schools can often admit provisionally while a residence application is in progress, on the application reference rather than the issued visa, but they have their own deadlines and the attested school transfer certificate is usually the harder item. Tell the school what stage you are at rather than waiting. Which documents need attesting is something we can confirm now so it runs in parallel.",
    service: SERVICE,
    phrases: [
      "the school is asking for visa documents we do not have yet",
      "can my child start school before the residence visa is issued",
      "transfer certificate attestation for a uae school",
      "school wants an emirates id we have not received",
    ],
    keywords: [["school", "asking", "visa", "documents"], ["start", "school", "before", "visa"]],
    next: ["visa-study-on-family-visa", "visa-attested-certificates", "visa-eid-delivery"],
  },
  {
    id: "visa-driving-licence",
    question: "Can I get a UAE driving licence with my residence visa?",
    answer:
      "A residence visa and Emirates ID are what make you eligible to apply, and holders of licences from certain countries can exchange rather than test — the list is set by the traffic authority and it changes. Until your residence is issued, you are generally limited to an international permit as a visitor. The eligibility to exchange is worth checking before you pay for lessons.",
    service: SERVICE,
    phrases: [
      "do i need residency before applying for a dubai driving licence",
      "can i exchange my home country licence in the uae",
      "driving legally in dubai while my visa is in process",
    ],
    keywords: [["driving", "licence", "residence", "visa"], ["exchange", "home", "licence"]],
    next: ["visa-eid-how", "visa-steps-in-order"],
  },
  {
    id: "visa-bank-account",
    question: "Can I open a bank account before my residence visa is issued?",
    answer:
      "Most banks want a residence visa and Emirates ID for a full current account, though some offer limited or non-resident accounts before that. Salary accounts in particular are usually opened once the residence exists. If you need one urgently, ask the bank what they accept at your stage rather than assuming you must wait for the card.",
    service: SERVICE,
    phrases: [
      "do i need an emirates id to open a bank account in dubai",
      "banking while my residency is still being processed",
      "can i get a salary account without a visa yet",
    ],
    keywords: [["bank", "account", "before", "visa"], ["emirates", "id", "bank", "account"]],
    next: ["visa-eid-delivery", "visa-steps-in-order", "visa-hub-status"],
  },
  {
    id: "visa-gcc-travel",
    question: "Does a UAE residence visa let me travel to other GCC countries?",
    answer:
      "Not automatically. Some neighbouring countries grant easier entry to UAE residents of certain professions or categories, and others require a visa like anyone else — it depends on your nationality, your profession and the destination. Check with that country's mission rather than assuming residence here is enough.",
    service: SERVICE,
    phrases: [
      "can i enter oman or qatar on my dubai residence",
      "do uae residents need a visa for saudi arabia",
      "gcc entry rights for a uae resident",
    ],
    keywords: [["residence", "visa", "travel", "gcc"], ["uae", "residents", "visa", "saudi"]],
    next: ["visa-exit-reentry", "visa-what-is-residence-visa"],
  },
  {
    id: "visa-citizenship",
    question: "Can a residence visa lead to UAE citizenship?",
    answer:
      "Not as a matter of course. There is no route where time spent as a resident automatically converts into citizenship or permanent residence, and naturalisation is granted in limited, specific circumstances at the state's discretion. Long-term residence is the closest thing to security of status, and it is still a renewable residence rather than a path to a passport.",
    service: SERVICE,
    phrases: [
      "how many years of residency gets me a uae passport",
      "is there permanent residence in the united arab emirates",
      "does long term residence become citizenship",
    ],
    keywords: [["residence", "visa", "citizenship"], ["uae", "passport", "residency"]],
    next: ["visa-golden-categories", "visa-golden-renewal", "visa-how-long-valid"],
  },
  {
    id: "visa-married-to-emirati",
    question: "I am married to an Emirati. What is my status?",
    answer:
      "Marriage to a UAE national is a recognised sponsorship situation with its own provisions, and they differ depending on whether the national is the husband or the wife, and on children's status. It is not the same as ordinary spouse sponsorship and it is not automatic citizenship. This is a case where the detail matters, so tell us the specifics.",
    service: SERVICE,
    phrases: [
      "residence through marriage to a uae national",
      "can my emirati husband sponsor me",
      "visa rights of a foreign wife of a uae citizen",
    ],
    keywords: [["married", "to", "emirati"], ["marriage", "uae", "national"]],
    next: ["visa-sponsor-spouse", "visa-citizenship", "visa-not-lawyers"],
  },
  {
    id: "visa-fiance",
    question: "Can I sponsor my fiancé or partner?",
    answer:
      "Not as a partner — family sponsorship rests on a documented relationship, which in practice means a marriage certificate for a spouse. An unmarried partner would need their own basis to be here, such as employment or one of the independent routes. If marriage is planned, the certificate and its attestation are what the sponsorship will turn on.",
    service: SERVICE,
    phrases: [
      "can i sponsor my fiance or partner",
      "unmarried partner residence visa in the uae",
      "can my girlfriend live with me in dubai on my visa",
      "do i have to be married to sponsor someone here",
    ],
    keywords: [["sponsor", "fiance", "partner"], ["unmarried", "partner", "residence"]],
    next: ["visa-sponsor-spouse", "visa-marriage-certificate", "visa-hub-green"],
  },
  {
    id: "visa-work-different-emirate",
    question: "My visa is from one emirate but the job is in another. Is that a problem?",
    answer:
      "Working in a different emirate from the one that issued your permit is common and usually fine for mainland employment, but free zone permits are tied to the zone and its rules about where you may work. Your residence being issued elsewhere is separate from whether the permit covers the workplace. Which zone or authority issued yours decides it.",
    service: SERVICE,
    phrases: [
      "my visa is from one emirate but the job is in another",
      "can i work in dubai on an abu dhabi visa",
      "does my free zone permit let me work outside the zone",
      "working in a different emirate to my residence",
    ],
    keywords: [["visa", "one", "emirate", "job", "another"], ["work", "dubai", "abu", "dhabi", "visa"]],
    next: ["visa-free-zone-employee", "visa-emirate-differences", "visa-labour-card"],
  },
  {
    id: "visa-maid-transfer",
    question: "Can I take over sponsorship of a domestic worker already in the UAE?",
    answer:
      "A transfer between sponsors is possible under the domestic worker scheme, with the current sponsor's agreement and the worker's, and it has its own process rather than being a private arrangement. Employing someone who is sponsored by a different household is a breach for both of you. Tell us the situation and we will set out the lawful route.",
    service: SERVICE,
    phrases: [
      "transferring a maid visa from another sponsor",
      "can i employ a housemaid who is on someone else's visa",
      "domestic worker sponsorship transfer in dubai",
    ],
    keywords: [["take", "over", "sponsorship", "domestic"], ["transfer", "maid", "visa"]],
    next: ["visa-domestic-worker-visa", "visa-quote-domestic-worker"],
  },
  {
    id: "visa-pregnant-on-visit-visa",
    question: "I am on a visit visa and pregnant. What should I know?",
    answer:
      "Giving birth here requires the mother to have a lawful status and hospitals ask for it, and the birth certificate, attestation and the baby's own residence all follow from that — a birth while on a visit status makes each of those steps harder rather than impossible. Marriage documentation is also asked for. This is worth sorting out well before the due date rather than in the last weeks.",
    service: SERVICE,
    phrases: [
      "can i give birth in dubai on a tourist visa",
      "having a baby in the uae without residency",
      "what status do i need to deliver a baby here",
    ],
    keywords: [["visit", "visa", "pregnant"], ["give", "birth", "tourist", "visa"]],
    next: ["visa-uae-born-child", "visa-status-change", "visa-newborn-deadline"],
  },

  /* ── Money ─────────────────────────────────────────────────────────────── */
  /**
   * None of these answer with a number, and that is the point.
   *
   * Every entry below carries `quote: true`, so the reply is followed in the
   * same turn by the visa qualification and then the callback form. Government
   * fees on this service move, they differ between ICP and GDRFA and between
   * free zones, and several depend on things only the visitor knows. A figure
   * published here would be a figure someone budgeted on and we got wrong.
   *
   * Each is named for the service rather than asked bare — "How much does a UAE
   * residence visa cost?" and not "How much does it cost?" — because the
   * question becomes the intent's name and `matchByPhrase` matches names before
   * anything else, so a bare one would claim that phrasing across the whole
   * merged flow and walk an attestation visitor into the visa qualification.
   */
  {
    id: "visa-quote-general",
    question: "How much does a UAE residence visa cost?",
    answer:
      "There is no single figure, and any that is quoted to you without your details is a guess. A residence visa is several separate charges — government fees that differ by route, emirate and authority, the medical, the Emirates ID, insurance, and typing or service charges — and the route you qualify for changes all of them. Let me take a few details and the team will come back with a proper breakdown for your case.",
    service: SERVICE,
    phrases: [
      "what is the price of a residence visa in dubai",
      "total cost of getting uae residency",
      "how much am i looking at for a residence visa",
      "give me an estimate for my uae visa",
      "is a uae residence visa expensive",
    ],
    keywords: [["cost", "residence", "visa"], ["price", "residence", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-employment",
    question: "How much does a UAE employment visa cost me as the employee?",
    answer:
      "For a genuine employment visa the employer carries the government costs of your permit and residence — that is the legal position, and being asked to pay for your own work permit is worth questioning. What you may pay for is your own document attestation and translation. Tell me a little about the offer and we will set out what should and should not be on your side.",
    service: SERVICE,
    phrases: [
      "should i be paying for my own work visa in dubai",
      "what are the employee's costs for a residence visa",
      "my company wants me to pay my visa fees",
    ],
    keywords: [["cost", "employment", "visa", "employee"], ["paying", "own", "work", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-family",
    question: "How much does a UAE family visa cost?",
    answer:
      "It depends on who you are sponsoring, the emirate, whether a deposit is required, and what the insurance for them will be — parents in particular are usually the most expensive to sponsor because of the cover and the deposit. Attestation of the marriage or birth certificate is a separate cost again. Let me take your details and the team will price the whole thing rather than one part of it.",
    service: SERVICE,
    phrases: [
      "what does it cost to sponsor my wife in dubai",
      "price of a dependant residence visa in the uae",
      "how much to bring my children to the uae on my visa",
    ],
    keywords: [["cost", "family", "visa"], ["cost", "sponsor", "wife"]],
    quote: true,
  },
  {
    id: "visa-quote-parents",
    question: "How much does it cost to sponsor my parents in the UAE?",
    answer:
      "This is the family route with the most moving parts: a deposit is commonly required per parent, health cover for older dependants is the largest single item, and the income expected of the sponsor is higher. None of those are figures worth quoting in the abstract because they turn on ages, emirate and insurer. Give me a few details and the team will put real numbers to it.",
    service: SERVICE,
    phrases: [
      "what is the deposit for a parent visa in dubai",
      "price of bringing my mother to live in the uae",
      "insurance charges for sponsoring elderly parents here",
    ],
    keywords: [["cost", "sponsor", "parents"], ["deposit", "parent", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-golden",
    question: "How much does a UAE golden visa cost?",
    answer:
      "The application and issuance charges are modest compared with what actually decides whether you can use the route — the investment, property value or salary the category requires. Those are eligibility thresholds rather than fees, and both they and the charges have been revised. Tell me which category you think fits and the team will set out the real cost of that route.",
    service: SERVICE,
    phrases: [
      "what are the fees for long term residence in the uae",
      "price of a ten year residence visa in dubai",
      "is a golden visa expensive to apply for",
    ],
    keywords: [["cost", "golden", "visa"], ["fees", "long", "term", "residence"]],
    quote: true,
  },
  {
    id: "visa-quote-property-route",
    question: "How much do I need to invest in property for UAE residency?",
    answer:
      "There is a minimum property value for the investor route and it has changed more than once, and the type and completion status of the property matter as much as the figure. Quoting yesterday's threshold to someone about to buy a home would be irresponsible. Let me take your details and the team will confirm the current requirement before you commit to anything.",
    service: SERVICE,
    phrases: [
      "minimum property price for a dubai investor visa",
      "what value of real estate qualifies me for residence",
      "how much property investment gets me a golden visa",
    ],
    keywords: [["invest", "property", "residency"], ["minimum", "property", "price", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-freelance",
    question: "How much does a freelance permit and visa cost in the UAE?",
    answer:
      "Freelance and green visa packages are sold by several free zones and authorities and they are genuinely not comparable on headline price — some include the residence, some include a workspace, some include neither, and renewal charges differ from the first year. That is exactly where people overpay. Tell me your activity and the team will compare the routes that actually fit it.",
    service: SERVICE,
    phrases: [
      "price of a freelance licence with residency in dubai",
      "what is the cheapest freelance visa option here",
      "green visa fees for a self employed person",
    ],
    keywords: [["cost", "freelance", "permit"], ["cheapest", "freelance", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-remote-work",
    question: "How much does the UAE remote-work visa cost?",
    answer:
      "There is an application charge, plus the health cover you must hold and the income you must prove — and the income is a condition rather than a cost, which is the part people miss when comparing it with a freelance package. Both the charge and the threshold are set by the authority. Give me your situation and the team will lay out what the route really costs you.",
    service: SERVICE,
    phrases: [
      "price of the virtual working programme in dubai",
      "what are the charges for a digital nomad visa here",
      "income needed for the remote work residence permit",
    ],
    keywords: [["cost", "remote", "work", "visa"], ["price", "virtual", "working", "programme"]],
    quote: true,
  },
  {
    id: "visa-quote-student",
    question: "How much does a UAE student visa cost?",
    answer:
      "The residence charges are usually bundled by the university into what it invoices, alongside the medical, the Emirates ID and insurance — so the honest comparison is what the institution charges versus what the government charges, and they are not the same thing. Attestation of prior certificates is separate again. Tell me the institution and the team will break it down.",
    service: SERVICE,
    phrases: [
      "what does a university residence visa cost in dubai",
      "student visa fees charged by uae colleges",
      "price of studying and living legally in the uae",
    ],
    keywords: [["cost", "student", "visa"], ["university", "residence", "visa", "cost"]],
    quote: true,
  },
  {
    id: "visa-quote-domestic-worker",
    question: "How much does it cost to sponsor a maid or domestic worker?",
    answer:
      "The domestic worker scheme has its own charges, usually including a deposit and mandatory insurance, and the recruitment side is priced separately from the visa side — which is where quoted figures diverge wildly. The sponsor's income requirement is a condition on top. Let me take your details and the team will price the lawful route properly.",
    service: SERVICE,
    phrases: [
      "price of a housemaid visa in dubai",
      "what are the charges for a nanny residence visa",
      "cost of sponsoring a driver in the uae",
    ],
    keywords: [["cost", "sponsor", "maid"], ["price", "housemaid", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-medical",
    question: "How much does the visa medical test cost?",
    answer:
      "Approved centres charge by processing tier — standard, express and premium — and the tiers differ by emirate and by centre, so a figure from one centre does not transfer. It is usually a small part of the total visa cost, which is why it is worth getting the whole picture rather than one line of it. Give me a few details and the team will quote the full file.",
    service: SERVICE,
    phrases: [
      "price of the medical fitness test in dubai",
      "what does an express medical for a residence visa cost",
      "charges at an approved visa medical centre",
    ],
    keywords: [["cost", "medical", "test"], ["price", "medical", "fitness", "test"]],
    quote: true,
  },
  {
    id: "visa-quote-emirates-id",
    question: "How much does an Emirates ID cost?",
    answer:
      "The charge depends on the period the card is issued for and whether it is a first issue, a renewal or a replacement, and a lost card is priced differently again. There are also typing centre charges on top of the government ones. It comes bundled into the visa cost in practice, so let me take your details and the team will give you the whole figure.",
    service: SERVICE,
    phrases: [
      "price of an emirates id card in the uae",
      "what are the charges to replace a lost emirates id",
      "emirates id renewal fees in dubai",
    ],
    keywords: [["cost", "emirates", "id"], ["price", "emirates", "id"]],
    quote: true,
  },
  {
    id: "visa-quote-renewal",
    question: "How much does it cost to renew a UAE residence visa?",
    answer:
      "A renewal is cheaper than a first issue in some routes and much the same in others, and the variable parts are the medical tier, the insurance premium for the coming term and the Emirates ID period. Family renewals multiply by the number of people. Tell me your route and household and the team will price the renewal properly.",
    service: SERVICE,
    phrases: [
      "price of renewing my residency in dubai",
      "renewal charges for a family residence visa",
      "is renewing cheaper than a new residence visa",
    ],
    keywords: [["cost", "renew", "residence", "visa"], ["price", "renewing", "residency"]],
    quote: true,
  },
  {
    id: "visa-quote-cancellation",
    question: "Is there a charge to cancel a UAE residence visa?",
    answer:
      "There are government charges for cancellation and usually typing centre charges alongside them, and for an employment visa the employer normally bears them. Where fines or an overstay are involved, those are separate and settled first. Tell me the situation and the team will tell you what should fall on whom.",
    service: SERVICE,
    phrases: [
      "what does visa cancellation cost in dubai",
      "who pays the cancellation fees for a residence visa",
      "price of cancelling a dependant visa in the uae",
    ],
    keywords: [["charge", "cancel", "residence", "visa"], ["cost", "visa", "cancellation"]],
    quote: true,
  },
  {
    id: "visa-quote-overstay-fine",
    question: "How much is the overstay fine in the UAE?",
    answer:
      "It accrues daily from the day your permission ended, and the daily rate has been revised, so the only reliable figure is the one on your own record when it is checked. What I can tell you is that it does not stop growing and it has to be settled before you can leave or regularise. Let me take a few details and the team will get your actual position checked.",
    service: SERVICE,
    phrases: [
      "what is the daily penalty for overstaying in dubai",
      "price of clearing my overstay fines",
      "how much do i owe for staying past my visa",
    ],
    keywords: [["overstay", "fine", "uae"], ["daily", "penalty", "overstaying"]],
    quote: true,
  },
  {
    id: "visa-quote-status-change",
    question: "How much does a change of status cost?",
    answer:
      "There is a government charge for changing status inside the country, and it is usually compared against the cost of flying out and re-entering — which is why the answer depends on your nationality, your route and current airfares rather than on one figure. Tell me your situation and the team will work out which is actually cheaper for you.",
    service: SERVICE,
    phrases: [
      "price of an in country status change in dubai",
      "is it cheaper to exit and re enter than change status",
      "what are the charges for status adjustment in the uae",
    ],
    keywords: [["cost", "change", "of", "status"], ["price", "status", "change"]],
    quote: true,
  },
  {
    id: "visa-quote-insurance",
    question: "How much is health insurance for a UAE residence visa?",
    answer:
      "Premiums depend on age, the emirate's minimum plan, whether you need cover for dependants and which insurer — and the cheapest compliant plan for a young single applicant is nothing like the cost of covering a parent. It is often the largest variable in a family sponsorship. Give me the ages and the emirate and the team will get you real quotes.",
    service: SERVICE,
    phrases: [
      "price of the minimum medical cover in dubai",
      "what does visa insurance cost for my family",
      "cheapest compliant health plan for uae residency",
    ],
    keywords: [["cost", "health", "insurance", "visa"], ["price", "medical", "cover"]],
    quote: true,
  },
  {
    id: "visa-quote-typing-centre",
    question: "What do typing centres charge for visa work?",
    answer:
      "Service charges sit on top of government charges and they are not standardised — two centres can quote differently for the same submission, and some bundle steps that others price separately. That is one of the reasons a total is worth getting in writing before you start. Tell me what needs doing and the team will give you a proper breakdown.",
    service: SERVICE,
    phrases: [
      "service fees at an amer centre in dubai",
      "how much does a visa agent charge in the uae",
      "are typing centre prices fixed by the government",
    ],
    keywords: [["typing", "centres", "charge"], ["visa", "agent", "charge"]],
    quote: true,
  },
  {
    id: "visa-quote-your-fee",
    question: "What do you charge to help with a UAE visa?",
    answer:
      "Visa processing is work we refer to a licensed provider rather than carry out ourselves, so what you pay breaks into their charges, the government charges, and what we charge for working out the file and managing it. We would rather tell you that after seeing what your case needs than quote a number that turns out not to cover it. Let me take a few details.",
    service: SERVICE,
    phrases: [
      "what is your fee for visa processing help",
      "how much do you charge for residency assistance",
      "do you charge a consultation fee for visa advice",
    ],
    keywords: [["what", "you", "charge", "visa"], ["your", "fee", "visa", "processing"]],
    quote: true,
  },
  {
    id: "visa-quote-cheapest-route",
    question: "What is the cheapest way to get UAE residency?",
    answer:
      "The cheapest route on paper is rarely the cheapest outcome — a package bought for its headline price and then renewed, or one that does not actually permit the work you intend to do, costs more than the route that fitted. What is cheapest genuinely depends on your income, your family and how long you plan to stay. Tell me those and the team will compare honestly.",
    service: SERVICE,
    phrases: [
      "which residence visa is the least expensive in dubai",
      "cheapest route to living in the uae legally",
      "what is the most affordable visa option for me",
    ],
    keywords: [["cheapest", "way", "uae", "residency"], ["least", "expensive", "residence", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-instalments",
    question: "Can I pay for my visa in instalments?",
    answer:
      "Government charges are generally paid in full at the point of submission, so the flexibility that exists is usually on the service side rather than the government side, and it varies by provider. It is better to ask before starting than partway through a file that then stalls for payment. Tell me what needs doing and the team will tell you honestly what can be staged.",
    service: SERVICE,
    phrases: [
      "is there a payment plan for uae residency charges",
      "can i split the cost of my residence visa",
      "do you offer instalments on visa processing",
    ],
    keywords: [["pay", "visa", "instalments"], ["payment", "plan", "residency"]],
    quote: true,
  },
  {
    id: "visa-quote-refund",
    question: "Are visa fees refundable if my application is refused?",
    answer:
      "Government charges are generally not refunded once an application has been submitted, whatever the outcome, and service charges depend on the provider's terms. That is precisely why the work of checking a file before submission is worth more than it looks. Tell me your situation and the team will be straight with you about what is recoverable.",
    service: SERVICE,
    phrases: [
      "do i get my money back if my residence visa is rejected",
      "is a refund possible after a failed visa application",
      "refundable charges on a uae visa file",
    ],
    keywords: [["visa", "fees", "refundable"], ["refund", "failed", "visa", "application"]],
    quote: true,
  },
  {
    id: "visa-quote-agent-cheaper",
    question: "Another agent quoted me less for the same visa. Why?",
    answer:
      "Usually because the quotes are not for the same thing — one excludes government charges, or the medical, or the insurance, or the renewal that lands next year, or it assumes a route you do not actually qualify for. Ask both quotes to be itemised and the difference normally explains itself. Send me your details and the team will give you a breakdown you can compare line by line.",
    service: SERVICE,
    phrases: [
      "another agent quoted me less for the same visa",
      "why is your price higher than the consultant i spoke to",
      "someone offered me a much cheaper residence visa",
      "how do i compare two visa quotes properly",
    ],
    keywords: [["agent", "quoted", "less"], ["cheaper", "residence", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-hidden-costs",
    question: "What are the hidden costs of a UAE residence visa?",
    answer:
      "The ones people do not budget for are attestation and translation of documents from home, health insurance for the whole term, the Emirates ID, a deposit where one is required, and the renewal that arrives sooner than expected. None of them are hidden by anyone — they are just not in the headline. Give me your details and the team will list every line for your case.",
    service: SERVICE,
    phrases: [
      "what extra charges should i expect for dubai residency",
      "unexpected costs when getting a residence visa here",
      "what is not included in a visa package price",
    ],
    keywords: [["hidden", "costs", "residence", "visa"], ["extra", "charges", "residency"]],
    quote: true,
  },
  {
    id: "visa-quote-budget",
    question: "I have a limited budget for my UAE visa. What are my options?",
    answer:
      "Say so early — it changes which route is worth pursuing, and it is much better known at the start than discovered halfway through a file. Some routes have unavoidable thresholds and some have flexibility in how and when charges fall. Tell me what you are working with and the team will be honest about what is realistic rather than starting something you cannot finish.",
    service: SERVICE,
    phrases: [
      "i have a limited budget for my uae visa",
      "i cannot afford an expensive residence visa route",
      "what can i do on a small budget for uae residency",
      "my budget for a dubai visa is tight",
    ],
    keywords: [["limited", "budget", "visa"], ["afford", "residence", "visa"]],
    quote: true,
  },
  {
    id: "visa-quote-visit-visa",
    question: "How much does a UAE visit visa cost?",
    answer:
      "It depends on the duration, whether it is single or multiple entry, who sponsors it and whether insurance is bundled, and extension charges are separate again. Airlines, hotels and agents all price the same permit differently. Tell me who is travelling and for how long and the team will give you the real total.",
    service: SERVICE,
    phrases: [
      "price of a tourist visa for dubai",
      "what does a visitor entry permit cost in the uae",
      "charges to extend a visit visa in dubai",
    ],
    keywords: [["cost", "visit", "visa"], ["price", "tourist", "visa"]],
    quote: true,
  },
];
