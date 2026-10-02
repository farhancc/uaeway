/**
 * Everything the chat can say about setting a company up in the UAE.
 *
 * Seed content, in the same spirit as ./faqs.ts: written here, reviewed in a
 * pull request, and edited on the canvas in /admin/flow once it is in. The shape
 * is `AuthoredFlow` from lib/chat/flow/authored.ts — one flat record per
 * question — so this file is sentences rather than boxes and edge ids.
 *
 * Two rules hold across every entry, and both are load-bearing.
 *
 * **No figure is ever quoted.** Not a fee, not a range, not a "from", and not a
 * processing time stated as fact. UAE government fees move, they differ by
 * emirate, zone and activity, and a number in a chat reply is a number someone
 * will hold us to. Every money question carries `quote: true` instead, which
 * walks the reply straight into the business-setup qualification and ends at the
 * callback form — a person, rather than a made-up number.
 *
 * **We never claim to perform a regulated act.** `lib/services.ts` marks
 * business setup `delivery: "referred"`: we work out what someone needs and
 * introduce them to a licensed corporate services provider who files it. So the
 * verbs here are "we work out", "we check", "we connect you with". Anything
 * stronger is the one claim the whole site is built to avoid.
 *
 * On matching, which decides whether any of this is reachable: `matchByPhrase`
 * runs before embeddings and takes the first candidate whose phrase appears
 * anywhere in the message, so a bare subject like "business setup" repeated
 * across two hundred entries would send all of them to whichever edge sorts
 * first. Every phrase here is a whole question. Keyword groups are AND-groups
 * ranked by how many words matched, so they are kept to two or three
 * discriminating words and never a single common one.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

export const BUSINESS_SETUP_FLOWS: AuthoredFlow[] = [
  /* ── Choosing a jurisdiction ───────────────────────────────────────────── */
  {
    id: "biz-mainland-vs-free-zone",
    question: "What is the difference between mainland and free zone?",
    answer:
      "A mainland licence comes from the emirate's economic department and lets you trade directly anywhere in the UAE, including with government. A free zone licence comes from the zone itself and is built for business done from inside that zone, internationally, or through a mainland distributor. The difference decides who you are allowed to invoice, which is why it is the first thing to settle rather than the last.",
    service: "business-setup",
    phrases: [
      "what is the difference between mainland and free zone",
      "should i go mainland or free zone",
      "is free zone better than mainland",
      "mainland or freezone company in dubai",
    ],
    keywords: [["mainland", "free", "zone"], ["mainland", "freezone"]],
    next: ["biz-sell-mainland-from-free-zone", "biz-which-emirate", "biz-jurisdiction-undecided"],
  },
  {
    id: "biz-sell-mainland-from-free-zone",
    question: "Can a free zone company sell to customers in the UAE mainland?",
    answer:
      "Not directly, as a rule. Selling into the mainland is normally done through a mainland distributor or agent, or by opening a mainland branch of the free zone company. Services are sometimes treated more flexibly than goods, but it turns on the activity and the authority, so it is worth confirming before you commit to a zone.",
    service: "business-setup",
    phrases: [
      "can a free zone company sell in the mainland",
      "can i invoice a mainland client from a free zone",
      "free zone company selling to dubai customers",
    ],
    keywords: [["free", "zone", "sell", "mainland"], ["freezone", "invoice", "mainland"]],
    next: ["biz-mainland-branch-of-free-zone", "biz-mainland-vs-free-zone", "biz-distributor-agent"],
  },
  {
    id: "biz-mainland-branch-of-free-zone",
    question: "Can my free zone company open a mainland branch?",
    answer:
      "Often yes, and it is the usual route when a free zone business needs to serve mainland customers directly. The branch is registered with the economic department against the free zone parent, and it carries its own licence and its own approvals. Whether your activity is eligible is checked against the activity list rather than assumed.",
    service: "business-setup",
    phrases: [
      "can a free zone company open a mainland branch",
      "mainland branch of a freezone company",
      "branch office from free zone to mainland",
    ],
    keywords: [["mainland", "branch", "free", "zone"]],
    next: ["biz-sell-mainland-from-free-zone", "biz-branch-foreign-company", "biz-jurisdiction-change"],
  },
  {
    id: "biz-distributor-agent",
    question: "What is a distributor or commercial agent arrangement?",
    answer:
      "It is how a company without the right to sell into a market reaches it through one that has. A registered commercial agency is a formal, protected relationship under UAE law and is genuinely hard to exit, whereas an ordinary distribution contract is not. People sign the first believing it is the second, so the wording matters more here than almost anywhere else.",
    service: "business-setup",
    phrases: [
      "what is a commercial agency agreement in the uae",
      "do i need a distributor to sell in the uae",
      "difference between distributor and commercial agent",
    ],
    keywords: [["commercial", "agency", "agreement"], ["distributor", "uae"]],
    next: ["biz-sell-mainland-from-free-zone", "biz-branch-foreign-company"],
  },
  {
    id: "biz-offshore-company",
    question: "What is an offshore company and how is it different from a free zone one?",
    answer:
      "An offshore company is a holding and asset-ownership vehicle: it cannot take an office, cannot sponsor visas and does not trade inside the UAE. A free zone company is an operating business with premises and a visa quota. They get confused because both are registered by a free zone authority, but only one of them can employ anybody.",
    service: "business-setup",
    phrases: [
      "what is an offshore company in the uae",
      "difference between offshore and free zone company",
      "can an offshore company get visas",
    ],
    keywords: [["offshore", "company", "uae"], ["offshore", "free", "zone"]],
    next: ["biz-holding-company", "biz-mainland-vs-free-zone", "biz-offshore-bank-account"],
  },
  {
    id: "biz-holding-company",
    question: "Can I set up a holding company in the UAE?",
    answer:
      "Yes. Holding structures exist on the mainland, in several free zones and offshore, and they own shares, property or intellectual property rather than trading. Which one fits depends on what it will own and whether it needs to sponsor anyone, so the answer follows the assets rather than the brochure.",
    service: "business-setup",
    phrases: [
      "can i set up a holding company in the uae",
      "how do i structure a holding company in dubai",
      "spv for holding shares in the uae",
    ],
    keywords: [["holding", "company", "uae"], ["spv", "structure"]],
    next: ["biz-offshore-company", "biz-corporate-shareholder", "biz-group-structure"],
  },
  {
    id: "biz-group-structure",
    question: "How should I structure a group with several companies?",
    answer:
      "Usually a holding entity above operating companies, so that ownership, risk and any future sale sit in sensible places. Where the holding entity is registered affects tax grouping, bank appetite and how easily shares move later. It is worth drawing before the first licence is issued, because restructuring afterwards means amended memoranda and re-notarisation.",
    service: "business-setup",
    phrases: [
      "how do i structure a group of companies in the uae",
      "parent and subsidiary structure in dubai",
      "should my companies have a holding entity",
    ],
    keywords: [["group", "structure", "companies"], ["parent", "subsidiary", "uae"]],
    next: ["biz-holding-company", "biz-corporate-shareholder", "biz-corporate-tax-group"],
  },
  {
    id: "biz-which-emirate",
    question: "Should I set up in Dubai or another emirate?",
    answer:
      "Dubai has the deepest customer base and the best-known zones. Sharjah, Ajman, Umm Al Quwain and Ras Al Khaimah are generally lighter to run. What usually decides it is where your customers and staff actually are, and whether you need an address a client will recognise — so we go through that rather than defaulting to Dubai.",
    service: "business-setup",
    phrases: [
      "should i register my company in dubai or sharjah",
      "which emirate is best to set up a company",
      "is it better to set up outside dubai",
    ],
    keywords: [["which", "emirate", "company"], ["dubai", "or", "sharjah"]],
    next: ["biz-mainland-vs-free-zone", "biz-free-zone-choice", "biz-jurisdiction-undecided"],
  },
  {
    id: "biz-jurisdiction-change",
    question: "Can I move from a free zone to the mainland later?",
    answer:
      "Yes, though in most cases it is a new licence rather than a transfer: you register the mainland entity, move the visas across, then close or repurpose the free zone one. Some zones allow a mainland branch instead, which is cleaner. Knowing it is possible matters more than getting it perfect on day one.",
    service: "business-setup",
    phrases: [
      "can i move my company from a free zone to the mainland",
      "how do i convert a freezone company to mainland",
      "switching jurisdiction after getting a licence",
    ],
    keywords: [["move", "free", "zone", "mainland"], ["convert", "freezone", "mainland"]],
    next: ["biz-mainland-branch-of-free-zone", "biz-amend-licence", "biz-close-company"],
  },
  {
    id: "biz-jurisdiction-undecided",
    question: "I do not know which jurisdiction I need. Where do I start?",
    answer:
      "Three facts settle it nearly every time: what you will sell, who will pay you, and how many visas you need. Those narrow it to one or two realistic options. Tell us those three and we will map them out, rather than handing you a list of every zone in the country.",
    service: "business-setup",
    phrases: [
      "i do not know which jurisdiction i need",
      "help me choose between mainland and free zone",
      "where should i start with setting up a company",
    ],
    keywords: [["not", "sure", "jurisdiction"], ["help", "choose", "jurisdiction"]],
    next: ["biz-mainland-vs-free-zone", "biz-first-steps", "biz-which-emirate"],
  },
  {
    id: "biz-government-clients",
    question: "I want to work with UAE government bodies. What do I need?",
    answer:
      "Government and semi-government tendering effectively requires a mainland licence, and often a real local presence with staff on the ground. A free zone entity is usually screened out at the supplier registration stage. If public-sector work is part of the plan, say so before the jurisdiction is chosen, because it removes most of the options.",
    service: "business-setup",
    phrases: [
      "can a free zone company bid for government tenders",
      "what licence do i need to supply the government",
      "requirements to register as a government supplier",
    ],
    keywords: [["government", "tender", "licence"], ["government", "supplier", "registration"]],
    next: ["biz-mainland-vs-free-zone", "biz-licence-types", "biz-local-service-agent"],
  },
  {
    id: "biz-ecommerce-jurisdiction",
    question: "Which jurisdiction suits an online store?",
    answer:
      "Both work, and where the goods go decides it. Selling to customers inside the UAE and holding stock locally points to a mainland e-commerce licence; selling internationally or drop-shipping fits a free zone with an e-commerce activity. Payment gateways and marketplaces will ask which one you hold, so pick with that in mind.",
    service: "business-setup",
    phrases: [
      "which licence do i need for an online store in dubai",
      "what do i need to sell on amazon in the uae",
      "e-commerce company setup mainland or free zone",
    ],
    keywords: [["ecommerce", "licence", "dubai"], ["online", "store", "licence"]],
    next: ["biz-ecommerce-licence", "biz-payment-gateway", "biz-mainland-vs-free-zone"],
  },
  {
    id: "biz-consultant-jurisdiction",
    question: "I am a consultant. Mainland or free zone?",
    answer:
      "Professional consultancy works in both, and for one consultant a free zone package is usually the lighter route. Mainland becomes the better answer when your clients are UAE companies who prefer a local supplier, or when you expect a team on site. It is a genuine choice rather than a rule, so it is worth a short conversation.",
    service: "business-setup",
    phrases: [
      "i am a consultant should i go mainland or free zone",
      "best setup for a solo consultant in dubai",
      "consultancy licence mainland or freezone",
    ],
    keywords: [["consultant", "mainland", "freezone"], ["consultancy", "licence", "dubai"]],
    next: ["biz-professional-licence", "biz-freelance-permit", "biz-mainland-vs-free-zone"],
  },
  {
    id: "biz-work-from-home",
    question: "I work from home. Which jurisdiction fits?",
    answer:
      "Most free zones sell a flexi-desk or shared-desk package that satisfies the address requirement without a real office, and that is the usual answer for a one-person consultancy. Mainland requires a tenancy registered on Ejari, which is a heavier commitment. Your visa quota tends to follow the space you take, so say up front how many people you expect to sponsor.",
    service: "business-setup",
    phrases: [
      "can i run a company from home in dubai",
      "do i need an office to get a trade licence",
      "what is a flexi desk package",
    ],
    keywords: [["work", "from", "home", "licence"], ["flexi", "desk", "package"]],
    next: ["biz-flexi-desk-visas", "biz-ejari", "biz-consultant-jurisdiction"],
  },
  {
    id: "biz-dual-licence",
    question: "Can I hold a mainland and a free zone licence at the same time?",
    answer:
      "Yes — they are separate entities, and plenty of groups run both: a free zone company for international work and a mainland one for local contracts. It means two sets of renewals, two sets of accounts and two compliance calendars, so it is worth doing deliberately rather than by accident.",
    service: "business-setup",
    phrases: [
      "can i have both a mainland and free zone licence",
      "running two companies in different jurisdictions uae",
      "do i need two licences for local and international work",
    ],
    keywords: [["both", "mainland", "freezone", "licence"], ["two", "licences", "uae"]],
    next: ["biz-group-structure", "biz-mainland-vs-free-zone", "biz-renewal"],
  },
  {
    id: "biz-relocate-existing-business",
    question: "I already have a company abroad. Should I move it or open a new one?",
    answer:
      "Three routes: a branch of the existing company, a new UAE subsidiary owned by it, or an unrelated new company. A branch keeps contracts with the parent; a subsidiary ring-fences UAE risk; a fresh company is simplest but leaves the two unconnected. Which is right depends on where you want contracts and liability to sit.",
    service: "business-setup",
    phrases: [
      "should i move my existing company to the uae",
      "open a subsidiary or a branch in dubai",
      "relocating a foreign business to the uae",
    ],
    keywords: [["move", "existing", "company", "uae"], ["subsidiary", "or", "branch"]],
    next: ["biz-branch-foreign-company", "biz-corporate-shareholder", "biz-group-structure"],
  },
  {
    id: "biz-branch-foreign-company",
    question: "Can my foreign company open a UAE branch instead of a new company?",
    answer:
      "Yes. A branch is the same legal entity as the parent rather than a new one, which suits companies that want contracts to stay with the existing business. It needs the parent's corporate documents attested for use in the UAE and, on the mainland, a national service agent. It is a different filing route from incorporation, so decide early which you want.",
    service: "business-setup",
    phrases: [
      "can a foreign company open a branch in dubai",
      "how do i register a branch office in the uae",
      "what is a representative office in the uae",
    ],
    keywords: [["branch", "foreign", "company"], ["representative", "office", "uae"]],
    next: ["biz-branch-documents", "biz-local-service-agent", "biz-relocate-existing-business"],
  },
  {
    id: "biz-branch-documents",
    question: "What documents does a foreign parent company need to open a branch?",
    answer:
      "Typically the certificate of incorporation, the memorandum and articles, a board resolution approving the branch, and a power of attorney naming the manager — each attested for use in the UAE and translated by a licensed legal translator. Gathering and attesting those abroad is usually the longest part of the whole exercise, so it is the part to start first.",
    service: "business-setup",
    phrases: [
      "what documents are needed to open a branch in the uae",
      "does a board resolution need attestation for a uae branch",
      "parent company documents for a dubai branch",
    ],
    keywords: [["documents", "branch", "uae"], ["board", "resolution", "branch"]],
    next: ["biz-branch-foreign-company", "biz-attest-corporate-documents", "biz-notarise-company-documents"],
  },
  {
    id: "biz-representative-office",
    question: "What can a representative office actually do?",
    answer:
      "It can market, promote and gather business for the parent company, but it cannot trade or invoice in its own right. It is the right answer when you want a presence before you want revenue, and the wrong one the moment a customer wants to pay a UAE entity.",
    service: "business-setup",
    phrases: [
      "what can a representative office do in the uae",
      "can a representative office invoice clients",
      "difference between branch and representative office",
    ],
    keywords: [["representative", "office", "invoice"], ["branch", "representative", "difference"]],
    next: ["biz-branch-foreign-company", "biz-relocate-existing-business"],
  },
  {
    id: "biz-first-steps",
    question: "What are the first steps to set up a company in the UAE?",
    answer:
      "In order: settle what you will actually sell and to whom, pick the jurisdiction that allows it, choose the activities from the authority's list, reserve a trade name, get any regulator approval the activity needs, sort premises, then the licence itself — with the memorandum notarised along the way on the mainland. Doing them out of order is what causes most of the delays.",
    service: "business-setup",
    phrases: [
      "what are the first steps to start a company in dubai",
      "what is the process to set up a business in the uae",
      "step by step company formation in dubai",
    ],
    keywords: [["first", "steps", "company"], ["process", "set", "up", "company"]],
    next: ["biz-jurisdiction-undecided", "biz-documents-needed", "biz-licence-timeline"],
  },

  /* ── Legal structure and shareholders ──────────────────────────────────── */
  {
    id: "biz-what-is-llc",
    question: "What is an LLC in the UAE?",
    answer:
      "A limited liability company is the standard mainland trading entity: shareholders' liability is limited to their shares, it covers most commercial activities, and it is what the economic department issues to the majority of mainland businesses. Free zones have a close equivalent, usually called an FZ-LLC or FZ-CO.",
    service: "business-setup",
    phrases: [
      "what is an llc in the uae",
      "what does limited liability company mean in dubai",
      "is an llc the right structure for me",
    ],
    keywords: [["llc"], ["limited", "liability", "company"]],
    next: ["biz-sole-establishment", "biz-civil-company", "biz-single-shareholder"],
  },
  {
    id: "biz-sole-establishment",
    question: "What is a sole establishment and should I use one?",
    answer:
      "A sole establishment is owned by one natural person and, unlike an LLC, does not separate your personal liability from the business. It is simpler to register, which is the attraction, but the missing liability shield is why most advisers still point a trading business at an LLC.",
    service: "business-setup",
    phrases: [
      "what is a sole establishment in dubai",
      "sole proprietorship or llc in the uae",
      "is a sole establishment risky",
    ],
    keywords: [["sole", "establishment"], ["sole", "proprietorship", "uae"]],
    next: ["biz-what-is-llc", "biz-change-structure", "biz-civil-company"],
  },
  {
    id: "biz-civil-company",
    question: "What is a civil company?",
    answer:
      "A civil company is a mainland structure for recognised professions — engineers, consultants, accountants, doctors and the like — owned by professionals rather than by capital. It carries a professional licence rather than a commercial one, and the partners remain personally liable for professional work, which is the trade-off.",
    service: "business-setup",
    phrases: [
      "what is a civil company in dubai",
      "civil company or llc for a consultancy",
      "professional partnership structure in the uae",
    ],
    keywords: [["civil", "company", "dubai"], ["professional", "partnership"]],
    next: ["biz-professional-licence", "biz-what-is-llc", "biz-local-service-agent"],
  },
  {
    id: "biz-single-shareholder",
    question: "Can one person own the whole company?",
    answer:
      "Yes. Single-shareholder companies are normal in both the mainland and the free zones, and the structure is sometimes called a one-person LLC. You will still need a manager named on the licence, though that can be the same person.",
    service: "business-setup",
    phrases: [
      "can one person own a whole company in the uae",
      "is a single shareholder llc allowed in dubai",
      "do i need a partner to open a company",
    ],
    keywords: [["one", "person", "company"], ["single", "shareholder", "llc"]],
    next: ["biz-manager-role", "biz-number-of-shareholders", "biz-what-is-llc"],
  },
  {
    id: "biz-corporate-shareholder",
    question: "Can a company be a shareholder instead of a person?",
    answer:
      "Yes, and it is common for groups and for founders holding through an offshore vehicle. The corporate shareholder's own documents — certificate of incorporation, memorandum, a board resolution and usually a power of attorney — have to be attested for use in the UAE first, and that is the part that takes the time.",
    service: "business-setup",
    phrases: [
      "can a company be a shareholder in a uae company",
      "corporate shareholder requirements in dubai",
      "can my foreign company own my uae company",
    ],
    keywords: [["corporate", "shareholder"], ["company", "as", "shareholder"]],
    next: ["biz-attest-corporate-documents", "biz-holding-company", "biz-ubo-register"],
  },
  {
    id: "biz-foreign-ownership",
    question: "Can a foreigner own one hundred percent of a UAE company?",
    answer:
      "In the free zones, always. On the mainland, full foreign ownership is now available across a long list of activities following the commercial companies law reforms, though a limited set of strategic activities still requires Emirati participation. Whether yours is on the list is checked against the activity code rather than guessed.",
    service: "business-setup",
    phrases: [
      "can a foreigner own 100 percent of a company in dubai",
      "do i still need an emirati partner",
      "is full foreign ownership allowed on the mainland",
    ],
    keywords: [["foreign", "ownership", "mainland"], ["emirati", "partner", "required"]],
    next: ["biz-local-service-agent", "biz-strategic-activities", "biz-mainland-vs-free-zone"],
  },
  {
    id: "biz-strategic-activities",
    question: "Which activities still need an Emirati shareholder?",
    answer:
      "A short list of activities with strategic impact — areas touching security, defence and certain utilities and resources — still carries local participation requirements, and the list is maintained by the authorities rather than fixed forever. Most ordinary trading and professional activities are not on it, so the honest answer is that yours probably is not, but it is checked rather than assumed.",
    service: "business-setup",
    phrases: [
      "which activities need an emirati shareholder",
      "what are strategic impact activities in the uae",
      "is my activity restricted for foreign ownership",
    ],
    keywords: [["strategic", "impact", "activities"], ["activities", "emirati", "shareholder"]],
    next: ["biz-foreign-ownership", "biz-choose-activity", "biz-local-service-agent"],
  },
  {
    id: "biz-local-service-agent",
    question: "What is a local service agent and do I need one?",
    answer:
      "A national service agent is an Emirati individual or company appointed for certain mainland professional licences and for branches of foreign companies. They hold no shares and no claim on profit — the role is administrative, and it is fixed by a notarised agreement that says exactly that.",
    service: "business-setup",
    phrases: [
      "what is a local service agent in the uae",
      "do i need a national service agent for my licence",
      "does a service agent own part of my company",
    ],
    keywords: [["local", "service", "agent"], ["national", "service", "agent"]],
    next: ["biz-foreign-ownership", "biz-notarise-company-documents", "biz-branch-foreign-company"],
  },
  {
    id: "biz-number-of-shareholders",
    question: "How many shareholders can a UAE company have?",
    answer:
      "A mainland LLC takes from one up to fifty shareholders. Free zones set their own ceilings, and some packages are priced around a small number of partners, so a large founding group can rule a zone out. Say how many of you there are early.",
    service: "business-setup",
    phrases: [
      "how many shareholders can an llc have in the uae",
      "maximum number of partners in a dubai company",
      "is there a limit on shareholders in a free zone company",
    ],
    keywords: [["shareholders", "llc"], ["limit", "shareholders"], ["maximum", "partners", "company"]],
    next: ["biz-share-split", "biz-single-shareholder", "biz-add-shareholder"],
  },
  {
    id: "biz-share-split",
    question: "How do we split shares between founders?",
    answer:
      "However you agree — the split goes into the memorandum of association and is notarised with it. What is worth settling at the same time is what happens when someone leaves, because changing it later means amending and re-notarising the memorandum. That is a conversation to have before the appointment, not after.",
    service: "business-setup",
    phrases: [
      "how do we split shares between founders in a uae company",
      "how is shareholding recorded in a dubai company",
      "can we change the share split later",
    ],
    keywords: [["split", "shares", "founders"], ["shareholding", "percentage", "memorandum"]],
    next: ["biz-notarise-company-documents", "biz-transfer-shares", "biz-shareholders-agreement"],
  },
  {
    id: "biz-shareholders-agreement",
    question: "Do we need a shareholders agreement as well as the memorandum?",
    answer:
      "The memorandum is the registered constitutional document; a shareholders agreement is the private one covering deadlock, exits, drag and tag rights and what happens if a founder stops turning up. The registry does not require it, and the partnerships that fall apart are usually the ones that did not have it.",
    service: "business-setup",
    phrases: [
      "do we need a shareholders agreement in the uae",
      "difference between memorandum and shareholders agreement",
      "what should a founders agreement cover in dubai",
    ],
    keywords: [["shareholders", "agreement", "uae"], ["founders", "agreement", "dubai"]],
    next: ["biz-share-split", "biz-notarise-company-documents", "biz-partner-dispute"],
  },
  {
    id: "biz-manager-role",
    question: "Who is the manager on the licence and what do they do?",
    answer:
      "The general manager is the person named on the licence as authorised to bind the company — sign contracts, deal with the bank, represent it to the authorities. It can be a shareholder or an employee, and the appointment is recorded in the memorandum or by a separate notarised resolution.",
    service: "business-setup",
    phrases: [
      "who is the general manager on a trade licence",
      "what does the manager on the licence do",
      "can a shareholder also be the general manager",
    ],
    keywords: [["general", "manager", "licence"], ["manager", "named", "licence"]],
    next: ["biz-change-manager", "biz-notarise-company-documents", "biz-single-shareholder"],
  },
  {
    id: "biz-change-manager",
    question: "How do I change the manager named on the licence?",
    answer:
      "By a shareholders resolution, notarised where the jurisdiction requires it, then filed as a licence amendment. It flows through to the bank mandate and to anything the outgoing manager signed as authorised signatory, so the bank should be told at the same time rather than months later.",
    service: "business-setup",
    phrases: [
      "how do i change the manager on my trade licence",
      "replacing the general manager of a uae company",
      "resolution to appoint a new manager in dubai",
    ],
    keywords: [["change", "manager", "licence"], ["appoint", "new", "manager"]],
    next: ["biz-manager-role", "biz-amend-licence", "biz-bank-signatory"],
  },
  {
    id: "biz-silent-partner",
    question: "Can I have a silent or sleeping partner?",
    answer:
      "You can have a shareholder who takes no part in management, and the memorandum can say so. What does not work is an arrangement that hides who really owns the business — ultimate beneficial ownership has to be declared, and a side agreement contradicting the register is a compliance problem rather than a structure.",
    service: "business-setup",
    phrases: [
      "can i have a silent partner in a uae company",
      "are nominee shareholders allowed in dubai",
      "can someone hold shares on my behalf",
    ],
    keywords: [["silent", "partner", "company"], ["nominee", "shareholder", "uae"]],
    next: ["biz-ubo-register", "biz-share-split", "biz-shareholders-agreement"],
  },
  {
    id: "biz-add-shareholder",
    question: "How do I add a new shareholder later?",
    answer:
      "By amending the memorandum, having it notarised again where required, and filing the amendment with the licensing authority. If the incoming shareholder is a company, its corporate documents need attesting first. It is routine, but it is a filing rather than a handshake.",
    service: "business-setup",
    phrases: [
      "how do i add a shareholder to my uae company",
      "bringing in a new partner to a dubai company",
      "adding an investor to an existing llc",
    ],
    keywords: [["add", "shareholder", "company"], ["new", "partner", "existing", "company"]],
    next: ["biz-transfer-shares", "biz-notarise-company-documents", "biz-amend-licence"],
  },
  {
    id: "biz-transfer-shares",
    question: "How are shares transferred in a UAE company?",
    answer:
      "By a share transfer agreement and an amended memorandum, notarised where the jurisdiction requires it and then registered with the authority. Existing shareholders often have pre-emption rights under the memorandum, so the first question is usually whether they have to be offered the shares first.",
    service: "business-setup",
    phrases: [
      "how do i transfer shares in a uae company",
      "selling my shares in a dubai llc",
      "share transfer process for a free zone company",
    ],
    keywords: [["transfer", "shares", "company"], ["sell", "shares", "llc"]],
    next: ["biz-notarise-company-documents", "biz-exit-partner", "biz-add-shareholder"],
  },
  {
    id: "biz-exit-partner",
    question: "One of my partners wants to leave. What happens?",
    answer:
      "Their shares are transferred or bought back, the memorandum is amended and re-notarised, and the licence is updated. If they were the manager or a bank signatory, those change too. Where the memorandum or a shareholders agreement sets out an exit mechanism, that governs — which is exactly why having one matters.",
    service: "business-setup",
    phrases: [
      "my business partner wants to leave the company",
      "how do i remove a shareholder from a uae company",
      "buying out a partner in a dubai business",
    ],
    keywords: [["partner", "wants", "leave"], ["remove", "shareholder", "company"]],
    next: ["biz-transfer-shares", "biz-partner-dispute", "biz-shareholders-agreement"],
  },
  {
    id: "biz-partner-dispute",
    question: "My partner and I disagree and the company is stuck. What are my options?",
    answer:
      "Start with what the memorandum and any shareholders agreement say about deadlock and exit, because that is what a court or tribunal will look at first. Beyond that it becomes a legal matter rather than a corporate services one, and you want a UAE-licensed lawyer rather than a formation agent. We will say plainly when that line has been crossed.",
    service: "business-setup",
    phrases: [
      "my business partner and i are in a dispute",
      "what happens in a shareholder deadlock in the uae",
      "can i force my partner out of the company",
    ],
    keywords: [["partner", "dispute", "company"], ["shareholder", "deadlock"]],
    next: ["biz-shareholders-agreement", "biz-exit-partner", "biz-close-company"],
  },
  {
    id: "biz-change-structure",
    question: "Can I change the legal structure after the licence is issued?",
    answer:
      "Usually yes — converting a sole establishment to an LLC, or adding shareholders, is a licence amendment with a notarised memorandum behind it. It is not effortless and it touches your visas and your bank account, so it is better to start with the structure you expect to need in two years.",
    service: "business-setup",
    phrases: [
      "can i change my company structure after the licence",
      "converting a sole establishment into an llc",
      "changing company type in the uae",
    ],
    keywords: [["change", "legal", "structure"], ["convert", "sole", "establishment"]],
    next: ["biz-amend-licence", "biz-sole-establishment", "biz-what-is-llc"],
  },
  {
    id: "biz-ubo-register",
    question: "What is the ultimate beneficial owner register?",
    answer:
      "UAE companies must keep and file a register of their real owners — the people who ultimately own or control the company, not just whoever appears on the share register. It is filed with the licensing authority and kept current, and failing to maintain it carries penalties. It is one of the obligations people most often do not know they have.",
    service: "business-setup",
    phrases: [
      "what is the ubo register in the uae",
      "do i have to declare the beneficial owner of my company",
      "ultimate beneficial ownership filing dubai",
    ],
    keywords: [["ubo", "register"], ["beneficial", "owner", "declare"]],
    next: ["biz-silent-partner", "biz-aml-obligations", "biz-compliance-calendar"],
  },

  /* ── Trade name ────────────────────────────────────────────────────────── */
  {
    id: "biz-trade-name-rules",
    question: "What are the rules for a UAE trade name?",
    answer:
      "It must not offend public morals or religion, must not use the name of a country, government body or a well-known brand you have no right to, and must match the activity you are licensing. Names built from initials nobody can explain tend to be rejected, as do names implying a regulated activity you are not licensed for.",
    service: "business-setup",
    phrases: [
      "what are the rules for a trade name in the uae",
      "what words are not allowed in a company name",
      "naming restrictions for a dubai company",
    ],
    keywords: [["trade", "name", "rules"], ["company", "name", "restrictions"]],
    next: ["biz-reserve-trade-name", "biz-trade-name-rejected", "biz-personal-name-company"],
  },
  {
    id: "biz-reserve-trade-name",
    question: "How do I reserve a trade name?",
    answer:
      "The name is reserved with the licensing authority before anything else is filed, and the reservation is held for a limited window while the rest of the application is prepared. Reservations lapse, so the name is normally reserved once the structure is settled rather than months ahead.",
    service: "business-setup",
    phrases: [
      "how do i reserve a trade name in dubai",
      "what is a trade name reservation certificate",
      "how long does a name reservation last",
    ],
    keywords: [["reserve", "trade", "name"], ["name", "reservation", "certificate"]],
    next: ["biz-trade-name-rules", "biz-initial-approval", "biz-trade-name-rejected"],
  },
  {
    id: "biz-trade-name-rejected",
    question: "My trade name was rejected. What now?",
    answer:
      "Rejections are nearly always one of four things: too close to an existing name, uses a restricted word, implies an activity not on your licence, or translates badly into Arabic. Each has a fix, and the fix is usually one word rather than the whole name. Tell us the name and the reason given and we will work out which it is.",
    service: "business-setup",
    phrases: [
      "my trade name was rejected what do i do",
      "why was my company name not approved in dubai",
      "trade name rejected by the economic department",
    ],
    keywords: [["trade", "name", "rejected"], ["company", "name", "not", "approved"]],
    next: ["biz-trade-name-rules", "biz-arabic-trade-name", "biz-reserve-trade-name"],
  },
  {
    id: "biz-personal-name-company",
    question: "Can I use my own name in the company name?",
    answer:
      "Yes, and using a full personal name is expressly allowed — it is abbreviations and initials that cause trouble. A name built from a person's name usually has to use that name in full rather than a shortened form.",
    service: "business-setup",
    phrases: [
      "can i use my own name as the company name",
      "are initials allowed in a uae trade name",
      "naming a company after myself in dubai",
    ],
    keywords: [["own", "name", "company", "name"], ["initials", "trade", "name"]],
    next: ["biz-trade-name-rules", "biz-trade-name-rejected"],
  },
  {
    id: "biz-arabic-trade-name",
    question: "Does the trade name need to be in Arabic?",
    answer:
      "The name is registered in Arabic as well as English, and the Arabic version is normally a transliteration rather than a translation. Where a word renders into something unfortunate, that surfaces at this stage — a good argument for checking the Arabic before printing anything.",
    service: "business-setup",
    phrases: [
      "does my company name have to be in arabic",
      "how is a trade name transliterated into arabic",
      "arabic version of a company name in the uae",
    ],
    keywords: [["arabic", "trade", "name"], ["transliteration", "company", "name"]],
    next: ["biz-trade-name-rules", "biz-trade-name-rejected", "biz-signage-approval"],
  },
  {
    id: "biz-name-vs-trademark",
    question: "Is a trade name the same as a trademark?",
    answer:
      "No. A trade name lets you operate under that name; a trademark is a separate registration that lets you stop other people using it. Plenty of businesses hold one without the other, and if the brand matters, the trademark is a separate filing worth planning for.",
    service: "business-setup",
    phrases: [
      "is a trade name the same as a trademark",
      "do i need to register a trademark in the uae",
      "does my trade licence protect my brand name",
    ],
    keywords: [["trade", "name", "trademark"], ["register", "trademark", "uae"]],
    next: ["biz-register-trademark", "biz-trade-name-rules"],
  },
  {
    id: "biz-register-trademark",
    question: "How do I register a trademark in the UAE?",
    answer:
      "Through the Ministry of Economy, in the classes of goods or services you actually use it for, after a search to check it is available. It is a separate process from your licence and runs on its own timetable. We can point you at who files these properly rather than having you do it twice.",
    service: "business-setup",
    phrases: [
      "how do i register a trademark in the uae",
      "trademark registration process in dubai",
      "how do i protect my brand name in the uae",
    ],
    keywords: [["register", "trademark", "uae"], ["trademark", "registration", "process"]],
    next: ["biz-name-vs-trademark", "biz-trade-name-rules"],
  },
  {
    id: "biz-same-name-two-emirates",
    question: "Can two companies in different emirates have the same name?",
    answer:
      "Trade name registers are run per authority, so similar names can exist in different emirates and different free zones. That is not licence to copy someone — a registered trademark still bites nationwide — but a name being taken in one zone is not the end of it.",
    service: "business-setup",
    phrases: [
      "can two companies have the same name in different emirates",
      "is my company name protected across the whole uae",
      "same trade name in another free zone",
    ],
    keywords: [["same", "name", "different", "emirates"], ["name", "protected", "uae"]],
    next: ["biz-name-vs-trademark", "biz-register-trademark", "biz-trade-name-rules"],
  },
  {
    id: "biz-change-trade-name",
    question: "Can I change the trade name later?",
    answer:
      "Yes — it is a licence amendment, and it flows through to the memorandum, the establishment card, the bank account and anything printed or signed. Doable, but it touches enough things that it is worth getting right at the start.",
    service: "business-setup",
    phrases: [
      "can i change my company name after registration",
      "how do i rename my uae company",
      "changing the trade name on a licence",
    ],
    keywords: [["change", "trade", "name"], ["rename", "company", "uae"]],
    next: ["biz-amend-licence", "biz-trade-name-rules", "biz-bank-account-changes"],
  },
  {
    id: "biz-signage-approval",
    question: "Do I need approval for my shop sign?",
    answer:
      "Yes — exterior signage is approved separately by the municipality or the free zone, and the rules cover the Arabic text, the size and sometimes the materials. It catches people out because the licence being issued feels like the last step, and the sign is still ahead of them.",
    service: "business-setup",
    phrases: [
      "do i need approval for my shop signboard in dubai",
      "signage rules for a business in the uae",
      "does my sign have to be in arabic",
    ],
    keywords: [["signboard", "approval", "dubai"], ["signage", "rules", "business"]],
    next: ["biz-arabic-trade-name", "biz-premises-approval", "biz-ejari"],
  },

  /* ── Activities and the licence ────────────────────────────────────────── */
  {
    id: "biz-licence-types",
    question: "What types of trade licence are there?",
    answer:
      "Broadly four: commercial for trading, professional for services and expertise, industrial for manufacturing, and tourism for travel and hospitality. Which you hold determines what you may invoice for, and it follows from the activities you choose rather than from what you call yourself.",
    service: "business-setup",
    phrases: [
      "what types of trade licence are there in the uae",
      "difference between commercial and professional licence",
      "which kind of licence do i need in dubai",
    ],
    keywords: [["types", "trade", "licence"], ["commercial", "professional", "licence"]],
    next: ["biz-choose-activity", "biz-professional-licence", "biz-industrial-licence"],
  },
  {
    id: "biz-professional-licence",
    question: "What is a professional licence?",
    answer:
      "A professional licence covers services delivered through expertise rather than goods — consultancy, design, engineering, IT, marketing and similar. On the mainland it often comes with a national service agent rather than a shareholding partner, and it usually allows full foreign ownership of the business itself.",
    service: "business-setup",
    phrases: [
      "what is a professional licence in the uae",
      "do i need a professional or commercial licence",
      "professional licence for a services business in dubai",
    ],
    keywords: [["professional", "licence", "uae"], ["professional", "or", "commercial"]],
    next: ["biz-licence-types", "biz-local-service-agent", "biz-civil-company"],
  },
  {
    id: "biz-industrial-licence",
    question: "What do I need for a manufacturing or industrial licence?",
    answer:
      "An industrial licence, premises zoned for industrial use, municipality and environmental approvals, and usually an inspection of the plant before it is issued. The premises and the approvals are the gate, so the site is chosen with the approvals in mind rather than the other way round.",
    service: "business-setup",
    phrases: [
      "what do i need for a manufacturing licence in the uae",
      "how do i set up a factory in dubai",
      "industrial licence requirements uae",
    ],
    keywords: [["industrial", "licence", "requirements"], ["manufacturing", "licence", "uae"]],
    next: ["biz-premises-approval", "biz-warehouse", "biz-regulated-activities"],
  },
  {
    id: "biz-choose-activity",
    question: "How do I choose the right business activity?",
    answer:
      "Activities come from the licensing authority's own list — thousands of codes, each with its own conditions — and you pick the ones describing what you will actually invoice for. Too narrow means amending later; picking a regulated activity by accident means an approval you did not expect. This is the single most useful thing to get right on day one.",
    service: "business-setup",
    phrases: [
      "how do i choose the right business activity",
      "which activity code should i pick for my licence",
      "what activity covers what my business does",
    ],
    keywords: [["choose", "business", "activity"], ["which", "activity", "code"]],
    next: ["biz-multiple-activities", "biz-regulated-activities", "biz-add-activity"],
  },
  {
    id: "biz-multiple-activities",
    question: "Can I have more than one activity on one licence?",
    answer:
      "Usually yes, within limits: activities have to be compatible, and most authorities cap how many sit on a single licence or group them by category. Mixing trading and professional activities is the combination that most often needs two licences rather than one.",
    service: "business-setup",
    phrases: [
      "can i have more than one activity on my licence",
      "how many activities can a trade licence have",
      "can i mix trading and consultancy on one licence",
    ],
    keywords: [["more", "than", "one", "activity"], ["how", "many", "activities", "licence"]],
    next: ["biz-choose-activity", "biz-add-activity", "biz-dual-licence"],
  },
  {
    id: "biz-add-activity",
    question: "Can I add an activity after the licence is issued?",
    answer:
      "Yes, as a licence amendment. If the new activity is regulated it brings its own approval, and if it changes the licence category it can mean a new licence rather than an edit. Tell us what you want to add and we will say which of the three it is.",
    service: "business-setup",
    phrases: [
      "can i add an activity to my existing trade licence",
      "how do i amend the activities on my licence",
      "adding a new service to my company licence",
    ],
    keywords: [["add", "activity", "licence"], ["amend", "activities", "licence"]],
    next: ["biz-amend-licence", "biz-choose-activity", "biz-regulated-activities"],
  },
  {
    id: "biz-regulated-activities",
    question: "Which activities need extra government approval?",
    answer:
      "Anything touching health, education, finance, legal services, food, transport, security, telecoms, media or the environment normally needs a sector regulator's approval on top of the licence. That approval usually comes before the licence is issued rather than after, which is why it changes the timeline rather than just the paperwork.",
    service: "business-setup",
    phrases: [
      "which activities need extra government approval",
      "what is an external approval for a trade licence",
      "does my activity need a regulator sign off",
    ],
    keywords: [["external", "approval", "licence"], ["activities", "need", "approval"]],
    next: ["biz-choose-activity", "biz-initial-approval", "biz-licence-timeline"],
  },
  {
    id: "biz-initial-approval",
    question: "What is initial approval and why do I need it?",
    answer:
      "Initial approval is the authority saying it has no objection in principle to you carrying out the activity, before the rest of the file is assembled. It is what lets you proceed to the tenancy, the memorandum and any regulator approvals without gambling on whether the activity will be allowed at all.",
    service: "business-setup",
    phrases: [
      "what is initial approval for a trade licence",
      "why do i need initial approval in dubai",
      "what happens after initial approval is granted",
    ],
    keywords: [["initial", "approval", "licence"], ["initial", "approval", "dubai"]],
    next: ["biz-reserve-trade-name", "biz-first-steps", "biz-licence-timeline"],
  },
  {
    id: "biz-ecommerce-licence",
    question: "What does an e-commerce licence cover?",
    answer:
      "Selling goods or services online, through your own site or a marketplace. Whether you can hold stock locally, import it, and sell to UAE customers depends on the jurisdiction and the exact activity, so the licence is picked around how the goods actually move rather than around the website.",
    service: "business-setup",
    phrases: [
      "what does an e-commerce licence cover in the uae",
      "do i need a licence to sell online in dubai",
      "can i hold stock with an ecommerce licence",
    ],
    keywords: [["ecommerce", "licence", "cover"], ["licence", "sell", "online"]],
    next: ["biz-ecommerce-jurisdiction", "biz-payment-gateway", "biz-import-goods"],
  },
  {
    id: "biz-payment-gateway",
    question: "Can I get a payment gateway for my online business?",
    answer:
      "Payment providers want a trade licence with an e-commerce or matching activity, a corporate bank account, and a site that states who you are, what you sell and your refund terms. Applications are usually refused for a mismatch between the licensed activity and what the site actually sells, which is worth checking before applying.",
    service: "business-setup",
    phrases: [
      "how do i get a payment gateway in the uae",
      "can i accept online card payments with my licence",
      "payment gateway requirements for a dubai company",
    ],
    keywords: [["payment", "gateway", "uae"], ["accept", "online", "payments"]],
    next: ["biz-ecommerce-licence", "biz-bank-account", "biz-ecommerce-jurisdiction"],
  },
  {
    id: "biz-import-goods",
    question: "What do I need to import goods into the UAE?",
    answer:
      "A licence with a trading or import activity, a customs client code registered against the company, and product-specific approvals for anything regulated — food, cosmetics, electronics and medical goods each have their own. The customs code is a separate registration from the licence and is regularly forgotten until the first shipment arrives.",
    service: "business-setup",
    phrases: [
      "what do i need to import goods into the uae",
      "how do i get a customs code for my company",
      "importer registration requirements in dubai",
    ],
    keywords: [["import", "goods", "uae"], ["customs", "code", "company"]],
    next: ["biz-export-goods", "biz-warehouse", "biz-product-registration"],
  },
  {
    id: "biz-export-goods",
    question: "What is needed to export from the UAE?",
    answer:
      "A trading licence covering export, the customs client code, and the documentation the destination country requires — certificates of origin, chamber of commerce attestation and sometimes consular legalisation. The destination's requirements usually drive the paperwork more than the UAE's do.",
    service: "business-setup",
    phrases: [
      "what do i need to export goods from the uae",
      "how do i get a certificate of origin in dubai",
      "export documentation requirements uae",
    ],
    keywords: [["export", "goods", "uae"], ["certificate", "of", "origin"]],
    next: ["biz-import-goods", "biz-attest-corporate-documents", "biz-warehouse"],
  },
  {
    id: "biz-product-registration",
    question: "Do my products need to be registered before I can sell them?",
    answer:
      "Food, cosmetics, supplements, medical devices, electronics and children's products generally do, each with its own authority and its own labelling rules. Registration is per product rather than per company, so a wide catalogue is a bigger job than a narrow one. It is worth scoping before you order stock.",
    service: "business-setup",
    phrases: [
      "do i need to register my products before selling in the uae",
      "product registration requirements in dubai",
      "labelling rules for products sold in the uae",
    ],
    keywords: [["product", "registration", "uae"], ["labelling", "rules", "products"]],
    next: ["biz-import-goods", "biz-food-business", "biz-regulated-activities"],
  },
  {
    id: "biz-food-business",
    question: "What do I need to open a restaurant or food business?",
    answer:
      "A food trade licence, municipality food-safety approval on the premises, a food-handler-trained team, and approval of the kitchen layout before you fit it out. The premises approval is the gate — signing a lease before the layout is approved is the most common and most expensive mistake in this sector.",
    service: "business-setup",
    phrases: [
      "what do i need to open a restaurant in dubai",
      "how do i get a food licence in the uae",
      "requirements to open a cafe in dubai",
    ],
    keywords: [["open", "restaurant", "dubai"], ["food", "licence", "uae"]],
    next: ["biz-premises-approval", "biz-product-registration", "biz-regulated-activities"],
  },
  {
    id: "biz-real-estate-brokerage",
    question: "What is needed for a real estate brokerage?",
    answer:
      "A real estate licence, registration with the emirate's property regulator, and individually certified brokers who have sat the required training and exam. The broker cards are personal rather than corporate, so licensing the company is only half of it.",
    service: "business-setup",
    phrases: [
      "what do i need for a real estate brokerage in dubai",
      "how do i become a licensed property broker in the uae",
      "rera requirements for a real estate company",
    ],
    keywords: [["real", "estate", "brokerage"], ["property", "broker", "licence"]],
    next: ["biz-regulated-activities", "biz-licence-types", "biz-staff-qualifications"],
  },
  {
    id: "biz-medical-clinic",
    question: "What does opening a clinic involve?",
    answer:
      "Health authority approval of the facility and of every licensed practitioner, a premises inspection against clinical standards, and the trade licence issued on the back of both. Practitioner licensing runs on its own timetable and is the usual reason a clinic opens later than planned.",
    service: "business-setup",
    phrases: [
      "what do i need to open a clinic in dubai",
      "how do i get a medical facility licence in the uae",
      "requirements to open a medical centre in dubai",
    ],
    keywords: [["open", "clinic", "dubai"], ["medical", "facility", "licence"]],
    next: ["biz-staff-qualifications", "biz-regulated-activities", "biz-premises-approval"],
  },
  {
    id: "biz-education-training",
    question: "Can I open a training institute or school?",
    answer:
      "Yes, with education regulator approval covering the curriculum, the premises and the teaching staff, obtained before the licence. Corporate training is usually lighter to license than academic education, so which of the two you are doing changes the route substantially.",
    service: "business-setup",
    phrases: [
      "can i open a training institute in dubai",
      "what is needed to start a school in the uae",
      "licence for a training centre in dubai",
    ],
    keywords: [["training", "institute", "dubai"], ["open", "school", "uae"]],
    next: ["biz-regulated-activities", "biz-staff-qualifications", "biz-premises-approval"],
  },
  {
    id: "biz-construction-contracting",
    question: "What is needed for a contracting company?",
    answer:
      "A contracting licence, municipality classification that sets the size of work you may take on, and qualified engineers registered against the company. The classification is the part people underestimate — it decides which tenders you are eligible for at all.",
    service: "business-setup",
    phrases: [
      "what do i need for a contracting company in dubai",
      "how do i get a construction licence in the uae",
      "contractor classification requirements dubai",
    ],
    keywords: [["contracting", "company", "licence"], ["construction", "licence", "uae"]],
    next: ["biz-staff-qualifications", "biz-regulated-activities", "biz-government-clients"],
  },
  {
    id: "biz-transport-delivery",
    question: "Can I license a delivery or transport business?",
    answer:
      "Yes, with transport authority permits on top of the trade licence, and vehicle and driver permits separately. Delivery riders in particular carry their own permit conditions, so the fleet is licensed as well as the company.",
    service: "business-setup",
    phrases: [
      "can i start a delivery company in dubai",
      "what permits do i need for a transport business",
      "licensing a courier business in the uae",
    ],
    keywords: [["delivery", "company", "dubai"], ["transport", "business", "permits"]],
    next: ["biz-regulated-activities", "biz-staff-visas", "biz-licence-types"],
  },
  {
    id: "biz-crypto-fintech",
    question: "Can I set up a crypto or fintech business?",
    answer:
      "Only under a financial or virtual-asset regulator, and the free zone you choose determines which one. These are genuinely regulated activities with capital, governance and compliance requirements — not a licence you buy in a week. If this is the plan, the regulator conversation comes first and the company second.",
    service: "business-setup",
    phrases: [
      "can i set up a crypto company in dubai",
      "what licence do i need for a fintech in the uae",
      "virtual asset licence requirements dubai",
    ],
    keywords: [["crypto", "company", "dubai"], ["fintech", "licence", "uae"], ["virtual", "asset", "licence"]],
    next: ["biz-regulated-activities", "biz-free-zone-choice", "biz-bank-account"],
  },
  {
    id: "biz-freelance-permit",
    question: "What is a freelance permit and is it enough?",
    answer:
      "A freelance permit licenses you as an individual professional rather than as a company, and several free zones issue them. It is the lightest way to invoice legally and sponsor your own visa, but it is limited to your own professional work — the moment you want to trade goods, hire staff or sign as a company, you have outgrown it.",
    service: "business-setup",
    phrases: [
      "what is a freelance permit in the uae",
      "is a freelance licence enough to invoice clients",
      "difference between a freelance permit and a company licence",
    ],
    keywords: [["freelance", "permit", "uae"], ["freelance", "licence", "invoice"]],
    next: ["biz-freelance-to-company", "biz-consultant-jurisdiction", "biz-own-visa"],
  },
  {
    id: "biz-freelance-to-company",
    question: "I have a freelance permit. When should I upgrade to a company?",
    answer:
      "When you need to hire, when clients want to contract with an entity rather than a person, when you start trading goods, or when you want liability separated from you personally. Those are the four triggers, and hitting any one of them is usually the moment.",
    service: "business-setup",
    phrases: [
      "when should i upgrade from a freelance permit to a company",
      "can i convert my freelance licence into a company",
      "outgrowing a freelance permit in the uae",
    ],
    keywords: [["upgrade", "freelance", "company"], ["convert", "freelance", "licence"]],
    next: ["biz-freelance-permit", "biz-what-is-llc", "biz-staff-visas"],
  },
  {
    id: "biz-staff-qualifications",
    question: "Do my staff need their qualifications recognised?",
    answer:
      "In regulated sectors, yes — engineers, medical practitioners, teachers, brokers and lawyers all need their credentials verified and, usually, attested degrees behind them. Outside those sectors it is normally the visa process rather than the licence that asks. Which camp you are in is worth knowing before you make an offer.",
    service: "business-setup",
    phrases: [
      "do my employees need their degrees attested in the uae",
      "are professional qualifications recognised in dubai",
      "does my engineer need to be registered in the uae",
    ],
    keywords: [["qualifications", "recognised", "uae"], ["employee", "degree", "attested"]],
    next: ["biz-staff-visas", "biz-attest-corporate-documents", "biz-regulated-activities"],
  },
  {
    id: "biz-licence-timeline",
    question: "How long does it take to get a trade licence?",
    answer:
      "A straightforward free zone licence with no external approvals is quick once the documents are in. Mainland takes longer because of the tenancy, the notarised memorandum and any regulator approvals, and a regulated activity can add materially on its own. We give a timeline for your case rather than a headline number that would be wrong for most people.",
    service: "business-setup",
    phrases: [
      "how long does it take to get a trade licence in dubai",
      "how quickly can i set up a company in the uae",
      "company formation processing time in dubai",
    ],
    keywords: [["how", "long", "trade", "licence"], ["company", "formation", "time"]],
    next: ["biz-first-steps", "biz-regulated-activities", "biz-documents-needed"],
  },

  /* ── Free zones ────────────────────────────────────────────────────────── */
  {
    id: "biz-free-zone-choice",
    question: "How do I choose between free zones?",
    answer:
      "By what they allow and what they include, not by the brochure. The questions that actually separate them are: does it licence my activity, how many visas does the package carry, what premises must I take, is it recognised by the banks, and how easy is it to renew or exit. We narrow it on those rather than listing forty zones at you.",
    service: "business-setup",
    phrases: [
      "how do i choose between free zones in the uae",
      "which free zone is best for my business",
      "what should i compare when picking a free zone",
    ],
    keywords: [["choose", "between", "free", "zones"], ["which", "free", "zone", "best"]],
    next: ["biz-free-zone-visa-quota", "biz-free-zone-bank-reputation", "biz-free-zone-packages"],
  },
  {
    id: "biz-free-zone-packages",
    question: "What is actually included in a free zone package?",
    answer:
      "Usually the licence, a form of desk or office allocation, a set number of visa slots and the establishment card. What is often not included: the visa costs themselves, medical and Emirates ID, the establishment card renewal, and any activity-specific approval. Ask for the exclusions rather than the inclusions — that is where the surprises live.",
    service: "business-setup",
    phrases: [
      "what is included in a free zone package",
      "what is not included in a freezone licence package",
      "are visas included in a free zone package",
    ],
    keywords: [["included", "free", "zone", "package"], ["freezone", "package", "includes"]],
    next: ["biz-free-zone-visa-quota", "biz-free-zone-choice", "biz-hidden-costs"],
  },
  {
    id: "biz-free-zone-visa-quota",
    question: "How many visas does a free zone licence come with?",
    answer:
      "It depends on the zone and on the space you take: a flexi-desk carries a small allocation, a private office more, and a warehouse more again. If you know you need a particular number of visas, say so before choosing the zone — quota is one of the few things that is genuinely hard to change afterwards.",
    service: "business-setup",
    phrases: [
      "how many visas does a free zone licence include",
      "how do i increase my visa quota in a free zone",
      "does a flexi desk come with visas",
    ],
    keywords: [["visa", "quota", "free", "zone"], ["how", "many", "visas", "licence"]],
    next: ["biz-flexi-desk-visas", "biz-increase-quota", "biz-free-zone-packages"],
  },
  {
    id: "biz-flexi-desk-visas",
    question: "How many visas can I get with a flexi desk?",
    answer:
      "Typically a small number — enough for a founder and perhaps one or two staff, varying by zone. Beyond that you take more space. If your plan needs a team in year one, a flexi desk is a false economy and it is better to know that before the licence is issued.",
    service: "business-setup",
    phrases: [
      "how many visas can i get with a flexi desk",
      "is a flexi desk enough for my staff visas",
      "flexi desk visa allocation in a free zone",
    ],
    keywords: [["flexi", "desk", "visas"], ["shared", "desk", "visa", "allocation"]],
    next: ["biz-free-zone-visa-quota", "biz-increase-quota", "biz-work-from-home"],
  },
  {
    id: "biz-increase-quota",
    question: "How do I increase my visa quota?",
    answer:
      "By taking more space, on the mainland by a larger Ejari-registered tenancy, and in a free zone by moving to a bigger package. Some authorities allow a quota increase application on its own where the space supports it. Either way it is a change to the licence rather than a request to immigration.",
    service: "business-setup",
    phrases: [
      "how do i increase my company visa quota",
      "can i get more visas without moving office",
      "increasing the visa allocation on my licence",
    ],
    keywords: [["increase", "visa", "quota"], ["more", "visas", "licence"]],
    next: ["biz-free-zone-visa-quota", "biz-ejari", "biz-staff-visas"],
  },
  {
    id: "biz-free-zone-bank-reputation",
    question: "Does the free zone I pick affect opening a bank account?",
    answer:
      "In practice, yes. Banks are comfortable with some zones and more cautious about others, and an entity with no real premises and a hard-to-explain activity gets more questions wherever it is registered. If a UAE bank account is essential to your plan, factor that into the zone choice rather than discovering it afterwards.",
    service: "business-setup",
    phrases: [
      "does my free zone affect opening a bank account",
      "which free zones do banks prefer in the uae",
      "is it harder to open a bank account in some free zones",
    ],
    keywords: [["free", "zone", "bank", "account"], ["banks", "prefer", "free", "zone"]],
    next: ["biz-bank-account", "biz-bank-rejected", "biz-free-zone-choice"],
  },
  {
    id: "biz-free-zone-audit",
    question: "Does a free zone company have to file audited accounts?",
    answer:
      "Many zones require audited financial statements at renewal, and the requirement has been spreading rather than receding. Even where it is not demanded, corporate tax has made proper books a practical necessity. Treat bookkeeping as part of running the company rather than something to sort out at year end.",
    service: "business-setup",
    phrases: [
      "does a free zone company need audited accounts",
      "do i have to file financial statements in a free zone",
      "is an audit required to renew a freezone licence",
    ],
    keywords: [["free", "zone", "audited", "accounts"], ["audit", "required", "renewal"]],
    next: ["biz-bookkeeping", "biz-corporate-tax", "biz-renewal"],
  },
  {
    id: "biz-free-zone-qualifying-income",
    question: "Do free zone companies still pay corporate tax?",
    answer:
      "Free zone entities are within the corporate tax regime, and a qualifying free zone person can benefit from a preferential rate on qualifying income while other income is taxed normally. Whether your revenue qualifies depends on what you do and who you do it with, so it is a question for a tax adviser on your actual numbers rather than a rule of thumb.",
    service: "business-setup",
    phrases: [
      "do free zone companies pay corporate tax in the uae",
      "what is qualifying income for a free zone company",
      "is a freezone company tax exempt",
    ],
    keywords: [["free", "zone", "corporate", "tax"], ["qualifying", "income", "freezone"]],
    next: ["biz-corporate-tax", "biz-tax-advice-limits", "biz-free-zone-audit"],
  },
  {
    id: "biz-free-zone-office-requirement",
    question: "Do I have to take an office in the free zone I register in?",
    answer:
      "You have to take whatever premises option the zone requires, which ranges from a shared desk to a full office or warehouse. What you cannot generally do is register in a zone and operate from premises somewhere else — the address on the licence is expected to be real.",
    service: "business-setup",
    phrases: [
      "do i need a physical office in a free zone",
      "can i register in one free zone and work elsewhere",
      "premises requirement for a freezone licence",
    ],
    keywords: [["office", "required", "free", "zone"], ["premises", "requirement", "freezone"]],
    next: ["biz-flexi-desk-visas", "biz-work-from-home", "biz-free-zone-packages"],
  },
  {
    id: "biz-free-zone-exit",
    question: "How hard is it to close or leave a free zone company?",
    answer:
      "Harder than opening one. Expect visa cancellations, a clearance from the zone, settlement of any outstanding fees, closure of the bank account and often an audited liquidation statement. Zones differ a lot on this, which is a fair reason to ask about exit before you enter.",
    service: "business-setup",
    phrases: [
      "how do i close a free zone company",
      "is it difficult to shut down a freezone licence",
      "what does it take to deregister a free zone company",
    ],
    keywords: [["close", "free", "zone", "company"], ["deregister", "freezone", "licence"]],
    next: ["biz-close-company", "biz-cancel-visas", "biz-free-zone-choice"],
  },
  {
    id: "biz-free-zone-employee-rules",
    question: "Do free zone companies follow the same labour rules?",
    answer:
      "Free zones run their own employment frameworks, and some — the financial centres in particular — have their own employment law entirely. Contracts, end-of-service calculations and notice periods can differ from the federal position, so the contract template should come from the zone your entity sits in.",
    service: "business-setup",
    phrases: [
      "do free zone companies follow uae labour law",
      "are employment rules different in a free zone",
      "which labour law applies to my freezone staff",
    ],
    keywords: [["free", "zone", "labour", "law"], ["employment", "rules", "freezone"]],
    next: ["biz-employment-contracts", "biz-staff-visas", "biz-wps"],
  },
  {
    id: "biz-financial-free-zones",
    question: "What is different about DIFC and ADGM?",
    answer:
      "They are financial free zones with their own civil and commercial law based on common law, their own courts and their own regulator. That suits financial services, funds and businesses that want English-law-style contracts and a familiar court, and it is heavier and more expensive than an ordinary free zone for a business that needs none of that.",
    service: "business-setup",
    phrases: [
      "what is the difference between difc and a normal free zone",
      "should i set up in difc or adgm",
      "why would i register a company in adgm",
    ],
    keywords: [["difc", "adgm", "difference"], ["financial", "free", "zone"]],
    next: ["biz-crypto-fintech", "biz-free-zone-choice", "biz-free-zone-employee-rules"],
  },
  {
    id: "biz-free-zone-renewal",
    question: "What happens at free zone licence renewal?",
    answer:
      "The licence, the premises agreement and the establishment card are renewed together, usually with any required audited accounts and an up-to-date UBO filing. Late renewal attracts penalties and can block visa transactions, so the renewal date is one to diarise rather than wait to be reminded about.",
    service: "business-setup",
    phrases: [
      "what do i need to renew a free zone licence",
      "what happens if i renew my freezone licence late",
      "free zone licence renewal requirements",
    ],
    keywords: [["renew", "free", "zone", "licence"], ["freezone", "renewal", "requirements"]],
    next: ["biz-renewal", "biz-late-renewal", "biz-free-zone-audit"],
  },
  {
    id: "biz-free-zone-change-activity",
    question: "Can I change my activity within a free zone?",
    answer:
      "Usually yes, provided the zone licenses the new activity at all — and that is the catch, because zones specialise. Moving from a media activity to a trading one can mean moving zone rather than amending a licence. Check the new activity is available before assuming it is an amendment.",
    service: "business-setup",
    phrases: [
      "can i change my activity in a free zone",
      "what if my free zone does not licence my new activity",
      "amending activities on a freezone licence",
    ],
    keywords: [["change", "activity", "free", "zone"], ["freezone", "amend", "activity"]],
    next: ["biz-add-activity", "biz-free-zone-choice", "biz-jurisdiction-change"],
  },

  /* ── Premises ──────────────────────────────────────────────────────────── */
  {
    id: "biz-ejari",
    question: "What is Ejari and why does my licence need it?",
    answer:
      "Ejari is Dubai's tenancy registration system, and a registered tenancy contract is what proves your company has premises. On the mainland the licence and the visa quota both hang off it, so the tenancy is not paperwork that follows the licence — it comes first.",
    service: "business-setup",
    phrases: [
      "what is ejari and why do i need it",
      "do i need a registered tenancy for my trade licence",
      "ejari requirement for company registration in dubai",
    ],
    keywords: [["ejari"], ["ejari", "trade", "licence"]],
    next: ["biz-premises-approval", "biz-increase-quota", "biz-work-from-home"],
  },
  {
    id: "biz-premises-approval",
    question: "Does my premises need approval before I sign the lease?",
    answer:
      "For anything regulated — food, clinical, industrial, education — yes, and the approval is of that specific unit for that specific use. Signing a lease on a unit that cannot be approved for your activity is the most expensive avoidable mistake in the whole process. Get the use confirmed before you commit.",
    service: "business-setup",
    phrases: [
      "does my premises need approval before signing a lease",
      "can my activity be approved in this unit",
      "do i need municipality approval for my office",
    ],
    keywords: [["premises", "approval", "lease"], ["municipality", "approval", "unit"]],
    next: ["biz-ejari", "biz-food-business", "biz-fit-out"],
  },
  {
    id: "biz-fit-out",
    question: "Do I need approval to fit out my space?",
    answer:
      "Usually yes for anything structural, and always for kitchens, clinics and anything with plumbing or ventilation changes. Approvals are per drawing rather than per company, and the landlord and the authority both have a say. Build the approval time into the plan rather than treating it as a formality.",
    service: "business-setup",
    phrases: [
      "do i need approval to fit out my office in dubai",
      "who approves a shop fit out in the uae",
      "fit out permit requirements dubai",
    ],
    keywords: [["fit", "out", "approval"], ["fit", "out", "permit"]],
    next: ["biz-premises-approval", "biz-signage-approval", "biz-food-business"],
  },
  {
    id: "biz-warehouse",
    question: "What do I need to rent a warehouse?",
    answer:
      "A licence with a matching activity, premises zoned for storage or industrial use, civil defence approval, and any goods-specific approvals for what you intend to store. Storing regulated goods in a unit approved only for general storage is a common and serious finding at inspection.",
    service: "business-setup",
    phrases: [
      "what do i need to rent a warehouse in dubai",
      "can my company store goods in any warehouse",
      "warehouse licensing requirements in the uae",
    ],
    keywords: [["rent", "warehouse", "dubai"], ["warehouse", "requirements", "uae"]],
    next: ["biz-premises-approval", "biz-import-goods", "biz-industrial-licence"],
  },
  {
    id: "biz-virtual-office",
    question: "Can I use a virtual office address?",
    answer:
      "Only where the authority offers one as part of its own package — a mailbox service bought independently does not usually satisfy the premises requirement. Banks are also sceptical of addresses shared by hundreds of companies, so a virtual address can pass licensing and still cost you the account.",
    service: "business-setup",
    phrases: [
      "can i use a virtual office for my trade licence",
      "is a mailbox address enough for company registration",
      "do banks accept a virtual office address",
    ],
    keywords: [["virtual", "office", "licence"], ["mailbox", "address", "company"]],
    next: ["biz-work-from-home", "biz-free-zone-office-requirement", "biz-bank-rejected"],
  },
  {
    id: "biz-shared-office",
    question: "Can two companies share the same office?",
    answer:
      "Sometimes, where the authority allows a shared or serviced arrangement and each has its own registered allocation. What does not work is two licences quoting one tenancy that only supports one. Inspections do check, and the consequence lands on the licence rather than the landlord.",
    service: "business-setup",
    phrases: [
      "can two companies share one office in dubai",
      "can i sublet part of my office to another company",
      "shared office rules for uae trade licences",
    ],
    keywords: [["two", "companies", "share", "office"], ["sublet", "office", "company"]],
    next: ["biz-ejari", "biz-virtual-office", "biz-premises-approval"],
  },
  {
    id: "biz-move-premises",
    question: "What happens if I move office?",
    answer:
      "The licence is amended to the new address, the tenancy is registered, and the establishment card and any signage approvals follow. Your visa quota may change with the space, in either direction. Tell the bank too — a stale registered address is a common reason for an account review.",
    service: "business-setup",
    phrases: [
      "what do i do if my company moves office",
      "how do i change the address on my trade licence",
      "moving premises and updating my licence in dubai",
    ],
    keywords: [["change", "address", "licence"], ["move", "office", "licence"]],
    next: ["biz-amend-licence", "biz-ejari", "biz-increase-quota"],
  },
  {
    id: "biz-home-business",
    question: "Can I run a business from my residence?",
    answer:
      "There are specific home-business permits in some emirates for a defined list of low-impact activities, and they are narrower than people hope — generally no staff, no visitors and no signage. Beyond that list, a residence is not licensable premises, and a free zone desk package is the realistic route.",
    service: "business-setup",
    phrases: [
      "can i run a business from my home in the uae",
      "is there a home business licence in dubai",
      "can i get a licence using my residential address",
    ],
    keywords: [["home", "business", "permit"], ["residential", "address", "licence"]],
    next: ["biz-work-from-home", "biz-freelance-permit", "biz-virtual-office"],
  },

  /* ── Visas, staff and the establishment card ───────────────────────────── */
  {
    id: "biz-establishment-card",
    question: "What is an establishment card?",
    answer:
      "The establishment card — sometimes called the immigration card — registers your company with immigration and is what lets it sponsor anyone at all. It is issued after the licence and renewed alongside it, and without a valid one every visa transaction stops, including renewals for staff already here.",
    service: "business-setup",
    phrases: [
      "what is an establishment card in the uae",
      "what is an immigration card for a company",
      "do i need an establishment card to sponsor staff",
    ],
    keywords: [["establishment", "card"], ["immigration", "card", "company"]],
    next: ["biz-own-visa", "biz-staff-visas", "biz-renewal"],
  },
  {
    id: "biz-own-visa",
    question: "Can I get my own residence visa through my company?",
    answer:
      "Yes — that is the usual reason people incorporate rather than stay on a freelance arrangement. The company sponsors you as investor or as employee, and the sequence is licence, establishment card, entry permit, medical and Emirates ID, then the visa stamped or issued digitally.",
    service: "business-setup",
    phrases: [
      "can i sponsor my own visa through my company",
      "how do i get a residence visa from my own business",
      "investor visa through my uae company",
    ],
    keywords: [["sponsor", "own", "visa"], ["investor", "visa", "company"]],
    next: ["biz-investor-vs-employment-visa", "biz-establishment-card", "biz-sponsor-family"],
  },
  {
    id: "biz-investor-vs-employment-visa",
    question: "Should I be on an investor visa or an employment visa in my own company?",
    answer:
      "An investor or partner visa reflects that you own the business; an employment visa makes you an employee of it, with a contract and end-of-service rights. The choice affects labour registration, bank perception and sometimes what you can do elsewhere. It is worth deciding rather than defaulting.",
    service: "business-setup",
    phrases: [
      "should i take an investor visa or an employment visa",
      "difference between partner visa and employment visa uae",
      "can the owner be an employee of their own company",
    ],
    keywords: [["investor", "visa", "employment", "visa"], ["partner", "visa", "difference"]],
    next: ["biz-own-visa", "biz-employment-contracts", "biz-wps"],
  },
  {
    id: "biz-sponsor-family",
    question: "Can I sponsor my family once I have a company?",
    answer:
      "Generally yes, once you hold a valid residence visa yourself and meet the income and accommodation conditions immigration applies. It is a separate application from your own, made after your visa is issued rather than alongside it.",
    service: "business-setup",
    phrases: [
      "can i sponsor my family through my own company",
      "how do i bring my wife and children to the uae",
      "family visa requirements for a business owner",
    ],
    keywords: [["sponsor", "family", "company"], ["family", "visa", "business", "owner"]],
    next: ["biz-own-visa", "biz-establishment-card", "biz-staff-visas"],
  },
  {
    id: "biz-staff-visas",
    question: "How do I hire and sponsor employees?",
    answer:
      "Within your visa quota: a labour contract registered with the relevant authority, an entry permit, medical testing, Emirates ID and then the residence visa. Mainland runs through the labour ministry, free zones through their own authority. The quota is the binding constraint, so check it before you make offers.",
    service: "business-setup",
    phrases: [
      "how do i sponsor employees in my uae company",
      "what is the process to hire staff in dubai",
      "steps to get an employment visa for my employee",
    ],
    keywords: [["sponsor", "employees", "company"], ["hire", "staff", "dubai"]],
    next: ["biz-employment-contracts", "biz-increase-quota", "biz-wps"],
  },
  {
    id: "biz-employment-contracts",
    question: "What has to be in a UAE employment contract?",
    answer:
      "A registered contract in the authority's own format, stating role, pay, working hours, leave and notice, alongside any private agreement that does not contradict it. Where a side letter says something better than the registered contract, the registered one is what the authority will enforce — so put the real terms in it.",
    service: "business-setup",
    phrases: [
      "what must a uae employment contract include",
      "do i have to register employment contracts in dubai",
      "can i have a separate agreement with my employee",
    ],
    keywords: [["employment", "contract", "include"], ["register", "employment", "contract"]],
    next: ["biz-wps", "biz-end-of-service", "biz-free-zone-employee-rules"],
  },
  {
    id: "biz-wps",
    question: "What is the Wage Protection System?",
    answer:
      "WPS is the system through which salaries must be paid to employees via an approved channel so that payment is recorded. Non-compliance blocks new work permits and can suspend the licence's ability to transact. It is one of the obligations that quietly stops a company from hiring.",
    service: "business-setup",
    phrases: [
      "what is the wage protection system in the uae",
      "do i have to pay salaries through wps",
      "what happens if i do not comply with wps",
    ],
    keywords: [["wage", "protection", "system"], ["wps", "salaries"]],
    next: ["biz-employment-contracts", "biz-bank-account", "biz-staff-visas"],
  },
  {
    id: "biz-end-of-service",
    question: "What is end of service gratuity and do I have to budget for it?",
    answer:
      "It is the terminal payment an employee accrues over their service, calculated on basic salary and length of service under the applicable law or free zone framework. It accrues from day one whether or not you set money aside, so treating it as a liability from the start rather than a surprise at the end is the sensible approach.",
    service: "business-setup",
    phrases: [
      "what is end of service gratuity in the uae",
      "do i have to pay gratuity to my employees",
      "how is end of service benefit calculated in dubai",
    ],
    keywords: [["end", "of", "service", "gratuity"], ["gratuity", "employees", "uae"]],
    next: ["biz-employment-contracts", "biz-bookkeeping", "biz-free-zone-employee-rules"],
  },
  {
    id: "biz-emiratisation",
    question: "Does Emiratisation apply to my company?",
    answer:
      "Emiratisation targets apply to mainland companies above a headcount threshold, with quotas and penalties administered by the labour ministry. Smaller companies and many free zone entities fall outside it, but the thresholds have moved over time. If you are hiring into the dozens, it should be part of the plan rather than a shock.",
    service: "business-setup",
    phrases: [
      "does emiratisation apply to my company",
      "what are the emiratisation quotas in the uae",
      "do free zone companies have emiratisation targets",
    ],
    keywords: [["emiratisation", "quota"], ["emiratisation", "apply", "company"]],
    next: ["biz-staff-visas", "biz-compliance-calendar", "biz-employment-contracts"],
  },
  {
    id: "biz-medical-insurance",
    question: "Do I have to provide health insurance for my staff?",
    answer:
      "In Dubai and Abu Dhabi, yes — employer-provided cover is mandatory and is checked at visa issue and renewal. The minimum level of cover is set by the health authority. It is a real recurring cost per head, so it belongs in the plan alongside salary rather than after it.",
    service: "business-setup",
    phrases: [
      "do i have to provide health insurance for employees",
      "is medical insurance mandatory for staff in dubai",
      "employer health cover requirements in the uae",
    ],
    keywords: [["health", "insurance", "employees"], ["medical", "insurance", "mandatory"]],
    next: ["biz-staff-visas", "biz-end-of-service", "biz-compliance-calendar"],
  },
  {
    id: "biz-golden-visa",
    question: "Can setting up a company get me a golden visa?",
    answer:
      "A long-term residence is granted on criteria set by the authorities — investment, entrepreneurship, specialised talent and similar — and simply holding a licence is not one of them. Some founders do qualify through the entrepreneur or investor routes. It is assessed against the published criteria rather than promised, and anyone guaranteeing one is not being straight with you.",
    service: "business-setup",
    phrases: [
      "can i get a golden visa by setting up a company",
      "does a trade licence qualify me for long term residence",
      "golden visa criteria for entrepreneurs in the uae",
    ],
    keywords: [["golden", "visa", "company"], ["long", "term", "residence", "criteria"]],
    next: ["biz-own-visa", "biz-investor-vs-employment-visa", "biz-sponsor-family"],
  },
  {
    id: "biz-visa-while-employed",
    question: "Can I open a company while I am employed on someone else's visa?",
    answer:
      "You can usually own shares while employed elsewhere, but taking a second visa or acting as manager may need your employer's no-objection and can conflict with your contract. Ownership and sponsorship are different questions, and it is the second that causes problems. Check your contract before you file anything.",
    service: "business-setup",
    phrases: [
      "can i start a company while employed in the uae",
      "do i need an noc from my employer to open a business",
      "can i own a company on someone else's visa",
    ],
    keywords: [["company", "while", "employed"], ["noc", "employer", "business"]],
    next: ["biz-own-visa", "biz-silent-partner", "biz-freelance-permit"],
  },
  {
    id: "biz-cancel-visas",
    question: "What happens to visas if I close the company?",
    answer:
      "Every residence visa the company sponsors, including your own and any family sponsored through it, must be cancelled before the licence can be closed. That is the step that governs the timeline, and it is why closure is planned around people rather than paperwork.",
    service: "business-setup",
    phrases: [
      "what happens to visas when a company closes",
      "do i have to cancel staff visas before closing my licence",
      "closing a company with employees on its sponsorship",
    ],
    keywords: [["cancel", "visas", "closing"], ["visas", "company", "closes"]],
    next: ["biz-close-company", "biz-free-zone-exit", "biz-staff-visas"],
  },
  {
    id: "biz-visa-rejected",
    question: "An employee visa application was rejected. What now?",
    answer:
      "Find the actual reason before reapplying — the usual ones are a medical result, a security check, a document mismatch such as a name spelled differently on the passport and the degree, or a quota that was already full. Each has a different fix, and reapplying without knowing which usually produces the same answer.",
    service: "business-setup",
    phrases: [
      "my employee visa application was rejected",
      "why would a uae employment visa be refused",
      "what do i do if a staff visa is rejected",
    ],
    keywords: [["visa", "application", "rejected"], ["employment", "visa", "refused"]],
    next: ["biz-staff-qualifications", "biz-staff-visas", "biz-name-mismatch"],
  },
  {
    id: "biz-name-mismatch",
    question: "My name is spelled differently on my passport and my certificates. Is that a problem?",
    answer:
      "Frequently, yes — it is one of the most common causes of a rejected file, because the authority cannot confirm two documents describe the same person. It is fixable, usually with an affidavit or a corrected translation, but it is better found at the start than at submission.",
    service: "business-setup",
    phrases: [
      "my name is spelled differently on my passport and degree",
      "does a name mismatch cause visa rejection in the uae",
      "different spelling of my name on documents",
    ],
    keywords: [["name", "spelled", "differently"], ["name", "mismatch", "documents"]],
    next: ["biz-visa-rejected", "biz-staff-qualifications", "biz-documents-needed"],
  },
  {
    id: "biz-part-time-staff",
    question: "Can I hire someone part-time or on a freelance basis?",
    answer:
      "There are part-time and flexible work permits, and you can contract a freelancer who holds their own permit. What is not allowed is paying someone with no permit at all, or someone whose visa is sponsored elsewhere without the right permission. The permit, not the invoice, is what makes it lawful.",
    service: "business-setup",
    phrases: [
      "can i hire someone part time in the uae",
      "can i pay a freelancer who is on another company's visa",
      "part time work permit requirements dubai",
    ],
    keywords: [["hire", "part", "time"], ["part", "time", "work", "permit"]],
    next: ["biz-staff-visas", "biz-freelance-permit", "biz-employment-contracts"],
  },
  {
    id: "biz-remote-staff",
    question: "Can my UAE company employ people who live abroad?",
    answer:
      "You can contract people overseas as suppliers or employ them under their own country's law, but they are not UAE employees and your company cannot sponsor them where they live. Payroll, tax and social security then follow their country's rules rather than yours, which is worth advice before you scale it.",
    service: "business-setup",
    phrases: [
      "can my uae company hire people who live abroad",
      "employing remote workers from a dubai company",
      "paying overseas contractors from my uae business",
    ],
    keywords: [["hire", "people", "abroad"], ["remote", "workers", "uae", "company"]],
    next: ["biz-staff-visas", "biz-corporate-tax", "biz-bookkeeping"],
  },
  {
    id: "biz-labour-ban",
    question: "What is a labour ban and can it affect my hire?",
    answer:
      "A ban or restriction can follow how a previous employment ended and can block a new work permit for a period. It is checked at permit stage rather than at offer stage, which is why a candidate can accept a job and then not be permitted to take it. Ask before you sign, not after.",
    service: "business-setup",
    phrases: [
      "what is a labour ban in the uae",
      "can i hire someone with a work ban",
      "does a previous employer affect a new work permit",
    ],
    keywords: [["labour", "ban", "uae"], ["work", "ban", "hire"]],
    next: ["biz-staff-visas", "biz-visa-rejected", "biz-employment-contracts"],
  },
  {
    id: "biz-work-permit-vs-visa",
    question: "What is the difference between a work permit and a residence visa?",
    answer:
      "The work permit is authority to employ that person in that role; the residence visa is their right to live here. They are issued by different processes and both are needed. People assume the visa implies the permit, and a permit problem is what usually stops a hire.",
    service: "business-setup",
    phrases: [
      "difference between a work permit and a residence visa",
      "do i need both a labour card and a visa",
      "what is a work permit in the uae",
    ],
    keywords: [["work", "permit", "residence", "visa"], ["labour", "card", "visa"]],
    next: ["biz-staff-visas", "biz-labour-ban", "biz-employment-contracts"],
  },
  {
    id: "biz-visa-timeline",
    question: "How long does a company visa take once the licence is out?",
    answer:
      "The establishment card comes first, then entry permit, medical, Emirates ID and the visa itself, each with its own queue. The steps are sequential rather than parallel, so the total depends on the slowest one — typically the medical and ID appointments. We give you a realistic sequence rather than a single number.",
    service: "business-setup",
    phrases: [
      "how long does a company visa take in the uae",
      "how quickly can i get my residence visa after the licence",
      "timeline for an investor visa in dubai",
    ],
    keywords: [["how", "long", "company", "visa"], ["visa", "timeline", "after", "licence"]],
    next: ["biz-own-visa", "biz-establishment-card", "biz-licence-timeline"],
  },

  /* ── Banking ───────────────────────────────────────────────────────────── */
  {
    id: "biz-bank-account",
    question: "How do I open a corporate bank account?",
    answer:
      "With the licence, memorandum, establishment card, shareholder passports and visas, and — the part that decides it — a credible account of what the business does, who pays it and roughly how much moves through. Banks are assessing risk, not processing a form, so the business explanation matters more than the folder.",
    service: "business-setup",
    phrases: [
      "how do i open a corporate bank account in the uae",
      "what documents does a bank need to open a company account",
      "business bank account requirements in dubai",
    ],
    keywords: [["corporate", "bank", "account"], ["business", "bank", "account", "requirements"]],
    next: ["biz-bank-rejected", "biz-bank-compliance", "biz-bank-timeline"],
  },
  {
    id: "biz-bank-compliance",
    question: "Why does the bank ask so many questions?",
    answer:
      "Because it is required to know its customer and the source of the funds, and to keep knowing. Expect questions about your suppliers, your customers, the countries money comes from and who ultimately owns the company. Clear, consistent answers open accounts; vague ones close them.",
    service: "business-setup",
    phrases: [
      "why does the bank ask so many questions about my business",
      "what is kyc for a corporate bank account",
      "bank compliance questions for a new uae company",
    ],
    keywords: [["bank", "kyc", "questions"], ["source", "of", "funds", "bank"]],
    next: ["biz-bank-rejected", "biz-aml-obligations", "biz-bank-account"],
  },
  {
    id: "biz-bank-rejected",
    question: "The bank refused my account application. What now?",
    answer:
      "Banks rarely give a reason, but the recurring causes are a thin or unclear business story, an activity the bank has no appetite for, no real premises, shareholders from a jurisdiction the bank avoids, or inconsistencies between the licence and what you described. Fixing the story and choosing a bank that wants your sector is usually more effective than reapplying to the same one.",
    service: "business-setup",
    phrases: [
      "the bank rejected my company account application",
      "why do banks refuse to open accounts for new companies",
      "what to do if my business bank account is declined",
    ],
    keywords: [["bank", "rejected", "account"], ["bank", "refused", "company", "account"]],
    next: ["biz-bank-compliance", "biz-free-zone-bank-reputation", "biz-bank-account"],
  },
  {
    id: "biz-bank-timeline",
    question: "How long does a corporate account take to open?",
    answer:
      "Longer than most people plan for, because compliance review is the slow part and it is not something the branch controls. Prepare the business explanation and supporting contracts up front — the applications that move quickly are the ones where nothing has to be chased.",
    service: "business-setup",
    phrases: [
      "how long does it take to open a corporate bank account",
      "why is my company bank account taking so long",
      "bank account opening time in the uae",
    ],
    keywords: [["how", "long", "bank", "account"], ["bank", "account", "taking", "long"]],
    next: ["biz-bank-account", "biz-bank-compliance", "biz-bank-rejected"],
  },
  {
    id: "biz-bank-signatory",
    question: "Who can sign on the company bank account?",
    answer:
      "Whoever the shareholders authorise, usually the manager named on the licence, recorded in a bank mandate and often supported by a notarised resolution. Changing signatories later is a bank process in its own right, so getting the mandate right at opening saves a repeat of the whole exercise.",
    service: "business-setup",
    phrases: [
      "who can be a signatory on a company bank account",
      "how do i change the authorised signatory at the bank",
      "bank mandate for a uae company account",
    ],
    keywords: [["authorised", "signatory", "bank"], ["bank", "mandate", "company"]],
    next: ["biz-change-manager", "biz-notarise-company-documents", "biz-bank-account"],
  },
  {
    id: "biz-minimum-balance",
    question: "Do corporate accounts have a minimum balance?",
    answer:
      "Most do, and falling below it typically triggers a monthly charge rather than closure. The level varies a great deal between banks and account tiers, so it is one of the specific things to ask each bank rather than assume. It is a real running cost and belongs in the plan.",
    service: "business-setup",
    phrases: [
      "do uae business accounts have a minimum balance",
      "what happens if my company account goes below the minimum",
      "minimum balance requirement for a corporate account",
    ],
    keywords: [["minimum", "balance", "corporate", "account"], ["minimum", "balance", "business", "account"]],
    next: ["biz-bank-account", "biz-hidden-costs", "biz-bank-compliance"],
  },
  {
    id: "biz-offshore-bank-account",
    question: "Can an offshore company open a UAE bank account?",
    answer:
      "Some banks will, and many will not, because an entity with no premises, no staff and no local activity is harder to justify under their own compliance rules. If banking is essential, that is an argument for a free zone or mainland entity rather than an offshore one.",
    service: "business-setup",
    phrases: [
      "can an offshore company open a bank account in the uae",
      "do banks accept offshore companies in dubai",
      "banking options for a uae offshore company",
    ],
    keywords: [["offshore", "company", "bank", "account"], ["banks", "offshore", "dubai"]],
    next: ["biz-offshore-company", "biz-bank-rejected", "biz-bank-compliance"],
  },
  {
    id: "biz-account-frozen",
    question: "My company account has been frozen or is under review. What should I do?",
    answer:
      "Respond to whatever the bank has asked for, completely and quickly, because a partial answer extends the review. Most reviews are triggered by a transaction that did not match the declared business, or by documents that have expired. If the licence or UBO filing has lapsed, fix that first — it is often the actual cause.",
    service: "business-setup",
    phrases: [
      "my company bank account has been frozen",
      "why is my business account under review",
      "bank suspended my company account in the uae",
    ],
    keywords: [["account", "frozen", "company"], ["business", "account", "under", "review"]],
    next: ["biz-bank-compliance", "biz-ubo-register", "biz-renewal"],
  },

  /* ── Tax, accounting and compliance ────────────────────────────────────── */
  {
    id: "biz-corporate-tax",
    question: "Does my UAE company have to pay corporate tax?",
    answer:
      "The UAE has a federal corporate tax regime, and companies are expected to register for it and file, including many that end up owing nothing. Registration is an obligation in its own right, separate from whether tax is due. Rates, thresholds and reliefs are the tax authority's to state, so we point you at a tax adviser rather than quoting them.",
    service: "business-setup",
    phrases: [
      "does my uae company have to pay corporate tax",
      "do i need to register for corporate tax in the uae",
      "is my dubai company subject to corporate tax",
    ],
    keywords: [["corporate", "tax", "uae"], ["register", "corporate", "tax"]],
    next: ["biz-corporate-tax-register", "biz-free-zone-qualifying-income", "biz-bookkeeping"],
  },
  {
    id: "biz-corporate-tax-register",
    question: "When do I have to register for corporate tax?",
    answer:
      "Registration deadlines are set by the tax authority and keyed to your licence and financial year, and missing one carries a penalty whether or not you owe tax. This is one of the cases where being small is not an exemption. Put it in the compliance calendar on day one.",
    service: "business-setup",
    phrases: [
      "when do i have to register for corporate tax in the uae",
      "what is the deadline to register for corporate tax",
      "penalty for late corporate tax registration",
    ],
    keywords: [["when", "register", "corporate", "tax"], ["corporate", "tax", "deadline"]],
    next: ["biz-corporate-tax", "biz-compliance-calendar", "biz-tax-advice-limits"],
  },
  {
    id: "biz-corporate-tax-group",
    question: "Can my companies file corporate tax as a group?",
    answer:
      "Tax grouping exists under conditions covering ownership, residency and aligned financial years, and it can simplify filing where it is available. Whether your structure qualifies is a question for a tax adviser looking at the actual shareholdings rather than a general rule.",
    service: "business-setup",
    phrases: [
      "can my companies form a corporate tax group in the uae",
      "tax grouping rules for uae companies",
      "can a parent and subsidiary file tax together",
    ],
    keywords: [["corporate", "tax", "group"], ["tax", "grouping", "uae"]],
    next: ["biz-group-structure", "biz-corporate-tax", "biz-tax-advice-limits"],
  },
  {
    id: "biz-vat-registration",
    question: "Do I need to register for VAT?",
    answer:
      "VAT registration is driven by your taxable turnover against the thresholds the tax authority sets, with mandatory and voluntary levels. Once registered you charge, collect, file and keep records on their timetable. Many new companies register voluntarily because their customers expect a tax invoice.",
    service: "business-setup",
    phrases: [
      "do i need to register for vat in the uae",
      "what is the vat registration threshold in dubai",
      "should i register for vat voluntarily",
    ],
    keywords: [["register", "for", "vat"], ["vat", "registration", "threshold"]],
    next: ["biz-vat-returns", "biz-vat-invoices", "biz-corporate-tax"],
  },
  {
    id: "biz-vat-returns",
    question: "How often do I file VAT returns?",
    answer:
      "On the cycle the tax authority assigns you, with penalties for filing or paying late that apply regardless of the amount. The filing is only as easy as your bookkeeping, which is the real argument for getting the accounting right from the first invoice rather than the first deadline.",
    service: "business-setup",
    phrases: [
      "how often do i file vat returns in the uae",
      "what happens if i file my vat return late",
      "vat filing cycle for a dubai company",
    ],
    keywords: [["file", "vat", "returns"], ["vat", "return", "late"]],
    next: ["biz-bookkeeping", "biz-vat-registration", "biz-compliance-calendar"],
  },
  {
    id: "biz-vat-invoices",
    question: "What has to be on a tax invoice?",
    answer:
      "Your tax registration number, the customer's details, a clear description, the amount, the VAT charged and the date, in the format the tax authority prescribes. Invoices that do not comply can cost your customer their input credit, which is how it becomes a commercial problem rather than an administrative one.",
    service: "business-setup",
    phrases: [
      "what has to be on a uae tax invoice",
      "tax invoice requirements in the uae",
      "does my invoice need a trn number",
    ],
    keywords: [["tax", "invoice", "requirements"], ["trn", "on", "invoice"]],
    next: ["biz-vat-registration", "biz-bookkeeping", "biz-vat-returns"],
  },
  {
    id: "biz-bookkeeping",
    question: "What accounting records does my company have to keep?",
    answer:
      "Proper books supporting whatever you file, retained for the period the law requires, with the underlying invoices and contracts behind them. Corporate tax and VAT both assume the records exist and are current. A shoebox reconstructed at year end is where penalties come from.",
    service: "business-setup",
    phrases: [
      "what accounting records must a uae company keep",
      "do i need a bookkeeper for my dubai company",
      "how long must i keep company records in the uae",
    ],
    keywords: [["accounting", "records", "keep"], ["bookkeeping", "uae", "company"]],
    next: ["biz-audit-requirement", "biz-corporate-tax", "biz-compliance-calendar"],
  },
  {
    id: "biz-audit-requirement",
    question: "Does my company need an audit?",
    answer:
      "Many free zones require audited accounts at renewal, and certain mainland structures and regulated activities require them too. Even where it is optional, banks and investors ask. Whether yours needs one depends on the jurisdiction and the activity, and it is cheaper to plan for than to arrange in a hurry.",
    service: "business-setup",
    phrases: [
      "does my uae company need an audit",
      "is an audit mandatory for a dubai company",
      "who needs audited financial statements in the uae",
    ],
    keywords: [["company", "need", "audit"], ["audited", "financial", "statements"]],
    next: ["biz-free-zone-audit", "biz-bookkeeping", "biz-renewal"],
  },
  {
    id: "biz-esr",
    question: "What is economic substance and does it apply to me?",
    answer:
      "Economic substance rules target companies carrying out particular relevant activities — holding, headquarters, distribution, financing, IP and similar — and require that real activity and decision-making happen here, with a notification and sometimes a report. Whether you are caught turns on what you actually do, not on what your licence is called.",
    service: "business-setup",
    phrases: [
      "what is economic substance regulation in the uae",
      "does esr apply to my company",
      "do i have to file an economic substance notification",
    ],
    keywords: [["economic", "substance", "regulations"], ["esr", "notification"]],
    next: ["biz-compliance-calendar", "biz-holding-company", "biz-ubo-register"],
  },
  {
    id: "biz-aml-obligations",
    question: "Does anti-money-laundering compliance apply to my business?",
    answer:
      "It applies directly if you are in a designated sector — real estate brokerage, dealers in precious metals and stones, corporate service providers, auditors and similar — which brings registration, a compliance officer and reporting duties. Everyone else meets it through their bank instead. Being in a designated sector without knowing it is a real risk.",
    service: "business-setup",
    phrases: [
      "does anti money laundering law apply to my business",
      "what is a designated non financial business in the uae",
      "do i need an aml compliance officer",
    ],
    keywords: [["anti", "money", "laundering", "business"], ["aml", "compliance", "officer"]],
    next: ["biz-ubo-register", "biz-bank-compliance", "biz-compliance-calendar"],
  },
  {
    id: "biz-compliance-calendar",
    question: "What are the recurring obligations once the company exists?",
    answer:
      "Licence renewal, premises and establishment card renewal, UBO filing kept current, corporate tax registration and filing, VAT returns if registered, economic substance notification if caught, audited accounts where required, WPS if you have staff, and insurance renewals. Most penalties come from forgetting one of these, not from getting anything wrong.",
    service: "business-setup",
    phrases: [
      "what are the annual obligations for a uae company",
      "what do i have to file every year in dubai",
      "ongoing compliance requirements for a uae business",
    ],
    keywords: [["annual", "obligations", "company"], ["ongoing", "compliance", "requirements"]],
    next: ["biz-renewal", "biz-corporate-tax", "biz-penalties"],
  },
  {
    id: "biz-penalties",
    question: "What happens if I miss a filing or a renewal?",
    answer:
      "Fines that usually accrue over time, and practical consequences that bite sooner: blocked visa transactions, a bank account review, and an inability to amend anything until it is cleared. The cost of catching up is nearly always lower than the cost of waiting, so late is worth fixing immediately rather than at the next renewal.",
    service: "business-setup",
    phrases: [
      "what happens if i miss a licence renewal in the uae",
      "what are the penalties for late filing in dubai",
      "my company filings are overdue what do i do",
    ],
    keywords: [["miss", "licence", "renewal"], ["penalties", "late", "filing"]],
    next: ["biz-late-renewal", "biz-compliance-calendar", "biz-account-frozen"],
  },
  {
    id: "biz-tax-advice-limits",
    question: "Can you advise me on my company tax position?",
    answer:
      "No — tax advice on your actual numbers is a regulated professional service, and we are not your tax adviser. What we do is make sure the structure you set up does not create an avoidable problem, and introduce you to people who can advise properly. Anyone giving you a confident tax answer in a chat window is guessing.",
    service: "business-setup",
    phrases: [
      "can you give me tax advice for my uae company",
      "how much tax will my dubai company pay",
      "will i be tax resident if i set up a company here",
    ],
    keywords: [["give", "tax", "advice"], ["tax", "resident", "company"]],
    quote: true,
  },
  {
    id: "biz-personal-tax",
    question: "Will I personally pay tax if I own a UAE company?",
    answer:
      "The UAE does not levy personal income tax on salaries, but your own tax position depends on where you are tax resident, and that is decided by your home country's rules as much as by the UAE's. People get this wrong in both directions. It is worth advice in both jurisdictions before you restructure your life around an assumption.",
    service: "business-setup",
    phrases: [
      "will i pay personal income tax in the uae",
      "am i still taxed at home if i own a dubai company",
      "does a uae company make me tax resident here",
    ],
    keywords: [["personal", "income", "tax", "uae"], ["taxed", "home", "country"]],
    next: ["biz-tax-advice-limits", "biz-corporate-tax", "biz-own-visa"],
  },
  {
    id: "biz-tax-residency-certificate",
    question: "What is a tax residency certificate and can my company get one?",
    answer:
      "It is a certificate from the UAE tax authority confirming residency for treaty purposes, and companies apply for it once they can show real activity and a period of operation here. It is commonly needed to claim treaty benefits abroad. Eligibility conditions are the authority's, and they are checked rather than assumed.",
    service: "business-setup",
    phrases: [
      "what is a tax residency certificate in the uae",
      "how does my company get a tax domicile certificate",
      "can a new uae company get a tax residency certificate",
    ],
    keywords: [["tax", "residency", "certificate"], ["tax", "domicile", "certificate"]],
    next: ["biz-personal-tax", "biz-corporate-tax", "biz-bookkeeping"],
  },
  {
    id: "biz-financial-year",
    question: "Can I choose my company's financial year?",
    answer:
      "Usually yes at incorporation, within the options the authority allows, and it then drives your corporate tax filing dates and audit deadlines. Aligning it with a parent company's year is the common reason to choose deliberately. Changing it afterwards is possible but needs approval.",
    service: "business-setup",
    phrases: [
      "can i choose my company financial year in the uae",
      "when does my company financial year end",
      "changing the financial year of a dubai company",
    ],
    keywords: [["choose", "financial", "year"], ["financial", "year", "end"]],
    next: ["biz-corporate-tax", "biz-audit-requirement", "biz-bookkeeping"],
  },
  {
    id: "biz-insurance-needed",
    question: "What insurance does my company need?",
    answer:
      "Employee medical cover is mandatory where you have staff. Beyond that, what you need depends on the work: professional indemnity for advisory services, public liability for premises with visitors, and goods-in-transit for trading. Some landlords and clients require specific cover before they will contract with you.",
    service: "business-setup",
    phrases: [
      "what insurance does my uae company need",
      "is professional indemnity insurance required in dubai",
      "do i need public liability insurance for my office",
    ],
    keywords: [["insurance", "company", "need"], ["professional", "indemnity", "required"]],
    next: ["biz-medical-insurance", "biz-compliance-calendar", "biz-premises-approval"],
  },

  /* ── After the licence ─────────────────────────────────────────────────── */
  {
    id: "biz-renewal",
    question: "How does licence renewal work?",
    answer:
      "Annually, alongside the premises agreement and the establishment card, with whatever the authority requires that year — a valid tenancy, audited accounts in some zones, and a current UBO filing. It is routine when nothing has lapsed, and tangled when something has.",
    service: "business-setup",
    phrases: [
      "how does trade licence renewal work in the uae",
      "what do i need to renew my company licence",
      "when do i renew my dubai trade licence",
    ],
    keywords: [["trade", "licence", "renewal"], ["renew", "company", "licence"]],
    next: ["biz-late-renewal", "biz-compliance-calendar", "biz-free-zone-renewal"],
  },
  {
    id: "biz-late-renewal",
    question: "What if I renew my licence late?",
    answer:
      "Fines accrue, and while the licence is expired you generally cannot process visas, amend anything or reliably operate the bank account. If it stays expired long enough the authority can move to strike the company off. It is one of those problems that gets worse purely by waiting.",
    service: "business-setup",
    phrases: [
      "what happens if my trade licence expires",
      "my company licence is expired what do i do",
      "penalty for late trade licence renewal in dubai",
    ],
    keywords: [["licence", "expired", "what"], ["late", "licence", "renewal", "penalty"]],
    next: ["biz-penalties", "biz-renewal", "biz-account-frozen"],
  },
  {
    id: "biz-amend-licence",
    question: "How do I amend my trade licence?",
    answer:
      "Amendments cover the name, the activities, the shareholders, the manager, the address and the legal form. Most need a shareholders resolution, some need a re-notarised memorandum, and all end with a reissued licence. The amendment then has to be pushed out to the bank, immigration and anyone else holding the old details.",
    service: "business-setup",
    phrases: [
      "how do i amend my trade licence in dubai",
      "what changes require a licence amendment in the uae",
      "process to update details on a trade licence",
    ],
    keywords: [["amend", "trade", "licence"], ["licence", "amendment", "process"]],
    next: ["biz-notarise-company-documents", "biz-change-trade-name", "biz-add-activity"],
  },
  {
    id: "biz-close-company",
    question: "How do I close a UAE company properly?",
    answer:
      "Cancel every visa the company sponsors, settle liabilities and any outstanding fees, close the bank account, obtain clearances from the authority and often produce a liquidation statement, then deregister the licence. Abandoning a licence instead leaves fines accruing against the shareholders, which is why walking away is the expensive option.",
    service: "business-setup",
    phrases: [
      "how do i close my company in the uae properly",
      "what is the process to liquidate a dubai company",
      "can i just stop renewing my trade licence",
    ],
    keywords: [["close", "company", "uae"], ["liquidate", "dubai", "company"]],
    next: ["biz-cancel-visas", "biz-abandon-licence", "biz-free-zone-exit"],
  },
  {
    id: "biz-abandon-licence",
    question: "What happens if I just stop renewing the licence?",
    answer:
      "Fines keep accruing, the company stays on the register, and the consequences attach to the people behind it — future applications, visas and sometimes travel can be affected. A deliberate closure is more work now and far less later. If a licence has already lapsed, deal with it rather than leaving it.",
    service: "business-setup",
    phrases: [
      "what happens if i abandon my trade licence",
      "can i walk away from my uae company",
      "consequences of not closing a dubai company",
    ],
    keywords: [["abandon", "trade", "licence"], ["walk", "away", "company"]],
    next: ["biz-close-company", "biz-penalties", "biz-late-renewal"],
  },
  {
    id: "biz-dormant-company",
    question: "Can I keep the company dormant for a while?",
    answer:
      "There is no general dormancy status that switches the obligations off — the licence still renews, the filings still fall due, and corporate tax registration still applies. If the business is genuinely stopping, closing properly usually costs less than keeping a dormant entity alive.",
    service: "business-setup",
    phrases: [
      "can i make my uae company dormant",
      "do i still have to file if my company is not trading",
      "keeping a dubai company inactive for a year",
    ],
    keywords: [["company", "dormant", "uae"], ["not", "trading", "still", "file"]],
    next: ["biz-close-company", "biz-compliance-calendar", "biz-renewal"],
  },
  {
    id: "biz-sell-company",
    question: "Can I sell my UAE company?",
    answer:
      "Yes — it is a share transfer, with an amended and usually re-notarised memorandum, authority approval and updates to the bank and immigration records. Buyers will want clean filings, current renewals and proper accounts, so the tidiness of your compliance directly affects what the business is worth.",
    service: "business-setup",
    phrases: [
      "can i sell my company in the uae",
      "how do i transfer ownership of my dubai business",
      "what does a buyer need to take over my licence",
    ],
    keywords: [["sell", "my", "company"], ["transfer", "ownership", "business"]],
    next: ["biz-transfer-shares", "biz-notarise-company-documents", "biz-bookkeeping"],
  },
  {
    id: "biz-bank-account-changes",
    question: "What do I have to tell the bank when something changes?",
    answer:
      "Any change to the name, address, shareholders, manager, signatories or licence status. Banks re-verify against the register, and a mismatch is one of the routine triggers for an account review. Telling them at the time is a short conversation; being found out later is not.",
    service: "business-setup",
    phrases: [
      "what changes do i need to tell my bank about",
      "do i have to inform the bank if my shareholders change",
      "updating company details with the bank in the uae",
    ],
    keywords: [["tell", "bank", "changes"], ["inform", "bank", "shareholders"]],
    next: ["biz-amend-licence", "biz-account-frozen", "biz-bank-signatory"],
  },

  /* ── Documents, notarisation and attestation for the company ───────────── */
  {
    id: "biz-documents-needed",
    question: "What documents do I need to start the process?",
    answer:
      "Passport copies for every shareholder and the manager, a visa or entry stamp page where someone is already in the country, two or three trade name options, and a clear description of the activities. If a company is a shareholder, its corporate documents attested for use in the UAE. That is enough to begin; the rest is generated as you go.",
    service: "business-setup",
    phrases: [
      "what documents do i need to start a company in the uae",
      "what paperwork is needed for company formation in dubai",
      "documents required to open a business in dubai",
    ],
    keywords: [["documents", "needed", "start", "company"], ["paperwork", "company", "formation"]],
    next: ["biz-notarise-company-documents", "biz-attest-corporate-documents", "biz-first-steps"],
  },
  {
    id: "biz-notarise-company-documents",
    question: "Which company documents have to be notarised?",
    answer:
      "On the mainland, the memorandum of association and most amendments to it, along with resolutions appointing managers, transferring shares or granting powers of attorney. Free zones often accept their own signed templates without a notary. A UAE notary works in Arabic, so these are prepared bilingually.",
    service: "business-setup",
    phrases: [
      "which company documents need to be notarised in dubai",
      "does the memorandum of association have to be notarised",
      "do i need a notary to set up an llc",
    ],
    keywords: [["company", "documents", "notarised"], ["memorandum", "association", "notarised"]],
    next: ["biz-notary-appointment", "biz-poa-for-setup", "biz-moa-amendment"],
  },
  {
    id: "biz-notary-appointment",
    question: "What happens at the notary appointment for a company?",
    answer:
      "The signatories attend with original identification, the notary satisfies itself who they are and that they understand and have authority to sign, and the instrument is executed in Arabic or bilingually. The notary can refuse if the wording, the translation or the authority is not right — which is why the drafting matters more than the appointment.",
    service: "business-setup",
    phrases: [
      "what happens at a notary appointment for a company in dubai",
      "who has to attend the notary to sign the memorandum",
      "do all shareholders have to go to the notary",
    ],
    keywords: [["notary", "appointment", "company"], ["shareholders", "attend", "notary"]],
    next: ["biz-poa-for-setup", "biz-notarise-company-documents", "biz-shareholder-abroad"],
  },
  {
    id: "biz-shareholder-abroad",
    question: "One of my shareholders is outside the UAE. Can we still proceed?",
    answer:
      "Usually yes, through a power of attorney granted abroad and legalised for use here, or executed at a UAE embassy in their country. That document has its own attestation chain and is nearly always the long pole in the timeline, so it is the first thing to start rather than the last.",
    service: "business-setup",
    phrases: [
      "one of my shareholders is not in the uae can we still register",
      "can i set up a company if my partner is abroad",
      "signing company documents from outside the uae",
    ],
    keywords: [["shareholder", "outside", "uae"], ["partner", "abroad", "company"]],
    next: ["biz-poa-for-setup", "biz-attest-corporate-documents", "biz-notary-appointment"],
  },
  {
    id: "biz-poa-for-setup",
    question: "Do I need a power of attorney to set up the company?",
    answer:
      "Only if someone will sign or act on your behalf — commonly where a shareholder cannot attend, or where an agent files on your behalf. A UAE power of attorney is notarised here; one granted abroad has to be legalised for use here. Keep the powers granted narrow and specific rather than general.",
    service: "business-setup",
    phrases: [
      "do i need a power of attorney to register a company",
      "can someone else sign the company documents for me",
      "power of attorney for business setup in dubai",
    ],
    keywords: [["power", "attorney", "register", "company"], ["someone", "else", "sign", "documents"]],
    next: ["biz-shareholder-abroad", "biz-notary-appointment", "biz-revoke-poa"],
  },
  {
    id: "biz-revoke-poa",
    question: "How do I cancel a power of attorney I granted for the company?",
    answer:
      "By a notarised revocation, and then by telling everyone who might rely on it — the authority, the bank and the agent themselves. A revocation nobody has been told about is the situation where someone keeps acting on an instrument you thought was dead.",
    service: "business-setup",
    phrases: [
      "how do i cancel a power of attorney in the uae",
      "how do i revoke a poa given to my company agent",
      "stopping someone acting under my power of attorney",
    ],
    keywords: [["cancel", "power", "attorney"], ["revoke", "poa"]],
    next: ["biz-poa-for-setup", "biz-notarise-company-documents", "biz-bank-signatory"],
  },
  {
    id: "biz-moa-amendment",
    question: "What is an MOA amendment and when do I need one?",
    answer:
      "The memorandum of association is the company's constitutional document, and it is amended whenever shares, shareholders, the manager, the capital, the name or the activities change. On the mainland the amendment is notarised like the original and then filed. It is the document trail behind almost every licence change.",
    service: "business-setup",
    phrases: [
      "what is an moa amendment in the uae",
      "when does my memorandum of association need amending",
      "do i have to renotarise the memorandum after a change",
    ],
    keywords: [["moa", "amendment"], ["memorandum", "association", "amend"]],
    next: ["biz-amend-licence", "biz-notarise-company-documents", "biz-transfer-shares"],
  },
  {
    id: "biz-attest-corporate-documents",
    question: "Do foreign company documents need attestation?",
    answer:
      "Yes — corporate documents issued abroad generally need legalising through the issuing country's chain and the UAE mission, then translation by a UAE-licensed legal translator. The chain differs by country, and doing it in the wrong order means doing it again. We map the sequence for your country before anyone pays for a step.",
    service: "business-setup",
    phrases: [
      "do foreign company documents need attestation for the uae",
      "how do i legalise my incorporation certificate for dubai",
      "attestation chain for corporate documents in the uae",
    ],
    keywords: [["foreign", "company", "documents", "attestation"], ["legalise", "incorporation", "certificate"]],
    next: ["biz-apostille", "biz-branch-documents", "biz-legal-translation"],
  },
  {
    id: "biz-apostille",
    question: "Is an apostille enough for UAE use?",
    answer:
      "It depends on the document and the authority receiving it. The UAE joined the Apostille Convention, which has simplified the route for many public documents from member states, but some authorities and some document types still expect the older consular chain. Confirm what the receiving authority accepts before you choose a route.",
    service: "business-setup",
    phrases: [
      "is an apostille accepted in the uae",
      "do i still need embassy legalisation with an apostille",
      "apostille or attestation for documents used in dubai",
    ],
    keywords: [["apostille", "accepted", "uae"], ["apostille", "or", "attestation"]],
    next: ["biz-attest-corporate-documents", "biz-legal-translation", "biz-branch-documents"],
  },
  {
    id: "biz-legal-translation",
    question: "Do my documents need to be translated into Arabic?",
    answer:
      "Anything going to a UAE authority or a notary generally does, and the translation has to be by a translator licensed by the Ministry of Justice — an accurate translation from anyone else is still rejected. Certified translations must cover the whole document including stamps and seals.",
    service: "business-setup",
    phrases: [
      "do my company documents need arabic translation",
      "who can translate documents for a uae authority",
      "does my incorporation certificate need legal translation",
    ],
    keywords: [["documents", "arabic", "translation"], ["legal", "translation", "authority"]],
    next: ["biz-attest-corporate-documents", "biz-notarise-company-documents", "biz-apostille"],
  },
  {
    id: "biz-document-validity",
    question: "My documents are a few years old. Are they still usable?",
    answer:
      "Some authorities treat attestations and certificates of good standing as having a shelf life, and will ask for something recent even where the underlying document has not changed. It is worth checking the dates before assembling a file, because a re-issue takes longer than anyone expects.",
    service: "business-setup",
    phrases: [
      "are old attested documents still valid in the uae",
      "how recent do company documents have to be",
      "does my certificate of good standing expire",
    ],
    keywords: [["old", "attested", "documents", "valid"], ["certificate", "good", "standing"]],
    next: ["biz-attest-corporate-documents", "biz-documents-needed", "biz-branch-documents"],
  },
  {
    id: "biz-lost-licence",
    question: "I have lost my trade licence or memorandum. What do I do?",
    answer:
      "Both can be reissued by the authority that holds the record, and the memorandum can be recovered from the notary's register where it was notarised there. It is an administrative request rather than a crisis — but you will need it before anything else can be filed, so deal with it before the next renewal.",
    service: "business-setup",
    phrases: [
      "i lost my trade licence what do i do",
      "how do i get a copy of my memorandum of association",
      "replacing lost company documents in the uae",
    ],
    keywords: [["lost", "trade", "licence"], ["copy", "memorandum", "association"]],
    next: ["biz-amend-licence", "biz-notarise-company-documents", "biz-renewal"],
  },

  /* ── When something has gone wrong ─────────────────────────────────────── */
  {
    id: "biz-wrong-jurisdiction",
    question: "I think I set up in the wrong jurisdiction. Can it be fixed?",
    answer:
      "Usually, and usually by adding rather than undoing — a mainland branch of a free zone company, or a second entity for the work the first cannot do. Full migration is possible in some cases but is rarely the cheapest answer. Tell us what you cannot currently do and we will work backwards from that.",
    service: "business-setup",
    phrases: [
      "i set up in the wrong free zone can i fix it",
      "my licence does not allow what i want to do",
      "chose the wrong jurisdiction for my company",
    ],
    keywords: [["wrong", "jurisdiction", "fix"], ["licence", "does", "not", "allow"]],
    next: ["biz-mainland-branch-of-free-zone", "biz-jurisdiction-change", "biz-add-activity"],
  },
  {
    id: "biz-wrong-activity",
    question: "My licence does not cover what I am actually doing. How bad is that?",
    answer:
      "Serious enough to fix promptly: invoicing for an activity you are not licensed for exposes you to penalties, can invalidate insurance and is the kind of thing a bank notices during a review. The remedy is an amendment, and it is far better done voluntarily than after an inspection.",
    service: "business-setup",
    phrases: [
      "my trade licence does not cover what i am doing",
      "what happens if i invoice for an unlicensed activity",
      "working outside the scope of my licence in the uae",
    ],
    keywords: [["licence", "not", "cover", "doing"], ["unlicensed", "activity", "invoice"]],
    next: ["biz-add-activity", "biz-amend-licence", "biz-penalties"],
  },
  {
    id: "biz-agent-disappeared",
    question: "My formation agent has stopped responding. What can I do?",
    answer:
      "Find out what is actually filed — the licence, the establishment card and the memorandum are all on the authority's record, and you can establish the true position independently of whoever was helping. Then revoke any power of attorney they hold. Working out where things really stand is the first step, and we can help you do it.",
    service: "business-setup",
    phrases: [
      "my business setup agent has disappeared",
      "the company that set up my licence is not responding",
      "how do i find out what my agent actually filed",
    ],
    keywords: [["agent", "stopped", "responding"], ["setup", "agent", "disappeared"]],
    next: ["biz-revoke-poa", "biz-lost-licence", "biz-penalties"],
  },
  {
    id: "biz-paid-nothing-happened",
    question: "I paid for a company setup and nothing has happened. What are my options?",
    answer:
      "Establish what exists on the register first — a name reservation, an initial approval, a licence, or nothing at all — because that determines whether you are chasing a delay or a loss. Keep every receipt and every message. We can help you read the position; if it has become a recovery matter, that is a lawyer's job and we will say so.",
    service: "business-setup",
    phrases: [
      "i paid for a company setup and nothing happened",
      "my business setup was never completed",
      "i think i have been scammed by a company formation agent",
    ],
    keywords: [["paid", "nothing", "happened"], ["setup", "never", "completed"]],
    next: ["biz-agent-disappeared", "biz-lost-licence", "biz-choose-provider"],
  },
  {
    id: "biz-choose-provider",
    question: "How do I know a company formation provider is legitimate?",
    answer:
      "They hold a licence for corporate services themselves, they will put the government fees and their own fee on separate lines, they do not promise approvals that are not theirs to give, and they give you the authority's receipts. Anyone guaranteeing a visa, a bank account or a golden visa is telling you something they cannot know.",
    service: "business-setup",
    phrases: [
      "how do i know a business setup company is genuine",
      "how to avoid a company formation scam in dubai",
      "is my business setup consultant licensed",
    ],
    keywords: [["formation", "provider", "legitimate"], ["avoid", "setup", "scam"]],
    next: ["biz-paid-nothing-happened", "biz-what-we-do", "biz-hidden-costs"],
  },
  {
    id: "biz-hidden-costs",
    question: "What costs do people forget when setting up a company?",
    answer:
      "The recurring ones rather than the setup ones: licence and card renewal, premises, medical insurance per employee, bank minimum balance charges, bookkeeping and any audit, plus visa costs per person. Those are what make a cheap licence expensive over a year. We set out the whole picture rather than the headline item.",
    service: "business-setup",
    phrases: [
      "what costs do people forget when setting up a company",
      "what are the hidden costs of a uae business",
      "what should i budget for beyond the licence",
    ],
    keywords: [["hidden", "costs", "business"], ["costs", "people", "forget"]],
    quote: true,
  },
  {
    id: "biz-inspection",
    question: "What happens in a licensing inspection?",
    answer:
      "An inspector checks that the premises match the licence, that the activity being carried out is the licensed one, that staff hold valid permits and that any sector-specific conditions are met. Most findings are about a mismatch between the record and reality, which is why keeping amendments current is the practical defence.",
    service: "business-setup",
    phrases: [
      "what happens during a business inspection in dubai",
      "what do inspectors check at a company premises",
      "how do i prepare for a licensing inspection",
    ],
    keywords: [["business", "inspection", "dubai"], ["inspectors", "check", "premises"]],
    next: ["biz-wrong-activity", "biz-shared-office", "biz-penalties"],
  },
  {
    id: "biz-fine-received",
    question: "My company has received a fine. What should I do?",
    answer:
      "Read what it is actually for — the common ones are a lapsed filing, a premises or signage breach, or an activity mismatch — then fix the underlying cause as well as paying it. Unpaid fines block renewals and visa transactions, so they compound rather than sit still. Some are open to grievance if there are grounds.",
    service: "business-setup",
    phrases: [
      "my company received a fine in dubai what do i do",
      "can i appeal a fine against my business",
      "unpaid fines blocking my licence renewal",
    ],
    keywords: [["company", "received", "fine"], ["appeal", "fine", "business"]],
    next: ["biz-penalties", "biz-inspection", "biz-late-renewal"],
  },

  /* ── Money ─────────────────────────────────────────────────────────────── *
   *
   * Every entry below carries `quote: true`. The reply is honest about why
   * there is no figure, and then the conversation walks straight into the
   * business-setup qualification and ends at the callback form — a person with
   * your actual case in front of them, instead of a number that was wrong.
   *
   * These own the money vocabulary for this module: no other entry in this file
   * uses "cost", "price", "fee", "quote", "budget" or "how much" in a phrase or
   * a keyword group, so a money question cannot be captured by an entry that
   * would answer it with prose. `tests/business-setup-flows.test.ts` enforces
   * that, because it is the property the whole routing rule rests on.
   *
   * There are many of them rather than one, because "what does a licence cost",
   * "is Dubai expensive to set up in" and "can I do this on a small budget" are
   * the same question asked by people at very different points, and a single
   * catch-all matches none of them well.
   */
  {
    id: "biz-quote-setup",
    question: "How much does it cost to set up a company in the UAE?",
    answer:
      "There is no single figure, and any provider who gives you one before knowing your activity is guessing. It moves with the jurisdiction, the activity, the number of visas and the premises you take — and government fees are revised periodically. What we will do is put together a real breakdown for your case, with government fees shown separately from anyone's service fee. A couple of quick questions and someone will come back to you with it.",
    service: "business-setup",
    phrases: [
      "how much does it cost to set up a company in the uae",
      "what is the cost of company formation in dubai",
      "how much to start a business in dubai",
      "what does it cost to open a company in the uae",
      "price of setting up a business in dubai",
    ],
    keywords: [
      ["how", "much", "company"],
      ["cost", "set", "up", "company"],
      ["cost", "company", "formation"],
      ["company", "setup", "cost"],
      ["business", "setup", "cost"],
      ["business", "setup", "fee"],
      ["setup", "cost"],
      ["setup", "charges"],
      ["formation", "cost"],
    ],
    quote: true,
  },
  {
    id: "biz-quote-trade-licence",
    question: "How much is a trade licence?",
    answer:
      "Licence fees differ by emirate, by free zone and by activity, and they are revised from time to time — so a figure quoted in a chat window is the kind of thing people plan around and then find has moved. We will price your actual licence, and show the government portion separately from any service fee. Tell us a little about the business and someone will come back with it.",
    service: "business-setup",
    phrases: [
      "how much is a trade licence in dubai",
      "what is the price of a trade licence in the uae",
      "trade licence fees in dubai",
      "cost of a business licence in the uae",
    ],
    keywords: [
      ["how", "much", "trade", "licence"],
      ["trade", "licence", "fees"],
      ["cost", "business", "licence"],
      ["trade", "licence", "cost"],
      ["trade", "licence", "fee"],
      ["licence", "fee", "dubai"],
      ["licence", "cost"],
      ["licence", "fees"],
    ],
    quote: true,
  },
  {
    id: "biz-quote-free-zone",
    question: "How much does a free zone licence cost?",
    answer:
      "Free zone packages vary widely, and the headline price is rarely the whole picture — visa costs, the establishment card, medical and Emirates ID, and renewal are often outside the package. We will compare the zones that actually fit your activity on total first-year and renewal cost rather than on the advertised number. Answer a couple of questions and someone will bring you that comparison.",
    service: "business-setup",
    phrases: [
      "how much does a free zone licence cost",
      "what is the cheapest free zone in the uae",
      "free zone package prices in dubai",
      "cost of a freezone company in dubai",
    ],
    keywords: [
      ["how", "much", "free", "zone"],
      ["cheapest", "free", "zone"],
      ["freezone", "package", "price"],
      ["free", "zone", "cost"],
      ["free", "zone", "fee"],
      ["freezone", "cost"],
    ],
    quote: true,
  },
  {
    id: "biz-quote-mainland",
    question: "How much does a mainland company cost?",
    answer:
      "Mainland cost is driven by the activity, the tenancy you take and the approvals your activity needs, so it varies far more between two businesses than people expect. We will cost your case properly — including the tenancy and the notarisation, which are the parts usually left out of a headline number. Tell us what the business will do and someone will come back with it.",
    service: "business-setup",
    phrases: [
      "how much does a mainland company cost in dubai",
      "what is the cost of a mainland trade licence",
      "mainland company setup price in the uae",
    ],
    keywords: [["how", "much", "mainland"], ["cost", "mainland", "licence"], ["mainland", "cost"], ["mainland", "fee"]],
    quote: true,
  },
  {
    id: "biz-quote-visa",
    question: "How much does a company visa cost?",
    answer:
      "Visa cost depends on the visa type, the emirate, the duration and whether the application is made inside or outside the country, and the government portion is revised periodically. We quote per person and always separate government fees from service fees. Give us a few details and someone will come back with the real number for your case.",
    service: "business-setup",
    phrases: [
      "how much does a company visa cost in the uae",
      "what is the cost of an investor visa in dubai",
      "employment visa fees for my company",
      "price of a residence visa through my business",
    ],
    keywords: [
      ["how", "much", "visa", "cost"],
      ["cost", "investor", "visa"],
      ["visa", "fees", "company"],
      ["company", "visa", "cost"],
      ["staff", "visa", "cost"],
      ["employment", "visa", "cost"],
    ],
    quote: true,
  },
  {
    id: "biz-quote-cheapest",
    question: "What is the cheapest way to get a licence?",
    answer:
      "The cheapest licence and the cheapest year are usually different things — a low headline package with tight visa quota, no premises and an expensive renewal often costs more by month twelve. We will show you the options that genuinely fit, priced over a year rather than at signup. Tell us what you need to do with it and someone will come back with the comparison.",
    service: "business-setup",
    phrases: [
      "what is the cheapest way to get a trade licence",
      "what is the cheapest business setup in dubai",
      "cheapest company formation option in the uae",
      "can i get a licence on a small budget",
    ],
    keywords: [["cheapest", "way", "licence"], ["cheapest", "business", "setup"], ["small", "budget", "licence"]],
    quote: true,
  },
  {
    id: "biz-quote-total-first-year",
    question: "What will the whole first year cost me?",
    answer:
      "That is the right question to ask, and the only honest way to answer it is on your actual case: licence, premises, establishment card, visas for however many people, insurance, bookkeeping and any audit. We will put the whole first year on one page with government fees shown separately. A couple of questions and someone will come back with it.",
    service: "business-setup",
    phrases: [
      "what will my first year cost in total",
      "what is the total cost of running a company in dubai",
      "how much does a uae company cost per year",
      "annual cost of maintaining a trade licence",
    ],
    keywords: [["total", "cost", "first", "year"], ["how", "much", "per", "year"], ["annual", "cost", "licence"]],
    quote: true,
  },
  {
    id: "biz-quote-renewal-cost",
    question: "How much does renewal cost each year?",
    answer:
      "Renewal is the number that decides whether a cheap setup was actually cheap, and it varies by zone, by premises and by whether audited accounts are required. We will tell you what your renewal will look like before you commit to the licence rather than after. Answer a couple of questions and someone will come back with it.",
    service: "business-setup",
    phrases: [
      "how much does it cost to renew a trade licence",
      "what is the annual renewal fee for my licence",
      "renewal cost of a free zone company",
    ],
    keywords: [["how", "much", "renew", "licence"], ["renewal", "fee", "licence"], ["renewal", "cost"], ["renew", "licence", "cost"]],
    quote: true,
  },
  {
    id: "biz-quote-your-fee",
    question: "What do you charge for help with a company setup?",
    answer:
      "We price per case rather than from a list, because the work differs enormously between a single-activity free zone licence and a mainland company with regulator approvals and overseas shareholders. What we will always do is show our fee separately from government fees, so you can see exactly what you are paying for. Tell us what you need and someone will come back with it in writing.",
    service: "business-setup",
    phrases: [
      "what do you charge for business setup help",
      "what are your fees for company formation",
      "how much do you charge for your service",
      "what is your service fee",
    ],
    keywords: [["charge", "setup"], ["charge", "formation"], ["your", "fees", "formation"], ["your", "service", "fee"]],
    quote: true,
  },
  {
    id: "biz-quote-request",
    question: "Can I get a quote for setting up a company?",
    answer:
      "Yes — and a real one rather than a range. We need a few details about what the business will do and how many people you need on visas, and then someone will come back to you with a written breakdown that separates government fees from service fees. Let us take those details now.",
    service: "business-setup",
    phrases: [
      "can i get a quote for setting up a company",
      "please send me a quotation for business setup",
      "can you quote me for company formation",
      "i would like a quote for company formation",
    ],
    keywords: [["quote", "company", "formation"], ["quote", "business", "setup"], ["quotation", "business", "setup"]],
    quote: true,
  },
  {
    id: "biz-quote-payment-terms",
    question: "Can I pay for the company setup in instalments?",
    answer:
      "Government fees are payable to the authority on their terms, but service fees and some free zone packages can sometimes be staged. What is possible depends on the jurisdiction and the provider, so it is a question worth putting to a person rather than guessing at. Tell us a little about your case and someone will come back to you on it.",
    service: "business-setup",
    phrases: [
      "can i pay for the company setup in instalments",
      "do you offer a payment plan for business setup",
      "can i pay the licence fee monthly",
    ],
    keywords: [["pay", "instalments", "setup"], ["payment", "plan", "setup"], ["licence", "fee", "monthly"]],
    quote: true,
  },
  {
    id: "biz-quote-capital-requirement",
    question: "How much share capital do I need?",
    answer:
      "Share capital requirements differ by jurisdiction, legal form and activity — some require a stated amount, some require it deposited and evidenced, and many require neither in practice. Because it turns on the exact structure, it is worth confirming for your case rather than working from a figure someone quoted for a different one. Tell us the structure and someone will come back to you.",
    service: "business-setup",
    phrases: [
      "how much share capital do i need for a uae company",
      "what is the minimum capital for an llc in dubai",
      "do i have to deposit capital to register a company",
    ],
    keywords: [["how", "much", "share", "capital"], ["minimum", "capital", "llc"]],
    quote: true,
  },
  {
    id: "biz-quote-compare-providers",
    question: "Another company quoted me a much lower price. Is that realistic?",
    answer:
      "Sometimes, and sometimes the quote excludes the establishment card, the visas, the medical and Emirates ID, or the renewal. The useful comparison is total first-year plus renewal, with government fees itemised — on that basis the cheap quote is occasionally genuinely cheaper and often is not. Send us what you were quoted and someone will go through it with you line by line.",
    service: "business-setup",
    phrases: [
      "another company quoted me a lower price for setup",
      "is this business setup quote realistic",
      "why is this company formation quote so cheap",
      "can you match a cheaper quote",
    ],
    keywords: [["quoted", "lower", "price"], ["quote", "so", "cheap"], ["match", "cheaper", "quote"]],
    quote: true,
  },
  {
    id: "biz-quote-bank-costs",
    question: "What does a corporate bank account cost to run?",
    answer:
      "Banks differ on minimum balance, monthly charges and transaction fees, and the cost of falling below a minimum is the one that surprises people. Which bank suits you depends on your activity and where your money comes from, so it is worth matching before you apply. Tell us about the business and someone will come back with sensible options.",
    service: "business-setup",
    phrases: [
      "what does a corporate bank account cost in the uae",
      "what are the monthly charges on a business account",
      "bank fees for a company account in dubai",
    ],
    keywords: [["corporate", "bank", "account", "cost"], ["bank", "fees", "company", "account"]],
    quote: true,
  },
  {
    id: "biz-quote-notarisation-cost",
    question: "What does notarising the company documents cost?",
    answer:
      "Notary fees are set by the authority and vary with the instrument and sometimes with the value involved, and translation is charged separately by the licensed translator. Because it depends on which documents you actually need, it is quoted per case alongside the rest of the formation. Give us a few details and someone will come back with the whole picture rather than one line of it.",
    service: "business-setup",
    phrases: [
      "how much does it cost to notarise company documents",
      "what are notary fees for a memorandum of association in dubai",
      "cost of notarising a power of attorney for my company",
    ],
    keywords: [["cost", "notarise", "documents"], ["notary", "fees", "memorandum"]],
    quote: true,
  },
  {
    id: "biz-quote-attestation-cost",
    question: "What does attesting my corporate documents cost?",
    answer:
      "Attestation fees depend on the issuing country, the document type and how many steps the chain has, and they are revised periodically — which is why a published figure would be wrong for most people who read it. We will map your country's chain and cost it before you pay anyone for a step. Tell us where the documents are from and someone will come back to you.",
    service: "business-setup",
    phrases: [
      "how much does attestation of company documents cost",
      "what is the fee to legalise my incorporation certificate",
      "cost of attesting documents for the uae",
    ],
    keywords: [["cost", "attestation", "documents"], ["fee", "legalise", "certificate"]],
    quote: true,
  },
  {
    id: "biz-quote-office-cost",
    question: "How much is office space or a desk?",
    answer:
      "It runs from a shared desk in a free zone package to a full commercial tenancy with Ejari, and the choice interacts with your visa quota — so the cheapest space is not always the cheapest answer. We will price the options against the number of people you actually need to sponsor. Tell us that number and someone will come back to you.",
    service: "business-setup",
    phrases: [
      "how much does office space cost for a company in dubai",
      "what is the price of a flexi desk",
      "cost of renting an office for my trade licence",
    ],
    keywords: [["how", "much", "office", "space"], ["price", "flexi", "desk"]],
    quote: true,
  },
  {
    id: "biz-quote-accounting-cost",
    question: "What does bookkeeping and audit cost?",
    answer:
      "It scales with transaction volume and with whether an audit is required by your jurisdiction, so a dormant holding company and a busy trading company are not comparable. Since corporate tax made proper books necessary, it is worth budgeting from the start. Tell us roughly what the business will do and someone will come back with a realistic figure.",
    service: "business-setup",
    phrases: [
      "how much does bookkeeping cost for a uae company",
      "what does an audit cost in dubai",
      "accounting fees for a small company in the uae",
    ],
    keywords: [["how", "much", "bookkeeping"], ["audit", "cost", "dubai"], ["accounting", "fees", "company"]],
    quote: true,
  },
  {
    id: "biz-quote-is-dubai-expensive",
    question: "Is Dubai expensive to set up a business in?",
    answer:
      "Compared with what, is the honest answer — it is more expensive than some neighbouring emirates and cheaper than many places people are moving from, and the spread between a lean free zone setup and a mainland company with premises is enormous. Rather than a general answer, we will cost the version of this that fits you. A couple of questions and someone will come back with it.",
    service: "business-setup",
    phrases: [
      "is dubai expensive to set up a business in",
      "is it expensive to start a company in the uae",
      "can i afford to set up a business in dubai",
    ],
    keywords: [["dubai", "expensive", "business"], ["afford", "set", "up", "business"]],
    quote: true,
  },
  {
    id: "biz-quote-budget-advice",
    question: "I have a limited budget for a company setup. What can I realistically do?",
    answer:
      "Quite a lot, if the structure is chosen around the constraint rather than against it — and that is a better conversation to have honestly at the start than halfway through. We would rather tell you the lean option really costs more than you have than take you into a setup you cannot renew. Tell us what you are working with and someone will come back to you straight.",
    service: "business-setup",
    phrases: [
      "i have a limited budget for setting up a company",
      "what can i do with a small budget in dubai",
      "cheapest realistic way to start a business in the uae",
    ],
    keywords: [["limited", "budget", "company"], ["small", "budget", "dubai"]],
    quote: true,
  },
  {
    id: "biz-quote-refund",
    question: "If the company setup does not work out, do I get my money back?",
    answer:
      "Government fees are generally not refundable once paid to the authority, whatever happens afterwards — that is the authority's rule rather than a provider's policy. Service fees depend on the provider's terms and what stage the work reached. It is worth understanding before you pay, so let us go through it with you properly rather than in a chat window.",
    service: "business-setup",
    phrases: [
      "can i get a refund if the company setup fails",
      "are government fees refundable in the uae",
      "what happens to my money if the licence is refused",
    ],
    keywords: [["refund", "setup", "fails"], ["government", "fees", "refundable"]],
    quote: true,
  },

  /* ── Getting started, and what we actually do ──────────────────────────── */
  {
    id: "biz-what-we-do",
    question: "What do you actually do in a business setup?",
    answer:
      "We work through what you will be selling and to whom, narrow it to the jurisdictions and licence types that genuinely fit, then introduce you to a licensed corporate services provider who files it — and we stay with you through licence, establishment card, bank account and visas. We are not the licensing authority and we do not file on our own account, which is worth being clear about up front.",
    service: "business-setup",
    phrases: [
      "what do you actually do for business setup",
      "do you register the company yourselves",
      "are you a licensed company formation agent",
    ],
    keywords: [["register", "company", "yourselves"]],
    next: ["biz-choose-provider", "biz-do-it-myself", "biz-get-started"],
  },
  {
    id: "biz-do-it-myself",
    question: "Can I set up the company myself without help?",
    answer:
      "Yes, and for a simple free zone licence with no external approvals plenty of people do. It gets harder when there are regulator approvals, overseas shareholders, notarised documents or a bank account that needs a credible story. We will tell you honestly when your case is one you could do alone.",
    service: "business-setup",
    phrases: [
      "can i set up a company myself without an agent",
      "do i need a consultant to register a company in dubai",
      "is it possible to do company formation on my own",
    ],
    keywords: [["set", "up", "myself"], ["need", "consultant", "register"]],
    next: ["biz-what-we-do", "biz-first-steps", "biz-choose-provider"],
  },
  {
    id: "biz-be-in-uae",
    question: "Do I need to be in the UAE to set up a company?",
    answer:
      "Not for every step. Much of a free zone formation can be done remotely, and where a signature is needed in person it can often be handled by a legalised power of attorney. You will need to come for the medical and Emirates ID when your residence visa is issued. Which parts need you here depends on the jurisdiction.",
    service: "business-setup",
    phrases: [
      "do i need to be in the uae to set up a company",
      "can i register a dubai company remotely",
      "can i set up a business before i move to the uae",
    ],
    keywords: [["register", "company", "remotely"]],
    next: ["biz-poa-for-setup", "biz-shareholder-abroad", "biz-visa-timeline"],
  },
  {
    id: "biz-visit-visa-setup",
    question: "Can I start the process on a visit visa?",
    answer:
      "Generally yes — many people incorporate while on a visit or tourist entry and then change status when the residence visa is issued. The status change has its own rules and is sometimes done by exiting and re-entering. It is worth sequencing deliberately so your entry does not expire mid-process.",
    service: "business-setup",
    phrases: [
      "can i set up a company while on a visit visa",
      "can i register a business on a tourist visa in dubai",
      "changing status from visit visa to residence",
    ],
    keywords: [["visit", "visa", "set", "up"], ["tourist", "visa", "register", "business"]],
    next: ["biz-own-visa", "biz-visa-timeline", "biz-be-in-uae"],
  },
  {
    id: "biz-timeline-realistic",
    question: "What is a realistic timeline from decision to trading?",
    answer:
      "The licence is usually the fast part. What determines the real date is any regulator approval, the notarised documents where shareholders are overseas, and the bank account — which is routinely the longest step and the one least under anyone's control. We give you a sequence with the slow steps named rather than a single optimistic number.",
    service: "business-setup",
    phrases: [
      "how long from starting the process to actually trading",
      "realistic timeline for setting up and operating in dubai",
      "when can i start invoicing after i apply",
    ],
    keywords: [["timeline", "decision", "trading"], ["when", "start", "invoicing"]],
    next: ["biz-licence-timeline", "biz-bank-timeline", "biz-visa-timeline"],
  },
  {
    id: "biz-common-mistakes",
    question: "What do people most often get wrong?",
    answer:
      "Four things, in order: choosing the jurisdiction before knowing who the customers are, picking activities too narrowly and having to amend, signing a lease before the premises is approved for the use, and treating the bank account as a formality. Each is cheap to avoid at the start and expensive to fix afterwards.",
    service: "business-setup",
    phrases: [
      "what do people get wrong when setting up in dubai",
      "common mistakes in uae company formation",
      "what should i avoid when starting a business here",
    ],
    keywords: [["common", "mistakes", "formation"], ["what", "people", "get", "wrong"]],
    next: ["biz-choose-activity", "biz-premises-approval", "biz-bank-account"],
  },
  {
    id: "biz-guarantees",
    question: "Can you guarantee my licence or visa will be approved?",
    answer:
      "No, and nobody honestly can — approval is the authority's decision, not a provider's. What can be done is make sure the file does not fail on paperwork before it reaches them, and that you are not applying for something your case cannot support. Anyone promising you a guaranteed approval is selling you something they do not control.",
    service: "business-setup",
    phrases: [
      "can you guarantee my licence will be approved",
      "is approval of my company registration guaranteed",
      "will my visa definitely be approved",
    ],
    keywords: [["guarantee", "licence", "approved"], ["approval", "guaranteed"]],
    next: ["biz-choose-provider", "biz-visa-rejected", "biz-what-we-do"],
  },
  {
    id: "biz-legal-advice-limits",
    question: "Can you give me legal advice on my company?",
    answer:
      "No. Drafting contracts, advising on disputes and anything that turns on interpreting the law is a UAE-licensed lawyer's work, and we are not one. We handle the structure and the process, and we will say plainly when a question has crossed that line rather than answering it anyway.",
    service: "business-setup",
    phrases: [
      "can you give me legal advice about my company",
      "can you draft a contract for my business",
      "do you have lawyers who can advise me",
    ],
    keywords: [["give", "legal", "advice"], ["draft", "contract", "business"]],
    next: ["biz-partner-dispute", "biz-tax-advice-limits", "biz-what-we-do"],
  },
  {
    id: "biz-languages",
    question: "Do I need to speak Arabic to run a company here?",
    answer:
      "No. Business runs in English across most of the private sector, and the authorities' portals are bilingual. Where Arabic is required it is on the documents rather than in the room — the memorandum, the notarised instruments and filings — and that is handled by licensed legal translators.",
    service: "business-setup",
    phrases: [
      "do i need to speak arabic to run a business in dubai",
      "is arabic required for company registration",
      "can i operate my uae company in english",
    ],
    keywords: [["speak", "arabic", "business"], ["arabic", "required", "registration"]],
    next: ["biz-legal-translation", "biz-arabic-trade-name", "biz-notary-appointment"],
  },
  {
    id: "biz-other-services",
    question: "Can you help with the visas and documents too, not just the licence?",
    answer:
      "Yes — the licence is rarely the whole job. Attestation of documents from abroad, certified legal translation, notarisation of the company instruments and the visa processing afterwards all sit alongside it, and we can line them up in the right order. Doing them out of sequence is what causes most of the repeated work.",
    service: "business-setup",
    phrases: [
      "can you help with visas and attestation as well as the licence",
      "do you handle documents and translation too",
      "can you do everything or only the company registration",
    ],
    keywords: [["help", "visas", "attestation"], ["handle", "documents", "translation"]],
    next: ["biz-attest-corporate-documents", "biz-legal-translation", "biz-staff-visas"],
  },
  {
    id: "biz-second-opinion",
    question: "I have been given advice I am not sure about. Can you check it?",
    answer:
      "Yes, and it is one of the more useful things we do. Bring what you were told — the jurisdiction, the activities, the package and the price — and we will say where it holds up and where it does not. A second look before you pay is a great deal cheaper than an amendment afterwards.",
    service: "business-setup",
    phrases: [
      "can you check advice i was given about company setup",
      "i want a second opinion on my business setup plan",
      "is what this consultant told me correct",
    ],
    keywords: [["second", "opinion", "setup"], ["check", "advice", "given"]],
    next: ["biz-choose-provider", "biz-wrong-jurisdiction", "biz-common-mistakes"],
  },
  {
    id: "biz-already-have-licence",
    question: "I already have a licence and need help with what comes next. Can you help?",
    answer:
      "Yes — a good deal of what we do is after the licence: the bank account, the visas, amendments, renewals and the compliance calendar nobody was told about. Tell us where you have got to and what is stuck, and we will pick it up from there.",
    service: "business-setup",
    phrases: [
      "i already have a trade licence and need help with the next steps",
      "can you help after the company is registered",
      "my company exists but i am stuck on the bank account",
    ],
    keywords: [["already", "have", "licence"], ["help", "after", "registered"]],
    next: ["biz-bank-account", "biz-compliance-calendar", "biz-staff-visas"],
  },
  {
    id: "biz-get-started",
    question: "I want to get started on my company setup. What happens next?",
    answer:
      "A short conversation, and then a plan you can actually act on: the jurisdiction and activities that fit, what it will cost with government fees shown separately, what documents you need to gather, and in what order. Let us take a few details now and someone will come back to you with that.",
    service: "business-setup",
    phrases: [
      "i want to get started with setting up my company",
      "i am ready to set up my business can you help",
      "how do i begin the process with you",
      "i want to register my company now",
    ],
    keywords: [["want", "to", "get", "started"], ["ready", "set", "up", "business"], ["register", "company", "now"]],
    quote: true,
  },
  {
    id: "biz-speak-to-someone",
    question: "Can I speak to someone about my company setup?",
    answer:
      "Yes. A few details about what the business will do and where you have got to, and someone who handles this every day will come back to you rather than you working through it in a chat window.",
    service: "business-setup",
    phrases: [
      "can i speak to someone about setting up my company",
      "i want to talk to a person about my business setup",
      "can someone call me back about company formation",
      "put me through to an advisor",
    ],
    keywords: [["speak", "to", "someone"], ["talk", "to", "a", "person"], ["call", "me", "back"]],
    quote: true,
  },
  {
    id: "biz-complex-case",
    question: "My company setup is complicated and does not fit the usual answers.",
    answer:
      "Most of the interesting ones do not — multiple jurisdictions, an existing business abroad, shareholders in several countries, or a regulated activity nobody has priced properly. Tell us the shape of it and someone who has seen the awkward versions will come back to you rather than guessing here.",
    service: "business-setup",
    phrases: [
      "my business setup situation is complicated",
      "my case does not fit the standard options",
      "i have an unusual company structure question",
    ],
    keywords: [["situation", "is", "complicated"], ["does", "not", "fit", "standard"]],
    quote: true,
  },
];
