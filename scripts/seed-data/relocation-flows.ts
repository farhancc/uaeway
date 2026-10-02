/**
 * Everything someone asks between accepting a UAE job and feeling settled in it.
 *
 * Seed content, the same shape as ./visa-flows.ts and ./job-search-flows.ts and
 * built by the same `buildAuthoredFlow`: writing an answer here is writing
 * sentences, and the nodes, edges and intents are the builder's problem. It
 * fills the flow the first time; after that /admin/flow is where it is edited.
 *
 * WHY AN EIGHTH PACK, NEXT TO JOB SEARCH AND VISAS
 *
 * Those two packs answer "how do I get hired" and "how does the visa work".
 * Neither answers the question this one is about, which is the one people
 * actually arrive with: *I have the job — now how do I move my life here?*
 * That is rent paid in a handful of cheques, a bank account that wants an
 * Emirates ID that wants a medical that wants an entry permit, a school year
 * that starts in the wrong month, a driving licence that may or may not swap,
 * medicines that are legal at home and controlled here, and a spouse who has
 * given up a job to come. None of it is a visa question and none of it is a job
 * question, and until now all of it reached the model.
 *
 * The boundary is deliberate and the tests hold it from both sides. Where a
 * question is really about visa mechanics — what the medical tests for, how the
 * Emirates ID is renewed, who may sponsor a parent — the visa pack owns it and
 * this one does not compete. What lives here is the *sequence and the life
 * around it*: when in the first fortnight the medical happens, what to do while
 * the passport is with the PRO, what cannot be opened until the ID arrives.
 *
 * WHY IT IS SHAPED IN CLUSTERS
 *
 * Two hundred answers all hanging off the start node match badly: every housing
 * question looks like every other housing question to a similarity score. So
 * there are fourteen hubs, one per stage of the move, each offering its cluster
 * as buttons — a tap is an exact transition with no matching at all — while
 * every answer stays wired from `start` so that someone who types "can I open a
 * bank account before my Emirates ID" gets that answer and not a menu.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind written answers harder than
 * generated ones: these are published under the company's name with no model in
 * the loop to hedge them. On this subject five things matter most.
 *
 *   - No fee, deposit, rent, salary, allowance, threshold, duration or
 *     eligibility rule stated as fact. Someone budgeting a move on a number we
 *     invented would be out of pocket on arrival, in a country where they have
 *     no cushion yet. Say what it turns on, and name the authority to confirm it
 *     with — MOHRE, ICP or GDRFA, the free zone, DEWA or the emirate's utility,
 *     RTA, the DLD and Ejari, KHDA or ADEK or the Ministry of Education, DHA,
 *     DOH or MOHAP, Federal Customs, the Central Bank, the employer.
 *   - We are not a relocation agent, a law firm or a licensed PRO. We write CVs
 *     and build websites ourselves; attestation, translation, notarisation and
 *     visa filing are carried out by the licensed providers we introduce people
 *     to. Nothing here may imply otherwise.
 *   - No legal advice. A withheld passport, a labour complaint, a rental
 *     dispute, a debt, a question about personal status law — each gets pointed
 *     at the authority that handles it or at a lawyer, and is never settled in a
 *     chat reply.
 *   - Honest about the unpleasant parts. The set-up costs before the first
 *     salary, the cheques, the summer, the spouse who cannot work without a
 *     permit: a cheerful answer that omits them is the one that gets somebody
 *     into trouble. These answers say the hard thing first.
 *   - A money question about OUR work gets no number. It carries `quote: true`,
 *     which walks the reply into that service's qualification and ends at the
 *     callback form. A money question about the visitor's OWN budget — rent,
 *     school fees, what a move costs them — is not a quote and must never reach
 *     a lead form; it is answered as content, as the job pack answers "what
 *     salary should I ask for". Keeping those two apart is what most of the
 *     routing tests in tests/relocation-flows.test.ts are about.
 *
 * The first of those is enforced mechanically by the same `findUnsupportedAmounts`
 * the chatbot's own replies go through.
 *
 * ONE THING THIS PACK DELIBERATELY DOES NOT CLAIM
 *
 * An opening suggestion. Only four are ever shown, sorted by `position`, which
 * is authored order across the concatenated packs — and this module is appended
 * last in `scripts/seed-authored-flows.ts`, so an `opener: true` here would
 * either do nothing or, if the module were moved earlier, silently unseat
 * attestation's or job search's. The hubs are reached by typing and by chips
 * instead, which is what the routing tests check.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/**
 * The service each cluster's callback belongs to.
 *
 * Four, because a relocating employee's paperwork is handled by four different
 * teams and the service is what decides which one the callback reaches: a
 * question about a degree certificate answered by the visa desk is a wasted call
 * for both sides. Most of the settling-in content is VISA, because residence,
 * Emirates ID and the medical are that team's work and they are what the
 * sequence hangs off.
 */
const VISA = "visa-processing";
const ATTEST = "attestation";
const TRANSLATE = "legal-translation";
const CV = "cv-resume";

/**
 * A money question's keyword groups: one price word, plus the subject's nouns.
 *
 * Lifted from ./higher-studies-notarisation.ts because it encodes a rule about
 * weights rather than a preference. `matchByKeywords` ranks an AND-group by its
 * LENGTH and ties go to the earlier candidate — and every other pack is
 * concatenated ahead of this one, so a money entry wins a price question only if
 * its group is strictly longer than whatever prose entry would otherwise answer
 * it.
 *
 * Two traps in choosing the subject nouns. `sameWord` folds two words sharing
 * five leading characters, so a group must never pair "relocation" with
 * "relocating". And it folds *nothing* below that: "move" and "moving" are
 * different words to the matcher, so a subject people phrase both ways needs a
 * group for each.
 *
 * The hubs are held to the opposite rule — at most two words — so a hub answers
 * a vague message and never intercepts a specific one.
 */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

export const RELOCATION_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "move-hub-start",
    question: "I am moving to the UAE for a job — what do I need to sort out?",
    answer:
      "The move has three parts that people tend to discover in the wrong order: what has to be done at home before you fly, the official chain that starts the day you land, and the ordinary business of living here — somewhere to stay, a bank account, a way to get to work, and family if they are coming. Which part is in front of you?",
    service: VISA,
    phrases: [
      "i am moving to the uae for a job",
      "i am relocating to dubai for work",
      "i accepted a job in dubai and i am moving there",
      "what do i need to do before i move to the uae for work",
      "i am shifting to abu dhabi for a job",
      "my relocation to the uae is confirmed",
    ],
    keywords: [["relocating", "work"], ["moving", "uae"], ["shifting", "dubai"]],
    faq: false,
    choices: [
      { label: "Before I fly", to: "move-hub-before" },
      { label: "Landing and first days", to: "move-hub-arrival" },
      { label: "Residence paperwork here", to: "move-hub-setup" },
      { label: "Somewhere to live", to: "move-hub-housing" },
      { label: "Bringing my family", to: "move-hub-family" },
    ],
    next: ["move-before-checklist", "move-arrival-first-week", "move-setup-order"],
  },
  {
    id: "move-hub-before",
    question: "What should I organise at home before I fly out?",
    answer:
      "A short list, and the first two items are the ones that cost people the most when they are left: certificates that need attesting in the country that issued them, and anything that needs your physical presence at home — a bank, a licence, a landlord, a notary. Everything else can be done from here. What shall we go through?",
    service: ATTEST,
    phrases: [
      "what should i organise at home before i fly out",
      "what to do before leaving my country for the uae",
      "preparations before relocating to dubai",
      "checklist before moving abroad for a job in the uae",
    ],
    keywords: [["before", "flying"], ["preparations", "relocating"]],
    faq: false,
    choices: [
      { label: "Documents to bring", to: "move-before-documents-list" },
      { label: "Attesting certificates first", to: "move-before-attest-at-home" },
      { label: "Shipping my things", to: "move-before-shipping" },
      { label: "My bank and taxes at home", to: "move-before-bank-home" },
      { label: "Pets", to: "move-before-pets" },
    ],
    next: ["move-before-checklist", "move-before-documents-list", "move-before-attest-at-home"],
  },
  {
    id: "move-hub-papers",
    question: "Which of my documents need work before a UAE employer can use them?",
    answer:
      "Three different things get called the same thing here, and the order matters: attestation of the certificate in the country that issued it, legalisation at the UAE mission and then the Ministry of Foreign Affairs, and legal translation into Arabic where the receiving body asks for it. Which document are you asking about?",
    service: ATTEST,
    phrases: [
      "which of my documents need work before a uae employer can use them",
      "what paperwork do my certificates need for a uae job",
      "do my documents need attesting for my new job in dubai",
    ],
    keywords: [["documents", "employer"], ["certificates", "attesting"]],
    faq: false,
    choices: [
      { label: "My degree", to: "move-papers-degree-attestation" },
      { label: "Marriage and birth certificates", to: "move-papers-marriage-birth" },
      { label: "The order of the steps", to: "move-papers-order-of-steps" },
      { label: "Arabic translation", to: "move-papers-translation" },
      { label: "I already have an apostille", to: "move-papers-apostille-not-enough" },
    ],
    next: ["move-papers-which-attested", "move-papers-degree-attestation", "move-papers-order-of-steps"],
  },
  {
    id: "move-hub-arrival",
    question: "What happens when I land in the UAE to start my job?",
    answer:
      "Less than people fear at the airport, and more than they expect in the fortnight after it. Landing itself is an entry permit, a passport queue and a biometric scan; the work begins the next morning with a medical, an Emirates ID application and a list of things you cannot open until that ID exists. What would you like to know?",
    service: VISA,
    phrases: [
      "what happens when i land in the uae to start my job",
      "what to expect at dubai airport when i arrive to work",
      "my first days after landing in the uae",
      "i land next week to start my job what do i do",
    ],
    keywords: [["landing", "airport"], ["first", "days"]],
    faq: false,
    choices: [
      { label: "At the airport", to: "move-arrival-what-to-expect" },
      { label: "What customs allows", to: "move-arrival-customs-limits" },
      { label: "A phone number", to: "move-arrival-sim-card" },
      { label: "My first week", to: "move-arrival-first-week" },
      { label: "Where to stay at first", to: "move-arrival-hotel-vs-flat" },
    ],
    next: ["move-arrival-what-to-expect", "move-arrival-first-week", "move-arrival-sim-card"],
  },
  {
    id: "move-hub-setup",
    question: "What is the order of the residence paperwork once I am here?",
    answer:
      "It is a chain, and each link needs the one before it, which is why it feels slow and why nothing can be jumped. Broadly: entry permit, medical fitness, Emirates ID application and biometrics, the residence permit itself, then the labour card — with your employer or its PRO filing most of it. Which link are you waiting on?",
    service: VISA,
    phrases: [
      "what is the order of the residence paperwork once i am here",
      "what happens after i arrive on my employment entry permit",
      "the steps between landing and getting my emirates id",
      "my residence process after arriving in dubai for work",
    ],
    keywords: [["order", "paperwork"], ["after", "arriving"]],
    faq: false,
    choices: [
      { label: "The order", to: "move-setup-order" },
      { label: "The medical", to: "move-setup-medical-when" },
      { label: "My Emirates ID", to: "move-setup-emirates-id-when" },
      { label: "Who files it", to: "move-setup-who-does-it" },
      { label: "Nothing is moving", to: "move-setup-stuck" },
    ],
    next: ["move-setup-order", "move-setup-emirates-id-when", "move-setup-who-does-it"],
  },
  {
    id: "move-hub-housing",
    question: "How do I find somewhere to live when I arrive?",
    answer:
      "Renting here works differently enough to catch most newcomers out: landlords commonly want the year in a small number of cheques, there is a security deposit and usually an agency commission, the tenancy is registered with the emirate, and the electricity and water account is opened in your name with a deposit of its own. So the first month costs more than a month. Where shall we start?",
    service: VISA,
    phrases: [
      "how do i find somewhere to live when i arrive",
      "renting a flat in dubai as a new arrival",
      "finding accommodation when i relocate to the uae",
      "how does renting work in the uae",
    ],
    keywords: [["renting", "flat"], ["finding", "accommodation"]],
    faq: false,
    choices: [
      { label: "Where to start", to: "move-housing-first-steps" },
      { label: "Cheques and deposits", to: "move-housing-rent-cheques" },
      { label: "Ejari and the contract", to: "move-housing-ejari" },
      { label: "Electricity and internet", to: "move-housing-dewa" },
      { label: "Avoiding a rental scam", to: "move-housing-rental-scam" },
    ],
    next: ["move-housing-first-steps", "move-housing-rent-cheques", "move-housing-moving-in-costs"],
  },
  {
    id: "move-hub-money",
    question: "How does money work for a new arrival in the UAE?",
    answer:
      "Salaries are paid into a UAE account through the Wages Protection System, so opening that account is one of the first things that happens once your Emirates ID is in hand — and the weeks before it are the ones to plan for, because set-up costs land before the first salary does. What would you like to go through?",
    service: VISA,
    phrases: [
      "how does money work for a new arrival in the uae",
      "banking and salary when i move to dubai",
      "what do i need to know about finances in the uae",
      "how will i get paid in the uae",
    ],
    keywords: [["banking", "salary"], ["finances", "arrival"]],
    faq: false,
    choices: [
      { label: "Opening a bank account", to: "move-money-bank-account" },
      { label: "How salary is paid", to: "move-money-salary-wps" },
      { label: "Sending money home", to: "move-money-transfer-home" },
      { label: "Tax and charges", to: "move-money-vat" },
      { label: "Budgeting the move", to: "move-money-budget" },
    ],
    next: ["move-money-bank-account", "move-money-salary-wps", "move-money-budget"],
  },
  {
    id: "move-hub-transport",
    question: "How will I get around once I move here?",
    answer:
      "Public transport is good in parts of Dubai and Abu Dhabi and thin elsewhere, so whether you need a car depends mostly on where you will live and work rather than on the city as a whole. The licence question is the one to settle early: some countries' licences can be exchanged without a test and others cannot, and the authority that issues the licence in your emirate is the only place that list is reliable. What shall we look at?",
    service: VISA,
    phrases: [
      "how will i get around once i move here",
      "do i need a car in dubai",
      "transport options for a new resident in the uae",
      "driving in the uae as a new arrival",
    ],
    keywords: [["driving", "licence"], ["transport", "resident"]],
    faq: false,
    choices: [
      { label: "My driving licence", to: "move-transport-driving-licence-exchange" },
      { label: "Buying or leasing a car", to: "move-transport-car-buy-or-lease" },
      { label: "Metro, bus and taxis", to: "move-transport-metro-nol" },
      { label: "Tolls, parking and fines", to: "move-transport-salik-parking-fines" },
    ],
    next: ["move-transport-driving-licence-exchange", "move-transport-metro-nol", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-hub-health",
    question: "How does healthcare work for me once I move to the UAE?",
    answer:
      "Your employer has to provide health cover for you — the requirement and who it extends to are set by the emirate's health authority, and the detail of your policy is what decides which hospitals and clinics you can use and what is excluded. The medical you take for your residence permit is a separate thing from that insurance, and people routinely confuse the two. What would you like to know?",
    service: VISA,
    phrases: [
      "how does healthcare work for me once i move to the uae",
      "health insurance when relocating to dubai",
      "seeing a doctor as a new resident in the uae",
      "medical care for expats in the uae",
    ],
    keywords: [["health", "insurance"], ["seeing", "doctor"]],
    faq: false,
    choices: [
      { label: "The insurance my employer gives me", to: "move-health-insurance-employer" },
      { label: "Cover for my family", to: "move-health-insurance-family" },
      { label: "My medication", to: "move-health-prescriptions" },
      { label: "A condition I already have", to: "move-health-chronic-condition" },
      { label: "In an emergency", to: "move-health-emergency-numbers" },
    ],
    next: ["move-health-insurance-employer", "move-health-prescriptions", "move-health-emergency-numbers"],
  },
  {
    id: "move-hub-family",
    question: "How do I bring my family with me to the UAE?",
    answer:
      "Two decisions sit underneath all the paperwork: whether they come with you or after you are settled, and whether a school place exists for the children at the point in the year you are moving. The sponsorship itself runs on your own residence permit being issued first, and on documents — marriage and birth certificates — that have to be attested before they count here. What shall we go through?",
    service: VISA,
    phrases: [
      "how do i bring my family with me to the uae",
      "relocating with my wife and children to dubai",
      "bringing my husband and kids when i move to the uae",
      "moving to dubai with family",
    ],
    keywords: [["bringing", "family"], ["relocating", "children"]],
    faq: false,
    choices: [
      { label: "Come together or later?", to: "move-family-when-to-bring" },
      { label: "What I need to sponsor them", to: "move-family-sponsor-requirements" },
      { label: "Schools", to: "move-family-schools-finding" },
      { label: "Can my spouse work?", to: "move-family-spouse-working" },
      { label: "A nanny or maid", to: "move-family-maid-nanny" },
    ],
    next: ["move-family-when-to-bring", "move-family-schools-finding", "move-family-spouse-working"],
  },
  {
    id: "move-hub-life",
    question: "What is daily life actually like for a newcomer in the UAE?",
    answer:
      "Easier than most people expect in practice and stricter than they expect in law, and the gap between those two is where newcomers get into trouble. Worth reading about before you arrive rather than after: behaviour in public, alcohol, what you post online, Ramadan, and the fact that there is no tolerance at all on drugs. What would you like to know?",
    service: VISA,
    phrases: [
      "what is daily life actually like for a newcomer in the uae",
      "what is it like living in dubai as an expat",
      "culture and customs i should know before moving to the uae",
      "adjusting to life in the uae",
    ],
    keywords: [["daily", "life"], ["culture", "customs"]],
    faq: false,
    choices: [
      { label: "What surprises people", to: "move-life-what-surprises" },
      { label: "The laws to know", to: "move-life-public-behaviour" },
      { label: "Alcohol", to: "move-life-alcohol" },
      { label: "Ramadan", to: "move-life-ramadan" },
      { label: "Making friends", to: "move-life-making-friends" },
    ],
    next: ["move-life-what-surprises", "move-life-public-behaviour", "move-life-making-friends"],
  },
  {
    id: "move-hub-work",
    question: "What should I expect in my first weeks at a UAE job?",
    answer:
      "Your contract is registered with the labour authority — MOHRE on the mainland, the free zone if you are inside one — and that registered contract, not the offer email, is the one that governs you. Leave, hours, probation, sick leave and end-of-service all sit in it, so reading it against the law rather than against the recruiter's description is the first thing worth doing. What shall we look at?",
    service: VISA,
    phrases: [
      "what should i expect in my first weeks at a uae job",
      "starting work in dubai what should i know",
      "my rights as a new employee in the uae",
      "first month at work in the uae",
    ],
    keywords: [["first", "weeks"], ["employee", "rights"]],
    faq: false,
    choices: [
      { label: "My registered contract", to: "move-work-contract-registration" },
      { label: "Probation", to: "move-work-probation-exposure" },
      { label: "Leave in my first year", to: "move-work-leave-first-year" },
      { label: "My first payslip", to: "move-work-first-payslip" },
      { label: "If I want to leave", to: "move-work-resign-soon" },
    ],
    next: ["move-work-contract-registration", "move-work-probation-exposure", "move-work-first-payslip"],
  },
  {
    id: "move-hub-trouble",
    question: "Something has gone wrong since I arrived — what do I do?",
    answer:
      "Most of what goes wrong in the first months has a specific place to take it rather than a general one, and going to the right one early matters more than anything else. Tell me which it is and I will point you at the authority that actually handles it — and say plainly where you need a lawyer rather than us.",
    service: VISA,
    phrases: [
      "something has gone wrong since i arrived",
      "i have a problem with my new employer in the uae",
      "my relocation has gone wrong",
      "i am in trouble after moving to dubai for work",
    ],
    keywords: [["gone", "wrong"], ["problem", "employer"]],
    faq: false,
    choices: [
      { label: "The job vanished", to: "move-trouble-offer-withdrawn-on-arrival" },
      { label: "I have not been paid", to: "move-trouble-salary-unpaid" },
      { label: "They have my passport", to: "move-trouble-passport-withheld" },
      { label: "The contract is not what I agreed", to: "move-trouble-contract-different" },
      { label: "A problem with my landlord", to: "move-trouble-rental-dispute" },
    ],
    next: ["move-trouble-salary-unpaid", "move-trouble-passport-withheld", "move-trouble-complaint-mohre"],
  },
  {
    id: "move-hub-us",
    question: "What can you actually help me with for my move?",
    answer:
      "We are an independent UAE jobs and guidance site, not a relocation agent and not a law firm. The guidance here is ours and it is free; where your move needs licensed work — attestation, legalisation, legal translation, visa and Emirates ID filing — we take your details and introduce you to a provider who is licensed to do it, and they quote you. What do you need?",
    service: VISA,
    phrases: [
      "what can you actually help me with for my move",
      "what do you do for people relocating to the uae",
      "can you handle my relocation",
      "are you a relocation company",
    ],
    keywords: [["help", "move"], ["relocation", "company"]],
    faq: false,
    choices: [
      { label: "My documents", to: "move-us-quote-documents" },
      { label: "My residence paperwork", to: "move-us-quote-visa" },
      { label: "Translation", to: "move-us-quote-translation" },
      { label: "Talk to a person", to: "move-us-talk-to-someone" },
      { label: "What you need from me", to: "move-us-what-we-need" },
    ],
    next: ["move-us-what-we-do", "move-us-what-we-need", "move-us-talk-to-someone"],
  },

  /* ── Before you fly ────────────────────────────────────────────────────── */
  /**
   * The cluster with the shortest shelf life for the reader: almost everything
   * here is only possible while they are still in the country that issued their
   * documents. That is why it leads, and why several of these answers say "do
   * this before you fly" in the first sentence rather than the last.
   */
  {
    id: "move-before-checklist",
    question: "What is on the list of things to do before I leave for the UAE?",
    answer:
      "Roughly in order of how badly it hurts to leave undone: get your certificates attested in the country that issued them, collect anything that needs you to be physically present at home, take certified copies and scans of everything, settle your notice and your references, decide what is shipping and what is coming in a suitcase, and arrange somewhere to stay for the first few weeks. Everything else can be done from here.",
    service: ATTEST,
    phrases: [
      "what is on the list of things to do before i leave for the uae",
      "to do list before moving to dubai",
      "what must i finish before i leave my country for the uae",
      "pre departure checklist for the uae",
    ],
    keywords: [["before", "leaving", "country"], ["departure", "checklist"]],
    next: ["move-before-documents-list", "move-before-attest-at-home", "move-before-shipping"],
  },
  {
    id: "move-before-documents-list",
    question: "Which documents should I bring with me to the UAE?",
    answer:
      "Originals of anything an employer, a landlord, a school or a government office here might ask to see: your passport, your degree and professional certificates, your marriage and your children's birth certificates if family are coming, your driving licence, employment and reference letters, vaccination and medical records, and your children's school reports and transfer certificate. Bring the originals even where a copy would do, because getting one sent afterwards is slow and sometimes impossible.",
    service: ATTEST,
    phrases: [
      "which documents should i bring with me to the uae",
      "what original documents do i need to carry when relocating to dubai",
      "papers to bring when moving to the uae for work",
      "what should be in my document folder when i fly to dubai",
    ],
    keywords: [["documents", "bring"], ["originals", "carry"], ["papers", "folder"]],
    next: ["move-before-attest-at-home", "move-papers-which-attested", "move-before-copies"],
  },
  {
    id: "move-before-attest-at-home",
    question: "Should I get my certificates attested before I leave my country?",
    answer:
      "Yes, and this is the single most useful thing on the list. The early steps of the chain happen in the country that issued the certificate — its own authorities, then the UAE mission there — and doing them from the UAE afterwards means couriering originals back, often through a relative or an agent you cannot supervise. If your degree is likely to be asked for, start it before you fly even if nobody has asked yet.",
    service: ATTEST,
    phrases: [
      "should i get my certificates attested before i leave my country",
      "is it better to attest my degree at home or in the uae",
      "can i do attestation after i arrive in dubai instead",
      "where should attestation start if i am still in my home country",
    ],
    keywords: [["attest", "before", "leaving"], ["attestation", "home", "country"]],
    next: ["move-papers-degree-attestation", "move-papers-order-of-steps", "move-papers-attest-after-arrival"],
  },
  {
    id: "move-before-police-clearance",
    question: "Will I need a police clearance certificate from my home country?",
    answer:
      "Some roles and some authorities ask for one and many do not, and whether yours will is a question for the employer and the authority handling your permit rather than for us. What is worth knowing is that it is far easier to obtain while you are still in the country, and that it usually has to be attested like any other certificate — so if there is a chance it will be wanted, get it before you fly.",
    service: ATTEST,
    phrases: [
      "will i need a police clearance certificate from my home country",
      "do i need a good conduct certificate for a uae job",
      "police clearance for working in dubai",
      "is a criminal record check needed to move to the uae",
    ],
    keywords: [["police", "clearance"], ["conduct", "certificate"], ["criminal", "record", "check"]],
    next: ["move-papers-which-attested", "move-before-documents-list", "move-before-checklist"],
  },
  {
    id: "move-before-passport-validity",
    question: "How much validity does my passport need before I move?",
    answer:
      "More than you think, because the residence permit is issued into the passport and the authority will not issue one against a passport that is about to run out. Renewing it at home before you fly is far simpler than renewing it here through your consulate mid-process, and if you do renew, keep the old passport — the entry stamps and any previous UAE visa live in it. The specific validity required is set by the authority, so have the employer confirm it.",
    service: VISA,
    phrases: [
      "how much validity does my passport need before i move",
      "does my passport need to be valid for long to get a uae residence visa",
      "should i renew my passport before relocating to dubai",
      "my passport expires soon and i am moving to the uae",
    ],
    keywords: [["passport", "validity"], ["renew", "passport", "before"]],
    next: ["move-before-documents-list", "move-setup-order", "move-before-checklist"],
  },
  {
    id: "move-before-medical-records",
    question: "Should I bring my medical records and vaccination history?",
    answer:
      "Yes — bring them in English if your country issues them in another language, and bring your children's vaccination cards in particular, because schools here ask for the immunisation history at admission and reconstructing it later is a nuisance. Also bring a written summary from your doctor of anything ongoing, including the generic names of your medicines rather than the brand names you are used to.",
    service: VISA,
    phrases: [
      "should i bring my medical records and vaccination history",
      "do i need my vaccination card when moving to the uae",
      "bringing health records to dubai",
      "my child's immunisation records for a uae school",
    ],
    keywords: [["medical", "records"], ["vaccination", "history"], ["immunisation", "records"]],
    next: ["move-before-medicines", "move-health-chronic-condition", "move-family-school-admission-docs"],
  },
  {
    id: "move-before-medicines",
    question: "Can I bring my prescription medicines into the UAE?",
    answer:
      "Carefully, and after checking. Some medicines sold freely elsewhere are controlled here, including certain painkillers, sleeping tablets, psychiatric medication and anything containing cannabidiol, and bringing a controlled one without the required prior approval is treated as a serious matter rather than an oversight. MOHAP publishes the classified lists and the approval route — check your medicines against it before you fly, and carry the original prescription and a doctor's letter.",
    service: VISA,
    phrases: [
      "can i bring my prescription medicines into the uae",
      "are my tablets legal in dubai",
      "controlled medication rules for entering the uae",
      "can i carry my antidepressants to dubai",
      "is cbd allowed in the uae",
    ],
    keywords: [["prescription", "medicines"], ["controlled", "medication"], ["tablets", "legal"]],
    next: ["move-arrival-customs-limits", "move-health-prescriptions", "move-life-drugs-zero-tolerance"],
  },
  {
    id: "move-before-driving-licence",
    question: "Should I bring my driving licence and an international permit?",
    answer:
      "Bring the licence itself, and bring it even if it is expiring, because the exchange process here is based on the licence you hold at home. An international driving permit is useful for the visitor period before your residence is issued, but it stops being the thing you drive on once you are a resident. Whether your national licence can be exchanged without a test is decided by the licensing authority in your emirate.",
    service: VISA,
    phrases: [
      "should i bring my driving licence and an international permit",
      "do i need an international driving permit for the uae",
      "bringing my home country licence when i relocate to dubai",
      "can i drive in the uae on my own licence when i first arrive",
    ],
    keywords: [["international", "driving", "permit"], ["bring", "licence"]],
    next: ["move-transport-driving-licence-exchange", "move-transport-driving-test", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-before-notice-period",
    question: "How do I handle my notice period and references back home?",
    answer:
      "Leave on good terms even if the job was bad, because references here are checked more often than people expect and the UAE employer may ask for a letter rather than a phone call. Get the experience letter, the relieving letter and the salary certificate in writing before your last day, on company letterhead and signed — asking for them six months later, from another country, is a different task. Do not resign anywhere until your entry permit is actually issued.",
    service: VISA,
    phrases: [
      "how do i handle my notice period and references back home",
      "when should i resign from my current job before moving to dubai",
      "what letters should i get from my old employer before relocating",
      "should i quit before my uae visa is confirmed",
    ],
    keywords: [["notice", "resign", "before"], ["experience", "letter", "employer"]],
    next: ["move-papers-experience-letters", "move-before-checklist", "move-work-contract-registration"],
  },
  {
    id: "move-before-bank-home",
    question: "Should I keep my bank account at home open when I move?",
    answer:
      "Most people keep at least one open, because closing it is easy and reopening it from abroad is not, and because you will want somewhere to send money. Tell the bank you are moving before you go rather than after — an account that suddenly starts being used from the Gulf gets frozen for exactly the reasons you would want it to be. Also check whether your address change affects any card, loan or standing order you are leaving behind.",
    service: VISA,
    phrases: [
      "should i keep my bank account at home open when i move",
      "do i need to close my bank account before relocating to the uae",
      "what should i tell my bank before moving to dubai",
      "keeping my home country account while living in the uae",
    ],
    keywords: [["bank", "account", "home"], ["close", "account", "before"]],
    next: ["move-money-bank-account", "move-money-transfer-home", "move-before-tax-home"],
  },
  {
    id: "move-before-tax-home",
    question: "What happens to my tax position at home when I move to the UAE?",
    answer:
      "That depends entirely on your own country's rules on residence and on any treaty it has with the UAE, and it is genuinely the one thing on this list worth paying a professional at home to answer before you leave. Some countries stop taxing you once you are non-resident, some keep taxing their citizens wherever they live, and the paperwork that establishes which applies to you is usually easier to file before you go. We are not tax advisers and will not guess at yours.",
    service: VISA,
    phrases: [
      "what happens to my tax position at home when i move to the uae",
      "will i still pay tax in my country if i work in dubai",
      "do i need to tell my tax office i am moving to the uae",
      "tax residency when relocating to the uae",
    ],
    keywords: [["tax", "residency", "moving"], ["taxed", "home", "country"]],
    next: ["move-money-vat", "move-before-bank-home", "move-money-pension-home"],
  },
  {
    id: "move-before-shipping",
    question: "Is it worth shipping my things or should I start again here?",
    answer:
      "The arithmetic usually favours bringing less than people want to. Sea freight is slower and cheaper and makes sense for a household; air freight for a few boxes; and furniture that fits a home at home often does not fit a flat here, which may be smaller, already fitted, or rented furnished. Whatever you ship, keep an inventory, insure it, and remember that customs may inspect — anything prohibited in the UAE should not be in the container.",
    service: VISA,
    phrases: [
      "is it worth shipping my things or should i start again here",
      "should i ship my furniture to dubai",
      "sea freight or air freight when relocating to the uae",
      "moving my household goods to the uae",
    ],
    keywords: [["shipping", "furniture"], ["freight", "household"], ["ship", "belongings"]],
    next: ["move-before-prohibited-items", "move-housing-furnished", "move-before-car"],
  },
  {
    id: "move-before-prohibited-items",
    question: "What should I not pack when moving to the UAE?",
    answer:
      "Anything on the prohibited and restricted lists Federal Customs publishes, and the list is wider than most people assume: narcotics of every kind and anything containing them, certain e-cigarette liquids, some medicines without approval, materials considered offensive to religion, gambling equipment, certain weapons and replicas, and ivory or protected animal products. Check the current list rather than a forum post, because an item in a shipping container is still your item.",
    service: VISA,
    phrases: [
      "what should i not pack when moving to the uae",
      "prohibited items in the uae",
      "what is banned from being brought into dubai",
      "restricted goods when shipping to the uae",
    ],
    keywords: [["prohibited", "items"], ["banned", "brought"], ["restricted", "goods"]],
    next: ["move-arrival-customs-limits", "move-before-medicines", "move-before-shipping"],
  },
  {
    id: "move-before-pets",
    question: "Can I bring my cat or dog with me to the UAE?",
    answer:
      "Usually yes, with planning: an import permit from the Ministry of Climate Change and Environment, a microchip, up-to-date vaccinations including rabies, blood tests in some cases, and a government health certificate issued close to travel. Some breeds are not permitted and some airlines will not carry animals in summer heat at all. Start several months out, because the permit depends on test timings you cannot compress.",
    service: VISA,
    phrases: [
      "can i bring my cat or dog with me to the uae",
      "relocating with pets to dubai",
      "importing a dog into the uae",
      "pet relocation to abu dhabi",
    ],
    keywords: [["bring", "pets"], ["importing", "animal"], ["relocation", "pets"]],
    next: ["move-family-pets-arriving", "move-before-shipping", "move-housing-first-steps"],
  },
  {
    id: "move-before-car",
    question: "Should I ship my car to the UAE?",
    answer:
      "Rarely worth it. An imported car has to clear customs and then meet the registration and specification rules of the licensing authority here, right-hand-drive vehicles are not registrable, and cars that were not built for Gulf conditions suffer in the heat and are harder to service and resell. Most people sell at home and buy or lease here instead — the used market is large and finance is available once you have residence.",
    service: VISA,
    phrases: [
      "should i ship my car to the uae",
      "can i import my car to dubai when i move",
      "bringing a vehicle to the uae",
      "is it worth importing a car to the uae",
    ],
    keywords: [["ship", "import", "vehicle"], ["importing", "vehicle"]],
    next: ["move-transport-car-buy-or-lease", "move-before-shipping", "move-transport-car-insurance"],
  },
  {
    id: "move-before-packing",
    question: "What should I actually pack for life in the UAE?",
    answer:
      "Lighter and more conservative than you would pack for a beach holiday. It is hot for a long stretch of the year and air-conditioned indoors to the point of being cold, so breathable clothes plus one layer for offices and malls; shoulders and knees covered for government offices, mosques and some malls; modest swimwear for pools and beaches rather than the street. Winter evenings are genuinely cool, so bring one warm thing.",
    service: VISA,
    phrases: [
      "what should i actually pack for life in the uae",
      "what clothes should i bring to dubai",
      "how should i dress when i move to the uae",
      "packing for a move to abu dhabi",
    ],
    keywords: [["pack", "clothes"], ["clothes", "bring"]],
    next: ["move-life-dress-code", "move-life-summer-heat", "move-before-checklist"],
  },
  {
    id: "move-before-cash",
    question: "How much money should I bring with me when I land?",
    answer:
      "Enough to live on for longer than you expect to need it, because your first salary may be weeks away and the set-up costs — a deposit, agency commission, utilities, a bed — land before it. Bring it in a form you can actually use: a card that works abroad plus some cash, and remember that Federal Customs requires cash and bearer instruments above a published threshold to be declared on arrival, so check the current figure and declare if you are near it.",
    service: VISA,
    phrases: [
      "how much money should i bring with me when i land",
      "how much cash should i carry to dubai",
      "do i have to declare cash at uae customs",
      "what funds should i have when i arrive in the uae",
    ],
    keywords: [["cash", "declare", "customs"], ["funds", "arrive"], ["carry", "cash"]],
    next: ["move-money-setup-costs", "move-arrival-customs-limits", "move-money-bank-account"],
  },
  {
    id: "move-before-flight-ticket",
    question: "Who pays for my flight out and my family's?",
    answer:
      "It depends on what the contract says, and it is worth settling in writing before you accept rather than assuming. Many employers pay the joining flight for the employee and some pay for the family; an annual ticket home may or may not be in the package, and whether it is cash or a booked flight differs. Read the clause, and if it is silent, ask — a verbal promise about tickets is one of the commonest things to evaporate.",
    service: VISA,
    phrases: [
      "who pays for my flight out and my family's",
      "does the employer pay my relocation flight to dubai",
      "is my joining ticket to the uae paid for",
      "who pays the annual flight home in a uae job",
    ],
    keywords: [["flight", "employer", "pays"], ["joining", "ticket"], ["annual", "ticket", "home"]],
    next: ["move-work-leave-first-year", "move-before-checklist", "move-money-setup-costs"],
  },
  {
    id: "move-before-first-accommodation",
    question: "Where should I stay for the first few weeks?",
    answer:
      "Somewhere temporary, on purpose. A hotel apartment, a serviced flat or a short let gives you the weeks you need to see neighbourhoods, learn the commute and get the Emirates ID that most landlords and utilities will want — and it stops you signing a year's tenancy on an area you have only seen in photographs. Ask the employer whether temporary accommodation is part of the package before you book your own.",
    service: VISA,
    phrases: [
      "where should i stay for the first few weeks",
      "temporary accommodation when i arrive in dubai",
      "should i book a hotel apartment before i find a flat in the uae",
      "short term stay for a new arrival in the uae",
    ],
    keywords: [["temporary", "accommodation"], ["hotel", "apartment", "first"], ["short", "term", "stay"]],
    next: ["move-arrival-hotel-vs-flat", "move-housing-first-steps", "move-housing-short-term"],
  },
  {
    id: "move-before-family-timing",
    question: "Should I go ahead alone first and bring my family later?",
    answer:
      "Most people do, and not for romantic reasons: you cannot sponsor anyone until your own residence permit is issued, and you cannot usefully choose a home or a school until you have seen the place. Going a month or two ahead lets you do both properly. Against that, two households cost more than one and the separation is harder than it sounds, so set a date and work towards it rather than leaving it open.",
    service: VISA,
    phrases: [
      "should i go ahead alone first and bring my family later",
      "is it better to relocate alone and have family follow",
      "when should my wife and children join me in dubai",
      "do my family have to arrive with me in the uae",
    ],
    keywords: [["alone", "family", "later"], ["family", "follow"], ["wife", "children", "join"]],
    next: ["move-family-when-to-bring", "move-family-sponsor-requirements", "move-family-school-mid-year"],
  },
  {
    id: "move-before-school-timing",
    question: "How far ahead do I need to think about schools?",
    answer:
      "Earlier than everything else on your list. Popular schools fill well ahead of the academic year, admission usually involves an assessment, and the paperwork includes an attested birth certificate and a transfer certificate from the current school — which has to be requested while your child is still enrolled there. If children are coming, start the school search before you start the flat search.",
    service: VISA,
    phrases: [
      "how far ahead do i need to think about schools",
      "when should i start applying to schools in dubai",
      "school admission timing when relocating to the uae",
      "is it hard to get a school place in the uae",
    ],
    keywords: [["school", "admission", "timing"], ["applying", "schools"], ["school", "place"]],
    next: ["move-family-schools-finding", "move-family-school-admission-docs", "move-family-school-mid-year"],
  },
  {
    id: "move-before-insurance-gap",
    question: "Am I covered for health before my employer's insurance starts?",
    answer:
      "Assume not, and buy travel or expatriate cover for the gap. Your employer's policy generally begins once you are on their books and the paperwork is done, and the days between landing and that point are exactly when a new arrival falls ill from the heat, the water or the flight. Treatment here is good and is charged accordingly, so a short policy for the first weeks is cheap insurance against a bad month.",
    service: VISA,
    phrases: [
      "am i covered for health before my employer's insurance starts",
      "do i need travel insurance when i first arrive in the uae",
      "insurance gap between landing and employer cover in dubai",
      "what if i get sick before my uae health insurance begins",
    ],
    keywords: [["travel", "insurance", "arrive"], ["insurance", "starts"], ["covered", "before", "employer"]],
    next: ["move-health-insurance-employer", "move-health-emergency-numbers", "move-arrival-first-week"],
  },
  {
    id: "move-before-copies",
    question: "What copies and scans should I make before I travel?",
    answer:
      "Scan everything you are carrying and keep it somewhere you can reach without your luggage: passport, visa or entry permit, certificates, licences, marriage and birth certificates, insurance, and the offer and contract. Take a set of printed photocopies as well, and leave a copy with someone you trust at home. People lose documents in the first fortnight more than at any other time, because they are carrying all of them around at once.",
    service: VISA,
    phrases: [
      "what copies and scans should i make before i travel",
      "should i scan my documents before moving abroad",
      "keeping copies of my papers when i relocate to the uae",
      "backup of my documents for a move to dubai",
    ],
    keywords: [["copies", "scans"], ["scan", "documents", "before"]],
    next: ["move-before-documents-list", "move-trouble-lost-documents", "move-before-checklist"],
  },
  {
    id: "move-before-electronics",
    question: "Will my phone and electronics work in the UAE?",
    answer:
      "Mostly. The mains supply and the plug type here are the British-style three-pin, so bring adapters rather than new appliances. Make sure your phone is unlocked before you leave, because a locked handset is a problem you cannot solve from here, and check that any smart device you depend on works with UAE networks. Some apps and voice-calling services are restricted here, so do not plan your contact with home around one of them.",
    service: VISA,
    phrases: [
      "will my phone and electronics work in the uae",
      "what plug type does the uae use",
      "should i unlock my phone before moving to dubai",
      "do voip apps work in the uae",
    ],
    keywords: [["plug", "adapters"], ["unlock", "phone"], ["voip", "apps", "restricted"]],
    next: ["move-arrival-sim-card", "move-housing-internet", "move-before-packing"],
  },
  {
    id: "move-before-keep-home-number",
    question: "Should I keep my home country mobile number?",
    answer:
      "Keep it alive for a while if you can, even on the cheapest plan. Banks, tax offices and government portals at home send one-time codes to the number they have, and losing that number mid-move locks you out of exactly the accounts you still need. Once everything that matters has your UAE number, you can let it go.",
    service: VISA,
    phrases: [
      "should i keep my home country mobile number",
      "do i need my old sim after moving to the uae",
      "will i lose access to my bank if i change my number when i relocate",
      "keeping my old phone number when i move to dubai",
    ],
    keywords: [["keep", "mobile", "number"], ["codes", "number", "bank"]],
    next: ["move-arrival-sim-card", "move-before-bank-home", "move-money-transfer-home"],
  },

  /* ── The documents the move needs ──────────────────────────────────────── */
  /**
   * The narrow overlap with the attestation and translation packs, and the line
   * between them: those packs answer what attestation *is* and what it costs for
   * any document. These answer which of a relocating employee's documents need
   * it, in what order, and what to do when one of them is wrong — the questions
   * that only make sense while somebody is packing.
   */
  {
    id: "move-papers-which-attested",
    question: "Which of my certificates will actually need attesting for my move?",
    answer:
      "In practice: your highest degree, because the labour authority and many employers want it verified; your marriage certificate and your children's birth certificates if you are sponsoring family; a transfer certificate for a child changing school; and any professional qualification a regulator here licenses you against. Ordinary things — reference letters, payslips, a CV — are not attested. Ask the employer which of them it will file, because that changes what you have to chase.",
    service: ATTEST,
    phrases: [
      "which of my certificates will actually need attesting for my move",
      "what documents need attestation when relocating to the uae for a job",
      "do all my papers need to be attested to move to dubai",
      "which certificates does a uae employer want verified",
    ],
    keywords: [["certificates", "need", "attesting"], ["documents", "need", "attestation"]],
    next: ["move-papers-degree-attestation", "move-papers-marriage-birth", "move-papers-order-of-steps"],
  },
  {
    id: "move-papers-degree-attestation",
    question: "Does my degree need attesting before I start work in the UAE?",
    answer:
      "If the role is one the labour authority treats as requiring a qualification, or the employer asks for it, then yes — and the chain starts in the country that issued the degree, which is why it is worth beginning before you fly. It is a sequence of authorities rather than one office, and a step taken out of order usually has to be paid for twice. We are not a licensed provider ourselves; we take your details and a licensed one handles the chain.",
    service: ATTEST,
    phrases: [
      "does my degree need attesting before i start work in the uae",
      "my new employer in dubai wants my degree attested",
      "degree verification for a uae work permit",
      "do i need my university certificate attested to work in dubai",
    ],
    keywords: [["degree", "attested", "employer"], ["degree", "verification", "permit"]],
    next: ["move-papers-order-of-steps", "move-papers-equivalency", "move-before-attest-at-home"],
  },
  {
    id: "move-papers-order-of-steps",
    question: "What order do the document steps go in for a move to the UAE?",
    answer:
      "Broadly: the issuing authority or a notary in the country of issue, then that country's foreign ministry, then the UAE embassy or consulate there, then the UAE Ministry of Foreign Affairs once the document is here, and legal translation into Arabic where the receiving body requires it. The names and the number of stops differ by country, which is exactly why a provider quotes per case. Doing it in the right order the first time is the only real saving available.",
    service: ATTEST,
    phrases: [
      "what order do the document steps go in for a move to the uae",
      "sequence of attestation steps for my relocation documents",
      "which comes first embassy or ministry of foreign affairs",
      "the steps my certificate goes through before it is valid in the uae",
    ],
    keywords: [["order", "steps", "attestation"], ["sequence", "embassy", "ministry"]],
    next: ["move-papers-degree-attestation", "move-papers-apostille-not-enough", "move-papers-translation"],
  },
  {
    id: "move-papers-apostille-not-enough",
    question: "I already have an apostille on my degree — is that enough for the UAE?",
    answer:
      "No, and this is the mistake that costs relocating people the most money. The UAE is not a party to the Hague Apostille Convention, so an apostille obtained at home does not make a document usable here and no apostille is issued on a UAE document either — the full legalisation route through the UAE mission and the Ministry of Foreign Affairs still applies. If an agent abroad sold you an apostille and said the job was finished, it was not.",
    service: ATTEST,
    phrases: [
      "i already have an apostille on my degree is that enough for the uae",
      "does the uae accept an apostille",
      "is an apostilled certificate valid in dubai",
      "i got an apostille at home do i still need legalisation for the uae",
    ],
    keywords: [["apostille", "enough", "uae"], ["apostille", "accepted"], ["apostilled", "valid"]],
    next: ["move-papers-order-of-steps", "move-papers-degree-attestation", "move-papers-which-attested"],
  },
  {
    id: "move-papers-marriage-birth",
    question: "Do my marriage and children's birth certificates need attesting?",
    answer:
      "Yes, if you intend to sponsor your family — the relationship has to be proved with documents the authority here recognises, which means the same legalisation chain as any other certificate, plus legal translation into Arabic where it is required. Start them at the same time as your own documents rather than after you arrive, because they are the usual reason a family application waits months after the employee's own residence is done.",
    service: ATTEST,
    phrases: [
      "do my marriage and children's birth certificates need attesting",
      "attestation of marriage certificate for a uae family visa",
      "birth certificate attestation to bring my child to dubai",
      "what do i need to prove my family relationship in the uae",
    ],
    keywords: [["marriage", "birth", "attesting"], ["prove", "relationship", "family"]],
    next: ["move-family-documents", "move-family-sponsor-requirements", "move-papers-translation"],
  },
  {
    id: "move-papers-translation",
    question: "Will my documents need translating into Arabic for my move?",
    answer:
      "Some of them, and only where the body receiving them asks — courts, some government departments and some schools and regulators do, and a great deal of ordinary business here is conducted in English. Where translation is required it has to be done by a translator licensed by the Ministry of Justice, not by you or by software, and it is usually done after the legalisation so that the stamps are translated too.",
    service: TRANSLATE,
    phrases: [
      "will my documents need translating into arabic for my move",
      "do my certificates have to be in arabic for the uae",
      "legal translation of my relocation documents",
      "who can translate my papers for uae authorities",
    ],
    keywords: [["translating", "arabic", "documents"], ["translator", "licensed", "ministry"]],
    next: ["move-papers-order-of-steps", "move-us-quote-translation", "move-papers-which-attested"],
  },
  {
    id: "move-papers-name-mismatch",
    question: "My name is written differently on my passport and my degree — is that a problem?",
    answer:
      "It can be, because the authorities match documents to each other rather than to you, and a missing middle name or a different spelling is enough for a file to be queried. Fix it at the source where you can — an affidavit, a corrected certificate or a deed poll from the issuing country — and do it before the legalisation chain starts, since correcting it afterwards means repeating steps you have already paid for.",
    service: ATTEST,
    phrases: [
      "my name is written differently on my passport and my degree",
      "name mismatch between my certificate and passport for the uae",
      "my spelling is different on my documents",
      "does a different name on my degree matter for a uae visa",
    ],
    keywords: [["name", "mismatch", "passport"], ["spelling", "different", "documents"]],
    next: ["move-papers-order-of-steps", "move-papers-degree-attestation", "move-setup-stuck"],
  },
  {
    id: "move-papers-lost-original",
    question: "What if I have lost the original of a certificate I need?",
    answer:
      "A photocopy, however clear, cannot be legalised — the chain works on an original or on a replacement issued by the body that issued the first one. So the task is to get a duplicate from the university, school or registry at home, which is usually possible and usually slow, and is far easier to arrange while you are still in the country. Start it as soon as you know it is missing rather than when it is asked for.",
    service: ATTEST,
    phrases: [
      "what if i have lost the original of a certificate i need",
      "i cannot find my degree certificate and i am moving to dubai",
      "can a photocopy be attested for the uae",
      "replacing a lost certificate for my uae job",
    ],
    keywords: [["lost", "original", "certificate"], ["photocopy", "attested"], ["duplicate", "certificate"]],
    next: ["move-papers-degree-attestation", "move-before-attest-at-home", "move-papers-which-attested"],
  },
  {
    id: "move-papers-equivalency",
    question: "Will my qualification be recognised as equivalent in the UAE?",
    answer:
      "Equivalency is a separate process from attestation and is handled by the Ministry of Education, and it matters mainly if you are entering a regulated profession, continuing your studies here, or in a role where the authority checks the level of the qualification rather than its existence. Whether yours needs it is a question for the employer or the regulator — the criteria are theirs and they change, so we would not state them for you.",
    service: ATTEST,
    phrases: [
      "will my qualification be recognised as equivalent in the uae",
      "do i need equivalency for my degree in dubai",
      "ministry of education equivalency when moving for work",
      "is my foreign degree recognised in the uae",
    ],
    keywords: [["equivalency", "degree"], ["qualification", "recognised"]],
    next: ["move-papers-degree-attestation", "move-papers-professional-licence", "move-papers-order-of-steps"],
  },
  {
    id: "move-papers-professional-licence",
    question: "Do I need a professional licence as well as a work permit?",
    answer:
      "In regulated fields, yes, and it is a separate application to a separate body: health professionals are licensed by the health authority of the emirate or by MOHAP, engineers and some technical roles by the municipality or the relevant society, teachers and lawyers by their own regulators. Each sets its own evidence, exams and timing, so ask your employer which regulator applies to your title and start it early — a work permit without the licence does not let you practise.",
    service: ATTEST,
    phrases: [
      "do i need a professional licence as well as a work permit",
      "licensing for doctors and nurses moving to the uae",
      "do engineers need to register when relocating to dubai",
      "professional registration in the uae for my job",
    ],
    keywords: [["professional", "licence", "permit"], ["licensing", "nurses", "doctors"], ["professional", "registration"]],
    next: ["move-papers-equivalency", "move-papers-degree-attestation", "move-work-contract-registration"],
  },
  {
    id: "move-papers-school-transfer-certificate",
    question: "What is a transfer certificate and does my child need one?",
    answer:
      "It is a letter from the school your child is leaving, confirming the year completed, and schools here generally ask for it at admission — along with recent reports, the attested birth certificate and the immunisation record. Request it before you withdraw your child rather than after, because a school that no longer has your child on its roll is much slower to produce one, and in some countries it has to be attested as well.",
    service: ATTEST,
    phrases: [
      "what is a transfer certificate and does my child need one",
      "school leaving certificate for admission in dubai",
      "do uae schools need a transfer certificate from the old school",
      "paperwork from my child's current school before moving to the uae",
    ],
    keywords: [["transfer", "certificate", "school"], ["leaving", "certificate", "admission"]],
    next: ["move-family-school-admission-docs", "move-family-schools-finding", "move-papers-marriage-birth"],
  },
  {
    id: "move-papers-experience-letters",
    question: "Do my experience and salary letters need to be attested too?",
    answer:
      "Usually not for an ordinary job, but get them anyway and get them properly: on letterhead, signed, dated and stating your title, dates and duties. They are asked for in background checks, in professional licensing, and occasionally by a bank assessing you for credit. If a regulator or a golden visa application asks for them, attestation may then be required — which is another reason to collect them before you leave rather than to chase them later.",
    service: ATTEST,
    phrases: [
      "do my experience and salary letters need to be attested too",
      "does my employment letter need attestation for the uae",
      "what should my experience letter say for a uae employer",
      "reference letters when relocating to dubai",
    ],
    keywords: [["experience", "letter", "attested"], ["employment", "letter", "attestation"]],
    next: ["move-before-notice-period", "move-papers-which-attested", "move-money-bank-account"],
  },
  {
    id: "move-papers-attest-after-arrival",
    question: "Can my documents be attested after I have already arrived?",
    answer:
      "The UAE-side steps can, and routinely are. The problem is the steps that must happen in the issuing country: those need the original there, which means couriering it out of your hands and back, with the risk and the delay that implies. It is doable — people do it every week — but it is the avoidable version of the task, and it is slower exactly when your employer is waiting.",
    service: ATTEST,
    phrases: [
      "can my documents be attested after i have already arrived",
      "i am in dubai and my degree is not attested",
      "attesting certificates once i am already in the uae",
      "my documents are still at home and i have started my job",
    ],
    keywords: [["attested", "already", "arrived"], ["documents", "still", "home"]],
    next: ["move-papers-order-of-steps", "move-us-quote-documents", "move-papers-degree-attestation"],
  },
  {
    id: "move-papers-employer-keeps-originals",
    question: "My employer wants to keep my original certificates — is that normal?",
    answer:
      "They legitimately need them during the permit and attestation steps, and handing them over for that is ordinary. Keeping them indefinitely is not: ask for them back once the filing is done, and in the meantime get a signed acknowledgement listing exactly what they hold. If originals are kept against your wishes, that is a matter for the labour authority — MOHRE on the mainland or your free zone — rather than something to argue about alone.",
    service: VISA,
    phrases: [
      "my employer wants to keep my original certificates",
      "should i give my original documents to my company in dubai",
      "is my employer allowed to hold my degree certificate",
      "company is keeping my original papers in the uae",
    ],
    keywords: [["employer", "keep", "originals"], ["company", "holding", "certificates"]],
    next: ["move-trouble-passport-withheld", "move-papers-which-attested", "move-trouble-complaint-mohre"],
  },

  /* ── Landing and the first days ─────────────────────────────────────────── */
  {
    id: "move-arrival-what-to-expect",
    question: "What happens at the airport when I arrive on an employment entry permit?",
    answer:
      "Ordinary things: you queue at passport control, the officer finds the entry permit against your passport, your eyes or face and fingerprints are captured, and you collect your bags and walk through customs. Have the permit reachable on your phone and printed, know the name and address of where you are staying, and be able to say who your employer is. It is a short process when your paperwork is in order.",
    service: VISA,
    phrases: [
      "what happens at the airport when i arrive on an employment entry permit",
      "what to expect at immigration in dubai when i arrive for work",
      "passport control when landing in the uae for a job",
      "will immigration ask me questions when i arrive in dubai",
    ],
    keywords: [["airport", "immigration", "arrive"], ["passport", "control", "landing"]],
    next: ["move-arrival-entry-permit-print", "move-arrival-customs-limits", "move-arrival-first-week"],
  },
  {
    id: "move-arrival-entry-permit-print",
    question: "Do I need to print my entry permit before I fly?",
    answer:
      "Print it, and keep a copy on your phone as well. Airlines at the departure gate sometimes want to see it before they will board you, and a printed copy costs nothing while a dead phone battery at check-in is a missed flight. Check the name, passport number and validity on it against your passport before you travel — a typing error is far easier to fix before you are in the air.",
    service: VISA,
    phrases: [
      "do i need to print my entry permit before i fly",
      "should i carry a printed copy of my uae visa",
      "does the airline check my entry permit for the uae",
      "what do i show at check in for my uae employment visa",
    ],
    keywords: [["print", "entry", "permit"], ["airline", "check", "permit"]],
    next: ["move-arrival-what-to-expect", "move-arrival-entry-permit-expiring", "move-before-copies"],
  },
  {
    id: "move-arrival-entry-permit-expiring",
    question: "My entry permit is about to expire and I have not flown yet — what now?",
    answer:
      "Tell your employer immediately, because the permit has a window to enter on and it is the employer or its PRO who deals with the authority about it. Do not fly on the assumption it will be fine at the gate. Depending on the case it may be extendable or may have to be reissued, and both are the authority's decision — ICP or the relevant GDRFA — not something to work around.",
    service: VISA,
    phrases: [
      "my entry permit is about to expire and i have not flown yet",
      "my uae employment entry permit expired before i travelled",
      "what if i cannot travel before my entry permit runs out",
      "can my entry permit for dubai be extended",
    ],
    keywords: [["entry", "permit", "expiring"], ["cannot", "travel", "permit"]],
    next: ["move-setup-stuck", "move-arrival-entry-permit-print", "move-trouble-offer-withdrawn-on-arrival"],
  },
  {
    id: "move-arrival-customs-limits",
    question: "What am I allowed to bring through UAE customs?",
    answer:
      "Your personal effects, and the allowances Federal Customs publishes for things like cigarettes, gifts and — for arriving non-Muslim adults — a limited quantity of alcohol into those emirates that permit it. What matters more is the prohibited list: narcotics of any kind, controlled medicines without approval, certain vape liquids, offensive material, and some weapons and replicas. The allowances change, so check the current ones rather than relying on what a colleague remembers.",
    service: VISA,
    phrases: [
      "what am i allowed to bring through uae customs",
      "customs allowance when entering dubai",
      "can i bring alcohol into the uae on arrival",
      "what will customs stop at a uae airport",
    ],
    keywords: [["customs", "allowance"], ["bring", "through", "customs"]],
    next: ["move-before-prohibited-items", "move-before-medicines", "move-life-alcohol"],
  },
  {
    id: "move-arrival-sim-card",
    question: "How do I get a UAE phone number when I land?",
    answer:
      "You can buy a visitor SIM at the airport on your passport within minutes, which is the sensible move on day one. A full postpaid line generally wants your Emirates ID, so most people run a prepaid line for the first weeks and switch once the ID arrives. There are two main operators and plenty of resellers; coverage is good almost everywhere, so pick on price and on how much data you actually need.",
    service: VISA,
    phrases: [
      "how do i get a uae phone number when i land",
      "buying a sim card at dubai airport",
      "can i get a mobile line without an emirates id",
      "phone number for a new arrival in the uae",
    ],
    keywords: [["sim", "card", "airport"], ["mobile", "line", "emirates"], ["phone", "number", "arrival"]],
    next: ["move-before-keep-home-number", "move-housing-internet", "move-arrival-first-week"],
  },
  {
    id: "move-arrival-airport-transport",
    question: "How do I get from the airport to where I am staying?",
    answer:
      "Metered taxis from the rank, ride-hailing apps, the metro where it serves the terminal, or a transfer your employer or hotel arranges. Take the official rank rather than an offer inside the terminal, have the address written down including the building name, and expect to pay a toll on some routes. Cards are widely accepted but a little cash on the first day is worth having.",
    service: VISA,
    phrases: [
      "how do i get from the airport to where i am staying",
      "taxi from dubai airport to my hotel",
      "best way to leave abu dhabi airport on arrival",
      "transport from the airport when i first arrive in the uae",
    ],
    keywords: [["taxi", "airport"], ["transport", "airport", "arrival"]],
    next: ["move-transport-metro-nol", "move-arrival-hotel-vs-flat", "move-arrival-first-week"],
  },
  {
    id: "move-arrival-first-week",
    question: "What should I actually do in my first week here?",
    answer:
      "Four things, in this order: a local phone number, the medical and Emirates ID steps your employer books, somewhere temporary to sleep that you are not committed to, and a hard look at the commute from the areas you are considering living in. Everything else — the bank, the tenancy, the licence, the furniture — waits on the Emirates ID, so chasing it first is the most useful week you will spend.",
    service: VISA,
    phrases: [
      "what should i actually do in my first week here",
      "first week checklist after arriving in dubai",
      "what to do in my first days as a new resident of the uae",
      "priorities after landing in the uae for work",
    ],
    keywords: [["first", "week", "checklist"], ["priorities", "landing"]],
    next: ["move-setup-order", "move-money-bank-account", "move-housing-first-steps"],
  },
  {
    id: "move-arrival-hotel-vs-flat",
    question: "Should I take a hotel apartment or rent straight away?",
    answer:
      "Take the temporary option first. Until your Emirates ID is issued, a normal tenancy and the utility account that goes with it are awkward to set up, and until you have done the commute at eight in the morning you do not really know the area. A month in a hotel apartment or a short let costs more per night and far less than a year's tenancy in the wrong place.",
    service: VISA,
    phrases: [
      "should i take a hotel apartment or rent straight away",
      "is it better to stay in a serviced apartment first in dubai",
      "how long should i stay in temporary accommodation in the uae",
      "renting immediately or waiting when i arrive in dubai",
    ],
    keywords: [["hotel", "apartment", "rent"], ["serviced", "apartment", "first"]],
    next: ["move-housing-short-term", "move-housing-first-steps", "move-before-first-accommodation"],
  },
  {
    id: "move-arrival-employer-first-contact",
    question: "What should I expect from my employer in the first days?",
    answer:
      "A clear point of contact — usually HR or the PRO — who tells you where to be for the medical and the biometrics, takes your passport for the filing steps, and gives you your start date. Ask for that person's name and number before you fly. If nobody can tell you what happens on Monday, treat it as a warning sign and get the arrangements in writing rather than over a call.",
    service: VISA,
    phrases: [
      "what should i expect from my employer in the first days",
      "who arranges my medical and emirates id when i arrive",
      "my company has not told me what happens when i land in dubai",
      "what does hr do for me when i arrive in the uae",
    ],
    keywords: [["employer", "first", "days"], ["company", "arrange", "medical"]],
    next: ["move-setup-who-does-it", "move-setup-order", "move-trouble-offer-withdrawn-on-arrival"],
  },
  {
    id: "move-arrival-summer",
    question: "I am arriving in the middle of summer — what should I know?",
    answer:
      "It is hotter than the number suggests, because of the humidity on the coast, and the first fortnight is when people underestimate it. Move around early or after dark, carry water everywhere, expect indoor spaces to be fiercely air-conditioned, and take any headache or exhaustion in the first week seriously rather than pushing through. Outdoor work has a legally mandated midday break in the hottest months, which tells you how seriously it is taken.",
    service: VISA,
    phrases: [
      "i am arriving in the middle of summer what should i know",
      "how bad is the heat when you first move to dubai",
      "arriving in the uae in july",
      "coping with uae summer as a new arrival",
    ],
    keywords: [["arriving", "summer", "heat"], ["coping", "heat"]],
    next: ["move-life-summer-heat", "move-before-packing", "move-health-emergency-numbers"],
  },
  {
    id: "move-arrival-shopping-basics",
    question: "Where do I buy the basics when I first arrive?",
    answer:
      "Supermarkets and hypermarkets in every district, malls for almost everything else, and online delivery for the rest — it is one of the easier places in the world to furnish a life quickly. Second-hand groups and marketplace apps are busy with other people's relocations and are the cheap way to furnish a first flat. Keep receipts for anything substantial, because returns are usually straightforward with one.",
    service: VISA,
    phrases: [
      "where do i buy the basics when i first arrive",
      "where to shop for furniture when you move to dubai",
      "buying household things as a new arrival in the uae",
      "second hand furniture in the uae",
    ],
    keywords: [["buy", "basics", "arrive"], ["furniture", "second", "hand"]],
    next: ["move-housing-furnished", "move-money-setup-costs", "move-life-food-groceries"],
  },
  {
    id: "move-arrival-travel-again-soon",
    question: "Can I leave the country again soon after arriving?",
    answer:
      "Not freely while the residence process is running, because your passport is often with the employer or the authority and leaving mid-process can disrupt it. If you have a trip you cannot move — a wedding, a handover at home — say so before you fly out, so the filing can be timed around it. Once the residence permit and Emirates ID are issued, travel is ordinary.",
    service: VISA,
    phrases: [
      "can i leave the country again soon after arriving",
      "can i travel while my residence visa is being processed in the uae",
      "i need to fly home soon after starting my dubai job",
      "leaving the uae before my emirates id is issued",
    ],
    keywords: [["travel", "while", "processing"], ["leave", "before", "issued"]],
    next: ["move-setup-travel-during", "move-setup-order", "move-trouble-family-emergency-home"],
  },
  {
    id: "move-arrival-family-with-me",
    question: "Can my family fly in with me at the start?",
    answer:
      "They can come as visitors, and plenty of families do so that everyone sees the place together — but they cannot be sponsored by you until your own residence permit exists, so a visit now and a residence application later is the usual shape. Weigh it against the cost of two sets of accommodation and the risk of a visit visa expiring before your own paperwork is finished.",
    service: VISA,
    phrases: [
      "can my family fly in with me at the start",
      "can my wife come on a visit visa while i start my job in dubai",
      "should my children arrive with me in the uae",
      "family travelling with me when i relocate to the uae",
    ],
    keywords: [["family", "arrive", "together"], ["wife", "visit", "while"]],
    next: ["move-family-when-to-bring", "move-before-family-timing", "move-family-sponsor-requirements"],
  },

  /* ── The residence chain, once you are here ────────────────────────────── */
  /**
   * The cluster closest to the visa pack, and the one most carefully scoped
   * against it. Here: when each step happens in a new arrival's fortnight, who
   * does it, and what is blocked until it is finished. The visa pack keeps the
   * mechanics — what the medical screens for, how an Emirates ID is renewed, what
   * a status change is — and the tests check neither pack answers the other's
   * questions.
   */
  {
    id: "move-setup-order",
    question: "What gets done in which order after I land?",
    answer:
      "You arrive on the entry permit, take the medical fitness test, give biometrics and apply for the Emirates ID, and the residence permit is then issued and the labour card follows — with your employer or its PRO filing each step. Nothing can jump the queue, and almost everything else you want to do, from a bank account to a tenancy, waits on the Emirates ID at the end of it. Timings differ by emirate and case, so take your employer's dates rather than ours.",
    service: VISA,
    phrases: [
      "what gets done in which order after i land",
      "order of the steps after i arrive in the uae for work",
      "what comes first medical or emirates id",
      "sequence from entry permit to residence visa",
    ],
    keywords: [["order", "steps", "arrive"], ["sequence", "entry", "residence"]],
    next: ["move-setup-medical-when", "move-setup-emirates-id-when", "move-setup-who-does-it"],
  },
  {
    id: "move-setup-medical-when",
    question: "When do I take the medical after I arrive?",
    answer:
      "Early — usually within the first days, because the residence permit cannot proceed without the result. Your employer books it or tells you which approved centre to attend; take your passport, the entry permit and photographs, and expect a blood sample and a chest X-ray. What it screens for and what happens if something is found belongs to the authority rather than to us, and the result goes to them rather than to your manager.",
    service: VISA,
    phrases: [
      "when do i take the medical after i arrive",
      "how soon after landing is the uae medical test",
      "what do i bring to the medical for my residence visa",
      "which centre do i go to for my employment medical in dubai",
    ],
    keywords: [["medical", "after", "arrive"], ["medical", "bring", "centre"]],
    next: ["move-setup-emirates-id-when", "move-setup-order", "move-health-medical-fitness-vs-insurance"],
  },
  {
    id: "move-setup-emirates-id-when",
    question: "When will I actually have my Emirates ID in my hand?",
    answer:
      "After the biometrics, and the card is delivered or collected once the authority has issued it — your employer or the typing centre handling the file will tell you where. The honest answer on timing is that it varies by emirate, by season and by whether anything in your file needs correcting, so plan for it being later than the optimistic estimate. The number is often usable before the plastic arrives, which unblocks some things.",
    service: VISA,
    phrases: [
      "when will i actually have my emirates id in my hand",
      "how long until my emirates id arrives after biometrics",
      "where do i collect my emirates id card in dubai",
      "waiting for my emirates id as a new arrival",
    ],
    keywords: [["emirates", "card", "arrives"], ["waiting", "emirates", "card"]],
    next: ["move-setup-what-id-unblocks", "move-money-bank-account", "move-setup-stuck"],
  },
  {
    id: "move-setup-what-id-unblocks",
    question: "What can I not do until my Emirates ID is issued?",
    answer:
      "In practice: open a normal salary account, take a postpaid phone line, sign most tenancies and open the utility account, register for health insurance properly, apply to exchange your driving licence, and start your family's sponsorship. That is why the first weeks feel like waiting — they are. Do the things that do not need it in the meantime: the commute, the school visits, the area search.",
    service: VISA,
    phrases: [
      "what can i not do until my emirates id is issued",
      "things that need an emirates id in the uae",
      "can i rent a flat without an emirates id",
      "what is blocked without my emirates id",
    ],
    keywords: [["blocked", "emirates", "card"]],
    next: ["move-money-account-before-id", "move-housing-first-steps", "move-setup-emirates-id-when"],
  },
  {
    id: "move-setup-stamping",
    question: "Does my residence permit still go into my passport?",
    answer:
      "The UAE has moved to issuing residence electronically, with the Emirates ID as the document you actually carry and the permit recorded against your file rather than as a sticker in the passport. Whether a physical stamp features in your case depends on the authority and when you are reading this, so take what your employer or the authority tells you over what an older guide says — and keep the Emirates ID safe, because it is the one that matters.",
    service: VISA,
    phrases: [
      "does my residence permit still go into my passport",
      "is the uae residence visa stamped in the passport now",
      "do i get a visa sticker in my passport in dubai",
      "electronic residence visa in the uae",
    ],
    keywords: [["stamped", "passport", "residence"], ["visa", "sticker", "passport"]],
    next: ["move-setup-order", "move-setup-emirates-id-when", "move-setup-labour-card"],
  },
  {
    id: "move-setup-labour-card",
    question: "What is the labour card and do I need to do anything about it?",
    answer:
      "It is the record that you are employed by that employer for that job title, issued by the labour authority — MOHRE on the mainland, the free zone authority inside a zone — and your employer applies for it. You do not usually do anything except check that the title and the employer on it are the ones you agreed, because that record is what your rights at work attach to, and a mismatch is easier to correct early.",
    service: VISA,
    phrases: [
      "what is the labour card and do i need to do anything about it",
      "do i need a labour card as well as a residence visa",
      "work permit card in the uae explained",
      "is my job title on my labour card important",
    ],
    keywords: [["labour", "card"], ["work", "permit", "card"]],
    next: ["move-work-contract-registration", "move-setup-order", "move-work-probation-exposure"],
  },
  {
    id: "move-setup-who-does-it",
    question: "Who actually files all this — me or my employer?",
    answer:
      "Your employer, directly or through a PRO or typing centre, because a work permit and the residence that follows it are applied for by the sponsor rather than by you. Your part is documents, photographs, attending the medical and the biometrics, and signing what you are asked to sign — after reading it. If you are being asked to run the process yourself for a normal employment visa, ask why.",
    service: VISA,
    phrases: [
      "who actually files all this me or my employer",
      "does my company do my visa paperwork in the uae",
      "what is a pro in the uae",
      "am i supposed to apply for my own residence visa for a job",
    ],
    keywords: [["company", "files", "paperwork"], ["what", "pro", "typing"]],
    next: ["move-setup-order", "move-trouble-asked-to-pay-visa-costs", "move-setup-passport-with-employer"],
  },
  {
    id: "move-setup-passport-with-employer",
    question: "Is it normal for my employer to hold my passport during the process?",
    answer:
      "Handing it over for specific steps is ordinary and brief. Keeping it afterwards is not, and your passport is yours: an employer has no right to retain it against your wishes. Get a receipt or an email listing what they have taken and when it comes back, and if it is not returned when the filing is done, that is a complaint to MOHRE or to your free zone authority rather than an argument with your manager.",
    service: VISA,
    phrases: [
      "is it normal for my employer to hold my passport during the process",
      "my company took my passport for visa processing in dubai",
      "how long can an employer keep my passport in the uae",
      "should i hand over my passport to my new employer",
    ],
    keywords: [["employer", "hold", "passport"], ["company", "took", "passport"]],
    next: ["move-trouble-passport-withheld", "move-setup-who-does-it", "move-trouble-complaint-mohre"],
  },
  {
    id: "move-setup-working-before-id",
    question: "Can I start working before my permit and ID come through?",
    answer:
      "Working before the permit is issued is not a grey area — the permit is the authorisation, and the employer carries the exposure, but so do you. Induction, training and reading yourself in are a different matter and happen all the time. If you are being put in front of customers or on site before the paperwork exists, ask for the permit reference, and keep your own notes of what you were asked to do and when.",
    service: VISA,
    phrases: [
      "can i start working before my permit and id come through",
      "is it legal to work while my uae visa is being processed",
      "my employer wants me to start before my work permit is ready",
      "working without a labour card in the uae",
    ],
    keywords: [["working", "before", "permit"], ["start", "unpaid", "permit"]],
    next: ["move-setup-labour-card", "move-trouble-complaint-mohre", "move-work-contract-registration"],
  },
  {
    id: "move-setup-insurance-card",
    question: "When do I get my health insurance card?",
    answer:
      "Once you are on the employer's policy, which is usually alongside the residence steps rather than before them — and the gap at the start is the reason short-term cover for your first weeks is worth having. Ask HR for the policy document and not just the card: what matters is the network of hospitals you can use, the co-payment, and what is excluded. Dependants are a separate question with a different answer in each emirate.",
    service: VISA,
    phrases: [
      "when do i get my health insurance card",
      "how soon is my employer's medical insurance active in the uae",
      "insurance card for a new employee in dubai",
      "am i insured from my first day in the uae",
    ],
    keywords: [["insurance", "card", "employee"], ["insured", "first", "day"]],
    next: ["move-health-insurance-employer", "move-before-insurance-gap", "move-health-insurance-family"],
  },
  {
    id: "move-setup-free-zone-difference",
    question: "Does it work differently if my employer is in a free zone?",
    answer:
      "The shape is the same and the counter is different: inside a free zone the zone's own authority issues the permit and registers the contract rather than MOHRE, so that authority is also where a complaint goes and where the rules on transfers and notice are set out. It affects which office you deal with and some of the detail, not whether you get residence. Ask your employer which zone it is, and look at that zone's own guidance.",
    service: VISA,
    phrases: [
      "does it work differently if my employer is in a free zone",
      "free zone versus mainland employment in the uae",
      "my company is in a free zone what changes for my visa",
      "who handles my contract in a free zone",
    ],
    keywords: [["free", "zone", "employer"], ["mainland", "employment", "difference"]],
    next: ["move-work-contract-registration", "move-trouble-complaint-mohre", "move-setup-order"],
  },
  {
    id: "move-setup-different-emirate",
    question: "My visa is from one emirate but I will work in another — is that a problem?",
    answer:
      "It happens constantly and is usually fine, because residence is a federal status even though it is issued by an emirate's authority. What does differ by emirate is health insurance requirements, tenancy registration, schooling regulators and some licensing — so the practical answer is to check the rules of the emirate you will live in rather than the one on the paperwork. Your employer's PRO deals with this routinely.",
    service: VISA,
    phrases: [
      "my visa is from one emirate but i will work in another",
      "does it matter which emirate issued my residence visa",
      "my residence is issued in one emirate and my office is in another",
      "working in a different emirate from my visa",
    ],
    keywords: [["different", "emirate", "work"], ["residence", "issued", "emirate"]],
    next: ["move-housing-first-steps", "move-transport-intercity", "move-setup-order"],
  },
  {
    id: "move-setup-travel-during",
    question: "What if I have to travel while my residence is still being processed?",
    answer:
      "Raise it with the employer before the filing starts, because your passport may be with the authority and some steps restart if you leave at the wrong moment. There are usually ways to sequence it, and there are moments where leaving genuinely sets you back. The decision belongs to the authority handling your file, so the useful move is to ask early rather than to book first and ask after.",
    service: VISA,
    phrases: [
      "what if i have to travel while my residence is still being processed",
      "can i go abroad during my uae visa processing",
      "i have a trip booked and my residence visa is in process",
      "travelling before my residence permit is finished",
    ],
    keywords: [["travel", "during", "processing"], ["trip", "booked", "processing"]],
    next: ["move-arrival-travel-again-soon", "move-setup-order", "move-trouble-family-emergency-home"],
  },
  {
    id: "move-setup-stuck",
    question: "Nothing has moved on my paperwork for weeks — what can I do?",
    answer:
      "Ask your employer, in writing, which step the file is at and what it is waiting for — that single question often finds a missing document or an unpaid step rather than a queue. If the answer is vague, you can check the status yourself through the ICP or the relevant GDRFA channel using your reference, and if it has genuinely stalled on the employer's side the labour authority is the escalation. Keep a dated note of what you were told and by whom.",
    service: VISA,
    phrases: [
      "nothing has moved on my paperwork for weeks",
      "my uae residence visa is delayed and nobody tells me why",
      "how do i check the status of my visa application in the uae",
      "my emirates id is taking far too long",
    ],
    keywords: [["delayed", "paperwork", "weeks"], ["check", "status", "application"]],
    next: ["move-trouble-complaint-mohre", "move-setup-who-does-it", "move-us-talk-to-someone"],
  },

  /* ── Somewhere to live ─────────────────────────────────────────────────── */
  /**
   * The cluster with the most money in it and not one figure, which is the whole
   * discipline of this pack. Rents, deposits, commissions and utility deposits
   * all move, differ by emirate and are set by landlords, agents and utilities
   * rather than by us — so every answer here says what the cost is made of and
   * none says what it is.
   */
  {
    id: "move-housing-first-steps",
    question: "Where do I start when looking for a flat?",
    answer:
      "Decide the commute first and the flat second — distances here are deceptive and the difference between a twenty-minute and an hour-long drive is the quality of your year. Then search the main property portals, note that most listings are posted by agents rather than owners, and view in person before paying anything at all. Have your Emirates ID or at least your entry permit and a passport copy ready, because an agent will ask.",
    service: VISA,
    phrases: [
      "where do i start when looking for a flat",
      "how do i find an apartment in dubai as a newcomer",
      "looking for accommodation when i arrive in the uae",
      "which property websites do people use in the uae",
    ],
    keywords: [["looking", "apartment", "newcomer"], ["property", "portals", "search"]],
    next: ["move-housing-where-to-live", "move-housing-rent-cheques", "move-housing-rental-scam"],
  },
  {
    id: "move-housing-where-to-live",
    question: "How do I choose which area to live in?",
    answer:
      "On four things rather than on a recommendation: the commute at the hour you actually travel, whether you need to be near a particular school, whether you want a flat in a tower or a villa community, and what the building includes — some rents include cooling and some bill it separately, which changes the real monthly figure. Visit at least two areas in the evening before you commit, when the traffic and the noise are honest.",
    service: VISA,
    phrases: [
      "how do i choose which area to live in",
      "which neighbourhood should i live in when i move to dubai",
      "best places to live for a new expat in the uae",
      "choosing where to live near my office in dubai",
    ],
    keywords: [["choose", "area", "live"], ["neighbourhood", "live"]],
    next: ["move-housing-first-steps", "move-transport-intercity", "move-family-schools-finding"],
  },
  {
    id: "move-housing-rent-cheques",
    question: "Why do landlords here ask for the rent in cheques?",
    answer:
      "Because the custom is to pay the year in advance, split into a small number of post-dated cheques — fewer cheques usually means a better rent, and one cheque is the strongest position a tenant can take. That is why the first flat is the hardest: you need the money up front, before your first salary and before any savings you build here. Some landlords now accept monthly payments or cards; ask, because it is negotiable more often than people assume.",
    service: VISA,
    phrases: [
      "why do landlords here ask for the rent in cheques",
      "how does paying rent in cheques work in dubai",
      "do i have to pay a year's rent in advance in the uae",
      "can i pay rent monthly in dubai",
    ],
    keywords: [["rent", "cheques"], ["year", "advance", "rent"], ["pay", "rent", "monthly"]],
    next: ["move-housing-deposit", "move-housing-moving-in-costs", "move-money-bank-account"],
  },
  {
    id: "move-housing-deposit",
    question: "What deposit will I have to put down on a flat?",
    answer:
      "A security deposit is standard, is held against damage rather than against rent, and is higher for a furnished place than an unfurnished one — the amount is set by the landlord and varies, so take the number from the tenancy contract in front of you rather than from any guide. Photograph the flat thoroughly on the day you move in and keep the record: that, not an argument at the end, is what gets a deposit back.",
    service: VISA,
    phrases: [
      "what deposit will i have to put down on a flat",
      "security deposit when renting in dubai",
      "do i get my rental deposit back in the uae",
      "how does the deposit work on a uae tenancy",
    ],
    keywords: [["security", "deposit", "renting"], ["deposit", "back", "tenancy"]],
    next: ["move-housing-moving-in-costs", "move-housing-contract-check", "move-housing-leaving-early"],
  },
  {
    id: "move-housing-agent-commission",
    question: "Do I have to pay the estate agent as well?",
    answer:
      "Usually yes — a commission to the agent on top of the rent is the normal arrangement, and it is payable on signing. It is a percentage set by the agency rather than by law, so it is worth asking what it is before you view and worth knowing that landlord-direct listings exist and avoid it. Any agent you deal with should be registered with the emirate's regulator; ask for the registration if it is not on their card.",
    service: VISA,
    phrases: [
      "do i have to pay the estate agent as well",
      "agency commission when renting a flat in dubai",
      "who pays the real estate agent in the uae",
      "is the broker fee on top of rent in the uae",
    ],
    keywords: [["agency", "commission", "renting"], ["agent", "broker", "registered"]],
    next: ["move-housing-moving-in-costs", "move-housing-rental-scam", "move-housing-contract-check"],
  },
  {
    id: "move-housing-ejari",
    question: "What is Ejari and do I have to register my tenancy?",
    answer:
      "Tenancy registration — Ejari in Dubai, with equivalents in the other emirates — is the official record of your lease, and you will need it for the utility account, for a residence application for your family, sometimes for a school and for internet. It is normally done by the landlord or the agent, but the registration is yours to insist on: a tenancy that is not registered leaves you with much less to stand on if there is a dispute.",
    service: VISA,
    phrases: [
      "what is ejari and do i have to register my tenancy",
      "do i need ejari for my family visa",
      "tenancy contract registration in dubai",
      "who registers the lease in the uae",
    ],
    keywords: [["ejari", "tenancy", "register"], ["tenancy", "registration"]],
    next: ["move-housing-contract-check", "move-family-sponsor-requirements", "move-housing-dewa"],
  },
  {
    id: "move-housing-dewa",
    question: "How do I get the electricity and water connected?",
    answer:
      "You open an account in your own name with the emirate's utility — DEWA in Dubai, and the equivalent authority elsewhere — using your Emirates ID or passport, the tenancy registration and the premises number, and there is a refundable deposit which differs between a flat and a villa. Do it on the day you get the keys; a flat with the power off in July is not a flat you can sleep in.",
    service: VISA,
    phrases: [
      "how do i get the electricity and water connected",
      "opening a dewa account as a new tenant",
      "utilities when i move into a flat in the uae",
      "do i need a deposit for electricity in dubai",
    ],
    keywords: [["electricity", "water", "connected"], ["utility", "account", "tenant"]],
    next: ["move-housing-chiller", "move-housing-internet", "move-housing-moving-in-costs"],
  },
  {
    id: "move-housing-chiller",
    question: "What is a chiller charge and why is it separate?",
    answer:
      "Cooling in many towers is supplied by a district system rather than by your own air conditioner, and it is billed separately from the electricity — sometimes included in the rent, sometimes paid by you, sometimes with a deposit of its own. In a hot climate it is a serious part of the monthly cost, so ask whether cooling is included before comparing two rents, because a cheaper rent with cooling excluded is often the dearer flat.",
    service: VISA,
    phrases: [
      "what is a chiller charge and why is it separate",
      "is cooling included in the rent in dubai",
      "district cooling bills in the uae",
      "who pays for air conditioning in a dubai flat",
    ],
    keywords: [["chiller", "cooling", "charge"], ["cooling", "included", "rent"]],
    next: ["move-housing-dewa", "move-housing-moving-in-costs", "move-housing-where-to-live"],
  },
  {
    id: "move-housing-internet",
    question: "How do I get internet at home?",
    answer:
      "One of the two main operators will usually serve your building, and in practice which one is decided by the building rather than by you. They will want your Emirates ID or passport and often the tenancy registration, and installation is booked rather than instant. Bear in mind that some voice and video calling services are restricted here, so if family abroad depend on one of them, check before you build your week around it.",
    service: VISA,
    phrases: [
      "how do i get internet at home",
      "home wifi when i move into a flat in dubai",
      "which internet provider can i choose in the uae",
      "setting up broadband as a new resident in the uae",
    ],
    keywords: [["internet", "home", "provider"], ["broadband", "resident"]],
    next: ["move-arrival-sim-card", "move-housing-dewa", "move-before-electronics"],
  },
  {
    id: "move-housing-furnished",
    question: "Should I rent furnished or unfurnished?",
    answer:
      "Furnished costs more per month and saves the upfront spend and the hassle, which suits a first year or an uncertain one. Unfurnished is cheaper over a longer stay, and the second-hand market here is full of other people's relocations, so furnishing a flat quickly and cheaply is genuinely possible. If you are not sure how long you are staying, furnished for the first year and a decision later is the lower-regret option.",
    service: VISA,
    phrases: [
      "should i rent furnished or unfurnished",
      "is a furnished apartment worth it in dubai",
      "furnishing an empty flat when i move to the uae",
      "furnished or empty rental in the uae",
    ],
    keywords: [["furnished", "unfurnished", "rent"], ["furnishing", "empty", "flat"]],
    next: ["move-arrival-shopping-basics", "move-housing-moving-in-costs", "move-before-shipping"],
  },
  {
    id: "move-housing-short-term",
    question: "Can I take a short-term let instead of a year's tenancy?",
    answer:
      "Yes — hotel apartments, licensed holiday homes and some landlords offer monthly terms, and for a first month or three that flexibility is worth the higher monthly rate. Use a licensed operator rather than an informal arrangement, because an unlicensed short let gives you no tenancy to register and nothing to show a utility or a school. Treat it as a bridge rather than a plan.",
    service: VISA,
    phrases: [
      "can i take a short term let instead of a year's tenancy",
      "monthly rentals in dubai for new arrivals",
      "holiday home rental while i look for a flat in the uae",
      "is a short lease possible in the uae",
    ],
    keywords: [["short", "term", "let"], ["monthly", "rental", "arrivals"]],
    next: ["move-arrival-hotel-vs-flat", "move-housing-first-steps", "move-housing-moving-in-costs"],
  },
  {
    id: "move-housing-sharing",
    question: "Can I share a flat or rent a room to save money?",
    answer:
      "People do it constantly, and the thing to know is that the rules on how many people may occupy a unit, and on partitioning rooms, are set and enforced by the municipality — an arrangement that breaks them can end with everyone being told to leave. Sharing with the tenancy in one person's name also means the others have no registered tenancy, which matters for utilities, for a family visa and in any dispute. Check what is permitted for the building before you commit.",
    service: VISA,
    phrases: [
      "can i share a flat or rent a room to save money",
      "is flat sharing allowed in dubai",
      "renting a room in a shared apartment in the uae",
      "bed space and partitioned rooms in the uae",
    ],
    keywords: [["sharing", "flat", "allowed"], ["renting", "room", "shared"]],
    next: ["move-housing-moving-in-costs", "move-housing-ejari", "move-money-budget"],
  },
  {
    id: "move-housing-company-accommodation",
    question: "Should I take the accommodation my employer offers?",
    answer:
      "It depends on what it is and what it replaces. Company housing or a paid allowance removes the hardest part of the first year, which is finding the money up front; against that, employer-provided accommodation may tie where you live to where you work, and leaving the job can mean leaving the flat at short notice. Ask what happens to the housing if you resign or are let go, and get the answer in the contract.",
    service: VISA,
    phrases: [
      "should i take the accommodation my employer offers",
      "is company provided housing in dubai a good idea",
      "housing allowance or company accommodation in the uae",
      "what happens to company accommodation if i leave the job",
    ],
    keywords: [["company", "accommodation", "employer"], ["housing", "allowance", "provided"]],
    next: ["move-housing-moving-in-costs", "move-work-contract-registration", "move-money-budget"],
  },
  {
    id: "move-housing-contract-check",
    question: "What should I check in a tenancy contract before signing?",
    answer:
      "The names and the property details matching the title and your passport; the rent, the number of cheques and the dates; what the deposit covers and how it is returned; who pays for maintenance and for cooling; the notice required to leave or to renew; and whether the person signing is the owner or holds a written authority from them. Then make sure it gets registered. If the contract is in Arabic only, have it translated before signing rather than after.",
    service: VISA,
    phrases: [
      "what should i check in a tenancy contract before signing",
      "reading a dubai rental contract before i sign",
      "things to look for in a uae lease",
      "my tenancy contract is in arabic",
    ],
    keywords: [["tenancy", "contract", "signing"], ["lease", "check", "before"]],
    next: ["move-housing-ejari", "move-housing-rental-scam", "move-papers-translation"],
  },
  {
    id: "move-housing-rental-scam",
    question: "How do I avoid a rental scam when I have just arrived?",
    answer:
      "Never pay anything for a flat you have not stood inside, and never into a personal account for a listing you found online. Check that the agent is registered with the emirate's regulator, that the person signing is the owner or has written authority, and that the price is not far below everything comparable — a bargain with urgency attached is the oldest version of this. Insist on the tenancy being registered, and keep every receipt.",
    service: VISA,
    phrases: [
      "how do i avoid a rental scam when i have just arrived",
      "fake apartment listings in dubai",
      "someone is asking me to transfer a deposit for a flat i have not seen",
      "rental fraud in the uae",
    ],
    keywords: [["rental", "scam", "fake"], ["deposit", "transfer", "unseen"]],
    next: ["move-housing-contract-check", "move-trouble-rental-dispute", "move-housing-agent-commission"],
  },
  {
    id: "move-housing-moving-in-costs",
    question: "What will my first month here actually cost me?",
    answer:
      "More than a month of rent, and this is the single most useful thing to plan for. Count the rent cheques or the first instalment, the security deposit, the agency commission, the tenancy registration, the utility deposit and connection, internet, a bed and the basics, and any cooling deposit — then add the temporary accommodation you are living in while all that happens. We will not invent the numbers, but add them up for the flats you are actually looking at before you accept a salary.",
    service: VISA,
    phrases: [
      "what will my first month here actually cost me",
      "how much do i need up front to move into a flat in dubai",
      "setup costs when moving to the uae",
      "what should i budget for my first month in dubai",
      "upfront money needed to rent in the uae",
    ],
    keywords: [["first", "month", "upfront"], ["setup", "moving", "budget"]],
    next: ["move-money-budget", "move-money-setup-costs", "move-housing-rent-cheques"],
  },
  {
    id: "move-housing-maintenance",
    question: "Who fixes things when something breaks in a rented flat?",
    answer:
      "Normally the landlord for the structure and the major systems, and the tenant for small day-to-day items — but it is the tenancy contract that decides, and some contracts shift more onto the tenant than they expect. Report faults in writing rather than by phone so there is a record, and in a managed building use the facilities team. If a landlord simply will not act, the emirate's rental dispute route exists for that.",
    service: VISA,
    phrases: [
      "who fixes things when something breaks in a rented flat",
      "is the landlord responsible for maintenance in dubai",
      "my air conditioning has broken and my landlord will not fix it",
      "maintenance responsibility in a uae tenancy",
    ],
    keywords: [["landlord", "maintenance", "responsible"], ["broken", "landlord", "repair"]],
    next: ["move-trouble-rental-dispute", "move-housing-contract-check", "move-housing-chiller"],
  },
  {
    id: "move-housing-rent-increase",
    question: "Can my landlord put the rent up when I renew?",
    answer:
      "Increases are regulated rather than free: each emirate has its own framework for what a landlord may do and what notice must be given before a renewal, and in Dubai there is an official index used as the reference. So the answer is neither no nor whatever they like. Look up the emirate's own rules and the index before you accept a renewal figure, and remember the notice requirement runs both ways.",
    service: VISA,
    phrases: [
      "can my landlord put the rent up when i renew",
      "rent increase rules in dubai",
      "my landlord wants more rent at renewal in the uae",
      "is there a rent cap in the uae",
    ],
    keywords: [["rent", "increase", "renew"], ["landlord", "renewal", "notice"]],
    next: ["move-trouble-rental-dispute", "move-housing-contract-check", "move-housing-leaving-early"],
  },
  {
    id: "move-housing-leaving-early",
    question: "What happens if I have to leave a flat before the year is up?",
    answer:
      "That depends on the early-termination clause you signed, and many contracts provide for a penalty, a notice period, or both — which is exactly why that clause is worth reading before you sign rather than when you need it. Where a job ends unexpectedly, talk to the landlord early: a replacement tenant found cooperatively is cheaper for everyone than a dispute. Cheques you have handed over remain presentable, so deal with them rather than ignoring them.",
    service: VISA,
    phrases: [
      "what happens if i have to leave a flat before the year is up",
      "breaking a tenancy contract early in dubai",
      "i lost my job and cannot stay in my flat in the uae",
      "early termination of a uae lease",
    ],
    keywords: [["leave", "flat", "early"], ["breaking", "tenancy", "early"]],
    next: ["move-trouble-rental-dispute", "move-money-debt-risk", "move-housing-contract-check"],
  },
  {
    id: "move-housing-for-family-visa",
    question: "Do I need a tenancy in my name to bring my family?",
    answer:
      "A registered tenancy is one of the documents commonly asked for when you sponsor family, because the authority wants to see suitable accommodation — and that is a reason to get the lease and its registration in your own name rather than sharing informally. The exact requirements, including how a shared or employer-provided home is treated, are set by ICP or the emirate's GDRFA and differ, so confirm before you commit to a flat on that basis.",
    service: VISA,
    phrases: [
      "do i need a tenancy in my name to bring my family",
      "is ejari required for a family residence application",
      "accommodation requirement for sponsoring my wife in the uae",
      "can i sponsor my family while sharing a flat",
    ],
    keywords: [["tenancy", "sponsor", "family"], ["accommodation", "requirement", "sponsoring"]],
    next: ["move-family-sponsor-requirements", "move-housing-ejari", "move-family-documents"],
  },

  /* ── Money, banking and the first salary ───────────────────────────────── */
  /**
   * Every entry in this cluster is a money question and not one of them is a
   * `quote`: they are about the visitor's own money, as the job pack's salary
   * answers are, and answering them with a lead form would be both useless and
   * grubby. The `quote` entries live at the end of the file and are about what WE
   * cost. The tests check both directions, because the two sets share every word
   * people use about money.
   */
  {
    id: "move-money-bank-account",
    question: "How do I open a bank account when I arrive?",
    answer:
      "A normal salary account generally wants your Emirates ID, a passport copy with the residence record, and a salary certificate or letter from your employer — so it usually happens once the residence paperwork is finished rather than in your first week. Choose on the things that actually matter to a newcomer: whether the salary transfer meets any minimum-balance condition, the charges for transfers home, and the branch or app being usable in the language you read.",
    service: VISA,
    phrases: [
      "how do i open a bank account when i arrive",
      "opening a uae bank account as a new resident",
      "what do i need to open a salary account in dubai",
      "which documents does a uae bank ask for",
    ],
    keywords: [["open", "bank", "account"], ["salary", "account", "documents"]],
    next: ["move-money-account-before-id", "move-money-salary-wps", "move-money-transfer-home"],
  },
  {
    id: "move-money-account-before-id",
    question: "Can I open an account before my Emirates ID is ready?",
    answer:
      "Some banks will open a limited or non-resident account on a passport and entry permit, with restrictions on what it can do, and some will not open anything until the ID exists — it is a bank-by-bank answer rather than a rule. Ask your employer which bank it uses for payroll, because the account opened through that relationship is usually the quickest. In the meantime, plan to live on money you brought.",
    service: VISA,
    phrases: [
      "can i open an account before my emirates id is ready",
      "bank account without emirates id in the uae",
      "can i bank in dubai on just my entry permit",
      "opening an account while waiting for my residence visa",
    ],
    keywords: [["account", "emirates", "bank"], ["bank", "entry", "permit"]],
    next: ["move-money-bank-account", "move-setup-what-id-unblocks", "move-money-setup-costs"],
  },
  {
    id: "move-money-salary-wps",
    question: "How will my salary actually be paid?",
    answer:
      "Into a UAE account, through the Wages Protection System that the labour authority runs — which exists precisely so that there is a record of employers paying on time. Your payslip should match the contract, and the gap between your start date and the first payment is the thing to ask HR about directly, because payroll cut-offs mean a mid-month start can mean a longer wait than you expect.",
    service: VISA,
    phrases: [
      "how will my salary actually be paid",
      "what is the wages protection system in the uae",
      "when will i get my first salary in dubai",
      "is salary paid monthly in the uae",
    ],
    keywords: [["wages", "protection", "system"], ["first", "salary", "paid"]],
    next: ["move-money-first-salary-delay", "move-work-first-payslip", "move-trouble-salary-unpaid"],
  },
  {
    id: "move-money-first-salary-delay",
    question: "How long until my first salary and how do I get through until then?",
    answer:
      "Plan on it being later than you would like: the account has to exist, payroll has to pick you up, and a start date just after a cut-off can push it to the following cycle. The practical answer is to arrive with enough to cover the set-up spend plus living costs with a margin, to ask HR for the exact first pay date in writing, and to ask about an advance if the gap is genuinely unmanageable — many employers will.",
    service: VISA,
    phrases: [
      "how long until my first salary and how do i get through until then",
      "when do new employees get paid in the uae",
      "i am running out of money before my first dubai salary",
      "can i ask my employer for a salary advance in the uae",
    ],
    keywords: [["first", "salary", "waiting"], ["salary", "advance", "employer"]],
    next: ["move-money-setup-costs", "move-money-salary-wps", "move-money-budget"],
  },
  {
    id: "move-money-setup-costs",
    question: "What should I expect to spend before my first payday?",
    answer:
      "The honest list: temporary accommodation, a deposit and rent cheques or an instalment, agency commission, tenancy registration, utility deposits and connection, internet, a phone line, transport or a car deposit, basic furniture, and school fees if children are starting. We will not put a figure on your case — it depends on the emirate, the flat and the family — but add the real numbers for your own shortlist before you accept, because this spend lands first.",
    service: VISA,
    phrases: [
      "what should i expect to spend before my first payday",
      "set up costs when i first move to the uae",
      "what are the upfront expenses of relocating to dubai",
      "how much savings do i need to move to the uae for a job",
    ],
    keywords: [["spend", "before", "payday"], ["upfront", "expenses", "relocating"]],
    next: ["move-housing-moving-in-costs", "move-money-budget", "move-money-first-salary-delay"],
  },
  {
    id: "move-money-transfer-home",
    question: "What is the best way to send money home?",
    answer:
      "Compare the whole cost rather than the headline fee: the exchange rate margin usually matters more than the transfer charge, and exchange houses, banks and app-based services differ on both. Exchange houses are everywhere, regulated by the Central Bank, and are what most people use for regular remittances. Set up the recipient details once your account is open, and keep records — regular large transfers attract routine compliance questions, which are easier with receipts.",
    service: VISA,
    phrases: [
      "what is the best way to send money home",
      "remittance from the uae to my family",
      "cheapest way to transfer money out of dubai",
      "exchange houses versus banks for sending money home",
    ],
    keywords: [["send", "money", "home"], ["remittance", "family"], ["transfer", "money", "abroad"]],
    next: ["move-money-exchange-rate", "move-money-bank-account", "move-family-left-behind"],
  },
  {
    id: "move-money-exchange-rate",
    question: "Is the dirham fixed and does the rate matter for my salary?",
    answer:
      "The dirham is pegged to the US dollar, which makes your salary stable against the dollar and moving against your home currency exactly as the dollar does. That is worth a thought before you accept an offer: a salary that looks generous today can be worth noticeably less at home if your currency strengthens. Nobody can tell you where rates will go, and anyone who says they can is selling something.",
    service: VISA,
    phrases: [
      "is the dirham fixed and does the rate matter for my salary",
      "is the uae dirham pegged to the dollar",
      "will exchange rates affect what i send home from dubai",
      "currency risk when working in the uae",
    ],
    keywords: [["dirham", "pegged", "dollar"], ["currency", "exchange", "risk"]],
    next: ["move-money-transfer-home", "move-money-budget", "move-money-vat"],
  },
  {
    id: "move-money-vat",
    question: "What taxes and charges will I actually come across?",
    answer:
      "VAT on most purchases, excise on some drinks and tobacco, a municipality or housing charge that usually arrives through your utility bill, tourism charges on hotels, and tolls and fines on the roads. Individually small, collectively a real line in a monthly budget. The Federal Tax Authority sets the tax rules and the rates change by decision rather than by rumour, so check there if something on a bill is unfamiliar.",
    service: VISA,
    phrases: [
      "what taxes and charges will i actually come across",
      "is there vat in the uae",
      "housing fee on my dewa bill",
      "hidden charges of living in the uae",
    ],
    keywords: [["vat", "charges", "purchases"], ["housing", "municipality", "charge"]],
    next: ["move-before-tax-home", "move-money-budget", "move-housing-dewa"],
  },
  {
    id: "move-money-credit-card-loan",
    question: "Can I get a credit card or a loan as a new resident?",
    answer:
      "Usually only after your salary has been landing in the account for a while, because lenders here work from salary transfer history, employer and residency status — which is why a new arrival with a good income at home may be refused at first. That delay is a blessing more often than not. When you do borrow, borrow against what you will still earn if the job ends, because the consequences of default here are serious.",
    service: VISA,
    phrases: [
      "can i get a credit card or a loan as a new resident",
      "credit card for expats who just moved to dubai",
      "can i borrow money in the uae on a new job",
      "do uae banks lend to new residents",
    ],
    keywords: [["credit", "card", "resident"], ["loan", "borrow", "resident"]],
    next: ["move-money-debt-risk", "move-money-credit-check", "move-money-budget"],
  },
  {
    id: "move-money-debt-risk",
    question: "What happens if I get into debt here?",
    answer:
      "Take it seriously and get advice early, because the consequences attach to your residence and your ability to leave as well as to your credit: a defaulted loan or a dishonoured cheque is a matter the courts deal with, and leaving the country owing money is not the clean exit people imagine. Talk to the bank before you miss a payment rather than after, and if it has already gone wrong, take legal advice rather than internet advice.",
    service: VISA,
    phrases: [
      "what happens if i get into debt here",
      "consequences of defaulting on a loan in the uae",
      "can i leave the uae if i owe the bank money",
      "bounced cheque in the uae what happens",
    ],
    keywords: [["debt", "default", "loan"], ["bounced", "cheque", "consequences"]],
    next: ["move-trouble-bank-frozen", "move-money-credit-card-loan", "move-trouble-leaving-quickly"],
  },
  {
    id: "move-money-credit-check",
    question: "Is there a credit record here and does my home one follow me?",
    answer:
      "There is a UAE credit record, maintained by the federal credit bureau, and lenders here read it rather than your history at home — so you start close to blank, which is why early applications are often refused. Your record at home does not travel with you, and nor do its benefits. Pay on time from the beginning, because the record you build in the first two years is the one that gets you a car lease or a mortgage later.",
    service: VISA,
    phrases: [
      "is there a credit record here and does my home one follow me",
      "credit score in the uae for expats",
      "does my home country credit history count in dubai",
      "aecb credit report in the uae",
    ],
    keywords: [["credit", "record", "score"], ["credit", "history", "home"]],
    next: ["move-money-credit-card-loan", "move-money-debt-risk", "move-money-bank-account"],
  },
  {
    id: "move-money-budget",
    question: "Will my salary actually cover living here?",
    answer:
      "Do the arithmetic yourself before you accept, because the averages people quote are useless at an individual level. Write down the rent for flats you would actually take, cooling and utilities, school fees per child, transport or a car, insurance for anyone not covered by the employer, groceries, a flight home, and what you intend to send to family — then compare that against the offer, including what is allowance rather than basic. That sum, done honestly, is worth more than any published figure.",
    service: CV,
    phrases: [
      "will my salary actually cover living here",
      "is the salary offered enough to live in dubai",
      "how do i work out whether i can afford to move to the uae",
      "budgeting for life in dubai with a family",
    ],
    keywords: [["salary", "cover", "living"], ["budgeting", "life", "family"]],
    next: ["move-money-setup-costs", "move-housing-moving-in-costs", "move-family-school-fees-timing"],
  },
  {
    id: "move-money-gratuity-savings",
    question: "How should I think about saving while I am here?",
    answer:
      "Treat it as the reason you came, because there is no state pension building up for you and the end-of-service benefit your employer owes is not a retirement plan. Decide a share of each salary that leaves the account automatically, keep an emergency fund in a currency you can reach, and be wary of the investment and insurance products sold hard to new arrivals — fees in that market are often high and the exit terms punishing. Independent, fee-based advice is worth paying for.",
    service: VISA,
    phrases: [
      "how should i think about saving while i am here",
      "saving money as an expat in the uae",
      "is there a pension in the uae for expats",
      "should i buy an investment plan offered to me in dubai",
    ],
    keywords: [["saving", "expat"], ["pension", "expats"], ["investment", "plan", "offered"]],
    next: ["move-money-pension-home", "move-work-resign-soon", "move-money-budget"],
  },
  {
    id: "move-money-pension-home",
    question: "What happens to my pension and social contributions back home?",
    answer:
      "It depends on your home scheme and on any social security agreement between the two countries, and the useful time to ask is before you leave: some schemes allow voluntary contributions while you are abroad, some freeze, and some let you lose years quietly. Get it in writing from the scheme rather than from a colleague. GCC nationals are in a different position again, with their own arrangements for contributions while working here.",
    service: VISA,
    phrases: [
      "what happens to my pension and social contributions back home",
      "can i keep paying into my home pension while in dubai",
      "social security when working in the uae",
      "will i lose pension years by moving to the uae",
    ],
    keywords: [["pension", "contributions", "home"], ["social", "security", "working"]],
    next: ["move-before-tax-home", "move-money-gratuity-savings", "move-money-budget"],
  },
  {
    id: "move-money-cash-day-to-day",
    question: "Is it a card economy or should I carry cash?",
    answer:
      "Cards and phone payments work almost everywhere, and contactless is the norm — but keep a little cash for small shops, some taxis, parking machines and tips. Your home bank's card will work on arrival with foreign-transaction charges attached, which is fine for a few days and expensive as a habit, so moving to a local account quickly is worth the paperwork.",
    service: VISA,
    phrases: [
      "is it a card economy or should i carry cash",
      "do people use cash in dubai",
      "will my foreign card work in the uae",
      "paying for things as a new arrival in the uae",
    ],
    keywords: [["cash", "card", "payments"], ["foreign", "card", "work"]],
    next: ["move-money-bank-account", "move-before-cash", "move-life-tipping"],
  },

  /* ── Getting around ────────────────────────────────────────────────────── */
  {
    id: "move-transport-driving-licence-exchange",
    question: "Can I swap my home driving licence for a UAE one?",
    answer:
      "Some countries' licences can be exchanged without taking a test and others cannot, and the list is maintained by the licensing authority — RTA in Dubai and the equivalent authority in each emirate — rather than by anyone else. It is revised, so check it there rather than trusting a list in a forum. You will generally need your residence to be issued first, along with your Emirates ID, the original licence and an eye test.",
    service: VISA,
    phrases: [
      "can i swap my home driving licence for a uae one",
      "driving licence exchange in dubai for expats",
      "which countries can transfer a licence in the uae",
      "converting my foreign licence to a uae licence",
    ],
    keywords: [["licence", "exchange", "transfer"], ["converting", "foreign", "licence"]],
    next: ["move-transport-driving-test", "move-before-driving-licence", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-transport-driving-test",
    question: "What if my licence cannot be exchanged and I have to take a test?",
    answer:
      "Then it is lessons and tests at a licensed driving school, and it is a real course rather than a formality — experienced drivers from countries that are not on the exchange list routinely need more attempts than they expect. Budget time as well as money for it, start as soon as your residence is issued, and in the meantime plan a commute that does not depend on you driving.",
    service: VISA,
    phrases: [
      "what if my licence cannot be exchanged and i have to take a test",
      "driving school in dubai for a new resident",
      "do i have to learn to drive again in the uae",
      "failing the uae driving test",
    ],
    keywords: [["driving", "school", "test"], ["learn", "drive", "again"]],
    next: ["move-transport-driving-licence-exchange", "move-transport-metro-nol", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-transport-car-buy-or-lease",
    question: "Should I buy a car or lease one when I arrive?",
    answer:
      "Lease first if you are not sure how long you are staying or whether you will need a car at all: it bundles insurance, servicing and registration, needs no loan and ends when you do. Buying is cheaper over a longer stay, and the used market here is deep because people leave — but it needs a licence, registration, insurance and usually a credit history you may not have yet. Either way, work out whether your commute actually needs one.",
    service: VISA,
    phrases: [
      "should i buy a car or lease one when i arrive",
      "car rental versus buying in dubai for expats",
      "monthly car lease in the uae for a new resident",
      "do i need my own car in abu dhabi",
    ],
    keywords: [["buy", "lease", "car"], ["car", "rental", "buying"]],
    next: ["move-transport-car-insurance", "move-transport-driving-licence-exchange", "move-transport-salik-parking-fines"],
  },
  {
    id: "move-transport-car-insurance",
    question: "How does car insurance and registration work here?",
    answer:
      "Insurance is compulsory and is what registration hangs on: the car is registered annually with the licensing authority after a test where required, and the policy has to be valid for the registration to be renewed. Premiums depend on the car, your age and your licence history — including how long you have held a UAE licence, which is why a new arrival often pays more than their driving record deserves. Keep the registration card in the car.",
    service: VISA,
    phrases: [
      "how does car insurance and registration work here",
      "insuring a car in the uae as a new resident",
      "annual car registration in dubai",
      "do i need comprehensive insurance in the uae",
    ],
    keywords: [["car", "insurance", "registration"], ["insuring", "vehicle", "resident"]],
    next: ["move-transport-car-buy-or-lease", "move-transport-salik-parking-fines", "move-transport-driving-culture"],
  },
  {
    id: "move-transport-salik-parking-fines",
    question: "What are tolls, parking and fines going to involve?",
    answer:
      "Road tolls are charged electronically through a tag on the windscreen and are topped up like a phone; paid parking is zoned and handled by app or machine; and traffic fines are issued automatically and attach to the car, so a leased car's fines reach you through the leasing company. Check fines regularly on the authority's app rather than discovering them at renewal, and be aware that some offences carry black points and impoundment rather than a payment.",
    service: VISA,
    phrases: [
      "what are tolls parking and fines going to involve",
      "how does salik work in dubai",
      "paying traffic fines in the uae",
      "black points on a uae licence",
    ],
    keywords: [["tolls", "parking", "fines"], ["traffic", "fines", "points"]],
    next: ["move-transport-driving-culture", "move-transport-car-insurance", "move-life-police-and-fines"],
  },
  {
    id: "move-transport-metro-nol",
    question: "Is public transport good enough to live without a car?",
    answer:
      "In parts of Dubai along the metro and tram, and in the served parts of Abu Dhabi, yes — people do it comfortably. Elsewhere it gets hard quickly, especially in summer when a ten-minute walk to a bus stop is not a ten-minute walk you want. Get the travel card for the emirate you are in, try the journey you would actually make at the hour you would make it, and decide after that rather than before.",
    service: VISA,
    phrases: [
      "is public transport good enough to live without a car",
      "how does the dubai metro work for commuting",
      "nol card for a new resident",
      "getting to work without a car in the uae",
    ],
    keywords: [["public", "transport", "commuting"], ["metro", "nol", "card"]],
    next: ["move-transport-taxis", "move-housing-where-to-live", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-transport-taxis",
    question: "Are taxis and ride-hailing apps a realistic way to get about?",
    answer:
      "Yes, and for a first few weeks they are the sensible answer: metered taxis are plentiful and regulated, and the ride-hailing apps work as they do anywhere. As a daily commute they add up, so most people who rely on them live close to where they work. Agree nothing with an unmarked car at an airport or a mall — use the rank or the app.",
    service: VISA,
    phrases: [
      "are taxis and ride hailing apps a realistic way to get about",
      "how much do people rely on taxis in dubai",
      "uber and careem in the uae",
      "are taxis safe in abu dhabi",
    ],
    keywords: [["taxis", "ride", "hailing"], ["taxis", "rely", "commute"]],
    next: ["move-transport-metro-nol", "move-transport-car-buy-or-lease", "move-arrival-airport-transport"],
  },
  {
    id: "move-transport-intercity",
    question: "Can I live in one emirate and work in another?",
    answer:
      "Many people do, and the reason is almost always rent — which is why the commute between the northern emirates and Dubai, or between Dubai and Abu Dhabi, is one of the busiest decisions a new arrival makes. Do it with your eyes open: drive the route at rush hour before you sign, count the tolls and the fuel, and be honest about what two hours a day in a car does to a family. Buses between the emirates exist and are used.",
    service: VISA,
    phrases: [
      "can i live in one emirate and work in another",
      "commuting from sharjah to dubai every day",
      "is the dubai to abu dhabi commute doable",
      "living in ajman and working in dubai",
    ],
    keywords: [["commuting", "between", "emirates"], ["commute", "sharjah", "dubai"]],
    next: ["move-housing-where-to-live", "move-setup-different-emirate", "move-transport-car-buy-or-lease"],
  },
  {
    id: "move-transport-driving-culture",
    question: "What should I know about driving here before I start?",
    answer:
      "Speeds are high, lane discipline is variable, and enforcement is by camera almost everywhere — so the gap between how people drive and what is penalised is smaller than it looks. Keep your distance, expect undertaking, and treat the first fortnight as learning rather than commuting. Tailgating, phone use and running an amber are all ticketed, and some offences impound the car rather than fining it.",
    service: VISA,
    phrases: [
      "what should i know about driving here before i start",
      "is driving in dubai dangerous for a newcomer",
      "driving habits in the uae",
      "tips for driving in the uae as a new resident",
    ],
    keywords: [["driving", "habits", "newcomer"], ["driving", "dangerous", "tips"]],
    next: ["move-transport-salik-parking-fines", "move-transport-car-insurance", "move-life-police-and-fines"],
  },
  {
    id: "move-transport-company-car",
    question: "My employer is offering a car or a transport allowance — which is better?",
    answer:
      "A car provided by the company removes the lease, the insurance and the registration from your plate and ties you to the company's choice; an allowance is cash you can spend on a smaller car or on not having one at all. Ask two things before deciding: who pays the fines and the tolls, and what happens to the car the day you leave — people who hand back a company car on their last day often have nothing to drive to the airport in.",
    service: VISA,
    phrases: [
      "my employer is offering a car or a transport allowance which is better",
      "company car versus transport allowance in the uae",
      "is a car allowance worth taking in dubai",
      "who pays fines on a company car in the uae",
    ],
    keywords: [["company", "car", "allowance"], ["transport", "allowance", "taking"]],
    next: ["move-transport-car-buy-or-lease", "move-transport-salik-parking-fines", "move-work-contract-registration"],
  },

  /* ── Health and insurance ──────────────────────────────────────────────── */
  {
    id: "move-health-insurance-employer",
    question: "What does the health insurance my employer gives me actually cover?",
    answer:
      "Cover for the employee is required, and the requirement and its scope are set by the emirate's health authority — but policies differ enormously inside that, so the question to ask HR is for the policy document rather than the card. Read three things: which hospitals and clinics are in the network, what the co-payment is, and what is excluded, which commonly includes dentistry, optical, maternity beyond a limit and some pre-existing conditions.",
    service: VISA,
    phrases: [
      "what does the health insurance my employer gives me actually cover",
      "is health insurance compulsory for employees in the uae",
      "what is excluded from uae employer medical insurance",
      "which hospitals can i use on my company insurance in dubai",
    ],
    keywords: [["employer", "health", "insurance"], ["insurance", "network", "excluded"]],
    next: ["move-health-insurance-family", "move-health-pre-existing", "move-health-choosing-clinic"],
  },
  {
    id: "move-health-insurance-family",
    question: "Is my family covered by my employer's insurance?",
    answer:
      "Not automatically, and this is where emirates differ: in some, cover for dependants is required and whose duty it is to provide it depends on the rules there, and in others you buy it yourself — and a residence application for a dependant generally needs valid cover in place. So ask HR whether dependants are on the policy before you count on it, and price the alternative. The emirate's health authority is the place to confirm the requirement.",
    service: VISA,
    phrases: [
      "is my family covered by my employer's insurance",
      "do i have to buy health insurance for my wife in dubai",
      "dependant medical cover in the uae",
      "insurance for my children when i sponsor them in the uae",
    ],
    keywords: [["family", "covered", "insurance"], ["dependant", "medical", "cover"]],
    next: ["move-family-sponsor-requirements", "move-health-insurance-employer", "move-family-documents"],
  },
  {
    id: "move-health-choosing-clinic",
    question: "How do I find a doctor and is private or public better?",
    answer:
      "Most residents use private clinics and hospitals, because that is where their insurance network points and appointments are quick; public facilities are good and are used with a health card obtained from the emirate's authority. Pick a clinic in your network near home before you need one, register there, and ask the insurer for the current network list rather than relying on a clinic's own claim that they take your card.",
    service: VISA,
    phrases: [
      "how do i find a doctor and is private or public better",
      "registering with a clinic in dubai as a new resident",
      "public versus private hospitals in the uae",
      "how do i see a gp in the uae",
    ],
    keywords: [["find", "doctor", "clinic"], ["public", "private", "hospitals"]],
    next: ["move-health-insurance-employer", "move-health-emergency-numbers", "move-health-prescriptions"],
  },
  {
    id: "move-health-prescriptions",
    question: "Can I get my usual medication here?",
    answer:
      "Often yes, sometimes under a different brand name, and occasionally not at all or only on a specialist's prescription — because some medicines that are routine elsewhere are controlled here. Bring a doctor's letter with the generic names and enough supply to cover the first weeks, then see a local doctor early to put the prescription on a local footing. Pharmacies are everywhere and pharmacists are a good first stop for anything minor.",
    service: VISA,
    phrases: [
      "can i get my usual medication here",
      "will my prescription be available in dubai",
      "finding my medicine in the uae",
      "how do i get a repeat prescription as a new resident in the uae",
    ],
    keywords: [["usual", "medication", "available"], ["repeat", "prescription", "resident"]],
    next: ["move-before-medicines", "move-health-chronic-condition", "move-health-choosing-clinic"],
  },
  {
    id: "move-health-chronic-condition",
    question: "I have a long-term condition — what should I arrange before I move?",
    answer:
      "Three things: a written summary from your current doctor including generic drug names and recent results, enough medication to bridge the gap while you find a local specialist, and a clear read of the insurance policy on pre-existing conditions before you accept the job, since that is where exclusions bite. Care here is good and available; what catches people is a policy that does not cover the thing they already have.",
    service: VISA,
    phrases: [
      "i have a long term condition what should i arrange before i move",
      "moving to the uae with a chronic illness",
      "will my pre existing condition be covered in dubai",
      "ongoing treatment when relocating to the uae",
    ],
    keywords: [["chronic", "condition", "moving"], ["ongoing", "treatment", "relocating"]],
    next: ["move-health-pre-existing", "move-before-medical-records", "move-health-insurance-employer"],
  },
  {
    id: "move-health-pre-existing",
    question: "Are pre-existing conditions excluded from my cover?",
    answer:
      "Frequently, in whole or in part, and the detail is in the policy rather than in the law — some policies cover them after a waiting period, some exclude them, some cover them with limits. Ask for the wording before you need it, declare what you have honestly, and if the exclusion matters to you, ask whether an upgrade or a personal policy alongside the employer's is possible. Non-disclosure is the one approach that reliably ends badly.",
    service: VISA,
    phrases: [
      "are pre existing conditions excluded from my cover",
      "waiting period on uae medical insurance",
      "does uae insurance cover a condition i already had",
      "declaring a medical condition on my insurance in dubai",
    ],
    keywords: [["pre", "existing", "excluded"], ["waiting", "period", "insurance"]],
    next: ["move-health-insurance-employer", "move-health-chronic-condition", "move-health-insurance-family"],
  },
  {
    id: "move-health-maternity",
    question: "What if we are expecting a baby soon after moving?",
    answer:
      "Look hard at the maternity cover in the policy before you move, because waiting periods and limits are common and maternity is one of the most expensive things to fall outside cover. Beyond the medical side, a baby born here needs its own paperwork quickly — birth registration, a passport from your consulate and then residence — and there are deadlines attached to that which the authority sets, so ask about them in advance rather than afterwards.",
    service: VISA,
    phrases: [
      "what if we are expecting a baby soon after moving",
      "maternity cover on uae health insurance",
      "having a baby shortly after relocating to dubai",
      "pregnant and moving to the uae for my husband's job",
    ],
    keywords: [["maternity", "cover", "insurance"], ["baby", "after", "relocating"]],
    next: ["move-health-pre-existing", "move-family-documents", "move-health-insurance-family"],
  },
  {
    id: "move-health-dentist-optical",
    question: "Are dentists and opticians covered?",
    answer:
      "Usually not, or only minimally, which surprises people with children. Price a check-up before you need one, and if your family has ongoing dental or optical needs, get them done at home before you move and build the cost into your budget here. Some employers offer an upgraded policy at your own cost that includes them — worth asking HR whether that option exists.",
    service: VISA,
    phrases: [
      "are dentists and opticians covered",
      "does uae insurance include dental treatment",
      "going to the dentist in dubai as an expat",
      "eye test and glasses cover in the uae",
    ],
    keywords: [["dental", "optical", "covered"], ["dentist", "glasses", "insurance"]],
    next: ["move-health-insurance-employer", "move-money-budget", "move-health-choosing-clinic"],
  },
  {
    id: "move-health-emergency-numbers",
    question: "What do I do in a medical emergency here?",
    answer:
      "Call 998 for an ambulance, 999 for police and 997 for fire, and go to the nearest emergency department rather than looking for one in your insurance network — emergencies are treated first and the paperwork follows. Save your insurance card details on your phone, keep your Emirates ID on you, and know the name and the nearest major hospital to where you live before you need it.",
    service: VISA,
    phrases: [
      "what do i do in a medical emergency here",
      "emergency number for an ambulance in the uae",
      "which hospital do i go to in an emergency in dubai",
      "who do i call in an emergency in the uae",
    ],
    keywords: [["emergency", "ambulance", "number"], ["hospital", "emergency"]],
    next: ["move-health-choosing-clinic", "move-health-insurance-employer", "move-life-police-and-fines"],
  },
  {
    id: "move-health-vaccinations-kids",
    question: "Will my children's vaccinations be accepted here?",
    answer:
      "Bring the records and expect the school and the clinic to read them against the UAE schedule, which may mean a dose or two to catch up. Schools ask for the immunisation history at admission, so having it in English and complete saves a scramble in the first week of term. The health authority of your emirate publishes the schedule; a paediatrician here will tell you what, if anything, is outstanding.",
    service: VISA,
    phrases: [
      "will my children's vaccinations be accepted here",
      "uae vaccination schedule for my child",
      "do my kids need extra jabs when we move to dubai",
      "immunisation requirements for uae schools",
    ],
    keywords: [["children", "vaccinations", "accepted"], ["immunisation", "requirements", "schools"]],
    next: ["move-before-medical-records", "move-family-school-admission-docs", "move-health-choosing-clinic"],
  },
  {
    id: "move-health-mental-health",
    question: "Is there mental health support if the move is hard?",
    answer:
      "Yes — licensed psychologists and psychiatrists practise in every emirate, and there are helplines run by the health authorities. Two practical notes: insurance cover for it is often limited, so check the policy, and some psychiatric medications are controlled here, which affects what you can bring and what can be prescribed. Relocation is genuinely hard, and the first six months are the hardest; asking for help early is the cheap version of this.",
    service: VISA,
    phrases: [
      "is there mental health support if the move is hard",
      "finding a therapist in dubai",
      "struggling emotionally after moving to the uae",
      "counselling for expats in the uae",
    ],
    keywords: [["mental", "health", "support"], ["therapist", "counselling", "expat"]],
    next: ["move-life-homesick", "move-health-prescriptions", "move-life-making-friends"],
  },
  {
    id: "move-health-medical-fitness-vs-insurance",
    question: "Is the residence medical the same thing as my health insurance?",
    answer:
      "No, and conflating them causes real confusion. The medical fitness test is a government screening required for the residence permit, taken at an approved centre, and its result goes to the authority. Health insurance is a policy, usually arranged by your employer, that pays for your treatment afterwards. Passing the first does not mean the second exists yet, which is why the gap at the start is worth covering.",
    service: VISA,
    phrases: [
      "is the residence medical the same thing as my health insurance",
      "difference between the visa medical and medical insurance in the uae",
      "does the medical test mean i am insured in dubai",
      "visa medical versus health cover in the uae",
    ],
    keywords: [["medical", "test", "insurance", "difference"], ["screening", "versus", "insurance"]],
    next: ["move-setup-medical-when", "move-health-insurance-employer", "move-before-insurance-gap"],
  },

  /* ── Bringing the family ───────────────────────────────────────────────── */
  /**
   * Scoped deliberately against the visa pack, which owns sponsorship mechanics —
   * who may sponsor whom, age limits, deposits, what a dependant's medical
   * involves. What is here is the relocating parent's version of the question:
   * when to bring them, what to have ready, and the school year that does not
   * line up with the start date.
   */
  {
    id: "move-family-when-to-bring",
    question: "When is the right time to bring my family over?",
    answer:
      "Once your own residence permit is issued, because that is what the sponsorship runs on, and once you have somewhere for them to live and a school place if the children need one. In practice that means a gap of weeks or months rather than days. Set a target date and work backwards from the school term and the attested certificates, which are the two things that cannot be hurried.",
    service: VISA,
    phrases: [
      "when is the right time to bring my family over",
      "how soon can my family join me in the uae",
      "should my family wait until i am settled in dubai",
      "timing for bringing my wife and kids to the uae",
    ],
    keywords: [["bring", "family", "timing"], ["family", "join"]],
    next: ["move-family-sponsor-requirements", "move-family-documents", "move-before-family-timing"],
  },
  {
    id: "move-family-sponsor-requirements",
    question: "What do I need in place before I can sponsor my family?",
    answer:
      "Generally: your own residence issued, a salary that meets the threshold the authority applies, suitable registered accommodation, attested and translated proof of the relationship, and valid health cover for each dependant. Every one of those specifics — the income expected, how accommodation is assessed, what counts as proof — is set by ICP or the emirate's GDRFA and is revised, so take the current requirement from them or from the provider filing it rather than from any guide.",
    service: VISA,
    phrases: [
      "what do i need in place before i can sponsor my family",
      "requirements to bring my wife to the uae on my visa",
      "what does the authority ask for when i sponsor my children",
      "conditions for a family residence application in the uae",
    ],
    keywords: [["sponsor", "family", "requirements"], ["bring", "wife", "requirements"]],
    next: ["move-family-documents", "move-housing-for-family-visa", "move-health-insurance-family"],
  },
  {
    id: "move-family-documents",
    question: "Which documents will my family's application need?",
    answer:
      "Passports and photographs, your own residence and Emirates ID, an attested marriage certificate for a spouse and attested birth certificates for children, your salary certificate or contract, the registered tenancy, and health cover for each person — with legal translation into Arabic where it is asked for. Start the attestation of the marriage and birth certificates at home before you move: that single step is the usual reason a family application sits for months.",
    service: ATTEST,
    phrases: [
      "which documents will my family's application need",
      "papers needed to sponsor my wife and children in the uae",
      "document list for a uae dependant visa",
      "what do i submit for my family's residence in dubai",
    ],
    keywords: [["documents", "family", "application"], ["papers", "sponsor", "children"]],
    next: ["move-papers-marriage-birth", "move-family-sponsor-requirements", "move-papers-translation"],
  },
  {
    id: "move-family-spouse-working",
    question: "Can my husband or wife work while on my sponsorship?",
    answer:
      "Yes, with a work permit obtained by their employer — being on your sponsorship does not prevent employment, it just means the permit is a separate step the employer has to take, and the labour authority decides it. That is worth saying plainly before a move, because a trailing spouse who assumed they could pick up work on arrival sometimes finds the search longer than expected. They can start looking before the residence is finished.",
    service: VISA,
    phrases: [
      "can my husband or wife work while on my sponsorship",
      "is my spouse allowed to work on my visa in dubai",
      "does my wife need her own permit to work in the uae",
      "working on a dependant visa in the uae",
    ],
    keywords: [["spouse", "work", "sponsorship"], ["dependant", "permit", "working"]],
    next: ["move-family-spouse-settling", "move-family-sponsor-requirements", "move-work-contract-registration"],
  },
  {
    id: "move-family-spouse-settling",
    question: "How does a spouse who gave up their career settle in?",
    answer:
      "It is the most underestimated part of a move and the commonest reason families go home early, so treat it as a shared project rather than their problem. The practical levers are a work permit through an employer, a freelance or part-time route if one fits, study, volunteering, and deliberately building a circle that is not your colleagues. Agree before you come what they are moving towards, not only what you are.",
    service: CV,
    phrases: [
      "how does a spouse who gave up their career settle in",
      "my wife is giving up her job to move with me to dubai",
      "trailing spouse in the uae",
      "what will my partner do when we relocate to the uae",
    ],
    keywords: [["spouse", "career", "settle"], ["partner", "giving", "job"]],
    next: ["move-family-spouse-working", "move-life-making-friends", "move-life-homesick"],
  },
  {
    id: "move-family-schools-finding",
    question: "How do I find a school for my children?",
    answer:
      "Start with the curriculum you want to keep them in — British, American, IB, Indian and others all operate here — then look at the schools near where you would live, and read the official inspection ratings, which the regulator publishes for each emirate. Visit if you can, or ask for a video tour. Places in the popular schools go early, and admission usually involves an assessment, so apply to more than one.",
    service: VISA,
    phrases: [
      "how do i find a school for my children",
      "choosing a school in dubai for my kids",
      "which curriculum should my child follow in the uae",
      "are uae schools inspected and rated",
    ],
    keywords: [["find", "school", "children"], ["curriculum", "school", "choosing"]],
    next: ["move-family-school-admission-docs", "move-family-school-fees-timing", "move-family-school-mid-year"],
  },
  {
    id: "move-family-school-admission-docs",
    question: "What does a school ask for at admission?",
    answer:
      "Typically the child's passport and visa or entry permit, Emirates ID once issued, passport photographs, the attested birth certificate, recent report cards, a transfer certificate from the previous school, and the immunisation record. Some of those have to be requested before you leave your current country, and the transfer certificate in particular is far easier to get while your child is still enrolled.",
    service: ATTEST,
    phrases: [
      "what does a school ask for at admission",
      "documents for school admission in dubai",
      "what papers does a uae school need for my child",
      "enrolment requirements for schools in the uae",
    ],
    keywords: [["school", "admission", "documents"], ["enrolment", "requirements", "school"]],
    next: ["move-papers-school-transfer-certificate", "move-health-vaccinations-kids", "move-family-schools-finding"],
  },
  {
    id: "move-family-school-fees-timing",
    question: "How do school fees work and when are they due?",
    answer:
      "Fees are set by each school within the framework its regulator applies, are published, and are normally paid per term with a deposit to hold the place — so the first payment often falls before your first salary, which is the part that catches families out. Ask whether your employer contributes, because some packages include schooling for a number of children and some do not mention it at all. Get that in the contract rather than in conversation.",
    service: VISA,
    phrases: [
      "how do school fees work and when are they due",
      "when do i have to pay school fees in dubai",
      "does my employer pay for my children's schooling in the uae",
      "termly school payments in the uae",
    ],
    keywords: [["school", "fees", "due"], ["employer", "pays", "schooling"]],
    next: ["move-money-budget", "move-family-schools-finding", "move-money-setup-costs"],
  },
  {
    id: "move-family-school-mid-year",
    question: "Can my child start school in the middle of the year?",
    answer:
      "Often yes, subject to a place existing in that year group, and schools here are used to families arriving off-cycle. Two things to check: whether the year groups line up with the system you are leaving, since the cut-off dates differ and a child can land a year ahead or behind, and whether the school will assess them for placement. Ask the school directly, with the reports in front of them.",
    service: VISA,
    phrases: [
      "can my child start school in the middle of the year",
      "joining a dubai school mid term",
      "we are moving in january and my child is in school",
      "will my child repeat a year when we move to the uae",
    ],
    keywords: [["start", "school", "middle"], ["joining", "school", "term"]],
    next: ["move-family-schools-finding", "move-family-school-admission-docs", "move-before-school-timing"],
  },
  {
    id: "move-family-nursery",
    question: "What about nurseries for a child too young for school?",
    answer:
      "Nurseries are plentiful, licensed and regulated by the authority in each emirate, and they publish inspection information in much the way schools do. They fill up in popular areas, and hours vary from a few mornings to a full working day, which is the detail that decides whether two parents can both work. Visit, ask about the staff-to-child ratio, and check what the fee includes.",
    service: VISA,
    phrases: [
      "what about nurseries for a child too young for school",
      "finding a nursery in dubai",
      "childcare options when we move to the uae",
      "are nurseries regulated in the uae",
    ],
    keywords: [["nursery", "childcare"], ["nurseries", "regulated"]],
    next: ["move-family-maid-nanny", "move-family-schools-finding", "move-family-spouse-working"],
  },
  {
    id: "move-family-maid-nanny",
    question: "Can we employ a nanny or a housemaid?",
    answer:
      "Yes, and it has to be done properly: a domestic worker is employed under a specific route with its own permit and contract, arranged through the authorised centres and the labour authority rather than privately. Employing someone who is on another person's sponsorship, or on a visit visa, exposes both of you — the penalties fall on the employer as well as the worker. Budget for the full cost of doing it correctly, including cover and end-of-service.",
    service: VISA,
    phrases: [
      "can we employ a nanny or a housemaid",
      "how do i hire a maid in dubai legally",
      "sponsoring a domestic worker in the uae",
      "part time cleaner or live in nanny in the uae",
    ],
    keywords: [["nanny", "housemaid", "employ"], ["domestic", "worker", "sponsoring"]],
    next: ["move-family-nursery", "move-family-sponsor-requirements", "move-life-what-surprises"],
  },
  {
    id: "move-family-pets-arriving",
    question: "What happens when my pet arrives?",
    answer:
      "The animal is cleared on the import permit and the health certificate, usually at the cargo terminal rather than with you, and many people use a pet relocation agent precisely because that step is fiddly. Before the flight, check the building: many towers restrict pets or ban certain sizes and breeds, and a tenancy signed without asking is a problem that ends badly for the animal. There are vets in every district and a licence requirement for dogs in some emirates.",
    service: VISA,
    phrases: [
      "what happens when my pet arrives",
      "collecting my dog from dubai cargo",
      "are pets allowed in dubai apartments",
      "registering a dog in the uae",
    ],
    keywords: [["pet", "arrives", "cargo"], ["pets", "allowed", "apartments"]],
    next: ["move-before-pets", "move-housing-contract-check", "move-housing-first-steps"],
  },
  {
    id: "move-family-parents-visiting",
    question: "Can my parents come and visit once I am settled?",
    answer:
      "Visitors are straightforward, and a resident can arrange a visit for family — the routes, the durations and the conditions are set by ICP or the emirate's GDRFA and differ, so check the current ones when you are ready rather than now. Longer-term sponsorship of a parent is a different and more demanding application, with its own income, insurance and deposit conditions. Either way, get travel insurance for them: visitors are not covered by your policy.",
    service: VISA,
    phrases: [
      "can my parents come and visit once i am settled",
      "bringing my mother to the uae on a visit",
      "visa for my family to visit me in dubai",
      "can i sponsor a visit for my relatives in the uae",
    ],
    keywords: [["parents", "visit", "settled"], ["family", "visit", "sponsor"]],
    next: ["move-family-when-to-bring", "move-family-sponsor-requirements", "move-health-insurance-family"],
  },
  {
    id: "move-family-left-behind",
    question: "How do people manage family they have left at home?",
    answer:
      "Deliberately, is the honest answer. Decide what you are sending and when, and keep it to something that survives a bad month here rather than a promise you have to borrow to keep. Fix a routine for calls that works across the time difference, and plan the first trip home before you leave, because having a date makes the first months easier for everybody. Remember that some calling apps are restricted here, so agree the method in advance.",
    service: VISA,
    phrases: [
      "how do people manage family they have left at home",
      "supporting my family back home from the uae",
      "staying in touch with family while working in dubai",
      "i am moving alone and leaving my children behind",
    ],
    keywords: [["family", "back", "home", "supporting"], ["staying", "touch", "family"]],
    next: ["move-money-transfer-home", "move-life-homesick", "move-family-when-to-bring"],
  },
  {
    id: "move-family-single-parent",
    question: "I am a single parent — does that change the paperwork?",
    answer:
      "It can, because the authority looks at custody as well as parentage: a sponsorship application for a child commonly needs evidence of custody or the other parent's consent, and those documents have to be attested and translated like any other. A mother sponsoring on her own may face additional conditions. Get the custody order or consent sorted and legalised before you move, and have the provider filing the application confirm what the authority wants in your case.",
    service: ATTEST,
    phrases: [
      "i am a single parent does that change the paperwork",
      "custody documents for bringing my child to the uae",
      "divorced and sponsoring my child in dubai",
      "can a mother sponsor her children in the uae",
    ],
    keywords: [["single", "parent", "custody"], ["custody", "documents", "child"]],
    next: ["move-family-documents", "move-papers-marriage-birth", "move-family-sponsor-requirements"],
  },

  /* ── Daily life, custom and law ─────────────────────────────────────────── */
  /**
   * The cluster that exists because the alternative is a model improvising about
   * criminal law. Everything here states the shape of a rule and then names who
   * sets it, and the entries about alcohol, drugs, speech and personal status say
   * explicitly that we are not lawyers — a confident paragraph on any of them,
   * published under the company's name, is the worst thing in this file.
   */
  {
    id: "move-life-what-surprises",
    question: "What surprises people most in their first months here?",
    answer:
      "Usually four things: how much of the first year's money goes in the first month, how far apart places are once you are driving them, how hard the summer is, and how quickly a social life has to be built from scratch because colleagues come and go. The pleasant surprises are the practical ones — things work, deliveries arrive, it is safe, and almost everything is done in English.",
    service: VISA,
    phrases: [
      "what surprises people most in their first months here",
      "what nobody tells you about moving to dubai",
      "biggest shocks when relocating to the uae",
      "what should i be prepared for when i move to the uae",
    ],
    keywords: [["surprises", "first", "months"], ["shocks", "relocating"]],
    next: ["move-money-setup-costs", "move-life-summer-heat", "move-life-making-friends"],
  },
  {
    id: "move-life-public-behaviour",
    question: "What behaviour will get me in trouble here?",
    answer:
      "The things to actually internalise: public drunkenness and drinking outside licensed premises, aggression or rude gestures in a traffic dispute, swearing at anyone including in a message, photographing people without consent, and public displays of affection beyond the modest. These are matters of law rather than etiquette and are enforced. We are not lawyers; if something has already happened, take legal advice rather than advice from a forum.",
    service: VISA,
    phrases: [
      "what behaviour will get me in trouble here",
      "things that are illegal in the uae that surprise people",
      "what should i not do in public in dubai",
      "uae laws a newcomer should know",
    ],
    keywords: [["behaviour", "trouble", "illegal"], ["laws", "newcomer", "know"]],
    next: ["move-life-social-media-law", "move-life-alcohol", "move-life-drugs-zero-tolerance"],
  },
  {
    id: "move-life-social-media-law",
    question: "Do I have to be careful what I post online?",
    answer:
      "Yes, and more careful than you are used to. The cyber crime and defamation provisions here cover insulting someone, accusing them publicly, sharing another person's photograph or a video of them without consent, and posting material considered offensive — and a complaint can follow a post that would pass without comment elsewhere. Treat a group chat as public. If a complaint has been made against you, that is a lawyer's question, not ours.",
    service: VISA,
    phrases: [
      "do i have to be careful what i post online",
      "social media laws in the uae",
      "can i be sued for a whatsapp message in dubai",
      "defamation law in the uae for expats",
    ],
    keywords: [["social", "media", "posting"], ["defamation", "online", "complaint"]],
    next: ["move-life-public-behaviour", "move-life-police-and-fines", "move-trouble-complaint-mohre"],
  },
  {
    id: "move-life-alcohol",
    question: "What are the rules about alcohol?",
    answer:
      "Alcohol is sold and served in licensed venues and shops in most emirates and not in all of them — Sharjah is dry — and the rules on personal licences, home consumption and purchase have changed in recent years, differ by emirate and are set by each emirate's own authority. What has not changed: drinking or being drunk in public is an offence, and there is no tolerance at all on drink driving. Check your own emirate's current rules rather than a colleague's memory.",
    service: VISA,
    phrases: [
      "what are the rules about alcohol",
      "can i drink alcohol in dubai as a resident",
      "do i need an alcohol licence in the uae",
      "is alcohol allowed in sharjah",
    ],
    keywords: [["alcohol", "rules", "licence"], ["drink", "alcohol", "resident"]],
    next: ["move-life-public-behaviour", "move-arrival-customs-limits", "move-life-ramadan"],
  },
  {
    id: "move-life-drugs-zero-tolerance",
    question: "How strict is the UAE on drugs?",
    answer:
      "As strict as anywhere in the world, and the point to understand before you fly is that it extends to things you may not think of as drugs: cannabis products including CBD oils and edibles that are legal at home, poppy seeds in some forms, and certain prescription medicines without the required approval. Trace amounts have led to prosecution. There is no version of this worth risking, and if something has gone wrong the only sensible step is a lawyer immediately.",
    service: VISA,
    phrases: [
      "how strict is the uae on drugs",
      "is cbd oil illegal in dubai",
      "zero tolerance drug laws in the uae",
      "what happens if you are caught with drugs in the uae",
    ],
    keywords: [["drugs", "tolerance", "laws"], ["cbd", "illegal"]],
    next: ["move-before-medicines", "move-life-public-behaviour", "move-arrival-customs-limits"],
  },
  {
    id: "move-life-personal-status-law",
    question: "Will my personal circumstances be a problem under UAE law?",
    answer:
      "Family and personal status law here differs from what many people are used to — on marriage, cohabitation, children born outside marriage, inheritance and divorce — and reforms in recent years have changed parts of it for non-Muslim residents, including a civil family law in some emirates. Which rules apply to you depends on your nationality, your religion and where you live, and the consequences are serious enough that this is a question for a lawyer before you move rather than for a chat window. We will not guess at it.",
    service: VISA,
    phrases: [
      "will my personal circumstances be a problem under uae law",
      "can an unmarried couple live together in dubai",
      "personal status law for expats in the uae",
      "inheritance rules for foreigners in the uae",
    ],
    keywords: [["personal", "status", "law"], ["unmarried", "couple", "living"]],
    next: ["move-life-public-behaviour", "move-family-documents", "move-us-talk-to-someone"],
  },
  {
    id: "move-life-ramadan",
    question: "What changes during Ramadan?",
    answer:
      "Working hours are reduced, the rhythm of the day shifts later, and eating, drinking or smoking in public during daylight is not done — including in your car. Restaurants and deliveries operate, and in recent years much is open through the day, but the courtesy matters and so does the law. It is also the most pleasant month to be here socially once you adjust, and the evening invitations are genuine ones.",
    service: VISA,
    phrases: [
      "what changes during ramadan",
      "working hours in ramadan in the uae",
      "can i eat in public during ramadan in dubai",
      "what should a new expat know about ramadan",
    ],
    keywords: [["ramadan", "hours", "working"], ["ramadan", "eating", "public"]],
    next: ["move-life-public-behaviour", "move-work-leave-first-year", "move-life-weekend"],
  },
  {
    id: "move-life-dress-code",
    question: "How should I dress day to day?",
    answer:
      "Normally, with a little more coverage than you might at home. Offices are business or smart casual; malls, government offices and residential areas expect shoulders and knees covered, and some display that as a request at the door; swimwear belongs at the pool and the beach rather than the shops. Mosques ask for more, and provide it. Sharjah and the northern emirates are more conservative than Dubai in practice.",
    service: VISA,
    phrases: [
      "how should i dress day to day",
      "dress code in dubai for expats",
      "what can women wear in the uae",
      "is there a dress code in uae malls",
    ],
    keywords: [["dress", "code"], ["wear", "clothes", "public"]],
    next: ["move-before-packing", "move-life-public-behaviour", "move-life-summer-heat"],
  },
  {
    id: "move-life-weekend",
    question: "When is the weekend and what are the working days?",
    answer:
      "The federal government works Monday to Friday with a shortened Friday, and the private sector sets its own pattern — which means Saturday and Sunday for many employers and Friday and Saturday for others, and a few still work six days. Schools generally follow the public pattern. Check your contract rather than assuming, because it affects everything from childcare to seeing family abroad.",
    service: VISA,
    phrases: [
      "when is the weekend and what are the working days",
      "is the weekend saturday and sunday in the uae",
      "what days do people work in dubai",
      "friday working hours in the uae",
    ],
    keywords: [["weekend", "working", "days"], ["days", "work", "week"]],
    next: ["move-work-leave-first-year", "move-life-ramadan", "move-work-public-holidays"],
  },
  {
    id: "move-life-religion",
    question: "Can I practise my own religion here?",
    answer:
      "Yes — the UAE hosts churches, temples and gurdwaras alongside its mosques, and congregations of most faiths meet openly in dedicated places of worship. What is not permitted is preaching to convert others or disrespecting Islam, in public or online. You will hear the call to prayer five times a day, and public life pauses for it briefly in some places; most newcomers find it one of the better parts of being here.",
    service: VISA,
    phrases: [
      "can i practise my own religion here",
      "are there churches in dubai",
      "religious freedom for expats in the uae",
      "is there a temple in the uae",
    ],
    keywords: [["practise", "religion"], ["churches", "temples", "worship"]],
    next: ["move-life-what-surprises", "move-life-public-behaviour", "move-life-making-friends"],
  },
  {
    id: "move-life-summer-heat",
    question: "How do people cope with the summer?",
    answer:
      "By rearranging the day around it: errands early or late, the car parked in shade, water carried everywhere, and holidays taken in the worst weeks if the job allows — which is why so many families travel in July and August. Indoor life is comprehensive, from malls to pools that are cooled. Outdoor workers have a legally mandated break in the middle of the day during the hottest months, and heat exhaustion in a newcomer is a real risk rather than a figure of speech.",
    service: VISA,
    phrases: [
      "how do people cope with the summer",
      "how hot does it get in dubai in summer",
      "surviving the uae heat as a new resident",
      "what months are the worst heat in the uae",
    ],
    keywords: [["cope", "summer", "heat"], ["surviving", "heat", "resident"]],
    next: ["move-arrival-summer", "move-life-what-surprises", "move-work-leave-first-year"],
  },
  {
    id: "move-life-food-groceries",
    question: "Will I be able to find the food I am used to?",
    answer:
      "Almost certainly. Supermarkets here carry British, Indian, Filipino, Arab, East Asian and European ranges, there are specialist grocers for most cuisines, and delivery covers nearly everything. Pork is sold in a separate licensed section in many supermarkets rather than on the main shelves. Fresh produce is largely imported, so prices move with the season and with the source.",
    service: VISA,
    phrases: [
      "will i be able to find the food i am used to",
      "can i buy pork in dubai",
      "grocery shopping as an expat in the uae",
      "is there halal and non halal food in uae supermarkets",
    ],
    keywords: [["food", "groceries", "supermarket"], ["buy", "pork"]],
    next: ["move-arrival-shopping-basics", "move-life-what-surprises", "move-money-budget"],
  },
  {
    id: "move-life-tipping",
    question: "Is tipping expected and how do service charges work?",
    answer:
      "Tipping is customary rather than compulsory, and a service charge on a restaurant bill does not necessarily reach the staff — so a small cash tip is normal and appreciated. Rounding up for a taxi, something for a delivery rider in the summer heat, and a note for a petrol attendant are the usual habits. Nobody will be rude about it if you do not, but the people doing those jobs are often the lowest paid in the country.",
    service: VISA,
    phrases: [
      "is tipping expected and how do service charges work",
      "do you tip in dubai",
      "service charge on restaurant bills in the uae",
      "tipping taxi drivers in the uae",
    ],
    keywords: [["tipping", "service", "charge"], ["tip", "taxi", "delivery"]],
    next: ["move-money-cash-day-to-day", "move-life-food-groceries", "move-life-what-surprises"],
  },
  {
    id: "move-life-police-and-fines",
    question: "How do I deal with the police or an official fine?",
    answer:
      "Politely and promptly, and through the official channel rather than the person in front of you: 999 for an emergency, the non-emergency police line or app for everything else, and the authority's own app to see and settle a fine. Police here are generally straightforward to deal with and corruption is not the problem it is in some places. For anything that could become a criminal matter, get a lawyer before giving a statement.",
    service: VISA,
    phrases: [
      "how do i deal with the police or an official fine",
      "what do i do if i am stopped by police in dubai",
      "paying a fine in the uae",
      "do i need a lawyer for a police complaint in the uae",
    ],
    keywords: [["police", "stopped", "fine"], ["paying", "fine", "authority"]],
    next: ["move-transport-salik-parking-fines", "move-life-public-behaviour", "move-trouble-complaint-mohre"],
  },
  {
    id: "move-life-making-friends",
    question: "How do people make friends after moving here?",
    answer:
      "Actively, because almost nobody arrives with a network and everyone else is in the same position — which makes it easier than it sounds. The routes that work are sport and gym groups, hobby and running clubs, national and alumni associations, places of worship, your children's school gate, and the colleagues you make an effort with outside work. Expect turnover: people leave, and the friendships that last are the ones you maintain deliberately.",
    service: VISA,
    phrases: [
      "how do people make friends after moving here",
      "meeting people as a new expat in dubai",
      "social life for newcomers in the uae",
      "i am lonely since moving to the uae",
    ],
    keywords: [["make", "friends", "meeting"], ["social", "life", "newcomers"]],
    next: ["move-life-homesick", "move-family-spouse-settling", "move-life-what-surprises"],
  },
  {
    id: "move-life-homesick",
    question: "What if I regret the move or feel homesick?",
    answer:
      "It is close to universal somewhere in the first year, and it usually peaks after the novelty and before the routine — around three to six months in. The things that help are unglamorous: a routine, something physical, one standing social commitment, a planned trip home, and talking to people who went through it rather than people who did not. If it is not lifting, mental health support here is good and worth using; relocation regret is a known thing, not a character flaw.",
    service: VISA,
    phrases: [
      "what if i regret the move or feel homesick",
      "i am struggling after relocating to dubai",
      "homesickness as a new expat in the uae",
      "should i go back home after moving to the uae",
    ],
    keywords: [["regret", "move", "homesick"], ["struggling", "after", "relocating"]],
    next: ["move-health-mental-health", "move-life-making-friends", "move-family-spouse-settling"],
  },
  {
    id: "move-life-arabic",
    question: "Do I need to learn Arabic?",
    answer:
      "You can live and work here entirely in English, and most people do — but Arabic is the official language, it appears on official documents and signage, and learning some of it changes how you are received, particularly outside the big cities. If nothing else, learn the greetings and the courtesies. For anything official that arrives in Arabic only, use a legal translator rather than an app.",
    service: TRANSLATE,
    phrases: [
      "do i need to learn arabic",
      "can i live in dubai without speaking arabic",
      "is english enough in the uae",
      "should i learn arabic before moving to the uae",
    ],
    keywords: [["learn", "arabic"], ["english", "enough", "speaking"]],
    next: ["move-papers-translation", "move-life-what-surprises", "move-housing-contract-check"],
  },

  /* ── The first weeks at work ───────────────────────────────────────────── */
  /**
   * Eight entries rather than twenty, on purpose. Labour law — probation, notice,
   * leave minimums, overtime, gratuity, WPS, payslips — is already answered
   * properly in ./job-search-flows.ts, and writing a second set of answers to the
   * same questions would put two entries in competition for every phrasing and
   * make the loser unreachable. What is here is only what is specific to having
   * just arrived: which document now governs you, what the first payslip should
   * look like, and what resigning early does to a residence you have just moved a
   * family onto.
   */
  {
    id: "move-work-contract-registration",
    question: "I signed an offer before I flew — what am I signing now that I am here?",
    answer:
      "The contract that is registered with the labour authority, and that registered contract is the one that governs your employment — not the offer email, not the recruiter's description. Read it before you sign it even though everyone is waiting, check the job title, salary, basic-versus-allowance split, notice and leave against what you were promised, and ask for your own copy afterwards. If it differs from the offer, say so before signing rather than after.",
    service: VISA,
    phrases: [
      "i signed an offer before i flew what am i signing now that i am here",
      "which contract counts the one i signed abroad or the one here",
      "my employer is asking me to sign a new contract after arriving in dubai",
      "do i sign another contract when i arrive in the uae",
    ],
    keywords: [["signed", "offer", "before"], ["another", "contract", "arriving"]],
    next: ["move-trouble-contract-different", "move-setup-labour-card", "move-work-first-payslip"],
  },
  {
    id: "move-work-first-day",
    question: "What should I take with me on my first day?",
    answer:
      "Your passport and entry permit, several passport photographs, copies of your certificates, your bank details once you have them, and the name and number of whoever in HR is handling your paperwork. Expect the first days to be administrative rather than productive — medical, biometrics, forms — and expect to be asked for a document you were not told about, which is why the copies are worth carrying.",
    service: VISA,
    phrases: [
      "what should i take with me on my first day",
      "what do i need to bring to my first day of work in dubai",
      "first day at a new job in the uae",
      "what happens on my first day at a uae company",
    ],
    keywords: [["first", "day", "bring"], ["first", "day", "work"]],
    next: ["move-setup-order", "move-work-contract-registration", "move-work-culture"],
  },
  {
    id: "move-work-culture",
    question: "What is the workplace culture like for a newcomer?",
    answer:
      "Mixed, in the literal sense: your colleagues will be from many countries and the norms are a blend rather than a single national style. Hierarchy tends to be respected more than in northern Europe or North America, relationships matter in getting things done, and the working week may not be the one you are used to. Learn the greetings, be careful with humour across languages, and watch how decisions actually get made in your first month before trying to change any of it.",
    service: CV,
    phrases: [
      "what is the workplace culture like for a newcomer",
      "office culture in dubai for expats",
      "how do uae workplaces differ from back home",
      "adjusting to working in the uae",
    ],
    keywords: [["workplace", "culture", "office"], ["adjusting", "working"]],
    next: ["move-work-first-day", "move-life-what-surprises", "move-life-arabic"],
  },
  {
    id: "move-work-public-holidays",
    question: "How do public holidays work and can I plan a trip home around them?",
    answer:
      "Public holidays are announced for the year and some of the religious ones move with the lunar calendar, so the exact dates are confirmed closer to the time rather than fixed a year out. Build any trip home around the school terms and your own leave rather than around a holiday you have assumed. Your employer's leave policy and the statutory minimums are the two things to read together.",
    service: VISA,
    phrases: [
      "how do public holidays work and can i plan a trip home around them",
      "when are the uae public holidays announced",
      "do holiday dates change in the uae",
      "planning a visit home around uae holidays",
    ],
    keywords: [["public", "holidays", "announced"], ["holiday", "dates", "change"]],
    next: ["move-work-leave-first-year", "move-life-weekend", "move-life-ramadan"],
  },
  {
    id: "move-work-leave-first-year",
    question: "Can I take leave in my first few months if I need to go home?",
    answer:
      "In practice it depends on your employer and on how leave accrues in your first year, and most will accommodate something genuine — a wedding, an illness at home — even when the entitlement has not built up yet. Ask early and in writing rather than close to the date, and be aware that travelling while your residence paperwork is still in progress is a separate question from whether leave is granted.",
    service: VISA,
    phrases: [
      "can i take leave in my first few months if i need to go home",
      "annual leave during my first year in a uae job",
      "can i travel home soon after starting work in dubai",
      "does leave accrue from day one in the uae",
    ],
    keywords: [["leave", "first", "months"], ["travel", "home", "soon"]],
    next: ["move-setup-travel-during", "move-work-public-holidays", "move-trouble-family-emergency-home"],
  },
  {
    id: "move-work-first-payslip",
    question: "My first salary is less than I expected — why?",
    answer:
      "Common reasons, and worth checking in this order: a part-month because of your start date and the payroll cut-off, the split between basic and allowances being different from what you had in mind, a deduction for something the employer advanced, or the insurance or unemployment-scheme subscription being taken. Compare the payslip against the registered contract line by line, and ask HR about any difference in writing — politely, and early, because the first month sets the pattern.",
    service: VISA,
    phrases: [
      "my first salary is less than i expected",
      "my first pay in dubai was lower than my contract",
      "deductions on my first uae payslip",
      "why is my salary different from the offer in the uae",
    ],
    keywords: [["first", "salary", "lower"], ["deductions", "payslip"]],
    next: ["move-work-contract-registration", "move-trouble-salary-unpaid", "move-money-salary-wps"],
  },
  {
    id: "move-work-probation-exposure",
    question: "I am on probation and I have just moved my family — how exposed am I?",
    answer:
      "More than someone who moved alone, and it is worth being clear-eyed about it: if the employment ends during probation, your residence and your dependants' residence are tied to it, and a grace period follows rather than an open-ended stay. Keep a cash reserve, keep your documents and payslips, do not commit to a long tenancy or a loan in the first months if you can avoid it, and read the probation clause against MOHRE's own guidance rather than the employer's summary.",
    service: VISA,
    phrases: [
      "i am on probation and i have just moved my family how exposed am i",
      "what happens to my family if i lose my job during probation in the uae",
      "risk of relocating during a probation period in dubai",
      "is it safe to move my family before probation ends",
    ],
    keywords: [["probation", "family", "moved"], ["probation", "relocating", "risk"]],
    next: ["move-work-resign-soon", "move-trouble-terminated-early", "move-money-budget"],
  },
  {
    id: "move-work-resign-soon",
    question: "What happens if I want to leave this job soon after relocating?",
    answer:
      "Three separate consequences, and people usually think of only the first: the notice and any clause in your registered contract, the effect on your residence — which was issued through this employer and would be cancelled, with a grace period and the same consequence for your dependants — and the practical matters of a tenancy, school fees and anything you have borrowed. None of it makes leaving impossible; all of it is easier with a plan and worse as a surprise.",
    service: VISA,
    phrases: [
      "what happens if i want to leave this job soon after relocating",
      "resigning a few months after moving to the uae",
      "can i change employer soon after arriving in dubai",
      "quitting my new uae job and what happens to my visa",
    ],
    keywords: [["resigning", "after", "relocating"], ["change", "employer", "soon"]],
    next: ["move-work-probation-exposure", "move-trouble-leaving-quickly", "move-housing-leaving-early"],
  },

  /* ── When it goes wrong ────────────────────────────────────────────────── */
  /**
   * The cluster that most needs to say less rather than more. Each answer names
   * the authority that actually handles the thing and says plainly where a lawyer
   * is needed, because a confident paragraph about a labour dispute or a debt is
   * exactly the advice somebody would act on, from a position of no leverage, in
   * a country they arrived in last month.
   */
  {
    id: "move-trouble-offer-withdrawn-on-arrival",
    question: "I have arrived and the job has fallen through — what now?",
    answer:
      "Get it in writing first: ask the employer to confirm in an email that the role is withdrawn, because everything else depends on having that. Then deal with your status, since an entry permit issued for employment does not simply continue — the authority decides what is possible, and your options differ depending on whether a permit was issued, whether residence was completed and how long you have been here. It is worth a conversation with someone who handles these filings daily, quickly, rather than waiting.",
    service: VISA,
    phrases: [
      "i have arrived and the job has fallen through",
      "my employer cancelled my job after i moved to dubai",
      "the company withdrew my offer after i arrived in the uae",
      "i relocated and there is no job waiting",
    ],
    keywords: [["job", "fallen", "through"], ["cancelled", "after", "arrived"]],
    next: ["move-trouble-complaint-mohre", "move-us-talk-to-someone", "move-trouble-leaving-quickly"],
  },
  {
    id: "move-trouble-salary-unpaid",
    question: "I have not been paid — what can I do about it?",
    answer:
      "Raise it in writing with your employer first and keep the reply, because a paper trail is what any later step runs on. If it is not resolved, the labour authority is where a wage complaint goes — MOHRE for mainland employment, your free zone authority if you are inside a zone — and they have a channel and an app for exactly this. Keep your contract, your payslips and your bank statements together, and do not resign or stop attending on the strength of advice from a group chat.",
    service: VISA,
    phrases: [
      "i have not been paid what can i do about it",
      "my employer in dubai is not paying my salary",
      "how do i complain about unpaid wages in the uae",
      "salary delayed for months in the uae",
    ],
    keywords: [["unpaid", "salary", "complain"], ["employer", "paying", "late"]],
    next: ["move-trouble-complaint-mohre", "move-money-salary-wps", "move-work-first-payslip"],
  },
  {
    id: "move-trouble-passport-withheld",
    question: "My employer will not give my passport back — is that allowed?",
    answer:
      "No. Your passport is your property, and an employer holding it against your will is not something you have to accept, whatever the custom in a particular office. Ask for it in writing, keep the request, and if it is still not returned, raise it with the labour authority — MOHRE or your free zone — and with your own embassy or consulate, who deal with this regularly. Do not hand it over again without a dated receipt.",
    service: VISA,
    phrases: [
      "my employer will not give my passport back",
      "company is refusing to return my passport in dubai",
      "is it legal for a uae employer to keep my passport",
      "how do i get my passport back from my employer",
    ],
    keywords: [["passport", "back", "refusing"], ["employer", "keeping", "passport"]],
    next: ["move-trouble-complaint-mohre", "move-setup-passport-with-employer", "move-papers-employer-keeps-originals"],
  },
  {
    id: "move-trouble-asked-to-pay-visa-costs",
    question: "My employer wants me to pay for my own work permit — is that right?",
    answer:
      "For a genuine employment permit the employer carries the government cost of the permit and residence; that is the legal position, and being asked to pay for your own is worth questioning rather than accepting quietly. What you may legitimately pay for is your own document attestation and translation. If a deduction has already been taken from your salary for it, keep the payslip — that is the evidence, and the labour authority is where the question belongs.",
    service: VISA,
    phrases: [
      "my employer wants me to pay for my own work permit",
      "is it legal for a company to deduct visa costs from my salary in the uae",
      "should i pay for my own residence visa for a job in dubai",
      "employer charging me for my work permit in the uae",
    ],
    keywords: [["deduct", "visa", "salary"], ["paying", "work", "permit"]],
    next: ["move-trouble-complaint-mohre", "move-work-first-payslip", "move-setup-who-does-it"],
  },
  {
    id: "move-trouble-contract-different",
    question: "The contract here is not what I was offered — what do I do?",
    answer:
      "Do not sign it, and do not sign it on a promise that it will be corrected afterwards — once it is registered, it is the contract. Put the difference in an email, quoting the original offer, and ask for the registered contract to match it. If you have already signed and it is materially different from what you were offered, that is a dispute the labour authority deals with, and keeping the offer, the emails and the recruiter's messages is what makes it arguable.",
    service: VISA,
    phrases: [
      "the contract here is not what i was offered",
      "my uae contract has a lower salary than the offer letter",
      "my job title changed when i arrived in dubai",
      "employer changed the terms after i relocated",
    ],
    keywords: [["contract", "different", "offered"], ["terms", "changed", "after"]],
    next: ["move-work-contract-registration", "move-trouble-complaint-mohre", "move-us-talk-to-someone"],
  },
  {
    id: "move-trouble-terminated-early",
    question: "I have been let go soon after moving — where does that leave me?",
    answer:
      "With three things to deal with at once: your final entitlements, your residence, which was issued through that employer and will be cancelled with a grace period following, and your family's residence if they are on yours. Ask for the termination in writing with the reason and the final settlement in it, keep every document, and if the termination or the settlement looks wrong, the labour authority is the route and a lawyer is worth it where a real sum is involved.",
    service: VISA,
    phrases: [
      "i have been let go soon after moving",
      "i was fired a few months after relocating to dubai",
      "terminated during probation in the uae with family here",
      "what happens to my residence if i am dismissed in the uae",
    ],
    keywords: [["fired", "after", "relocating"], ["terminated", "residence", "family"]],
    next: ["move-work-probation-exposure", "move-trouble-leaving-quickly", "move-trouble-complaint-mohre"],
  },
  {
    id: "move-trouble-company-closed",
    question: "The company has shut down or stopped operating — what happens to me?",
    answer:
      "Your residence depends on an employer that may no longer be filing anything, so the first step is to establish the company's actual status and get whatever you can in writing. Unpaid wages and end-of-service in an insolvency are handled through the labour authority and, where it goes that far, the courts — and the unemployment insurance scheme exists for some of this. Act early rather than waiting for someone to tell you what is happening, and take proper advice on your status.",
    service: VISA,
    phrases: [
      "the company has shut down or stopped operating",
      "my employer in dubai has closed and i have not been paid",
      "what happens to my visa if my company goes bust in the uae",
      "company stopped operating and my residence is through them",
    ],
    keywords: [["company", "closed", "shut"], ["employer", "bankrupt", "closed"]],
    next: ["move-trouble-salary-unpaid", "move-trouble-complaint-mohre", "move-us-talk-to-someone"],
  },
  {
    id: "move-trouble-no-insurance",
    question: "I have no insurance or Emirates ID and I need treatment — what do I do?",
    answer:
      "Go to an emergency department if it is urgent; emergencies are treated and the billing is sorted afterwards. For anything else, a private clinic will see you as a self-paying patient, and you should ask the price before the appointment. Then chase the gap: ask HR in writing when the policy starts and what covers you until then, because being uninsured while employed is a question for your employer and ultimately for the emirate's health authority.",
    service: VISA,
    phrases: [
      "i have no insurance or emirates id and i need treatment",
      "i am sick and my company insurance has not started in dubai",
      "seeing a doctor without insurance in the uae",
      "who pays if i am ill before my uae insurance begins",
    ],
    keywords: [["treatment", "insurance", "emirates"], ["sick", "insurance", "started"]],
    next: ["move-before-insurance-gap", "move-health-emergency-numbers", "move-setup-insurance-card"],
  },
  {
    id: "move-trouble-complaint-mohre",
    question: "How do I actually make a complaint about my employer?",
    answer:
      "Through the labour authority that registered your contract: MOHRE for mainland employment, through its call centre, app or service centres, and the free zone authority if you work inside a zone. Register the complaint with your contract, payslips, bank records and any correspondence, and keep the reference. Most cases go to a mediation stage before anything further. If it concerns a serious sum or anything criminal, get a lawyer rather than relying on the process alone.",
    service: VISA,
    phrases: [
      "how do i actually make a complaint about my employer",
      "filing a labour complaint in the uae",
      "where do i report my employer in dubai",
      "mohre complaint process for employees",
    ],
    keywords: [["labour", "complaint", "filing"], ["report", "employer"]],
    next: ["move-trouble-salary-unpaid", "move-trouble-contract-different", "move-us-talk-to-someone"],
  },
  {
    id: "move-trouble-rental-dispute",
    question: "I have a problem with my landlord — who settles it?",
    answer:
      "Each emirate has a rental dispute route — in Dubai the centre run under the Land Department, with equivalents elsewhere — and it is designed to be used by tenants, not just landlords. Before you get there: put everything in writing, keep the tenancy, the receipts and the photographs from move-in, and check what your contract says about the thing in dispute. A registered tenancy is what makes the process straightforward; an unregistered one is why people lose.",
    service: VISA,
    phrases: [
      "i have a problem with my landlord who settles it",
      "rental dispute centre in dubai",
      "my landlord is keeping my deposit",
      "how do tenants complain in the uae",
    ],
    keywords: [["landlord", "dispute", "complain"], ["keeping", "deposit"]],
    next: ["move-housing-deposit", "move-housing-maintenance", "move-housing-rent-increase"],
  },
  {
    id: "move-trouble-bank-frozen",
    question: "My bank account has been frozen or blocked — what should I do?",
    answer:
      "Ask the bank, in person, what the block is and what it needs — the commonest causes are compliance checks on documents or transfers, an expired Emirates ID on file, or a step in your residence not being updated, and all of those are fixable with paperwork. If it relates to a debt or a legal case it is a different matter and needs a lawyer rather than a branch visit. Do not keep moving money around in the meantime; it makes a compliance review longer, not shorter.",
    service: VISA,
    phrases: [
      "my bank account has been frozen or blocked",
      "uae bank has blocked my account",
      "why would a dubai bank freeze my account",
      "my account is blocked and my salary is in it",
    ],
    keywords: [["account", "frozen", "blocked"], ["bank", "blocked", "account"]],
    next: ["move-money-debt-risk", "move-money-bank-account", "move-us-talk-to-someone"],
  },
  {
    id: "move-trouble-lost-documents",
    question: "I have lost my passport or Emirates ID — what do I do?",
    answer:
      "Report it to the police first and keep the report, because everything afterwards runs on it: your consulate or embassy issues a replacement passport, and the Emirates ID is replaced through the identity authority, with your employer or a typing centre usually filing it. Then get your residence record updated against the new document. This is the reason the scans you took before you flew are worth having.",
    service: VISA,
    phrases: [
      "i have lost my passport or emirates id",
      "my emirates id is lost what do i do",
      "stolen passport in dubai as a resident",
      "replacing lost documents in the uae",
    ],
    keywords: [["lost", "passport", "emirates"], ["stolen", "passport", "resident"]],
    next: ["move-before-copies", "move-setup-emirates-id-when", "move-life-police-and-fines"],
  },
  {
    id: "move-trouble-family-emergency-home",
    question: "There is an emergency at home and I need to fly immediately — what about my paperwork?",
    answer:
      "Tell HR at once, because the obstacle is usually practical rather than legal: your passport may be with the employer or the authority mid-filing, and getting it back or sequencing around it is their process to run urgently. If residence has been issued, travel is ordinary. Keep your own copies of everything so you can prove what you hold, and ask for leave in writing even in a crisis.",
    service: VISA,
    phrases: [
      "there is an emergency at home and i need to fly immediately",
      "family emergency and my passport is with my employer in dubai",
      "urgent travel while my uae visa is in process",
      "i need to go home suddenly after moving to the uae",
    ],
    keywords: [["emergency", "home", "urgent", "travel"], ["passport", "employer", "emergency"]],
    next: ["move-setup-travel-during", "move-work-leave-first-year", "move-trouble-passport-withheld"],
  },
  {
    id: "move-trouble-leaving-quickly",
    question: "If I have to leave the country, what must I settle first?",
    answer:
      "Make a list and work through it rather than booking a flight: your residence cancellation and your family's, final settlement and any end-of-service due, loans, credit cards and any post-dated cheques, the tenancy and its early-termination terms, utility and telecom accounts closed and deposits reclaimed, school fees and transfer certificates, and the car or its lease. Leaving a debt or a live cheque behind is the one item with consequences that follow you, so deal with it properly or take advice.",
    service: VISA,
    phrases: [
      "if i have to leave the country what must i settle first",
      "checklist before leaving the uae for good",
      "what do i cancel when i move out of dubai",
      "exiting the uae properly after a job ends",
    ],
    keywords: [["leaving", "settle", "cancel"], ["checklist", "leaving", "permanently"]],
    next: ["move-money-debt-risk", "move-housing-leaving-early", "move-us-talk-to-someone"],
  },

  /* ── What we do, and what it costs ─────────────────────────────────────── */
  /**
   * The four `quote` entries are the only places in this file where money about
   * OUR work is discussed, and none of them contains a figure: each is named for
   * its subject rather than asked bare, because the question becomes the intent's
   * name and `matchByPhrase` matches names before anything else — a bare "how
   * much does it all cost" here would claim that phrasing across the whole merged
   * flow and walk an attestation visitor into the visa qualification.
   */
  {
    id: "move-us-what-we-do",
    question: "What do you do for someone relocating for a job?",
    answer:
      "Two things. We answer the questions on this page ourselves, honestly and without charging you, including the ones that end with \"ask MOHRE\" rather than with a sale. And where your move needs licensed work — attestation and legalisation, legal translation, residence and Emirates ID filing — we take the details of your case and introduce you to a provider licensed to do it, who quotes you directly. We write CVs and build websites in-house; the rest is not ours to perform.",
    service: VISA,
    phrases: [
      "what do you do for someone relocating for a job",
      "how can you help with my move to the uae",
      "are you a relocation agency or a consultancy",
      "do you handle visas yourselves",
    ],
    keywords: [["relocation", "agency"], ["handle", "relocation"]],
    next: ["move-us-what-we-need", "move-us-talk-to-someone", "move-us-no-guarantees"],
  },
  {
    id: "move-us-what-we-need",
    question: "What do you need from me to help with my relocation paperwork?",
    answer:
      "Less than you would think at the start: which country issued the documents, which documents they are, which emirate and employer you are going to, whether family are coming, and a number to call you on. That is enough for the right provider to tell you what your case needs and what it will cost. Nothing is sent anywhere until you have agreed, and you are not committing to anything by asking.",
    service: VISA,
    phrases: [
      "what do you need from me to help with my relocation paperwork",
      "what details do you need to help me move to the uae",
      "what information should i give you about my relocation",
      "what happens after i submit my details for my move",
    ],
    keywords: [["details", "relocation", "paperwork"], ["information", "relocation"]],
    next: ["move-us-talk-to-someone", "move-us-data-privacy", "move-us-timeline-honesty"],
  },
  {
    id: "move-us-quote-documents",
    question: "What will it cost to get my documents ready for my move to the UAE?",
    answer:
      "There is no single figure and anyone who gives you one without seeing your documents is guessing. It turns on which country issued each certificate, how many authorities are in that country's chain, how many documents you have, and whether translation is needed — and the government portions are set by those authorities rather than by a provider. Let me take a few details and someone will come back with a real figure for your documents, government fees shown separately.",
    service: ATTEST,
    phrases: [
      "what will it cost to get my documents ready for my move to the uae",
      "price of attesting my relocation documents",
      "what am i looking at for my moving documents",
      "give me an estimate for my relocation paperwork",
      "is it expensive to prepare my documents for moving to the uae",
    ],
    keywords: [
      ...priceGroups("relocation", "documents"),
      ...priceGroups("moving", "documents"),
    ],
    quote: true,
  },
  {
    id: "move-us-quote-visa",
    question: "What does it cost to have my residence paperwork handled after I arrive?",
    answer:
      "For a genuine employment move the employer carries the government cost of your own permit and residence, so the honest first answer is that much of this may not be yours to pay at all. Where there is work on your side — a family application, Emirates ID steps for dependants, documents, translation — it is quoted per case, because the route, the emirate and the authority all change it. Let me take your details and the team will set out what is actually on your side.",
    service: VISA,
    phrases: [
      "what does it cost to have my residence paperwork handled after i arrive",
      "price for handling my residence paperwork in the uae",
      "what do you charge for relocation visa work",
      "estimate for my residence paperwork",
    ],
    keywords: [
      ...priceGroups("residence", "paperwork"),
      ...priceGroups("relocation", "visa"),
    ],
    quote: true,
  },
  {
    id: "move-us-quote-translation",
    question: "What does translating my documents for the move cost?",
    answer:
      "It is quoted per document rather than per job, because it depends on the language, the length, whether it is a certificate or a contract, and whether the legalisation stamps have to be translated with it — and it has to be done by a translator licensed by the Ministry of Justice for an authority here to accept it. Tell me which documents you have and someone will come back with a figure for the set.",
    service: TRANSLATE,
    phrases: [
      "what does translating my documents for the move cost",
      "price of translating my relocation documents into arabic",
      "estimate for translation of my moving paperwork",
      "what do you charge to translate my certificates for my move",
    ],
    keywords: [
      ...priceGroups("translation", "relocation"),
      ...priceGroups("translating", "moving"),
    ],
    quote: true,
  },
  {
    id: "move-us-quote-everything",
    question: "Can you give me one figure for the whole relocation?",
    answer:
      "Not an honest one, and nobody can: the parts of your move that cost money sit with different authorities and different providers, some of them are your employer's to pay, and several depend on facts only you know. What we can do is take your case once and come back with the real items on your side rather than a round number you would end up revising. Let me take a few details.",
    service: VISA,
    phrases: [
      "can you give me one figure for the whole relocation",
      "total cost of my entire relocation to the uae",
      "how much is the whole move going to be",
      "all in price for relocating to the uae",
    ],
    keywords: [
      ...priceGroups("whole", "relocation"),
      ...priceGroups("entire", "relocation"),
    ],
    quote: true,
  },
  {
    id: "move-us-talk-to-someone",
    question: "Can I just speak to a person about my move?",
    answer:
      "Yes — that is what this is for. Give me a few details about your case and someone will call you back rather than leaving you to work out which of the answers above applies to you. If what you need is licensed work, the person who calls is from the team that actually does that work, not a general line.",
    service: VISA,
    phrases: [
      "can i just speak to a person about my move",
      "i want to talk to someone about relocating to the uae",
      "can someone call me back about my move",
      "put me through to a human about my relocation",
    ],
    keywords: [["speak", "person", "move"], ["call", "back", "relocation"]],
    quote: true,
  },
  {
    id: "move-us-timeline-honesty",
    question: "How long is all of this going to take?",
    answer:
      "Longer than the optimistic version you were given, and we will not pretend otherwise. The parts that depend on authorities — attestation chains abroad, a residence application, an Emirates ID in a busy season — move at their own pace and are not ours to compress, and the parts that depend on you are the ones worth starting early. Tell us your actual deadline and we will say honestly whether it is achievable before anyone quotes you for it.",
    service: VISA,
    phrases: [
      "how long is all of this going to take",
      "can you tell me the timeline for my relocation paperwork",
      "how fast can my documents and visa be done",
      "my start date is close and nothing is ready",
    ],
    keywords: [["timeline", "relocation", "paperwork"], ["deadline", "start", "date"]],
    next: ["move-us-talk-to-someone", "move-papers-order-of-steps", "move-setup-stuck"],
  },
  {
    id: "move-us-no-guarantees",
    question: "Can you guarantee my visa or my documents will be approved?",
    answer:
      "No, and nobody honestly can. A permit, a residence application, an equivalency and a school place are all decisions belonging to the authority or institution making them, and the most anyone can do is prepare a file properly so it is not refused for a reason that was avoidable. If you are being promised an outcome by anyone, treat the promise as the warning sign it is.",
    service: VISA,
    phrases: [
      "can you guarantee my visa or my documents will be approved",
      "do you guarantee my residence application will be accepted",
      "can anyone promise my uae paperwork will go through",
      "is approval guaranteed for my relocation documents",
    ],
    keywords: [["guarantee", "approved"], ["promise", "outcome", "application"]],
    next: ["move-us-timeline-honesty", "move-us-what-we-do", "move-us-talk-to-someone"],
  },
  {
    id: "move-us-free-guidance",
    question: "Do I have to pay for the guidance in this chat?",
    answer:
      "No. Everything you are reading here costs you nothing and there is no charge for asking, including the questions whose honest answer is to go to MOHRE or to a lawyer rather than to us. What is charged for is licensed work on your actual documents or application, and that is quoted to you by the provider who would do it, before anything starts.",
    service: VISA,
    phrases: [
      "do i have to pay for the guidance in this chat",
      "is this advice free",
      "are you charging me for answering these questions",
      "is there a fee for talking to you here",
    ],
    keywords: [["chat", "free"], ["advice", "free"]],
    next: ["move-us-what-we-do", "move-us-talk-to-someone", "move-us-data-privacy"],
  },
  {
    id: "move-us-data-privacy",
    question: "What happens to the details I give you?",
    answer:
      "They are used to answer your enquiry and, if you ask for a callback, passed to the provider who would handle that specific work — not sold, not published and not sent anywhere you have not agreed to. Do not paste passwords, card numbers or full document scans into a chat window; the details needed to quote your case are far less than that, and a person can take the rest securely.",
    service: VISA,
    phrases: [
      "what happens to the details i give you",
      "how do you use my personal information",
      "is my data safe if i give you my relocation details",
      "who do you share my enquiry with",
    ],
    keywords: [["personal", "information", "data"], ["share", "enquiry", "details"]],
    next: ["move-us-what-we-need", "move-us-talk-to-someone", "move-us-what-we-do"],
  },
  {
    id: "move-us-cv-for-local-market",
    question: "I am moving here with a job — should I still get my CV rewritten?",
    answer:
      "Not urgently, but it is worth doing within your first year rather than in a hurry later: CVs here are read differently from those in Europe or North America, and the version that got you hired from abroad is not always the version that gets you your second role in this market. That is work we do ourselves. If your move has fallen through and you need to start looking now, say so and we will deal with that first.",
    service: CV,
    phrases: [
      "i am moving here with a job should i still get my cv rewritten",
      "do i need a uae style cv if i already have a job here",
      "should i update my resume after relocating to dubai",
      "cv for the local market after i move",
    ],
    keywords: [["cv", "rewritten", "relocating"], ["resume", "after", "relocating"]],
    next: ["move-us-what-we-do", "move-family-spouse-settling", "move-us-talk-to-someone"],
  },
];
