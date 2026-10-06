/**
 * Every question a job seeker in the UAE arrives with, and how they connect.
 *
 * Seed content, the same kind of file as ./notarisation.ts and written against
 * the same `AuthoredFlow` shape: writing an answer here is writing sentences,
 * and the nodes, edges and intents are `buildAuthoredFlow`'s problem. It fills
 * the flow the first time; after that /admin/flow is where it is edited.
 *
 * WHY THIS PACK EXISTS AT ALL
 *
 * The jobs board brings in people who are not looking for a service — they are
 * looking for work, and on the way they hit a wall of paperwork nobody explained
 * to them: a visa they cannot job-hunt on, a degree the employer wants attested,
 * an offer letter they are asked to sign in Arabic, an agency asking them for a
 * fee that UAE labour law does not allow anyone to charge them. Those doubts are
 * the reason the same four services keep coming up, so answering them properly
 * is both the useful thing and the commercial one.
 *
 * WHY IT IS SHAPED IN CLUSTERS
 *
 * Two hundred-odd answers all hanging off the start node match badly:
 * `matchByEmbedding` needs the winner to beat the runner-up by
 * `SIMILARITY_MARGIN`, and every CV question looks like every other CV question.
 * So there are sixteen hubs, one per subject, each offering its cluster as
 * buttons. Someone who taps arrives at an exact node with no matching at all,
 * and someone who types is matched against that hub's handful of local intents.
 * Every answer is still wired from `start`, because a person who types "can I
 * job hunt on a tourist visa" should get that answer rather than a menu.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind written answers harder than
 * generated ones, because these are published under the company's name with no
 * model in the loop to hedge them. On this subject four of them matter most:
 *
 *   - No fee, salary figure, processing time, quota or eligibility rule stated
 *     as fact. Labour rules and visa routes change, and a job seeker who acted
 *     on a stale one got it from us. Say what it depends on, and name the
 *     authority — MOHRE, ICP, the free zone, the employer — to confirm it with.
 *   - We are not a recruitment agency. We do not place anyone, we do not
 *     charge a job seeker to apply, and the listings on the jobs page link to
 *     the employer or the board that posted them. Nothing here may imply
 *     otherwise, and nothing may promise an interview or a job.
 *   - No legal advice. A labour dispute, a ban or an absconding report gets
 *     pointed at MOHRE or a lawyer, not settled in a chat reply.
 *   - No market salary figure, even as a range. "What should I be paid" is a
 *     question about someone's livelihood, and a number we invented would be
 *     used in a negotiation.
 *
 * The first of those is enforced mechanically in tests/job-search-flows.test.ts
 * by the same `findUnsupportedAmounts` the chatbot's own replies go through.
 *
 * A money question about OUR work therefore does not get a number — it gets an
 * honest sentence and `quote: true`, which walks it into that service's
 * qualification and ends at the callback form. Note the deliberate asymmetry
 * with a question about the visitor's own pay: "what will you charge me for a
 * CV" is a quote, "what salary should I ask for" is not, and keeping those two
 * apart is what the routing tests are mostly about.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every id here starts with this. `buildAuthoredFlow` derives node ids as
 *  `n-<id>`, so the prefix is what keeps this pack from colliding with
 *  `att-`, `not-`, `biz-` or the visa pack when all of them are concatenated
 *  into one graph. */

/** The service each cluster's callback belongs to. Most of this pack is CV
 *  work, which is ours and in-house; the paperwork clusters route to the team
 *  that actually prices that paperwork, because a callback about a degree
 *  attestation from the CV writer is a wasted call for both sides. */
const CV = "cv-resume";
const ATTEST = "attestation";
const VISA = "visa-processing";
const TRANSLATE = "legal-translation";

export const JOB_SEARCH_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "job-hub-start",
    question: "I am looking for a job in the UAE — where do I start?",
    answer:
      "Most people arrive with two separate problems: finding the vacancy, and having the paperwork an employer here will ask for once they want to hire you. It is worth knowing which one is actually holding you up. Where shall we start?",
    service: CV,
    phrases: [
      "i am looking for a job in the uae",
      "i want to find work in dubai",
      "help me find a job in dubai",
      "how do i get a job in the uae",
      "i am job hunting in dubai and do not know where to begin",
    ],
    keywords: [["looking", "job", "dubai"], ["find", "work", "dubai"], ["start", "job", "search"]],
    opener: true,
    faq: false,
    choices: [
      { label: "Where do I look?", to: "job-hub-where" },
      { label: "Can I job hunt on my visa?", to: "job-hub-legal" },
      { label: "Fix my CV", to: "job-hub-cv" },
      { label: "I have an offer letter", to: "job-hub-offer" },
      { label: "What do you actually do?", to: "job-hub-us" },
    ],
    next: ["job-hub-where", "job-hub-cv", "job-us-find-jobs"],
  },
  {
    id: "job-hub-where",
    question: "Where are UAE jobs actually advertised?",
    answer:
      "Vacancies here surface in several places at once, and the ones that fill fastest are often not on the big portals at all. Which route are you asking about?",
    service: CV,
    phrases: [
      "where are uae jobs advertised",
      "where should i look for vacancies in dubai",
      "best places to search for jobs in the uae",
      "which job sites work in dubai",
    ],
    keywords: [["where", "jobs", "advertised"], ["which", "job", "sites", "dubai"]],
    faq: false,
    choices: [
      { label: "Job portals", to: "job-where-portals" },
      { label: "LinkedIn", to: "job-where-linkedin" },
      { label: "Walk-in interviews", to: "job-where-walkin" },
      { label: "Your jobs page", to: "job-us-jobs-board" },
      { label: "Referrals", to: "job-where-referrals" },
    ],
    next: ["job-where-portals", "job-where-linkedin", "job-where-referrals"],
  },
  {
    id: "job-hub-legal",
    question: "Which visa am I allowed to look for work on?",
    answer:
      "Whether you may look, and whether an employer can hire you without you leaving the country, depends on the permit you are on — and this is the area where the rules are revised most often, so the ICP and MOHRE channels are the ones to confirm your own case against. Which situation is yours?",
    service: VISA,
    phrases: [
      "which visa can i look for work on",
      "am i allowed to job hunt on my visa",
      "can i search for a job while on a visit visa",
      "what visa do i need to look for work in dubai",
    ],
    keywords: [["allowed", "hunt", "visa"], ["visa", "look", "work"]],
    faq: false,
    choices: [
      { label: "Tourist or visit visa", to: "job-legal-tourist-visa" },
      { label: "Job seeker visa", to: "job-legal-jobseeker-visa" },
      { label: "My visa was cancelled", to: "job-legal-cancelled-grace" },
      { label: "I am on a family visa", to: "job-legal-dependent-permit" },
      { label: "I am outside the UAE", to: "job-legal-from-abroad" },
    ],
    next: ["job-legal-tourist-visa", "job-legal-jobseeker-visa", "job-legal-cancelled-grace"],
  },
  {
    id: "job-hub-agency",
    question: "Dealing with recruiters and agencies",
    answer:
      "There are licensed recruitment agencies here, and there are people who call themselves one. The difference shows up in what they ask you for. What do you want to check?",
    service: CV,
    phrases: [
      "dealing with recruitment agencies in dubai",
      "how do recruiters work in the uae",
      "should i use a recruitment agency in dubai",
      "questions about recruiters in the uae",
    ],
    keywords: [["dealing", "recruitment", "agencies"], ["recruiters", "work", "uae"]],
    faq: false,
    choices: [
      { label: "Is this agency licensed?", to: "job-agency-licensed" },
      { label: "They want a fee from me", to: "job-agency-fee" },
      { label: "A recruiter went quiet", to: "job-agency-ghosted" },
      { label: "An agent in my country", to: "job-agency-overseas-agent" },
      { label: "They promise a job", to: "job-agency-guaranteed-job" },
    ],
    next: ["job-agency-licensed", "job-agency-fee", "job-agency-guaranteed-job"],
  },
  {
    id: "job-hub-scams",
    question: "Is this job offer a scam?",
    answer:
      "Job scams here follow a small number of scripts, and nearly all of them end with you sending money or handing over a document. If something you have been sent matches one of these, stop before you pay. Which is it?",
    service: CV,
    phrases: [
      "is this job offer a scam",
      "i think this job offer is fake",
      "how do i know a job offer is genuine",
      "i was asked to pay for a job in dubai",
    ],
    keywords: [["job", "offer", "scam"], ["offer", "fake", "dubai"], ["asked", "pay", "job"]],
    faq: false,
    choices: [
      { label: "They want money upfront", to: "job-scam-advance-fee" },
      { label: "The offer letter looks odd", to: "job-scam-fake-offer-letter" },
      { label: "A deposit for the visa", to: "job-scam-visa-deposit" },
      { label: "They kept my passport", to: "job-scam-passport-held" },
      { label: "Where do I report it?", to: "job-scam-report" },
    ],
    next: ["job-scam-advance-fee", "job-scam-fake-offer-letter", "job-scam-report"],
  },
  {
    id: "job-hub-cv",
    question: "My CV is not getting replies",
    answer:
      "A CV here is read twice — once by software screening for the words in the advert, once by a person deciding in a few seconds whether you fit the market. Most CVs that get no replies fail the first read. What would you like to fix?",
    service: CV,
    phrases: [
      "my cv is not getting replies",
      "nobody replies to my cv",
      "why is my cv being ignored",
      "i send my cv and hear nothing back",
    ],
    keywords: [["cv", "getting", "replies"], ["nobody", "replies", "resume"]],
    faq: false,
    choices: [
      { label: "The format", to: "job-cv-format" },
      { label: "Screening software", to: "job-cv-ats" },
      { label: "Photo and personal details", to: "job-cv-photo" },
      { label: "No UAE experience yet", to: "job-cv-no-uae-experience" },
      { label: "Have you rewrite it", to: "job-us-cv-service" },
    ],
    next: ["job-cv-format", "job-cv-ats", "job-us-cv-service"],
  },
  {
    id: "job-hub-apply",
    question: "Applying and following up",
    answer:
      "Applying to a UAE vacancy is mostly a volume and timing problem, and the part people get wrong is what happens after they send it. Which part are you on?",
    service: CV,
    phrases: [
      "how should i follow up on a job application",
      "applying for jobs in dubai and following up",
      "what happens after i send my application",
      "how many jobs should i apply for in dubai",
    ],
    keywords: [["follow", "application", "dubai"], ["applying", "jobs", "following"]],
    faq: false,
    choices: [
      { label: "Why no replies?", to: "job-apply-no-replies" },
      { label: "How many to send", to: "job-apply-how-many" },
      { label: "When to follow up", to: "job-apply-follow-up-when" },
      { label: "They asked for documents", to: "job-apply-documents-requested" },
      { label: "An unpaid task", to: "job-apply-unpaid-task" },
    ],
    next: ["job-apply-no-replies", "job-apply-how-many", "job-apply-follow-up-when"],
  },
  {
    id: "job-hub-interview",
    question: "I have an interview coming up",
    answer:
      "Interviews here run in stages, and the two questions that decide most outcomes are the one about your pay expectation and the one about your visa status. Which do you want to work on?",
    service: CV,
    phrases: [
      "i have an interview in dubai coming up",
      "how do i prepare for an interview in the uae",
      "what are uae interviews like",
      "interview tips for dubai employers",
    ],
    keywords: [["prepare", "interview", "dubai"], ["interview", "tips", "dubai"]],
    faq: false,
    choices: [
      { label: "The stages", to: "job-interview-stages" },
      { label: "Pay expectations", to: "job-interview-salary-question" },
      { label: "Video interviews", to: "job-interview-video" },
      { label: "What to bring", to: "job-interview-what-to-bring" },
      { label: "What should I ask them?", to: "job-interview-questions-to-ask" },
    ],
    next: ["job-interview-stages", "job-interview-salary-question", "job-interview-video"],
  },
  {
    id: "job-hub-offer",
    question: "I have an offer letter — what should I check?",
    answer:
      "There are two different documents people call an offer letter here: the employer's own letter, and the MOHRE offer letter you sign before a work permit is issued. Confusing them is how people end up working under terms they never agreed. Which are you holding?",
    service: VISA,
    phrases: [
      "i have an offer letter what should i check",
      "what should i look for in a uae job offer",
      "is my job offer letter correct",
      "i received a job offer from a dubai company",
    ],
    keywords: [["offer", "letter", "check"], ["received", "offer", "dubai", "company"]],
    faq: false,
    choices: [
      { label: "Offer letter or contract?", to: "job-offer-letter-vs-contract" },
      { label: "The MOHRE offer letter", to: "job-offer-mohre-letter" },
      { label: "What to check line by line", to: "job-offer-what-to-check" },
      { label: "It changed after I arrived", to: "job-offer-changed-on-arrival" },
      { label: "It is in Arabic", to: "job-offer-arabic" },
    ],
    next: ["job-offer-letter-vs-contract", "job-offer-what-to-check", "job-offer-mohre-letter"],
  },
  {
    id: "job-hub-pay",
    question: "Understanding a UAE salary package",
    answer:
      "A UAE package is split into basic salary and allowances, and that split decides your gratuity, your overtime and what a bank will lend you — so two offers with the same total are not the same offer. What do you want to understand?",
    service: CV,
    phrases: [
      "understanding a uae salary package",
      "explain a dubai salary package to me",
      "what makes up a salary in the uae",
      "basic salary and allowances in dubai",
    ],
    keywords: [["understanding", "salary", "package"], ["salary", "allowances", "dubai"]],
    faq: false,
    choices: [
      { label: "Basic vs allowances", to: "job-pay-basic-vs-allowance" },
      { label: "What should I ask for?", to: "job-pay-what-to-ask-for" },
      { label: "Gratuity", to: "job-pay-gratuity" },
      { label: "Is salary taxed?", to: "job-pay-tax" },
      { label: "My salary is late", to: "job-pay-unpaid-salary" },
    ],
    next: ["job-pay-basic-vs-allowance", "job-pay-what-to-ask-for", "job-pay-gratuity"],
  },
  {
    id: "job-hub-permit",
    question: "From offer to work permit and Emirates ID",
    answer:
      "Once someone wants to hire you, the employer runs a sequence — permit, entry or status change, medical, Emirates ID, residence visa — and you are mostly waiting on them rather than on yourself. Which step are you at?",
    service: VISA,
    phrases: [
      "what happens between the offer and the work permit",
      "steps to get a work permit in the uae",
      "how does the uae employment visa process work",
      "i accepted an offer what happens next with my visa",
    ],
    keywords: [["steps", "work", "permit"], ["employment", "visa", "process"]],
    faq: false,
    choices: [
      { label: "The whole sequence", to: "job-permit-steps" },
      { label: "Who pays for it?", to: "job-permit-who-pays" },
      { label: "The medical test", to: "job-permit-medical" },
      { label: "Emirates ID", to: "job-permit-emirates-id" },
      { label: "My employer is not doing it", to: "job-permit-employer-stalling" },
    ],
    next: ["job-permit-steps", "job-permit-who-pays", "job-permit-medical"],
  },
  {
    id: "job-hub-papers",
    question: "Certificates an employer or the government will ask for",
    answer:
      "The paperwork that stops job offers turning into jobs is nearly always the same short list: your degree, your experience letters, and anything not already in Arabic or English. Which one is being asked of you?",
    service: ATTEST,
    phrases: [
      "which certificates do i need for a job in the uae",
      "what documents will a dubai employer ask for",
      "paperwork needed for a uae job offer",
      "documents required to work in dubai",
    ],
    keywords: [["certificates", "needed", "job", "uae"], ["documents", "required", "work", "dubai"]],
    faq: false,
    choices: [
      { label: "Degree attestation", to: "job-papers-degree-attestation" },
      { label: "MOHRE equivalency", to: "job-papers-equivalency" },
      { label: "Experience certificate", to: "job-papers-experience-letter" },
      { label: "Translating a certificate", to: "job-papers-translation" },
      { label: "I cannot find my degree", to: "job-papers-lost-degree" },
    ],
    next: ["job-papers-degree-attestation", "job-papers-equivalency", "job-papers-experience-letter"],
  },
  {
    id: "job-hub-sectors",
    question: "Getting hired in my particular field",
    answer:
      "Some fields here have a licensing step before anyone can hire you — healthcare, teaching, engineering, law — and in others the gate is purely the employer. Which field are you in?",
    service: CV,
    phrases: [
      "getting hired in my field in dubai",
      "how do i get a job in my profession in the uae",
      "is my profession licensed in dubai",
      "sector specific job advice for the uae",
    ],
    keywords: [["hired", "field", "dubai"], ["profession", "licensed", "dubai"]],
    faq: false,
    choices: [
      { label: "Healthcare and nursing", to: "job-sector-nursing" },
      { label: "Teaching", to: "job-sector-teaching" },
      { label: "Engineering", to: "job-sector-engineering" },
      { label: "Hospitality", to: "job-sector-hospitality" },
      { label: "IT and tech", to: "job-sector-it" },
    ],
    next: ["job-sector-nursing", "job-sector-teaching", "job-sector-engineering"],
  },
  {
    id: "job-hub-people",
    question: "My situation feels like a disadvantage",
    answer:
      "Almost every job seeker here thinks one fact about them is disqualifying — no local experience, a gap, an age, a family back home. Most of them are presentation problems rather than eligibility problems. Which is yours?",
    service: CV,
    phrases: [
      "my situation is a disadvantage for dubai jobs",
      "i think employers in dubai will reject me",
      "am i too old to get a job in dubai",
      "i have no uae experience will anyone hire me",
    ],
    keywords: [["situation", "disadvantage", "dubai"], ["employers", "reject", "dubai"]],
    faq: false,
    choices: [
      { label: "I am a fresher", to: "job-people-fresher" },
      { label: "I have a career gap", to: "job-people-career-gap" },
      { label: "I am over forty-five", to: "job-people-older-candidate" },
      { label: "I am changing field", to: "job-people-career-change" },
      { label: "I am a student", to: "job-people-student" },
    ],
    next: ["job-people-fresher", "job-people-career-gap", "job-people-career-change"],
  },
  {
    id: "job-hub-change",
    question: "Changing jobs while I am already in the UAE",
    answer:
      "Moving between employers here involves your notice, your current employer's cooperation and a permit transfer, and the order matters — resigning before you understand the transfer is how people end up outside the country. Which part?",
    service: VISA,
    phrases: [
      "changing jobs while in the uae",
      "how do i switch employers in dubai",
      "i want to leave my current job in dubai for another",
      "moving to a new employer in the uae",
    ],
    keywords: [["changing", "jobs", "uae"], ["switch", "employers", "dubai"]],
    faq: false,
    choices: [
      { label: "Notice and resignation", to: "job-change-notice" },
      { label: "Do I need an NOC?", to: "job-change-noc" },
      { label: "Is there a labour ban?", to: "job-change-ban" },
      { label: "Transferring the permit", to: "job-change-transfer" },
      { label: "Gratuity when I leave", to: "job-change-gratuity" },
    ],
    next: ["job-change-notice", "job-change-noc", "job-change-ban"],
  },
  {
    id: "job-hub-us",
    question: "What do you do for job seekers?",
    answer:
      "We are not a recruitment agency: we do not place anyone and we never charge you to apply for a listing. What we do is the CV and the paperwork — the writing, the attestation, the translation and the visa filing that an offer turns into. What would you like to know?",
    service: CV,
    phrases: [
      "what do you do for job seekers",
      "are you a recruitment agency",
      "do you find jobs for people",
      "what services do you offer job seekers",
    ],
    keywords: [["recruitment", "agency", "you"], ["find", "jobs", "people"]],
    faq: false,
    choices: [
      { label: "Do you find me a job?", to: "job-us-find-jobs" },
      { label: "How the jobs page works", to: "job-us-jobs-board" },
      { label: "Do you charge job seekers?", to: "job-us-charge-jobseekers" },
      { label: "The CV service", to: "job-us-cv-service" },
      { label: "Talk to someone", to: "job-us-contact" },
    ],
    next: ["job-us-find-jobs", "job-us-jobs-board", "job-us-cv-service"],
  },

  /* ── Where the vacancies are ───────────────────────────────────────────── */
  {
    id: "job-where-portals",
    question: "Which job portals are worth using in the UAE?",
    answer:
      "The large regional boards and the global aggregators both carry UAE vacancies, and most serious employers post to at least one of them. Two habits matter more than the choice of site: complete your profile on each one properly, because recruiters search inside the portal rather than only reading applications, and set alerts for your exact job titles so you are applying on the day a role opens rather than a week later.",
    service: CV,
    phrases: [
      "which job portals are worth using in the uae",
      "best job websites for dubai",
      "what job sites do employers in dubai use",
      "should i use bayt or naukrigulf",
    ],
    keywords: [["job", "portals", "worth"], ["best", "job", "websites", "dubai"]],
    next: ["job-where-linkedin", "job-where-company-careers", "job-apply-how-many"],
  },
  {
    id: "job-where-linkedin",
    question: "How do I use LinkedIn to find work in Dubai?",
    answer:
      "In the UAE, LinkedIn is used as a search tool by recruiters rather than only as a place to post, so being findable matters as much as applying. Put the job title you want — the one used in adverts here, not your internal company title — in your headline, state your location and your current visa status plainly, and follow the companies you are targeting so their vacancies reach you before they are reposted.",
    service: CV,
    phrases: [
      "how do i use linkedin to find work in dubai",
      "does linkedin work for jobs in the uae",
      "how do recruiters search linkedin in dubai",
      "linkedin job search tips for the uae",
    ],
    keywords: [["linkedin", "find", "work"], ["recruiters", "search", "linkedin"]],
    next: ["job-cv-linkedin-headline", "job-cv-linkedin-open-to-work", "job-agency-recruiter-dm"],
  },
  {
    id: "job-where-company-careers",
    question: "Should I apply on company career pages instead?",
    answer:
      "Yes, and for large employers here it is often the only route that reaches a recruiter — group companies, hotel chains, hospitals, banks and semi-government entities run their own portals and screen from there. It is slower to apply that way, so use it for the twenty or thirty employers you actually want rather than as your whole search.",
    service: CV,
    phrases: [
      "should i apply on company career pages",
      "is it better to apply directly to the company website",
      "do dubai companies hire through their own careers page",
      "apply direct to employer or through a portal",
    ],
    keywords: [["company", "career", "pages"], ["apply", "directly", "company", "website"]],
    next: ["job-where-portals", "job-where-cold-email", "job-apply-portal-vs-email"],
  },
  {
    id: "job-where-walkin",
    question: "Are walk-in interviews worth attending?",
    answer:
      "Walk-ins are real and common in hospitality, retail, sales, logistics and construction, and they are the fastest route to a same-day decision in those fields. Take printed CVs, your passport copy and any certificate the advert named, and treat the queue as the interview — screening often starts before you sit down. Be wary of a walk-in held somewhere with no company signage, or one that ends with a request for money.",
    service: CV,
    phrases: [
      "are walk in interviews worth attending",
      "how do walk in interviews work in dubai",
      "should i go to a walk in interview in the uae",
      "what do i take to a walk in interview",
    ],
    keywords: [["walk", "interviews", "worth"], ["walk", "interview", "dubai"]],
    next: ["job-interview-what-to-bring", "job-scam-advance-fee", "job-where-job-fairs"],
  },
  {
    id: "job-where-referrals",
    question: "How much of hiring here happens through referrals?",
    answer:
      "Enough that it should be part of your plan rather than a hope. A referral does not need a close friend: someone who worked at the company, or a former colleague now in the UAE, forwarding your CV internally puts it in front of a person instead of a filter. Ask for a forward to a named role, attach a CV that matches that role, and make it easy for them by writing the two lines they can paste.",
    service: CV,
    phrases: [
      "how much hiring happens through referrals in dubai",
      "do referrals help get a job in the uae",
      "how do i ask someone to refer me for a job",
      "is networking important for jobs in dubai",
    ],
    keywords: [["hiring", "through", "referrals"], ["networking", "important", "jobs"]],
    next: ["job-where-linkedin", "job-where-cold-email", "job-apply-follow-up-message"],
  },
  {
    id: "job-where-job-fairs",
    question: "Are career fairs and hiring events useful?",
    answer:
      "They are useful for meeting employers who screen in person and for sectors that hire in volume, and some are run by free zones, universities or industry bodies rather than by recruiters. Check who is organising it and which companies have confirmed attendance before you travel, and treat any event that charges job seekers an entry or registration fee with suspicion.",
    service: CV,
    phrases: [
      "are career fairs useful in dubai",
      "do job fairs in the uae help",
      "should i attend a hiring event in dubai",
      "where are job fairs held in the uae",
    ],
    keywords: [["career", "fairs", "useful"], ["job", "fairs", "help"]],
    next: ["job-where-walkin", "job-scam-advance-fee", "job-interview-what-to-bring"],
  },
  {
    id: "job-where-social-groups",
    question: "Are jobs posted in messaging groups genuine?",
    answer:
      "Some are — small employers and agencies do post real vacancies in community groups — but this is also where the fake-offer scripts circulate, because a group gives an unknown sender the appearance of a referral. Treat a group post as a lead to verify, not as an employer: find the company independently, check the role exists on their own channel, and never send documents or money to a number that contacted you first.",
    service: CV,
    phrases: [
      "are jobs posted in messaging groups genuine",
      "are telegram job groups real for dubai",
      "someone messaged me a job vacancy on my phone",
      "is a job posted in a community group trustworthy",
    ],
    keywords: [["jobs", "posted", "groups", "genuine"], ["telegram", "job", "groups"]],
    next: ["job-scam-fake-offer-letter", "job-scam-task-scam", "job-agency-licensed"],
  },
  {
    id: "job-where-cold-email",
    question: "Does emailing HR directly ever work?",
    answer:
      "It works when it is specific and fails when it is a mass mailing. Write to a named person or a department about a role that exists, say in the first line which vacancy and where you saw it, and keep the message to a short paragraph with the CV attached as a PDF. Sending the same untargeted message to two hundred addresses mostly earns a spam filter.",
    service: CV,
    phrases: [
      "does emailing hr directly ever work",
      "should i cold email companies in dubai",
      "how do i email my cv to a dubai company",
      "is sending my cv by email a good idea",
    ],
    keywords: [["emailing", "directly", "work"], ["cold", "email", "companies"]],
    next: ["job-cv-file-type", "job-apply-portal-vs-email", "job-where-company-careers"],
  },
  {
    id: "job-where-free-zone-directories",
    question: "Can I find employers through free zone directories?",
    answer:
      "Yes, and it is an underused route: most free zones publish a directory of the companies registered with them, searchable by activity. That gives you a targeted list of real employers in your sector and emirate, which you can then approach through their own careers page or on LinkedIn. It does not tell you who is hiring, so pair it with alerts.",
    service: CV,
    phrases: [
      "can i find employers through free zone directories",
      "how do i get a list of companies in a dubai free zone",
      "where can i find a directory of uae companies",
      "list of employers in dubai free zones",
    ],
    keywords: [["free", "zone", "directories"], ["directory", "uae", "companies"]],
    next: ["job-where-company-careers", "job-where-cold-email", "job-permit-free-zone-vs-mainland"],
  },
  {
    id: "job-where-government",
    question: "How are government and semi-government jobs advertised?",
    answer:
      "Federal and emirate-level entities and the larger semi-government groups recruit through their own portals, and many of their roles are prioritised for UAE nationals under Emiratisation policy — which is a policy that changes, so the entity's own careers page is the place to read the current position rather than a third-party summary. Apply there directly and expect a longer process than a private employer's.",
    service: CV,
    phrases: [
      "how are government jobs advertised in the uae",
      "can an expat work for the dubai government",
      "how do i apply for a semi government job in dubai",
      "where are public sector jobs in the uae posted",
    ],
    keywords: [["government", "jobs", "advertised"], ["expat", "work", "government"]],
    next: ["job-where-company-careers", "job-people-emiratisation", "job-apply-how-many"],
  },
  {
    id: "job-where-agency-database",
    question: "Should I register with agencies even without a vacancy?",
    answer:
      "It is worth registering with the licensed agencies that specialise in your field, because they are briefed on roles before those roles are advertised. Register once, keep your CV current with them, and follow up when you see them advertise something you fit. Registering should never cost you anything — an agency that asks a job seeker for a registration fee is the warning sign, not the service.",
    service: CV,
    phrases: [
      "should i register with agencies without a vacancy",
      "is it worth joining a recruitment database in dubai",
      "how do i get on an agency list in the uae",
      "do agencies keep my cv on file in dubai",
    ],
    keywords: [["register", "agencies", "vacancy"], ["agency", "list", "uae"]],
    next: ["job-agency-licensed", "job-agency-fee", "job-agency-ghosted"],
  },
  {
    id: "job-where-relocating-first",
    question: "Should I move to Dubai first and look for work here?",
    answer:
      "People do it and it works for some, but it is a decision about money and permits rather than about motivation: you need a visa that allows you to be here while you search, a plan for status change if an employer wants to hire you, and enough funds for the whole search rather than the first month. Applying from outside is slower but costs nothing, so many people run both at once.",
    service: VISA,
    phrases: [
      "should i move to dubai first and look for work",
      "is it better to job hunt from inside the uae",
      "can i come to dubai and find a job after arriving",
      "do i need to be in the uae to get hired",
    ],
    keywords: [["move", "dubai", "first", "look"], ["hunt", "inside", "uae"]],
    next: ["job-legal-tourist-visa", "job-legal-from-abroad", "job-legal-jobseeker-visa"],
  },

  /* ── What your visa lets you do ────────────────────────────────────────── */
  {
    id: "job-legal-tourist-visa",
    question: "Can I look for a job on a tourist or visit visa?",
    answer:
      "Attending interviews while you are here as a visitor is ordinary and people do it constantly. What a visit visa does not let you do is start work: you cannot be employed or paid until a work permit is issued in your name, and whether your particular visit visa can be converted in-country or requires you to exit first is set by ICP rules that are revised from time to time. Ask the employer's PRO to check your specific entry type before you count on staying.",
    service: VISA,
    phrases: [
      "can i look for a job on a tourist visa",
      "can i attend interviews on a visit visa in dubai",
      "is it legal to job hunt on a tourist visa in the uae",
      "i am on a visit visa can i get hired",
    ],
    keywords: [["tourist", "visa", "job"], ["visit", "visa", "interviews"], ["visit", "visa", "hired"]],
    next: ["job-legal-status-change", "job-legal-overstay", "job-legal-jobseeker-visa"],
  },
  {
    id: "job-legal-jobseeker-visa",
    question: "What is the job seeker visa and should I get one?",
    answer:
      "The UAE has an entry permit intended for people coming to explore work opportunities without a host or sponsor, aimed at graduates and skilled professionals. Eligibility bands, validity and whether it can be converted to employment are set by ICP and have been adjusted since it launched, so read the current conditions on the official ICP channel rather than an agent's summary. It is a route in, not a permit to work — the work permit is still the employer's step.",
    service: VISA,
    phrases: [
      "what is the job seeker visa",
      "should i get a job seeker visa for the uae",
      "tell me about the uae job exploration visa",
      "is the job seeker visa worth it for dubai",
    ],
    keywords: [["seeker", "visa", "uae"], ["exploration", "visa", "dubai"]],
    next: ["job-legal-tourist-visa", "job-legal-status-change", "job-where-relocating-first"],
  },
  {
    id: "job-legal-status-change",
    question: "Can my visa be changed to employment without leaving the country?",
    answer:
      "Sometimes — an in-country status change is a normal procedure, but whether it is available depends on your current entry type, your nationality and the employer's licence, and the rules move. The employer's PRO or a typing centre can check it against your passport and entry stamp in minutes, and that answer is worth having before you resign from anything or book a flight.",
    service: VISA,
    phrases: [
      "can my visa be changed to employment without leaving",
      "what is an in country status change in the uae",
      "do i have to exit and re enter for a work visa",
      "can i change my visa status inside dubai",
    ],
    keywords: [["status", "change", "country"], ["exit", "enter", "work", "visa"]],
    next: ["job-legal-tourist-visa", "job-permit-steps", "job-permit-employer-stalling"],
  },
  {
    id: "job-legal-cancelled-grace",
    question: "My visa was cancelled — how long can I stay and job hunt?",
    answer:
      "A cancelled residence visa usually comes with a grace period to either leave or move onto another status, and the length depends on your visa type and on current immigration rules rather than on a figure anyone should quote you. Get the cancellation paper the day it is done, check the stated deadline on it, and treat that date as real — overstaying turns a job search into a fine and a re-entry problem.",
    service: VISA,
    phrases: [
      "my visa was cancelled how long can i stay",
      "grace period after visa cancellation in the uae",
      "i lost my job and my visa is cancelled",
      "how long do i have to find a job after cancellation",
    ],
    keywords: [["visa", "cancelled", "stay"], ["grace", "period", "cancellation"]],
    next: ["job-legal-overstay", "job-change-gratuity", "job-hub-where"],
  },
  {
    id: "job-legal-overstay",
    question: "What happens if I overstay while looking for work?",
    answer:
      "Overstaying accrues a daily fine and can affect your ability to be issued a new permit or to re-enter, which is the opposite of what a job search needs. If you are close to the end of a grace period, the options are a permitted status change, a short exit, or an extension where one exists — all of which are ICP matters, and all of which are cheaper than the fine. Speak to a typing centre or the employer's PRO before the deadline rather than after.",
    service: VISA,
    phrases: [
      "what happens if i overstay while looking for work",
      "i have overstayed my visa in dubai what now",
      "are there fines for overstaying in the uae",
      "can i still get a job if i have overstayed",
    ],
    keywords: [["overstay", "looking", "work"], ["overstayed", "visa", "dubai"]],
    next: ["job-legal-cancelled-grace", "job-legal-status-change", "job-permit-visa-rejected"],
  },
  {
    id: "job-legal-from-abroad",
    question: "Can I get a UAE job while still in my home country?",
    answer:
      "Yes, and for licensed professions and senior roles it is the normal route — the employer issues the offer, applies for the permit, and you travel on an employment entry permit. Expect video interviews, expect to be asked for attested certificates earlier than a local candidate would be, and be careful with anyone who offers to arrange the permit for a fee paid by you.",
    service: VISA,
    phrases: [
      "can i get a uae job while in my home country",
      "how do i get hired in dubai from abroad",
      "applying for dubai jobs from outside the uae",
      "can i get a job in dubai from india without coming",
    ],
    keywords: [["hired", "dubai", "abroad"], ["applying", "outside", "uae"]],
    next: ["job-papers-degree-attestation", "job-interview-video", "job-scam-advance-fee"],
  },
  {
    id: "job-legal-dependent-permit",
    question: "I am on my husband's or wife's visa — can I work?",
    answer:
      "Someone on a family or dependent residence visa can usually work once a work permit is issued for them, with the sponsoring family member's consent, and the residence visa itself does not have to change. The employer still applies for the permit, so an employer who says it is impossible is often simply unfamiliar with the route. MOHRE is the authority on the current conditions.",
    service: VISA,
    phrases: [
      "i am on my husband visa can i work",
      "can i work on a dependent visa in the uae",
      "working on a family visa in dubai",
      "can a wife work on her husbands sponsorship in dubai",
    ],
    keywords: [["dependent", "visa", "work"], ["family", "visa", "working"]],
    next: ["job-legal-part-time-permit", "job-permit-steps", "job-permit-who-pays"],
  },
  {
    id: "job-legal-part-time-permit",
    question: "Is part-time or second-job work allowed?",
    answer:
      "MOHRE issues permit types for part-time and for holding more than one job, so it is allowed as a formal arrangement rather than something to do quietly. Each employer's obligations and the consent required depend on the permit type, so the employer applying for it is the one who needs to name which permit they are using. Working for a second employer with no permit is the version that creates problems.",
    service: VISA,
    phrases: [
      "is part time work allowed in the uae",
      "can i work two jobs in dubai",
      "do i need a permit for a second job in the uae",
      "is freelancing alongside my job allowed in dubai",
    ],
    keywords: [["part", "time", "work", "allowed"], ["second", "job", "permit"]],
    next: ["job-legal-freelance-permit", "job-legal-dependent-permit", "job-change-two-jobs"],
  },
  {
    id: "job-legal-freelance-permit",
    question: "Would a freelance permit help while I search?",
    answer:
      "A freelance or self-employment permit lets you work legally for yourself and, depending on the issuing authority, sponsor your own residence — which some people use to stay in the market while they look for a salaried role. It has its own costs and renewal obligations and it is issued by a free zone or by MOHRE rather than by an employer, so compare it against simply applying from abroad before committing.",
    service: VISA,
    phrases: [
      "would a freelance permit help while i search",
      "should i get a freelance visa in dubai",
      "can i freelance while looking for a full time job",
      "is a freelance permit a good way to stay in dubai",
    ],
    keywords: [["freelance", "permit", "search"], ["freelance", "visa", "dubai"]],
    next: ["job-legal-part-time-permit", "job-where-relocating-first", "job-legal-jobseeker-visa"],
  },
  {
    id: "job-legal-student-to-work",
    question: "I am graduating here — how do I move onto a work visa?",
    answer:
      "A student in the UAE moving to employment needs a work permit like anyone else, and the practical sequence is an offer first, then the permit, then the change of status from student sponsorship. Some graduates also qualify for longer-term residence routes aimed at high achievers, which are ICP matters with their own criteria. Start the conversation with your university's student services, who deal with this every year.",
    service: VISA,
    phrases: [
      "i am graduating here how do i move onto a work visa",
      "can a student visa be changed to a work visa in dubai",
      "from student to employee visa in the uae",
      "i finish my degree in dubai what visa do i need to work",
    ],
    keywords: [["student", "visa", "work", "visa"], ["graduating", "work", "permit"]],
    next: ["job-people-student", "job-legal-status-change", "job-people-fresher"],
  },
  {
    id: "job-legal-golden-visa-search",
    question: "Does a golden visa make it easier to get hired?",
    answer:
      "A long-term residence means an employer does not have to sponsor you, which removes a cost and a delay from their side, and some candidates find that helps. It does not remove the work permit step and it is not a substitute for being the right candidate. Eligibility categories are set by ICP and are added to periodically, so check the official criteria rather than an intermediary's claim that they can secure one.",
    service: VISA,
    phrases: [
      "does a golden visa make it easier to get hired",
      "will a golden visa help me find a job in dubai",
      "do employers prefer candidates with their own visa",
      "is a golden visa useful for job hunting",
    ],
    keywords: [["golden", "visa", "hired"], ["golden", "visa", "hunting"]],
    next: ["job-legal-freelance-permit", "job-permit-who-pays", "job-legal-from-abroad"],
  },
  {
    id: "job-legal-emirate-difference",
    question: "Does it matter which emirate the job is in?",
    answer:
      "It matters for your commute, your rent and occasionally for licensing, and it matters for which authority handles your permit — a mainland role in Dubai, a free zone role and a role in another emirate are processed by different bodies. Living in one emirate and working in another is common and legal; a job whose permit is issued in a free zone can sometimes restrict where you may be deployed, which is a question for the employer.",
    service: VISA,
    phrases: [
      "does it matter which emirate the job is in",
      "can i live in sharjah and work in dubai",
      "is a job in abu dhabi different from dubai",
      "does my work permit limit which emirate i work in",
    ],
    keywords: [["which", "emirate", "job"], ["live", "sharjah", "work", "dubai"]],
    next: ["job-permit-free-zone-vs-mainland", "job-pay-cost-of-living", "job-permit-steps"],
  },
  {
    id: "job-legal-criminal-record",
    question: "Will an old case or a police record stop me being hired?",
    answer:
      "Many employers and several authorities ask for a police clearance certificate, and what a particular record means for a particular permit is decided by the authority rather than by the employer — so the honest answer is that it depends on the offence, the jurisdiction and the role. If this applies to you, get advice from a UAE lawyer before you spend money on applications, and do not conceal it on a form you sign.",
    service: VISA,
    phrases: [
      "will a police record stop me being hired in dubai",
      "does an old case affect my uae work visa",
      "can i work in the uae with a criminal record",
      "do employers in dubai check police clearance",
    ],
    keywords: [["police", "record", "hired"], ["criminal", "record", "uae"]],
    next: ["job-papers-police-clearance", "job-permit-visa-rejected", "job-hub-papers"],
  },
  {
    id: "job-legal-medical-condition",
    question: "Could a medical condition affect my employment visa?",
    answer:
      "The residence process includes a medical fitness test, and the conditions screened for and their consequences are set by the health authority, not by the employer — so this is a question for the screening authority or a UAE doctor rather than for a recruiter. Do not let anyone charge you for a promise to get a result changed; that is a scam with a long history here.",
    service: VISA,
    phrases: [
      "could a medical condition affect my employment visa",
      "what happens if i fail the medical test in dubai",
      "does a health problem stop a uae work visa",
      "is the uae medical test strict for employment",
    ],
    keywords: [["medical", "condition", "employment", "visa"], ["fail", "medical", "test"]],
    next: ["job-permit-medical", "job-permit-visa-rejected", "job-scam-advance-fee"],
  },

  /* ── Recruiters and agencies ───────────────────────────────────────────── */
  {
    id: "job-agency-licensed",
    question: "How do I check a recruitment agency is licensed?",
    answer:
      "A recruitment agency operating here needs a licence, and MOHRE publishes and verifies the approved ones — so the check is to ask for the licence name and number and confirm it through MOHRE's own channels rather than to judge by the office or the website. Two other things are worth doing: search the company name with the word complaint, and confirm the address exists. An agency that will not give you a licence number has already answered you.",
    service: CV,
    phrases: [
      "how do i check a recruitment agency is licensed",
      "is this recruitment agency in dubai legitimate",
      "how do i verify an agency with mohre",
      "check if a dubai recruiter is registered",
    ],
    keywords: [["check", "agency", "licensed"], ["verify", "agency", "mohre"]],
    next: ["job-agency-fee", "job-agency-guaranteed-job", "job-scam-report"],
  },
  {
    id: "job-agency-fee",
    question: "A recruitment agency is asking me for a fee — is that allowed?",
    answer:
      "UAE labour law puts recruitment costs on the employer, and a licensed agency charging a job seeker to find them work is acting outside the rules MOHRE licenses it under. That is the general position; the exact wording and the exceptions are MOHRE's to state, and MOHRE is also who you report it to. Separately, paying someone to write your CV or attest a certificate is a different thing — that is a service you buy, not a fee for being considered for a job.",
    service: CV,
    phrases: [
      "a recruitment agency is asking me for a fee",
      "is it legal for an agency to charge a job seeker in the uae",
      "should i pay a recruiter to find me a job in dubai",
      "the agency wants commission from my salary",
    ],
    keywords: [["agency", "asking", "fee"], ["agency", "charge", "seeker"], ["recruiter", "charge", "candidate"]],
    next: ["job-agency-licensed", "job-scam-advance-fee", "job-us-charge-jobseekers"],
  },
  {
    id: "job-agency-ghosted",
    question: "A recruiter interviewed me and then went silent",
    answer:
      "It is common enough that it should not be read as a verdict on you: roles get frozen, budgets move, and a recruiter juggling many mandates deprioritises follow-up. Send one short message to the person you dealt with asking where the role stands, wait a week, then send one more and move on. Keep applying elsewhere in the meantime, because the single worst habit in a job search is waiting on one process.",
    service: CV,
    phrases: [
      "a recruiter interviewed me and then went silent",
      "the recruiter is not replying after my interview",
      "i was ghosted by a dubai recruiter",
      "how long should i wait to hear back from a recruiter",
    ],
    keywords: [["recruiter", "went", "silent"], ["ghosted", "recruiter", "dubai"]],
    next: ["job-apply-follow-up-when", "job-apply-follow-up-message", "job-apply-no-replies"],
  },
  {
    id: "job-agency-overseas-agent",
    question: "Can I trust an agent in my own country offering UAE jobs?",
    answer:
      "Some overseas agents work legitimately with UAE employers, and in a few countries the outbound side is itself regulated by the labour ministry there. The tests are the same as here: a named employer you can verify independently, a written offer that matches what you were told, no payment by you for the job or the visa, and no request to hand over your original passport. If any of those fail, stop.",
    service: CV,
    phrases: [
      "can i trust an agent in my own country offering uae jobs",
      "is a local agent promising a dubai job genuine",
      "my country agent wants money for a dubai job",
      "should i go through an agent back home for gulf jobs",
    ],
    keywords: [["agent", "country", "offering"], ["agent", "promising", "dubai", "job"]],
    next: ["job-scam-advance-fee", "job-scam-fake-offer-letter", "job-agency-licensed"],
  },
  {
    id: "job-agency-guaranteed-job",
    question: "Someone guarantees me a job for a payment — is that real?",
    answer:
      "No. Nobody can guarantee a hiring decision that an employer has not made, and in the UAE charging a job seeker for placement is outside what an agency is licensed to do — so a guarantee plus a fee is two warnings in one sentence. The same goes for a guaranteed visa, a guaranteed medical pass or a guaranteed salary. We do not sell that either: we write CVs and handle documents, and neither of those is a promise of a job.",
    service: CV,
    phrases: [
      "someone guarantees me a job for a payment",
      "is a guaranteed job offer in dubai real",
      "they say i will definitely get the job if i pay",
      "can anyone guarantee me a job in the uae",
    ],
    keywords: [["guarantees", "job", "payment"], ["guaranteed", "job", "dubai"]],
    next: ["job-scam-advance-fee", "job-agency-licensed", "job-us-find-jobs"],
  },
  {
    id: "job-agency-recruiter-dm",
    question: "A recruiter messaged me on LinkedIn — how do I check them?",
    answer:
      "Look at the account rather than the message: how long it has existed, whether the company page is real and has other employees, and whether the role they describe appears on that employer's own channel. A genuine recruiter will happily move to a company email address and name the client. One who insists on staying in a chat app, asks for your passport scan early, or mentions a payment, is not one.",
    service: CV,
    phrases: [
      "a recruiter messaged me on linkedin how do i check them",
      "is this linkedin recruiter genuine",
      "someone contacted me about a dubai job on linkedin",
      "should i reply to a recruiter who messaged me first",
    ],
    keywords: [["recruiter", "messaged", "linkedin"], ["linkedin", "recruiter", "genuine"]],
    next: ["job-scam-fake-offer-letter", "job-agency-licensed", "job-where-linkedin"],
  },
  {
    id: "job-agency-questions-to-ask",
    question: "What should I ask a recruiter before I commit time?",
    answer:
      "Four questions save weeks: who is the employer, is this a live vacancy with an approved budget, what is the salary band the client has set, and what is the process and timeline from here. A recruiter working a real mandate can answer all four. One who cannot name the client or the band is often fishing for CVs to show to employers they have not won yet.",
    service: CV,
    phrases: [
      "what should i ask a recruiter before i commit time",
      "questions to ask a recruitment consultant in dubai",
      "what do i ask a recruiter about a vacancy",
      "how do i know a vacancy is real before interviewing",
    ],
    keywords: [["ask", "recruiter", "before"], ["questions", "recruitment", "consultant"]],
    next: ["job-agency-ghosted", "job-agency-exclusive", "job-interview-questions-to-ask"],
  },
  {
    id: "job-agency-exclusive",
    question: "Can two agencies send my CV to the same employer?",
    answer:
      "It happens and it can cost you the role, because employers treat duplicate submissions as a conflict between agencies and sometimes drop the candidate rather than arbitrate. Keep your own list of which agency sent you where, and tell any recruiter asking to submit you that they must confirm the client name first. Never agree to a submission to an employer you have already applied to directly without saying so.",
    service: CV,
    phrases: [
      "can two agencies send my cv to the same employer",
      "what if two recruiters submit me for the same job",
      "do i have to be exclusive with one recruiter in dubai",
      "duplicate cv submission by agencies in the uae",
    ],
    keywords: [["agencies", "same", "employer"], ["duplicate", "submission", "agencies"]],
    next: ["job-agency-questions-to-ask", "job-apply-apply-again", "job-agency-ghosted"],
  },
  {
    id: "job-agency-typing-centre",
    question: "What is a typing centre and can it help me find a job?",
    answer:
      "A typing centre prepares and submits government applications — permits, status changes, Emirates ID forms, sometimes translations — and they are genuinely useful for the paperwork side of a job move. They are not recruiters and they do not place people, so treat a typing centre offering you a job for a fee as a red flag about that particular shop rather than as a service.",
    service: CV,
    phrases: [
      "what is a typing centre in dubai",
      "can a typing centre help me find a job",
      "difference between a typing centre and a recruitment agency",
      "should i use a typing centre for my visa paperwork",
    ],
    keywords: [["typing", "centre", "dubai"], ["typing", "centre", "recruitment"]],
    next: ["job-legal-status-change", "job-permit-steps", "job-agency-licensed"],
  },
  {
    id: "job-agency-headhunter-difference",
    question: "What is the difference between an agency and a headhunter?",
    answer:
      "An agency fills vacancies it has been given, usually across many clients and levels, and is paid on placement. An executive search firm is retained to find a specific senior person and works a short list. Practically: with an agency, volume and staying visible matter; with a search firm, being known in your industry matters. Neither should ever be charging you.",
    service: CV,
    phrases: [
      "what is the difference between an agency and a headhunter",
      "how does executive search work in the uae",
      "are headhunters different from recruiters in dubai",
      "who pays a headhunter in the uae",
    ],
    keywords: [["difference", "agency", "headhunter"], ["executive", "search", "uae"]],
    next: ["job-agency-questions-to-ask", "job-agency-fee", "job-where-linkedin"],
  },
  {
    id: "job-agency-cv-shared",
    question: "Can an agency send my CV out without telling me?",
    answer:
      "They should not. Your CV carries your contact details, your employer's name and often your salary, and sending it to a client without your consent can reach your current employer. Say in writing that you want to be told the client name before any submission, and keep the thread — it is also what you would show MOHRE if the agency's conduct became a complaint.",
    service: CV,
    phrases: [
      "can an agency send my cv out without telling me",
      "did the recruiter share my cv without permission",
      "who can see my cv when i give it to an agency",
      "my current employer saw my cv from an agency",
    ],
    keywords: [["agency", "send", "telling"], ["recruiter", "share", "permission"]],
    next: ["job-us-data-privacy", "job-agency-exclusive", "job-change-current-employer-reference"],
  },

  /* ── Scams and fake offers ─────────────────────────────────────────────── */
  {
    id: "job-scam-advance-fee",
    question: "They want money before the job — is that normal?",
    answer:
      "It is not. Under UAE labour law the employer carries recruitment and permit costs, so a request for money from you before you start — for the offer, the visa, the medical, the uniform, the training or a processing fee — is the single most reliable sign of a scam. Genuine employers do not take payments from candidates, and a request routed through a personal account or an exchange house should end the conversation.",
    service: CV,
    phrases: [
      "they want money before the job",
      "is it normal to pay a fee before starting a job in dubai",
      "the company asked me to pay a processing fee",
      "i have to pay for my own visa before joining",
    ],
    keywords: [["money", "before", "job"], ["pay", "processing", "fee"], ["asked", "pay", "before", "joining"]],
    next: ["job-scam-visa-deposit", "job-scam-report", "job-permit-who-pays"],
  },
  {
    id: "job-scam-fake-offer-letter",
    question: "How do I tell a fake offer letter from a real one?",
    answer:
      "Check the things a forger gets wrong: the company's trade licence name and number, an address and landline that exist, an email domain that belongs to the employer rather than a free mail provider, your name and job title spelled consistently, and terms that match what you were actually told. Then verify from the other direction — call the company's published number, not the one on the letter. A real employment offer is also followed by a MOHRE offer letter you sign; a scam usually never gets there.",
    service: VISA,
    phrases: [
      "how do i tell a fake offer letter from a real one",
      "is my offer letter genuine",
      "how do i verify a uae offer letter",
      "the offer letter looks suspicious to me",
    ],
    keywords: [["fake", "offer", "letter"], ["verify", "offer", "letter"]],
    next: ["job-offer-mohre-letter", "job-scam-fake-mohre-link", "job-scam-report"],
  },
  {
    id: "job-scam-visa-deposit",
    question: "They asked for a refundable visa deposit",
    answer:
      "The word refundable is doing the work in that sentence. Visa and permit costs sit with the employer, and a deposit you are promised back after joining is a standard script — the joining date moves, then the contact stops answering. If an employer genuinely wants a security arrangement, it belongs in a signed contract and is a question to ask MOHRE about before you pay anything.",
    service: CV,
    phrases: [
      "they asked for a refundable visa deposit",
      "is a security deposit for a job normal in dubai",
      "the employer wants a deposit i get back later",
      "should i pay a refundable amount for my work visa",
    ],
    keywords: [["refundable", "visa", "deposit"], ["security", "deposit", "job"]],
    next: ["job-scam-advance-fee", "job-permit-who-pays", "job-scam-report"],
  },
  {
    id: "job-scam-passport-held",
    question: "My employer or agent is keeping my passport",
    answer:
      "Your passport is yours. An employer holding it against your will is not permitted, and MOHRE treats it as a complaint matter — the passport may be handed over briefly for a specific government step, but not retained. Ask for it in writing, keep the reply, and if it is refused, raise it with MOHRE through their app or hotline. Do not surrender your passport to an agent at any stage of a job application.",
    service: CV,
    phrases: [
      "my employer is keeping my passport",
      "can a company hold my passport in the uae",
      "the agent took my passport and will not return it",
      "is it legal for an employer to keep my passport in dubai",
    ],
    keywords: [["employer", "keeping", "passport"], ["company", "hold", "passport"]],
    next: ["job-scam-report", "job-permit-passport-during", "job-change-absconding"],
  },
  {
    id: "job-scam-task-scam",
    question: "Someone offered me easy online tasks for daily pay",
    answer:
      "That is a well-documented fraud rather than a job: you are paid small amounts for simple tasks, then asked to deposit your own money to unlock bigger ones, and the balance you can see is not real. It usually arrives as a chat message from a stranger and uses the name of a real company. There is no work being done and there is no employer — leave the group and report the number.",
    service: CV,
    phrases: [
      "someone offered me easy online tasks for daily pay",
      "is the part time task job offer real",
      "i was offered money for liking videos",
      "a stranger offered me a work from home job with daily payment",
    ],
    keywords: [["online", "tasks", "daily"], ["liking", "videos", "money"]],
    next: ["job-scam-report", "job-where-social-groups", "job-scam-advance-fee"],
  },
  {
    id: "job-scam-fake-mohre-link",
    question: "I was sent a link to pay a government fee",
    answer:
      "Check the domain before anything else: UAE government services sit on official government domains, and a payment page reached from a message rather than from the authority's own site is the standard phishing route. Neither MOHRE nor ICP asks a candidate to pay an employment permit fee through a link in a chat. Open the authority's app or website yourself and look for the transaction there.",
    service: CV,
    phrases: [
      "i was sent a link to pay a government fee",
      "is this mohre payment link real",
      "the company sent me a visa payment page",
      "how do i know a uae government website is genuine",
    ],
    keywords: [["link", "government", "fee"], ["mohre", "payment", "link"]],
    next: ["job-scam-advance-fee", "job-scam-report", "job-offer-mohre-letter"],
  },
  {
    id: "job-scam-too-good-salary",
    question: "The salary offered seems too high for the role",
    answer:
      "Treat it as a question rather than a windfall. Compare the figure with what the same title is advertised at by real employers, check that the offer names a licensed company you can verify, and see whether the package is described properly or is a single round number with no breakdown. Inflated pay with a vague employer, an urgent deadline and a fee request is the complete scam pattern.",
    service: CV,
    phrases: [
      "the salary offered seems too high for the role",
      "is this salary offer too good to be true",
      "they are offering far more than the market rate",
      "unrealistic salary in a dubai job offer",
    ],
    keywords: [["salary", "offered", "high"], ["unrealistic", "salary", "offer"]],
    next: ["job-scam-fake-offer-letter", "job-pay-market-rate", "job-scam-report"],
  },
  {
    id: "job-scam-no-office",
    question: "The company has no traceable office or website",
    answer:
      "A UAE employer has a trade licence, and that means a registered name, an activity and an address you can look up with the licensing authority or the free zone. If you cannot find any of that, and the interview is being held in a hotel lobby or over a chat app only, you do not yet know who you are talking to. Ask for the licence copy — a real employer will send it.",
    service: CV,
    phrases: [
      "the company has no traceable office or website",
      "i cannot find the company that is hiring me",
      "how do i check a dubai company actually exists",
      "the employer has no office address",
    ],
    keywords: [["company", "traceable", "office"], ["check", "company", "exists"]],
    next: ["job-scam-fake-offer-letter", "job-agency-licensed", "job-where-free-zone-directories"],
  },
  {
    id: "job-scam-training-fee",
    question: "They want me to pay for training or certification first",
    answer:
      "If the training is a condition of the job, it is the employer's cost, and a required certificate that only one named provider can issue for a fee you pay is a common variation of the advance-fee scam. Genuine licensing exams do exist in regulated professions — a nurse's or a teacher's licence, for instance — but those are paid to the authority or an approved test centre, not to a recruiter, and you can verify them independently.",
    service: CV,
    phrases: [
      "they want me to pay for training or certification first",
      "do i have to pay for a course to get the job",
      "the employer says i must buy a certificate",
      "is paid training before a job offer normal in dubai",
    ],
    keywords: [["pay", "training", "certification"], ["buy", "certificate", "employer"]],
    next: ["job-scam-advance-fee", "job-sector-nursing", "job-scam-report"],
  },
  {
    id: "job-scam-urgency",
    question: "They are pressuring me to decide within hours",
    answer:
      "Pressure is a technique. A real employer will let you read the offer, check the company and ask questions, because they want you to arrive and stay. An urgent deadline attached to a payment, a travel booking or a document handover is there to stop you checking. Slow it down by one day and most of these collapse on their own.",
    service: CV,
    phrases: [
      "they are pressuring me to decide within hours",
      "the recruiter says i must accept immediately",
      "is urgency a sign of a job scam",
      "they want an answer today or the offer goes",
    ],
    keywords: [["pressuring", "decide", "hours"], ["accept", "immediately", "recruiter"]],
    next: ["job-scam-advance-fee", "job-offer-negotiate", "job-scam-report"],
  },
  {
    id: "job-scam-identity-documents",
    question: "Is it safe to send my passport copy to an employer?",
    answer:
      "A passport copy is needed at the permit stage, so it is a normal request from an employer who has made you an offer — and an abnormal one from someone you have only chatted with, because a clean scan of your passport and photograph is worth money to an identity fraudster. Send it once there is a verified employer and a written offer, mark the copy with the purpose and date if you can, and never send it to a personal account.",
    service: CV,
    phrases: [
      "is it safe to send my passport copy to an employer",
      "should i send my passport scan to a recruiter",
      "when do i give my documents to a company in dubai",
      "the recruiter wants my passport copy before interview",
    ],
    keywords: [["safe", "send", "passport", "copy"], ["passport", "scan", "recruiter"]],
    next: ["job-us-data-privacy", "job-scam-fake-offer-letter", "job-permit-steps"],
  },
  {
    id: "job-scam-report",
    question: "Where do I report a job scam in the UAE?",
    answer:
      "Labour and recruitment complaints go to MOHRE through their app, website or call centre, and fraud or a financial loss goes to the police in the emirate concerned — Dubai Police and Abu Dhabi Police both take cybercrime reports online. Keep everything: the messages, the letter, the account details you were sent, the numbers. Reporting also matters when you did not lose money, because it is what gets a fake employer's pattern noticed.",
    service: CV,
    phrases: [
      "where do i report a job scam in the uae",
      "how do i complain about a recruitment agency in dubai",
      "who do i report a fake job offer to",
      "i lost money to a job scam in dubai",
    ],
    keywords: [["report", "job", "scam"], ["complain", "recruitment", "agency"]],
    next: ["job-scam-advance-fee", "job-agency-licensed", "job-pay-unpaid-salary"],
  },
  {
    id: "job-scam-after-paying",
    question: "I already paid — what can I do now?",
    answer:
      "Act on the same day if you can. Tell your bank or the exchange house immediately, because a transfer that has not been collected can sometimes be stopped; file a police report in the emirate where it happened and a MOHRE complaint if an agency was involved; and stop all further payments, including any request for a fee to release your earlier money, which is the second stage of the same fraud. Keep the reference numbers — you will need them for everything after.",
    service: CV,
    phrases: [
      "i already paid what can i do now",
      "i paid an agent for a job and got nothing",
      "can i get my money back from a job scam",
      "i was cheated by a recruitment agency in dubai",
    ],
    keywords: [["already", "paid", "now"], ["money", "back", "scam"], ["cheated", "recruitment", "agency"]],
    next: ["job-scam-report", "job-scam-advance-fee", "job-hub-where"],
  },

  /* ── The CV, the cover letter and the profile ──────────────────────────── */
  {
    id: "job-cv-format",
    question: "What format should a UAE CV be in?",
    answer:
      "A plain reverse-chronological layout in a single column: name and contact details, a short professional summary, then each role with the company, your title, the dates and what you achieved. No tables, no text boxes, no columns, no graphics behind the text — those are what break the software that reads it first. Consistent dates and a clear job title on every role matter more than anything decorative.",
    service: CV,
    phrases: [
      "what format should a uae cv be in",
      "what layout do dubai employers expect on a cv",
      "should my cv be one column or two",
      "is a creative cv design a good idea in dubai",
    ],
    keywords: [["format", "cv", "uae"], ["layout", "cv", "dubai"]],
    next: ["job-cv-ats", "job-cv-length", "job-us-cv-service"],
  },
  {
    id: "job-cv-length",
    question: "How long should my CV be?",
    answer:
      "Two pages for most people, three if you are senior with a long publication or project list, one if you are a fresher. Length is not the real issue — relevance is: recruiters here read the first half of the first page and decide, so your most recent role and your strongest achievements belong there rather than after a paragraph about your hobbies.",
    service: CV,
    phrases: [
      "how long should my cv be for dubai",
      "how many pages should a uae cv have",
      "is a two page cv too long for dubai",
      "should i shorten my cv for uae employers",
    ],
    keywords: [["long", "cv", "dubai"], ["pages", "cv", "uae"]],
    next: ["job-cv-format", "job-cv-achievements", "job-cv-common-mistakes"],
  },
  {
    id: "job-cv-photo",
    question: "Should I put a photo on my CV?",
    answer:
      "Photos are common on CVs in this region and many recruiters expect one, which is different from most European markets. If you include one, use a plain, professional headshot against a neutral background and keep it small. If you would rather not, that is also fine and is rarely the reason an application fails — the content decides.",
    service: CV,
    phrases: [
      "should i put a photo on my cv",
      "do uae employers want a photo on a resume",
      "is a picture needed on a dubai cv",
      "what kind of photo goes on a gulf cv",
    ],
    keywords: [["photo", "cv", "uae"], ["picture", "needed", "cv"]],
    next: ["job-cv-personal-details", "job-cv-format", "job-cv-common-mistakes"],
  },
  {
    id: "job-cv-personal-details",
    question: "Which personal details belong on a Gulf CV?",
    answer:
      "Nationality, current location and visa status are genuinely useful here because they answer a recruiter's first two questions. Date of birth, marital status, religion and passport number are commonly seen but are not required, and passport numbers should never be on a document you email widely. Include your city and country, a phone number in international format and one email address you check.",
    service: CV,
    phrases: [
      "which personal details belong on a gulf cv",
      "should i put my date of birth on my cv in dubai",
      "do i need to write my nationality and marital status on a cv",
      "what contact details go on a uae resume",
    ],
    keywords: [["personal", "details", "cv"], ["nationality", "marital", "status"]],
    next: ["job-cv-visa-status-line", "job-cv-photo", "job-us-data-privacy"],
  },
  {
    id: "job-cv-ats",
    question: "How do I get my CV past the screening software?",
    answer:
      "Applicant tracking systems parse your CV into fields and then rank it against the advert, so the fixes are mechanical: a normal font, no tables or columns, real section headings, your job titles written the way the market writes them, and the skills and tools from the advert appearing in the body where they are true. Submit a PDF unless the portal asks for Word, and never hide keywords in white text — parsers read them and recruiters notice.",
    service: CV,
    phrases: [
      "how do i get my cv past the screening software",
      "what is an ats and how do i beat it",
      "why does the portal reject my cv automatically",
      "how do i make my resume machine readable",
    ],
    keywords: [["cv", "screening", "software"], ["resume", "machine", "readable"], ["ats", "beat", "resume"]],
    next: ["job-cv-keywords-from-advert", "job-cv-format", "job-cv-file-type"],
  },
  {
    id: "job-cv-keywords-from-advert",
    question: "How do I use the advert's own words in my CV?",
    answer:
      "Take the advert, list the eight or ten things it actually asks for, and make sure each one it is true of you appears somewhere concrete in your CV — in a bullet that shows you doing it, not in a keyword list. Use their vocabulary rather than your company's internal name for the same thing. Do not claim what you cannot discuss in an interview; the point is to be findable, not to be caught.",
    service: CV,
    phrases: [
      "how do i use the advert words in my cv",
      "should i tailor my cv to each job description",
      "how do i match my resume to the job advert",
      "which keywords should i add to my cv",
    ],
    keywords: [["advert", "words", "cv"], ["tailor", "cv", "description"], ["match", "resume", "advert"]],
    next: ["job-cv-one-per-role", "job-cv-ats", "job-cv-achievements"],
  },
  {
    id: "job-cv-one-per-role",
    question: "Do I need a different CV for every application?",
    answer:
      "Not a new CV — a base CV plus a tailored top. Keep one well-written master, then adjust the summary line, the order of your bullets and a handful of terms to match each advert. Ten tailored applications beat a hundred identical ones, and the tailoring takes a few minutes once the master is right.",
    service: CV,
    phrases: [
      "do i need a different cv for every application",
      "should i rewrite my cv for each job in dubai",
      "is one cv enough for all applications",
      "how much should i change my cv per role",
    ],
    keywords: [["different", "cv", "every", "application"], ["rewrite", "cv", "each", "job"]],
    next: ["job-cv-keywords-from-advert", "job-apply-how-many", "job-us-cv-service"],
  },
  {
    id: "job-cv-achievements",
    question: "How do I write achievements instead of duties?",
    answer:
      "A duty says what you were responsible for; an achievement says what changed because you were there. Write the action, then the result, then the scale — what you did, what it improved, and over how many people, sites, accounts or systems. If you cannot measure it, describe the before and after. Three strong lines per role read better than ten copied from a job description.",
    service: CV,
    phrases: [
      "how do i write achievements instead of duties",
      "how do i make my cv bullet points stronger",
      "what should each job on my cv say",
      "how do i show results on my resume",
    ],
    keywords: [["achievements", "instead", "duties"], ["bullet", "points", "stronger"]],
    next: ["job-cv-length", "job-us-cv-service", "job-cv-common-mistakes"],
  },
  {
    id: "job-cv-no-uae-experience",
    question: "I have no UAE experience — how do I get past that?",
    answer:
      "Make the parallel obvious rather than hoping they see it. Name the international standards, systems and markets you have worked to, put any multinational or regional client work where it is visible, and say plainly in your summary that you are targeting the UAE and are ready to relocate or already here. If you hold a certification recognised here, put it near the top.",
    service: CV,
    phrases: [
      "i have no uae experience how do i get past that",
      "will dubai employers hire someone with no gulf experience",
      "how do i get a job in dubai without local experience",
      "does gulf experience matter for uae employers",
    ],
    keywords: [["no", "uae", "experience"], ["gulf", "experience", "matter"]],
    next: ["job-people-fresher", "job-cv-achievements", "job-hub-where"],
  },
  {
    id: "job-cv-gap",
    question: "How do I explain a gap on my CV?",
    answer:
      "Briefly, factually, and in the CV rather than leaving a hole for the reader to fill in — a line naming the period and the reason, whether that was caring for family, relocation, study, illness or a redundancy followed by a search. Add anything you did in the time that is relevant: a course, freelance work, volunteering. Gaps are ordinary here; an unexplained gap invites a worse guess than the truth.",
    service: CV,
    phrases: [
      "how do i explain a gap on my cv",
      "i was unemployed for a year what do i write",
      "does a career break look bad to dubai employers",
      "how do i cover a gap between jobs on my resume",
    ],
    keywords: [["explain", "gap", "cv"], ["career", "break", "employers"]],
    next: ["job-people-career-gap", "job-interview-gap-question", "job-cv-achievements"],
  },
  {
    id: "job-cv-file-type",
    question: "Should I send my CV as a PDF or a Word file?",
    answer:
      "PDF by default, because it keeps your layout on every device and cannot be edited by accident. Send Word only when a portal or an agency asks for it, which some do because their system reformats. Name the file with your own name and the role rather than cv-final-v3, and keep it under a couple of megabytes so it is not stripped by a mail filter.",
    service: CV,
    phrases: [
      "should i send my cv as a pdf or a word file",
      "what file format do recruiters prefer for a cv",
      "does pdf break the application system",
      "how should i name my cv file",
    ],
    keywords: [["pdf", "word", "cv"], ["file", "format", "recruiters"]],
    next: ["job-cv-ats", "job-where-cold-email", "job-apply-portal-vs-email"],
  },
  {
    id: "job-cv-arabic-version",
    question: "Do I need an Arabic version of my CV?",
    answer:
      "For most private-sector roles, English is enough and an Arabic CV is not expected. It helps for some government, semi-government and Arabic-language customer roles, and it is expected if the advert itself is in Arabic. What is more often needed is certified Arabic translation of your certificates rather than of your CV — those are different documents with different requirements.",
    service: CV,
    phrases: [
      "do i need an arabic version of my cv",
      "should my resume be translated into arabic for dubai",
      "is an english cv enough for uae jobs",
      "do employers in dubai read arabic cvs",
    ],
    keywords: [["arabic", "version", "cv"], ["english", "cv", "enough"]],
    next: ["job-papers-translation", "job-sector-government-arabic", "job-cv-format"],
  },
  {
    id: "job-cv-references",
    question: "Should I list references on my CV?",
    answer:
      "Not on the CV itself. Keep a separate sheet with two or three referees, their titles and how to reach them, ask their permission first, and give it when it is requested. Putting private phone numbers on a document you send to dozens of employers is unfair to the referee, and references available on request is understood everywhere.",
    service: CV,
    phrases: [
      "should i list references on my cv",
      "do i put referee details on my resume",
      "when do employers in dubai check references",
      "who should i use as a reference for a uae job",
    ],
    keywords: [["references", "cv", "list"], ["referee", "details", "resume"]],
    next: ["job-apply-reference-check", "job-change-current-employer-reference", "job-papers-experience-letter"],
  },
  {
    id: "job-cv-salary-expectation-line",
    question: "Should my CV state my expected salary?",
    answer:
      "Leave it off the CV unless the advert asks for it, in which case answer in the covering message rather than the document. A figure on the CV either prices you out before anyone has met you or anchors you below what the role pays. If a portal forces a number, give a range and say it depends on the full package.",
    service: CV,
    phrases: [
      "should my cv state my expected salary",
      "do i write my expected salary on my resume",
      "the application form asks for expected salary",
      "should i mention my current salary in my cv",
    ],
    keywords: [["cv", "expected", "salary"], ["expected", "salary", "resume"]],
    next: ["job-interview-salary-question", "job-pay-what-to-ask-for", "job-pay-market-rate"],
  },
  {
    id: "job-cv-visa-status-line",
    question: "Should I mention my visa status on my CV?",
    answer:
      "Yes, in one short line, because it is the first thing a UAE recruiter needs to know and its absence causes CVs to be skipped. Say what is true and simple — on a visit visa in Dubai, on a cancelled visa with a grace period, on a family visa, or applying from abroad and free to relocate. Do not overstate it; the permit stage checks.",
    service: CV,
    phrases: [
      "should i mention my visa status on my cv",
      "do recruiters care about my visa status in dubai",
      "how do i write my visa situation on my resume",
      "should i say i am on a visit visa when applying",
    ],
    keywords: [["mention", "visa", "status", "cv"], ["visa", "situation", "resume"]],
    next: ["job-legal-tourist-visa", "job-interview-visa-question", "job-cv-personal-details"],
  },
  {
    id: "job-cv-summary-objective",
    question: "What should the summary at the top of my CV say?",
    answer:
      "Three or four lines that a recruiter could read alone and know what you are: your discipline and years in it, the sectors or markets you know, two or three things you are demonstrably good at, and what you are looking for now. Write it for the role you are applying to. Delete anything that could appear on anyone's CV — dynamic, hardworking, team player.",
    service: CV,
    phrases: [
      "what should the summary at the top of my cv say",
      "do i need a career objective on my resume",
      "how do i write a professional summary for a uae cv",
      "what goes in the profile section of a cv",
    ],
    keywords: [["summary", "top", "cv"], ["career", "objective", "resume"], ["professional", "summary", "cv"]],
    next: ["job-cv-achievements", "job-cv-keywords-from-advert", "job-us-cv-service"],
  },
  {
    id: "job-cv-skills-section",
    question: "How should I write the skills section?",
    answer:
      "Keep it to things that can be verified and that the advert asks for: systems, tools, languages, standards, certifications. Skip the rating bars — they say nothing and confuse the parser. Soft skills belong in the achievement lines where they are evidenced, not in a list of adjectives.",
    service: CV,
    phrases: [
      "how should i write the skills section of my cv",
      "what skills do i put on a dubai resume",
      "should i use skill rating bars on my cv",
      "where do soft skills go on a cv",
    ],
    keywords: [["skills", "section", "cv"], ["skills", "dubai", "resume"]],
    next: ["job-cv-keywords-from-advert", "job-cv-certificates-section", "job-cv-format"],
  },
  {
    id: "job-cv-certificates-section",
    question: "Which qualifications and certificates should I list?",
    answer:
      "Your highest relevant qualification with the institution and year, plus any licence or certification that a UAE employer or authority actually asks for in your field. List the issuing body, because that is what gets checked later. If your degree will need attestation or an equivalency for the visa, it is worth knowing that before an employer asks rather than after.",
    service: CV,
    phrases: [
      "which qualifications and certificates should i list on my cv",
      "how do i show my degree on a uae resume",
      "should i list short courses on my cv",
      "do i need to mention my certifications for dubai jobs",
    ],
    keywords: [["qualifications", "certificates", "list"], ["degree", "uae", "resume"]],
    next: ["job-papers-degree-attestation", "job-papers-equivalency", "job-cv-skills-section"],
  },
  {
    id: "job-cv-common-mistakes",
    question: "What are the most common CV mistakes here?",
    answer:
      "The recurring ones: a duties list copied from the job description, no dates or inconsistent ones, a design that the parser cannot read, three pages before the first achievement, an email address nobody would use professionally, no visa or location line, and a file called cv.pdf with no name in it. Each is quick to fix and each costs applications.",
    service: CV,
    phrases: [
      "what are the most common cv mistakes",
      "what puts recruiters off a resume in dubai",
      "why do employers reject cvs in the uae",
      "biggest resume errors for gulf applications",
    ],
    keywords: [["common", "cv", "mistakes"], ["resume", "errors", "gulf"]],
    next: ["job-cv-format", "job-cv-achievements", "job-us-cv-service"],
  },
  {
    id: "job-cv-ai-written",
    question: "Is it a problem if my CV was written by AI?",
    answer:
      "The risk is not detection, it is sameness: a generated CV tends to produce the same phrasing and the same generic claims as everyone else's, and an interviewer will ask you about a line you did not write. Use it as a draft, then put your own numbers, systems and specifics into every bullet so the document survives a conversation.",
    service: CV,
    phrases: [
      "is it a problem if my cv was written by ai",
      "can employers tell my resume was ai generated",
      "should i use chatgpt to write my cv for dubai",
      "is an ai written cover letter a bad idea",
    ],
    keywords: [["cv", "written", "artificial"], ["resume", "generated", "employers"]],
    next: ["job-cv-achievements", "job-us-cv-service", "job-cover-letter-content"],
  },
  {
    id: "job-cover-letter-needed",
    question: "Does anyone here read cover letters?",
    answer:
      "Portals rarely require one and many recruiters skim it, but it earns its place in two situations: applying by email, where it is the body of your message, and applying for something where the fit needs explaining — a career change, a relocation, a gap. Three short paragraphs, not a page.",
    service: CV,
    phrases: [
      "does anyone read cover letters in dubai",
      "do i need a cover letter for uae jobs",
      "is a cover letter worth writing for dubai applications",
      "should i attach a cover letter or not",
    ],
    keywords: [["read", "cover", "letters"], ["need", "cover", "letter"]],
    next: ["job-cover-letter-content", "job-where-cold-email", "job-us-cv-service"],
  },
  {
    id: "job-cover-letter-content",
    question: "What should a cover letter actually say?",
    answer:
      "First line: which role and where you saw it. Middle: the two or three things in your background that map directly onto what the advert asks for, with a specific example rather than an adjective. Last line: your visa or availability position and a clear offer to talk. Address a person if you can find one, and never open with the words I am writing to apply.",
    service: CV,
    phrases: [
      "what should a cover letter actually say",
      "how do i write a covering letter for a dubai job",
      "what goes in the email when i send my cv",
      "cover letter structure for uae applications",
    ],
    keywords: [["cover", "letter", "say"], ["covering", "letter", "dubai"], ["email", "send", "cv"]],
    next: ["job-cover-letter-needed", "job-where-cold-email", "job-us-cv-service"],
  },
  {
    id: "job-cv-linkedin-headline",
    question: "What should my LinkedIn headline and profile say?",
    answer:
      "Your headline is a search field, so it should contain the job title you want and your discipline, not a slogan. Fill the location as the city you are in or targeting, write the about section as you would a CV summary, and make sure the roles and dates match your CV exactly — recruiters compare them, and a mismatch reads as carelessness at best.",
    service: CV,
    phrases: [
      "what should my linkedin headline say",
      "how do i improve my linkedin profile for dubai recruiters",
      "does my linkedin need to match my cv",
      "how do i write a linkedin about section",
    ],
    keywords: [["linkedin", "headline", "say"], ["improve", "linkedin", "profile"]],
    next: ["job-cv-linkedin-open-to-work", "job-where-linkedin", "job-us-cv-service"],
  },
  {
    id: "job-cv-linkedin-open-to-work",
    question: "Should I use the open to work badge?",
    answer:
      "Opinions differ and neither choice decides anything. The badge makes you easier to find and signals availability, which helps most people looking openly; the discreet setting tells recruiters only, which is the sensible option if your current employer should not know. What matters more is that your headline and location are right, because that is what the search actually matches.",
    service: CV,
    phrases: [
      "should i use the open to work badge",
      "does the linkedin open to work frame help in dubai",
      "will my employer see that i am looking on linkedin",
      "is it bad to show i am job hunting on linkedin",
    ],
    keywords: [["open", "work", "badge"], ["employer", "see", "looking", "linkedin"]],
    next: ["job-cv-linkedin-headline", "job-change-current-employer-reference", "job-where-linkedin"],
  },
  {
    id: "job-cv-portfolio",
    question: "Do I need a portfolio or a personal website?",
    answer:
      "In design, marketing, content, architecture and most software roles a portfolio does more work than the CV — link it in the header and make sure the link opens without a login. In other fields it is optional and a clean LinkedIn profile is enough. If you do build one, keep it loading fast on a phone and put the work first.",
    service: CV,
    phrases: [
      "do i need a portfolio or a personal website",
      "should i build a website for my job search",
      "how do i show my work to dubai employers",
      "is a portfolio link useful on a cv",
    ],
    keywords: [["portfolio", "personal", "website"], ["show", "work", "employers"]],
    next: ["job-cv-linkedin-headline", "job-sector-it", "job-us-other-services"],
  },

  /* ── Applying, and what happens after ──────────────────────────────────── */
  {
    id: "job-apply-no-replies",
    question: "Why do I never hear back from applications?",
    answer:
      "Usually one of four things: the CV is not being parsed or not matching the advert's own terms, your visa and location are not stated so you are assumed to need sponsorship from abroad, you are applying to roles a level away from your evidence, or the vacancy was already filled internally. Fix the first two, then test by applying to ten well-matched roles with a tailored CV and counting replies rather than guessing.",
    service: CV,
    phrases: [
      "why do i never hear back from applications",
      "i applied to hundreds of jobs with no response in dubai",
      "why is nobody responding to my job applications",
      "no interview calls from dubai companies",
    ],
    keywords: [["never", "hear", "back", "applications"], ["nobody", "responding", "applications"]],
    next: ["job-cv-ats", "job-cv-visa-status-line", "job-apply-how-many"],
  },
  {
    id: "job-apply-how-many",
    question: "How many jobs should I apply for a day?",
    answer:
      "A steady number you can tailor properly — for most people that is a handful a day rather than fifty, with the balance of your time spent on referrals and direct approaches, which convert better. Track what you sent and where, so you can tell the difference between a CV problem and a targeting problem after two weeks instead of after two months.",
    service: CV,
    phrases: [
      "how many jobs should i apply for a day",
      "how many applications a week is enough in dubai",
      "is applying to many jobs at once bad",
      "should i apply to every vacancy i see",
    ],
    keywords: [["many", "jobs", "apply", "day"], ["applications", "week", "enough"]],
    next: ["job-apply-tracking", "job-cv-one-per-role", "job-where-referrals"],
  },
  {
    id: "job-apply-tracking",
    question: "How should I keep track of my applications?",
    answer:
      "A single sheet with the company, the role, the date, the route you used and the outcome. It stops duplicate submissions, tells you when a follow-up is due, and shows you the pattern — which sectors reply, which sources are dead — which is the only way a long search improves instead of repeating. It is also what you will need if two agencies claim the same submission.",
    service: CV,
    phrases: [
      "how should i keep track of my applications",
      "should i make a spreadsheet of jobs i applied to",
      "how do i organise my job search in dubai",
      "i forget which companies i applied to",
    ],
    keywords: [["track", "applications", "keep"], ["organise", "job", "search"]],
    next: ["job-apply-follow-up-when", "job-agency-exclusive", "job-apply-how-many"],
  },
  {
    id: "job-apply-follow-up-when",
    question: "When should I follow up after applying?",
    answer:
      "About a week after applying, and again a week after an interview if you were told to expect news. Once per stage is professional; more than that works against you. If two follow-ups get no answer, mark it closed in your tracker and put the energy into new applications — a role that has gone quiet twice has usually gone quiet for reasons that have nothing to do with you.",
    service: CV,
    phrases: [
      "when should i follow up after applying",
      "how soon can i chase a job application in dubai",
      "how many times should i follow up with a recruiter",
      "is it rude to follow up on an application",
    ],
    keywords: [["follow", "after", "applying"], ["chase", "job", "application"]],
    next: ["job-apply-follow-up-message", "job-agency-ghosted", "job-apply-tracking"],
  },
  {
    id: "job-apply-follow-up-message",
    question: "What should a follow-up message say?",
    answer:
      "Short and easy to act on: the role and the date you applied, one line on why you fit, and a direct question — is the position still open, and is there anything you can send. Keep it to four sentences, send it to the person if you have a name, and do not attach the CV again unless you are asked. Tone matters more than length; polite and specific gets answered.",
    service: CV,
    phrases: [
      "what should a follow up message say",
      "how do i write a follow up email to a recruiter",
      "what do i say when chasing my application",
      "sample message to check on a job application",
    ],
    keywords: [["follow", "message", "say"], ["email", "recruiter", "chasing"]],
    next: ["job-apply-follow-up-when", "job-interview-after-thank-you", "job-agency-ghosted"],
  },
  {
    id: "job-apply-portal-vs-email",
    question: "Is it better to apply through the portal or email HR?",
    answer:
      "Apply through whatever the advert names, because that is where the process actually runs, and only then add a direct approach — a short note to the hiring manager or recruiter saying you have applied. Skipping the portal usually means your application does not exist as far as the system is concerned, which is why some people are certain they applied and the company is certain they did not.",
    service: CV,
    phrases: [
      "is it better to apply through the portal or email hr",
      "should i email hr as well as applying online",
      "my application is not showing in the company system",
      "do companies in dubai see portal applications",
    ],
    keywords: [["portal", "email", "apply"], ["email", "well", "applying", "online"]],
    next: ["job-where-cold-email", "job-where-company-careers", "job-apply-tracking"],
  },
  {
    id: "job-apply-apply-again",
    question: "Can I apply to the same company again?",
    answer:
      "Yes, for a different role, or for the same role a few months later if it is reposted — reapplying is normal and a previous rejection is rarely recorded as a bar. What does not work is applying to five vacancies at one company in a week, which reads as untargeted. Pick the closest role, tailor it, and mention any previous conversation you had there.",
    service: CV,
    phrases: [
      "can i apply to the same company again",
      "how long before i reapply to a company in dubai",
      "i was rejected can i apply again to the same employer",
      "is it bad to apply for several roles at one company",
    ],
    keywords: [["apply", "same", "company", "again"], ["rejected", "apply", "again"]],
    next: ["job-apply-tracking", "job-apply-rejection-feedback", "job-agency-exclusive"],
  },
  {
    id: "job-apply-wrong-role",
    question: "I applied for the wrong role — what now?",
    answer:
      "Send one short message to the recruiter naming the role you meant and asking them to consider you for that instead. It happens constantly and nobody holds it against you. If you have already been screened out for the wrong role, apply properly to the right one and say in your note that you had applied in error previously.",
    service: CV,
    phrases: [
      "i applied for the wrong role what now",
      "i sent my application to the wrong job",
      "can i change which position i applied for",
      "i attached the wrong cv to my application",
    ],
    keywords: [["applied", "wrong", "role"], ["attached", "wrong", "cv"]],
    next: ["job-apply-follow-up-message", "job-apply-apply-again", "job-cv-one-per-role"],
  },
  {
    id: "job-apply-documents-requested",
    question: "They want my documents before any interview",
    answer:
      "Some of it is reasonable and some is not. A CV, a passport copy of the photo page and your certificates in scanned form are ordinary once a real process has started; your original passport, your bank details, a full family list or a payment never are. Ask what the documents are for and who is receiving them, and send scans rather than originals.",
    service: CV,
    phrases: [
      "they want my documents before any interview",
      "is it normal to send certificates before an interview",
      "the company asked for my documents very early",
      "should i give my papers before i meet the employer",
    ],
    keywords: [["documents", "before", "interview"], ["certificates", "before", "interview"]],
    next: ["job-scam-identity-documents", "job-us-data-privacy", "job-papers-degree-attestation"],
  },
  {
    id: "job-apply-reference-check",
    question: "When and how do employers check references?",
    answer:
      "Usually after an interview and often just before or just after an offer, sometimes through a third-party screening company that also verifies your degree and your employment dates. Tell your referees to expect it, make sure the dates and titles you gave match your CV, and keep copies of your experience certificates — a verification that cannot be completed can hold up a permit.",
    service: CV,
    phrases: [
      "when and how do employers check references",
      "will my employer be contacted before an offer",
      "what does background verification involve in the uae",
      "do dubai companies verify previous employment",
    ],
    keywords: [["employers", "check", "references"], ["background", "verification", "uae"]],
    next: ["job-papers-experience-letter", "job-change-current-employer-reference", "job-cv-references"],
  },
  {
    id: "job-apply-aptitude-test",
    question: "What are the tests some employers send?",
    answer:
      "Typically a timed aptitude or personality assessment, or a technical test in your discipline, and they are used to shortlist before anyone reads your CV closely. Do them somewhere quiet, on a proper connection, within the window given, and do not have someone else take them — the interview covers the same ground and the gap shows. Ask how long it should take before you start.",
    service: CV,
    phrases: [
      "what are the tests some employers send",
      "i was asked to do an online assessment for a dubai job",
      "how do i prepare for an aptitude test from an employer",
      "is a personality test part of uae hiring",
    ],
    keywords: [["tests", "employers", "send"], ["online", "assessment", "job"], ["aptitude", "test", "prepare"]],
    next: ["job-apply-unpaid-task", "job-interview-technical-test", "job-interview-stages"],
  },
  {
    id: "job-apply-unpaid-task",
    question: "They want a large unpaid task as part of hiring",
    answer:
      "A short exercise is normal practice. A full deliverable — a complete campaign, a working build, a finished design — is work, and being asked for it before any interview is worth questioning. Offer a scoped sample of a couple of hours, or a redacted piece of past work, and ask who will own what you produce. A company that will not answer that is telling you something about the job.",
    service: CV,
    phrases: [
      "they want a large unpaid task as part of hiring",
      "is an unpaid assignment normal in a job interview",
      "the employer asked me to do free work as a test",
      "how big should a hiring task be",
    ],
    keywords: [["unpaid", "task", "hiring"], ["free", "work", "test"]],
    next: ["job-apply-aptitude-test", "job-interview-technical-test", "job-scam-training-fee"],
  },
  {
    id: "job-apply-rejection-feedback",
    question: "Can I ask why I was rejected?",
    answer:
      "You can, and about a third of the time you get something useful. Ask once, in two lines, for one thing you could improve for a similar role — that is easier to answer than why did you reject me, which invites silence for legal reasons. Take any pattern you hear more than once seriously and change the CV or the targeting accordingly.",
    service: CV,
    phrases: [
      "can i ask why i was rejected",
      "how do i get feedback after a failed interview",
      "should i ask the recruiter what went wrong",
      "why did i not get the job in dubai",
    ],
    keywords: [["ask", "rejected", "feedback"], ["feedback", "failed", "interview"]],
    next: ["job-apply-apply-again", "job-interview-after-thank-you", "job-cv-common-mistakes"],
  },
  {
    id: "job-apply-overqualified",
    question: "I keep being told I am overqualified",
    answer:
      "It usually means one of two things: the budget is below your last salary, or they think you will leave when something better appears. Address both directly — say what package range you are working to and why this role fits what you want now. If it is a deliberate step down, explain the reason in a line rather than leaving them to invent one.",
    service: CV,
    phrases: [
      "i keep being told i am overqualified",
      "employers say i am too senior for the role",
      "how do i apply for a lower position in dubai",
      "is it bad to apply for a job below my level",
    ],
    keywords: [["told", "overqualified"], ["senior", "role", "employers"], ["lower", "position", "apply"]],
    next: ["job-pay-salary-drop", "job-people-career-change", "job-interview-salary-question"],
  },

  /* ── Interviews ────────────────────────────────────────────────────────── */
  {
    id: "job-interview-stages",
    question: "How many interview stages should I expect?",
    answer:
      "Commonly three: a screening call from HR or the agency, an interview with the hiring manager, and a final round with a department head or the owner, with a test somewhere in between for technical roles. Smaller companies compress it into one meeting and a decision. Ask at the first stage how many rounds there are and who you will meet — it tells you where you are in the process and stops you reading a delay as a rejection.",
    service: CV,
    phrases: [
      "how many interview stages should i expect",
      "what are the rounds of a uae job interview",
      "how long does the hiring process take in dubai",
      "what is the interview process at dubai companies",
    ],
    keywords: [["interview", "stages", "expect"], ["rounds", "job", "interview"]],
    next: ["job-interview-phone-screen", "job-interview-second-round", "job-interview-questions-to-ask"],
  },
  {
    id: "job-interview-phone-screen",
    question: "What happens on the first screening call?",
    answer:
      "It is short and it is about filters, not depth: your current role, your notice, your visa status, your salary expectation and whether you are in the country. Have those five answers ready in a sentence each. Take the call somewhere you can hear, have the advert open in front of you, and ask what the next stage is before you hang up.",
    service: CV,
    phrases: [
      "what happens on the first screening call",
      "what does hr ask on a first phone call",
      "how do i pass a recruiter screening call",
      "the recruiter wants a quick call what will they ask",
    ],
    keywords: [["first", "screening", "call"], ["recruiter", "screening", "call"]],
    next: ["job-interview-salary-question", "job-interview-visa-question", "job-interview-stages"],
  },
  {
    id: "job-interview-video",
    question: "How do I handle a video interview?",
    answer:
      "Treat it as an in-person interview with three extra jobs: test the link and the sound beforehand, sit where the light is in front of you and the background is plain, and look at the camera when you answer. Keep your CV and the advert on paper rather than on screen, have a phone number ready in case the call drops, and join a couple of minutes early.",
    service: CV,
    phrases: [
      "how do i handle a video interview",
      "tips for an online interview with a dubai employer",
      "what should i do to prepare for a teams interview",
      "is a video interview different from a face to face one",
    ],
    keywords: [["handle", "video", "interview"], ["online", "interview", "employer"]],
    next: ["job-interview-recorded", "job-interview-dress-code", "job-interview-stages"],
  },
  {
    id: "job-interview-recorded",
    question: "They sent me a one-way recorded interview",
    answer:
      "A one-way interview records your answers to fixed questions with no interviewer present, and it is used for volume screening. Do it as if a person were there: sit up, look at the lens, and answer in structured points — situation, what you did, what resulted. Most systems allow a practice question, so use it, and check whether you get one take or several before you start.",
    service: CV,
    phrases: [
      "they sent me a one way recorded interview",
      "how do i do a recorded video interview",
      "what is a one way interview for a job",
      "i have to record answers for an application",
    ],
    keywords: [["recorded", "interview", "way"], ["record", "answers", "application"]],
    next: ["job-interview-video", "job-apply-aptitude-test", "job-interview-stages"],
  },
  {
    id: "job-interview-what-to-bring",
    question: "What do I take to an interview here?",
    answer:
      "Printed copies of your CV, your passport and visa page copy, your Emirates ID if you have one, copies of the certificates relevant to the role, and your experience letters. Take the originals of nothing unless asked, and know the building and parking situation beforehand — the heat and the traffic here make a late arrival more likely than you expect.",
    service: CV,
    phrases: [
      "what do i take to an interview here",
      "what documents should i bring to a dubai interview",
      "do i need printed copies of my cv for an interview",
      "what to carry for a walk in interview in the uae",
    ],
    keywords: [["take", "interview", "documents"], ["bring", "dubai", "interview"]],
    next: ["job-interview-dress-code", "job-where-walkin", "job-papers-experience-letter"],
  },
  {
    id: "job-interview-dress-code",
    question: "How should I dress for a UAE interview?",
    answer:
      "Business formal is the safe default across most sectors here, and slightly conservative is better than slightly casual whatever the company's own dress code turns out to be. Dress modestly — covered shoulders and knees — for any government, semi-government or family-business setting. For a site or trade role, clean and practical is fine; ask the recruiter if you are unsure.",
    service: CV,
    phrases: [
      "how should i dress for a uae interview",
      "what should i wear to an interview in dubai",
      "is a suit necessary for a dubai interview",
      "interview dress code for women in the uae",
    ],
    keywords: [["dress", "uae", "interview"], ["wear", "interview", "dubai"]],
    next: ["job-interview-what-to-bring", "job-interview-stages", "job-people-women"],
  },
  {
    id: "job-interview-salary-question",
    question: "What do I say when they ask my salary expectation?",
    answer:
      "Answer with a range rather than a single figure, based on what the role is advertised at here and on the full package rather than the basic, and say that it depends on what the package includes — accommodation, transport, insurance, ticket. If you can, ask what band they have set for the role first. Do not name your current salary as your expectation; they are different questions.",
    service: CV,
    phrases: [
      "what do i say when they ask my salary expectation",
      "how do i answer the expected salary question in an interview",
      "should i tell them my current salary in dubai",
      "what salary should i say in a uae interview",
    ],
    keywords: [["salary", "expectation", "say"], ["expected", "salary", "question", "interview"]],
    next: ["job-pay-what-to-ask-for", "job-pay-market-rate", "job-pay-basic-vs-allowance"],
  },
  {
    id: "job-interview-visa-question",
    question: "How do I answer questions about my visa status?",
    answer:
      "Plainly and in one sentence, because a vague answer here is what ends interviews: say what you are on, how long it runs, and what would be needed for them to employ you. If you are on a visit visa or in a grace period, say so and say that you understand the employer applies for the permit. Never imply you already hold a permit you do not.",
    service: CV,
    phrases: [
      "how do i answer questions about my visa status",
      "what do i say if they ask about my visa in an interview",
      "the interviewer asked if i need sponsorship",
      "how do i explain that i am on a visit visa",
    ],
    keywords: [["answer", "questions", "visa", "status"], ["interviewer", "asked", "sponsorship"]],
    next: ["job-legal-tourist-visa", "job-cv-visa-status-line", "job-permit-steps"],
  },
  {
    id: "job-interview-notice-question",
    question: "They asked how soon I can join",
    answer:
      "Give a real date based on your notice period and, if you are abroad, on the permit and travel time — an answer that turns out to be impossible costs you more than a longer honest one. If you are available immediately, say so and why, because a cancelled visa with a grace period is a genuine advantage to an employer in a hurry.",
    service: CV,
    phrases: [
      "they asked how soon i can join",
      "what do i say about my notice period in an interview",
      "how do i answer when can you start",
      "i am available immediately how do i say it",
    ],
    keywords: [["soon", "join", "asked"], ["notice", "period", "interview"]],
    next: ["job-change-notice", "job-legal-cancelled-grace", "job-offer-what-to-check"],
  },
  {
    id: "job-interview-why-dubai",
    question: "Why do they ask why I want to come to Dubai?",
    answer:
      "Because employers here have been burned by people who leave within a year, so they are testing whether you have a reason to stay. Answer about the work and the market — the sector, the scale of projects, where your career goes here — rather than about the weather or the tax position. If your family is relocating with you, that is a stability signal worth mentioning.",
    service: CV,
    phrases: [
      "why do they ask why i want to come to dubai",
      "how do i answer why do you want to work in the uae",
      "what is a good reason to give for moving to dubai",
      "they asked why i left my last country",
    ],
    keywords: [["want", "come", "dubai"], ["reason", "moving", "dubai"]],
    next: ["job-interview-questions-to-ask", "job-people-family-back-home", "job-interview-stages"],
  },
  {
    id: "job-interview-gap-question",
    question: "How do I explain my gap in the interview?",
    answer:
      "In two sentences: what the period was, and what you did in it. Caring for a parent, a relocation, a redundancy and a long search, study, recovery — all ordinary. Then move the conversation forward to what you have been doing to stay current. Interviewers are checking for evasion rather than for a perfect record.",
    service: CV,
    phrases: [
      "how do i explain my gap in the interview",
      "the interviewer asked why i was not working",
      "how do i talk about being unemployed in an interview",
      "what do i say about a break in my career",
    ],
    keywords: [["explain", "gap", "interview"], ["unemployed", "interview", "talk"]],
    next: ["job-cv-gap", "job-people-career-gap", "job-interview-weakness"],
  },
  {
    id: "job-interview-weakness",
    question: "What about the weakness and the tell-me-about-yourself questions?",
    answer:
      "For yourself: ninety seconds, structured as what you do, one or two proof points, and why this role. For the weakness: one real and specific thing, plus what you now do about it — not a disguised strength, which every interviewer has heard. Prepare three stories you can adapt, each with a situation, your action and a measurable result.",
    service: CV,
    phrases: [
      "how do i answer the weakness question",
      "what do i say to tell me about yourself",
      "how do i prepare answers for common interview questions",
      "what are the standard interview questions in dubai",
    ],
    keywords: [["weakness", "question", "answer"], ["common", "interview", "questions"]],
    next: ["job-interview-questions-to-ask", "job-interview-stages", "job-interview-gap-question"],
  },
  {
    id: "job-interview-questions-to-ask",
    question: "What should I ask the interviewer?",
    answer:
      "Ask things that decide whether you want the job: what the first six months look like, why the position is open, who you report to, how the team is structured, and what the package includes beyond the basic. Ask about the permit and the joining process too — it is a normal question and the answer tells you whether they have done this before. Never end with no questions at all.",
    service: CV,
    phrases: [
      "what should i ask the interviewer",
      "good questions to ask at the end of an interview",
      "what do i ask a dubai employer in an interview",
      "should i ask about salary in the first interview",
    ],
    keywords: [["ask", "interviewer", "questions"], ["questions", "end", "interview"]],
    next: ["job-offer-what-to-check", "job-pay-what-package-includes", "job-interview-second-round"],
  },
  {
    id: "job-interview-technical-test",
    question: "How do technical interviews work here?",
    answer:
      "Much as anywhere: a problem in your discipline, sometimes live, sometimes as a take-home with a deadline. What is worth knowing is that many employers here also test for standards and regulations specific to the region — codes in engineering, licensing in healthcare, VAT and IFRS in finance — so revise the local framework as well as your craft. Ask what the test will cover; most interviewers will tell you.",
    service: CV,
    phrases: [
      "how do technical interviews work here",
      "what will a technical test for a dubai job include",
      "do uae employers test local regulations",
      "how do i prepare for a practical job test",
    ],
    keywords: [["technical", "interviews", "work"], ["technical", "test", "include"]],
    next: ["job-apply-aptitude-test", "job-apply-unpaid-task", "job-sector-engineering"],
  },
  {
    id: "job-interview-second-round",
    question: "What is different about the final interview?",
    answer:
      "The later rounds are usually about fit and terms rather than capability — you have already been judged competent. Expect a senior person, more questions about how you work with others, and the first serious conversation about package and start date. Come with your questions about the role's scope and reporting line, and be ready to give a number if asked.",
    service: CV,
    phrases: [
      "what is different about the final interview",
      "what happens in a second round interview in dubai",
      "i have a final interview with the manager what should i expect",
      "does the last interview decide the salary",
    ],
    keywords: [["final", "interview", "different"], ["second", "round", "interview"]],
    next: ["job-interview-salary-question", "job-offer-negotiate", "job-interview-after-thank-you"],
  },
  {
    id: "job-interview-panel",
    question: "How do I handle a panel interview?",
    answer:
      "Answer to the person who asked, then include the others with your eyes as you finish. Get everyone's name and role at the start, and if two people ask different versions of the same question, answer both rather than referring back. Panels are common in government, education and healthcare here, and the notes are often scored against fixed criteria — so structured answers help you.",
    service: CV,
    phrases: [
      "how do i handle a panel interview",
      "i have an interview with several people at once",
      "what is a panel interview like in the uae",
      "tips for a group interview in dubai",
    ],
    keywords: [["panel", "interview", "handle"], ["group", "interview", "dubai"]],
    next: ["job-interview-stages", "job-interview-weakness", "job-sector-government-arabic"],
  },
  {
    id: "job-interview-after-thank-you",
    question: "Should I send a message after the interview?",
    answer:
      "Yes — a short note the same day or the next, to whoever arranged it: thank them for their time, name one thing from the conversation that confirmed your interest, and confirm you are happy to send anything further. It is remembered more often than people expect, and it gives you a legitimate thread to follow up in later.",
    service: CV,
    phrases: [
      "should i send a message after the interview",
      "do i need to send a thank you email after an interview",
      "what do i write to the interviewer afterwards",
      "is following up after an interview expected in dubai",
    ],
    keywords: [["message", "after", "interview"], ["email", "after", "interview"]],
    next: ["job-apply-follow-up-when", "job-apply-rejection-feedback", "job-interview-employer-no-show"],
  },
  {
    id: "job-interview-employer-no-show",
    question: "The employer did not turn up to the interview",
    answer:
      "It happens, and once is not a verdict — a rescheduling request the same day is worth accepting. Twice, or no explanation at all, tells you how the company treats people, which is information you would otherwise have paid for. Ask for a new time in writing, and keep applying elsewhere while you wait.",
    service: CV,
    phrases: [
      "the employer did not turn up to the interview",
      "the company missed our scheduled interview",
      "my interview was cancelled at the last minute",
      "the interviewer never joined the video call",
    ],
    keywords: [["employer", "turn", "interview"], ["missed", "scheduled", "interview"]],
    next: ["job-agency-ghosted", "job-apply-follow-up-message", "job-scam-no-office"],
  },
  {
    id: "job-interview-travel-cost",
    question: "Will they pay for me to travel to an interview?",
    answer:
      "For senior or specialist roles some employers do arrange or reimburse travel, and for everything else they usually do not — video interviews exist for exactly this reason. Ask before you book, get the answer in writing, and never pay a third party who offers to arrange an interview trip for you. Do not travel on the strength of an unverified employer.",
    service: CV,
    phrases: [
      "will they pay for me to travel to an interview",
      "does the company reimburse interview travel in the uae",
      "should i fly to dubai for an interview",
      "who pays for an interview trip",
    ],
    keywords: [["pay", "travel", "interview"], ["reimburse", "interview", "travel"]],
    next: ["job-interview-video", "job-scam-advance-fee", "job-legal-from-abroad"],
  },

  /* ── The offer letter and the contract ─────────────────────────────────── */
  {
    id: "job-offer-letter-vs-contract",
    question: "What is the difference between an offer letter and a contract?",
    answer:
      "The employer's offer letter sets out what they are proposing and is the document you negotiate. The MOHRE offer letter is the standard-form one you sign before the work permit is applied for, and the employment contract registered with MOHRE or the free zone authority is what governs the job once you start. All three should say the same thing — the point of reading them together is to catch it when they do not.",
    service: VISA,
    phrases: [
      "difference between an offer letter and a contract",
      "is an offer letter the same as an employment contract in the uae",
      "how many documents do i sign when joining a dubai company",
      "which document is the real contract in the uae",
    ],
    keywords: [["difference", "offer", "letter", "contract"], ["real", "contract", "uae"]],
    next: ["job-offer-mohre-letter", "job-offer-what-to-check", "job-offer-changed-on-arrival"],
  },
  {
    id: "job-offer-mohre-letter",
    question: "What is the MOHRE offer letter?",
    answer:
      "It is the standard offer the Ministry of Human Resources and Emiratisation requires for a mainland job: the employer submits it, you sign it, and the work permit application follows. Because it is registered with the ministry, it is the version that matters if your employer later presents different terms — so read it properly, keep a copy, and make sure the salary, the job title and the contract type on it are the ones you agreed. Free zones run an equivalent process through their own authority.",
    service: VISA,
    phrases: [
      "what is the mohre offer letter",
      "why am i signing an offer letter with the ministry",
      "what is the standard uae employment offer",
      "do i sign an offer before the work permit",
    ],
    keywords: [["mohre", "offer", "letter"], ["ministry", "offer", "signing"]],
    next: ["job-offer-what-to-check", "job-permit-steps", "job-offer-changed-on-arrival"],
  },
  {
    id: "job-offer-what-to-check",
    question: "What should I check line by line in an offer?",
    answer:
      "The employer's registered name, your job title, the basic salary and each allowance separately, the contract type and duration, the probation length and its notice, the notice period after probation, working hours and days, annual leave, the ticket entitlement, medical insurance, who pays visa costs, and any bond or repayment clause. Anything you were told verbally that is not in the document does not exist — ask for it to be added before you sign.",
    service: VISA,
    phrases: [
      "what should i check line by line in an offer",
      "what do i look for in a uae employment contract",
      "how do i review my dubai job offer",
      "which clauses matter in a uae contract",
    ],
    keywords: [["check", "line", "offer"], ["review", "dubai", "job", "offer"], ["clauses", "matter", "contract"]],
    next: ["job-offer-probation", "job-offer-bond-clause", "job-pay-what-package-includes"],
  },
  {
    id: "job-offer-arabic",
    question: "My contract is in Arabic — what do I do?",
    answer:
      "Do not sign a document you cannot read. UAE contracts are frequently bilingual, and where the two versions differ the Arabic is generally the one that governs — which is exactly why a certified translation is worth having before signing rather than after a dispute. Ask the employer for the bilingual version first; if they only hold an Arabic one, have it translated by a legal translator.",
    service: TRANSLATE,
    phrases: [
      "my contract is in arabic what do i do",
      "the employment contract is only in arabic",
      "should i sign an arabic contract i cannot read",
      "which language version of a uae contract counts",
    ],
    keywords: [["contract", "arabic", "sign"], ["arabic", "contract", "read"]],
    next: ["job-papers-translation", "job-offer-what-to-check", "job-offer-copy"],
  },
  {
    id: "job-offer-probation",
    question: "How does probation work in the UAE?",
    answer:
      "UAE labour law caps how long a probation period may last and sets notice requirements that apply during it — including different notice depending on whether you are leaving the country or moving to another UAE employer, and in some cases a recruitment-cost reimbursement to the first employer. The specifics are in the law and its resolutions rather than in an employer's summary, so check the clause in your contract against MOHRE's own guidance.",
    service: VISA,
    phrases: [
      "how does probation work in the uae",
      "what are my rights during probation in dubai",
      "can i resign during my probation period in the uae",
      "how long can probation last in a uae job",
    ],
    keywords: [["probation", "work", "uae"], ["resign", "probation", "period"]],
    next: ["job-change-notice", "job-offer-what-to-check", "job-change-probation-exit"],
  },
  {
    id: "job-offer-contract-type",
    question: "Limited or unlimited contract — which do I have?",
    answer:
      "The UAE moved private-sector employment onto fixed-term contracts, so the older unlimited-contract framework no longer applies in the way people remember it, and renewal and end-of-term rules changed with it. What governs you is the current law plus the term written into your own registered contract — so read the end date and the renewal clause, and confirm anything you were told about the old system, because a lot of the advice circulating is out of date.",
    service: VISA,
    phrases: [
      "limited or unlimited contract which do i have",
      "is my uae contract fixed term",
      "what happened to unlimited contracts in the uae",
      "what type of employment contract do dubai companies use",
    ],
    keywords: [["limited", "unlimited", "contract"], ["fixed", "term", "contract"]],
    next: ["job-offer-what-to-check", "job-change-early-exit", "job-change-gratuity"],
  },
  {
    id: "job-offer-working-hours",
    question: "What should the contract say about hours and days off?",
    answer:
      "It should state your daily and weekly hours, your rest day or days, and how overtime is treated — the law sets maximum hours, reduced hours during Ramadan for those it applies to, and rules on overtime compensation. If your role involves shifts, night work or a six-day week, that belongs in the contract rather than in a conversation. Where the contract is silent, the law applies, but silence is how disputes start.",
    service: VISA,
    phrases: [
      "what should the contract say about hours and days off",
      "what are normal working hours in the uae",
      "is a six day week normal in dubai",
      "does my contract have to mention overtime",
    ],
    keywords: [["contract", "hours", "days"], ["normal", "working", "hours"]],
    next: ["job-pay-overtime", "job-offer-leave", "job-offer-what-to-check"],
  },
  {
    id: "job-offer-leave",
    question: "What leave am I entitled to?",
    answer:
      "The law sets minimum annual leave, public holidays, sick leave and parental entitlements, and your contract may improve on them but not reduce them. Check how leave accrues in your first year, whether the ticket entitlement is annual or every two years, and what happens to untaken leave when you resign. MOHRE publishes the current minimums, which is where to confirm rather than an employer's handbook.",
    service: VISA,
    phrases: [
      "what leave am i entitled to in the uae",
      "how much annual leave do dubai employees get",
      "does my contract have to give sick leave",
      "what about public holidays in a uae job",
    ],
    keywords: [["leave", "entitled", "uae"], ["annual", "leave", "employees"]],
    next: ["job-offer-working-hours", "job-pay-what-package-includes", "job-change-gratuity"],
  },
  {
    id: "job-offer-notice-clause",
    question: "What notice period should the contract have?",
    answer:
      "The law sets a band for notice and your contract states the figure within it that applies to you, usually the same for both sides. Read it before you sign, because it is what you will have to serve when you resign and what an employer can hold you to — and check whether payment in lieu is allowed, since that is what makes a fast move possible.",
    service: VISA,
    phrases: [
      "what notice period should the contract have",
      "how much notice do i have to give in the uae",
      "can my employer make me serve three months notice",
      "is payment in lieu of notice allowed in dubai",
    ],
    keywords: [["notice", "period", "contract"], ["notice", "give", "uae"]],
    next: ["job-change-notice", "job-interview-notice-question", "job-offer-what-to-check"],
  },
  {
    id: "job-offer-job-title",
    question: "The job title on the permit is not the one I was offered",
    answer:
      "It happens because permit titles come from the ministry's own occupation list, and the nearest listed title is used — which is usually harmless. It matters when it is not harmless: some professional licences, some family sponsorship categories and some future employers look at the permit title. Ask why the title differs and get the real role written into the contract's duties.",
    service: VISA,
    phrases: [
      "the job title on the permit is not the one i was offered",
      "why is my labour card designation different",
      "does the title on my visa matter in the uae",
      "my contract title does not match my actual job",
    ],
    keywords: [["title", "permit", "offered"], ["labour", "card", "designation"]],
    next: ["job-permit-labour-card", "job-offer-what-to-check", "job-permit-family-sponsorship"],
  },
  {
    id: "job-offer-bond-clause",
    question: "The contract has a bond or repayment clause",
    answer:
      "Clauses requiring you to repay training, recruitment or relocation costs if you leave early do appear here, and whether a particular one is enforceable depends on the law and on how it is drafted — which is a question for a UAE lawyer rather than for a recruiter. Before signing, ask for the amount, the period and what triggers it to be written explicitly, and be very careful with anything that ties your passport or your visa to the debt.",
    service: VISA,
    phrases: [
      "the contract has a bond or repayment clause",
      "is a training bond legal in the uae",
      "my employer wants me to repay visa costs if i leave",
      "what is a clawback clause in a dubai contract",
    ],
    keywords: [["bond", "repayment", "clause"], ["repay", "costs", "leave"]],
    next: ["job-offer-non-compete", "job-permit-who-pays", "job-offer-what-to-check"],
  },
  {
    id: "job-offer-non-compete",
    question: "Is a non-compete clause enforceable here?",
    answer:
      "Non-competition clauses exist in UAE contracts and the law limits them by time, place and type of work, with conditions on how they can be relied on — so a broad clause is not automatically effective, and a narrow one may well be. If your field is small here and the clause is wide, get it reviewed or negotiated before signing rather than testing it when you want to leave.",
    service: VISA,
    phrases: [
      "is a non compete clause enforceable here",
      "can my dubai employer stop me joining a competitor",
      "what does a non competition clause mean in the uae",
      "is a restraint clause in my contract valid",
    ],
    keywords: [["compete", "clause", "enforceable"], ["competitor", "joining", "employer"]],
    next: ["job-offer-bond-clause", "job-change-ban", "job-offer-what-to-check"],
  },
  {
    id: "job-offer-verbal",
    question: "I have a verbal offer — is that binding?",
    answer:
      "Treat it as an intention, not an offer. Nothing is settled here until there is a written offer and, for a mainland role, a MOHRE offer letter you have signed. Do not resign, give notice, cancel a visa or book travel on a phone call — ask for the written version, and if it does not arrive within a few days, ask again before you act.",
    service: VISA,
    phrases: [
      "i have a verbal offer is that binding",
      "they offered me the job on the phone",
      "should i resign after a verbal job offer in dubai",
      "is a spoken job offer enough in the uae",
    ],
    keywords: [["verbal", "offer", "binding"], ["offered", "job", "phone"]],
    next: ["job-offer-withdrawn", "job-change-notice", "job-offer-what-to-check"],
  },
  {
    id: "job-offer-withdrawn",
    question: "The offer was withdrawn after I accepted",
    answer:
      "Painful and not rare, particularly where a budget or a permit approval was not final. What you can do depends on how far it had gone: a signed contract or a registered MOHRE offer is a different position from an email, and if you resigned or cancelled a visa in reliance on it, that is worth a consultation with a UAE lawyer. Meanwhile, tell your previous employer immediately if your notice has not run out.",
    service: VISA,
    phrases: [
      "the offer was withdrawn after i accepted",
      "the company cancelled my job offer in dubai",
      "they revoked the offer after i resigned",
      "can an employer take back a job offer in the uae",
    ],
    keywords: [["offer", "revoked", "accepted"], ["cancelled", "job", "offer"]],
    next: ["job-offer-verbal", "job-legal-cancelled-grace", "job-pay-unpaid-salary"],
  },
  {
    id: "job-offer-two-offers",
    question: "I have two offers — how do I compare them?",
    answer:
      "Compare the whole package rather than the headline: basic salary, because gratuity and overtime follow it, then allowances, insurance for you and your family, the ticket, the leave, the notice period and any bond. Then compare the things that do not appear in a spreadsheet — who you report to, whether the employer has done permits before, and how they behaved during hiring, which is the best predictor of how they will behave after.",
    service: CV,
    phrases: [
      "i have two offers how do i compare them",
      "how do i choose between two job offers in dubai",
      "which uae job offer is better",
      "comparing job offers in the uae",
    ],
    keywords: [["two", "offers", "compare"], ["choose", "between", "offers"]],
    next: ["job-pay-basic-vs-allowance", "job-offer-negotiate", "job-pay-what-package-includes"],
  },
  {
    id: "job-offer-negotiate",
    question: "Can I negotiate an offer here?",
    answer:
      "Yes, and it is expected within reason — most employers have a band and a first offer is often not the top of it. Negotiate once, on the whole package, with a reason attached: market rate for the title, a specific certification, the relocation you are funding. Be ready to accept the answer either way, and get any agreed change into the written offer before you sign anything.",
    service: CV,
    phrases: [
      "can i negotiate an offer here",
      "is salary negotiable in dubai job offers",
      "how do i ask for more money in a uae offer",
      "should i negotiate the package or the basic",
    ],
    keywords: [["negotiate", "offer", "here"], ["salary", "negotiable", "offers"]],
    next: ["job-pay-what-to-ask-for", "job-offer-what-to-check", "job-offer-two-offers"],
  },
  {
    id: "job-offer-changed-on-arrival",
    question: "The terms changed after I arrived in the UAE",
    answer:
      "This is the situation the MOHRE offer letter exists to prevent, so the first thing to do is compare what you are being asked to sign with the offer you signed before the permit. If they differ materially, you are not obliged to accept the new one, and MOHRE is the body that deals with it — through their app, website or call centre. Keep both documents and every message, and get advice before you resign in protest.",
    service: VISA,
    phrases: [
      "the terms changed after i arrived in the uae",
      "my salary is lower than the offer letter said",
      "the company gave me a different contract on arrival",
      "what do i do if my employer changed the agreed terms",
    ],
    keywords: [["terms", "changed", "arrived"], ["different", "contract", "arrival"]],
    next: ["job-offer-mohre-letter", "job-pay-unpaid-salary", "job-change-complaint"],
  },
  {
    id: "job-offer-copy",
    question: "Should I keep copies of everything I sign?",
    answer:
      "Yes, and get them at the time — the signed offer, the registered contract, the permit, the Emirates ID, every payslip and every leave approval. Scan them and keep them somewhere that is not only your work laptop. Almost every dispute that goes badly for an employee here goes badly because the employee has no copy of the document they are describing.",
    service: VISA,
    phrases: [
      "should i keep copies of everything i sign",
      "my employer will not give me a copy of my contract",
      "how do i get a copy of my uae labour contract",
      "what employment documents should i keep",
    ],
    keywords: [["copies", "everything", "sign"], ["copy", "labour", "contract"]],
    next: ["job-offer-what-to-check", "job-permit-labour-card", "job-change-complaint"],
  },
  {
    id: "job-offer-signing-abroad",
    question: "Can I sign the offer before I travel?",
    answer:
      "Yes — for a hire from abroad the normal sequence is signing the offer, the employer applying for the permit, and you travelling on an employment entry permit. Signing electronically is ordinary. What you should not do is travel before the permit is approved on the strength of a promise, or pay anyone for the approval, because the employer carries that cost.",
    service: VISA,
    phrases: [
      "can i sign the offer before i travel",
      "do i sign the uae contract from my home country",
      "how does signing an offer letter from abroad work",
      "should i travel to dubai before my permit is approved",
    ],
    keywords: [["sign", "offer", "before", "travel"], ["signing", "abroad", "offer"]],
    next: ["job-legal-from-abroad", "job-permit-steps", "job-scam-advance-fee"],
  },

  /* ── Pay and the package ───────────────────────────────────────────────── */
  {
    id: "job-pay-basic-vs-allowance",
    question: "Why is my salary split into basic and allowances?",
    answer:
      "Because several things are calculated on the basic alone rather than on the total: end-of-service gratuity, overtime, and often what a bank will lend you. A package with a low basic and large allowances looks identical on the total line and is worth less when you leave. When you compare offers, compare the basic first and the total second.",
    service: CV,
    phrases: [
      "why is my salary split into basic and allowances",
      "what does basic salary mean in a uae package",
      "is a high allowance better than a high basic",
      "how is a dubai salary structured",
    ],
    keywords: [["salary", "split", "basic"], ["basic", "salary", "package"]],
    next: ["job-pay-gratuity", "job-pay-what-package-includes", "job-offer-two-offers"],
  },
  {
    id: "job-pay-what-package-includes",
    question: "What is usually included in a UAE package?",
    answer:
      "Beyond basic pay, commonly: housing and transport allowances, medical insurance for you and sometimes your family, an annual or biennial flight ticket home, and in some sectors schooling support. None of these is automatic except the insurance obligation on the employer, so what matters is what your own contract lists. Ask for the full breakdown in writing before you compare anything.",
    service: CV,
    phrases: [
      "what is usually included in a uae package",
      "what benefits do dubai employers give",
      "does a job in the uae include accommodation",
      "what comes with a dubai salary besides pay",
    ],
    keywords: [["included", "uae", "package"], ["benefits", "employers", "give"]],
    next: ["job-pay-accommodation", "job-pay-insurance", "job-pay-ticket"],
  },
  {
    id: "job-pay-accommodation",
    question: "Is accommodation provided or paid for?",
    answer:
      "It varies entirely by sector and level: some employers provide housing directly, most pay a housing allowance as part of the package, and many pay neither and expect the salary to cover it. Employer-provided accommodation is common in hospitality, healthcare, construction and education. Ask which of the three it is, and if it is provided, ask what happens to it during your notice period.",
    service: CV,
    phrases: [
      "is accommodation provided or paid for",
      "do dubai employers give a housing allowance",
      "does the company provide staff accommodation in the uae",
      "is rent included in a dubai job",
    ],
    keywords: [["accommodation", "provided", "paid"], ["housing", "allowance", "employers"]],
    next: ["job-pay-cost-of-living", "job-pay-what-package-includes", "job-pay-basic-vs-allowance"],
  },
  {
    id: "job-pay-insurance",
    question: "Who provides my medical insurance?",
    answer:
      "Employers here are required to provide health cover for their employees, with the specifics set by the health authority of the emirate — Dubai and Abu Dhabi have their own schemes. Cover for your spouse and children is a separate question and is often your responsibility, so ask before you plan a family move. Check the network and the limits, not just that a card exists.",
    service: CV,
    phrases: [
      "who provides my medical insurance in a uae job",
      "does my employer have to give health insurance in dubai",
      "is my family covered by my company insurance",
      "what health cover comes with a uae job",
    ],
    keywords: [["provides", "medical", "insurance"], ["health", "insurance", "employer"]],
    next: ["job-pay-what-package-includes", "job-permit-medical", "job-permit-family-sponsorship"],
  },
  {
    id: "job-pay-ticket",
    question: "How does the annual flight ticket work?",
    answer:
      "Where a contract includes it, it is usually one economy ticket to your home country each year or every two years, sometimes paid as cash instead. It is a contractual benefit rather than a statutory one, so what your contract says is what you get. Check whether it covers your family, and what happens to an unused ticket when you resign.",
    service: CV,
    phrases: [
      "how does the annual flight ticket work",
      "do uae jobs include a yearly air ticket",
      "is the home country ticket paid in cash",
      "does my family get flight tickets from my employer",
    ],
    keywords: [["annual", "flight", "ticket"], ["yearly", "ticket", "jobs"]],
    next: ["job-pay-what-package-includes", "job-offer-leave", "job-pay-school-fees"],
  },
  {
    id: "job-pay-school-fees",
    question: "Do employers pay school fees for children?",
    answer:
      "Some do, mostly at senior levels and in education, oil and gas, aviation and government-linked entities, and it is usually capped and limited to a number of children. It is never automatic. If schooling is part of why you are moving, get the cap, the number of children and the payment mechanism written into the offer.",
    service: CV,
    phrases: [
      "do employers pay school fees for children",
      "is education allowance common in dubai jobs",
      "will my company pay for my kids schooling in the uae",
      "does a dubai package cover school",
    ],
    keywords: [["school", "fees", "children"], ["education", "allowance", "jobs"]],
    next: ["job-pay-what-package-includes", "job-permit-family-sponsorship", "job-pay-cost-of-living"],
  },
  {
    id: "job-pay-overtime",
    question: "How is overtime treated?",
    answer:
      "The law sets maximum working hours and provides for overtime compensation at defined uplifts, with higher treatment for night hours and rest days, calculated on your basic pay. Some senior and managerial roles are treated differently. If overtime is going to be a regular part of your job, ask how it is recorded and paid rather than assuming, and check the clause in your contract.",
    service: CV,
    phrases: [
      "how is overtime treated in the uae",
      "do i get paid extra for working late in dubai",
      "is overtime compulsory in a uae job",
      "how is overtime calculated for uae employees",
    ],
    keywords: [["overtime", "treated", "uae"], ["overtime", "calculated", "employees"]],
    next: ["job-offer-working-hours", "job-pay-basic-vs-allowance", "job-pay-payslip"],
  },
  {
    id: "job-pay-gratuity",
    question: "How does end-of-service gratuity work?",
    answer:
      "Gratuity is an end-of-service payment based on your basic salary and your length of service, with the formula and the qualifying period set by the labour law, and some employers now participate in a savings scheme in its place. What you actually receive depends on your basic pay, your completed service and how the employment ended — so the figure is yours to calculate from your own contract rather than a number anyone should quote you in the abstract.",
    service: CV,
    phrases: [
      "how does end of service gratuity work",
      "what is gratuity in the uae",
      "do i get a settlement when i leave my dubai job",
      "how is end of service benefit calculated",
    ],
    keywords: [["service", "gratuity", "work"], ["gratuity", "uae", "settlement"]],
    next: ["job-change-gratuity", "job-pay-basic-vs-allowance", "job-offer-contract-type"],
  },
  {
    id: "job-pay-tax",
    question: "Is my salary taxed in the UAE?",
    answer:
      "There is no personal income tax on salaries in the UAE. That does not mean there is no tax anywhere in your life: your home country may still tax you depending on its residency rules and any treaty, and corporate and value-added taxes exist here for businesses. For your own position, a tax adviser in your home country is the right person to ask before you move.",
    service: CV,
    phrases: [
      "is my salary taxed in the uae",
      "do i pay income tax in dubai",
      "is dubai really tax free for workers",
      "will i be taxed at home if i work in the uae",
    ],
    keywords: [["salary", "taxed", "uae"], ["income", "tax", "dubai"]],
    next: ["job-pay-cost-of-living", "job-pay-what-package-includes", "job-pay-market-rate"],
  },
  {
    id: "job-pay-wps",
    question: "What is WPS and does it protect me?",
    answer:
      "The Wage Protection System routes salaries through approved channels so that the authorities can see whether employers are paying on time, and mainland employers are required to use it. It is a real protection and it is also evidence: your salary transfers are the record you would rely on in a complaint. If you are told your pay will be in cash, ask why.",
    service: CV,
    phrases: [
      "what is wps and does it protect me",
      // "what is the wage protection system in the uae" belongs to the business
      // setup pack's employer-side entry. This one answers the employee.
      "does the wage protection system cover my salary",
      "is my employer allowed to pay me in cash in dubai",
      "how are salaries paid in the uae",
    ],
    keywords: [["wage", "protection", "system"], ["paid", "cash", "employer"]],
    next: ["job-pay-unpaid-salary", "job-pay-payslip", "job-change-complaint"],
  },
  {
    id: "job-pay-payslip",
    question: "Should I be getting a payslip?",
    answer:
      "You should have a record of what you were paid and what was deducted, and you should keep it — payslips and bank credits are what you produce if a gratuity calculation, a loan application or a complaint depends on your salary history. If your employer does not issue them, ask in writing and keep the bank statements in the meantime.",
    service: CV,
    phrases: [
      "should i be getting a payslip",
      "my company does not give salary slips",
      "how do i prove my salary in the uae",
      "do i need payslips in dubai",
    ],
    keywords: [["getting", "payslip"], ["salary", "slips", "company"], ["prove", "salary", "uae"]],
    next: ["job-pay-wps", "job-pay-unpaid-salary", "job-pay-gratuity"],
  },
  {
    id: "job-pay-unpaid-salary",
    question: "My salary has not been paid",
    answer:
      "Raise it in writing with your employer first so there is a record, then take it to MOHRE — unpaid or delayed wages are exactly what their complaint process and the wage protection system exist for, and free zone employees go to their own authority. Do not stop attending work without advice, because leaving your post can be recorded against you. Keep your contract, your payslips and your bank statements to hand.",
    service: CV,
    phrases: [
      "my salary has not been paid",
      "my employer in dubai is delaying my salary",
      "what do i do if my company does not pay me",
      "where do i complain about unpaid wages in the uae",
    ],
    keywords: [["salary", "not", "paid"], ["unpaid", "wages", "complain"], ["delaying", "salary", "employer"]],
    next: ["job-change-complaint", "job-pay-wps", "job-change-absconding"],
  },
  {
    id: "job-pay-market-rate",
    question: "How do I find out what my role actually pays here?",
    // Now the *fallback* behind a board answer rather than the whole reply, and
    // unchanged for it: this is exactly what to say when the listings cannot
    // support a figure, which — with 17 of 258 stating a salary — is most roles
    // most weeks. `lib/chat/jobs/answer.ts` needs three stating listings before
    // it will quote a range, and prints this underneath when it has fewer.
    answer:
      "Use several sources rather than one: advertised ranges for the same title on the portals, published salary guides from the large recruitment firms, and people in your field here if you can reach them. We deliberately do not publish a figure of our own, because pay in this market varies by sector, employer size, nationality of the parent company and the size of the package around the basic — and a number we invented would be used in your negotiation.",
    service: CV,
    // Answered from the board: what the matching listings advertise, how many
    // of them say anything at all, and the prose above when that is too few.
    // Deliberately this entry rather than a new one in ./job-board-flows.ts —
    // it already owns these phrasings in the merged graph, and a second entry
    // competing for them is the cross-pack theft that pack's tests exist to
    // catch.
    board: { answers: "salary" },
    phrases: [
      "how do i find out what my role actually pays here",
      "what is the market rate for my job in dubai",
      "how do i research salaries in the uae",
      "what do people earn in my profession in dubai",
      "what does a nurse earn in dubai",
      "what is the salary for an accountant in dubai",
      "how much do drivers get paid in sharjah",
      "average salary for an engineer in abu dhabi",
      "what do your listings pay",
      "what salary do these jobs pay",
      "what is the going rate for a receptionist in dubai",
    ],
    keywords: [["market", "rate", "role"], ["research", "salaries", "uae"], ["people", "earn", "profession"]],
    next: ["job-pay-what-to-ask-for", "job-interview-salary-question", "job-pay-basic-vs-allowance"],
  },
  {
    id: "job-pay-what-to-ask-for",
    question: "What salary should I ask for?",
    answer:
      "Work it out from three things rather than from a rule of thumb: the advertised range for that title here, the full cost of your own move including housing and schooling, and what the package includes beyond the basic. Then give a range whose lower end you would genuinely accept. We will not name a figure for you — nobody who has not seen the role, the sector and the rest of your package honestly can.",
    service: CV,
    phrases: [
      "what salary should i ask for",
      "how much should i ask for in a dubai interview",
      "what figure do i give for expected salary in the uae",
      "how do i decide my salary expectation",
    ],
    keywords: [["salary", "ask", "expectation"], ["figure", "expected", "salary"]],
    next: ["job-pay-market-rate", "job-interview-salary-question", "job-offer-negotiate"],
  },
  {
    id: "job-pay-cost-of-living",
    question: "Will the salary actually cover living here?",
    answer:
      "That depends on the things people underestimate: rent is often paid in a small number of cheques, schooling is expensive, and you will have set-up costs before your first salary. Work out your own monthly figure for rent, transport, schooling, insurance and a flight home, then compare it with the offer — that arithmetic, done before you accept, is worth more than any published average.",
    service: CV,
    phrases: [
      "will the salary actually cover living here",
      "is the cost of living in dubai high compared to salaries",
      "how do i budget for moving to the uae for a job",
      "can i live on the salary being offered in dubai",
    ],
    keywords: [["cover", "living", "salary"], ["budget", "moving", "uae"]],
    next: ["job-pay-accommodation", "job-pay-market-rate", "job-pay-school-fees"],
  },
  {
    id: "job-pay-salary-drop",
    question: "Should I accept less than I earned before?",
    answer:
      "It is a common trade when you are entering a new market, changing field or converting a search that has gone on too long — and it is easier to raise pay from inside the market than from outside it. Decide the floor you can actually live on first, check whether the package makes up part of the gap, and if you take it, be straightforward in the interview about why rather than hiding the previous figure.",
    service: CV,
    phrases: [
      "should i accept less than i earned before",
      "is taking a pay cut to move to dubai a mistake",
      "i am being offered lower than my current salary",
      "does accepting a lower salary hurt my career in the uae",
    ],
    keywords: [["accept", "less", "earned"], ["pay", "cut", "dubai"]],
    next: ["job-apply-overqualified", "job-pay-cost-of-living", "job-offer-negotiate"],
  },
  {
    id: "job-pay-increment",
    question: "Do salaries go up once I am in the job?",
    answer:
      "Annual increments and bonuses are discretionary here unless your contract says otherwise, and in many companies the largest rise people get is the one they negotiate when they move. If a future increase is part of why you are accepting, ask for the review date and the criteria in the offer — a verbal promise of a rise after probation is not a term of employment.",
    service: CV,
    phrases: [
      "do salaries go up once i am in the job",
      "are annual increments normal in dubai",
      "will i get a raise after probation in the uae",
      "how do pay rises work in uae companies",
    ],
    keywords: [["salaries", "increments", "annual"], ["raise", "after", "probation"]],
    next: ["job-offer-negotiate", "job-pay-market-rate", "job-hub-change"],
  },

  {
    id: "job-pay-commission",
    question: "How does commission-based pay work here?",
    answer:
      "Commission and incentive schemes are common in sales, property and recruitment, and the part that causes disputes is always the detail: how it is calculated, when it is earned as opposed to paid, what happens to commission on a deal that completes after you leave, and whether there is a guaranteed period at the start. Get the scheme in writing as part of the contract rather than as a separate presentation.",
    service: CV,
    phrases: [
      "how does commission based pay work here",
      "is a commission only job in dubai worth taking",
      "when is sales commission earned in the uae",
      "do i still get commission after i resign",
    ],
    keywords: [["commission", "based", "pay"], ["sales", "commission", "earned"]],
    next: ["job-pay-basic-vs-allowance", "job-offer-what-to-check", "job-sector-retail"],
  },

  /* ── Work permit, residence and joining ────────────────────────────────── */
  {
    id: "job-permit-steps",
    question: "What are the steps from accepting an offer to starting work?",
    answer:
      "Broadly: you sign the offer, the employer obtains approval and applies for the work permit, you either enter on an employment entry permit or change status inside the country, you complete the medical fitness test and biometrics, your Emirates ID and residence visa are issued, and the employment contract is registered. The employer's PRO drives nearly all of it. Ask them at the start which steps need you in person, so you can plan around them.",
    service: VISA,
    phrases: [
      "what are the steps from accepting an offer to starting work",
      "what is the process after i accept a job in dubai",
      "how does the uae work permit process run",
      "what happens after i sign the offer letter",
    ],
    keywords: [["steps", "accepting", "offer"], ["process", "accept", "job"]],
    next: ["job-permit-who-pays", "job-permit-medical", "job-permit-emirates-id"],
  },
  {
    id: "job-permit-who-pays",
    question: "Who pays for the work permit and residence visa?",
    answer:
      "UAE labour law places recruitment and permit costs on the employer, not on the employee — that is the general position, and MOHRE is the authority to confirm it against your own case. So an employer or agent asking you to fund the permit, the medical or the Emirates ID is asking for something the law does not contemplate. Your own costs are things like your certificate attestation and your personal documents, which are yours because you keep them.",
    service: VISA,
    phrases: [
      "who pays for the work permit and residence visa",
      "does the employer pay for my uae visa",
      "am i supposed to pay for my own work visa in dubai",
      "who covers the cost of the employment visa",
    ],
    keywords: [["pays", "work", "permit"], ["employer", "pay", "visa"], ["covers", "employment", "visa"]],
    next: ["job-scam-advance-fee", "job-permit-steps", "job-papers-degree-attestation"],
  },
  {
    id: "job-permit-timeline",
    question: "How long does the visa process take?",
    answer:
      "It depends on the authority, the emirate, the free zone, the completeness of your documents and whether your job title needs extra approval — which is why a specific number from anyone who has not seen your file is a guess. What you can do is ask the employer's PRO for the stage you are at and what is outstanding, and make sure nothing is waiting on a document of yours.",
    service: VISA,
    phrases: [
      "how long does the uae visa process take",
      "when will my employment visa be ready",
      "is the dubai work permit process slow",
      "my visa is taking a long time what can i do",
    ],
    keywords: [["visa", "process", "long"], ["employment", "visa", "ready"]],
    next: ["job-permit-employer-stalling", "job-permit-steps", "job-permit-passport-during"],
  },
  {
    id: "job-permit-entry-permit-travel",
    question: "What is an employment entry permit?",
    answer:
      "It is the document that lets you enter the country to take up the job before your residence visa exists, issued after the work permit is approved and valid for a limited window. Travel on it rather than on a visit visa if you are being hired from abroad, check the dates before you book, and keep a copy — the residence and Emirates ID steps follow once you are here.",
    service: VISA,
    phrases: [
      "what is an employment entry permit",
      "i got a pink visa to enter for my job",
      "can i travel to dubai on my work entry permit",
      "what document do i enter the uae on for a new job",
    ],
    keywords: [["employment", "entry", "permit"], ["travel", "entry", "permit"]],
    next: ["job-permit-steps", "job-legal-status-change", "job-permit-medical"],
  },
  {
    id: "job-permit-medical",
    question: "What does the medical fitness test involve?",
    answer:
      "A blood test and a chest X-ray at an approved screening centre, arranged as part of the residence process, with the conditions screened for and their consequences set by the health authority. Take your passport, the entry permit or application papers and the photographs asked for. If you have a condition you are worried about, ask the screening centre or a UAE doctor rather than a recruiter — and never pay anyone who offers to influence the result.",
    service: VISA,
    phrases: [
      "what does the medical fitness test involve",
      "what happens at the uae visa medical",
      "what tests are done for a dubai work visa",
      "do i need a blood test for my uae residence",
    ],
    keywords: [["medical", "fitness", "test"], ["visa", "medical", "happens"]],
    next: ["job-legal-medical-condition", "job-permit-emirates-id", "job-permit-steps"],
  },
  {
    id: "job-permit-emirates-id",
    question: "How do I get my Emirates ID?",
    answer:
      "It is applied for as part of the residence process — you attend for biometrics, and the card follows. You will need it for almost everything afterwards: your bank account, your phone line, your tenancy, your insurance. Keep the application receipt, since it is often accepted while the card is being produced, and tell your employer promptly if anything on it is misspelled.",
    service: VISA,
    phrases: [
      "how do i get my emirates id",
      "when is the emirates id issued for a new job",
      "do i get an emirates id when i start a job in dubai",
      "my emirates id has not arrived yet",
    ],
    keywords: [["emirates", "identity", "card"], ["emirates", "biometrics", "fingerprints"]],
    next: ["job-permit-steps", "job-permit-labour-card", "job-permit-medical"],
  },
  {
    id: "job-permit-labour-card",
    question: "What is the labour card and do I need a copy?",
    answer:
      "It is the record of your work permit — who employs you, in what occupation, under what contract — held with the ministry or the free zone authority. Ask for a copy of it and of your registered contract once they are issued, and check your name, title and salary on them. It is the document that settles arguments later about what you were actually employed to do.",
    service: VISA,
    phrases: [
      "what is the labour card and do i need a copy",
      "how do i check my work permit details in the uae",
      "where do i see my registered employment contract",
      "what is on a uae labour card",
    ],
    keywords: [["labour", "card", "copy"], ["registered", "employment", "contract", "see"]],
    next: ["job-offer-job-title", "job-offer-copy", "job-permit-steps"],
  },
  {
    id: "job-permit-passport-during",
    question: "Does my employer need my passport during the process?",
    answer:
      "They need your passport for specific steps, and it may be handed over briefly for those — what is not permitted is retaining it afterwards against your wishes, which MOHRE treats as a complaint matter. Ask when you will get it back, get that in a message rather than a conversation, and keep a scanned copy of every page for yourself.",
    service: VISA,
    phrases: [
      "does my employer need my passport during the process",
      "why has the company taken my passport for the visa",
      "when do i get my passport back after visa stamping",
      "is the employer allowed to hold my passport while processing",
    ],
    keywords: [["employer", "passport", "process"], ["passport", "back", "stamping"]],
    next: ["job-scam-passport-held", "job-permit-steps", "job-permit-timeline"],
  },
  {
    id: "job-permit-free-zone-vs-mainland",
    question: "Is a free zone job different from a mainland one?",
    answer:
      "The employer's licence decides which authority issues your permit and registers your contract — MOHRE for mainland, the free zone authority for a free zone company, with DIFC and ADGM running their own employment regimes. It affects where you complain if something goes wrong, sometimes where you may be deployed, and the paperwork route rather than your core entitlements. Ask which authority your contract will be registered with.",
    service: VISA,
    phrases: [
      "is a free zone job different from a mainland one",
      "what is the difference between mainland and free zone employment",
      "does it matter if my employer is in a free zone",
      "who regulates free zone employees in the uae",
    ],
    keywords: [["free", "zone", "mainland", "job"], ["regulates", "free", "zone", "employees"]],
    next: ["job-legal-emirate-difference", "job-change-complaint", "job-permit-steps"],
  },
  {
    id: "job-permit-quota",
    question: "The employer says they have no visa quota",
    answer:
      "Companies are allocated permits according to their licence, their activity, their space and their workforce rules, and a genuine quota problem is something the employer resolves with the authority — not something you fix and not something you pay for. If a quota issue is holding up your joining date, ask for a realistic date and keep your other applications live in the meantime.",
    service: VISA,
    phrases: [
      "the employer says they have no visa quota",
      "what is a company visa quota in the uae",
      "my joining is delayed because of quota",
      "can a company hire without a visa quota in dubai",
    ],
    keywords: [["visa", "quota", "company"], ["joining", "delayed", "quota"]],
    next: ["job-permit-employer-stalling", "job-permit-timeline", "job-people-emiratisation"],
  },
  {
    id: "job-permit-employer-stalling",
    question: "My employer is not processing my visa",
    answer:
      "Ask in writing what stage the application is at and what is outstanding; a genuine delay has a reference number attached to it. If you are already working while it drags on, that is a risk to you rather than to them, and MOHRE or the free zone authority is where it is raised. Do not let it run for months on verbal reassurance — the person without a permit is the one exposed.",
    service: VISA,
    phrases: [
      "my employer is not processing my visa",
      "the company keeps delaying my work permit",
      "i have been working for months without a visa in dubai",
      "what do i do if my employer will not apply for my permit",
    ],
    keywords: [["employer", "processing", "visa"], ["delaying", "work", "permit"]],
    next: ["job-permit-working-before-permit", "job-change-complaint", "job-permit-timeline"],
  },
  {
    id: "job-permit-working-before-permit",
    question: "Can I start work before the permit is issued?",
    answer:
      "Working before a permit exists in your name leaves you without the protections the permit carries and exposes you rather than the employer — no registered contract, no clear route to a wage complaint, and a problem if an inspection happens. Employers sometimes ask, and the honest answer is that it is their obligation to have the permit first. If you are already in that position, raise it with MOHRE.",
    service: VISA,
    phrases: [
      "can i start work before the permit is issued",
      "is it legal to work while my visa is in process in dubai",
      "the company wants me to join before my permit",
      "am i covered if i work without a labour card",
    ],
    keywords: [["start", "work", "before", "permit"], ["work", "while", "visa", "process"]],
    next: ["job-permit-employer-stalling", "job-permit-steps", "job-change-complaint"],
  },
  {
    id: "job-permit-visa-rejected",
    question: "My work visa application was rejected",
    answer:
      "Rejections happen for document mismatches, name discrepancies between your passport and certificates, medical results, security clearance and occupational restrictions, and the authority states the ground rather than the employer. Ask the PRO for the exact reason in writing, because the fix is completely different in each case — a re-attested certificate, a corrected name, or advice from a lawyer. Do not pay anyone promising to overturn a rejection.",
    service: VISA,
    phrases: [
      "my work visa application was rejected",
      "why was my employment visa refused after the offer",
      "the ministry rejected my work permit",
      "can i reapply after a visa rejection in dubai",
    ],
    keywords: [["visa", "application", "rejected"], ["employment", "visa", "refused"]],
    next: ["job-papers-name-mismatch", "job-legal-criminal-record", "job-permit-steps"],
  },
  {
    id: "job-permit-family-sponsorship",
    question: "When can I bring my family over?",
    answer:
      "Once your own residence is issued you can apply to sponsor family members, and eligibility depends on your salary, your accommodation, your job category and the current ICP rules — which is why the answer differs between two people with the same job title. You will need attested and translated marriage and birth certificates, so it is worth preparing those before you move rather than after.",
    service: VISA,
    phrases: [
      "when can i bring my family over to the uae",
      "can i sponsor my wife and children on my work visa",
      "what do i need to bring my family to dubai",
      "family visa requirements after getting a job in the uae",
    ],
    keywords: [["bring", "family", "uae"], ["sponsor", "wife", "children"]],
    next: ["job-papers-marriage-birth", "job-pay-school-fees", "job-pay-insurance"],
  },
  {
    id: "job-permit-cancel-probation",
    question: "What happens to my visa if it does not work out early?",
    answer:
      "If employment ends, the employer cancels the work permit and residence visa, and you then have a grace period to leave or move onto another status — the length depends on your visa type and the current rules. Get the cancellation paper, check it says what you expect, and start the next step before the deadline rather than at it. If you are moving straight to another employer, the transfer route may avoid the gap entirely.",
    service: VISA,
    phrases: [
      "what happens to my visa if the job does not work out",
      "if i leave during probation what happens to my residence",
      "does my visa get cancelled if i resign early in dubai",
      "what if the company terminates me in the first months",
    ],
    keywords: [["visa", "job", "work", "out"], ["cancelled", "resign", "early"]],
    next: ["job-legal-cancelled-grace", "job-change-transfer", "job-change-probation-exit"],
  },
  {
    id: "job-permit-renewal",
    question: "Who renews my residence visa later?",
    answer:
      "Your employer, as your sponsor, handles renewal while you work for them, and the timing follows the expiry on the visa rather than your joining date. Watch the dates yourself as well: an expired residence causes fines and complications with your Emirates ID, your bank and your licence. Check whether your passport has enough validity left before renewal falls due.",
    service: VISA,
    phrases: [
      "who renews my residence visa later",
      "how does uae visa renewal work for employees",
      "what happens when my dubai residence expires",
      "does my employer renew my emirates id",
    ],
    keywords: [["renews", "residence", "visa"], ["visa", "renewal", "employees"]],
    next: ["job-permit-emirates-id", "job-permit-steps", "job-change-transfer"],
  },

  /* ── Certificates and documents ────────────────────────────────────────── */
  {
    id: "job-papers-degree-attestation",
    question: "Does my degree need attestation for a UAE job?",
    answer:
      "For most professional roles, yes — the employer or the authority will want your degree attested through the chain that ends at the UAE embassy in the issuing country and the Ministry of Foreign Affairs here. It is the step that most often delays a permit, because it happens in your home country and cannot be rushed from this end. Start it as soon as a job search here becomes serious rather than when an employer asks.",
    service: ATTEST,
    phrases: [
      "does my degree need attestation for a uae job",
      "do i have to attest my certificate for a dubai employer",
      "is degree attestation required for a work visa",
      "my employer asked for an attested degree",
    ],
    keywords: [["degree", "attestation", "job"], ["attested", "degree", "employer"]],
    next: ["job-papers-attestation-steps", "job-papers-equivalency", "job-papers-attestation-cost"],
  },
  {
    id: "job-papers-attestation-steps",
    question: "What is the order of steps for attesting a degree?",
    answer:
      "Broadly, the document is authenticated in the country that issued it, then by that country's foreign ministry, then by the UAE embassy or consulate there, and finally by the Ministry of Foreign Affairs in the UAE — with an equivalency or a professional licence on top for some fields. The exact bodies differ by country and by document, and doing a step out of order means doing it again. Our attestation team works the chain out for your specific certificate and country.",
    service: ATTEST,
    phrases: [
      "what is the order of steps for attesting a degree",
      "how does certificate attestation work for the uae",
      "which offices attest my documents before dubai",
      "what is the attestation chain for a work visa",
    ],
    keywords: [["order", "steps", "attesting"], ["attestation", "chain", "work", "visa"]],
    next: ["job-papers-degree-attestation", "job-papers-attestation-cost", "job-papers-equivalency"],
  },
  {
    id: "job-papers-attestation-cost",
    question: "What does it cost to attest my certificate for a job?",
    answer:
      "There is no single figure to give you, and an invented one would be worse than none: attestation fees depend on the country that issued the certificate, the number of documents, which ministries and embassies are in the chain, and whether a translation or an equivalency is also needed. Tell us the country and the document and our attestation team will come back with the real cost and the steps for your case.",
    service: ATTEST,
    phrases: [
      "what does it cost to attest my certificate for a job",
      "how much is degree attestation for a dubai employer",
      "price of attesting my certificate for a work visa",
      "attestation charges for my job documents",
    ],
    /* Four words rather than three, deliberately. "How much to attest my degree
       for my job offer" fires the prose entry above at weight 3 on
       ["degree","attestation","job"], and a tie goes to the earlier candidate —
       so a money question was being answered with an explanation. A money marker
       plus the document plus the job context outweighs it. */
    keywords: [
      ["cost", "attest", "certificate", "job"],
      ["attestation", "charges", "job", "documents"],
      ["much", "attest", "degree", "job"],
      ["cost", "attest", "degree", "job"],
      ["price", "attest", "degree", "job"],
      ["much", "attest", "certificate", "job"],
      ["much", "attestation", "employer", "degree"],
    ],
    quote: true,
  },
  {
    id: "job-papers-equivalency",
    question: "What is an equivalency certificate and do I need one?",
    answer:
      "An equivalency recognises a foreign qualification against UAE standards, and it is required for certain professions and certain permit categories rather than for everyone — the Ministry of Education handles academic equivalency, and regulated professions have their own licensing bodies on top. Ask the employer whether your job category needs it, because it adds a step and it needs the attested degree first.",
    service: ATTEST,
    phrases: [
      "what is an equivalency certificate and do i need one",
      "do i need moe equivalency for my degree in the uae",
      "is degree equivalency required for my job in dubai",
      "how do i get my qualification recognised in the uae",
    ],
    keywords: [["equivalency", "certificate", "need"], ["qualification", "recognised", "uae"]],
    next: ["job-papers-degree-attestation", "job-sector-nursing", "job-papers-online-degree"],
  },
  {
    id: "job-papers-experience-letter",
    question: "What should my experience certificate say?",
    answer:
      "Your full name as it appears on your passport, your job title, the exact dates you were employed, and ideally your duties — on company letterhead, signed and stamped. Ask for it when you leave a job rather than years later, because companies close and HR teams change. Some employers and licensing bodies here will also want it attested, which is much easier while you are still in the country that issued it.",
    service: ATTEST,
    phrases: [
      "what should my experience certificate say",
      "what is an experience letter for a uae job",
      "does my experience certificate need attestation",
      "my previous employer will not give me an experience letter",
    ],
    keywords: [["experience", "certificate", "say"], ["experience", "letter", "attestation"]],
    next: ["job-apply-reference-check", "job-papers-degree-attestation", "job-change-current-employer-reference"],
  },
  {
    id: "job-papers-translation",
    question: "Which of my documents need translating into Arabic?",
    answer:
      "Anything a UAE authority will read that is not already in Arabic, which usually means certificates, contracts and civil documents rather than your CV — and it has to be a legal translation by a translator licensed by the Ministry of Justice, which is why an ordinary translation gets rejected. Translation normally comes after attestation, so check the order before paying for either.",
    service: TRANSLATE,
    phrases: [
      "which of my documents need translating into arabic",
      "does my degree need arabic translation for the uae",
      "do i need a legal translation for my job documents",
      "should my contract be translated into arabic",
    ],
    keywords: [["documents", "translating", "arabic"], ["legal", "translation", "job", "documents"]],
    next: ["job-papers-translation-cost", "job-offer-arabic", "job-papers-degree-attestation"],
  },
  {
    id: "job-papers-translation-cost",
    question: "What will translating my certificates cost?",
    answer:
      "It depends on the document, the language pair, how many pages there are and whether the translation has to be stamped for a particular authority — so a figure quoted before anyone has seen the document is a figure that changes later. Send us what you need translated and our team will come back with the cost and the turnaround for those exact documents.",
    service: TRANSLATE,
    phrases: [
      "what will translating my certificates cost",
      "how much is legal translation for my job documents",
      "price to translate my degree into arabic",
      "translation charges for a uae employment contract",
    ],
    keywords: [["translating", "certificates", "cost"], ["translate", "degree", "price"], ["translation", "charges", "contract"]],
    quote: true,
  },
  {
    id: "job-papers-which-documents",
    question: "Which documents should I have ready before I start applying?",
    answer:
      "Passport with reasonable validity left, a clean scan of the photo page, your degree and professional certificates, experience letters from each employer, your current visa or cancellation paper if you are here, passport photographs to the specification used here, and your CV. Having them scanned and named in one folder is worth an afternoon — half the delays in a UAE hiring process are documents nobody can find.",
    service: ATTEST,
    phrases: [
      "which documents should i have ready before i start applying",
      "what paperwork do i need to prepare for a uae job search",
      "what documents do i keep ready for dubai applications",
      "checklist of documents for a job in the uae",
    ],
    keywords: [["documents", "ready", "applying"], ["paperwork", "prepare", "job", "search"]],
    next: ["job-papers-degree-attestation", "job-papers-experience-letter", "job-apply-documents-requested"],
  },
  {
    id: "job-papers-lost-degree",
    question: "I cannot find my original degree certificate",
    answer:
      "You will need a replacement or a certified true copy from the awarding institution before anything else, because attestation is performed on a document the issuing authority stands behind rather than on a photocopy. Start with the university's records office, allow for the fact that this happens at their pace, and tell your employer early — it is a common delay and it is fixable, but not quickly.",
    service: ATTEST,
    phrases: [
      "i cannot find my original degree certificate",
      "i lost my degree what do i do for attestation",
      "can i attest a photocopy of my certificate",
      "my university certificate is missing and my employer needs it",
    ],
    keywords: [["lost", "degree", "certificate"], ["attest", "photocopy", "certificate"]],
    next: ["job-papers-degree-attestation", "job-papers-attestation-steps", "job-papers-online-degree"],
  },
  {
    id: "job-papers-online-degree",
    question: "Will my online or distance degree be accepted?",
    answer:
      "It depends on whether the awarding institution and the mode of study are recognised by the authority that has to accept it, and the equivalency process is where that is decided rather than by the employer. Check before you rely on it for a licensed profession. If a qualification was awarded by an institution that is not recognised here, find that out now rather than at the permit stage.",
    service: ATTEST,
    phrases: [
      "will my online or distance degree be accepted",
      "is a distance learning degree valid in the uae",
      "does the uae recognise online qualifications",
      "my degree was part time will dubai accept it",
    ],
    keywords: [["online", "distance", "degree"], ["distance", "learning", "valid"]],
    next: ["job-papers-equivalency", "job-papers-degree-attestation", "job-sector-teaching"],
  },
  {
    id: "job-papers-name-mismatch",
    question: "My name is spelled differently on my documents",
    answer:
      "This is one of the most common causes of a rejected application, because the authority matches your passport against every certificate. A difference in spelling, a missing surname, or a name changed by marriage usually needs an affidavit or a correction from the issuing body, and sometimes a notarised declaration. Deal with it before the permit stage — it is far harder to fix once an application has been refused.",
    service: ATTEST,
    phrases: [
      "my name is spelled differently on my documents",
      "the name on my degree does not match my passport",
      "does a name difference affect my uae visa",
      "i changed my name after marriage and my certificates are old",
    ],
    keywords: [["name", "spelled", "differently"], ["name", "degree", "passport"]],
    next: ["job-permit-visa-rejected", "job-papers-degree-attestation", "job-papers-marriage-birth"],
  },
  {
    id: "job-papers-police-clearance",
    question: "Will I need a police clearance certificate?",
    answer:
      "Some employers, some professions and some permit categories ask for one, usually issued recently by the country you have been living in, and often attested. Whether you need it is decided by the role and the authority rather than by a general rule, so ask the employer early — obtaining one from abroad after you arrive is much slower than arranging it before you leave.",
    service: ATTEST,
    phrases: [
      "will i need a police clearance certificate",
      "does a uae job require a good conduct certificate",
      "how do i get police clearance for a dubai job",
      "is a criminal record check needed for uae employment",
    ],
    keywords: [["police", "clearance", "certificate"], ["good", "conduct", "certificate"]],
    next: ["job-legal-criminal-record", "job-papers-which-documents", "job-papers-degree-attestation"],
  },
  {
    id: "job-papers-marriage-birth",
    question: "Do I need my marriage and birth certificates attested?",
    answer:
      "For your own work permit, usually not. For sponsoring your spouse and children afterwards, yes — those civil documents normally need the same attestation chain and a legal translation. If your family is following you, getting them done in your home country before you move is far easier than arranging it from here.",
    service: ATTEST,
    phrases: [
      "do i need my marriage and birth certificates attested",
      "what documents do i need to sponsor my family in dubai",
      "does my marriage certificate need attestation for the uae",
      "attesting a birth certificate for a family visa",
    ],
    keywords: [["marriage", "birth", "certificates"], ["marriage", "certificate", "attestation"]],
    next: ["job-permit-family-sponsorship", "job-papers-translation", "job-papers-attestation-cost"],
  },
  {
    id: "job-papers-employer-originals",
    question: "Should I hand over my original certificates?",
    answer:
      "Originals are needed for attestation and are sometimes shown for verification, so handing them over for a named step is normal. Handing them over indefinitely is not: ask what the document is for, when it comes back, and get an acknowledgement. Never leave your original degree or passport with an agent as security for anything.",
    service: ATTEST,
    phrases: [
      "should i hand over my original certificates",
      "the employer wants to keep my original degree",
      "is it safe to give my originals to a company in dubai",
      "who holds my original documents during attestation",
    ],
    keywords: [["hand", "original", "certificates"], ["keep", "original", "degree"]],
    next: ["job-scam-passport-held", "job-papers-degree-attestation", "job-scam-identity-documents"],
  },
  {
    id: "job-papers-professional-licence",
    question: "Do I need a professional licence as well as a visa?",
    answer:
      "In regulated fields — healthcare, teaching, engineering, law, accounting in some roles — yes, and the licence is issued by the relevant authority rather than by your employer, with its own exams, experience requirements and document checks. It usually depends on an attested degree and attested experience letters, so the paperwork feeds into it. Find out which body licenses your profession before you apply, because it sets your timeline.",
    service: ATTEST,
    phrases: [
      "do i need a professional licence as well as a visa",
      "which authority licenses my profession in the uae",
      "do i have to pass an exam to work in my field in dubai",
      "is my profession regulated in the uae",
    ],
    keywords: [["professional", "licence", "visa"], ["authority", "licenses", "profession"]],
    next: ["job-sector-nursing", "job-sector-engineering", "job-papers-equivalency"],
  },
  {
    id: "job-papers-when-to-start",
    question: "When should I start the paperwork — before or after an offer?",
    answer:
      "Attestation before, everything employer-specific after. The attestation chain runs through your home country and is the step most likely to hold up a permit, so doing it while you are still applying removes weeks from the critical path later. Equivalency, licensing and family documents can usually wait until a role is real, unless your profession is licensed, in which case start that early too.",
    service: ATTEST,
    phrases: [
      "when should i start the paperwork before or after an offer",
      "should i attest my documents before i find a job",
      "is it worth attesting my degree in advance",
      "how early should i prepare my uae job documents",
    ],
    keywords: [["start", "paperwork", "before", "offer"], ["attest", "documents", "before", "job"]],
    next: ["job-papers-degree-attestation", "job-papers-attestation-cost", "job-papers-which-documents"],
  },

  /* ── Getting hired in a particular field ───────────────────────────────── */
  {
    id: "job-sector-nursing",
    question: "How do I work as a nurse or doctor in the UAE?",
    answer:
      "Clinical roles need a licence from the health authority that covers where you will work — DHA in Dubai, DOH in Abu Dhabi, MOHAP elsewhere — and that means an eligibility application, an assessment or exam, attested degrees and attested experience letters, and often a dataflow verification of your credentials. Start the licensing track alongside your job search rather than after an offer, because it is usually the longest part.",
    service: ATTEST,
    phrases: [
      "how do i work as a nurse in the uae",
      "what licence does a doctor need in dubai",
      "how do i get a dha licence for nursing",
      "can i work in healthcare in the uae with a foreign degree",
    ],
    keywords: [["nurse", "licence", "uae"], ["doctor", "licence", "dubai"], ["healthcare", "foreign", "degree"]],
    next: ["job-papers-professional-licence", "job-papers-degree-attestation", "job-papers-equivalency"],
  },
  {
    id: "job-sector-teaching",
    question: "What do I need to teach in the UAE?",
    answer:
      "Schools here are regulated by the emirate's education authority — KHDA in Dubai, ADEK in Abu Dhabi — and the Ministry of Education sets teacher licensing requirements, which generally means a recognised degree, a teaching qualification, attested certificates and often an equivalency. Curriculum matters to employers: British, American, IB and Indian curriculum schools recruit differently and at different times of year.",
    service: ATTEST,
    phrases: [
      "what do i need to teach in the uae",
      "how do i become a teacher in dubai",
      "do i need a teaching licence for uae schools",
      "when do dubai schools recruit teachers",
    ],
    keywords: [["teach", "uae", "need"], ["teacher", "licence", "schools"]],
    next: ["job-papers-equivalency", "job-papers-professional-licence", "job-papers-degree-attestation"],
  },
  {
    id: "job-sector-engineering",
    question: "How does engineering work here — is registration needed?",
    answer:
      "Engineers are commonly asked to register with the relevant society or municipality, particularly for consultancy and contracting roles where drawings must be signed, and registration typically depends on an attested degree and verified experience. Employers also look for familiarity with the codes and authority approvals used here. Ask the employer which registration your role requires before you assume your degree alone is enough.",
    service: ATTEST,
    phrases: [
      "how does engineering work here is registration needed",
      "do i need to register as an engineer in dubai",
      "what is society of engineers membership for",
      "can i work as an engineer in the uae with a foreign degree",
    ],
    keywords: [["register", "engineer", "dubai"], ["engineer", "membership", "society"]],
    next: ["job-papers-professional-licence", "job-papers-degree-attestation", "job-interview-technical-test"],
  },
  {
    id: "job-sector-finance",
    question: "What about accounting, banking and finance roles?",
    answer:
      "Professional qualifications travel well here and are often the filter — a chartered accountancy qualification, CFA, or the certifications banks ask for — and roles inside DIFC or ADGM sit under those centres' own regulatory regimes, which can involve authorisation for certain functions. Knowledge of local VAT, corporate tax and IFRS as applied here is frequently tested at interview.",
    service: CV,
    phrases: [
      "what about accounting banking and finance roles in dubai",
      "how do i get a finance job in the uae",
      "is my accountancy qualification recognised in dubai",
      "what do banks look for when hiring in the uae",
    ],
    keywords: [["accounting", "banking", "finance"], ["accountancy", "qualification", "recognised"]],
    next: ["job-interview-technical-test", "job-permit-free-zone-vs-mainland", "job-cv-certificates-section"],
  },
  {
    id: "job-sector-it",
    question: "How do I get an IT or tech job here?",
    answer:
      "Tech hiring here leans on demonstrable work: a portfolio or repository, certifications that employers name in their adverts, and experience with the cloud and security stacks they actually run. Many roles sit in free zone companies and regional headquarters, so the free zone directories are a good source of employer names. Expect a technical test and, for senior roles, a conversation about regional data and compliance rules.",
    service: CV,
    phrases: [
      "how do i get an it job in dubai",
      "is there demand for software developers in the uae",
      "what tech skills do dubai employers want",
      "how do i find a developer job in the uae",
    ],
    keywords: [["job", "software", "developers"], ["tech", "skills", "employers"]],
    next: ["job-cv-portfolio", "job-interview-technical-test", "job-where-free-zone-directories"],
  },
  {
    id: "job-sector-hospitality",
    question: "How does hiring work in hotels and restaurants?",
    answer:
      "Volume hiring, frequent walk-ins and group-level career portals — the large hotel groups recruit centrally and move staff between properties. Accommodation and transport are often provided rather than paid as allowances, so compare packages on what you keep rather than on the headline. Presentation and language skills are weighted heavily at interview.",
    service: CV,
    phrases: [
      "how does hiring work in hotels and restaurants",
      "how do i get a hotel job in dubai",
      "are hospitality jobs in the uae easy to get",
      "what do hotels look for when hiring in dubai",
    ],
    keywords: [["hotel", "job", "dubai"], ["hospitality", "jobs", "uae"]],
    next: ["job-where-walkin", "job-pay-accommodation", "job-interview-dress-code"],
  },
  {
    id: "job-sector-retail",
    question: "What about retail and sales jobs?",
    answer:
      "Retail groups here hire continuously and often through walk-ins and in-store notices as well as portals, and the commission structure matters more than the basic in many sales roles. Ask how commission is calculated, when it is paid and whether the target is individual or store-wide, and get it in the offer rather than in conversation.",
    service: CV,
    phrases: [
      "what about retail and sales jobs in dubai",
      "how do i get a job in a dubai mall",
      "are sales jobs in the uae commission based",
      "how does retail hiring work in the uae",
    ],
    keywords: [["retail", "sales", "jobs"], ["mall", "job", "dubai"]],
    next: ["job-pay-commission", "job-where-walkin", "job-offer-what-to-check"],
  },
  {
    id: "job-sector-construction",
    question: "How do site and construction jobs work?",
    answer:
      "Contracting companies hire in waves tied to project awards, often through agencies in the worker's home country for trades and directly for professional staff. Check who the employer of record is, what the accommodation and transport arrangements are, and that everything you were told about hours and overtime is in the contract. For supervisory and engineering roles, expect registration and code knowledge to matter.",
    service: CV,
    phrases: [
      "how do site and construction jobs work in the uae",
      "how do i get a construction job in dubai",
      "who hires for building projects in the uae",
      "are contracting jobs in dubai hired through agencies",
    ],
    keywords: [["construction", "jobs", "uae"], ["building", "projects", "hires"]],
    next: ["job-sector-engineering", "job-offer-working-hours", "job-agency-overseas-agent"],
  },
  {
    id: "job-sector-driving",
    question: "Can I work as a driver in the UAE?",
    answer:
      "Driving roles require a UAE licence of the right category, and whether your existing licence can be transferred or requires testing depends on the country that issued it and on current RTA rules. Commercial categories have their own requirements. Confirm the licence position before accepting a job that depends on it, because the employer's permit and your ability to work both rest on it.",
    service: CV,
    phrases: [
      "can i work as a driver in the uae",
      "do i need a uae licence to drive for a job",
      "can i transfer my driving licence to dubai",
      "how do i get a delivery driver job in the uae",
    ],
    keywords: [["work", "driver", "uae"], ["transfer", "driving", "licence"]],
    next: ["job-sector-logistics", "job-papers-professional-licence", "job-where-walkin"],
  },
  {
    id: "job-sector-logistics",
    question: "What about logistics, aviation and shipping?",
    answer:
      "These are large employers here and many sit inside free zones attached to the ports and airports, which means their own recruitment portals and their own authority for permits. Security clearance and background checks are more common than in other sectors, and airside roles carry their own passes and medical requirements. Apply through the group portals and expect a longer process.",
    service: CV,
    phrases: [
      "what about logistics aviation and shipping jobs",
      "how do i get an airport job in dubai",
      "how do airlines recruit cabin crew in the uae",
      "are there warehouse jobs in dubai free zones",
    ],
    keywords: [["logistics", "aviation", "shipping"], ["airport", "job", "dubai"], ["airlines", "recruit", "crew"]],
    next: ["job-where-free-zone-directories", "job-permit-free-zone-vs-mainland", "job-where-company-careers"],
  },
  {
    id: "job-sector-oil-gas",
    question: "How do I get into oil, gas and energy here?",
    answer:
      "Hiring is dominated by the national operators and their contractors, and most professional roles ask for specific standards, certifications and offshore or plant experience. Contractor roles frequently go through specialist agencies, and rotations, site allowances and insurance terms differ from an office job — read those clauses carefully. Registration or certification bodies relevant to your discipline matter more than a general CV.",
    service: CV,
    phrases: [
      "how do i get into oil gas and energy jobs here",
      "who hires for oil and gas in the uae",
      "are energy jobs in abu dhabi hired through contractors",
      "what certifications do oil and gas employers want",
    ],
    keywords: [["oil", "gas", "energy"], ["energy", "jobs", "contractors"]],
    next: ["job-sector-engineering", "job-agency-headhunter-difference", "job-offer-what-to-check"],
  },
  {
    id: "job-sector-legal",
    question: "Can I practise law or work in legal roles here?",
    answer:
      "Practising as an advocate before the local courts is restricted and has its own registration requirements, while in-house legal, compliance and paralegal roles are open more widely, and DIFC and ADGM operate common-law jurisdictions with their own courts and their own hiring market. Arabic is a significant advantage in litigation-facing roles. Check the registration position for your specific role before committing.",
    service: CV,
    phrases: [
      "can i practise law or work in legal roles here",
      "how do i work as a lawyer in dubai",
      "is my law degree useful in the uae",
      "what legal jobs can an expat do in the uae",
    ],
    keywords: [["practise", "law", "legal"], ["lawyer", "work", "dubai"]],
    next: ["job-papers-professional-licence", "job-permit-free-zone-vs-mainland", "job-sector-government-arabic"],
  },
  {
    id: "job-sector-government-arabic",
    question: "How much does Arabic matter for getting hired?",
    answer:
      "For most private-sector roles, not at all — business here runs in English. It matters for government and semi-government roles, for customer-facing work with an Arabic-speaking public, and for anything court- or contract-facing where the Arabic text governs. If your target is that side of the market, even functional Arabic on your CV is a differentiator worth adding.",
    service: CV,
    phrases: [
      "how much does arabic matter for getting hired",
      "do i need to speak arabic to work in dubai",
      "is english enough for a job in the uae",
      "does arabic help my job application in the uae",
    ],
    keywords: [["arabic", "matter", "hired"], ["speak", "arabic", "work"]],
    next: ["job-cv-arabic-version", "job-where-government", "job-sector-legal"],
  },
  {
    id: "job-sector-remote",
    question: "Can I work remotely for a company outside the UAE?",
    answer:
      "There is a remote-work residence route for people employed by a company abroad, with its own conditions set by the authorities, and it is separate from an employment permit — your foreign employer is not sponsoring you. Check the current criteria on the official channel, and check your own employer's position on you being resident here, since that is a tax and payroll question for them.",
    service: VISA,
    phrases: [
      "can i work remotely for a company outside the uae",
      "is there a remote work visa for dubai",
      "can i live in dubai and work for a foreign company",
      "how does the uae virtual working programme work",
    ],
    keywords: [["work", "remotely", "company", "outside"], ["remote", "work", "visa"]],
    next: ["job-legal-freelance-permit", "job-pay-tax", "job-legal-golden-visa-search"],
  },

  /* ── Situations people think will disqualify them ──────────────────────── */
  {
    id: "job-people-fresher",
    question: "I am a fresher with no experience — will anyone hire me?",
    answer:
      "Yes, but you compete on evidence rather than on years: internships, final-year projects, part-time work, certifications and anything you have built or run. Apply to graduate and assistant-level titles rather than to roles asking for three years, put your degree and your projects above the fold on the CV, and use your university's alumni network here, which is the most underused route a graduate has.",
    service: CV,
    phrases: [
      "i am a fresher with no experience will anyone hire me",
      "how do i get my first job in dubai",
      "are there entry level jobs in the uae for graduates",
      "can a fresh graduate get a job in dubai",
    ],
    keywords: [["fresher", "experience", "hire"], ["first", "job", "dubai"], ["graduate", "entry", "level"]],
    next: ["job-cv-no-uae-experience", "job-people-internship", "job-where-referrals"],
  },
  {
    id: "job-people-internship",
    question: "Are internships worth doing here?",
    answer:
      "For a graduate without local experience, an internship or a training contract is often the fastest way into a company that will not hire you directly, and some employers here run structured programmes. Check what permit the internship requires — it is not automatically covered by a visit or student visa — and get the scope and any stipend in writing before starting.",
    service: CV,
    phrases: [
      "are internships worth doing in the uae",
      "how do i find an internship in dubai",
      "do internships lead to jobs in the uae",
      "what visa do i need for an internship in dubai",
    ],
    keywords: [["internships", "worth", "doing"], ["find", "internship", "dubai"]],
    next: ["job-people-fresher", "job-people-student", "job-legal-student-to-work"],
  },
  {
    id: "job-people-student",
    question: "Can I work part-time while studying here?",
    answer:
      "There are permit types that allow students to work part-time or during training, and the conditions depend on your age, your institution and the authority issuing the permit — so this is a question for your university's student services and MOHRE rather than for an employer who says it will be fine. Working without the right permit puts your student status at risk, which is a bad trade for a temporary job.",
    service: VISA,
    phrases: [
      "can i work part time while studying in dubai",
      "are students allowed to work in the uae",
      "can i get a part time job on a student visa",
      "student work permit rules in the uae",
    ],
    keywords: [["students", "allowed", "work"], ["part", "time", "student", "visa"]],
    next: ["job-legal-part-time-permit", "job-legal-student-to-work", "job-people-internship"],
  },
  {
    id: "job-people-career-gap",
    question: "I have been out of work for a long time",
    answer:
      "Long gaps are common and they are a presentation problem more than a barrier. Name the period and the reason on the CV, add anything current — a course, a certification, freelance or volunteer work — and target roles where your last relevant experience is still recognisable. Then apply steadily rather than in bursts, because the search itself is what rebuilds momentum.",
    service: CV,
    phrases: [
      "i have been out of work for a long time",
      "i have been unemployed for two years can i still get hired",
      "does a long gap make me unemployable in dubai",
      "how do i restart my career after a long break",
    ],
    keywords: [["out", "work", "long", "time"], ["long", "gap", "unemployable"]],
    next: ["job-cv-gap", "job-interview-gap-question", "job-people-career-change"],
  },
  {
    id: "job-people-older-candidate",
    question: "Am I too old to be hired in the UAE?",
    answer:
      "Experienced candidates are hired here regularly, particularly where the role needs judgement, regulatory knowledge or client relationships, and some visa and insurance considerations that people worry about are matters for the employer rather than bars on you. What helps is targeting seniority-appropriate roles, keeping the CV to the last fifteen years or so, and showing current tools and certifications.",
    service: CV,
    phrases: [
      "am i too old to be hired in the uae",
      "is there an age limit for jobs in dubai",
      "can i get a job in dubai after fifty",
      "do uae employers prefer younger candidates",
    ],
    keywords: [["too", "old", "hired"], ["age", "limit", "jobs"]],
    next: ["job-apply-overqualified", "job-cv-length", "job-people-career-change"],
  },
  {
    id: "job-people-career-change",
    question: "Can I change field when I move here?",
    answer:
      "It is harder in the same move than one at a time, because employers here hire against a specific title and a visa category. If you are changing field, lead with transferable evidence rather than with your job history, get a recognised certification in the new field if one exists, and consider making the geographic move first in your current field and the career move afterwards.",
    service: CV,
    phrases: [
      "can i change field when i move here",
      "how do i switch careers in dubai",
      "can i move into a different industry in the uae",
      "is it possible to change profession when relocating to dubai",
    ],
    keywords: [["change", "field", "move"], ["switch", "careers", "dubai"]],
    next: ["job-cv-summary-objective", "job-apply-overqualified", "job-people-fresher"],
  },
  {
    id: "job-people-women",
    question: "What should women know about working here?",
    answer:
      "Women work across every sector here, and the law provides for maternity entitlements and equal pay for the same work, with MOHRE as the authority on the current provisions. Practical things worth checking in an offer: accommodation arrangements if provided, transport for late shifts, and the maternity and nursing provisions written into your contract rather than assumed.",
    service: CV,
    phrases: [
      "what should women know about working in the uae",
      "is dubai a good place for women to work",
      "what maternity rights do employees have in the uae",
      "are there restrictions on women working in dubai",
    ],
    keywords: [["women", "working", "uae"], ["maternity", "rights", "employees"]],
    next: ["job-offer-leave", "job-pay-insurance", "job-interview-dress-code"],
  },
  {
    id: "job-people-family-back-home",
    question: "How do people manage with family in another country?",
    answer:
      "Most people arrive alone and bring family later, once residence is issued and the sponsorship criteria are met — which depend on salary, accommodation and job category. Plan for the gap honestly: the flight entitlement, the schooling calendar in the country you are leaving, and the attested marriage and birth certificates you will need. Getting those documents done before you move is the single most useful thing you can do early.",
    service: VISA,
    phrases: [
      "how do people manage with family in another country",
      "should i move to dubai alone first",
      "when do expats bring their families to the uae",
      "is it hard to work in dubai while my family is abroad",
    ],
    keywords: [["family", "another", "country"], ["move", "dubai", "alone"]],
    next: ["job-permit-family-sponsorship", "job-papers-marriage-birth", "job-pay-school-fees"],
  },
  {
    id: "job-people-spouse-relocating",
    question: "My spouse has a job here — what are my options?",
    answer:
      "You can usually be sponsored as a dependent and still work once an employer obtains a work permit for you, which is a route many people do not realise exists and some employers do not either. It can make you cheaper and faster to hire, so it is worth saying plainly in your applications. MOHRE is the authority on the current conditions.",
    service: VISA,
    phrases: [
      "my spouse has a job here what are my options",
      "can i work if my husband sponsors my visa in dubai",
      "i am relocating with my partner can i find work",
      "how do trailing spouses find jobs in the uae",
    ],
    keywords: [["spouse", "job", "options"], ["relocating", "partner", "find", "work"]],
    next: ["job-legal-dependent-permit", "job-cv-visa-status-line", "job-hub-where"],
  },
  {
    id: "job-people-language-barrier",
    question: "My English is not strong — will that stop me?",
    answer:
      "It depends entirely on the role. Site, trade, kitchen, driving and many operational jobs are done here by people with limited English every day. Client-facing, administrative and professional roles will test it in the interview. Be honest about your level, apply where it fits, and if the gap is costing you interviews, a course is a better investment than more applications.",
    service: CV,
    phrases: [
      "my english is not strong will that stop me",
      "can i work in dubai with poor english",
      "do i need good english for a uae job",
      "will language be a problem for me in dubai",
    ],
    keywords: [["english", "strong", "stop"], ["work", "dubai", "poor", "english"]],
    next: ["job-sector-hospitality", "job-sector-construction", "job-interview-phone-screen"],
  },
  {
    id: "job-people-blue-collar",
    question: "I am coming for a labour or technician job — what should I watch for?",
    answer:
      "The rules that protect you are the same ones everyone else has: the employer pays the recruitment and visa costs, your passport stays yours, the contract you signed at home should match the one you sign here, and your wages go through the protected payment system. If any of those is different in practice, MOHRE is the body to raise it with, and they take complaints directly from workers.",
    service: VISA,
    phrases: [
      "i am coming for a labour job what should i watch for",
      "what rights do workers have in the uae",
      "my agent at home arranged a job in dubai what should i check",
      "what protections do labourers have in dubai",
    ],
    keywords: [["labour", "job", "watch"], ["rights", "workers", "uae"]],
    next: ["job-agency-overseas-agent", "job-scam-passport-held", "job-pay-wps"],
  },
  {
    id: "job-people-emiratisation",
    question: "Does Emiratisation affect my chances as an expat?",
    answer:
      "Emiratisation sets targets for hiring UAE nationals in parts of the private sector, and it shapes where employers concentrate their national hiring rather than closing the market to everyone else — the majority of the private workforce here remains expatriate. The targets and the categories they apply to change, so MOHRE's own published position is what to rely on rather than commentary.",
    service: CV,
    phrases: [
      "does emiratisation affect my chances as an expat",
      "are companies in the uae only hiring nationals now",
      "what is the emiratisation quota for private companies",
      "will emiratisation stop me getting a job in dubai",
    ],
    keywords: [["emiratisation", "affect", "chances"], ["hiring", "nationals", "companies"]],
    next: ["job-where-government", "job-permit-quota", "job-hub-where"],
  },
  {
    id: "job-people-disability",
    question: "I have a disability — how is that handled by employers?",
    answer:
      "There is a legal framework supporting the employment of people of determination, and a number of larger employers and government entities run specific programmes. In practice, mention accommodations when you need them rather than early in a screening call, and ask about the workplace itself at interview. If an employer's process is inaccessible, that is worth raising with them directly.",
    service: CV,
    phrases: [
      "i have a disability how is that handled by employers",
      "can people of determination work in the uae",
      "are there jobs in dubai for disabled applicants",
      "do uae employers make workplace adjustments",
    ],
    keywords: [["disability", "handled", "employers"], ["determination", "work", "uae"]],
    next: ["job-interview-questions-to-ask", "job-hub-where", "job-people-language-barrier"],
  },
  {
    id: "job-people-freelancer-to-employee",
    question: "I have been freelancing — how do I go back to a salaried job?",
    answer:
      "Present the freelance period as a role rather than a gap: one heading, the span of dates, and the clients, scale and outcomes underneath it. Employers worry that a freelancer will leave again, so say clearly why you want a permanent position now. If you hold a freelance permit, make sure you understand how it is cancelled or coexists with an employment permit before you accept.",
    service: CV,
    phrases: [
      "i have been freelancing how do i go back to a salaried job",
      "how do i put freelance work on my cv",
      "do employers in dubai take freelancers seriously",
      "moving from freelance to full time in the uae",
    ],
    keywords: [["freelancing", "back", "salaried"], ["freelance", "work", "cv"]],
    next: ["job-legal-freelance-permit", "job-cv-gap", "job-cv-achievements"],
  },
  {
    id: "job-people-second-career",
    question: "I am retiring or leaving a long career — is there work here?",
    answer:
      "Consulting, advisory, training, quality and compliance roles here often want exactly the depth a long career gives, and there is a retirement residence route for people who meet its criteria if you want to be here without employer sponsorship. Position yourself by the problem you solve rather than by your last title, and be explicit about the commitment you are offering.",
    service: CV,
    phrases: [
      "i am retiring or leaving a long career is there work here",
      "can i get consulting work in dubai after retiring",
      "can i stay in the uae after i stop working",
      "can older professionals find part time work in dubai",
    ],
    keywords: [["retiring", "leaving", "career"], ["retirement", "visa", "uae"]],
    next: ["job-people-older-candidate", "job-legal-freelance-permit", "job-legal-golden-visa-search"],
  },
  {
    id: "job-people-morale",
    question: "The search is going badly and I am running out of time",
    answer:
      "Two practical things help more than encouragement. First, separate what you control — the quality of the CV, the number of targeted applications, the referrals you ask for — from what you do not, and work only on the first list. Second, get the visa position clear and dated, because a deadline you understand is manageable and one you are avoiding is not. If money is the pressure, deal with the grace period and the cost of staying before the job search itself.",
    service: CV,
    phrases: [
      "the search is going badly and i am running out of time",
      "i am losing hope of finding a job in dubai",
      "my money is running out while job hunting in the uae",
      "how long does a job search in dubai usually take",
    ],
    keywords: [["running", "out", "time"], ["losing", "hope", "finding"]],
    next: ["job-legal-cancelled-grace", "job-apply-no-replies", "job-us-cv-service"],
  },

  /* ── Moving from one UAE employer to another ───────────────────────────── */
  {
    id: "job-change-notice",
    question: "How much notice do I have to give?",
    answer:
      "Whatever your registered contract states within the range the law allows, and it runs from when you give written notice rather than from when your employer acknowledges it. Give it in writing, keep proof of delivery, and confirm whether your employer will accept payment in lieu if the new job needs you sooner. Do not stop attending in the meantime.",
    service: VISA,
    phrases: [
      "how much notice do i have to give in my uae job",
      "how do i resign properly in dubai",
      "does my notice period start when i tell my manager",
      "can i leave earlier than my notice period in the uae",
    ],
    keywords: [["notice", "give", "job"], ["resign", "properly", "dubai"]],
    next: ["job-change-resignation-letter", "job-change-noc", "job-change-early-exit"],
  },
  {
    id: "job-change-resignation-letter",
    question: "What should my resignation letter say?",
    answer:
      "Keep it short and factual: that you are resigning, the date of the letter, your last working day calculated from your contractual notice, and a line offering to hand over. Do not put grievances in it. Send it to your manager and to HR, keep a copy, and ask for written acknowledgement — that acknowledgement is what settles arguments about dates later.",
    service: VISA,
    phrases: [
      "what should my resignation letter say",
      "how do i write a resignation letter in the uae",
      "who do i send my resignation to in a dubai company",
      "do i need to give resignation in writing in the uae",
    ],
    keywords: [["resignation", "letter", "say"], ["resignation", "writing", "uae"]],
    next: ["job-change-notice", "job-change-final-settlement", "job-change-current-employer-reference"],
  },
  {
    id: "job-change-noc",
    question: "Do I need a no-objection certificate to move?",
    answer:
      "Reforms to UAE labour law removed much of the old reliance on an employer's NOC for moving between jobs, and transfer is now largely a procedural matter through MOHRE or the free zone — but practice varies by authority and by your contract, and free zones have their own rules. Confirm your own case with MOHRE or the free zone before you assume either that you need one or that you do not.",
    service: VISA,
    phrases: [
      "do i need a no objection certificate to move jobs",
      "is an noc required to change employer in dubai",
      "my current employer will not release me to another job",
      "can i switch jobs in the uae without permission",
    ],
    keywords: [["objection", "certificate", "move"], ["noc", "change", "employer"]],
    next: ["job-change-transfer", "job-change-ban", "job-change-notice"],
  },
  {
    id: "job-change-ban",
    question: "Will I get a labour ban if I leave?",
    answer:
      "Employment bans are much narrower than they used to be, and a ban today generally follows specific circumstances — leaving without notice, an absconding report, or a breach — rather than being automatic on resignation. Because this is exactly the area that was reformed, check the current position with MOHRE rather than with a colleague who moved years ago. If a ban has already been recorded against you, get advice before applying for anything.",
    service: VISA,
    phrases: [
      "will i get a labour ban if i leave",
      "is there still a six month ban in the uae",
      "does resigning cause a work ban in dubai",
      "i have a labour ban what can i do",
    ],
    keywords: [["labour", "ban", "leave"], ["resigning", "ban", "dubai"]],
    next: ["job-change-absconding", "job-change-noc", "job-change-complaint"],
  },
  {
    id: "job-change-transfer",
    question: "How does transferring to a new employer work?",
    answer:
      "The new employer applies for a work permit and the transfer is processed through MOHRE or the relevant free zone, with your existing permit cancelled as part of it — often without you leaving the country. It needs both employers' paperwork to be in order, so the timing of your resignation and your new start date should be agreed with the new employer's PRO rather than guessed.",
    service: VISA,
    phrases: [
      "how does transferring to a new employer work",
      "can i transfer my visa to another company in dubai",
      "what is the process to move my work permit",
      "does my new employer handle the visa transfer",
    ],
    keywords: [["transferring", "new", "employer"], ["transfer", "visa", "another", "company"]],
    next: ["job-change-noc", "job-permit-steps", "job-change-notice"],
  },
  {
    id: "job-change-early-exit",
    question: "What if I want to leave before my contract ends?",
    answer:
      "A fixed-term contract sets out what happens on early termination, and the law provides for compensation in some circumstances — which can run either way depending on who ends it and why. Read your own termination clause before you resign, and if there is a bond or a repayment term attached, get advice on it rather than an opinion.",
    service: VISA,
    phrases: [
      "what if i want to leave before my contract ends",
      "can i break my fixed term contract in the uae",
      "what is the penalty for early resignation in dubai",
      "leaving a uae job before the contract period finishes",
    ],
    keywords: [["leave", "before", "contract", "ends"], ["break", "fixed", "term", "contract"]],
    next: ["job-offer-contract-type", "job-offer-bond-clause", "job-change-gratuity"],
  },
  {
    id: "job-change-probation-exit",
    question: "Can I resign during probation?",
    answer:
      "Yes, with the notice the law requires during probation, which differs depending on whether you are leaving the country or joining another UAE employer — and in the second case there can be a reimbursement owed to your first employer by the new one. Check the current provisions with MOHRE, because this part of the law was rewritten and older advice is unreliable.",
    service: VISA,
    phrases: [
      "can i resign during probation in the uae",
      "what notice applies in my probation period in dubai",
      "i want to quit in my first month in the uae",
      "leaving a job during probation in dubai",
    ],
    keywords: [["resign", "during", "probation"], ["quit", "first", "month"]],
    next: ["job-offer-probation", "job-change-notice", "job-permit-cancel-probation"],
  },
  {
    id: "job-change-terminated",
    question: "I was dismissed — what are my options?",
    answer:
      "Get the termination in writing with the stated reason, and check whether your notice and end-of-service entitlements have been paid correctly. Dismissal for cause and dismissal on notice are different in law and have different consequences for your gratuity and your permit. If you believe it was arbitrary, MOHRE's complaint route or a lawyer is the path — and act promptly, since time limits apply.",
    service: VISA,
    phrases: [
      "i was dismissed what are my options",
      "my employer terminated me in dubai what now",
      "what are my rights if i am fired in the uae",
      "can i challenge an unfair dismissal in dubai",
    ],
    keywords: [["dismissed", "options"], ["terminated", "employer", "dubai"], ["fired", "rights", "uae"]],
    next: ["job-change-complaint", "job-change-final-settlement", "job-legal-cancelled-grace"],
  },
  {
    id: "job-change-absconding",
    question: "What is an absconding report?",
    answer:
      "It is a report an employer can file when an employee stops attending work without notice, and it has serious consequences for your status and for future permits. If one has been filed against you — particularly wrongly, after a dispute — do not ignore it: it is dealt with through MOHRE and, where the facts are contested, with legal advice. Never simply stop attending as a way of leaving a job.",
    service: VISA,
    phrases: [
      "what is an absconding report",
      "my employer filed an absconding case against me",
      "what happens if i stop going to work in dubai",
      "how do i remove an absconding complaint in the uae",
    ],
    keywords: [["absconding", "report"], ["absconding", "case", "employer"], ["stop", "going", "work"]],
    next: ["job-change-complaint", "job-change-ban", "job-scam-passport-held"],
  },
  {
    id: "job-change-complaint",
    question: "How do I raise a complaint against an employer?",
    answer:
      "Mainland employees go to MOHRE — through their app, website or call centre — and free zone employees to their own authority, with DIFC and ADGM having their own tribunals. Put your case in writing with the contract, payslips and messages attached, and keep it factual. Get advice before resigning as part of a dispute, because how you leave affects what you can claim.",
    service: VISA,
    phrases: [
      "how do i raise a complaint against an employer",
      "where do i file a labour case in dubai",
      "how does a mohre complaint work",
      "my company is breaking the contract what can i do",
    ],
    keywords: [["complaint", "against", "employer"], ["labour", "case", "file"]],
    next: ["job-pay-unpaid-salary", "job-change-terminated", "job-change-final-settlement"],
  },
  {
    id: "job-change-gratuity",
    question: "Do I lose my gratuity if I resign?",
    answer:
      "Resigning does not automatically forfeit end-of-service entitlement — what you receive depends on your completed service, your basic salary and the current provisions of the labour law, and the old rules people remember about reduced payments on resignation were changed. Work it from your own contract and confirm the current formula with MOHRE rather than relying on what a colleague was paid years ago.",
    service: VISA,
    phrases: [
      "do i lose my gratuity if i resign",
      "is end of service paid when you quit in the uae",
      "how is gratuity affected by resignation in dubai",
      "will i still get my settlement if i leave voluntarily",
    ],
    keywords: [["lose", "gratuity", "resign"], ["service", "paid", "quit"]],
    next: ["job-pay-gratuity", "job-change-final-settlement", "job-change-notice"],
  },
  {
    id: "job-change-final-settlement",
    question: "What should be in my final settlement?",
    answer:
      "Your outstanding salary, payment for untaken leave, any notice paid in lieu, your end-of-service entitlement, and anything contractual such as a ticket. Check the calculation against your basic salary and your service dates before signing anything that describes itself as a full and final discharge, because signing it closes the question. If the figures are wrong, raise it in writing first.",
    service: VISA,
    phrases: [
      "what should be in my final settlement",
      "what do i get paid when leaving a job in the uae",
      "should i sign a full and final settlement in dubai",
      "my final settlement looks wrong",
    ],
    keywords: [["final", "settlement", "should"], ["full", "final", "settlement", "sign"]],
    next: ["job-change-gratuity", "job-change-complaint", "job-change-resignation-letter"],
  },
  {
    id: "job-change-current-employer-reference",
    question: "How do I look for a job without my employer finding out?",
    answer:
      "Use the discreet setting on LinkedIn rather than the public badge, do not list your current manager as a referee, ask recruiters to confirm the client name before submitting you anywhere, and interview outside working hours where you can. Tell a prospective employer that references from your current company are available after an offer — that is normal and understood.",
    service: CV,
    phrases: [
      "how do i look for a job without my employer finding out",
      "can i job hunt secretly while employed in dubai",
      "will my boss find out i am applying elsewhere",
      "how do i keep my job search confidential in the uae",
    ],
    keywords: [["employer", "finding", "out"], ["job", "search", "confidential"]],
    next: ["job-cv-linkedin-open-to-work", "job-agency-cv-shared", "job-apply-reference-check"],
  },
  {
    id: "job-change-two-jobs",
    question: "Can I keep my job while starting a new one?",
    answer:
      "Only with the right permit. MOHRE issues permits that allow working for more than one employer, and doing it informally puts your status at risk rather than your employers'. If your new role overlaps with your notice period, the honest route is to agree the dates with both employers rather than to double up quietly.",
    service: VISA,
    phrases: [
      "can i keep my job while starting a new one",
      "can i work for two employers at the same time in the uae",
      "is moonlighting allowed in dubai",
      "what if my new job starts before my notice ends",
    ],
    keywords: [["keep", "job", "starting", "new"], ["two", "employers", "same", "time"]],
    next: ["job-legal-part-time-permit", "job-change-notice", "job-change-transfer"],
  },
  {
    id: "job-change-counter-offer",
    question: "Should I accept a counter-offer from my current employer?",
    answer:
      "Ask what changed. If the answer is only money, the reasons you were leaving are still there and will be there in six months. If it is scope, reporting line or a written promotion, that is a different proposition — get it in a revised contract rather than a conversation. Whatever you decide, do not use the other offer as leverage unless you would genuinely take it.",
    service: CV,
    phrases: [
      "should i accept a counter offer from my current employer",
      "my company offered me more money to stay in dubai",
      "is taking a counter offer a bad idea",
      "my employer wants to match the new salary",
    ],
    keywords: [["counter", "offer", "accept"], ["match", "new", "salary"]],
    next: ["job-offer-negotiate", "job-change-notice", "job-offer-two-offers"],
  },

  /* ── What we do, and what we do not ────────────────────────────────────── */
  {
    id: "job-us-find-jobs",
    question: "Will you find me a job?",
    answer:
      "No — we are not a recruitment agency and we do not place candidates, so anyone telling you we can get you hired is describing a service we do not sell. What we do is the part that decides whether an application gets read and whether an offer turns into a residence: the CV and covering letter, the attestation and translation of your certificates, and the visa filing. The vacancies on our jobs page are aggregated from employers and boards, and you apply to them directly.",
    service: CV,
    phrases: [
      "will you find me a job",
      "can you get me a job in dubai",
      "do you place candidates with employers",
      "can you arrange employment for me in the uae",
    ],
    keywords: [["find", "me", "job"], ["get", "job", "dubai"], ["place", "candidates", "employers"]],
    next: ["job-us-jobs-board", "job-us-cv-service", "job-us-charge-jobseekers"],
  },
  {
    id: "job-us-jobs-board",
    question: "How does your jobs page work?",
    answer:
      "It lists current vacancies gathered from job boards and from employers, with the emirate, the category and the documents each kind of role usually needs. Listings link straight to the employer or to the board that posted them, so you apply there rather than through us, and nothing on that page costs you anything. Older listings come down automatically, so what you see is current rather than an archive.",
    service: CV,
    phrases: [
      "how does your jobs page work",
      "where do the vacancies on your site come from",
      "do i apply through your website for these jobs",
      "are the jobs listed on your site real",
    ],
    keywords: [["jobs", "page", "work"], ["vacancies", "site", "come"]],
    next: ["job-us-find-jobs", "job-us-charge-jobseekers", "job-hub-where"],
  },
  {
    id: "job-us-charge-jobseekers",
    question: "Do you charge job seekers anything?",
    answer:
      "Not for applying, not for being listed, and not for access to the vacancies — those are free and always will be, because charging a job seeker to be considered for work is the thing UAE labour law puts on the employer and the thing every scam on this page has in common. What we do charge for is work we perform for you: writing your CV, attesting a certificate, translating a document, filing a visa application.",
    service: CV,
    phrases: [
      "do you charge job seekers anything",
      "is your job service free for candidates",
      "do i have to pay you to apply for a vacancy",
      "are you taking money from applicants",
    ],
    keywords: [["charge", "job", "seekers"], ["service", "free", "candidates"]],
    next: ["job-us-cv-service", "job-agency-fee", "job-us-find-jobs"],
  },
  {
    id: "job-us-cv-service",
    question: "What does your CV writing service include?",
    answer:
      "We rewrite your CV for this market — the format recruiters here expect, the terms the screening software looks for, and your experience written as results rather than duties — together with a matching cover letter and a LinkedIn summary, and one round of revisions. It starts from your current CV and a short call to pull out the achievements most people leave off.",
    service: CV,
    phrases: [
      "what does your cv writing service include",
      "what do i get if you write my cv",
      "tell me about your resume writing service",
      "do you write cover letters and linkedin profiles too",
    ],
    keywords: [["cv", "writing", "service", "include"], ["resume", "writing", "service"]],
    next: ["job-us-cv-what-we-need", "job-us-cv-cost", "job-us-cv-revisions"],
  },
  {
    id: "job-us-cv-cost",
    question: "What do you charge to write a CV?",
    answer:
      "It depends on what you actually need — a rewrite of an existing CV, a full build for a career change, whether the cover letter and LinkedIn are included, and how senior the roles you are targeting are. Rather than publish a number that turns out not to apply to you, we would rather take two minutes of details and have our team come back with the real figure for your case.",
    service: CV,
    phrases: [
      "what do you charge to write a cv",
      "how much does your cv writing cost",
      "price for cv writing in dubai",
      "what are your resume writing charges",
      "cv writing fee",
    ],
    keywords: [
      ["charge", "write", "cv"],
      ["cv", "writing", "cost"],
      ["resume", "writing", "charges"],
      ["cv", "writing", "fee"],
      ["cv", "writing", "price"],
      ["cost", "cv", "service"],
      ["much", "professional", "cv"],
      ["budget", "cv", "writing"],
      ["estimate", "cv", "writing"],
    ],
    quote: true,
  },
  {
    id: "job-us-cv-what-we-need",
    question: "What do you need from me to start on my CV?",
    answer:
      "Your current CV in any format, one or two adverts for the kind of role you are targeting, and the certificates you want referenced. Then a short call, because the things that make a CV work here — what you actually changed, the scale you worked at, the systems you used — are usually the things people leave out of the version they send us.",
    service: CV,
    phrases: [
      "what do you need from me to start on my cv",
      "what should i send you for the cv service",
      "how does the cv writing process work with you",
      "do i need to send my old cv",
    ],
    keywords: [["need", "start", "cv"], ["send", "cv", "service"]],
    next: ["job-us-cv-service", "job-us-cv-revisions", "job-us-cv-cost"],
  },
  {
    id: "job-us-cv-revisions",
    question: "What if I am not happy with the CV you write?",
    answer:
      "A round of revisions is included, and the point of the call at the start is to avoid needing more than that. Tell us what does not sound like you or what a recruiter in your field would read differently, and we will work it through. What we will not do is put a claim on your CV that you cannot stand behind in an interview.",
    service: CV,
    phrases: [
      "what if i am not happy with the cv you write",
      "do you offer revisions on the cv",
      "can i ask for changes to the resume you wrote",
      "what if the cv does not sound like me",
    ],
    keywords: [["happy", "cv", "write"], ["revisions", "cv", "offer"]],
    next: ["job-us-cv-service", "job-us-cv-what-we-need", "job-us-guarantee"],
  },
  {
    id: "job-us-guarantee",
    question: "Can you guarantee I will get interviews?",
    answer:
      "No, and anyone who does is selling you something. A CV decides whether you are read; the market, the role and the interview decide the rest. What a good CV reliably changes is the proportion of applications that get a reply, and what we can tell you honestly is where yours is losing people — which is usually the format, the targeting or a missing visa line.",
    service: CV,
    phrases: [
      "can you guarantee i will get interviews",
      "will a professional cv get me a job in dubai",
      "does a rewritten resume actually help",
      "do you promise results from the cv service",
    ],
    keywords: [["guarantee", "get", "interviews"], ["professional", "cv", "job"]],
    next: ["job-us-cv-service", "job-agency-guaranteed-job", "job-cv-common-mistakes"],
  },
  {
    id: "job-us-other-services",
    question: "What else do you do that a job seeker needs?",
    answer:
      "Four things come up constantly in a UAE job move: certificate attestation, certified legal translation, visa processing, and the CV itself. Those are the services we run, and they are the steps that most often sit between an offer and a start date. If what you need is outside that, we will say so rather than invent a service.",
    service: CV,
    phrases: [
      "what else do you do that a job seeker needs",
      "what services do you provide besides cv writing",
      "can you help with my attestation and visa too",
      "what other help do you offer for moving to dubai",
    ],
    keywords: [["else", "job", "seeker", "needs"], ["services", "provide", "besides"]],
    next: ["job-papers-degree-attestation", "job-papers-translation", "job-permit-steps"],
  },
  {
    id: "job-us-data-privacy",
    question: "What happens to my CV and documents when I send them?",
    answer:
      "They are used to do the work you asked for and to come back to you about it, and they are not sold or posted anywhere. We do not send your CV to employers, because we do not place people — if you want it sent somewhere, you send it. If you want your details removed from our records, ask and we will remove them.",
    service: CV,
    phrases: [
      "what happens to my cv and documents when i send them",
      "do you share my details with employers",
      "is my personal information safe with you",
      "can you delete my data after the work is done",
    ],
    keywords: [["happens", "cv", "documents", "send"], ["share", "details", "employers"]],
    next: ["job-agency-cv-shared", "job-scam-identity-documents", "job-us-contact"],
  },
  {
    id: "job-us-contact",
    question: "How do I talk to a person about my case?",
    answer:
      "Leave your name and number and our team will call you back — the enquiry form on any service page reaches the right team directly, and the chat can take your details here too. It is worth having the basics ready: what you are trying to do, which country your documents come from, and where you are in the process.",
    service: CV,
    phrases: [
      "how do i talk to a person about my case",
      "can someone call me back about my job situation",
      "i want to speak to your team about my documents",
      "how do i contact you",
    ],
    keywords: [["talk", "person", "case"], ["call", "back", "team"]],
    next: ["job-us-cv-cost", "job-us-other-services", "job-hub-start"],
  },
  {
    id: "job-us-languages",
    question: "Can you help me in a language other than English?",
    answer:
      "Our team works in English and Arabic, and our legal translation service covers the certificate and contract work between them. If your documents are in another language, that is a translation question rather than a barrier — tell us the language and the document and we will tell you what is possible.",
    service: TRANSLATE,
    phrases: [
      "can you help me in a language other than english",
      "do you speak arabic or hindi",
      "can i deal with your team in my own language",
      "what languages do you work in",
    ],
    keywords: [["help", "language", "english"], ["languages", "work", "team"]],
    next: ["job-papers-translation", "job-us-contact", "job-papers-translation-cost"],
  },
];
