/**
 * The two things this company makes itself.
 *
 * Every other pack in this directory is about work we introduce people to:
 * attestation, translation, notarisation, visas, company formation and student
 * files are all carried out by licensed providers, and those packs spend much
 * of their care on not implying otherwise. This one is the opposite. A CV and a
 * website are written and built here, by us, so these answers may say "we do
 * this" plainly — and must then be held to it, because a promise made in a chat
 * reply is a promise the delivery has to keep.
 *
 * WHY IT IS ITS OWN DOCUMENT
 *
 * The nine packs before this one are merged into a single flow that is loaded
 * and cached on **every turn of every conversation**, and the caps in
 * `lib/chat/flow/schema.ts` exist because that cost is linear in the whole
 * graph. Nine packs spend 1,597 of 1,750 nodes. This pack is 250 entries, which
 * does not fit and should not: somebody asking how to attest a degree will
 * never walk a single box of it.
 *
 * So it is published as a `FlowSubjectDoc` instead, and reached through four
 * `subject` doors in `./own-work-doors.ts`. A conversation that asks about a CV
 * loads it once; every other conversation never reads a byte. That is the
 * change the schema's own note said should replace a fifth raise of the caps.
 *
 * What that buys, beyond the budget: inside this document the only competition
 * is other entries in this document. The cross-pack phrase theft that
 * `tests/relocation-flows.test.ts` and `tests/higher-studies-notarisation.test.ts`
 * spend most of their length on cannot happen here, because the attestation
 * pack is not in the room. The whole routing risk has moved to the four doors,
 * which is where the tests now point it.
 *
 * WHERE THE LINE WITH JOB SEARCH IS
 *
 * `./job-search-flows.ts` owns CV *advice* — format, length, the photo, ATS,
 * gaps, achievements, the cover letter, the LinkedIn headline, thirty entries
 * of it — and four entries about this service. None of that is re-answered
 * here, deliberately, and three entries were cut during writing for exactly
 * that reason. What lives here is the service and the cases its advice differs
 * for: who writes it, what happens on the call, what a licensed profession's CV
 * has to carry, what we will not put on one.
 *
 * Websites have no such line. Nothing anywhere else on this site answers a
 * single question about them.
 *
 * WHAT MAY BE SAID HERE
 *
 * `lib/chat/prompt.ts`'s rules, and two of them bind harder than usual because
 * this pack is selling our own work rather than describing someone else's:
 *
 *   - **No price, no turnaround promise, no outcome.** Not a figure, not "two
 *     days", not "you will get interviews" and never a search ranking. A money
 *     question carries `quote: true` and walks into the service's
 *     qualification, which ends at a callback with a person. Every answer that
 *     wants to say a number says what the number turns on instead.
 *   - **Nothing invented onto a CV, and nothing claimed on a website that the
 *     licence does not cover.** We will not write experience somebody did not
 *     have, a licence they do not hold, or a medical, legal or financial claim
 *     onto a site. Several entries exist only to say so, because being asked is
 *     routine and the answer has to be the same every time.
 *
 * Regulated ground is named and handed on rather than answered: DHA, DOH and
 * MOHAP for healthcare licensing, the Society of Engineers for engineering,
 * KHDA and ADEK for teaching, the NMC or the free zone for what a trade licence
 * permits, the TDRA and the UAE's advertising rules for what a site may say.
 *
 * SHAPE
 *
 * Hubs first, then CVs, then websites. The hubs are menus: `choices` are exact
 * free transitions, and the hub keyword groups are held to two words so a hub
 * answers a vague message and never intercepts a specific one — the rule
 * `tests/higher-studies-notarisation.ts` established and this pack inherits.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";
import { landDoorPhrases } from "./doors";
import {
  CV_DOOR_PHRASES,
  WEB_BUILD_DOOR_PHRASES,
  WEB_RUNNING_DOOR_PHRASES,
} from "./own-work-doors";

const CV = "cv-resume";
const WEB = "web-development";

/**
 * A money question's groups: one price word, plus this subject's nouns.
 *
 * Carried over from ./relocation-flows.ts, but the rule it encodes **inverts**
 * inside a subject document and the first draft of this pack got that wrong.
 *
 * In the merged flow a money group had to be *long* — a price word plus two or
 * three subject nouns — because it was competing with every other pack's prose
 * for length. Here there is no other pack in the room, so length buys nothing
 * and costs reach: `priceGroups("cv", "writing")` missed "what is the cost of a
 * cv" outright, because the visitor never said "writing", and the question fell
 * out of the pack and into the model. A money group here is a price word plus
 * **one** noun, and the hubs are what it has to beat — which they lose, because
 * a hub's groups hold no price word at all.
 *
 * `sameWord` folds two words sharing five leading characters, so a group must
 * never pair "website" with "websites" or "writing" with "written". Where a
 * subject is phrased two genuinely different ways, it gets a group for each.
 */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

export const OWN_WORK_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "own-hub-start",
    question: "What do you actually make yourselves?",
    answer:
      "Two things: CVs and the documents around them, and websites. Everything else on this site — attestation, translation, notarisation, visas, company formation — is work we scope for you and hand to a licensed provider. These two we do ourselves, start to finish. Which one brought you here?",
    service: CV,
    phrases: [
      "what do you actually make yourselves",
      "what services do you provide in house",
      "what do you do rather than refer out",
      "which services are yours and which are other companies",
      "do you do the work yourself",
    ],
    keywords: [["in-house", "yourselves"], ["yourselves", "rather"]],
    faq: false,
    choices: [
      { label: "My CV", to: "own-hub-cv" },
      { label: "A website", to: "own-hub-web" },
      { label: "Both", to: "own-both-together" },
    ],
    next: ["own-hub-cv", "own-hub-web", "own-both-together"],
  },
  {
    id: "own-hub-cv",
    question: "What does your CV writing actually involve?",
    answer:
      "A short call to pull out the things you left off your own CV, then a rewrite for the market you are applying into, plus the cover letter and the LinkedIn summary that go with it. One round of revisions is part of it. What would you like to know?",
    service: CV,
    phrases: [
      "what does your cv writing actually involve",
      "how does your cv service work",
      "walk me through the cv process",
      "what happens if i order a cv",
    ],
    keywords: [["cv", "involve"], ["cv", "process"]],
    faq: false,
    choices: [
      { label: "How it works", to: "own-cv-process" },
      { label: "What I need to send", to: "own-cv-what-we-need" },
      { label: "My situation", to: "own-hub-cv-cases" },
      { label: "My profession", to: "own-hub-cv-fields" },
      { label: "What you will not do", to: "own-hub-cv-limits" },
    ],
    next: ["own-cv-process", "own-cv-what-we-need", "own-cv-who-writes"],
  },
  {
    id: "own-hub-cv-cases",
    question: "Does it change depending on my situation?",
    answer:
      "Yes, and usually more than the profession does. A graduate with nothing to list, somebody twenty years in whose CV is now six pages, and somebody explaining two years away from work are three different writing problems. Which is closest to yours?",
    service: CV,
    phrases: [
      "does it change depending on my situation",
      "i have an unusual background will that be a problem",
      "my circumstances are complicated",
    ],
    keywords: [["my", "situation"], ["unusual", "background"]],
    faq: false,
    choices: [
      { label: "I just graduated", to: "own-cv-case-graduate" },
      { label: "I am changing career", to: "own-cv-case-career-change" },
      { label: "I have been out of work", to: "own-cv-case-break" },
      { label: "I am very experienced", to: "own-cv-case-senior" },
      { label: "I was made redundant", to: "own-cv-case-redundancy" },
    ],
    next: ["own-cv-case-graduate", "own-cv-case-career-change", "own-cv-case-senior"],
  },
  {
    id: "own-hub-cv-fields",
    question: "Do you write CVs for my profession?",
    answer:
      "Almost certainly. The ones that need particular care are the licensed professions — healthcare, engineering, teaching, law and accountancy — because the regulator's requirements have to be visible on the page before a recruiter will take the application seriously. Which field are you in?",
    service: CV,
    phrases: [
      "do you write cvs for my profession",
      "do you handle my industry",
      "can you write a cv for someone in my field",
      "do you specialise in any sectors",
    ],
    keywords: [["my", "profession"], ["my", "industry"]],
    faq: false,
    choices: [
      { label: "Healthcare", to: "own-cv-field-healthcare" },
      { label: "Engineering", to: "own-cv-field-engineering" },
      { label: "Teaching", to: "own-cv-field-teaching" },
      { label: "Finance", to: "own-cv-field-finance" },
      { label: "Something else", to: "own-cv-field-other" },
    ],
    next: ["own-cv-field-healthcare", "own-cv-field-engineering", "own-cv-field-other"],
  },
  {
    id: "own-hub-cv-limits",
    question: "Is there anything you will not put on a CV?",
    answer:
      "Several things, and they are not negotiable: experience you did not have, a qualification you do not hold, a licence you have not been granted, and dates arranged to hide something. Every one of those is found at reference stage or at the regulator, and the person it costs is you. What were you thinking of?",
    service: CV,
    phrases: [
      "is there anything you will not put on a cv",
      "what will you refuse to write",
      "can you make my cv look better than the truth",
    ],
    keywords: [["refuse", "write"], ["never", "cv"]],
    faq: false,
    choices: [
      { label: "Adding experience I do not have", to: "own-cv-limit-invented" },
      { label: "Hiding a gap", to: "own-cv-limit-hide-gap" },
      { label: "A qualification in progress", to: "own-cv-limit-in-progress" },
      { label: "Guaranteeing interviews", to: "own-cv-limit-no-guarantee" },
    ],
    next: ["own-cv-limit-invented", "own-cv-limit-no-guarantee", "own-cv-limit-in-progress"],
  },
  {
    id: "own-hub-web",
    question: "What kind of websites do you build?",
    answer:
      "Business sites, portfolios, personal sites and small online shops: designed, written and built here, on your own domain, with the technical groundwork search engines need actually done rather than promised. What are you trying to put online?",
    service: WEB,
    phrases: [
      "what kind of websites do you build",
      "what sort of sites do you make",
      "what can you build for me online",
      "do you only do business websites",
    ],
    keywords: [["kind", "websites"], ["sort", "sites"]],
    faq: false,
    choices: [
      { label: "A business site", to: "own-web-type-business" },
      { label: "A portfolio", to: "own-web-type-portfolio" },
      { label: "An online shop", to: "own-web-type-shop" },
      { label: "Replacing an old site", to: "own-web-type-redesign" },
      { label: "How it works", to: "own-hub-web-process" },
    ],
    next: ["own-web-type-business", "own-hub-web-process", "own-web-what-we-need"],
  },
  {
    id: "own-hub-web-process",
    question: "How does building a website with you work?",
    answer:
      "Four stages, and you see it at the end of each: we agree what the site is for and what a visitor should do, we design it, we build it, then we launch on your domain and hand over something you can keep. Nothing goes live without you having looked at it. Where shall I start?",
    service: WEB,
    phrases: [
      "how does building a website with you work",
      "what is your web design process",
      "what are the stages of a website project",
      "what happens after i say yes to a website",
    ],
    keywords: [["website", "process"], ["stages", "project"]],
    faq: false,
    choices: [
      { label: "What you need from me", to: "own-web-what-we-need" },
      { label: "How long it takes", to: "own-web-timeline" },
      { label: "Who writes the words", to: "own-web-copy-who" },
      { label: "Domain and hosting", to: "own-hub-web-domain" },
      { label: "After launch", to: "own-hub-web-after" },
    ],
    next: ["own-web-what-we-need", "own-web-timeline", "own-web-copy-who"],
  },
  {
    id: "own-hub-web-domain",
    question: "What about the domain and the hosting?",
    answer:
      "Both are yours and stay yours — registered in your name, on an account you control, so nothing about leaving us is complicated. We will set them up for you or work with what you already have. What do you want to know?",
    service: WEB,
    phrases: [
      "what about the domain and the hosting",
      "who handles the domain name",
      "do you provide hosting",
    ],
    keywords: [["domain", "hosting"], ["hosting", "provide"]],
    faq: false,
    choices: [
      { label: "Buying a domain", to: "own-web-domain-buy" },
      { label: ".ae or .com", to: "own-web-domain-ae-or-com" },
      { label: "I already have one", to: "own-web-domain-existing" },
      { label: "Email on my domain", to: "own-web-domain-email" },
      { label: "Who owns it", to: "own-web-domain-ownership" },
    ],
    next: ["own-web-domain-buy", "own-web-domain-ae-or-com", "own-web-domain-ownership"],
  },
  {
    id: "own-hub-web-found",
    question: "Will people actually find the site?",
    answer:
      "That depends on work that mostly happens before launch and partly never stops, and on one thing nobody can promise. We build the technical groundwork properly and write pages that answer real questions; where you rank is Google's decision and anyone who guarantees you a position is selling something. What would you like to go through?",
    service: WEB,
    phrases: [
      "will people actually find the site",
      "how will anyone find my website",
      "what do you do about search engines",
      "is seo included",
    ],
    keywords: [["find", "site"], ["search", "engines"]],
    faq: false,
    choices: [
      { label: "What SEO you include", to: "own-web-seo-included" },
      { label: "What you cannot promise", to: "own-web-seo-no-guarantee" },
      { label: "Google Business Profile", to: "own-web-seo-gbp" },
      { label: "My old site's rankings", to: "own-web-seo-migration" },
      { label: "Ads instead", to: "own-web-seo-ads" },
    ],
    next: ["own-web-seo-included", "own-web-seo-no-guarantee", "own-web-seo-gbp"],
  },
  {
    id: "own-hub-web-after",
    question: "What happens after the site goes live?",
    answer:
      "It is yours. You can take it over entirely, keep us on for changes, or call us when something needs doing — all three are normal, and none of them locks anything. What were you wondering about?",
    service: WEB,
    phrases: [
      "what happens after the site goes live",
      "what about after launch",
      "who looks after the website afterwards",
    ],
    keywords: [["after", "launch"], ["afterwards", "website"]],
    faq: false,
    choices: [
      { label: "Can I edit it myself", to: "own-web-after-edit-myself" },
      { label: "Maintenance", to: "own-web-after-maintenance" },
      { label: "Backups and security", to: "own-web-after-backups" },
      { label: "If I leave you", to: "own-web-after-leaving" },
    ],
    next: ["own-web-after-edit-myself", "own-web-after-maintenance", "own-web-after-leaving"],
  },
  {
    id: "own-hub-web-rules",
    question: "Are there rules about what a UAE website can say?",
    answer:
      "Yes, and they catch people out. What you may advertise is bounded by what your trade licence permits, several sectors need their own approval before they may claim anything, and personal data collected through a form is regulated. We build to that and tell you where a claim needs someone else's sign-off. Which part applies to you?",
    service: WEB,
    phrases: [
      "are there rules about what a uae website can say",
      "what am i allowed to advertise on my site",
      "website legal requirements in the uae",
      "do i need to show my trade licence on my website",
    ],
    keywords: [["rules", "website"], ["allowed", "advertise"]],
    faq: false,
    choices: [
      { label: "Trade licence and claims", to: "own-web-rules-licence" },
      { label: "Health or legal claims", to: "own-web-rules-regulated" },
      { label: "Privacy and data", to: "own-web-rules-privacy" },
      { label: "Prices and VAT", to: "own-web-rules-vat" },
    ],
    next: ["own-web-rules-licence", "own-web-rules-privacy", "own-web-rules-regulated"],
  },
  {
    id: "own-both-together",
    question: "Can you do my CV and a personal website together?",
    answer:
      "Yes, and for some fields it is the stronger pair — a designer, a photographer, an architect, a developer or a consultant is asking a recruiter to look at work, and a link does that better than a paragraph. The CV stays the thing that gets read first; the site is what it points at.",
    service: CV,
    phrases: [
      "can you do my cv and a personal website together",
      "i want both a cv and a portfolio site",
      "do you bundle cv and website",
      "should i have a personal site as well as a cv",
    ],
    keywords: [["cv", "and", "website"], ["both", "portfolio"]],
    next: ["own-cv-process", "own-web-type-portfolio", "own-web-portfolio-what-to-show"],
  },

  /* ── The CV service: how it actually runs ──────────────────────────────── */
  {
    id: "own-cv-process",
    question: "How does the CV process work from start to finish?",
    answer:
      "You send what you have and one or two adverts for the roles you want. We read them, then call you — that call is where the achievements you left off come out, and it is the part that does the most work. We write the CV, the cover letter and a LinkedIn summary, you read them, and one round of changes is included.",
    service: CV,
    phrases: [
      "how does the cv process work from start to finish",
      "what are the steps of your cv service",
      "what is the order of things when you write a cv",
      "take me through the cv writing steps",
    ],
    keywords: [["steps", "writing", "cv"], ["order", "cv", "service"]],
    next: ["own-cv-what-we-need", "own-cv-call", "own-cv-revisions-scope"],
  },
  {
    id: "own-cv-what-we-need",
    question: "What do you need from me to start?",
    answer:
      "Your current CV in whatever state it is in, even a rough one, and one or two adverts for roles you actually want. If you have certificates you want referenced, send those too. We do not need your passport, your Emirates ID or any document with a number on it.",
    service: CV,
    phrases: [
      "what do you need from me to start",
      "what should i send you for my cv",
      "what information do you need to write my cv",
      "do you need my documents",
    ],
    keywords: [["need", "from", "me"], ["what", "send", "you"]],
    next: ["own-cv-no-existing-cv", "own-cv-call", "own-cv-privacy"],
  },
  {
    id: "own-cv-no-existing-cv",
    question: "I do not have a CV at all — can you still help?",
    answer:
      "Yes. Plenty of people come with nothing more than a LinkedIn profile or a list of jobs in a message, and the call covers the rest. It takes longer than editing something that exists, which is worth saying up front.",
    service: CV,
    phrases: [
      "i do not have a cv at all can you still help",
      "i have never written a cv",
      "i have nothing to send you",
      "can you build a cv from scratch",
    ],
    keywords: [["from", "scratch"], ["never", "written"], ["nothing", "send"]],
    next: ["own-cv-call", "own-cv-process"],
  },
  {
    id: "own-cv-call",
    question: "What happens on the call?",
    answer:
      "We go through what you actually did rather than what your job title says, looking for the things that belong on a page and almost never make it onto one: what you changed, what it was worth, what went wrong and what you did about it. Most people find they have more to say than their CV suggested.",
    service: CV,
    phrases: [
      "what happens on the call",
      "do i have to speak to someone",
      "is there an interview before you write my cv",
      "how long is the call",
    ],
    keywords: [["on", "the", "call"], ["speak", "someone"]],
    next: ["own-cv-call-language", "own-cv-call-timezone", "own-cv-no-call"],
  },
  {
    id: "own-cv-no-call",
    question: "Can we do it without a call?",
    answer:
      "We can, over messages or a questionnaire, and sometimes that suits a shift worker better. It is honestly a weaker result: the best lines in a CV tend to come out of a follow-up question nobody thought to write down.",
    service: CV,
    phrases: [
      "can we do it without a call",
      "i do not want to talk on the phone",
      "can we do everything over whatsapp",
      "is a call compulsory",
    ],
    keywords: [["without", "call"], ["over", "whatsapp"]],
    next: ["own-cv-call", "own-cv-process"],
  },
  {
    id: "own-cv-call-language",
    question: "Which languages can we do the call in?",
    answer:
      "English is the working language, and between us we can usually manage the call in Hindi, Urdu, Malayalam or Arabic. Say which you would prefer when you get in touch and we will tell you honestly whether we can.",
    service: CV,
    phrases: [
      "which languages can we do the call in",
      "can we speak in hindi",
      "do you speak malayalam",
      "can the call be in arabic",
    ],
    keywords: [["languages", "call"], ["speak", "hindi"], ["speak", "arabic"]],
    next: ["own-cv-call", "own-cv-arabic-version"],
  },
  {
    id: "own-cv-call-timezone",
    question: "I am not in the UAE yet — can we still do the call?",
    answer:
      "Yes, and most people who come to us have not arrived. We work to Gulf hours but will take a call outside them when the time difference needs it. Being outside the country changes nothing about the writing.",
    service: CV,
    phrases: [
      "i am not in the uae yet can we still do the call",
      "i am abroad can you still write my cv",
      "do you work with people outside the uae",
      "different time zone",
    ],
    keywords: [["outside", "uae"], ["time", "zone"], ["abroad", "cv"]],
    next: ["own-cv-call", "own-cv-process"],
  },
  {
    id: "own-cv-who-writes",
    question: "Who actually writes it — a person or a machine?",
    answer:
      "A person. We use tools to check a draft the way anyone does, but the writing and the judgement about what belongs on the page are human, and the call is the reason. A model cannot ask the follow-up question that finds the line worth leading with.",
    service: CV,
    phrases: [
      "who actually writes it a person or a machine",
      "is my cv written by ai",
      "do you use chatgpt to write cvs",
      "is there a real writer",
    ],
    keywords: [["who", "writes"], ["written", "by", "ai"], ["real", "writer"]],
    next: ["own-cv-process", "own-cv-ai-detectors"],
  },
  {
    id: "own-cv-ai-detectors",
    question: "Will my CV be flagged as AI-written?",
    answer:
      "Detectors are unreliable in both directions and no serious employer decides on one alone, but the way to not sound machine-made is to not be: specific numbers, specific projects, and sentences that only your career could produce. That is what the call is for.",
    service: CV,
    phrases: [
      "will my cv be flagged as ai written",
      "do employers check if a cv was written by ai",
      "ai detector cv",
    ],
    keywords: [["flagged", "written"], ["detector", "cv"]],
    next: ["own-cv-who-writes", "own-cv-process"],
  },
  {
    id: "own-cv-turnaround",
    question: "How quickly can you turn it around?",
    answer:
      "It depends on how much there is and how fast the call can happen, so we agree a date with you rather than publishing one. If you have a closing date, say so at the start — it changes what we promise, and we would rather decline than miss it.",
    service: CV,
    phrases: [
      "how quickly can you turn it around",
      "how long does a cv take",
      "what is the turnaround time",
      "when will my cv be ready",
    ],
    keywords: [["turnaround", "time"], ["how", "long", "cv"], ["when", "ready"]],
    next: ["own-cv-rush", "own-cv-deadline", "own-cv-process"],
  },
  {
    id: "own-cv-rush",
    question: "I need it tomorrow — is that possible?",
    answer:
      "Sometimes, and we will tell you straight away whether it is rather than taking the work and hoping. A rush compresses the call, not the writing, so there is a point past which the answer is no and you are better served by us saying so.",
    service: CV,
    phrases: [
      "i need it tomorrow is that possible",
      "can you do a rush cv",
      "urgent cv needed today",
      "same day cv",
    ],
    keywords: [["rush", "cv"], ["urgent", "today"], ["same", "day"]],
    next: ["own-cv-turnaround", "own-cv-deadline"],
  },
  {
    id: "own-cv-deadline",
    question: "The application closes on a fixed date — how do we handle that?",
    answer:
      "Tell us the date before anything else. We will either commit to it or tell you we cannot, and if the window is very tight we would rather get you a clean version of what you have than a half-finished rewrite.",
    service: CV,
    phrases: [
      "the application closes on a fixed date how do we handle that",
      "i have a deadline for the application",
      "the job advert closes this week",
    ],
    keywords: [["application", "deadline"], ["advert", "closes"]],
    next: ["own-cv-rush", "own-cv-turnaround"],
  },
  {
    id: "own-cv-revisions-scope",
    question: "What counts as a revision?",
    answer:
      "Anything about the CV we wrote: wording you want changed, emphasis you want moved, a role you remembered afterwards, a section you want cut. What is not a revision is a different CV for a different career — that is a second piece of work, and we will say so rather than quietly do half of it.",
    service: CV,
    phrases: [
      "what counts as a revision",
      "how many changes can i ask for",
      "what is included in the revision round",
      "can i ask for edits after delivery",
    ],
    keywords: [["counts", "revision"], ["many", "changes"], ["edits", "after"]],
    next: ["own-cv-revisions-more", "own-cv-not-happy", "own-cv-two-versions"],
  },
  {
    id: "own-cv-revisions-more",
    question: "What if I need more changes than that?",
    answer:
      "We will do them and tell you if it has turned into new work rather than refinement. Most people use less than the round they have; the ones who need more usually discovered something on the call afterwards, and that is fair enough.",
    service: CV,
    phrases: [
      "what if i need more changes than that",
      "can i get extra revisions",
      "more than one round of edits",
    ],
    keywords: [["more", "revisions"], ["extra", "edits"]],
    next: ["own-cv-revisions-scope", "own-cv-not-happy"],
  },
  {
    id: "own-cv-not-happy",
    question: "What if I do not like what you write?",
    answer:
      "Say so plainly and say which part — the structure, the tone, or a specific line. Most unhappiness is about tone and is fixed in one pass. If it is structural we would rather hear it immediately than at the end of the revision round.",
    service: CV,
    phrases: [
      "what if i do not like what you write",
      "what if the cv is not what i wanted",
      "i am not happy with the draft",
      "do you offer a refund",
    ],
    keywords: [["not", "happy"], ["not", "what", "wanted"], ["refund", "cv"]],
    next: ["own-cv-revisions-scope", "own-cv-tone"],
  },
  {
    id: "own-cv-tone",
    question: "Will it still sound like me?",
    answer:
      "That is the thing we are most careful about. A CV that reads like a brochure gets found out in the first interview, when the person in the room does not talk like the page. We write to be recognisably you on a good day, not somebody else.",
    service: CV,
    phrases: [
      "will it still sound like me",
      "i do not want it to sound fake",
      "will the cv sound like a template",
      "i want it to sound natural",
    ],
    keywords: [["sound", "like", "me"], ["sound", "fake"], ["sound", "natural"]],
    next: ["own-cv-who-writes", "own-cv-not-happy"],
  },
  {
    id: "own-cv-formats-delivered",
    question: "What files do I get at the end?",
    answer:
      "An editable document and a PDF built from it, so you can make small changes yourself later without coming back to us and still have a clean copy to attach. If a particular employer or portal wants a specific format, tell us and we will match it.",
    service: CV,
    phrases: [
      "what files do i get at the end",
      "do i get an editable version",
      "will you send a word file and a pdf",
      "what format is the final cv",
    ],
    keywords: [["files", "get"], ["editable", "version"], ["final", "format"]],
    next: ["own-cv-edit-later", "own-cv-portal-forms"],
  },
  {
    id: "own-cv-edit-later",
    question: "Can I update it myself in six months?",
    answer:
      "Yes, and you should. The editable file is laid out so adding a role does not break the page, and keeping it current yourself is cheaper and faster than a rewrite every time something changes.",
    service: CV,
    phrases: [
      "can i update it myself in six months",
      "will i be able to edit the cv later",
      "how do i add a new job to it",
    ],
    keywords: [["update", "myself"], ["edit", "later"], ["add", "new", "job"]],
    next: ["own-cv-formats-delivered", "own-cv-refresh"],
  },
  {
    id: "own-cv-refresh",
    question: "I had a CV written a year ago — can you just refresh it?",
    answer:
      "Yes, and if it was ours the refresh is mostly the new role and whatever has changed about what you are aiming at. If it was somebody else's we will read it honestly and tell you whether refreshing it is worth more than starting again.",
    service: CV,
    phrases: [
      "i had a cv written a year ago can you just refresh it",
      "can you update an old cv",
      "i need my cv brought up to date",
      "light touch up rather than a rewrite",
    ],
    keywords: [["refresh", "old", "cv"], ["brought", "up", "to", "date"]],
    next: ["own-cv-process", "own-cv-edit-later"],
  },
  {
    id: "own-cv-two-versions",
    question: "Can I have two versions for two different kinds of role?",
    answer:
      "Yes, and for a genuine split — operations and project management, say, or clinical and academic — two is the right answer rather than one that hedges. It is two pieces of work, which we will say before starting rather than after.",
    service: CV,
    phrases: [
      "can i have two versions for two different kinds of role",
      "i am applying for two different jobs",
      "do i need separate cvs for different sectors",
      "two cvs",
    ],
    keywords: [["two", "versions"], ["separate", "cvs"], ["different", "sectors"]],
    next: ["own-cv-case-career-change", "own-cv-tailoring"],
  },
  {
    id: "own-cv-tailoring",
    question: "Will you tailor it for each job I apply to?",
    answer:
      "We build it so you can, which is the practical answer: a clear summary and a skills block that take ten minutes to re-point at a specific advert. Doing that per application for you would cost more than it is worth to almost everybody.",
    service: CV,
    phrases: [
      "will you tailor it for each job i apply to",
      "do you customise the cv per application",
      "can you adapt it to each advert",
    ],
    keywords: [["tailor", "each", "job"], ["customise", "application"]],
    next: ["own-cv-two-versions", "own-cv-edit-later"],
  },
  {
    id: "own-cv-portal-forms",
    question: "Some employers make me fill in a form instead of attaching a CV — does that help?",
    answer:
      "It does, because the form is usually asking for the same content in boxes. A CV written as discrete achievements transfers into those fields almost unchanged, where a dense paragraph has to be rewritten on the spot in a browser.",
    service: CV,
    phrases: [
      "some employers make me fill in a form instead of attaching a cv does that help",
      "application portal asks for everything separately",
      "do i still need a cv if the form asks for everything",
    ],
    keywords: [["application", "portal"], ["fill", "form"]],
    next: ["own-cv-formats-delivered", "own-cv-process"],
  },
  {
    id: "own-cv-privacy",
    question: "What happens to what I send you?",
    answer:
      "It is used to write your CV and nothing else. We do not pass it to employers, we are not a recruitment agency and we do not sell contact lists. Ask us to delete it when we are done and we will.",
    service: CV,
    phrases: [
      "what happens to what i send you",
      "is my cv kept confidential",
      "do you share my details with employers",
      "will you delete my information afterwards",
    ],
    keywords: [["kept", "confidential"], ["share", "details"], ["delete", "information"]],
    next: ["own-cv-not-recruiter", "own-cv-what-we-need"],
  },
  {
    id: "own-cv-not-recruiter",
    question: "Do you find me the job as well?",
    answer:
      "No, and that distinction matters. We are not a recruitment agency and we are not licensed to place anyone — we write the document and you apply with it. Anyone charging a job seeker a fee to be placed in the UAE is doing something you should walk away from.",
    service: CV,
    phrases: [
      "do you find me the job as well",
      "will you apply for jobs on my behalf",
      "are you a recruitment agency",
      "can you get me a job in dubai",
      "do you place candidates",
    ],
    keywords: [["find", "me", "job"], ["apply", "on", "my", "behalf"], ["recruitment", "agency"]],
    next: ["own-cv-limit-no-guarantee", "own-cv-privacy"],
  },
  {
    id: "own-cv-cover-letter-included",
    question: "Is the cover letter part of it or extra?",
    answer:
      "Part of it. A CV without one is half an application for the kinds of role where a hiring manager reads before a system filters, and writing the two together is also how they stop contradicting each other.",
    service: CV,
    phrases: [
      "is the cover letter part of it or extra",
      "do you write the cover letter too",
      "is a cover letter included",
    ],
    keywords: [["cover", "letter", "included"], ["write", "cover", "letter"]],
    next: ["own-cv-linkedin-included", "own-cv-process"],
  },
  {
    id: "own-cv-linkedin-included",
    question: "Do you do the LinkedIn profile as well?",
    answer:
      "A LinkedIn summary comes with the CV, written for that reader rather than pasted across — the profile is found by people looking for someone like you, where the CV is read by someone who already has it. A full profile rebuild, section by section, is its own piece of work.",
    service: CV,
    phrases: [
      "do you do the linkedin profile as well",
      "can you rewrite my linkedin",
      "is linkedin included with the cv",
      "linkedin profile writing",
    ],
    keywords: [["linkedin", "included"], ["rewrite", "linkedin"], ["linkedin", "writing"]],
    next: ["own-cv-cover-letter-included", "own-both-together"],
  },
  {
    id: "own-cv-arabic-version",
    question: "Do I need an Arabic version, and can you produce one?",
    answer:
      "Very few private employers ask for one; some government and semi-government applications do. If yours does, that is a certified translation rather than a rewrite, and it goes to a translator licensed by the Ministry of Justice — which is a different service on this site, not something we do at a keyboard.",
    service: CV,
    phrases: [
      "do i need an arabic version and can you produce one",
      "can you translate my cv into arabic",
      "arabic cv for a government job",
    ],
    keywords: [["arabic", "version", "cv"], ["translate", "cv"]],
    next: ["own-cv-field-government", "own-cv-call-language"],
  },
  {
    id: "own-cv-other-documents",
    question: "Can you write other things — a bio, a personal statement, an application essay?",
    answer:
      "Short professional pieces, yes: a speaker or company bio, a personal statement for an application, the long-answer boxes a portal asks for. Academic work for submission and anything someone else will be assessed on, no.",
    service: CV,
    phrases: [
      "can you write other things a bio a personal statement an application essay",
      "do you write personal statements",
      "can you write a professional bio",
      "can you write my university application essay",
    ],
    keywords: [["personal", "statement"], ["professional", "bio"], ["application", "essay"]],
    next: ["own-cv-reference-letters", "own-cv-process"],
  },
  {
    id: "own-cv-reference-letters",
    question: "Can you write a reference or an experience letter for me?",
    answer:
      "No. A reference is a statement by the person giving it, and one written by the candidate is a forgery whoever typed it — including when the former manager says they do not mind. If you need an experience letter from a previous employer, ask them for it.",
    service: CV,
    phrases: [
      "can you write a reference or an experience letter for me",
      "i need an experience certificate written",
      "can you write a recommendation letter",
      "my old boss said i can write it myself",
    ],
    keywords: [["reference", "letter"], ["experience", "letter"], ["recommendation", "letter"]],
    next: ["own-cv-limit-invented", "own-cv-other-documents"],
  },

  /* ── Situations the writing changes for ────────────────────────────────── */
  {
    id: "own-cv-case-graduate",
    question: "I just graduated and have nothing to put on a CV.",
    answer:
      "You have more than you think, and the order is the trick: the degree and the project work lead, because that is the evidence you have, and part-time work goes in as what it proves rather than what it paid. A graduate CV that reads as short and honest beats one padded to two pages.",
    service: CV,
    phrases: [
      "i just graduated and have nothing to put on a cv",
      "fresh graduate cv with no experience",
      "i am a fresher how do i write a cv",
      "student cv",
    ],
    keywords: [["fresh", "graduate", "cv"], ["fresher", "cv"], ["student", "cv"]],
    next: ["own-cv-case-internships", "own-cv-case-first-job", "own-cv-process"],
  },
  {
    id: "own-cv-case-internships",
    question: "Do internships and university projects count?",
    answer:
      "Yes, written as work rather than as coursework. What the project was for, what you were responsible for, what it produced — that reads as experience. \"Final year project\" with a title does not.",
    service: CV,
    phrases: [
      "do internships and university projects count",
      "should i put my internship on my cv",
      "can i include my final year project",
    ],
    keywords: [["internship", "count"], ["university", "projects"], ["final", "year"]],
    next: ["own-cv-case-graduate", "own-cv-case-volunteering"],
  },
  {
    id: "own-cv-case-volunteering",
    question: "Does volunteering belong on it?",
    answer:
      "When it did something a job would have done — organised people, handled money, ran an event, taught — yes, and for a graduate it is often the strongest evidence on the page. Listed as membership with no activity behind it, no.",
    service: CV,
    phrases: [
      "does volunteering belong on it",
      "should i list volunteer work",
      "charity work on a cv",
    ],
    keywords: [["volunteer", "work"], ["charity", "cv"]],
    next: ["own-cv-case-graduate", "own-cv-case-internships"],
  },
  {
    id: "own-cv-case-first-job",
    question: "I finished a degree here on a student visa — how do I present that?",
    answer:
      "As a UAE-educated candidate, which is an advantage worth stating rather than hiding. What a reader wants to know is that you understand the market and can be employed here; the visa question is a separate conversation with the employer and does not belong in the opening lines.",
    service: CV,
    phrases: [
      "i finished a degree here on a student visa how do i present that",
      "i studied in dubai and now want a job",
      "moving from student visa to work",
    ],
    keywords: [["studied", "here"], ["student", "visa", "job"]],
    next: ["own-cv-case-graduate", "own-cv-visa-line"],
  },
  {
    id: "own-cv-case-career-change",
    question: "I am changing career — how is that written?",
    answer:
      "By leading with what transfers and being open about the change rather than disguising it. A reader who works out mid-page that your last eight years were in a different field feels misled; one told in the first three lines reads the rest looking for the evidence instead.",
    service: CV,
    phrases: [
      "i am changing career how is that written",
      "career change cv",
      "i want to move into a different industry",
      "switching fields cv",
    ],
    keywords: [["career", "change"], ["different", "industry"], ["switching", "fields"]],
    next: ["own-cv-two-versions", "own-cv-case-transferable", "own-cv-process"],
  },
  {
    id: "own-cv-case-transferable",
    question: "How do you show skills transfer when the job titles do not match?",
    answer:
      "By writing the work rather than the title. \"Managed a team of nine across two sites\" says the same thing in any sector; \"Branch Supervisor\" says it only to someone who knows that company. The titles stay accurate and stop carrying the weight.",
    service: CV,
    phrases: [
      "how do you show skills transfer when the job titles do not match",
      "my job title does not mean anything in another industry",
      "transferable skills on a cv",
    ],
    keywords: [["transferable", "skills"], ["job", "title", "match"]],
    next: ["own-cv-case-career-change", "own-cv-case-foreign-titles"],
  },
  {
    id: "own-cv-case-foreign-titles",
    question: "My job titles and company names mean nothing outside my country.",
    answer:
      "Then the CV has to carry one line of context each: what the company does and how big it is, in half a sentence. A reader who has never heard of your last employer cannot size your experience without it, and will usually assume small.",
    service: CV,
    phrases: [
      "my job titles and company names mean nothing outside my country",
      "nobody here has heard of my employer",
      "how do i explain a foreign company on my cv",
    ],
    keywords: [["company", "names", "unknown"], ["foreign", "employer"]],
    next: ["own-cv-case-transferable", "own-cv-case-senior"],
  },
  {
    id: "own-cv-case-break",
    question: "I have been out of work for a while.",
    answer:
      "It goes on the CV, briefly and without apology — a line saying what the period was, and then straight on. Gaps are normal here and the thing that damages an application is the reader noticing one you tried to hide, not the gap itself.",
    service: CV,
    phrases: [
      "i have been out of work for a while",
      "career break on my cv",
      "i have not worked for two years",
      "unemployed gap",
    ],
    keywords: [["out", "of", "work"], ["career", "break"], ["unemployed", "gap"]],
    next: ["own-cv-limit-hide-gap", "own-cv-case-caring", "own-cv-case-redundancy"],
  },
  {
    id: "own-cv-case-caring",
    question: "The gap was raising children or caring for a parent — what do I say?",
    answer:
      "Exactly that, in one line, and then move on. It is a common and entirely ordinary reason, and the CVs that handle it badly are the ones that leave a silent two-year hole for a reader to invent an explanation for.",
    service: CV,
    phrases: [
      "the gap was raising children or caring for a parent what do i say",
      "i took time off to look after my family",
      "returning to work after maternity",
    ],
    keywords: [["raising", "children"], ["caring", "parent"], ["returning", "after"]],
    next: ["own-cv-case-break", "own-cv-case-returner"],
  },
  {
    id: "own-cv-case-returner",
    question: "How do I show I am current after time away?",
    answer:
      "With anything that is: a short course finished, a certification renewed, freelance or voluntary work, software you have kept up with. One recent, dated, verifiable thing does more to answer the question than a paragraph insisting you are ready.",
    service: CV,
    phrases: [
      "how do i show i am current after time away",
      "proving my skills are still up to date",
      "i am worried i am out of touch",
    ],
    keywords: [["still", "current"], ["up", "to", "date", "skills"]],
    next: ["own-cv-case-break", "own-cv-case-caring"],
  },
  {
    id: "own-cv-case-redundancy",
    question: "I was made redundant — does that need explaining?",
    answer:
      "Not on the CV. Dates with nothing dramatic around them are read as dates; a sentence defending yourself invites the question you were trying to avoid. Prepare the answer for the interview, where it will be asked plainly and answered in a sentence.",
    service: CV,
    phrases: [
      "i was made redundant does that need explaining",
      "my company closed down",
      "i lost my job should i say why",
      "laid off cv",
    ],
    keywords: [["made", "redundant"], ["lost", "job"], ["laid", "off"]],
    next: ["own-cv-case-break", "own-cv-case-dismissed"],
  },
  {
    id: "own-cv-case-dismissed",
    question: "I left my last job badly. Does the CV have to show that?",
    answer:
      "The CV shows dates and roles, not the manner of leaving, and there is nothing dishonest about that — it is not the document for it. What it must not do is move a date or extend a role to cover the ending. That is the line, and we hold it.",
    service: CV,
    phrases: [
      "i left my last job badly does the cv have to show that",
      "i was dismissed how do i handle it",
      "i resigned suddenly",
      "do i have to say i was fired",
    ],
    keywords: [["left", "badly"], ["was", "dismissed"], ["say", "fired"]],
    next: ["own-cv-limit-invented", "own-cv-case-redundancy"],
  },
  {
    id: "own-cv-case-senior",
    question: "I have twenty-five years of experience and my CV is six pages.",
    answer:
      "Then most of it is history rather than evidence. The last ten to fifteen years carry the argument in detail and everything before becomes a short early-career line; cutting a senior CV is almost always what makes it read as senior rather than as long.",
    service: CV,
    phrases: [
      "i have twenty five years of experience and my cv is six pages",
      "my cv is too long senior",
      "how much history should an experienced person show",
      "executive cv",
    ],
    keywords: [["twenty", "years"], ["executive", "cv"], ["too", "long", "senior"]],
    next: ["own-cv-case-overqualified", "own-cv-case-foreign-titles", "own-cv-process"],
  },
  {
    id: "own-cv-case-overqualified",
    question: "I keep being told I am overqualified.",
    answer:
      "Usually that means the CV is arguing for a bigger job than the one advertised. The fix is positioning rather than deletion: lead on the part of your experience the role actually needs, and let the rest sit further down where it reads as depth instead of as a mismatch.",
    service: CV,
    phrases: [
      "i keep being told i am overqualified",
      "employers think i am too senior",
      "should i hide some of my experience",
    ],
    keywords: [["told", "overqualified"], ["too", "senior"]],
    next: ["own-cv-case-senior", "own-cv-case-downshift"],
  },
  {
    id: "own-cv-case-downshift",
    question: "I am willing to take a step down to get into the UAE market. How do I say that?",
    answer:
      "In the cover letter rather than the CV, and as a decision rather than as a concession. A CV that quietly understates your level to look like a fit tends to read as confusing; a letter that says plainly why you are applying at this level reads as deliberate.",
    service: CV,
    phrases: [
      "i am willing to take a step down to get into the uae market how do i say that",
      "accepting a lower role to get started here",
      "should i downgrade my cv",
    ],
    keywords: [["step", "down"], ["lower", "role"]],
    next: ["own-cv-case-overqualified", "own-cv-cover-letter-included"],
  },
  {
    id: "own-cv-case-many-short-jobs",
    question: "I have a lot of short jobs and it looks bad.",
    answer:
      "It looks worse laid out as six separate entries than it does grouped. Contract and project work can be written as one engagement line with the clients beneath it, which is both more honest about what the work was and much easier to read.",
    service: CV,
    phrases: [
      "i have a lot of short jobs and it looks bad",
      "job hopping on my cv",
      "too many employers in a few years",
      "contract work looks unstable",
    ],
    keywords: [["short", "jobs"], ["job", "hopping"], ["many", "employers"]],
    next: ["own-cv-case-freelance", "own-cv-case-senior"],
  },
  {
    id: "own-cv-case-freelance",
    question: "I have been freelancing — how is that presented?",
    answer:
      "As a business with clients, not as a gap with excuses. One heading for the practice, the period, what you do, and then the work that proves it. If you held a freelance permit, say so: it answers a question the reader would otherwise have.",
    service: CV,
    phrases: [
      "i have been freelancing how is that presented",
      "self employed on a cv",
      "freelance work on my resume",
      "consultant cv",
    ],
    keywords: [["freelancing", "presented"], ["self", "employed"], ["consultant", "cv"]],
    next: ["own-cv-case-many-short-jobs", "own-cv-case-business-owner"],
  },
  {
    id: "own-cv-case-business-owner",
    question: "I ran my own company and now want to be employed.",
    answer:
      "The thing a reader silently worries about is whether you will take direction, so the CV has to show the work rather than the ownership: what you built, what it reached, and the parts you did with your own hands. Founder as a title alone invites the doubt.",
    service: CV,
    phrases: [
      "i ran my own company and now want to be employed",
      "from business owner to employee",
      "founder applying for a job",
      "i closed my business and need work",
    ],
    keywords: [["own", "company", "employed"], ["founder", "applying"]],
    next: ["own-cv-case-freelance", "own-cv-case-career-change"],
  },
  {
    id: "own-cv-case-internal-promotion",
    question: "I am applying for a promotion inside my own company.",
    answer:
      "Different document, same honesty. The reader already knows your history, so the CV's job is to argue the next role: the work you have been doing that is already at that level, and the gap you are asking them to take a view on.",
    service: CV,
    phrases: [
      "i am applying for a promotion inside my own company",
      "internal application cv",
      "cv for a promotion",
    ],
    keywords: [["internal", "application"], ["cv", "promotion"]],
    next: ["own-cv-process", "own-cv-case-senior"],
  },
  {
    id: "own-cv-case-secondment",
    question: "My company is transferring me to the UAE. Do I still need a CV?",
    answer:
      "Usually yes, for the visa and labour file rather than for a hiring decision — the employer's PRO will ask for one, and it needs to match your certificates. It is a simpler job than an application CV and we will tell you if that is all you need.",
    service: CV,
    phrases: [
      "my company is transferring me to the uae do i still need a cv",
      "intra company transfer cv",
      "cv for the visa file",
    ],
    keywords: [["company", "transferring"], ["cv", "visa", "file"]],
    next: ["own-cv-process", "own-cv-certificates-match"],
  },
  {
    id: "own-cv-certificates-match",
    question: "Does my CV have to match my certificates exactly?",
    answer:
      "The names, the dates and the qualifications do, because somebody will put them side by side — the employer's PRO, the regulator, or an attestation file. A discrepancy that was a typo on your CV becomes a question about the certificate.",
    service: CV,
    phrases: [
      "does my cv have to match my certificates exactly",
      "my degree name is different on my cv",
      "name spelling differs from my passport",
    ],
    keywords: [["match", "certificates"], ["name", "spelling", "differs"]],
    next: ["own-cv-limit-invented", "own-cv-case-secondment"],
  },
  {
    id: "own-cv-visa-line",
    question: "Should the CV say what visa I am on?",
    answer:
      "Only when it is an advantage — already resident, own visa, no sponsorship needed. If it is complicated, leave it off the CV and answer it when asked; a line explaining your status at the top of page one reads as a problem being flagged.",
    service: CV,
    phrases: [
      "should the cv say what visa i am on",
      "do i put my visa status on my cv",
      "mentioning sponsorship on a cv",
    ],
    keywords: [["visa", "status", "cv"], ["mentioning", "sponsorship"]],
    next: ["own-cv-case-first-job", "own-cv-process"],
  },

  /* ── Professions where the page has to carry more ──────────────────────── */
  {
    id: "own-cv-field-healthcare",
    question: "I am a nurse or a doctor — what does my CV have to show?",
    answer:
      "Your licensing position, early and unambiguously: which authority you are registered with or applying to — DHA, DOH or MOHAP — the stage you are at, and your home-country registration with its number. A clinical CV that leaves a recruiter guessing about eligibility gets put aside whatever the experience says.",
    service: CV,
    phrases: [
      "i am a nurse or a doctor what does my cv have to show",
      "nurse cv for dubai",
      "doctor cv uae",
      "healthcare cv dha",
      "medical cv for the gulf",
    ],
    keywords: [["nurse", "cv"], ["doctor", "cv"], ["healthcare", "cv"], ["medical", "cv"]],
    next: ["own-cv-field-healthcare-licence", "own-cv-field-healthcare-clinical", "own-cv-process"],
  },
  {
    id: "own-cv-field-healthcare-licence",
    question: "I have not passed the licensing exam yet. What goes on the CV?",
    answer:
      "The true position: applied, eligibility letter issued, exam booked, or not started. Each of those means something different to a recruiter and all of them are workable; what is not workable is a CV implying a licence that has not been granted. Whether you qualify is the authority's decision, not ours.",
    service: CV,
    phrases: [
      "i have not passed the licensing exam yet what goes on the cv",
      "dha exam not done yet cv",
      "waiting for my eligibility letter",
      "prometric pending",
    ],
    keywords: [["licensing", "exam", "cv"], ["eligibility", "letter"], ["exam", "pending"]],
    next: ["own-cv-field-healthcare", "own-cv-limit-in-progress"],
  },
  {
    id: "own-cv-field-healthcare-clinical",
    question: "How much clinical detail belongs on a nursing CV?",
    answer:
      "Enough to place you: the setting, the unit, the acuity, the caseload and the equipment you are signed off on. A ward sister and a theatre nurse both write \"nurse\" and need entirely different pages, and the detail is what tells them apart to someone screening fifty.",
    service: CV,
    phrases: [
      "how much clinical detail belongs on a nursing cv",
      "what should a nurse put about her ward",
      "clinical skills section",
    ],
    keywords: [["clinical", "detail"], ["nursing", "ward"], ["clinical", "skills"]],
    next: ["own-cv-field-healthcare", "own-cv-field-healthcare-licence"],
  },
  {
    id: "own-cv-field-engineering",
    question: "I am an engineer — what is different about my CV here?",
    answer:
      "Projects carry it, not job titles: what was built, your discipline, your scope, the value and the stage you joined at. If your work needs Society of Engineers registration or a municipality approval, where you stand on that belongs near the top.",
    service: CV,
    phrases: [
      "i am an engineer what is different about my cv here",
      "engineering cv for the uae",
      "civil engineer cv dubai",
      "mechanical engineer resume gulf",
    ],
    keywords: [["engineer", "cv"], ["engineering", "resume"], ["civil", "engineer"]],
    next: ["own-cv-field-engineering-projects", "own-cv-field-engineering-registration", "own-cv-process"],
  },
  {
    id: "own-cv-field-engineering-projects",
    question: "How do I list projects without the CV becoming a catalogue?",
    answer:
      "Three or four that show range and scale, written properly, then a single line naming the rest. Twenty projects at two lines each is a document nobody finishes; four at five lines each is an argument.",
    service: CV,
    phrases: [
      "how do i list projects without the cv becoming a catalogue",
      "project list on an engineering cv",
      "too many projects to list",
    ],
    keywords: [["list", "projects"], ["project", "catalogue"]],
    next: ["own-cv-field-engineering", "own-cv-case-senior"],
  },
  {
    id: "own-cv-field-engineering-registration",
    question: "Does my engineering CV need to mention professional registration?",
    answer:
      "If the roles you are applying for require it, yes, and its absence is the first thing checked. Which registration applies depends on the emirate and the discipline — the Society of Engineers and the relevant municipality are the bodies to confirm it with, and they decide, not us.",
    service: CV,
    phrases: [
      "does my engineering cv need to mention professional registration",
      "society of engineers membership on cv",
      "do i need to be registered as an engineer in dubai",
    ],
    keywords: [["professional", "registration"], ["society", "engineers"]],
    next: ["own-cv-field-engineering", "own-cv-limit-in-progress"],
  },
  {
    id: "own-cv-field-teaching",
    question: "I am a teacher — what do UAE schools look for on a CV?",
    answer:
      "Curriculum, key stages and the inspection framework you have worked under, because a school hires against a curriculum before it hires against a subject. Your teaching qualification, its attestation status and any KHDA or ADEK permit position belong near the top.",
    service: CV,
    phrases: [
      "i am a teacher what do uae schools look for on a cv",
      "teaching cv for dubai schools",
      "teacher resume uae",
      "khda teaching permit on cv",
    ],
    keywords: [["teacher", "cv"], ["teaching", "resume"], ["schools", "look", "for"]],
    next: ["own-cv-field-teaching-curriculum", "own-cv-field-teaching-timing", "own-cv-process"],
  },
  {
    id: "own-cv-field-teaching-curriculum",
    question: "I have taught several curricula. Which do I lead with?",
    answer:
      "Whichever the school you are applying to teaches, which is a real argument for two versions if you are applying across British and American systems. Within one CV, lead with the curriculum and let the subject follow it.",
    service: CV,
    phrases: [
      "i have taught several curricula which do i lead with",
      "british and american curriculum on one cv",
      "ib and igcse experience",
    ],
    keywords: [["several", "curricula"], ["curriculum", "lead"]],
    next: ["own-cv-field-teaching", "own-cv-two-versions"],
  },
  {
    id: "own-cv-field-teaching-timing",
    question: "When should a teaching CV be ready?",
    answer:
      "Well before the hiring season you are aiming at, because school recruitment runs months ahead of the academic year and the good posts are gone early. Exact timing varies by school and by curriculum — ask the schools you want rather than trusting a general rule, including this one.",
    service: CV,
    phrases: [
      "when should a teaching cv be ready",
      "teacher recruitment season in the uae",
      "when do dubai schools hire",
    ],
    keywords: [["teaching", "season"], ["schools", "hire", "when"]],
    next: ["own-cv-field-teaching", "own-cv-turnaround"],
  },
  {
    id: "own-cv-field-finance",
    question: "I work in finance or accounting — what should the CV emphasise?",
    answer:
      "The standards you have worked to, the systems you have worked in, and the scale of what you were responsible for. A qualification such as ACCA, CPA, CA or CMA, and its stage if it is not finished, goes high; an auditor and a management accountant are different hires and the page should say which you are.",
    service: CV,
    phrases: [
      "i work in finance or accounting what should the cv emphasise",
      "accountant cv dubai",
      "finance manager resume uae",
      "acca cv",
    ],
    keywords: [["accountant", "cv"], ["finance", "resume"], ["accounting", "emphasise"]],
    next: ["own-cv-field-finance-systems", "own-cv-limit-in-progress", "own-cv-process"],
  },
  {
    id: "own-cv-field-finance-systems",
    question: "Do the accounting systems I have used matter that much?",
    answer:
      "More than most candidates expect — they are frequently the screening filter, named in the advert and searched for literally. The systems you genuinely know go in a line of their own; ones you have seen once do not, because that is the question the interview opens with.",
    service: CV,
    phrases: [
      "do the accounting systems i have used matter that much",
      "should i list sap and oracle on my cv",
      "erp experience on a finance cv",
    ],
    keywords: [["accounting", "systems"], ["erp", "experience"]],
    next: ["own-cv-field-finance", "own-cv-field-it"],
  },
  {
    id: "own-cv-field-it",
    question: "I am in IT or software — how technical should the CV be?",
    answer:
      "Technical enough that an engineer reading it can place you, plain enough that a recruiter can screen it. In practice that means a short, honest stack list and then work written as problems and outcomes, with the technology named inside them rather than piled at the top.",
    service: CV,
    phrases: [
      "i am in it or software how technical should the cv be",
      "developer cv dubai",
      "software engineer resume uae",
      "it cv keywords",
    ],
    keywords: [["developer", "cv"], ["software", "resume"], ["technical", "cv"]],
    next: ["own-cv-field-it-portfolio", "own-cv-field-finance-systems", "own-both-together"],
  },
  {
    id: "own-cv-field-it-portfolio",
    question: "Should a developer send a portfolio or a repository link?",
    answer:
      "Yes, and make it one link to something tidy rather than a profile full of half-finished experiments. For most other fields a portfolio is optional; for developers, designers and writers it is often what actually gets read.",
    service: CV,
    phrases: [
      "should a developer send a portfolio or a repository link",
      "github link on my cv",
      "do designers need a portfolio link",
    ],
    keywords: [["portfolio", "link"], ["repository", "link"]],
    next: ["own-web-type-portfolio", "own-cv-field-it", "own-both-together"],
  },
  {
    id: "own-cv-field-sales",
    question: "I am in sales — what does a UAE sales CV need?",
    answer:
      "Numbers, and the context that makes them mean something: target, achievement against it, territory, deal size and cycle, and what you were selling to whom. A sales CV without figures is read as a sales CV with nothing to report.",
    service: CV,
    phrases: [
      "i am in sales what does a uae sales cv need",
      "sales cv dubai",
      "business development resume uae",
      "account manager cv",
    ],
    keywords: [["sales", "cv"], ["business", "development", "resume"]],
    next: ["own-cv-field-sales-confidential", "own-cv-field-marketing", "own-cv-process"],
  },
  {
    id: "own-cv-field-sales-confidential",
    question: "My sales figures are confidential. What can I put?",
    answer:
      "Percentages and relative scale instead of absolute revenue — against target, growth year on year, position in the team. That keeps the argument and keeps you out of trouble with a former employer, which is a real risk people do not weigh.",
    service: CV,
    phrases: [
      "my sales figures are confidential what can i put",
      "i am not allowed to share revenue numbers",
      "nda stops me quoting figures",
    ],
    keywords: [["figures", "confidential"], ["share", "revenue"]],
    next: ["own-cv-field-sales", "own-cv-limit-confidential"],
  },
  {
    id: "own-cv-field-marketing",
    question: "I work in marketing — what belongs on the page?",
    answer:
      "Campaigns with outcomes and a link to the work. Marketing is one of the fields where the CV is a door and the portfolio is the room, so the page should be short, specific and pointed at something a reader can look at.",
    service: CV,
    phrases: [
      "i work in marketing what belongs on the page",
      "marketing cv dubai",
      "digital marketing resume uae",
      "creative cv",
    ],
    keywords: [["marketing", "cv"], ["creative", "cv"]],
    next: ["own-web-type-portfolio", "own-cv-field-it-portfolio", "own-both-together"],
  },
  {
    id: "own-cv-field-hospitality",
    question: "I am in hospitality — what matters most?",
    answer:
      "The property and the standard: brand, size, star rating, covers or rooms, and the department. A reader in this sector sizes a candidate by where they have worked before they read a single bullet, so those details belong in the heading rather than buried.",
    service: CV,
    phrases: [
      "i am in hospitality what matters most",
      "hotel cv dubai",
      "f and b resume uae",
      "chef cv",
      "waiter cv dubai",
    ],
    keywords: [["hospitality", "cv"], ["hotel", "resume"], ["chef", "cv"]],
    next: ["own-cv-field-hospitality-photo", "own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-hospitality-photo",
    question: "Hospitality employers ask for a photo and my height and weight. Is that normal?",
    answer:
      "It is routinely asked for in parts of this sector, and it is also the thing most often used by people running a fake-job scam. Supply what a genuine employer asks for at the right stage, and treat a request for photographs before any interview as a reason to check who you are dealing with.",
    service: CV,
    phrases: [
      "hospitality employers ask for a photo and my height and weight is that normal",
      "they want full length photos for a hotel job",
      "employer asking for personal measurements",
    ],
    keywords: [["full", "length", "photos"], ["height", "weight"]],
    next: ["own-cv-field-hospitality", "own-cv-privacy"],
  },
  {
    id: "own-cv-field-construction",
    question: "I work on site — trades, supervision, safety. How is that written?",
    answer:
      "By the project and the ticket. What you were on, your scope, the size of the crew, and every current card or certificate with its expiry — a safety or trade certification that has lapsed is worse than one you never had, because it will be checked.",
    service: CV,
    phrases: [
      "i work on site trades supervision safety how is that written",
      "site supervisor cv",
      "hse officer resume uae",
      "foreman cv dubai",
      "technician cv",
    ],
    keywords: [["site", "supervisor"], ["hse", "resume"], ["foreman", "cv"]],
    next: ["own-cv-field-certificates", "own-cv-field-engineering", "own-cv-process"],
  },
  {
    id: "own-cv-field-logistics",
    question: "I am in logistics, driving or warehousing.",
    answer:
      "Licence categories first, with their validity, then the equipment you are certified on and the systems you have used. For driving roles, a UAE licence or the position on exchanging yours is the single most consequential line on the page.",
    service: CV,
    phrases: [
      "i am in logistics driving or warehousing",
      "driver cv dubai",
      "warehouse supervisor resume",
      "heavy licence cv",
    ],
    keywords: [["driver", "cv"], ["warehouse", "resume"], ["licence", "categories"]],
    next: ["own-cv-field-certificates", "own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-legal",
    question: "I am a lawyer or in a legal team.",
    answer:
      "Jurisdiction, admission and practice area, because none of those transfer automatically and a reader needs all three in the first lines. What you may call yourself here is bounded by UAE rules on legal practice, so the CV states your home admission accurately rather than implying a local one.",
    service: CV,
    phrases: [
      "i am a lawyer or in a legal team",
      "legal counsel cv uae",
      "lawyer resume dubai",
      "paralegal cv",
    ],
    keywords: [["lawyer", "cv"], ["legal", "counsel"], ["paralegal", "cv"]],
    next: ["own-cv-limit-titles", "own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-hr",
    question: "I am in HR — what should I emphasise here?",
    answer:
      "Headcount, the labour framework you have worked under, and whether you have handled the administrative side of visas and onboarding, because in the UAE that is frequently part of the job. Generalist and specialist HR CVs read very differently and the page should commit to one.",
    service: CV,
    phrases: [
      "i am in hr what should i emphasise here",
      "hr manager cv dubai",
      "human resources resume uae",
      "recruiter cv",
    ],
    keywords: [["hr", "manager", "cv"], ["human", "resources", "resume"]],
    next: ["own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-government",
    question: "I am applying to a government or semi-government body.",
    answer:
      "Expect a long structured form rather than a CV attachment, and expect it to be read literally against the advert's criteria. The useful document is one written so each requirement has a visible, evidenced answer, and an Arabic version is more often asked for here than in the private sector.",
    service: CV,
    phrases: [
      "i am applying to a government or semi government body",
      "government job application uae",
      "cv for a semi government company",
      "applying to a federal entity",
    ],
    keywords: [["government", "application"], ["semi", "government"]],
    next: ["own-cv-arabic-version", "own-cv-portal-forms", "own-cv-process"],
  },
  {
    id: "own-cv-field-academic",
    question: "Do you write academic CVs?",
    answer:
      "Yes, and they follow different rules from a commercial CV: publications, teaching, supervision, funding and conferences, with length determined by the record rather than by a page limit. Tell us the institution's own format if they have published one — several do.",
    service: CV,
    phrases: [
      "do you write academic cvs",
      "academic cv for a university post",
      "cv with publications",
      "research cv",
    ],
    keywords: [["academic", "cv"], ["publications", "cv"], ["research", "cv"]],
    next: ["own-cv-other-documents", "own-cv-field-other"],
  },
  {
    id: "own-cv-field-other",
    question: "My field is not on your list.",
    answer:
      "That is fine — the method does not change. The call is where we learn what your sector values, and if we do not know a term or a regulator we ask rather than guessing, which is the only honest way to write about work we have not done.",
    service: CV,
    phrases: [
      "my field is not on your list",
      "do you cover unusual professions",
      "my industry is niche",
    ],
    keywords: [["not", "on", "list"], ["niche", "industry"]],
    next: ["own-cv-process", "own-cv-call", "own-hub-cv-fields"],
  },
  {
    id: "own-cv-field-certificates",
    question: "Which certificates and cards should go on the CV?",
    answer:
      "The current ones that the job actually requires, with the issuing body and the expiry date. A long list of expired or ornamental certificates dilutes the two that matter, and an expired safety or licence card on a CV is a question you do not want asked.",
    service: CV,
    phrases: [
      "which certificates and cards should go on the cv",
      "should i list all my training certificates",
      "expired certification on a cv",
    ],
    keywords: [["which", "certificates"], ["training", "certificates"], ["expired", "certification"]],
    next: ["own-cv-certificates-match", "own-cv-limit-in-progress"],
  },

  /* ── What we will not do ───────────────────────────────────────────────── */
  {
    id: "own-cv-limit-invented",
    question: "Can you add experience I do not have?",
    answer:
      "No. Not a role, not a year, not a responsibility you were near but did not hold. It is found at reference stage or when somebody asks you about it in a room, the offer goes, and in a country where your residence is tied to that offer the consequence is not just embarrassment.",
    service: CV,
    phrases: [
      "can you add experience i do not have",
      "can you add a few years to my cv",
      "can you put a job i did not do",
      "can you exaggerate my experience",
    ],
    keywords: [["add", "experience"], ["exaggerate", "experience"], ["fake", "job"]],
    next: ["own-cv-limit-hide-gap", "own-cv-limit-qualification", "own-cv-case-dismissed"],
  },
  {
    id: "own-cv-limit-qualification",
    question: "Can you list a degree I did not finish as if I had?",
    answer:
      "No, and this is the one that goes furthest wrong here: a degree on a CV becomes a degree in an attestation file, and an unverifiable certificate stops a visa rather than just a hire. An unfinished degree is written as an unfinished degree, with what you completed.",
    service: CV,
    phrases: [
      "can you list a degree i did not finish as if i had",
      "i did not complete my degree can we leave the dates vague",
      "can you put a qualification i do not have",
    ],
    keywords: [["degree", "not", "finish"], ["qualification", "do", "not", "have"]],
    next: ["own-cv-limit-in-progress", "own-cv-certificates-match"],
  },
  {
    id: "own-cv-limit-in-progress",
    question: "I am part way through a qualification. How is that written honestly?",
    answer:
      "By its real state and date: in progress with an expected completion, or exam passed and certificate pending, or registered. All three are perfectly good on a CV. What is not is the same qualification written as though it were already held.",
    service: CV,
    phrases: [
      "i am part way through a qualification how is that written honestly",
      "studying for acca can i put it on my cv",
      "exam passed but certificate not issued",
      "course in progress on a cv",
    ],
    keywords: [["in", "progress", "qualification"], ["studying", "for"], ["certificate", "pending"]],
    next: ["own-cv-limit-qualification", "own-cv-field-certificates"],
  },
  {
    id: "own-cv-limit-hide-gap",
    question: "Can you just stretch the dates to cover the gap?",
    answer:
      "No. Dates are the one thing on a CV that gets checked mechanically, against references, against a labour file, sometimes against an immigration record. A stretched date turns an ordinary gap into a discovered lie, which is a far worse conversation.",
    service: CV,
    phrases: [
      "can you just stretch the dates to cover the gap",
      "can we adjust the dates slightly",
      "can you hide the gap between jobs",
    ],
    keywords: [["stretch", "dates"], ["adjust", "dates"], ["hide", "gap"]],
    next: ["own-cv-case-break", "own-cv-limit-invented"],
  },
  {
    id: "own-cv-limit-titles",
    question: "Can you give me a better job title than I actually had?",
    answer:
      "No, but there is usually a legitimate version of what you want. If your title understated the work, the title stays accurate and the bullets carry the scope; if the company used an unusual title, a plain-English equivalent in brackets is honest and helpful.",
    service: CV,
    phrases: [
      "can you give me a better job title than i actually had",
      "my title was junior but i did more",
      "can you upgrade my designation",
    ],
    keywords: [["better", "job", "title"], ["upgrade", "designation"]],
    next: ["own-cv-case-transferable", "own-cv-limit-invented"],
  },
  {
    id: "own-cv-limit-no-guarantee",
    question: "Will this get me a job?",
    answer:
      "No one can promise that and we will not. What a good CV does is stop you being filtered out for reasons that have nothing to do with whether you could do the work — and that is genuinely most of the problem. The hiring decision is not ours and never will be.",
    service: CV,
    phrases: [
      "will this get me a job",
      "do you guarantee interviews",
      "how many interviews will i get",
      "is there a money back guarantee if i get no replies",
    ],
    keywords: [["guarantee", "interviews"], ["get", "me", "job"], ["money", "back"]],
    next: ["own-cv-not-recruiter", "own-cv-limit-expectations"],
  },
  {
    id: "own-cv-limit-expectations",
    question: "What difference does a rewritten CV actually make?",
    answer:
      "It changes how far you get before a human decides, not whether you are the right candidate. Where it helps most is a strong background presented badly; where it helps least is applying for roles you are not eligible for, which no document fixes.",
    service: CV,
    phrases: [
      "what difference does a rewritten cv actually make",
      "is a professional cv worth it",
      "does paying for a cv help",
    ],
    keywords: [["difference", "rewritten"], ["worth", "it", "cv"]],
    next: ["own-cv-limit-no-guarantee", "own-cv-process"],
  },
  {
    id: "own-cv-limit-confidential",
    question: "Can I include my employer's confidential information?",
    answer:
      "No, and it is worth being careful here: client names under an NDA, unpublished figures and internal documents have cost people jobs they had already started. We write round it with scale and outcome, which reads just as well.",
    service: CV,
    phrases: [
      "can i include my employer's confidential information",
      "am i allowed to name my clients",
      "nda and my cv",
    ],
    keywords: [["confidential", "information"], ["name", "clients"]],
    next: ["own-cv-field-sales-confidential", "own-cv-privacy"],
  },
  {
    id: "own-cv-limit-someone-else",
    question: "Can you write a CV for my brother using his details?",
    answer:
      "Yes, if he is part of the conversation. The call is where the content comes from and it does not work second-hand, so we will want to speak to the person whose CV it is — which also avoids a document that quietly describes somebody nobody has met.",
    service: CV,
    phrases: [
      "can you write a cv for my brother using his details",
      "i am asking on behalf of my husband",
      "can i order a cv for someone else",
    ],
    keywords: [["on", "behalf", "of"], ["for", "someone", "else"]],
    next: ["own-cv-call", "own-cv-process"],
  },

  /* ── Money, for the CV side ────────────────────────────────────────────── */
  {
    id: "own-cv-money-service",
    question: "What does CV writing cost?",
    answer:
      "It depends on how much there is to work with — a graduate's page and a twenty-year rewrite with two target markets are not the same job — so we quote against your actual CV rather than publishing a figure we would then have to qualify. Let us take a couple of details and someone will come back to you with a price.",
    service: CV,
    quote: true,
    phrases: [
      "what does cv writing cost",
      "how much is a cv",
      "price for writing my resume",
      "what are your cv fees",
      "how much do you charge for a cv and cover letter",
      "is it expensive to get a cv written",
      "give me an estimate for a cv",
      "how much am i looking at for a resume",
      "what would a cv set me back",
      "ballpark for a cv",
      "whats the damage for a resume",
      // Door phrasings that are about money rather than about the service, so
      // they belong here rather than on the hub.
      "what is the fee for a professional cv",
      "give me a quote for a resume",
    ],
    keywords: [
      ...priceGroups("cv"),
      ...priceGroups("resume"),
      // "expensive" is the one money word nobody pairs with another, so it
      // cannot ride on `priceGroups` without spending twelve groups.
      ["expensive", "cv"],
      ["expensive", "resume"],
    ],
  },
  {
    id: "own-cv-money-linkedin",
    question: "What do you charge for the LinkedIn profile on its own?",
    answer:
      "A profile rebuild without a CV is a smaller piece of work and priced as one, but it still turns on how much is there and what you are aiming at. Tell us the role you want to be found for and we will come back with a figure.",
    service: CV,
    quote: true,
    phrases: [
      "what do you charge for the linkedin profile on its own",
      "linkedin profile writing price",
      "how much just for linkedin",
    ],
    keywords: priceGroups("linkedin"),
  },
  {
    id: "own-cv-money-discount",
    question: "Do you do a discount for students or for more than one CV?",
    answer:
      "Ask. Two CVs in one household, a graduate with nothing behind them yet, a second version for a different market — those are all conversations we are willing to have, and the honest way to have them is against your actual case rather than a published rule.",
    service: CV,
    quote: true,
    phrases: [
      "do you do a discount for students or for more than one cv",
      "is there a cheaper rate for freshers",
      "any offer if i order two cvs",
    ],
    // Not `priceGroups`: a price word here would tie with own-cv-money-service
    // on length and, being later, lose — and both are quotes anyway, so the
    // discrimination that matters is the word "discount" itself.
    keywords: [["discount", "cv"], ["discount", "resume"], ["offer", "two", "cvs"], ["rate", "freshers"]],
  },
  {
    id: "own-cv-money-payment",
    question: "How does payment work?",
    answer:
      "Agreed before we start, so nobody is surprised at the end, and we will tell you what is included and what would be extra at the same time. The details come from the person who calls you back rather than from a chat window.",
    service: CV,
    quote: true,
    phrases: [
      "how does payment work",
      "when do i have to pay for the cv",
      "do you take payment upfront",
      "what payment methods do you accept",
    ],
    keywords: [["payment", "works", "cv"], ["pay", "upfront", "cv"]],
  },

  /* ── Websites: what we build ───────────────────────────────────────────── */
  {
    id: "own-web-type-business",
    question: "What does a business website from you include?",
    answer:
      "The pages a visitor needs to decide you are real and get in touch: what you do, who for, proof, and a contact path that works on a phone. Written rather than filled in, built on your own domain, with the technical groundwork search engines need actually done.",
    service: WEB,
    phrases: [
      "what does a business website from you include",
      "company website for my business in dubai",
      "corporate site",
      "i need a simple website for my company",
    ],
    keywords: [["business", "website", "include"], ["company", "website"]],
    next: ["own-web-pages-which", "own-web-what-we-need", "own-hub-web-process"],
  },
  {
    id: "own-web-type-portfolio",
    question: "Can you build a portfolio site for me personally?",
    answer:
      "Yes, and for people whose work is visual or project-based it does more than a CV can. The design stays out of the way; the point is that somebody can see six good pieces in thirty seconds and find your contact details without scrolling.",
    service: WEB,
    phrases: [
      "can you build a portfolio site for me personally",
      "personal website for my work",
      "i need a site to show my projects",
      "photographer portfolio website",
      "designer portfolio site",
    ],
    keywords: [["portfolio", "site"], ["personal", "website"], ["show", "my", "projects"]],
    next: ["own-web-portfolio-what-to-show", "own-both-together", "own-web-domain-buy"],
  },
  {
    id: "own-web-portfolio-what-to-show",
    question: "How much work should a portfolio show?",
    answer:
      "Less than you want to. Six strong pieces with a line each about what the problem was beats thirty with no context, because a reviewer gives the page under a minute and judges you by the weakest thing they happen to land on.",
    service: WEB,
    phrases: [
      "how much work should a portfolio show",
      "how many projects on a portfolio",
      "what should i put in my portfolio",
    ],
    keywords: [["many", "projects", "portfolio"], ["what", "put", "portfolio"]],
    next: ["own-web-type-portfolio", "own-web-content-photos"],
  },
  {
    id: "own-web-type-shop",
    question: "Can you build an online shop?",
    answer:
      "Small to medium catalogues, yes — products, cart, payment and delivery options. Before anything is built there are two questions that are not ours to answer: whether your licence covers selling what you want to sell online, and which payment provider will take you.",
    service: WEB,
    phrases: [
      "can you build an online shop",
      "ecommerce website for my business",
      "i want to sell products online",
      "online store uae",
      "shopping website",
    ],
    // `["ecommerce", "website"]` here used to tie with the money entry's
    // `["cost", "ecommerce"]` and win on being authored earlier, so "what is
    // the cost of an ecommerce website" was answered in prose. A commissioning
    // verb cannot appear in a price question, which settles it.
    keywords: [["online", "shop"], ["build", "ecommerce"], ["sell", "products"]],
    next: ["own-web-shop-licence", "own-web-shop-payments", "own-web-shop-size"],
  },
  {
    id: "own-web-shop-licence",
    question: "Do I need a licence to sell from a website in the UAE?",
    answer:
      "Selling commercially needs a licence that covers the activity, and e-commerce is treated as an activity in its own right in several jurisdictions. Which licence and which authority depends on where you set up, so confirm it with the DED in your emirate or your free zone before you build a shop.",
    service: WEB,
    phrases: [
      "do i need a licence to sell from a website in the uae",
      "can i sell online without a trade licence",
      "ecommerce licence dubai",
      "is an instagram shop legal here",
    ],
    keywords: [["licence", "sell", "online"], ["ecommerce", "licence"]],
    next: ["own-web-rules-licence", "own-web-type-shop", "own-web-shop-payments"],
  },
  {
    id: "own-web-shop-payments",
    question: "How do payments work on a UAE online shop?",
    answer:
      "Through a payment gateway, and getting approved by one is its own process with its own paperwork — licence, bank account and a look at what you are selling. We build to whichever provider accepts you; which that is, and on what terms, is between you and them.",
    service: WEB,
    phrases: [
      "how do payments work on a uae online shop",
      "which payment gateway should i use",
      "can i take card payments on my site",
      "payment gateway approval",
    ],
    keywords: [["payment", "gateway"], ["card", "payments", "site"]],
    next: ["own-web-shop-cod", "own-web-shop-licence", "own-web-rules-vat"],
  },
  {
    id: "own-web-shop-cod",
    question: "Should I offer cash on delivery?",
    answer:
      "A lot of UAE shoppers still expect it, so it tends to lift conversion and bring its own problems — refused deliveries, cash handling and reconciliation. It is a business decision rather than a technical one; the site supports it either way.",
    service: WEB,
    phrases: [
      "should i offer cash on delivery",
      "cod on my online store",
      "do people here pay by card online",
    ],
    keywords: [["cash", "delivery"], ["cod", "store"]],
    next: ["own-web-shop-payments", "own-web-shop-delivery"],
  },
  {
    id: "own-web-shop-delivery",
    question: "Can the site connect to a courier?",
    answer:
      "Usually yes — most of the couriers operating here have an integration or at minimum a rate table we can wire in, so a customer sees a real delivery option rather than a guess. Which courier is your choice and the commercial terms are theirs.",
    service: WEB,
    phrases: [
      "can the site connect to a courier",
      "delivery integration for my shop",
      "shipping rates on my website",
    ],
    keywords: [["courier", "integration"], ["shipping", "rates"]],
    next: ["own-web-shop-cod", "own-web-integrations"],
  },
  {
    id: "own-web-shop-size",
    question: "I have two thousand products. Is that still something you do?",
    answer:
      "That is past a built-from-scratch shop and into platform territory, which changes the project and the cost. We will say so rather than take it on, and we would rather point you at the right shape of thing than build the wrong one well.",
    service: WEB,
    phrases: [
      "i have two thousand products is that still something you do",
      "large catalogue ecommerce",
      "big online store with thousands of items",
    ],
    keywords: [["large", "catalogue"], ["thousands", "products"]],
    next: ["own-web-type-shop", "own-web-scope-limits"],
  },
  {
    id: "own-web-type-redesign",
    question: "My site is old and slow — do you redesign or start again?",
    answer:
      "Whichever is honestly cheaper for you, and that is a judgement we make after looking rather than before. A tired design on sound foundations is a redesign; a slow site on a platform fighting you is usually a rebuild, and pretending otherwise costs more in the end.",
    service: WEB,
    phrases: [
      "my site is old and slow do you redesign or start again",
      "can you modernise my existing website",
      "website refresh",
      "my website looks dated",
    ],
    keywords: [["redesign", "existing"], ["modernise", "website"], ["looks", "dated"]],
    next: ["own-web-migrate-content", "own-web-seo-migration", "own-web-speed-why"],
  },
  {
    id: "own-web-type-landing",
    question: "I only need one page. Is that worth doing?",
    answer:
      "Often, yes — a single well-built page for one campaign or one service does its job better than a five-page site nobody maintains. It is a smaller project and we will tell you when one page is genuinely not enough for what you are trying to do.",
    service: WEB,
    phrases: [
      "i only need one page is that worth doing",
      "single page website",
      "landing page for a campaign",
      "one page site for my service",
    ],
    keywords: [["one", "page", "website"], ["landing", "page", "campaign"]],
    next: ["own-web-pages-which", "own-web-timeline"],
  },
  {
    id: "own-web-type-app",
    question: "Do you build mobile apps?",
    answer:
      "No. We build websites, and a well-built site works on a phone without anybody installing anything — which for most of the briefs people arrive with is the better answer anyway. If you genuinely need an app, we will say so and we are not the people for it.",
    service: WEB,
    phrases: [
      "do you build mobile apps",
      "can you make an ios app",
      "i need an android application",
      "app development",
    ],
    keywords: [["mobile", "apps"], ["app", "development"], ["android", "application"]],
    next: ["own-web-scope-limits", "own-web-mobile"],
  },
  {
    id: "own-web-scope-limits",
    question: "Is there anything you will not take on?",
    answer:
      "Mobile apps, large marketplaces, anything needing a platform team to run it, and sites whose entire purpose is a claim we do not think is lawful here. Saying no to those is cheaper for both of us than discovering it three weeks in.",
    service: WEB,
    phrases: [
      "is there anything you will not take on",
      "what projects do you turn down",
      "are there websites you refuse to build",
    ],
    keywords: [["will", "not", "take"], ["turn", "down", "projects"]],
    next: ["own-web-type-app", "own-web-rules-regulated", "own-web-shop-size"],
  },

  /* ── Getting a website made ────────────────────────────────────────────── */
  {
    id: "own-web-what-we-need",
    question: "What do you need from me to build a website?",
    answer:
      "Your logo and anything brand-related you already have, a sense of who the site is talking to, and whatever text, photographs or product details exist. If the site makes commercial claims we will want to see the trade licence. If the content does not exist, say so — that is normal and it changes the plan, not the answer.",
    service: WEB,
    phrases: [
      "what do you need from me to build a website",
      "what should i prepare for the website project",
      "what materials do you need",
      "i have no content yet",
    ],
    keywords: [["need", "from", "me", "website"], ["prepare", "website", "project"]],
    next: ["own-web-copy-who", "own-web-content-photos", "own-web-no-logo"],
  },
  {
    id: "own-web-no-logo",
    question: "I do not have a logo. Is that a problem?",
    answer:
      "Not a blocker. We can build around a clean wordmark set properly in type, which is honestly better than a weak logo, and you can commission one later without the site changing. We do not design logos ourselves.",
    service: WEB,
    phrases: [
      "i do not have a logo is that a problem",
      "do you design logos",
      "i need branding as well as a website",
    ],
    keywords: [["do", "not", "have", "logo"], ["design", "logos"]],
    next: ["own-web-what-we-need", "own-web-brand-colours"],
  },
  {
    id: "own-web-brand-colours",
    question: "Can you follow our existing brand guidelines?",
    answer:
      "Yes, and it makes the design stage much shorter. Send whatever exists — colours, fonts, a previous brochure — and we will work inside it, telling you where something will not survive contact with a phone screen or an accessibility check.",
    service: WEB,
    phrases: [
      "can you follow our existing brand guidelines",
      "we have brand colours and fonts",
      "will the site match our printed material",
    ],
    keywords: [["brand", "guidelines"], ["brand", "colours"]],
    next: ["own-web-no-logo", "own-web-design-rounds"],
  },
  {
    id: "own-web-design-rounds",
    question: "Do I get to see the design before it is built?",
    answer:
      "Yes, and that is the point of splitting design from build: changing a layout before anyone writes code is quick, changing it afterwards is not. You review at the end of design and again at the end of build.",
    service: WEB,
    phrases: [
      "do i get to see the design before it is built",
      "will you show me a mockup first",
      "how many design revisions",
    ],
    keywords: [["see", "design", "first"], ["mockup", "before"], ["design", "revisions"]],
    next: ["own-hub-web-process", "own-web-changes-midway"],
  },
  {
    id: "own-web-changes-midway",
    question: "What if I change my mind halfway through?",
    answer:
      "Small changes are part of it. A change of direction after the design is signed off is new work, and we will tell you that at the time rather than absorbing it quietly and resenting it — which is how projects stop being finished.",
    service: WEB,
    phrases: [
      "what if i change my mind halfway through",
      "can i add pages after we start",
      "scope changes during the project",
    ],
    keywords: [["change", "mind", "halfway"], ["add", "pages", "after"]],
    next: ["own-web-design-rounds", "own-web-timeline"],
  },
  {
    id: "own-web-timeline",
    question: "How long does a website take?",
    answer:
      "It turns on the number of pages, whether it sells anything, and — more than anything else — how fast the content arrives. We agree a schedule with you at the start rather than quoting a general figure, and the part that slips is almost always photographs and copy.",
    service: WEB,
    phrases: [
      "how long does a website take",
      "what is the timeline for a web project",
      "when will my site be ready",
      "how many weeks to build a site",
    ],
    keywords: [["long", "website", "take"], ["timeline", "project"], ["when", "site", "ready"]],
    next: ["own-web-delays", "own-web-rush", "own-hub-web-process"],
  },
  {
    id: "own-web-delays",
    question: "What usually makes a website project run late?",
    answer:
      "Content, in almost every case: text nobody has written, photographs nobody has taken, and approvals waiting on a person who is travelling. Builds run to time far more reliably than the material they need does, which is why we ask for it early.",
    service: WEB,
    phrases: [
      "what usually makes a website project run late",
      "why do web projects get delayed",
      "what causes delays",
    ],
    keywords: [["projects", "delayed"], ["causes", "delays"]],
    next: ["own-web-copy-who", "own-web-content-photos", "own-web-timeline"],
  },
  {
    id: "own-web-rush",
    question: "I need it live before an event next month.",
    answer:
      "Tell us the date first and we will tell you honestly whether it is possible and what would have to be cut to make it. A smaller site that is genuinely finished beats a bigger one that is three pages of placeholder on the day.",
    service: WEB,
    phrases: [
      "i need it live before an event next month",
      "urgent website deadline",
      "can you build a site in a week",
    ],
    keywords: [["urgent", "website"], ["site", "in", "week"]],
    next: ["own-web-timeline", "own-web-type-landing"],
  },
  {
    id: "own-web-pages-which",
    question: "Which pages does a site actually need?",
    answer:
      "Fewer than most briefs start with. A home page that says what you do, one page per thing you sell, something that makes you credible, and a contact page — that is a working site. Pages get added when there is a reason, not to look substantial.",
    service: WEB,
    phrases: [
      "which pages does a site actually need",
      "what pages should my website have",
      "how many pages do i need",
      "site structure",
    ],
    keywords: [["which", "pages", "need"], ["site", "structure"]],
    next: ["own-web-pages-about", "own-web-pages-blog", "own-web-pages-pricing"],
  },
  {
    id: "own-web-pages-about",
    question: "Does anyone read the about page?",
    answer:
      "In this market, yes, and more than you would expect — a visitor deciding whether a company is real looks for people, a location and a licence. It is one of the most visited pages on most of the sites we build, and one of the worst written on most sites generally.",
    service: WEB,
    phrases: [
      "does anyone read the about page",
      "is an about us page necessary",
      "what should the about page say",
    ],
    keywords: [["about", "page", "read"], ["about", "us", "necessary"]],
    next: ["own-web-pages-which", "own-web-trust-signals"],
  },
  {
    id: "own-web-trust-signals",
    question: "How do I make a new company look credible online?",
    answer:
      "With the things a cautious buyer checks: a real address, a licence number, named people, photographs that are obviously yours, and a phone number that gets answered. Stock imagery and stock language do the opposite of what they are meant to.",
    service: WEB,
    phrases: [
      "how do i make a new company look credible online",
      "my business is new how do i build trust",
      "making the website look legitimate",
    ],
    keywords: [["look", "credible"], ["build", "trust", "website"]],
    next: ["own-web-pages-about", "own-web-rules-licence", "own-web-content-photos"],
  },
  {
    id: "own-web-pages-blog",
    question: "Do I need a blog?",
    answer:
      "Only if somebody will write it. A blog with four posts from two years ago actively damages the impression the rest of the site is making; no blog at all is neutral. If you do want one, we will build it and be honest about what keeping it going takes.",
    service: WEB,
    phrases: [
      "do i need a blog",
      "is a blog worth it for seo",
      "should my business website have articles",
    ],
    keywords: [["need", "blog"], ["blog", "worth"]],
    next: ["own-web-seo-included", "own-web-pages-which"],
  },
  {
    id: "own-web-pages-pricing",
    question: "Should I publish my prices?",
    answer:
      "It depends on whether your pricing survives being read without you. A product with a clear price should show it; work that is quoted per case usually does better with a worked example and an honest explanation of what the number turns on — which is exactly what this site does.",
    service: WEB,
    phrases: [
      "should i publish my prices",
      "do i put pricing on the website",
      "is it better to hide prices",
    ],
    keywords: [["publish", "prices"], ["pricing", "on", "website"]],
    next: ["own-web-pages-which", "own-web-forms-contact"],
  },
  {
    id: "own-web-copy-who",
    question: "Who writes the words on the site?",
    answer:
      "We do, unless you would rather. Writing it is usually faster than briefing someone else to, and it is also where the structure gets decided — pages tend to be designed around what there is to say rather than the other way round.",
    service: WEB,
    phrases: [
      "who writes the words on the site",
      "do you write website content",
      "can you do the copywriting",
      "i do not know what to write",
    ],
    keywords: [["writes", "words"], ["website", "content", "writing"], ["copywriting"]],
    next: ["own-web-copy-tone", "own-web-copy-review", "own-web-what-we-need"],
  },
  {
    id: "own-web-copy-tone",
    question: "Can the writing avoid sounding like every other company site?",
    answer:
      "That is most of the work. \"Leading provider of innovative solutions\" tells a reader nothing and is on ten thousand sites in this city; saying plainly what you do, for whom, and what it costs you to do it well is both rarer and more persuasive.",
    service: WEB,
    phrases: [
      "can the writing avoid sounding like every other company site",
      "i hate corporate jargon",
      "i want the site to sound human",
    ],
    keywords: [["corporate", "jargon"], ["sound", "human"]],
    next: ["own-web-copy-who", "own-web-copy-review"],
  },
  {
    id: "own-web-copy-review",
    question: "Do I get to approve the text?",
    answer:
      "Every word, before it goes anywhere near a live page. You know your business and your market better than we do, and the review is where a sentence that is nearly right becomes right.",
    service: WEB,
    phrases: [
      "do i get to approve the text",
      "can i edit the copy you write",
      "who signs off the content",
    ],
    keywords: [["approve", "text"], ["sign", "off", "content"]],
    next: ["own-web-copy-who", "own-web-design-rounds"],
  },
  {
    id: "own-web-content-photos",
    question: "What about photographs?",
    answer:
      "Your own, wherever they can exist — a real office, real staff and real products outperform stock images by a distance in a market where buyers are checking whether you exist. Where stock is genuinely the only option we licence it properly rather than lifting it.",
    service: WEB,
    phrases: [
      "what about photographs",
      "do you provide images for the site",
      "can we use stock photos",
      "do you do photography",
    ],
    keywords: [["photographs", "site"], ["stock", "photos"], ["provide", "images"]],
    next: ["own-web-content-copyright", "own-web-trust-signals", "own-web-what-we-need"],
  },
  {
    id: "own-web-content-copyright",
    question: "Can I use images I found on Google?",
    answer:
      "No. Almost all of them belong to somebody, and the usual way you find out is a demand letter rather than a takedown. Either licence them, take your own, or use properly licensed stock — all three are cheaper than the alternative.",
    service: WEB,
    phrases: [
      "can i use images i found on google",
      "is it okay to take pictures from the internet",
      "copyright on website images",
    ],
    keywords: [["images", "from", "google"], ["copyright", "images"]],
    next: ["own-web-content-photos", "own-web-rules-licence"],
  },
  {
    id: "own-web-content-video",
    question: "Can the site have video?",
    answer:
      "Yes, hosted somewhere built for it rather than uploaded to the site, because video is the fastest way to make a page slow. One short, well-placed video earns its weight; an autoplaying background one mostly costs you visitors on a phone.",
    service: WEB,
    phrases: [
      "can the site have video",
      "adding video to my website",
      "background video on the homepage",
    ],
    keywords: [["video", "website"], ["background", "video"]],
    next: ["own-web-speed-why", "own-web-content-photos"],
  },

  /* ── Domains, hosting and email ────────────────────────────────────────── */
  {
    id: "own-web-domain-buy",
    question: "How do I get a domain name?",
    answer:
      "We register it for you in your name, or you register it yourself and give us access — both are fine and the second costs you nothing extra. What matters is that it is registered to you rather than to an agency, which is the thing people discover too late.",
    service: WEB,
    phrases: [
      "how do i get a domain name",
      "can you register a domain for me",
      "buying a domain in the uae",
      "where do i buy a web address",
    ],
    keywords: [["get", "domain", "name"], ["register", "domain"], ["buy", "web", "address"]],
    next: ["own-web-domain-ownership", "own-web-domain-ae-or-com", "own-web-domain-taken"],
  },
  {
    id: "own-web-domain-ownership",
    question: "Who owns the domain and the site at the end?",
    answer:
      "You do, both. The domain is registered to you, the hosting account is yours, and at handover you have everything needed to move it elsewhere without asking us. An agency that holds your domain is holding your business, and we do not work that way.",
    service: WEB,
    phrases: [
      "who owns the domain and the site at the end",
      "do i own my website",
      "is the code mine",
      "what if i want to move to another agency",
    ],
    keywords: [["owns", "domain"], ["own", "my", "website"], ["code", "mine"]],
    next: ["own-web-after-leaving", "own-web-domain-buy", "own-web-handover"],
  },
  {
    id: "own-web-domain-ae-or-com",
    question: "Should I use a .ae or a .com?",
    answer:
      "A .ae says plainly that you are here, which matters for a local business and is sometimes expected of a licensed one; a .com travels further. Plenty of UAE companies hold both and point one at the other, which is usually the cheapest way to stop arguing about it.",
    service: WEB,
    phrases: [
      "should i use a .ae or a .com",
      "is a .ae domain better for a dubai business",
      "which domain extension should i pick",
    ],
    keywords: [["ae", "or", "com"], ["domain", "extension"]],
    next: ["own-web-domain-ae-requirements", "own-web-domain-buy"],
  },
  {
    id: "own-web-domain-ae-requirements",
    question: "Is there anything special about registering a .ae?",
    answer:
      "It is administered under UAE rules and some registrations are checked against a trade licence or a trade mark, so it is not always the instant purchase a .com is. The registrar will tell you what your case needs; we will help you get it in front of them.",
    service: WEB,
    phrases: [
      "is there anything special about registering a .ae",
      "do i need a trade licence for a .ae domain",
      "ae domain requirements",
    ],
    keywords: [["ae", "domain", "requirements"], ["licence", "for", "domain"]],
    next: ["own-web-domain-ae-or-com", "own-web-rules-licence"],
  },
  {
    id: "own-web-domain-taken",
    question: "The domain I want is taken. What now?",
    answer:
      "Usually a different name is the right answer rather than buying it off whoever is sitting on it, which can be expensive and occasionally a scam in itself. A shorter name, a different extension, or your trading name without the filler word are all worth trying first.",
    service: WEB,
    phrases: [
      "the domain i want is taken what now",
      "someone else has my company name as a domain",
      "can i buy a domain from the current owner",
    ],
    keywords: [["domain", "taken"], ["buy", "from", "owner"]],
    next: ["own-web-domain-buy", "own-web-domain-ae-or-com"],
  },
  {
    id: "own-web-domain-existing",
    question: "I already have a domain with someone else.",
    answer:
      "Then we use it. You keep it where it is and give us the access needed to point it at the new site, or move it to your own account first if the current one belongs to a former developer. Nothing has to be re-bought.",
    service: WEB,
    phrases: [
      "i already have a domain with someone else",
      "my old developer holds my domain",
      "can you use my existing web address",
    ],
    keywords: [["already", "have", "domain"], ["existing", "web", "address"]],
    next: ["own-web-domain-ownership", "own-web-domain-transfer"],
  },
  {
    id: "own-web-domain-transfer",
    question: "My previous developer will not hand over the domain.",
    answer:
      "It happens more than it should. If the domain is registered in your name, the registrar can help you recover access directly; if it was registered in theirs, you may be negotiating rather than claiming. Either way it is worth sorting before you build anything new on it.",
    service: WEB,
    phrases: [
      "my previous developer will not hand over the domain",
      "i cannot get access to my own website",
      "agency is holding my domain hostage",
    ],
    keywords: [["developer", "hand", "over"], ["cannot", "access", "website"]],
    next: ["own-web-domain-ownership", "own-web-migrate-content"],
  },
  {
    id: "own-web-domain-email",
    question: "Can I get email on my domain?",
    answer:
      "Yes, and you should — an enquiry from a free webmail address does measurable damage to a business here. The mailboxes run on a provider you pay directly, so your mail is never tangled up with who built your site.",
    service: WEB,
    phrases: [
      "can i get email on my domain",
      "business email address with my company name",
      "setting up info at my domain",
      "do you provide email hosting",
    ],
    keywords: [["email", "on", "domain"], ["business", "email", "address"]],
    next: ["own-web-domain-buy", "own-web-forms-contact"],
  },
  {
    id: "own-web-hosting-where",
    question: "Where will the site be hosted?",
    answer:
      "On infrastructure chosen for the site rather than resold by us, in an account that is yours. Where the servers sit matters less than it used to for speed, and more than it used to if your sector has rules about where data lives — tell us if yours does.",
    service: WEB,
    phrases: [
      "where will the site be hosted",
      "do you host websites",
      "which hosting do you use",
      "does my data have to stay in the uae",
    ],
    keywords: [["where", "hosted"], ["which", "hosting"], ["data", "stay", "uae"]],
    next: ["own-web-hosting-cost", "own-web-rules-privacy", "own-web-after-leaving"],
  },
  {
    id: "own-web-hosting-cost",
    question: "Is hosting a monthly cost I have to keep paying?",
    answer:
      "Yes, along with the domain renewal — they are small, ongoing and unavoidable, and we tell you what they are before you commit rather than after launch. You pay the providers directly, so nothing stops if you stop working with us.",
    service: WEB,
    phrases: [
      "is hosting a monthly cost i have to keep paying",
      "ongoing costs of running a website",
      "do i pay you every month",
      "renewal fees",
    ],
    keywords: [["ongoing", "costs", "website"], ["monthly", "hosting"]],
    next: ["own-web-hosting-where", "own-web-after-maintenance"],
  },
  {
    id: "own-web-hosting-ssl",
    question: "Do I need an SSL certificate?",
    answer:
      "Yes, and it is included rather than sold as an extra. A site without one is marked as not secure in every browser, which for a visitor deciding whether to send you their phone number is the end of the conversation.",
    service: WEB,
    phrases: [
      "do i need an ssl certificate",
      "https on my website",
      "my site says not secure",
    ],
    keywords: [["ssl", "certificate"], ["not", "secure", "site"]],
    next: ["own-web-after-backups", "own-web-hosting-where"],
  },

  /* ── Being found ───────────────────────────────────────────────────────── */
  {
    id: "own-web-seo-included",
    question: "What SEO is actually included?",
    answer:
      "The groundwork, done properly rather than sold back to you later: a structure search engines can read, page titles and descriptions written per page, correct headings, image alt text, a sitemap, structured data where it applies, and a site fast enough on a phone to be indexed well.",
    service: WEB,
    phrases: [
      "what seo is actually included",
      "do you do search engine optimisation",
      "is seo part of the build",
      "technical seo",
    ],
    keywords: [["seo", "included"], ["search", "engine", "optimisation"], ["technical", "seo"]],
    next: ["own-web-seo-no-guarantee", "own-web-seo-keywords", "own-web-seo-ongoing"],
  },
  {
    id: "own-web-seo-no-guarantee",
    question: "Can you get me to the top of Google?",
    answer:
      "No, and neither can anyone else — the ranking is Google's decision and it changes. What is in anyone's control is making the site technically sound, genuinely useful and faster than the alternatives, and then being patient. A guaranteed first position is the clearest signal you are being sold something.",
    service: WEB,
    phrases: [
      "can you get me to the top of google",
      "do you guarantee first page rankings",
      "how long until i rank number one",
      "seo guarantee",
    ],
    keywords: [["top", "of", "google"], ["guarantee", "rankings"], ["rank", "number", "one"]],
    next: ["own-web-seo-included", "own-web-seo-timeframe", "own-web-seo-ads"],
  },
  {
    id: "own-web-seo-timeframe",
    question: "How long before a new site starts showing up?",
    answer:
      "Indexing is usually quick; ranking for anything competitive is not, and it depends on the market you are in and who is already there. Anybody who answers that question with a number without looking at your sector is guessing.",
    service: WEB,
    phrases: [
      "how long before a new site starts showing up",
      "when will google index my website",
      "how soon will i see traffic",
    ],
    keywords: [["google", "index", "website"], ["soon", "see", "traffic"]],
    next: ["own-web-seo-no-guarantee", "own-web-seo-ongoing"],
  },
  {
    id: "own-web-seo-keywords",
    question: "How do you decide what the site should rank for?",
    answer:
      "From what your customers actually type, which is rarely what the business calls itself. Pages are then built to answer those questions properly rather than to repeat a phrase — the second is both less effective and easier for a search engine to spot.",
    service: WEB,
    phrases: [
      "how do you decide what the site should rank for",
      "keyword research for my website",
      "which search terms should i target",
    ],
    keywords: [["keyword", "research"], ["search", "terms", "target"]],
    next: ["own-web-seo-included", "own-web-seo-local"],
  },
  {
    id: "own-web-seo-local",
    question: "How do I show up for searches in my own emirate?",
    answer:
      "Consistent name, address and phone number everywhere they appear, a page that genuinely covers the area you serve, and a properly completed Google Business Profile. Local visibility is won more by those three than by anything on the site itself.",
    service: WEB,
    phrases: [
      "how do i show up for searches in my own emirate",
      "local seo dubai",
      "ranking in abu dhabi searches",
      "near me searches",
    ],
    keywords: [["local", "seo"], ["near", "me", "searches"]],
    next: ["own-web-seo-gbp", "own-web-seo-keywords"],
  },
  {
    id: "own-web-seo-gbp",
    question: "Do you set up the Google Business Profile?",
    answer:
      "We will help you set it up and connect it, and it is often worth more than the website for a local business — it is what puts you on the map result people actually tap. The listing stays in your account, verified to you.",
    service: WEB,
    phrases: [
      "do you set up the google business profile",
      "google maps listing for my company",
      "how do i get on google maps",
      "business listing",
    ],
    keywords: [["google", "business", "profile"], ["maps", "listing"]],
    next: ["own-web-seo-local", "own-web-seo-reviews"],
  },
  {
    id: "own-web-seo-reviews",
    question: "How much do reviews matter?",
    answer:
      "A lot, and more for a local service than almost anything on your site. Ask real customers at the right moment and reply to the bad ones properly; buying reviews is both visible and against the platforms' rules, and it goes wrong publicly.",
    service: WEB,
    phrases: [
      "how much do reviews matter",
      "can you get me google reviews",
      "should i buy reviews",
    ],
    keywords: [["reviews", "matter"], ["buy", "reviews"]],
    next: ["own-web-seo-gbp", "own-web-trust-signals"],
  },
  {
    id: "own-web-seo-migration",
    question: "Will I lose my rankings when the new site goes live?",
    answer:
      "Not if the migration is done properly, and this is the single most common way a redesign destroys a business's traffic. Every old address has to redirect to its new equivalent, one by one — it is tedious, it is not optional, and it is included.",
    service: WEB,
    phrases: [
      "will i lose my rankings when the new site goes live",
      "redirects from my old website",
      "my traffic dropped after a redesign",
      "seo migration",
    ],
    keywords: [["lose", "rankings"], ["redirects", "old", "site"], ["traffic", "dropped"]],
    next: ["own-web-type-redesign", "own-web-migrate-content", "own-web-seo-included"],
  },
  {
    id: "own-web-seo-ongoing",
    question: "Do I need to keep paying someone for SEO forever?",
    answer:
      "No. Sound foundations and a few genuinely useful pages do most of the work and keep doing it. Ongoing work is worth paying for when you are in a competitive market and someone is actively writing and measuring — not as a monthly fee for a report nobody reads.",
    service: WEB,
    phrases: [
      "do i need to keep paying someone for seo forever",
      "monthly seo retainer worth it",
      "is ongoing seo necessary",
    ],
    keywords: [["monthly", "seo"], ["ongoing", "seo"]],
    next: ["own-web-seo-included", "own-web-after-maintenance"],
  },
  {
    id: "own-web-seo-ads",
    question: "Should I just run ads instead?",
    answer:
      "They do different jobs. Ads buy you visibility today and stop the moment you stop paying; the site and its search visibility compound slowly and keep working. A new business with something to sell this month usually needs both, and we will say so rather than pretend one replaces the other.",
    service: WEB,
    phrases: [
      "should i just run ads instead",
      "google ads versus seo",
      "do you manage advertising campaigns",
    ],
    keywords: [["ads", "instead"], ["google", "ads"], ["advertising", "campaigns"]],
    next: ["own-web-seo-no-guarantee", "own-web-analytics"],
  },
  {
    id: "own-web-seo-social",
    question: "Do I need a website if I already sell through Instagram?",
    answer:
      "Many people do fine on Instagram alone, and the honest answer is that it depends on what you sell. What a site gives you is somewhere that is yours, findable in search, and not subject to an account being restricted overnight — which happens, and is unrecoverable if it is your whole shopfront.",
    service: WEB,
    phrases: [
      "do i need a website if i already sell through instagram",
      "is social media enough instead of a site",
      "my business runs on whatsapp do i need a website",
    ],
    keywords: [["instagram", "instead"], ["social", "media", "enough"]],
    next: ["own-web-type-business", "own-web-integrations"],
  },

  /* ── Speed, phones and measurement ─────────────────────────────────────── */
  {
    id: "own-web-speed-why",
    question: "Why does site speed matter so much?",
    answer:
      "Because most of your visitors are on a phone, often on mobile data, and a page that takes several seconds loses a large share of them before it appears. It also affects how search engines treat the page, so it is both a visitor problem and a visibility one.",
    service: WEB,
    phrases: [
      "why does site speed matter so much",
      "my website is very slow",
      "page load time",
      "how fast will my site be",
    ],
    keywords: [["site", "speed"], ["website", "slow"], ["load", "time"]],
    next: ["own-web-speed-fix", "own-web-mobile", "own-web-content-video"],
  },
  {
    id: "own-web-speed-fix",
    question: "Can you make my existing site faster?",
    answer:
      "Often, and the first step is finding out what is actually slow — usually oversized images, too many third-party scripts, or a theme doing far more than the site needs. Sometimes the honest answer after looking is that rebuilding costs less than fixing.",
    service: WEB,
    phrases: [
      "can you make my existing site faster",
      "website speed optimisation",
      "fix my slow wordpress site",
    ],
    keywords: [["make", "site", "faster"], ["speed", "optimisation"]],
    next: ["own-web-speed-why", "own-web-type-redesign"],
  },
  {
    id: "own-web-mobile",
    question: "Will it work properly on a phone?",
    answer:
      "It is designed for the phone first and then widened, not the other way round, because that is where the large majority of UAE traffic comes from. Every page is checked on a real handset before launch rather than in a browser window made narrow.",
    service: WEB,
    phrases: [
      "will it work properly on a phone",
      "is the site mobile friendly",
      "responsive design",
      "how does it look on a tablet",
    ],
    keywords: [["mobile", "friendly"], ["responsive", "design"], ["on", "a", "phone"]],
    next: ["own-web-speed-why", "own-web-accessibility"],
  },
  {
    id: "own-web-accessibility",
    question: "Do you build for accessibility?",
    answer:
      "As standard, to the extent that it is ordinary good practice — readable contrast, text that scales, labelled form fields, keyboard navigation and alt text. If you are bidding for government or semi-government work, ask them for their specific standard and we will build to it.",
    service: WEB,
    phrases: [
      "do you build for accessibility",
      "is the site accessible for screen readers",
      "wcag compliance",
    ],
    keywords: [["accessibility", "website"], ["screen", "readers"], ["wcag", "compliance"]],
    next: ["own-web-mobile", "own-web-rules-licence"],
  },
  {
    id: "own-web-analytics",
    question: "How will I know if the site is working?",
    answer:
      "Analytics set up at launch and pointed at the thing that matters, which is almost never visitor numbers — it is enquiries, calls and completed forms. We will show you where to look, and keep it to the handful of figures that would actually change a decision.",
    service: WEB,
    phrases: [
      "how will i know if the site is working",
      "do you set up analytics",
      "can i see how many visitors i get",
      "tracking conversions",
    ],
    keywords: [["set", "up", "analytics"], ["many", "visitors"], ["tracking", "conversions"]],
    next: ["own-web-rules-privacy", "own-web-forms-contact", "own-web-seo-ads"],
  },

  /* ── Getting enquiries out of it ───────────────────────────────────────── */
  {
    id: "own-web-forms-contact",
    question: "How do enquiries reach me?",
    answer:
      "A form that emails you and stores the submission so nothing is lost to a spam filter, and usually a direct WhatsApp link as well, because in this market that is what people actually use. Both go to wherever you want them.",
    service: WEB,
    phrases: [
      "how do enquiries reach me",
      "contact form on my website",
      "where do form submissions go",
      "can people whatsapp me from the site",
    ],
    keywords: [["contact", "form"], ["form", "submissions"], ["whatsapp", "from", "site"]],
    next: ["own-web-forms-spam", "own-web-forms-whatsapp", "own-web-rules-privacy"],
  },
  {
    id: "own-web-forms-whatsapp",
    question: "Should the site push people to WhatsApp?",
    answer:
      "For most small businesses here, yes — it is where the conversation was going to happen anyway and the drop-off is far lower than a form. Keep the form as well for the people who want a record of what they sent.",
    service: WEB,
    phrases: [
      "should the site push people to whatsapp",
      "whatsapp button on the website",
      "is a chat widget worth having",
    ],
    keywords: [["whatsapp", "button"], ["chat", "widget"]],
    next: ["own-web-forms-contact", "own-web-integrations"],
  },
  {
    id: "own-web-forms-spam",
    question: "Will I get spam through the contact form?",
    answer:
      "Some, and it is handled without making a real person prove they are human in three steps — the measures that annoy genuine visitors tend to cost more enquiries than the spam does. If it ever gets bad we tighten it.",
    service: WEB,
    phrases: [
      "will i get spam through the contact form",
      "stopping bot submissions",
      "do i need a captcha",
    ],
    keywords: [["spam", "contact", "form"], ["need", "captcha"]],
    next: ["own-web-forms-contact", "own-web-after-backups"],
  },
  {
    id: "own-web-booking",
    question: "Can customers book an appointment on the site?",
    answer:
      "Yes, either built in or connected to a booking system you already use. Which is better depends on whether anyone else needs to see the diary — a one-person service and a clinic with six rooms are different problems.",
    service: WEB,
    phrases: [
      "can customers book an appointment on the site",
      "online booking system",
      "appointment scheduling on my website",
      "calendar booking",
    ],
    keywords: [["book", "appointment"], ["booking", "system"], ["appointment", "scheduling"]],
    next: ["own-web-integrations", "own-web-forms-contact"],
  },
  {
    id: "own-web-integrations",
    question: "Can the site connect to the tools I already use?",
    answer:
      "Usually — a CRM, a mailing list, a booking diary, an accounting package, a social feed. Tell us what you are using at the start rather than after launch, because a connection designed in is simple and one bolted on afterwards often is not.",
    service: WEB,
    phrases: [
      "can the site connect to the tools i already use",
      "crm integration",
      "connect my mailing list",
      "link the website to my accounting software",
    ],
    keywords: [["crm", "integration"], ["mailing", "list"], ["connect", "tools"]],
    next: ["own-web-booking", "own-web-shop-delivery", "own-web-analytics"],
  },
  {
    id: "own-web-newsletter",
    question: "Should I collect email addresses?",
    answer:
      "Only if you will send something worth reading, and only with consent that is clearly given rather than assumed — unsolicited marketing is regulated here. A small list that opted in beats a large one that did not, in every way including the legal one.",
    service: WEB,
    phrases: [
      "should i collect email addresses",
      "newsletter signup on my site",
      "email marketing rules in the uae",
    ],
    keywords: [["collect", "email", "addresses"], ["newsletter", "signup"]],
    next: ["own-web-rules-privacy", "own-web-integrations"],
  },
  {
    id: "own-web-multilingual",
    question: "Can the site be in Arabic as well as English?",
    answer:
      "Yes, and properly — Arabic runs right to left, so it is a layout that has to be designed rather than a translation dropped into an English page. Whether you need one depends on who buys from you; for some sectors here it is expected and for others it is unused.",
    service: WEB,
    phrases: [
      "can the site be in arabic as well as english",
      "bilingual website",
      "arabic version of my site",
      "rtl website",
    ],
    keywords: [["arabic", "english", "site"], ["bilingual", "website"], ["rtl", "layout"]],
    next: ["own-web-multilingual-who", "own-web-multilingual-other", "own-web-pages-which"],
  },
  {
    id: "own-web-multilingual-who",
    question: "Who translates the Arabic?",
    answer:
      "A translator, not a machine and not us. Marketing copy needs someone who writes Arabic natively, and anything with legal weight — terms, policies, regulated claims — needs a legally recognised translation, which is a separate service on this site.",
    service: WEB,
    phrases: [
      "who translates the arabic",
      "can you translate my website into arabic",
      "is machine translation good enough for a website",
    ],
    keywords: [["translates", "arabic"], ["machine", "translation"]],
    next: ["own-web-multilingual", "own-web-rules-licence"],
  },
  {
    id: "own-web-multilingual-other",
    question: "What about Hindi, Urdu or Russian?",
    answer:
      "Technically the same job as Arabic without the right-to-left layout, and the question is the same one: does a meaningful share of your buyers prefer it. Two well-maintained languages beat five that drift out of step with each other.",
    service: WEB,
    phrases: [
      "what about hindi urdu or russian",
      "multiple languages on my website",
      "can you add a third language",
    ],
    keywords: [["multiple", "languages"], ["third", "language"]],
    next: ["own-web-multilingual", "own-web-after-maintenance"],
  },

  /* ── What a UAE site may say ───────────────────────────────────────────── */
  {
    id: "own-web-rules-licence",
    question: "Does my trade licence limit what the website can say?",
    answer:
      "Yes. You may advertise the activities your licence covers and not others, and several jurisdictions expect the licence details to appear on the site. If your brief includes a service the licence does not list, we will flag it rather than build it — confirm the scope with your licensing authority or free zone.",
    service: WEB,
    phrases: [
      "does my trade licence limit what the website can say",
      "can i advertise a service not on my licence",
      "do i have to show my licence number on the site",
      "ded rules for websites",
    ],
    keywords: [["trade", "licence", "website"], ["advertise", "service", "licence"]],
    next: ["own-web-rules-regulated", "own-web-rules-claims", "own-web-trust-signals"],
  },
  {
    id: "own-web-rules-regulated",
    question: "I am in healthcare, legal or financial services. Is there more to it?",
    answer:
      "Considerably more. Those sectors have their own advertising rules and in several cases marketing material needs the regulator's approval before it is published. We build the site; getting the content cleared is yours to do with DHA, DOH, the relevant legal affairs department or the financial regulator, and we will not publish claims that have not been.",
    service: WEB,
    phrases: [
      "i am in healthcare legal or financial services is there more to it",
      "medical advertising rules uae",
      "clinic website approval",
      "can a law firm advertise in dubai",
    ],
    keywords: [["medical", "advertising"], ["clinic", "website"], ["regulated", "sector", "site"]],
    next: ["own-web-rules-licence", "own-web-rules-claims", "own-web-scope-limits"],
  },
  {
    id: "own-web-rules-claims",
    question: "Can the site say we are the best, or the first in the UAE?",
    answer:
      "Superlatives you cannot evidence are a bad idea here for two reasons: advertising rules take a dim view of unsubstantiated claims, and a reader discounts them anyway. Something specific and checkable persuades far better than \"leading\" ever has.",
    service: WEB,
    phrases: [
      "can the site say we are the best or the first in the uae",
      "making claims about being number one",
      "comparative advertising rules",
    ],
    keywords: [["best", "claim"], ["number", "one", "claim"], ["comparative", "advertising"]],
    next: ["own-web-rules-licence", "own-web-copy-tone"],
  },
  {
    id: "own-web-rules-privacy",
    question: "Do I need a privacy policy?",
    answer:
      "If the site collects anything about a visitor — a form, analytics, a mailing list — then yes, and personal data in the UAE is regulated. We build the mechanics properly and give you a starting point to review; a policy describing what you actually do is a legal document and worth having checked.",
    service: WEB,
    phrases: [
      "do i need a privacy policy",
      "pdpl compliance for my website",
      "data protection on a uae site",
      "do i need a cookie banner",
    ],
    keywords: [["privacy", "policy"], ["data", "protection", "site"], ["cookie", "banner"]],
    next: ["own-web-rules-cookies", "own-web-analytics", "own-web-newsletter"],
  },
  {
    id: "own-web-rules-cookies",
    question: "What about cookie consent?",
    answer:
      "It depends on what the site actually sets. A site with no advertising trackers needs far less than one running them, and the right answer is usually to use fewer third-party scripts rather than to put a bigger banner in front of them.",
    service: WEB,
    phrases: [
      "what about cookie consent",
      "does my site need a cookie popup",
      "tracking scripts and consent",
    ],
    keywords: [["cookie", "consent"], ["cookie", "popup"]],
    next: ["own-web-rules-privacy", "own-web-analytics"],
  },
  {
    id: "own-web-rules-vat",
    question: "Do prices on the site have to include VAT?",
    answer:
      "Displayed prices generally have to be the price a consumer pays, so VAT-inclusive, and if you are registered your TRN belongs on invoices. The exact requirements are the Federal Tax Authority's and your accountant's call; we build the site to show whichever you confirm.",
    service: WEB,
    phrases: [
      "do prices on the site have to include vat",
      "showing vat on my online store",
      "trn on my website",
    ],
    keywords: [["prices", "include", "vat"], ["trn", "website"]],
    next: ["own-web-pages-pricing", "own-web-shop-payments", "own-web-rules-terms"],
  },
  {
    id: "own-web-rules-terms",
    question: "Do I need terms and conditions?",
    answer:
      "If the site sells anything or takes a booking, yes — returns, cancellations, delivery and liability all need stating, and a shop without them is the one that ends up arguing. The wording should be reviewed by someone qualified; we make sure it is present, findable and agreed to at the right moment.",
    service: WEB,
    phrases: [
      "do i need terms and conditions",
      "returns policy on my online shop",
      "terms of service for a uae website",
    ],
    keywords: [["terms", "conditions"], ["returns", "policy"]],
    next: ["own-web-rules-vat", "own-web-rules-privacy", "own-web-type-shop"],
  },

  /* ── After launch ──────────────────────────────────────────────────────── */
  {
    id: "own-web-after-edit-myself",
    question: "Will I be able to change things myself?",
    answer:
      "Yes, for the things that change often — text, images, prices, posts, products. Structural changes are ours, and that split is deliberate: an editor that can rearrange everything is an editor that can break everything on a Friday evening.",
    service: WEB,
    phrases: [
      "will i be able to change things myself",
      "can i edit my own website",
      "do i get a cms",
      "how do i update the content",
    ],
    keywords: [["edit", "myself"], ["update", "content"], ["cms", "access"]],
    next: ["own-web-after-training", "own-web-after-maintenance", "own-web-handover"],
  },
  {
    id: "own-web-after-training",
    question: "Will you show me how to use it?",
    answer:
      "A walkthrough at handover, recorded so you can watch it again when you need it in four months rather than ringing us. Most people find the editing side takes about twenty minutes to learn.",
    service: WEB,
    phrases: [
      "will you show me how to use it",
      "do you provide training",
      "how do i learn to manage my site",
    ],
    keywords: [["show", "me", "how"], ["provide", "training"]],
    next: ["own-web-after-edit-myself", "own-web-handover"],
  },
  {
    id: "own-web-handover",
    question: "What do I actually get at handover?",
    answer:
      "Access to everything: the domain, the hosting, the site itself, the analytics and any accounts set up along the way, all in your name. Nothing is held back as leverage, which is the point of doing it this way.",
    service: WEB,
    phrases: [
      "what do i actually get at handover",
      "what is included when the project finishes",
      "do i get all the logins",
    ],
    keywords: [["at", "handover"], ["all", "the", "logins"]],
    next: ["own-web-domain-ownership", "own-web-after-leaving", "own-web-after-training"],
  },
  {
    id: "own-web-after-maintenance",
    question: "Do I have to buy a maintenance package?",
    answer:
      "No. Some people want one and it is worth it for a site that changes weekly or sells; for a five-page business site that rarely changes it often is not, and we will tell you which yours is rather than selling the package either way.",
    service: WEB,
    phrases: [
      "do i have to buy a maintenance package",
      "is a support contract compulsory",
      "monthly website maintenance",
      "what does maintenance cover",
    ],
    keywords: [["maintenance", "package"], ["support", "contract"]],
    next: ["own-web-after-backups", "own-web-after-changes", "own-web-hosting-cost"],
  },
  {
    id: "own-web-after-changes",
    question: "What if I want a new page in a year's time?",
    answer:
      "Ask and we will do it, whether or not there is a package. Work after launch is quoted the same way as everything else — against what it actually is, before it starts.",
    service: WEB,
    phrases: [
      "what if i want a new page in a year's time",
      "adding pages later",
      "can i come back for changes",
    ],
    keywords: [["new", "page", "later"], ["come", "back", "changes"]],
    next: ["own-web-after-maintenance", "own-web-after-edit-myself"],
  },
  {
    id: "own-web-after-backups",
    question: "What happens about backups and security?",
    answer:
      "Backups run automatically and are tested by actually restoring one, because an untested backup is a guess. Security is mostly keeping things current and not installing things the site does not need — most sites that get compromised were running something nobody had updated in two years.",
    service: WEB,
    phrases: [
      "what happens about backups and security",
      "is my website backed up",
      "what if my site gets hacked",
      "website security",
    ],
    keywords: [["backups", "security"], ["site", "hacked"], ["website", "security"]],
    next: ["own-web-after-hacked", "own-web-hosting-ssl", "own-web-after-maintenance"],
  },
  {
    id: "own-web-after-hacked",
    question: "My current site has been hacked. Can you help?",
    answer:
      "Usually — cleaning it, working out how they got in, and closing that. Be aware that a site which has been compromised for a while may also have search-engine damage to undo, and that is slower work than the clean-up itself.",
    service: WEB,
    phrases: [
      "my current site has been hacked can you help",
      "my website is showing spam pages",
      "google says my site is dangerous",
    ],
    keywords: [["site", "hacked", "help"], ["spam", "pages"], ["site", "dangerous"]],
    next: ["own-web-after-backups", "own-web-type-redesign"],
  },
  {
    id: "own-web-after-leaving",
    question: "What if I want to work with someone else later?",
    answer:
      "You take everything and go, and nothing about it should be awkward. The domain and hosting are already yours, the site is built on things another developer will recognise, and we hand over access rather than waiting to be asked three times.",
    service: WEB,
    phrases: [
      "what if i want to work with someone else later",
      "can another developer take over my site",
      "am i locked in",
      "proprietary platform",
    ],
    keywords: [["work", "with", "someone", "else"], ["locked", "in"], ["another", "developer"]],
    next: ["own-web-handover", "own-web-domain-ownership", "own-web-technology"],
  },
  {
    id: "own-web-technology",
    question: "What do you build the sites on?",
    answer:
      "Ordinary, widely used technology that another developer can pick up, chosen per project rather than one platform for everything. We will tell you what yours is built on and why before we start, because that is part of what you are buying.",
    service: WEB,
    phrases: [
      "what do you build the sites on",
      "do you use wordpress",
      "which platform will my website use",
      "is it a custom build or a template",
    ],
    keywords: [["build", "sites", "on"], ["use", "wordpress"], ["custom", "or", "template"]],
    next: ["own-web-templates", "own-web-after-leaving", "own-web-after-edit-myself"],
  },
  {
    id: "own-web-templates",
    question: "Is it a template or designed from scratch?",
    answer:
      "Designed for you, within reason — nobody benefits from reinventing a contact page, and nobody benefits from a theme bought for twenty dollars and lightly recoloured either. The parts that carry your argument are yours; the plumbing is not reinvented.",
    service: WEB,
    phrases: [
      "is it a template or designed from scratch",
      "do you use ready made themes",
      "will my site look like everyone else's",
    ],
    keywords: [["template", "scratch"], ["ready", "made", "themes"]],
    next: ["own-web-technology", "own-web-design-rounds"],
  },
  {
    id: "own-web-migrate-content",
    question: "Can you move the content from my old site?",
    answer:
      "Yes, and it is usually worth reviewing rather than copying — a rebuild is the one chance you get to delete the pages nobody has read in three years. Anything with search value is kept and redirected properly.",
    service: WEB,
    phrases: [
      "can you move the content from my old site",
      "migrating my blog posts",
      "transferring from wix to a new site",
      "moving off squarespace",
    ],
    keywords: [["move", "content", "old"], ["migrating", "posts"], ["transferring", "site"]],
    next: ["own-web-seo-migration", "own-web-type-redesign", "own-web-domain-existing"],
  },

  /* ── Money, for the website side ───────────────────────────────────────── */
  {
    id: "own-web-money-build",
    question: "What does a website cost?",
    answer:
      "It turns on the number of pages, whether it sells anything, how much content already exists and what has to connect to what — which is why a published figure would be wrong for almost everybody who read it. Give us the shape of what you need and someone will come back with a real number.",
    service: WEB,
    quote: true,
    phrases: [
      "what does a website cost",
      "how much is a business website",
      "price to build a site",
      "what are your website rates",
      "how much for a five page site",
      "is it expensive to get a website made",
      "give me an estimate for a website",
      "how much am i looking at for a site",
      // Money idioms carry no price word, so the keyword groups above cannot
      // see them. Each keeps its subject noun: a bare "set me back" would
      // claim an attestation price question and quote it for a website.
      "what would a website set me back",
      "what would a site set me back",
      "ballpark for a website",
      "whats the damage for a website",
      "give me a quote for a website",
      "website packages and pricing",
    ],
    keywords: [
      ...priceGroups("website"),
      ...priceGroups("site"),
      // "web", at three characters, is compared exactly rather than by prefix,
      // which makes it the cheapest way to hold "web design" and "web
      // development" without spending a group on each.
      ...priceGroups("web"),
      ["expensive", "website"],
      ["expensive", "site"],
    ],
  },
  {
    id: "own-web-money-shop",
    question: "What does an online shop cost compared with a normal site?",
    answer:
      "More, and the difference is mostly the things around the products rather than the products themselves — payment, delivery, tax display, order handling. Tell us roughly what you are selling and how many lines there are and we will price it properly.",
    service: WEB,
    quote: true,
    phrases: [
      "what does an online shop cost compared with a normal site",
      "ecommerce website price",
      "how much to build an online store",
    ],
    keywords: [...priceGroups("ecommerce"), ...priceGroups("store")],
  },
  {
    id: "own-web-money-ongoing",
    question: "What will it cost me every year to keep it running?",
    answer:
      "The domain renewal and the hosting, both small, plus anything you choose to pay for beyond that. We set those out before you commit rather than letting them appear afterwards, and they are paid to the providers rather than to us.",
    service: WEB,
    quote: true,
    phrases: [
      "what will it cost me every year to keep it running",
      "annual cost of a website",
      "running costs after launch",
      "yearly fees for hosting and domain",
    ],
    keywords: [...priceGroups("hosting"), ...priceGroups("renewal")],
  },
  {
    id: "own-web-money-seo",
    question: "What do you charge for SEO?",
    answer:
      "The groundwork is part of the build rather than an add-on, so for most sites the answer is nothing extra. Ongoing work — writing, measuring, competing in a crowded market — is quoted separately and only when it is honestly worth doing for you.",
    service: WEB,
    quote: true,
    phrases: [
      "what do you charge for seo",
      "seo pricing",
      "monthly seo cost",
      "how much is search engine optimisation",
    ],
    keywords: priceGroups("seo"),
  },
  {
    id: "own-web-money-cheaper",
    question: "I was quoted much less elsewhere. Why?",
    answer:
      "Usually one of three things: a template filled in rather than a site designed, the content left to you, or the domain and hosting held by the agency so leaving is expensive. Any of those can be a perfectly reasonable buy — ask the cheaper quote those three questions and you will know which it is.",
    service: WEB,
    quote: true,
    phrases: [
      "i was quoted much less elsewhere why",
      "someone offered me a website for much cheaper",
      "why are you more expensive than other agencies",
    ],
    // No price word: "cheaper" is one, and a group pairing it with itself asks
    // for the same word twice — which `sameWord` makes invisible on the page.
    keywords: [["quoted", "less", "elsewhere"], ["why", "more", "expensive"], ["someone", "offered", "cheaper"]],
  },
  {
    id: "own-web-money-payment",
    question: "How is a website project paid for?",
    answer:
      "In stages tied to the work rather than all at the start, and agreed in writing before anything begins. The person who calls you back will set it out against your actual project.",
    service: WEB,
    quote: true,
    phrases: [
      "how is a website project paid for",
      "do you take a deposit for a website",
      "payment stages for web design",
    ],
    keywords: [["payment", "stages", "website"], ["deposit", "website"]],
  },

  /* ── More professions, because the licensed ones are not the only hard
        ones ─────────────────────────────────────────────────────────────── */
  {
    id: "own-cv-field-aviation",
    question: "I work in aviation — cabin crew, pilot or ground.",
    answer:
      "Hours, type ratings, licences and their validity carry a flight-deck CV, and the recruiters here screen on them mechanically. Cabin crew applications are mostly a form and an assessment day rather than a CV, so the document's job is to get you to the day.",
    service: CV,
    phrases: [
      "i work in aviation cabin crew pilot or ground",
      "cabin crew cv for emirates",
      "pilot cv uae",
      "aviation resume",
    ],
    keywords: [["cabin", "crew", "cv"], ["pilot", "cv"], ["aviation", "resume"]],
    next: ["own-cv-field-certificates", "own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-oil-gas",
    question: "I am in oil, gas or energy.",
    answer:
      "Assets, disciplines, standards and rotations — onshore and offshore are different lives and the page should say which you have done. Safety certification with expiry dates belongs high, because it is frequently the first filter applied.",
    service: CV,
    phrases: [
      "i am in oil gas or energy",
      "oil and gas cv uae",
      "offshore resume",
      "energy sector cv abu dhabi",
    ],
    keywords: [["oil", "gas", "cv"], ["offshore", "resume"], ["energy", "sector"]],
    next: ["own-cv-field-engineering", "own-cv-field-certificates", "own-cv-process"],
  },
  {
    id: "own-cv-field-retail",
    question: "I work in retail.",
    answer:
      "Brand, store format and footfall place you immediately; after that it is numbers — conversion, basket, shrink, team size. A mall flagship and a neighbourhood branch are very different jobs with the same title on the page.",
    service: CV,
    phrases: [
      "i work in retail",
      "retail cv dubai",
      "store manager resume",
      "sales assistant cv uae",
    ],
    keywords: [["retail", "cv"], ["store", "manager"], ["sales", "assistant"]],
    next: ["own-cv-field-sales", "own-cv-field-other", "own-cv-process"],
  },
  {
    id: "own-cv-field-security",
    question: "I work in security.",
    answer:
      "Your approvals are the page: the licence or clearance you hold, who issued it, and whether it is current. In this sector a CV without that is read as an application that has not started yet.",
    service: CV,
    phrases: [
      "i work in security",
      "security guard cv dubai",
      "sira licence on my cv",
      "security supervisor resume",
    ],
    keywords: [["security", "guard", "cv"], ["security", "supervisor"]],
    next: ["own-cv-field-certificates", "own-cv-field-other"],
  },
  {
    id: "own-cv-field-beauty",
    question: "I am a therapist, stylist or in a salon.",
    answer:
      "Treatments and brands you are trained on, your professional licence position, and the kind of venue — a hotel spa, a clinic and a neighbourhood salon hire differently. Photographs of work belong on a profile or a site, not stapled to a CV.",
    service: CV,
    phrases: [
      "i am a therapist stylist or in a salon",
      "beautician cv dubai",
      "spa therapist resume",
      "hairdresser cv uae",
    ],
    keywords: [["beautician", "cv"], ["spa", "therapist"], ["hairdresser", "cv"]],
    next: ["own-web-type-portfolio", "own-cv-field-certificates", "own-cv-field-other"],
  },
  {
    id: "own-cv-field-domestic",
    question: "I am applying for household or nanny work.",
    answer:
      "A short, clear page: duties, ages of children, length of each placement and languages. Be careful who you send it to — this is the part of the market where documents are most often collected by people who are not employers, so check before sending anything with your details on it.",
    service: CV,
    phrases: [
      "i am applying for household or nanny work",
      "nanny cv dubai",
      "housemaid resume",
      "domestic worker cv",
    ],
    keywords: [["nanny", "cv"], ["housemaid", "resume"], ["domestic", "worker"]],
    next: ["own-cv-privacy", "own-cv-not-recruiter", "own-cv-field-other"],
  },
  {
    id: "own-cv-field-maritime",
    question: "I am a seafarer.",
    answer:
      "Rank, vessel types, tonnage, routes and every certificate with its validity — a maritime CV is read as a document of record, not as a pitch. Sea service has its own format expectations, so tell us what the company you are applying to asks for.",
    service: CV,
    phrases: [
      "i am a seafarer",
      "marine cv for a shipping company",
      "seaman resume uae",
      "vessel crew cv",
    ],
    keywords: [["seafarer", "cv"], ["marine", "cv"], ["vessel", "crew"]],
    next: ["own-cv-field-certificates", "own-cv-field-logistics"],
  },
  {
    id: "own-cv-field-pharmacy",
    question: "I am a pharmacist or in a laboratory.",
    answer:
      "Treated like the rest of healthcare here: your licensing route — DHA, DOH or MOHAP — stated plainly with the stage you have reached, then the setting, the systems and the accreditation standards you have worked to. Eligibility is the regulator's decision and the CV should not imply it has been made.",
    service: CV,
    phrases: [
      "i am a pharmacist or in a laboratory",
      "pharmacist cv dubai",
      "lab technician resume uae",
      "medical laboratory cv",
    ],
    keywords: [["pharmacist", "cv"], ["laboratory", "resume"], ["lab", "technician"]],
    next: ["own-cv-field-healthcare-licence", "own-cv-field-healthcare", "own-cv-field-certificates"],
  },
  {
    id: "own-cv-field-architecture",
    question: "I am an architect or interior designer.",
    answer:
      "The work has to be visible, so the CV is short and the portfolio does the arguing — projects, your actual role on each, and the stages you covered. Registration requirements vary by emirate and by what you want to sign off, so confirm yours with the relevant municipality.",
    service: CV,
    phrases: [
      "i am an architect or interior designer",
      "architect cv dubai",
      "interior design portfolio and resume",
    ],
    keywords: [["architect", "cv"], ["interior", "designer"]],
    next: ["own-web-type-portfolio", "own-cv-field-engineering", "own-both-together"],
  },
  {
    id: "own-cv-field-supply-chain",
    question: "I am in procurement or supply chain.",
    answer:
      "Spend under management, categories, supplier counts and the systems — those four place you faster than any summary. If you have worked to a particular contracting standard or in a regulated import environment here, say which.",
    service: CV,
    phrases: [
      "i am in procurement or supply chain",
      "procurement manager cv uae",
      "supply chain resume dubai",
      "buyer cv",
    ],
    keywords: [["procurement", "cv"], ["supply", "chain", "resume"]],
    next: ["own-cv-field-logistics", "own-cv-field-finance-systems", "own-cv-process"],
  },
  {
    id: "own-cv-field-media",
    question: "I work in media or production.",
    answer:
      "Credits, formats and the names people recognise, then a link. Like design and development, this is a field where the reel or the clips get looked at before the page does, and the page's job is to make that quick.",
    service: CV,
    phrases: [
      "i work in media or production",
      "video producer cv dubai",
      "journalist resume uae",
      "media cv",
    ],
    keywords: [["media", "cv"], ["producer", "cv"], ["journalist", "resume"]],
    next: ["own-web-type-portfolio", "own-cv-field-marketing", "own-both-together"],
  },
  {
    id: "own-cv-field-education-admin",
    question: "I work in a school but not as a teacher.",
    answer:
      "Say so clearly in the first line, because school recruiters screen for teaching first and an admissions registrar or a lab technician gets missed in that sweep. The curriculum and the inspection framework still matter; the teaching qualification does not.",
    service: CV,
    phrases: [
      "i work in a school but not as a teacher",
      "school administrator cv",
      "teaching assistant resume uae",
      "school admin job",
    ],
    keywords: [["school", "administrator"], ["teaching", "assistant"]],
    next: ["own-cv-field-teaching", "own-cv-field-other"],
  },

  /* ── More situations ───────────────────────────────────────────────────── */
  {
    id: "own-cv-case-returning-uae",
    question: "I worked in the UAE before and left. Does that help?",
    answer:
      "It helps, and it should be visible rather than buried in a date range — prior Gulf experience removes a doubt that a reader otherwise has to resolve themselves. If you left on good terms and could be re-employed, that is worth the employer knowing early.",
    service: CV,
    phrases: [
      "i worked in the uae before and left does that help",
      "coming back to dubai after a few years",
      "returning expat cv",
    ],
    keywords: [["worked", "uae", "before"], ["returning", "expat"]],
    next: ["own-cv-case-break", "own-cv-visa-line", "own-cv-process"],
  },
  {
    id: "own-cv-case-age",
    question: "I am older than most of the people applying. Should I hide my age?",
    answer:
      "You do not have to state a date of birth, and most CVs here are better without one. What is harder to hide is a forty-year education date, so the usual answer is to let the recent work carry the page and let early history compress — not to deceive, but because nobody needs it.",
    service: CV,
    phrases: [
      "i am older than most of the people applying should i hide my age",
      "age discrimination in the uae job market",
      "do i put my date of birth on my cv",
    ],
    keywords: [["hide", "my", "age"], ["date", "of", "birth"]],
    next: ["own-cv-case-senior", "own-cv-case-overqualified"],
  },
  {
    id: "own-cv-case-nationality",
    question: "Adverts here sometimes specify a nationality. What do I do?",
    answer:
      "You cannot change what an advert asks for, and we will not pretend the preference does not exist in parts of this market. What you can do is apply where the requirement is about language or a licence rather than a passport, and make the thing they actually need visible. If you believe a posting is unlawful, MOHRE is who hears that, not us.",
    service: CV,
    phrases: [
      "adverts here sometimes specify a nationality what do i do",
      "the job says arabic nationals only",
      "nationality preference in uae job ads",
    ],
    keywords: [["specify", "nationality"], ["nationality", "preference"]],
    next: ["own-cv-limit-no-guarantee", "own-cv-process"],
  },
  {
    id: "own-cv-case-remote",
    question: "I want remote work rather than a job in the UAE.",
    answer:
      "Then the CV has to argue something different: that you have actually worked this way, across time zones, with the tools and the self-management that needs. A CV written for an office role and sent for a remote one reads as a candidate who has not thought about it.",
    service: CV,
    phrases: [
      "i want remote work rather than a job in the uae",
      "remote job cv",
      "working from home for an overseas company",
    ],
    keywords: [["remote", "work", "cv"], ["working", "from", "home"]],
    next: ["own-cv-case-freelance", "own-cv-process"],
  },
  {
    id: "own-cv-case-part-time",
    question: "I am looking for part-time or shift work.",
    answer:
      "Availability belongs on the page, plainly, near the top — an employer filling shifts is sorting by who can work when before anything else. Whether your visa permits the arrangement is a separate question and one to settle before applying.",
    service: CV,
    phrases: [
      "i am looking for part time or shift work",
      "part time job cv uae",
      "can i work part time on my visa",
    ],
    keywords: [["part", "time", "cv"], ["shift", "work"]],
    next: ["own-cv-visa-line", "own-cv-process"],
  },
  {
    id: "own-cv-case-disability",
    question: "I have a disability. Does it go on the CV?",
    answer:
      "Only if you want it to, and there is no obligation to disclose on a CV. Some people choose to, particularly where an employer has a published inclusion commitment; others raise it at offer stage when adjustments are being discussed. Both are reasonable and it is entirely your call.",
    service: CV,
    phrases: [
      "i have a disability does it go on the cv",
      "should i disclose a health condition",
      "people of determination employment",
    ],
    keywords: [["disability", "cv"], ["disclose", "condition"]],
    next: ["own-cv-privacy", "own-cv-process"],
  },
  {
    id: "own-cv-case-family-move",
    question: "My spouse has a job here and I am looking too.",
    answer:
      "Say that you are already relocating, because it removes the biggest unknown an employer has about an overseas applicant. If you will be on a family visa and do not need sponsorship, that is a genuine advantage and belongs where it will be seen.",
    service: CV,
    phrases: [
      "my spouse has a job here and i am looking too",
      "i am moving with my husband and need work",
      "job search on a family visa",
    ],
    keywords: [["spouse", "job", "here"], ["family", "visa", "work"]],
    next: ["own-cv-visa-line", "own-cv-case-break", "own-cv-process"],
  },
  {
    id: "own-cv-sending-how",
    question: "How should I actually send the CV?",
    answer:
      "As a PDF with a sensible file name — your name and the role, not \"cv final v3\" — and with the email itself saying in three lines who you are and what you are applying for. A blank email with an attachment gets opened last, if at all.",
    service: CV,
    phrases: [
      "how should i actually send the cv",
      "what do i write in the email with my cv",
      "what should i name the cv file",
    ],
    keywords: [["send", "the", "cv"], ["name", "cv", "file"], ["email", "with", "cv"]],
    next: ["own-cv-formats-delivered", "own-cv-cover-letter-included"],
  },

  /* ── Websites by trade ─────────────────────────────────────────────────── */
  {
    id: "own-web-type-restaurant",
    question: "I have a restaurant or a café.",
    answer:
      "Three things carry it: the menu as text on a page rather than a PDF nobody can read on a phone, the location with a working map link, and the hours. Delivery platforms take the ordering; the site's job is to be found and to be checked.",
    service: WEB,
    phrases: [
      "i have a restaurant or a cafe",
      "restaurant website dubai",
      "cafe site with a menu",
      "food business website",
    ],
    keywords: [["restaurant", "website"], ["cafe", "site"], ["menu", "website"]],
    next: ["own-web-menu-pdf", "own-web-seo-gbp", "own-web-type-business"],
  },
  {
    id: "own-web-menu-pdf",
    question: "Can we just put the menu up as a PDF?",
    answer:
      "You can, and it is one of the most common reasons a restaurant site is useless on a phone — a PDF opens slowly, cannot be read without pinching, and is invisible to search. A menu as real text costs no more and works everywhere.",
    service: WEB,
    phrases: [
      "can we just put the menu up as a pdf",
      "pdf menu on my website",
      "uploading a brochure instead of pages",
    ],
    keywords: [["pdf", "menu"], ["brochure", "instead", "pages"]],
    next: ["own-web-type-restaurant", "own-web-mobile", "own-web-seo-included"],
  },
  {
    id: "own-web-type-clinic",
    question: "I run a clinic or a medical practice.",
    answer:
      "Buildable, with one hard condition: healthcare advertising is regulated and the content generally needs the health authority's approval before it is published. We build the site and the booking; getting the claims cleared with DHA, DOH or MOHAP is yours, and we will not publish ahead of it.",
    service: WEB,
    phrases: [
      "i run a clinic or a medical practice",
      "clinic website dubai",
      "dental practice site",
      "medical centre website uae",
    ],
    keywords: [["clinic", "website"], ["medical", "practice", "site"], ["dental", "website"]],
    next: ["own-web-rules-regulated", "own-web-booking", "own-web-rules-privacy"],
  },
  {
    id: "own-web-type-realestate",
    question: "I am a property agent.",
    answer:
      "The listings mostly live on the portals and that is fine — the site's job is you rather than the inventory: the areas you actually work, the transactions you have closed, and a way to reach you. Your brokerage registration belongs on the page.",
    service: WEB,
    phrases: [
      "i am a property agent",
      "real estate agent website dubai",
      "property listings site",
      "broker website uae",
    ],
    keywords: [["real", "estate", "website"], ["property", "listings"], ["broker", "website"]],
    next: ["own-web-rules-licence", "own-web-trust-signals", "own-web-type-business"],
  },
  {
    id: "own-web-type-school",
    question: "I run a nursery or a training centre.",
    answer:
      "Parents and employers are both checking credentials before anything else, so the approval or permit you hold goes where it cannot be missed. Education providers here are regulated by the relevant authority for the emirate, and what you may advertise follows from that.",
    service: WEB,
    phrases: [
      "i run a nursery or a training centre",
      "nursery website dubai",
      "training institute site uae",
      "school website",
    ],
    keywords: [["nursery", "website"], ["training", "institute"], ["school", "website"]],
    next: ["own-web-rules-licence", "own-web-trust-signals", "own-web-booking"],
  },
  {
    id: "own-web-type-salon",
    question: "I have a salon or a spa.",
    answer:
      "Booking and location do most of the work, then photographs of your own space and your own results — stock images of somebody else's salon are spotted immediately in this category. Keep the treatment list editable, because it changes more often than anything else on the site.",
    service: WEB,
    phrases: [
      "i have a salon or a spa",
      "salon website dubai",
      "spa booking site",
      "beauty business website",
    ],
    keywords: [["salon", "website"], ["spa", "booking"], ["beauty", "website"]],
    next: ["own-web-booking", "own-web-content-photos", "own-web-after-edit-myself"],
  },
  {
    id: "own-web-type-contracting",
    question: "I run a contracting or maintenance company.",
    answer:
      "Buyers here are checking that you are licensed, insured and have done the thing before. So: the licence, the categories you are approved for, photographs of completed work, and a phone number above the fold — this is a sector where people call rather than fill in a form.",
    service: WEB,
    phrases: [
      "i run a contracting or maintenance company",
      "contracting company website",
      "ac maintenance business site",
      "cleaning company website dubai",
    ],
    keywords: [["contracting", "website"], ["maintenance", "company", "site"]],
    next: ["own-web-trust-signals", "own-web-rules-licence", "own-web-forms-whatsapp"],
  },
  {
    id: "own-web-type-consultant",
    question: "I am a consultant working on my own.",
    answer:
      "A small, confident site under your own name, and it should sound like one person rather than impersonating a firm — \"we\" from a sole practitioner is transparent and costs credibility. Three pages done properly is usually the whole job.",
    service: WEB,
    phrases: [
      "i am a consultant working on my own",
      "personal brand website",
      "one person consultancy site",
      "freelancer website uae",
    ],
    keywords: [["consultant", "website"], ["personal", "brand", "site"]],
    next: ["own-web-type-portfolio", "own-both-together", "own-web-type-landing"],
  },
  {
    id: "own-web-type-nonprofit",
    question: "We are a community group or a non-profit.",
    answer:
      "We build these, and the one thing to settle first is fundraising: collecting donations in the UAE is tightly regulated and needs a permit from the relevant authority. We will build whatever you are licensed to do and will not add a donate button to a site that is not.",
    service: WEB,
    phrases: [
      "we are a community group or a non profit",
      "charity website uae",
      "can i collect donations on my website",
      "ngo site",
    ],
    keywords: [["charity", "website"], ["collect", "donations"], ["non", "profit", "site"]],
    next: ["own-web-rules-licence", "own-web-rules-regulated", "own-web-type-business"],
  },
  {
    id: "own-web-multi-location",
    question: "We have branches in three emirates.",
    answer:
      "A page per location, each with its own address, phone number and map, rather than one page listing all three — that is what lets each branch show up for searches near it. Keep the details identical to your listings everywhere else; inconsistency is what quietly costs local visibility.",
    service: WEB,
    phrases: [
      "we have branches in three emirates",
      "multiple locations on one website",
      "branch pages for each city",
    ],
    keywords: [["multiple", "locations"], ["branch", "pages"]],
    next: ["own-web-seo-local", "own-web-seo-gbp", "own-web-pages-which"],
  },

  /* ── More about the site itself ────────────────────────────────────────── */
  {
    id: "own-web-careers-page",
    question: "Should we have a careers page?",
    answer:
      "If you hire regularly, yes, and it pays for itself in CVs that arrive without an agency attached. If you hire twice a year, a line on the contact page is enough — an empty vacancies list suggests a company that is not growing.",
    service: WEB,
    phrases: [
      "should we have a careers page",
      "jobs page on our website",
      "recruitment section for our site",
    ],
    keywords: [["careers", "page"], ["jobs", "page", "website"]],
    next: ["own-web-pages-which", "own-web-forms-contact"],
  },
  {
    id: "own-web-testimonials",
    question: "Are testimonials worth putting on?",
    answer:
      "Real ones with a name and a company, yes. Anonymous praise from \"A.K., Dubai\" is read as invented and does more harm than an empty space, so if you cannot get attributable quotes, use case detail instead.",
    service: WEB,
    phrases: [
      "are testimonials worth putting on",
      "customer reviews on my website",
      "client quotes section",
    ],
    keywords: [["testimonials", "website"], ["client", "quotes"]],
    next: ["own-web-trust-signals", "own-web-seo-reviews"],
  },
  {
    id: "own-web-faq-page",
    question: "Does a FAQ page help?",
    answer:
      "When it answers questions people genuinely ask, it is one of the most useful pages on a site and often the one search brings people to. When it is invented to look thorough, it reads as filler and nobody finishes it.",
    service: WEB,
    phrases: [
      "does a faq page help",
      "should i add frequently asked questions",
      "faq section for seo",
    ],
    keywords: [["faq", "page"], ["frequently", "asked", "questions"]],
    next: ["own-web-seo-included", "own-web-pages-which"],
  },
  {
    id: "own-web-live-chat",
    question: "Should the site have a chat widget?",
    answer:
      "Only if somebody answers it. A chat box that nobody is behind is worse than none, because a visitor who waits and gets nothing has now had a bad experience rather than a neutral one. For most small businesses a WhatsApp link is the honest version.",
    service: WEB,
    phrases: [
      "should the site have a chat widget",
      "live chat on my website",
      "do i need a chatbot",
    ],
    keywords: [["live", "chat"], ["chat", "widget"], ["need", "chatbot"]],
    next: ["own-web-forms-whatsapp", "own-web-forms-contact"],
  },
  {
    id: "own-web-social-links",
    question: "Should the site link to our social accounts?",
    answer:
      "To the ones that are active, yes. A row of icons where two lead to accounts last posted to in 2021 sends people away from your site to see that you have stopped — it is worth being selective rather than complete.",
    service: WEB,
    phrases: [
      "should the site link to our social accounts",
      "instagram feed on my website",
      "social media icons",
    ],
    keywords: [["social", "accounts", "link"], ["instagram", "feed"]],
    next: ["own-web-seo-social", "own-web-speed-why"],
  },
  {
    id: "own-web-staff-emails",
    question: "Should we put staff names and photos on the site?",
    answer:
      "In this market it helps more than almost anything else, because a buyer is trying to decide whether there is a real company behind the page. Ask the people first, and use a role address rather than a personal one for anyone who would rather not be contacted directly.",
    service: WEB,
    phrases: [
      "should we put staff names and photos on the site",
      "team page with photos",
      "listing employees on our website",
    ],
    keywords: [["staff", "photos"], ["team", "page"]],
    next: ["own-web-pages-about", "own-web-trust-signals", "own-web-rules-privacy"],
  },
  {
    id: "own-web-seo-sitemap",
    question: "What is a sitemap and do I need one?",
    answer:
      "A list of your pages in a form search engines read, submitted to them so nothing is missed. It is included and takes no effort on your side; it helps most on a bigger site or a new one with no links pointing at it yet.",
    service: WEB,
    phrases: [
      "what is a sitemap and do i need one",
      "submitting my site to google",
      "google search console setup",
    ],
    keywords: [["sitemap", "need"], ["submitting", "site", "google"]],
    next: ["own-web-seo-included", "own-web-seo-timeframe"],
  },
  {
    id: "own-web-seo-schema",
    question: "What is structured data for?",
    answer:
      "It tells a search engine what a page is about in a form it can act on — that this is a business with these hours, or a product at this price. It is what makes the extra detail sometimes appear under a result, and it is part of the build rather than an upsell.",
    service: WEB,
    phrases: [
      "what is structured data for",
      "schema markup on my website",
      "rich results in google",
    ],
    keywords: [["structured", "data"], ["schema", "markup"], ["rich", "results"]],
    next: ["own-web-seo-included", "own-web-seo-gbp"],
  },
  {
    id: "own-web-seo-duplicate",
    question: "Can I copy text from another company's site?",
    answer:
      "No, on two counts: it is their copyright, and duplicated text is one of the easier things for a search engine to notice. It also fails at the only job the page has, which is to say something true about you.",
    service: WEB,
    phrases: [
      "can i copy text from another company's site",
      "reusing competitor content",
      "duplicate content penalty",
    ],
    keywords: [["copy", "text", "another"], ["duplicate", "content"]],
    next: ["own-web-content-copyright", "own-web-copy-who"],
  },
  {
    id: "own-web-seo-backlinks",
    question: "Someone offered to sell me a thousand backlinks.",
    answer:
      "Do not buy them. Bought links are the most reliable way to damage a site's standing, the damage takes far longer to undo than it took to cause, and the people selling them know that. Listings in genuine local directories and your own trade bodies are the version that works.",
    service: WEB,
    phrases: [
      "someone offered to sell me a thousand backlinks",
      "should i buy backlinks",
      "link building packages",
    ],
    keywords: [["buy", "backlinks"], ["link", "building"]],
    next: ["own-web-seo-no-guarantee", "own-web-seo-local"],
  },
  {
    id: "own-web-downtime",
    question: "What happens if the site goes down?",
    answer:
      "It is monitored, so in most cases we know before you do, and restoring from a tested backup is quick. Nobody can promise a site never goes down; what can be promised is that there is a current backup and someone who answers.",
    service: WEB,
    phrases: [
      "what happens if the site goes down",
      "website uptime guarantee",
      "my site is offline",
    ],
    keywords: [["site", "goes", "down"], ["uptime", "website"], ["site", "offline"]],
    next: ["own-web-after-backups", "own-web-after-maintenance"],
  },
  {
    id: "own-web-domain-renewal-lapse",
    question: "What if I forget to renew the domain?",
    answer:
      "It stops resolving, email on it stops too, and after a grace period someone else can register it — which for an established business is genuinely serious. Renewal reminders go to you because the domain is yours; set it to renew automatically and keep the card on it current.",
    service: WEB,
    phrases: [
      "what if i forget to renew the domain",
      "my domain expired",
      "lost my web address",
    ],
    keywords: [["forget", "renew", "domain"], ["domain", "expired"]],
    next: ["own-web-domain-ownership", "own-web-hosting-cost"],
  },
  {
    id: "own-web-contract",
    question: "Is there a contract?",
    answer:
      "Yes — what is being built, what it costs, when it is paid and who owns what, in writing before anything starts. It protects you more than it protects us, and a web project without one is where most disputes in this trade come from.",
    service: WEB,
    phrases: [
      "is there a contract",
      "do we sign an agreement for the website",
      "what is in your scope document",
    ],
    keywords: [["contract", "website"], ["sign", "agreement"]],
    next: ["own-web-money-payment", "own-web-nda", "own-web-handover"],
  },
  {
    id: "own-web-nda",
    question: "Will you sign an NDA?",
    answer:
      "Yes, and for a product that has not launched that is a reasonable thing to ask for. Send yours or we will work from a standard one; it does not slow anything down.",
    service: WEB,
    phrases: [
      "will you sign an nda",
      "confidentiality agreement for my project",
      "my idea is not public yet",
    ],
    keywords: [["sign", "nda"], ["confidentiality", "agreement"]],
    next: ["own-web-contract", "own-cv-privacy"],
  },
  {
    id: "own-web-who-builds",
    question: "Who actually does the work?",
    answer:
      "We do, here, and you deal with the person building it rather than with an account manager relaying messages to somebody you never meet. If part of a project needs a specialist we do not have, we will tell you that rather than attempt it.",
    service: WEB,
    phrases: [
      "who actually does the work",
      "do you outsource the development",
      "is the work done in house",
    ],
    keywords: [["who", "does", "work"], ["outsource", "development"], ["in", "house", "work"]],
    next: ["own-hub-start", "own-web-scope-limits", "own-hub-web-process"],
  },
  {
    id: "own-web-remote-client",
    question: "I am not in the UAE. Can you still build my site?",
    answer:
      "Yes, and a good share of the work is for people who are not here yet. The only part that genuinely benefits from being local is photography, and that can wait until you arrive without holding up the launch.",
    service: WEB,
    phrases: [
      "i am not in the uae can you still build my site",
      "do you work with overseas clients",
      "building a website from another country",
    ],
    keywords: [["not", "in", "uae", "site"], ["overseas", "clients"]],
    next: ["own-web-content-photos", "own-hub-web-process", "own-cv-call-timezone"],
  },
  {
    id: "own-web-first-conversation",
    question: "Can we talk it through before I commit to anything?",
    answer:
      "Yes, and it is the sensible order — a short conversation about what the site is for usually changes the brief, sometimes to something smaller than you came in with. Nothing is owed for that conversation.",
    service: WEB,
    phrases: [
      "can we talk it through before i commit to anything",
      "is the first consultation free",
      "can i just ask some questions first",
    ],
    keywords: [["talk", "before", "commit"], ["consultation", "free"]],
    next: ["own-hub-web-process", "own-web-money-build", "own-web-what-we-need"],
  },
  {
    id: "own-web-existing-developer",
    question: "I already have a developer but nothing is happening.",
    answer:
      "Before changing anyone, find out whether you have access to the domain, the hosting and the site, because that determines what your options actually are. We will look at it and tell you honestly whether the right move is a nudge, a handover or a rebuild.",
    service: WEB,
    phrases: [
      "i already have a developer but nothing is happening",
      "my web designer has disappeared",
      "stuck halfway through a website project",
    ],
    keywords: [["developer", "nothing", "happening"], ["designer", "disappeared"]],
    next: ["own-web-domain-transfer", "own-web-type-redesign", "own-web-domain-ownership"],
  },
];

/* ── Catching what the doors let in ─────────────────────────────────────── */

/**
 * Every door phrasing that nothing above already answers, landed on the hub
 * that should catch it.
 *
 * Without this a visitor who gets through the door on "can you fix my cv"
 * matches nothing inside and the turn falls out to the model — see
 * `./doors.ts`, which also explains why this is computed rather than copied.
 */
landDoorPhrases(OWN_WORK_FLOWS, "own-hub-cv", CV_DOOR_PHRASES);
landDoorPhrases(OWN_WORK_FLOWS, "own-hub-web", WEB_BUILD_DOOR_PHRASES);
landDoorPhrases(OWN_WORK_FLOWS, "own-hub-web-after", WEB_RUNNING_DOOR_PHRASES);
