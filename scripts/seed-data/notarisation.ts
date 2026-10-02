/**
 * Every notarisation question we are prepared to answer, and how they connect.
 *
 * Seed content, in the same spirit as ./faqs.ts: this file is what fills the
 * flow the first time, and after that /admin/flow is where it is edited. It is
 * written against `AuthoredFlow` so that writing an answer is writing sentences
 * — the nodes, edges and intents are `buildAuthoredFlow`'s problem.
 *
 * WHY IT IS SHAPED IN CLUSTERS
 *
 * A hundred and forty answers all hanging off the start node is a bank with
 * extra steps, and it matches badly: `matchByEmbedding` needs the winner to beat
 * the runner-up by `SIMILARITY_MARGIN`, and a hundred and forty near-neighbours
 * rarely give it one — every POA question looks like every other POA question.
 *
 * So there are fourteen hubs, one per subject, each offering its cluster as
 * buttons. Someone who taps arrives at an exact node with no matching at all,
 * and someone who types is matched against that hub's handful of local intents
 * rather than against everything. Every answer is still wired from `start` as
 * well, because a person who types "can I revoke a power of attorney" on the
 * home page should get that answer rather than a menu. The two routes are not
 * redundant: one is for people who know what they want, the other for people
 * who came here because they do not.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind written answers harder than
 * generated ones, because these are published under the company's name with no
 * model in the loop to hedge them:
 *
 *   - No fee, processing time, validity period, quota or eligibility rule
 *     stated as fact. Those change, and a visitor who acted on a stale one got
 *     it from us. Say what it depends on and who to confirm it with.
 *   - No legal advice, and nothing implying we notarise anything. We check
 *     documents and introduce people to licensed providers; the notary is
 *     always someone else.
 *   - No promised outcome. A notary can refuse.
 *
 * The first of those is enforced mechanically in tests/notarisation.test.ts, by
 * the same `findUnsupportedAmounts` the chatbot's own replies go through.
 *
 * A money question therefore does not get a number — it gets an honest sentence
 * and `quote: true`, which walks it into the notary qualification and ends at
 * the callback form. That is set on the questions nobody can answer in the
 * abstract, not on every question, because a conversation that reaches for the
 * contact form after each answer is a conversation people close.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every id here starts with this. `buildAuthoredFlow` derives node ids as
 *  `n-<id>`, and the answer-bank migration derives its own the same way from
 *  answer slugs — the prefix is what keeps the two from ever colliding. */
const SERVICE = "notary";

export const NOTARISATION_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "not-hub-basics",
    question: "What does notarisation in Dubai actually involve?",
    answer:
      "Notarisation is a UAE notary confirming who signed a document and that they had the authority to sign it. It is a different step from attestation and from legal translation, and people are regularly told they need one when they need another. Where would you like to start?",
    service: SERVICE,
    phrases: [
      "what does notarisation in dubai involve",
      "explain notarisation in the uae",
      "i do not understand notarisation",
      "help me understand the notary process in dubai",
      "notarisation basics dubai",
    ],
    keywords: [["explain", "notarisation"], ["understand", "notarisation"]],
    opener: true,
    faq: false,
    choices: [
      { label: "What is notarisation?", to: "not-what-is" },
      { label: "Notarisation or attestation?", to: "not-vs-attestation" },
      { label: "Do I even need a notary?", to: "not-do-i-need-one" },
      { label: "Who is the notary?", to: "not-who-is-the-notary" },
      { label: "What will it cost?", to: "not-what-it-costs" },
    ],
    next: ["not-what-is", "not-do-i-need-one", "not-hub-appointment"],
  },
  {
    id: "not-hub-poa",
    question: "I need a power of attorney",
    answer:
      "A power of attorney lets someone act for you, and UAE notaries read them narrowly: the powers have to be written out act by act, not implied. Which part are you working out?",
    service: SERVICE,
    phrases: [
      "i need a power of attorney",
      "help me with a power of attorney",
      "how do i make a power of attorney in dubai",
      "i want to give someone power of attorney",
      "arrange a power of attorney in the uae",
    ],
    keywords: [["need", "power", "attorney"], ["make", "power", "attorney"]],
    faq: false,
    choices: [
      { label: "Which type do I need?", to: "not-poa-types" },
      { label: "What goes in it?", to: "not-poa-contents" },
      { label: "I am outside the UAE", to: "not-poa-from-abroad" },
      { label: "Cancelling one", to: "not-poa-revoke" },
      { label: "How long it lasts", to: "not-poa-validity" },
    ],
    next: ["not-poa-types", "not-poa-contents", "not-poa-who-can-hold"],
  },
  {
    id: "not-hub-affidavit",
    question: "I need an affidavit or a declaration",
    answer:
      "An affidavit or declaration is you stating something on the record in front of a notary. The wording decides whether the authority that asked for it will accept it, so it is worth knowing which one they meant. Which is it?",
    service: SERVICE,
    phrases: [
      "i need an affidavit",
      "i need a declaration notarised",
      "how do i make an affidavit in dubai",
      "notarise a sworn statement in the uae",
      "i need a statutory declaration",
    ],
    keywords: [["need", "affidavit"], ["need", "declaration"], ["sworn", "statement"]],
    faq: false,
    choices: [
      { label: "Affidavit or declaration?", to: "not-affidavit-vs-declaration" },
      { label: "Single status", to: "not-single-status" },
      { label: "Change of name", to: "not-name-change" },
      { label: "Lost document", to: "not-lost-document" },
      { label: "An undertaking", to: "not-undertaking" },
    ],
    next: ["not-affidavit-vs-declaration", "not-single-status", "not-undertaking"],
  },
  {
    id: "not-hub-company",
    question: "Company and shareholder documents",
    answer:
      "Corporate instruments are where notarisation goes wrong most often, because the person signing has to be the person the trade licence says can sign. Which document is it?",
    service: SERVICE,
    phrases: [
      "notarise company documents in dubai",
      "i need corporate documents notarised",
      "company paperwork at the notary",
      "shareholder documents notarisation uae",
    ],
    keywords: [["notarise", "company", "documents"], ["corporate", "documents", "notary"]],
    faq: false,
    choices: [
      { label: "Memorandum of association", to: "not-moa" },
      { label: "Amending the MOA", to: "not-moa-amendment" },
      { label: "Share transfer", to: "not-share-transfer" },
      { label: "Board resolution", to: "not-board-resolution" },
      { label: "Company power of attorney", to: "not-company-poa" },
      { label: "Who is allowed to sign?", to: "not-company-signatory" },
    ],
    next: ["not-moa", "not-company-signatory", "not-share-transfer"],
  },
  {
    id: "not-hub-property",
    question: "Property and real estate documents",
    answer:
      "Property transactions in Dubai involve the Land Department as well as a notary, and which one you need depends on whether you are transferring ownership or authorising someone to act for you. What are you doing?",
    service: SERVICE,
    phrases: [
      "notarise property documents in dubai",
      "property paperwork and the notary",
      "real estate documents notarisation dubai",
      "i am selling my property and need a document notarised",
    ],
    keywords: [["property", "documents", "notary"], ["real", "estate", "notarisation"]],
    faq: false,
    choices: [
      { label: "Authorise someone to sell", to: "not-poa-property-sale" },
      { label: "Gifting property", to: "not-property-gift" },
      { label: "Notary or Land Department?", to: "not-vs-land-department" },
      { label: "Tenancy contracts", to: "not-tenancy-contract" },
      { label: "More than one owner", to: "not-joint-owners" },
    ],
    next: ["not-poa-property-sale", "not-vs-land-department", "not-joint-owners"],
  },
  {
    id: "not-hub-family",
    question: "Family, marriage and children",
    answer:
      "Family instruments are looked at carefully because more than one person's rights are in them, and a notary will check that everyone who has to consent has. Which is it?",
    service: SERVICE,
    phrases: [
      "notarise a document about my children",
      "family documents at the notary in dubai",
      "marriage documents notarised in the uae",
      "i need a document notarised for my child",
    ],
    keywords: [["family", "documents", "notary"], ["document", "for", "my", "child"]],
    faq: false,
    choices: [
      { label: "Child travelling", to: "not-child-travel" },
      { label: "Guardianship", to: "not-guardianship" },
      { label: "Marriage documents", to: "not-marriage-documents" },
      { label: "Prenuptial agreement", to: "not-prenuptial" },
      { label: "Divorce documents", to: "not-divorce-documents" },
    ],
    next: ["not-child-travel", "not-guardianship", "not-marriage-documents"],
  },
  {
    id: "not-hub-wills",
    question: "Wills and inheritance",
    answer:
      "There is more than one way to register a will covering UAE assets and they are not interchangeable — the right one depends on where the assets are and who you want to inherit them. This is one to take advice on rather than guess at.",
    service: SERVICE,
    phrases: [
      "how do i make a will in dubai",
      "register a will for my uae assets",
      "i want to write a will covering my dubai property",
      "inheritance of my assets in the uae",
    ],
    keywords: [["make", "will", "assets"], ["inheritance", "uae", "assets"]],
    faq: false,
    choices: [
      { label: "What are my options?", to: "not-will-options" },
      { label: "Notarised or registered?", to: "not-will-vs-registered" },
      { label: "If there is no will", to: "not-no-will" },
      { label: "A will made abroad", to: "not-will-made-abroad" },
    ],
    next: ["not-will-options", "not-no-will", "not-will-made-abroad"],
  },
  {
    id: "not-hub-appointment",
    question: "Booking and attending a notary appointment",
    answer:
      "The appointment itself is the short part; what takes time is getting the document into a form the notary accepts before you arrive. What would you like to know?",
    service: SERVICE,
    phrases: [
      "i need help with a notary appointment",
      "where do i go to notarise a document in dubai",
      "what happens at a notary appointment in the uae",
      "i want to book a notary",
    ],
    keywords: [["help", "notary", "appointment"], ["where", "notarise", "dubai"]],
    faq: false,
    choices: [
      { label: "How to book", to: "not-how-to-book" },
      { label: "Public or private notary?", to: "not-public-vs-private" },
      { label: "Can I do it online?", to: "not-online" },
      { label: "Must I attend?", to: "not-attend-in-person" },
      { label: "Does everyone attend?", to: "not-all-signatories" },
      { label: "How long it takes", to: "not-how-long" },
    ],
    next: ["not-how-to-book", "not-what-to-bring", "not-online"],
  },
  {
    id: "not-hub-translation",
    question: "Arabic, translation and wording",
    answer:
      "UAE notaries work in Arabic, so nearly every document reaches the notary bilingually. Getting the translation and the notarisation in the right order saves paying for one of them twice. What is the question?",
    service: SERVICE,
    phrases: [
      "does my document need to be in arabic to be notarised",
      "translation for the notary in dubai",
      "bilingual documents and notarisation",
      "arabic version of my document for the notary",
    ],
    keywords: [["arabic", "to", "be", "notarised"], ["translation", "notary"], ["bilingual", "notarisation"]],
    faq: false,
    choices: [
      { label: "Must it be bilingual?", to: "not-bilingual-required" },
      { label: "Who may translate it?", to: "not-who-translates" },
      { label: "Translate first or after?", to: "not-translate-order" },
      { label: "My name in Arabic", to: "not-name-spelling" },
      { label: "English-only documents", to: "not-english-only" },
    ],
    next: ["not-bilingual-required", "not-who-translates", "not-translate-order"],
  },
  {
    id: "not-hub-documents",
    question: "What to bring to the notary, and who is allowed to sign",
    answer:
      "Most wasted appointments are an identity problem rather than a document problem. What are you checking?",
    service: SERVICE,
    phrases: [
      "what do i need to bring to a notary in dubai",
      "what documents does the notary ask for",
      "notary identification requirements in the uae",
      "what should i take to my notary appointment",
    ],
    keywords: [["bring", "to", "notary"], ["documents", "notary", "asks"], ["identification", "notary"]],
    faq: false,
    choices: [
      { label: "What to bring", to: "not-what-to-bring" },
      { label: "No Emirates ID", to: "not-no-emirates-id" },
      { label: "On a visit visa", to: "not-visit-visa" },
      { label: "Expired ID", to: "not-expired-id" },
      { label: "Signing for a minor", to: "not-minors" },
      { label: "Original or copy?", to: "not-original-or-copy" },
    ],
    next: ["not-what-to-bring", "not-no-emirates-id", "not-original-or-copy"],
  },
  {
    id: "not-hub-fees",
    question: "Questions about what notarisation costs",
    answer:
      "Nobody being straight with you will quote notarisation off a price list, and it is worth knowing why before you compare two quotes. What would you like to know?",
    service: SERVICE,
    // Deliberately navigational rather than a price question. A menu must not
    // intercept "how much does notarisation cost" — that phrasing belongs to
    // `not-what-it-costs`, which is a `quote` entry and walks into the
    // qualification. A hub answering it would put a tap between a visitor
    // asking about money and a person calling them back, which is the one
    // thing the `quote` mechanism exists to prevent.
    phrases: [
      "i have a question about notary fees",
      "help me understand notarisation pricing",
      "i want to talk about what this will cost",
    ],
    keywords: [["question", "about", "fees"], ["understand", "notarisation", "pricing"]],
    faq: false,
    choices: [
      { label: "What it costs", to: "not-what-it-costs" },
      { label: "Why no fixed price?", to: "not-no-fixed-price" },
      { label: "Per page or per document?", to: "not-per-page" },
      { label: "Is translation extra?", to: "not-translation-cost" },
      { label: "If it gets rejected", to: "not-refund" },
    ],
    next: ["not-no-fixed-price", "not-per-page", "not-translation-cost"],
  },
  {
    id: "not-hub-rejection",
    question: "The notary rejected my document",
    answer:
      "A refusal is normally about form rather than substance, which is the good news — most of them are fixable the same week. What happened?",
    service: SERVICE,
    phrases: [
      "my document was rejected by the notary",
      "the notary refused to notarise my document",
      "notary would not accept my document",
      "something went wrong at the notary",
    ],
    keywords: [["rejected", "by", "notary"], ["notary", "refused"], ["notary", "not", "accept"]],
    faq: false,
    choices: [
      { label: "Why it was refused", to: "not-why-rejected" },
      { label: "Wording problems", to: "not-wrong-wording" },
      { label: "Signatory not authorised", to: "not-signatory-not-authorised" },
      { label: "Name does not match", to: "not-name-mismatch" },
      { label: "Fixing it", to: "not-fix-after-rejection" },
      { label: "Changing a notarised document", to: "not-correct-after" },
    ],
    next: ["not-why-rejected", "not-fix-after-rejection", "not-wrong-wording"],
  },
  {
    id: "not-hub-abroad",
    question: "Using the document in another country",
    answer:
      "A UAE notary's stamp is recognised in the UAE. Taking it abroad, or bringing a foreign document here, is a further chain that depends on both countries. Which direction are you going?",
    service: SERVICE,
    phrases: [
      "use a uae notarised document abroad",
      "will my dubai power of attorney work in my home country",
      "i need help using a document across borders",
      "my document needs to work in another country",
    ],
    keywords: [["notarised", "document", "abroad"], ["foreign", "document", "uae"], ["work", "home", "country"]],
    faq: false,
    choices: [
      { label: "Taking it out of the UAE", to: "not-document-abroad" },
      { label: "MOFA after the notary", to: "not-mofa" },
      { label: "Bringing one in", to: "not-foreign-document" },
      { label: "Made in my home country", to: "not-poa-home-country" },
      { label: "Apostille", to: "not-apostille" },
      { label: "At an embassy", to: "not-embassy" },
    ],
    next: ["not-document-abroad", "not-mofa", "not-foreign-document"],
  },
  {
    id: "not-hub-effect",
    question: "What a notarised document can and cannot do",
    answer:
      "This is the part people are most often wrong about, usually in the direction of thinking a notary's stamp settles more than it does. What are you relying on it for?",
    service: SERVICE,
    phrases: [
      "is a notarised document legally binding in the uae",
      "what does a notarised document prove",
      "can i rely on a notarised agreement in dubai",
      "legal effect of notarisation in the uae",
    ],
    keywords: [["notarised", "legally", "binding"], ["legal", "effect", "notarisation"]],
    faq: false,
    choices: [
      { label: "Is it binding?", to: "not-is-it-binding" },
      { label: "Does the notary check it?", to: "not-checks-content" },
      { label: "Enforcing it", to: "not-enforcement" },
      { label: "Notarised or registered?", to: "not-vs-registered" },
      { label: "Witnesses", to: "not-witnesses" },
    ],
    next: ["not-is-it-binding", "not-checks-content", "not-enforcement"],
  },

  /* ── Basics ────────────────────────────────────────────────────────────── */
  {
    id: "not-what-is",
    question: "What is notarisation?",
    answer:
      "A notary confirms who signed a document, that they signed it willingly, and that they had the authority to sign it. It does not make the contents true and it does not make an unlawful agreement lawful — it makes the signature hard to deny later. That is why it is asked for on powers of attorney, declarations and company instruments, where the whole risk is somebody afterwards saying \"that was not me\".",
    service: SERVICE,
    phrases: [
      "what is notarisation",
      "what does a notary actually do",
      "what does notarising a document mean",
      "what is the point of notarisation",
    ],
    keywords: [["notarisation", "mean"], ["notary", "actually", "does"]],
    next: ["not-vs-attestation", "not-checks-content", "not-do-i-need-one"],
  },
  {
    id: "not-what-can-be-notarised",
    question: "What kinds of documents can be notarised?",
    answer:
      "Broadly, documents that someone is signing and wants to be able to prove they signed: powers of attorney, affidavits and declarations, company instruments such as memoranda and resolutions, agreements between parties, and consents. What cannot be notarised is anything the notary considers unlawful, anything whose signatory has no authority to sign it, and anything already issued by another authority — a birth certificate is attested, not notarised.",
    service: SERVICE,
    phrases: [
      "what kinds of documents can be notarised",
      "what documents can a notary notarise",
      "can any document be notarised in dubai",
      "list of documents a notary handles",
    ],
    keywords: [["what", "documents", "notarised"], ["which", "documents", "notary"]],
    next: ["not-vs-attestation", "not-what-is", "not-do-i-need-one"],
  },
  {
    id: "not-who-is-the-notary",
    question: "Who is the notary in the UAE?",
    answer:
      "Notarisation is carried out by notaries working under the emirate's judicial authority — in Dubai that means the Dubai Courts notary service and the private notaries licensed to act alongside it. They are officials rather than a service you shop between: any of them will notarise a correct document and none of them will notarise an incorrect one. We are not a notary; we check documents and introduce people to licensed providers who arrange the appointment.",
    service: SERVICE,
    phrases: [
      "who is the notary in the uae",
      "who can notarise a document in dubai",
      "are you a notary yourself",
      "is the notary a government official in dubai",
    ],
    keywords: [["who", "notary", "uae"], ["licensed", "notary", "dubai"]],
    next: ["not-public-vs-private", "not-how-to-book", "not-do-i-need-one"],
  },
  {
    id: "not-vs-attestation",
    question: "What is the difference between notarisation and attestation?",
    answer:
      "Attestation is a chain of stamps proving a document issued in one country is genuine, and it starts in the country that issued it. Notarisation is a UAE notary witnessing a signature, usually on a document being created here and now. A degree certificate from abroad is attested; a power of attorney you are signing in Dubai is notarised. Some cases need both, in that order, and that is where people lose the most time.",
    service: SERVICE,
    phrases: [
      "difference between notarisation and attestation",
      "is notarisation the same as attestation",
      "do i need attestation or notarisation",
      "notarised or attested which one do i need",
    ],
    keywords: [["difference", "notarisation", "attestation"], ["notarisation", "same", "attestation"]],
    next: ["not-do-i-need-one", "not-then-attestation", "not-vs-translation"],
  },
  {
    id: "not-vs-translation",
    question: "Is legal translation part of notarisation?",
    answer:
      "No — separate steps, separate providers. A translator licensed by the Ministry of Justice makes the document readable to the notary and to whoever reads it afterwards; the notary witnesses the signing. Because UAE notaries work in Arabic the translation almost always has to happen for the notarisation to be possible, which is why the two get talked about as one thing.",
    service: SERVICE,
    phrases: [
      "is translation part of notarisation",
      "does the notary translate my document",
      "do i need legal translation and notarisation",
      "difference between legal translation and notarisation",
    ],
    keywords: [["translation", "part", "notarisation"], ["notary", "translate", "my", "document"]],
    next: ["not-bilingual-required", "not-who-translates", "not-translate-order"],
  },
  {
    id: "not-vs-legalisation",
    question: "What is the difference between notarisation and legalisation?",
    answer:
      "Notarisation happens in front of a notary and concerns the signature. Legalisation is what makes a document usable in a different country, and it is a further chain of confirmations by foreign ministries and an embassy. A document can be perfectly notarised in Dubai and still be refused abroad because nobody legalised it for that country.",
    service: SERVICE,
    phrases: [
      "difference between notarisation and legalisation",
      "what is document legalisation",
      "is legalisation the same as notarisation",
    ],
    keywords: [["difference", "notarisation", "legalisation"], ["document", "legalisation", "meaning"]],
    next: ["not-document-abroad", "not-mofa", "not-apostille"],
  },
  {
    id: "not-do-i-need-one",
    question: "How do I know whether I actually need a notary?",
    answer:
      "Work backwards from whoever will receive the document — a bank, a court, a ministry, the land department, an employer, a foreign authority. They hold the requirement and they will normally say which of notarised, attested, legalised or simply signed they need. Tell us who is asking and what for, and we will work out which chain your case needs before you pay anyone for a step you do not.",
    service: SERVICE,
    phrases: [
      "do i actually need a notary",
      "how do i know if i need notarisation",
      "is notarisation necessary in my case",
      "do i need my document notarised or not",
    ],
    keywords: [["do", "i", "need", "notary"], ["need", "notarisation", "case"]],
    quote: true,
  },
  {
    id: "not-true-copy",
    question: "Can a notary certify a copy as a true copy?",
    answer:
      "Certifying that a copy matches an original is a recognised notarial act, but it is not the same as attesting the original, and the authority you are giving it to may want one and not the other. Bring the original — no notary certifies a copy against another copy. Anyone offering to certify a copy from a scan you emailed them is not doing this properly.",
    service: SERVICE,
    phrases: [
      "can a notary certify a true copy",
      "certified true copy in dubai",
      "notarise a photocopy of my passport",
      "true copy certification uae",
    ],
    keywords: [["true", "copy"], ["certify", "copy", "notary"]],
    next: ["not-original-or-copy", "not-vs-attestation", "not-what-to-bring"],
  },
  {
    id: "not-signature-only",
    question: "Can a notary just verify my signature?",
    answer:
      "Signature verification — a notary confirming that the signature on a document is yours — is narrower than notarising the document itself, and some authorities ask for exactly that and nothing more. Which one you need is worth settling before the appointment, because asking for the wrong act on the day means going back.",
    service: SERVICE,
    phrases: [
      "can a notary just verify my signature",
      "signature verification at the notary in dubai",
      "i only need my signature attested",
      "notary signature attestation uae",
    ],
    keywords: [["verify", "my", "signature"], ["signature", "verification"]],
    next: ["not-what-is", "not-what-to-bring", "not-how-to-book"],
  },
  {
    id: "not-vs-lawyer",
    question: "Do I need a lawyer as well as a notary?",
    answer:
      "A notary witnesses; they do not advise you on whether the deal is a good one or whether a clause protects you. If the document creates an obligation you would be unhappy to be held to — a company agreement, a debt acknowledgment, anything about property or children — that is a question for a licensed lawyer. We are not a law firm and cannot give legal advice, but we can put you in front of someone who can.",
    service: SERVICE,
    phrases: [
      "do i need a lawyer as well as a notary",
      "can the notary advise me on my contract",
      "is a notary the same as a lawyer in dubai",
      "should a lawyer draft my power of attorney",
    ],
    keywords: [["need", "lawyer", "notary"], ["notary", "advise", "me"]],
    next: ["not-checks-content", "not-wrong-wording", "not-is-it-binding"],
  },
  {
    id: "not-interpreter",
    question: "I do not read Arabic or English well. Can I still notarise?",
    answer:
      "Yes, but you have to genuinely understand what you are signing, and a notary who is not satisfied that you do will stop the appointment. In practice that means an interpreter attends, or the document is prepared in a language you read alongside the Arabic. Say which language you are comfortable in when you book rather than on the day.",
    service: SERVICE,
    phrases: [
      "i do not speak arabic can i still notarise",
      "do i need an interpreter at the notary",
      "notarisation if i do not read english",
      "interpreter for a notary appointment in dubai",
    ],
    keywords: [["interpreter", "notary"], ["do", "not", "speak", "arabic"], ["do", "not", "read", "english"]],
    next: ["not-bilingual-required", "not-attend-in-person", "not-what-to-bring"],
  },

  /* ── Powers of attorney ────────────────────────────────────────────────── */
  {
    id: "not-poa-general",
    question: "What is a general power of attorney?",
    answer:
      "A general power of attorney authorises someone to deal with a broad category of your affairs rather than one named transaction. It is convenient and it gives away a great deal, and UAE authorities still read it narrowly — many will decline to act on a general power for something significant such as selling property, and want one worded for that act. Most people who ask for a general power actually need a special one.",
    service: SERVICE,
    phrases: [
      "what is a general power of attorney",
      "i want a general power of attorney in dubai",
      "general poa uae meaning",
      "is a general power of attorney enough",
    ],
    keywords: [["general", "power", "attorney"], ["general", "poa"]],
    next: ["not-poa-types", "not-poa-contents", "not-poa-limits"],
  },
  {
    id: "not-poa-types",
    question: "Which type of power of attorney do I need?",
    answer:
      "They divide into general powers, covering a broad category of dealings, and special powers, naming one thing: sell this property, represent me in this case, manage this company, operate this account. Special is usually the answer, because a notary and the receiving authority both read a power of attorney narrowly — one that does not mention the act will not be treated as covering it. Tell us what the holder actually has to do and we will tell you which shape it needs.",
    service: SERVICE,
    phrases: [
      "which type of power of attorney do i need",
      "difference between general and special power of attorney",
      "what types of power of attorney are there",
      "special or general poa which one",
    ],
    keywords: [["types", "power", "attorney"], ["general", "special", "attorney"], ["which", "power", "attorney", "need"]],
    next: ["not-poa-contents", "not-poa-who-can-hold", "not-poa-property-sale"],
  },
  {
    id: "not-poa-contents",
    question: "What has to be written in a power of attorney?",
    answer:
      "At minimum: exactly who you are, exactly who is being authorised, and the powers spelled out act by act rather than described in general terms. Anything you do not want them to be able to do should be excluded in words, and anything they must be able to do — sign before a named authority, collect money, appoint a substitute — has to be named. This is the part that gets documents refused, and the part we check before anybody books an appointment.",
    service: SERVICE,
    phrases: [
      "what has to be written in a power of attorney",
      "what should a power of attorney include",
      "power of attorney wording requirements dubai",
      "what powers should i list in my poa",
    ],
    keywords: [["what", "include", "power", "attorney"], ["power", "attorney", "wording"]],
    next: ["not-poa-substitution", "not-wrong-wording", "not-poa-limits"],
  },
  {
    id: "not-poa-who-can-hold",
    question: "Who can I appoint as my attorney?",
    answer:
      "Normally any adult with valid identification, and they do not have to be a relative — plenty of powers are given to a friend, a colleague, a lawyer or a company. What matters more is that they are clearly identifiable in the document and reachable when the act has to be done. Expect to be asked about the connection where there is not an obvious one.",
    service: SERVICE,
    phrases: [
      "who can i appoint as my attorney",
      "can i give power of attorney to a friend",
      "does my attorney have to be a relative",
      "can a company hold my power of attorney",
    ],
    keywords: [["who", "can", "appoint", "attorney"], ["power", "attorney", "friend"], ["attorney", "relative"]],
    next: ["not-poa-two-holders", "not-poa-substitution", "not-poa-contents"],
  },
  {
    id: "not-poa-two-holders",
    question: "Can I appoint two attorneys?",
    answer:
      "Yes, and the choice that matters is whether they may act separately or only together. Jointly means nothing happens unless both sign — safer and slower. Separately means either can act alone — faster, and it gives away more. Whichever you want has to be stated, because a document silent on it invites exactly the argument you were trying to avoid.",
    service: SERVICE,
    phrases: [
      "can i appoint two attorneys",
      "can two people hold the same power of attorney",
      "jointly or severally in a power of attorney",
      "more than one attorney in one poa",
    ],
    keywords: [["two", "attorneys"], ["jointly", "severally"], ["more", "than", "one", "attorney"]],
    next: ["not-poa-contents", "not-poa-substitution", "not-poa-revoke"],
  },
  {
    id: "not-poa-substitution",
    question: "Can my attorney pass the power on to someone else?",
    answer:
      "Only if the document says they can. A substitution clause lets your attorney appoint someone else to do the same acts; without one they cannot, and a substitute who tries will be refused. Decide it deliberately — it is convenient when your attorney travels, and uncomfortable if you have not thought about who might end up holding it.",
    service: SERVICE,
    phrases: [
      "can my attorney pass the power to someone else",
      "substitution clause in a power of attorney",
      "can an attorney delegate a power of attorney",
      "can my poa holder appoint someone else",
    ],
    keywords: [["substitution", "clause"], ["attorney", "delegate"], ["attorney", "appoint", "substitute"]],
    next: ["not-poa-contents", "not-poa-revoke", "not-poa-limits"],
  },
  {
    id: "not-poa-limits",
    question: "Are there things a power of attorney cannot cover?",
    answer:
      "Yes. Some acts must be done in person and cannot be delegated at all, and others need a power worded specifically for that act before a specific authority. Rather than assume, name the act and the authority it will be done in front of — that is the question a provider can answer definitively for your case, and guessing is how a document gets drafted twice.",
    service: SERVICE,
    phrases: [
      "are there things a power of attorney cannot cover",
      "what can a power of attorney not do",
      "limits of a power of attorney in the uae",
      "can everything be done by power of attorney",
    ],
    keywords: [["power", "attorney", "cannot", "cover"], ["limits", "power", "attorney"]],
    quote: true,
  },
  {
    id: "not-poa-from-abroad",
    question: "Can I make a UAE power of attorney while I am abroad?",
    answer:
      "Not in front of a UAE notary — but you do not have to be. The usual route is to have it notarised where you are and then legalised so it is recognised here, which typically involves that country's authorities and the UAE mission there. The exact chain depends on which country you are in, so confirm it for yours before paying for any stamps.",
    service: SERVICE,
    phrases: [
      "can i make a uae power of attorney while abroad",
      "power of attorney for dubai from outside the uae",
      "i am not in the uae can i sign a power of attorney",
      "make a dubai poa from my home country",
    ],
    keywords: [["power", "attorney", "while", "abroad"], ["poa", "outside", "uae"], ["not", "in", "uae", "sign"]],
    next: ["not-poa-home-country", "not-embassy", "not-foreign-document"],
  },
  {
    id: "not-poa-revoke",
    question: "How do I cancel a power of attorney?",
    answer:
      "A power of attorney is revoked by a further notarised act — not by telling the person, and not by tearing up the paper. Until the revocation is done properly and the people relying on the document know about it, your attorney can still act. If you have decided to revoke, treat it as urgent rather than administrative.",
    service: SERVICE,
    phrases: [
      "how do i cancel a power of attorney",
      "how to revoke a power of attorney in dubai",
      "i want to withdraw a power of attorney",
      "cancel poa uae procedure",
    ],
    keywords: [["cancel", "power", "attorney"], ["revoke", "power", "attorney"], ["revoking", "attorney", "dubai"]],
    next: ["not-poa-revoke-notify", "not-poa-validity", "not-poa-misuse"],
  },
  {
    id: "not-poa-revoke-notify",
    question: "Do I have to tell anyone that I revoked a power of attorney?",
    answer:
      "Yes, and this is the step people skip. The revocation exists from the moment it is notarised, but a bank or an authority that has not been shown it will keep accepting your attorney's signature in good faith. Make a list of everyone who was ever given a copy of the original and make sure each of them receives the revocation.",
    service: SERVICE,
    phrases: [
      "do i have to tell anyone i revoked a power of attorney",
      "who do i notify after cancelling a power of attorney",
      "does the bank need to know i revoked my poa",
    ],
    keywords: [["notify", "revoked", "attorney"], ["tell", "bank", "revoked"]],
    next: ["not-poa-revoke", "not-poa-misuse", "not-poa-validity"],
  },
  {
    id: "not-poa-validity",
    question: "How long does a power of attorney last?",
    answer:
      "As long as the document says it does, so the honest answer is: read yours. Many are written with an end date or tied to completing one transaction, and some authorities separately decline to act on a document they consider too old regardless of what it says. Those practices differ by authority and change, so confirm the current position with whoever will receive it rather than relying on a general rule.",
    service: SERVICE,
    phrases: [
      "how long does a power of attorney last",
      "does a power of attorney expire in the uae",
      "validity period of a power of attorney dubai",
      "is my old power of attorney still valid",
    ],
    keywords: [["how", "long", "attorney", "last"], ["power", "attorney", "expire"], ["validity", "power", "attorney"]],
    next: ["not-poa-renew", "not-poa-revoke", "not-poa-death"],
  },
  {
    id: "not-poa-renew",
    question: "Can a power of attorney be renewed?",
    answer:
      "There is normally no renewal as such — a fresh power of attorney is signed and notarised in place of the old one. If the original is being refused because of its age, a new document is usually faster than arguing about the old one, and the wording can be carried across, so the earlier work is not wasted.",
    service: SERVICE,
    phrases: [
      "can a power of attorney be renewed",
      "how do i renew my power of attorney in dubai",
      "my power of attorney is too old what now",
    ],
    keywords: [["renew", "power", "attorney"], ["power", "attorney", "too", "old"]],
    next: ["not-poa-validity", "not-poa-contents", "not-how-to-book"],
  },
  {
    id: "not-poa-death",
    question: "What happens to a power of attorney if the person dies?",
    answer:
      "A power of attorney depends on the person who gave it, so it does not survive their death, and anyone acting on it afterwards is acting without authority. What happens to the assets then is a succession question rather than a notarial one, and it belongs with a lawyer. This is one of the reasons a will and a power of attorney are not substitutes for one another.",
    service: SERVICE,
    phrases: [
      "what happens to a power of attorney if the person dies",
      "does a power of attorney end on death",
      "can i use a power of attorney after someone died",
    ],
    keywords: [["power", "attorney", "dies"], ["power", "attorney", "death"]],
    next: ["not-will-options", "not-no-will", "not-poa-validity"],
  },
  {
    id: "not-poa-misuse",
    question: "What if my attorney misuses the power?",
    answer:
      "Revoke it immediately and notify everyone holding a copy, because every day it stands is another day they can act. What can be done about what they have already done is a legal question with real deadlines attached, so it belongs with a licensed lawyer rather than with a notary or with us. We can put you in touch with a provider the same day.",
    service: SERVICE,
    phrases: [
      "what if my attorney misuses the power of attorney",
      "my attorney did something i did not authorise",
      "power of attorney misuse in dubai",
    ],
    keywords: [["attorney", "misuse"], ["attorney", "did", "not", "authorise"], ["attorney", "abused"]],
    quote: true,
  },
  {
    id: "not-poa-bank",
    question: "Can I give someone power of attorney over my bank account?",
    answer:
      "A notarised power of attorney is usually only half of it: most banks also have their own mandate form and their own view of the wording they will accept, and they are entitled to refuse one that does not match. Ask your bank what they need first and have the power of attorney drafted to fit. Doing it the other way round is the most common wasted notary appointment we see.",
    service: SERVICE,
    phrases: [
      "can i give someone power of attorney over my bank account",
      "bank power of attorney in dubai",
      "poa to operate my uae bank account",
    ],
    keywords: [["bank", "power", "attorney"], ["power", "attorney", "bank", "account"]],
    next: ["not-poa-contents", "not-wrong-wording", "not-poa-limits"],
  },
  {
    id: "not-poa-court",
    question: "Do I need a power of attorney for a court case?",
    answer:
      "Representation before UAE courts is normally done under a power of attorney worded for litigation and given to a lawyer licensed to appear, and a general power will not usually do. The lawyer you instruct will tell you the form they need — get it from them before anything is drafted, because they are the one it has to satisfy.",
    service: SERVICE,
    phrases: [
      "do i need a power of attorney for a court case",
      "litigation power of attorney in dubai",
      "power of attorney to represent me in court",
      "poa for my lawyer in the uae",
    ],
    keywords: [["power", "attorney", "court", "case"], ["litigation", "power", "attorney"]],
    next: ["not-poa-contents", "not-vs-lawyer", "not-enforcement"],
  },
  {
    id: "not-poa-visa",
    question: "Can someone handle my visa or labour paperwork under a power of attorney?",
    answer:
      "Some of it, and which parts differ between authorities — several government processes have their own authorised-representative mechanism rather than accepting a general power of attorney. Name the authority and the transaction and it can be checked properly. Do not assume a power that worked at one department works at the next.",
    service: SERVICE,
    phrases: [
      "can someone handle my visa paperwork under a power of attorney",
      "power of attorney for visa processing in the uae",
      "poa for the labour department dubai",
    ],
    keywords: [["power", "attorney", "visa"], ["power", "attorney", "labour"]],
    next: ["not-poa-limits", "not-poa-contents", "not-do-i-need-one"],
  },
  {
    id: "not-poa-vehicle",
    question: "Can I authorise someone to sell my car?",
    answer:
      "Vehicle transfers are handled by the traffic authority, which has its own procedure and in many cases its own authorisation form rather than a notarised power of attorney. Check with them first; if a notarised document is what they want, it needs to name the vehicle and the act rather than authorise your affairs in general.",
    service: SERVICE,
    phrases: [
      "can i authorise someone to sell my car",
      "power of attorney to sell a vehicle in dubai",
      "poa for a car transfer in the uae",
    ],
    keywords: [["authorise", "sell", "car"], ["power", "attorney", "vehicle"], ["power", "attorney", "car"]],
    next: ["not-poa-contents", "not-poa-limits", "not-do-i-need-one"],
  },
  {
    id: "not-poa-blank",
    question: "Can I sign a power of attorney and fill in the details later?",
    answer:
      "No, and you should not want to. The notary notarises the document in front of them, and anything added afterwards is not covered — a document altered after notarisation is worse than no document, because it looks authorised and is not. If a detail is genuinely unknown, that belongs in the wording as a described class, not as a blank.",
    service: SERVICE,
    phrases: [
      "can i sign a power of attorney and fill in the details later",
      "blank power of attorney dubai",
      "can details be added after notarisation",
    ],
    keywords: [["blank", "power", "attorney"], ["fill", "details", "later"], ["added", "after", "notarisation"]],
    next: ["not-correct-after", "not-poa-contents", "not-checks-content"],
  },

  /* ── Affidavits and declarations ───────────────────────────────────────── */
  {
    id: "not-affidavit",
    question: "What is an affidavit and when do I need one?",
    answer:
      "An affidavit is a statement of fact you make formally, in front of a notary, knowing that making it falsely has consequences. They are asked for when an authority needs something on the record that no certificate covers — that you are unmarried, that a document was lost, that a name in two papers belongs to one person. The wording is everything: an affidavit that does not say what the authority needs said will be refused.",
    service: SERVICE,
    phrases: [
      "what is an affidavit and when do i need one",
      "when do i need an affidavit in dubai",
      "what is a sworn affidavit in the uae",
      "how do i make an affidavit",
    ],
    keywords: [["affidavit", "meaning"], ["need", "an", "affidavit"]],
    next: ["not-affidavit-vs-declaration", "not-affidavit-wording", "not-single-status"],
  },
  {
    id: "not-affidavit-vs-declaration",
    question: "What is the difference between an affidavit and a declaration?",
    answer:
      "In practice both are you stating something on the record in front of a notary, and which word is used depends more on who is asking than on the document. What matters is the substance the receiving authority wants stated and the form they will accept. Ask them for a template or a sample if they have one — many do, and it removes the guesswork entirely.",
    service: SERVICE,
    phrases: [
      "difference between an affidavit and a declaration",
      "is a declaration the same as an affidavit",
      "affidavit or declaration which one do i need",
    ],
    keywords: [["difference", "affidavit", "declaration"], ["affidavit", "or", "declaration"]],
    next: ["not-affidavit", "not-affidavit-wording", "not-undertaking"],
  },
  {
    id: "not-single-status",
    question: "How do I get a single status or unmarried certificate?",
    answer:
      "There are two different things people mean by this. One is a certificate issued by your own country, usually through its consulate here, which is the one most marriage authorities want. The other is a declaration you make in front of a UAE notary stating you are unmarried. Ask the authority that requested it which of the two they mean before arranging either — they are not interchangeable.",
    service: SERVICE,
    phrases: [
      "how do i get a single status certificate in dubai",
      "unmarried certificate uae",
      "certificate of no impediment to marry dubai",
      "declaration that i am not married",
    ],
    keywords: [["single", "status", "certificate"], ["unmarried", "certificate"], ["no", "impediment", "marry"]],
    next: ["not-marriage-documents", "not-embassy", "not-affidavit"],
  },
  {
    id: "not-name-change",
    question: "I need a declaration about my name. How does that work?",
    answer:
      "Name declarations — that two spellings are the same person, or that you are now known by a different name — are a common notarial act, and they are usually wanted because a passport, a certificate and an Emirates ID do not agree. The declaration states the position; it does not change what is printed on anything. Whoever is refusing your paperwork should tell you which spelling they need to end up with.",
    service: SERVICE,
    phrases: [
      "i need a declaration about my name",
      "name change affidavit in dubai",
      "my name is spelled differently on two documents",
      "one and the same person declaration uae",
    ],
    keywords: [["name", "change", "declaration"], ["name", "change", "affidavit"], ["same", "person", "declaration"]],
    next: ["not-name-mismatch", "not-name-spelling", "not-affidavit"],
  },
  {
    id: "not-lost-document",
    question: "Can I make a declaration that a document was lost?",
    answer:
      "Yes — a lost document declaration is one of the more routine notarial acts, and it is normally wanted before a replacement will be issued or before something can proceed without the original. The issuing body may also want a police report, so ask them what the pair of requirements is rather than doing one and discovering the other.",
    service: SERVICE,
    phrases: [
      "can i make a declaration that a document was lost",
      "lost document affidavit dubai",
      "i lost my certificate what declaration do i need",
    ],
    keywords: [["lost", "document", "declaration"], ["lost", "document", "affidavit"]],
    next: ["not-affidavit", "not-affidavit-wording", "not-what-to-bring"],
  },
  {
    id: "not-undertaking",
    question: "What is a notarised undertaking?",
    answer:
      "An undertaking is a promise to do or not do something, put on the record in front of a notary — commonly asked for by employers, landlords, schools and government bodies. Read it properly before signing: unlike a declaration about a fact, an undertaking binds you going forward, and the person asking for it wrote it in their own interest.",
    service: SERVICE,
    phrases: [
      "what is a notarised undertaking",
      "i have been asked for an undertaking letter notarised",
      "undertaking letter dubai notary",
    ],
    keywords: [["notarised", "undertaking"], ["undertaking", "letter"]],
    next: ["not-is-it-binding", "not-vs-lawyer", "not-affidavit-wording"],
  },
  {
    id: "not-income-declaration",
    question: "Can I notarise a declaration about my income or salary?",
    answer:
      "You can declare what you earn, but be careful about what is actually being asked for — many authorities and embassies want a salary certificate from your employer or a bank statement, not your own statement about yourself. A declaration you make about your own income carries less weight than a document issued by someone else, which is usually the point of the request.",
    service: SERVICE,
    phrases: [
      "can i notarise a declaration about my income",
      "salary declaration notarised dubai",
      "income affidavit for a visa application uae",
    ],
    keywords: [["income", "declaration"], ["salary", "declaration", "notarised"]],
    next: ["not-affidavit", "not-do-i-need-one", "not-affidavit-for-abroad"],
  },
  {
    id: "not-noc-declaration",
    question: "Do I need a no-objection letter notarised?",
    answer:
      "Sometimes — a no-objection letter is often accepted as a plain signed letter, and sometimes the receiving body wants it notarised so the signature is beyond dispute. That is their call, not something you can decide from the outside. Ask them explicitly whether a signature is enough, because notarising something that did not need it is money spent for nothing.",
    service: SERVICE,
    phrases: [
      "do i need a no objection letter notarised",
      "noc notarisation in dubai",
      "does my no objection certificate need a notary",
    ],
    keywords: [["no", "objection", "notarised"], ["noc", "notarisation"]],
    next: ["not-do-i-need-one", "not-sponsorship-consent", "not-undertaking"],
  },
  {
    id: "not-affidavit-for-abroad",
    question: "I need an affidavit to use in another country. What changes?",
    answer:
      "The notarisation is the first step rather than the last. A document going abroad normally needs legalising afterwards — the UAE Ministry of Foreign Affairs and then the destination country's embassy here — and the destination may also want it in their language. Find out the full chain before the appointment, because the wording sometimes has to satisfy the foreign authority rather than the UAE one.",
    service: SERVICE,
    phrases: [
      "i need an affidavit to use in another country",
      "affidavit for use abroad from dubai",
      "notarised declaration for a foreign authority",
    ],
    keywords: [["affidavit", "another", "country"], ["affidavit", "use", "abroad"]],
    next: ["not-document-abroad", "not-mofa", "not-apostille"],
  },
  {
    id: "not-affidavit-wording",
    question: "Who writes the wording of my affidavit?",
    answer:
      "You do, or someone drafting on your behalf — the notary will not compose it for you, and they will refuse one that is vague or that states something they cannot witness you stating. The best starting point is the exact words the authority asking for it used in their request. We check the draft against what the notary will accept before an appointment is booked.",
    service: SERVICE,
    phrases: [
      "who writes the wording of my affidavit",
      "does the notary draft my declaration",
      "who prepares an affidavit in dubai",
    ],
    keywords: [["who", "writes", "affidavit"], ["notary", "draft", "declaration"], ["who", "prepares", "affidavit"]],
    next: ["not-wrong-wording", "not-affidavit", "not-checks-content"],
  },

  /* ── Company and corporate ─────────────────────────────────────────────── */
  {
    id: "not-moa",
    question: "Does a memorandum of association need to be notarised?",
    answer:
      "For mainland companies the memorandum is a notarised instrument, which is why company formation involves a notary appointment and why every shareholder's identity and authority has to line up before it. Free zones generally work to their own registry's process instead. Which applies to you depends on where the company is being set up, so settle that first.",
    service: SERVICE,
    phrases: [
      "does a memorandum of association need to be notarised",
      "moa notarisation in dubai",
      "memorandum of association notary appointment",
      "do i notarise my company memorandum",
    ],
    keywords: [["memorandum", "association", "notarised"], ["moa", "notarisation"]],
    next: ["not-company-signatory", "not-freezone-vs-mainland", "not-moa-amendment"],
  },
  {
    id: "not-moa-amendment",
    question: "How do I change my memorandum of association?",
    answer:
      "An amendment — adding a shareholder, changing shares, changing activities or the manager — is normally itself a notarised instrument, signed by whoever the current memorandum says has authority. The licensing authority usually has to approve the change as well, and the order of the two steps matters. Have the sequence confirmed for your licence before anyone signs anything.",
    service: SERVICE,
    phrases: [
      "how do i change my memorandum of association",
      "moa amendment in dubai",
      "add a shareholder to my company documents",
      "amend company memorandum uae",
    ],
    keywords: [["change", "memorandum", "association"], ["moa", "amendment"], ["amend", "memorandum"]],
    next: ["not-share-transfer", "not-company-signatory", "not-partner-exit"],
  },
  {
    id: "not-share-transfer",
    question: "Does a share transfer have to be notarised?",
    answer:
      "For a mainland company, transferring shares generally runs through a notarised instrument along with the licensing authority's own approval, and both the seller and the buyer have to be identifiable and authorised. Free zones typically handle it through their registry instead. Get the order right — a transfer signed before an approval that was never going to come is wasted.",
    service: SERVICE,
    phrases: [
      "does a share transfer have to be notarised",
      "notarise a share transfer in dubai",
      "selling my shares in a uae company",
      "share transfer agreement notary",
    ],
    keywords: [["share", "transfer", "notarised"], ["notarise", "share", "transfer"], ["selling", "shares", "company"]],
    next: ["not-moa-amendment", "not-company-signatory", "not-shareholder-abroad"],
  },
  {
    id: "not-board-resolution",
    question: "Does a board resolution need to be notarised?",
    answer:
      "It depends entirely on who you are giving it to — banks, licensing authorities and courts each have their own view, and plenty of resolutions are accepted on company letterhead with a stamp. Ask the recipient before arranging notarisation. Where it is required, the resolution has to be signed by people the company's own documents show as able to pass it.",
    service: SERVICE,
    phrases: [
      "does a board resolution need to be notarised",
      "notarise a board resolution in dubai",
      "shareholders resolution notarisation uae",
    ],
    keywords: [["board", "resolution", "notarised"], ["shareholders", "resolution", "notarisation"]],
    next: ["not-company-signatory", "not-do-i-need-one", "not-company-poa"],
  },
  {
    id: "not-company-poa",
    question: "How does a company give a power of attorney?",
    answer:
      "The company signs through whoever its constitutional documents authorise — usually the manager or a director named on the licence — and the notary will check that against the trade licence and the memorandum rather than taking it on trust. The powers still have to be spelled out act by act, exactly as for a personal power. A common failure is a manager whose own authority has lapsed with the licence.",
    service: SERVICE,
    phrases: [
      "how does a company give a power of attorney",
      "corporate power of attorney in dubai",
      "company poa signed by the manager uae",
    ],
    keywords: [["company", "power", "attorney"], ["corporate", "power", "attorney"]],
    next: ["not-company-signatory", "not-poa-contents", "not-company-docs-needed"],
  },
  {
    id: "not-company-signatory",
    question: "Who is allowed to sign for a company?",
    answer:
      "Whoever the trade licence and the memorandum say can, and no one else — not the owner by virtue of being the owner, not a manager whose authority is not documented. This is the single most common reason corporate documents are refused at the notary. Check the licence is current and that the person attending is named on it before booking anything.",
    service: SERVICE,
    phrases: [
      "who is allowed to sign for a company",
      "who signs company documents at the notary",
      "can any shareholder sign for the company",
      "authorised signatory for notarisation uae",
    ],
    keywords: [["who", "sign", "for", "company"], ["authorised", "signatory"], ["who", "signs", "company", "documents"]],
    next: ["not-signatory-not-authorised", "not-company-docs-needed", "not-company-poa"],
  },
  {
    id: "not-partner-exit",
    question: "A partner is leaving the company. What has to be notarised?",
    answer:
      "Normally the instrument recording the exit and the change in shareholding, and the remaining partners have to sign in whatever configuration the memorandum requires. The licensing authority's approval usually has to be lined up alongside it. If the departing partner is outside the country, plan for that early — it is the thing that most often stalls the whole exit.",
    service: SERVICE,
    phrases: [
      "a partner is leaving the company what has to be notarised",
      "removing a partner from a uae company",
      "partner exit documents dubai notary",
    ],
    keywords: [["partner", "leaving", "company"], ["removing", "partner", "company"]],
    next: ["not-share-transfer", "not-shareholder-abroad", "not-moa-amendment"],
  },
  {
    id: "not-branch-manager",
    question: "Do I need to notarise the appointment of a manager?",
    answer:
      "Appointing or changing a manager is usually a documented, notarised step for mainland entities because the manager's authority is what every later signature rests on. Free zone and offshore structures handle it through their own registries. Whichever applies, do not let the paperwork lag behind reality — a manager acting before their appointment is recorded creates problems that surface months later.",
    service: SERVICE,
    phrases: [
      "do i need to notarise the appointment of a manager",
      "changing the manager of my company in dubai",
      "manager appointment document notarisation uae",
    ],
    keywords: [["appointment", "manager", "notarise"], ["changing", "manager", "company"]],
    next: ["not-company-signatory", "not-moa-amendment", "not-freezone-vs-mainland"],
  },
  {
    id: "not-freezone-vs-mainland",
    question: "Is notarisation different for a free zone company?",
    answer:
      "Yes. Mainland company instruments typically go through a notary; free zones generally run their own registry process and may not use one at all for the same document. Neither is better — they are different systems, and the answer for your company is the one your licensing authority gives. Ask them before assuming what a mainland company does applies to you.",
    service: SERVICE,
    phrases: [
      "is notarisation different for a free zone company",
      "do free zone companies need a notary",
      "free zone versus mainland notarisation",
    ],
    keywords: [["free", "zone", "notarisation"], ["free", "zone", "need", "notary"]],
    next: ["not-moa", "not-difc-adgm", "not-company-signatory"],
  },
  {
    id: "not-difc-adgm",
    question: "What about DIFC and ADGM companies?",
    answer:
      "DIFC and ADGM are separate jurisdictions with their own laws, registries and courts, and documents inside them generally follow their own rules rather than the onshore notarial route. A document crossing between one of them and onshore UAE is the case to look at carefully, because it has to satisfy both. Ask the registry concerned rather than applying onshore practice to them.",
    service: SERVICE,
    phrases: [
      "what about difc and adgm companies",
      "do difc companies use a notary",
      "adgm document notarisation requirements",
    ],
    keywords: [["difc", "notary"], ["adgm", "notarisation"], ["difc", "adgm", "companies"]],
    next: ["not-freezone-vs-mainland", "not-will-options", "not-vs-registered"],
  },
  {
    id: "not-company-docs-needed",
    question: "What company documents does the notary want to see?",
    answer:
      "Expect the current trade licence, the memorandum and its amendments, and identification for whoever is signing — plus, where the signatory's authority comes from a resolution or a power of attorney, that document too. Everything has to be current: an expired licence stops the appointment. Send us what you have and we will tell you what is missing before you go.",
    service: SERVICE,
    phrases: [
      "what company documents does the notary want to see",
      "documents needed for company notarisation in dubai",
      "what do i bring for a corporate notary appointment",
    ],
    keywords: [["company", "documents", "notary", "wants"], ["documents", "needed", "company", "notarisation"]],
    next: ["not-company-signatory", "not-what-to-bring", "not-expired-id"],
  },
  {
    id: "not-shareholder-abroad",
    question: "One of our shareholders is not in the UAE. What do we do?",
    answer:
      "The usual answer is a power of attorney from that shareholder, notarised where they are and legalised for use here, authorising someone present to sign on their behalf. That chain takes time and depends on their country, so start it before the rest of the transaction is ready rather than after. Some authorities also accept a signature legalised at a UAE mission abroad — worth asking.",
    service: SERVICE,
    phrases: [
      "one of our shareholders is not in the uae",
      "shareholder abroad cannot attend the notary",
      "signing company documents when a partner is overseas",
    ],
    keywords: [["shareholder", "not", "in", "uae"], ["shareholder", "abroad", "notary"], ["partner", "overseas", "signing"]],
    next: ["not-poa-from-abroad", "not-poa-home-country", "not-all-signatories"],
  },
  {
    id: "not-company-name-change",
    question: "Do I need a notary to change my company name?",
    answer:
      "A name change is normally an amendment to the company's constitutional documents, which for a mainland entity usually means a notarised instrument plus the licensing authority's approval of the new name. The approval comes first — there is no point notarising a change to a name that is then refused. Your licensing authority will confirm the order.",
    service: SERVICE,
    phrases: [
      "do i need a notary to change my company name",
      "company name change documents dubai",
      "changing my trade name notarisation",
    ],
    keywords: [["change", "company", "name", "notary"], ["company", "name", "change"]],
    next: ["not-moa-amendment", "not-freezone-vs-mainland", "not-company-signatory"],
  },

  /* ── Property and real estate ──────────────────────────────────────────── */
  {
    id: "not-poa-property-sale",
    question: "Can I authorise someone to sell my property in Dubai?",
    answer:
      "Yes, and this is one of the cases where the wording is checked hardest, because it is the case with the most at stake. A power for a property sale normally has to identify the property and the specific acts — sell, sign before the land department, receive the price, hand over possession — rather than authorising your affairs generally. The Land Department has its own requirements for what it will act on, so confirm those before drafting.",
    service: SERVICE,
    phrases: [
      "can i authorise someone to sell my property in dubai",
      "power of attorney to sell my apartment",
      "property sale power of attorney dubai requirements",
      "poa for selling real estate in the uae",
    ],
    keywords: [["power", "attorney", "sell", "property"], ["sell", "my", "apartment"], ["property", "sale", "attorney"]],
    next: ["not-vs-land-department", "not-poa-contents", "not-property-poa-abroad"],
  },
  {
    id: "not-property-gift",
    question: "How does gifting property to a relative work?",
    answer:
      "A gift transfer is a recognised route between certain relatives and it runs through the Land Department, which sets what relationships qualify and what evidence of the relationship it wants. There is usually a notarial element to the paperwork, but the Land Department's requirements drive the process rather than the notary's. Start with them — the answer to whether your case qualifies is theirs to give.",
    service: SERVICE,
    phrases: [
      "how does gifting property to a relative work",
      "gift transfer of property in dubai",
      "transferring my apartment to my wife",
      "gifting real estate to family uae",
    ],
    keywords: [["gift", "transfer", "property"], ["gifting", "property", "relative"]],
    next: ["not-vs-land-department", "not-property-inheritance", "not-joint-owners"],
  },
  {
    id: "not-vs-land-department",
    question: "Do I go to the notary or the Land Department?",
    answer:
      "Ownership itself changes at the Land Department — that is where a transfer is registered and where the title reflects it. A notary is involved where a signature or an authorisation has to be put beyond dispute, most often a power of attorney used at the Land Department. So for many property matters the answer is both, in that order, and the Land Department's requirements decide what the notarised document has to say.",
    service: SERVICE,
    phrases: [
      "do i go to the notary or the land department",
      "notary or dld for a property transfer",
      "difference between the notary and the land department",
    ],
    keywords: [["notary", "or", "land", "department"], ["notary", "or", "dld"]],
    next: ["not-poa-property-sale", "not-vs-registered", "not-property-gift"],
  },
  {
    id: "not-tenancy-contract",
    question: "Does a tenancy contract need to be notarised?",
    answer:
      "Ordinary residential tenancies are generally registered rather than notarised — registration through the relevant system is what gives the contract its standing. Notarisation tends to come up for longer or more unusual arrangements, or where one side wants the signatures beyond argument. Ask what the authority or the other side actually requires before paying for a step that may add nothing.",
    service: SERVICE,
    phrases: [
      "does a tenancy contract need to be notarised",
      "notarise my rental agreement in dubai",
      "lease agreement notarisation uae",
    ],
    keywords: [["tenancy", "contract", "notarised"], ["rental", "agreement", "notarise"], ["lease", "notarisation"]],
    next: ["not-vs-registered", "not-do-i-need-one", "not-is-it-binding"],
  },
  {
    id: "not-joint-owners",
    question: "The property has more than one owner. Does everyone have to sign?",
    answer:
      "Generally yes — each owner signs for their own share, and one owner cannot dispose of another's without authority to do so. Where a co-owner cannot attend, the answer is a power of attorney from them covering the specific act. Plan for the absent owner first; it is the part that takes longest and the part people leave until last.",
    service: SERVICE,
    phrases: [
      "the property has more than one owner does everyone sign",
      "joint owners at the notary in dubai",
      "co owner cannot attend the property signing",
    ],
    keywords: [["more", "than", "one", "owner"], ["joint", "owners", "notary"], ["co", "owner", "cannot", "attend"]],
    next: ["not-all-signatories", "not-poa-property-sale", "not-property-poa-abroad"],
  },
  {
    id: "not-mortgage-documents",
    question: "Do mortgage documents get notarised?",
    answer:
      "The bank drives this one. Mortgage and release paperwork follows the lender's process and the Land Department's registration requirements, and where a notarised document is needed the bank will normally specify its form. Ask them for their requirement in writing before arranging anything — a notarised document in the wrong form is not a partial credit.",
    service: SERVICE,
    phrases: [
      "do mortgage documents get notarised",
      "mortgage release paperwork dubai notary",
      "does my bank need a notarised property document",
    ],
    keywords: [["mortgage", "documents", "notarised"], ["mortgage", "release", "notary"]],
    next: ["not-poa-bank", "not-vs-land-department", "not-do-i-need-one"],
  },
  {
    id: "not-developer-noc",
    question: "Is a developer's no-objection certificate a notarial matter?",
    answer:
      "No — an NOC comes from the developer and is part of their own process before a transfer can proceed. It is not something a notary issues or replaces. It does often need to be in hand before the Land Department step, so treat it as a prerequisite to plan around rather than something to chase in parallel.",
    service: SERVICE,
    phrases: [
      "is a developer no objection certificate a notarial matter",
      "developer noc for property transfer dubai",
      "do i need a notary for a developer noc",
    ],
    keywords: [["developer", "no", "objection"], ["developer", "noc"]],
    next: ["not-vs-land-department", "not-noc-declaration", "not-do-i-need-one"],
  },
  {
    id: "not-property-inheritance",
    question: "What happens to my Dubai property when I die?",
    answer:
      "It depends on what, if anything, you have put in place, and this is one of the few questions here where getting it wrong is genuinely expensive for the people left behind. There is more than one route for registering a will covering UAE assets, and which applies to you turns on your circumstances. Take advice on it specifically rather than relying on what worked for a colleague.",
    service: SERVICE,
    phrases: [
      "what happens to my dubai property when i die",
      "inheritance of my apartment in the uae",
      "who inherits my dubai property",
    ],
    keywords: [["property", "when", "i", "die"], ["inheritance", "apartment", "uae"], ["who", "inherits", "property"]],
    next: ["not-will-options", "not-no-will", "not-will-assets-covered"],
  },
  {
    id: "not-property-poa-abroad",
    question: "I am abroad and need to authorise a property sale here.",
    answer:
      "The power of attorney is made where you are, then legalised so it is recognised in the UAE, and it has to be worded to satisfy the Land Department rather than only the notary in your country. Get the required wording from this end before you sign anything there — a document drafted abroad to a generic template is the one most often sent back.",
    service: SERVICE,
    phrases: [
      "i am abroad and need to authorise a property sale here",
      "property power of attorney from overseas for dubai",
      "sell my dubai property while i am overseas",
    ],
    keywords: [["abroad", "authorise", "property", "sale"], ["property", "attorney", "overseas"]],
    quote: true,
  },

  /* ── Family, marriage and children ─────────────────────────────────────── */
  {
    id: "not-child-travel",
    question: "Do I need a notarised consent for my child to travel?",
    answer:
      "Often yes, where a child travels without both parents — but the requirement belongs to the airline, the destination country's border authority, or both, and they differ. Get the requirement from them first, because the consent has to say what they want it to say. Where a notarised consent is needed, the absent parent normally has to sign it.",
    service: SERVICE,
    phrases: [
      "do i need a notarised consent for my child to travel",
      "travel consent letter for a child from dubai",
      "my child is flying without me what do i need",
      "parental consent to travel notarised uae",
    ],
    keywords: [["consent", "child", "travel"], ["travel", "consent", "letter"], ["child", "flying", "alone"]],
    next: ["not-guardianship", "not-custody-documents", "not-affidavit-for-abroad"],
  },
  {
    id: "not-guardianship",
    question: "How do guardianship documents work?",
    answer:
      "Guardianship is a legal status rather than something a notary confers, and the notarial part is usually a document recording a consent or an authorisation within an arrangement that already exists. If you are trying to establish guardianship rather than document it, that is a court matter and belongs with a lawyer. Say which of the two you are doing and we will point you at the right one.",
    service: SERVICE,
    phrases: [
      "how do guardianship documents work",
      "guardianship paperwork in dubai",
      "notarised guardianship letter uae",
    ],
    keywords: [["guardianship", "documents"], ["guardianship", "letter"]],
    next: ["not-child-travel", "not-vs-lawyer", "not-custody-documents"],
  },
  {
    id: "not-marriage-documents",
    question: "What gets notarised around a marriage?",
    answer:
      "The marriage itself is conducted and registered by the authority with jurisdiction over it, not by a notary. What a notary typically handles alongside it are the supporting documents — declarations, consents, and agreements between the parties. Which of those you need comes from whichever authority is conducting the marriage, so ask them for their list.",
    service: SERVICE,
    phrases: [
      "what gets notarised around a marriage",
      "documents for getting married in dubai notary",
      "do i need notarised documents to marry in the uae",
    ],
    keywords: [["notarised", "around", "marriage"], ["documents", "married", "dubai"]],
    next: ["not-single-status", "not-prenuptial", "not-embassy"],
  },
  {
    id: "not-prenuptial",
    question: "Can I notarise a prenuptial agreement?",
    answer:
      "Agreements between spouses about property and finances are notarised in practice, but whether a particular agreement will be given effect later is a legal question that depends on its terms, on both parties' circumstances and on which law applies. That makes it exactly the kind of document to have drafted by a lawyer rather than adapted from a template. A notary witnessing it is not the same as a court upholding it.",
    service: SERVICE,
    phrases: [
      "can i notarise a prenuptial agreement",
      "prenup in dubai notarised",
      "marital property agreement uae notary",
      "postnuptial agreement notarisation dubai",
    ],
    keywords: [["prenuptial", "agreement"], ["prenup", "dubai"], ["marital", "property", "agreement"]],
    next: ["not-vs-lawyer", "not-is-it-binding", "not-marriage-documents"],
  },
  {
    id: "not-divorce-documents",
    question: "What documents around a divorce need notarising?",
    answer:
      "A divorce is granted by a court or the competent authority; a notary does not dissolve a marriage. What gets notarised is usually what sits around it — agreed terms, consents, authorisations for someone to act, or declarations required by another country. If proceedings are live or contemplated, take the wording to your lawyer first.",
    service: SERVICE,
    phrases: [
      "what documents around a divorce need notarising",
      "divorce paperwork notarisation dubai",
      "notarised settlement agreement after divorce uae",
    ],
    keywords: [["divorce", "notarising"], ["divorce", "paperwork", "notarisation"]],
    next: ["not-vs-lawyer", "not-custody-documents", "not-affidavit-for-abroad"],
  },
  {
    id: "not-custody-documents",
    question: "Can custody arrangements be notarised?",
    answer:
      "An agreement between parents can be recorded and notarised, and it is often useful evidence of what was agreed. It does not replace a court order, and where the two conflict the court's decision governs. Anything about children is worth taking to a lawyer before signing, because it is the category where an informal document most often turns out not to do what people expected.",
    service: SERVICE,
    phrases: [
      "can custody arrangements be notarised",
      "notarised custody agreement in dubai",
      "agreement between parents about children uae",
    ],
    keywords: [["custody", "arrangements", "notarised"], ["custody", "agreement"]],
    next: ["not-vs-lawyer", "not-guardianship", "not-is-it-binding"],
  },
  {
    id: "not-child-name-change",
    question: "Can I notarise a declaration about my child's name?",
    answer:
      "A declaration about a child's name — spellings that do not match across a passport, a birth certificate and a residence file — is a common notarial act, and normally both parents are expected to be involved. It states the position; it does not alter what is printed on the underlying documents. The body refusing your paperwork should tell you which spelling everything has to end up matching.",
    service: SERVICE,
    phrases: [
      "can i notarise a declaration about my child name",
      "my child name is spelled differently on two documents",
      "child name correction declaration uae",
    ],
    keywords: [["child", "name", "declaration"], ["child", "name", "spelled", "differently"]],
    next: ["not-name-change", "not-name-mismatch", "not-name-spelling"],
  },
  {
    id: "not-paternity",
    question: "What about acknowledgment of parentage?",
    answer:
      "This is a sensitive area governed by law rather than by what the parties would like to record, and the requirements differ considerably depending on the family's circumstances and nationalities. It is not something to arrange from a general description on a website. Take it to a lawyer who can look at your specific situation, and we can introduce you to one.",
    service: SERVICE,
    phrases: [
      "what about acknowledgment of parentage",
      "paternity acknowledgment document uae",
      "notarised declaration of parentage dubai",
    ],
    keywords: [["acknowledgment", "parentage"], ["paternity", "acknowledgment"]],
    next: ["not-vs-lawyer", "not-guardianship", "not-affidavit"],
  },
  {
    id: "not-sponsorship-consent",
    question: "Do I need a notarised consent to sponsor a family member?",
    answer:
      "Sponsorship requirements come from the immigration authority, and much of what they ask for is issued rather than notarised. A notarised consent or no-objection does come up in some family situations — a spouse's consent, or a parent's. Ask the authority handling the application for their list rather than assembling documents in advance.",
    service: SERVICE,
    phrases: [
      "do i need a notarised consent to sponsor a family member",
      "spouse consent letter for sponsorship uae",
      "notarised no objection for family visa dubai",
    ],
    keywords: [["consent", "sponsor", "family"], ["spouse", "consent", "sponsorship"]],
    next: ["not-noc-declaration", "not-do-i-need-one", "not-affidavit"],
  },
  {
    id: "not-family-abroad",
    question: "My family document has to be used in my home country.",
    answer:
      "Then the notarisation is the first step and the legalisation chain is the rest — the UAE Ministry of Foreign Affairs, then your country's embassy here, and sometimes a further step once it arrives. Countries also differ on what they will accept for family matters specifically. Confirm the whole chain with your embassy before the notary appointment, because the wording may have to satisfy them rather than us.",
    service: SERVICE,
    phrases: [
      "my family document has to be used in my home country",
      "notarised family document for use overseas",
      "child travel consent for use in another country",
    ],
    keywords: [["family", "document", "home", "country"], ["family", "document", "overseas"]],
    next: ["not-document-abroad", "not-mofa", "not-embassy"],
  },

  /* ── Wills and inheritance ─────────────────────────────────────────────── */
  {
    id: "not-will-options",
    question: "What are my options for making a will covering UAE assets?",
    answer:
      "There is more than one route, and they sit in different systems — registries attached to particular jurisdictions, and the onshore courts' own process. Which is open to you and which is sensible depends on your nationality, your faith, where the assets sit and who you want to inherit. That combination is why this is the one subject here where we will not give you a general answer: it should be looked at as your case.",
    service: SERVICE,
    phrases: [
      "what are my options for making a will covering uae assets",
      "ways to register a will in dubai",
      "how do i make a will for my uae assets",
    ],
    keywords: [["options", "will", "uae", "assets"], ["ways", "register", "my", "will"]],
    quote: true,
  },
  {
    id: "not-will-vs-registered",
    question: "Is a notarised will the same as a registered will?",
    answer:
      "No, and the difference matters. Notarising records that you signed it; registering places it in a system that will be looked at when it is needed and that governs how it takes effect. A will that is notarised but sits in a drawer may be of limited use to the people who have to rely on it. Ask specifically which registry a provider proposes to use.",
    service: SERVICE,
    phrases: [
      "is a notarised will the same as a registered will",
      "difference between notarising and registering a will",
      "does my will need to be registered in dubai",
    ],
    keywords: [["notarised", "will", "registered", "will"], ["registering", "will", "dubai"]],
    next: ["not-will-options", "not-vs-registered", "not-will-assets-covered"],
  },
  {
    id: "not-no-will",
    question: "What happens if I die without a will in the UAE?",
    answer:
      "Then the applicable succession rules decide, rather than your wishes, and which rules apply is itself a question that turns on your circumstances. Accounts and assets can be frozen while it is worked out, which is the practical hardship people do not expect. If you have assets or dependants here, this is worth a proper conversation with a lawyer rather than a general answer.",
    service: SERVICE,
    phrases: [
      "what happens if i die without a will in the uae",
      "no will dubai what happens to my assets",
      "intestate succession in the uae",
    ],
    keywords: [["die", "intestate"], ["intestate", "assets"], ["intestate", "succession"]],
    next: ["not-will-options", "not-property-inheritance", "not-vs-lawyer"],
  },
  {
    id: "not-will-made-abroad",
    question: "I already have a will from my home country. Is that enough?",
    answer:
      "Sometimes, sometimes not, and it is not safe to assume. A foreign will may need recognising here before it can be acted on, which takes time at exactly the moment your family has none, and it may not cover UAE assets the way you assumed. Have it reviewed against your UAE assets specifically rather than filing it and hoping.",
    service: SERVICE,
    phrases: [
      "i already have a will from my home country is that enough",
      "does my foreign will cover my dubai assets",
      "will made abroad valid in the uae",
    ],
    keywords: [["will", "home", "country", "enough"], ["foreign", "will", "dubai", "assets"], ["will", "abroad", "valid"]],
    next: ["not-will-options", "not-foreign-document", "not-will-assets-covered"],
  },
  {
    id: "not-will-assets-covered",
    question: "Which of my assets does a UAE will cover?",
    answer:
      "That depends on the route used to make it — some registries are limited to particular kinds of assets or to assets in particular places, and a will made through one may say nothing about the rest. The failure people do not see coming is a will that covers the property but not the bank accounts, or the reverse. List every asset before choosing the route, not after.",
    service: SERVICE,
    phrases: [
      "which of my assets does a uae will cover",
      "does my dubai will cover my bank accounts",
      "what assets can i include in a uae will",
    ],
    keywords: [["assets", "uae", "will", "cover"]],
    next: ["not-will-options", "not-property-inheritance", "not-will-guardianship"],
  },
  {
    id: "not-will-guardianship",
    question: "Can I name a guardian for my children in a will?",
    answer:
      "Appointing guardians is one of the main reasons parents here make a will, and some registries are used specifically for that. Whether an appointment will be given effect, and by whom, depends on the route and on the circumstances at the time. It is worth doing properly precisely because of when it would be relied on.",
    service: SERVICE,
    phrases: [
      "can i name a guardian for my children in a will",
      "guardianship in a dubai will",
      "who looks after my children if we both die uae",
    ],
    keywords: [["guardian", "children", "will"], ["guardianship", "dubai", "will"]],
    next: ["not-will-options", "not-guardianship", "not-no-will"],
  },

  /* ── Booking and attending ─────────────────────────────────────────────── */
  {
    id: "not-how-to-book",
    question: "How do I book a notary appointment in Dubai?",
    answer:
      "Appointments are arranged through the notary service you are using — the courts' own channels, or a licensed private notary's office. The part worth spending effort on is not the booking but what you take to it: a document in an accepted bilingual form, current identification for everyone signing, and evidence of authority where someone signs for a company or another person. We check all of that and can have a provider arrange the appointment.",
    service: SERVICE,
    phrases: [
      "how do i book a notary appointment in dubai",
      "booking a notary in the uae",
      "how do i arrange notarisation in dubai",
    ],
    keywords: [["book", "notary", "appointment"], ["booking", "notary"], ["arrange", "notarisation"]],
    next: ["not-what-to-bring", "not-public-vs-private", "not-how-long"],
  },
  {
    id: "not-public-vs-private",
    question: "What is the difference between a public and a private notary?",
    answer:
      "Both are licensed to perform notarial acts; the difference is where they sit and how you access them. Private notary offices exist to make appointments easier to get and more convenient in location and hours. Neither can notarise a document the other would refuse — the requirements are the same, so choose on convenience rather than expecting a different answer.",
    service: SERVICE,
    phrases: [
      "difference between a public and a private notary",
      "private notary versus dubai courts notary",
      "should i use a private notary in dubai",
    ],
    keywords: [["public", "private", "notary"], ["private", "notary", "courts"]],
    next: ["not-how-to-book", "not-who-is-the-notary", "not-what-it-costs"],
  },
  {
    id: "not-online",
    question: "Can I notarise a document online in the UAE?",
    answer:
      "Remote and electronic notarisation exist for certain acts, and what is available through them changes as the services develop. Not everything qualifies, and some documents still require attendance. Check what is currently offered for your specific document rather than assuming the whole process can be done from a laptop — and be careful with anyone who promises it can.",
    service: SERVICE,
    phrases: [
      "can i notarise a document online in the uae",
      "remote notarisation dubai",
      "electronic notary service uae",
      "can i do notarisation over video",
    ],
    keywords: [["notarise", "online"], ["remote", "notarisation"], ["electronic", "notary"]],
    next: ["not-attend-in-person", "not-how-to-book", "not-appointment-abroad-video"],
  },
  {
    id: "not-attend-in-person",
    question: "Do I have to attend the notary in person?",
    answer:
      "For most acts the point is that the notary sees you sign, so yes — you or someone properly authorised to sign for you. Where attendance is genuinely impossible the answer is usually a power of attorney rather than an exception to attendance. Remote options exist for some acts; check whether yours is one before planning around it.",
    service: SERVICE,
    phrases: [
      "do i have to attend the notary in person",
      "can someone go to the notary for me",
      "must i be present for notarisation in dubai",
    ],
    keywords: [["attend", "in", "person"], ["must", "be", "present"], ["personal", "attendance", "notary"]],
    next: ["not-someone-else-attends", "not-online", "not-poa-general"],
  },
  {
    id: "not-all-signatories",
    question: "Does every signatory have to attend?",
    answer:
      "Everyone whose signature is being notarised has to be seen signing it, so yes — unless someone is signing on their behalf under a power of attorney that covers this act. Where several people are involved, the usual failure is discovering on the day that one of them cannot come. Work out well before the appointment which of them will actually be in the room.",
    service: SERVICE,
    phrases: [
      "does every signatory have to attend",
      "do all parties need to be at the notary",
      "can one person sign for everyone at the notary",
    ],
    keywords: [["every", "signatory", "attend"], ["all", "parties", "notary"], ["one", "person", "sign", "everyone"]],
    next: ["not-someone-else-attends", "not-shareholder-abroad", "not-poa-general"],
  },
  {
    id: "not-how-long",
    question: "How long does notarisation take?",
    answer:
      "The appointment itself is short. What determines the overall time is everything before it — getting the wording right, having it translated, and assembling identification and evidence of authority — plus, for anything going abroad, the legalisation afterwards. Because those depend on your document and on other parties' schedules, anyone quoting you a flat turnaround without seeing it is guessing.",
    service: SERVICE,
    phrases: [
      "how long does notarisation take",
      "how long is a notary appointment in dubai",
      "how quickly can i get a document notarised",
    ],
    keywords: [["how", "long", "notarisation", "take"], ["how", "quickly", "notarised"]],
    next: ["not-how-to-book", "not-translate-order", "not-document-abroad"],
  },
  {
    id: "not-walk-in",
    question: "Can I just walk in to the notary without an appointment?",
    answer:
      "Practice differs between notary offices and it changes, so treat a walk-in as a gamble rather than a plan — particularly if anyone has taken time off work to be there. The larger risk is turning up with a document that is not ready, which wastes the trip regardless of whether they could have seen you.",
    service: SERVICE,
    phrases: [
      "can i just walk in to a notary without an appointment",
      "walk in notary service dubai",
      "do i need an appointment for the notary in dubai",
    ],
    keywords: [["walk", "in", "notary"], ["notary", "no", "appointment"]],
    next: ["not-how-to-book", "not-what-to-bring", "not-timings"],
  },
  {
    id: "not-someone-else-attends",
    question: "Can someone attend the notary on my behalf?",
    answer:
      "Only if they hold a power of attorney covering the act, and that power itself has to have been notarised — which is the circularity people run into when they leave it late. A friend with a copy of your passport and your permission by phone is not enough, and no notary will treat it as enough.",
    service: SERVICE,
    phrases: [
      "can someone attend the notary on my behalf",
      "can my friend notarise a document for me",
      "send someone else to the notary in dubai",
    ],
    keywords: [["attend", "on", "my", "behalf"], ["friend", "notarise", "for", "me"], ["send", "another", "person", "notary"]],
    next: ["not-poa-general", "not-attend-in-person", "not-poa-from-abroad"],
  },
  {
    id: "not-timings",
    question: "What are notary working hours?",
    answer:
      "Hours differ between the courts' service and private notary offices, and they change around public holidays and Ramadan. Rather than rely on a figure from a website that may be out of date, confirm directly with the office you are attending when you book — particularly if your document has a deadline attached.",
    service: SERVICE,
    phrases: [
      "what are notary working hours in dubai",
      "when is the notary open",
      "notary timings during ramadan uae",
    ],
    keywords: [["notary", "working", "hours"], ["when", "notary", "open"], ["notary", "timings"]],
    next: ["not-how-to-book", "not-walk-in", "not-how-long"],
  },
  {
    id: "not-appointment-abroad-video",
    question: "Can I join the appointment by video from abroad?",
    answer:
      "Do not plan on it. Where remote notarisation is available it comes with its own conditions, and being outside the country is a different matter from being at home with a camera. For someone abroad the reliable route is almost always a power of attorney made and legalised where they are. Start that early — it is the long pole.",
    service: SERVICE,
    phrases: [
      "can i join the notary appointment by video from abroad",
      "video notarisation from outside the uae",
      "attend a dubai notary remotely from overseas",
    ],
    keywords: [["video", "from", "abroad"], ["notarisation", "outside", "uae"], ["notary", "remotely", "overseas"]],
    next: ["not-poa-from-abroad", "not-online", "not-embassy"],
  },
  {
    id: "not-reschedule",
    question: "What if I have to cancel or move the notary appointment?",
    answer:
      "Tell whoever arranged it as early as you can, because slots and any fees already paid are handled by the office rather than by us. If you are moving it because the document is not ready, say so — that is worth knowing, since it usually means the same problem will still be there next week unless somebody fixes it.",
    service: SERVICE,
    phrases: [
      "what if i have to cancel the notary appointment",
      "reschedule my notary appointment in dubai",
      "i cannot make my notary booking",
    ],
    keywords: [["cancel", "notary", "appointment"], ["reschedule", "notary", "appointment"]],
    next: ["not-how-to-book", "not-refund", "not-why-rejected"],
  },

  /* ── Arabic, translation and wording ───────────────────────────────────── */
  {
    id: "not-bilingual-required",
    question: "Does my document have to be in Arabic?",
    answer:
      "UAE notaries work in Arabic, so instruments are normally presented bilingually — the original language alongside a certified Arabic translation. That is why translation and notarisation get planned together. If you are told an English-only document will be fine, check it rather than take it on trust, because being turned away for this is entirely avoidable.",
    service: SERVICE,
    phrases: [
      "does my document have to be in arabic",
      "does a power of attorney need to be bilingual in dubai",
      "must documents be in arabic for the notary",
      "bilingual document requirement uae notary",
    ],
    keywords: [["document", "in", "arabic"], ["bilingual", "requirement"], ["must", "arabic", "notary"]],
    next: ["not-who-translates", "not-translate-order", "not-english-only"],
  },
  {
    id: "not-who-translates",
    question: "Who is allowed to translate the document?",
    answer:
      "A translator licensed by the UAE Ministry of Justice. A translation done by a fluent friend, by software, or by an unlicensed agency will be refused however accurate it is — the licence is the point, not the quality. This is also the most common reason a translation gets rejected, and it is the one that costs a second appointment.",
    service: SERVICE,
    phrases: [
      "who is allowed to translate the document",
      "does the translator need to be licensed in the uae",
      "can i translate my own document for the notary",
      "ministry of justice translator requirement",
    ],
    keywords: [["who", "allowed", "translate"], ["translator", "licensed"], ["translate", "my", "own", "document"]],
    next: ["not-translation-rejected", "not-translate-order", "not-translation-cost"],
  },
  {
    id: "not-translate-order",
    question: "Do I translate before or after notarising?",
    answer:
      "Generally the Arabic has to exist before the notary sees it, because that is the language the act is performed in. Translating afterwards can mean the translation is of a document the notary never saw, which is not the same thing and may be refused. Where a document is going abroad there may be a further translation at the other end, so confirm the sequence for your whole chain rather than one step of it.",
    service: SERVICE,
    phrases: [
      "do i translate before or after notarising",
      "should translation come first or notarisation",
      "order of translation and notarisation in dubai",
    ],
    keywords: [["translate", "before", "after", "notarising"], ["translation", "first", "notarisation"], ["order", "translation", "notarisation"]],
    next: ["not-bilingual-required", "not-who-translates", "not-document-abroad"],
  },
  {
    id: "not-name-spelling",
    question: "How should my name be spelled in the Arabic version?",
    answer:
      "Exactly as it appears on the identification the notary will see, and consistently across every document in the chain. Arabic transliteration of a name can be done several defensible ways, and the moment two documents disagree somebody downstream will treat them as two people. Fix the spelling once, at the start, and give it to the translator rather than letting them choose.",
    service: SERVICE,
    phrases: [
      "how should my name be spelled in the arabic version",
      "arabic transliteration of my name for documents",
      "my name is spelled differently in the arabic translation",
    ],
    keywords: [["name", "spelled", "arabic"], ["arabic", "transliteration", "name"]],
    next: ["not-name-mismatch", "not-name-change", "not-translation-rejected"],
  },
  {
    id: "not-english-only",
    question: "Can an English-only document be notarised?",
    answer:
      "Do not count on it. The safe assumption is that an Arabic version is needed, and the exceptions are not something to discover on the day of your appointment. If someone has told you English alone is acceptable for your particular document, get that confirmed by the notary office before you travel to it.",
    service: SERVICE,
    phrases: [
      "can an english only document be notarised",
      "notarise a document in english only in dubai",
      "do i really need the arabic version",
    ],
    keywords: [["english", "only", "notarised"], ["english", "only", "document"]],
    next: ["not-bilingual-required", "not-who-translates", "not-why-rejected"],
  },
  {
    id: "not-translation-rejected",
    question: "Why was my translation rejected?",
    answer:
      "Almost always because it was not produced by a translator licensed by the Ministry of Justice, or because a name or a number does not match the identification. Partial translations are another — a certified translation has to cover the whole document including stamps and seals, not just the body text. All three are things worth checking before the document goes anywhere.",
    service: SERVICE,
    phrases: [
      "why was my translation rejected",
      "the notary did not accept my translation",
      "translation refused for notarisation dubai",
    ],
    keywords: [["translation", "rejected"], ["not", "accept", "my", "translation"], ["translation", "refused"]],
    next: ["not-who-translates", "not-name-mismatch", "not-fix-after-rejection"],
  },
  {
    id: "not-translate-after-notarising",
    question: "The document is notarised. Can I get it translated now?",
    answer:
      "You can have a translation made of a notarised document, and that is often needed for a foreign authority. What that does not do is retrospectively satisfy a requirement that the notary see an Arabic version — if the act itself needed one and did not have it, translating afterwards does not fix it. Which situation you are in is worth checking before paying for anything.",
    service: SERVICE,
    phrases: [
      "the document is notarised can i get it translated now",
      "translating a document after it was notarised",
      "translation after notarisation uae",
    ],
    keywords: [["translated", "after", "notarised"], ["translation", "after", "notarisation"]],
    next: ["not-translate-order", "not-document-abroad", "not-correct-after"],
  },
  {
    id: "not-arabic-only",
    question: "Will I be given an Arabic-only document at the end?",
    answer:
      "You should end up with the bilingual instrument that was notarised, not an Arabic page you cannot read on its own. Check before you leave that what you are handed matches what you signed and includes the language you understand. If you are given something you cannot read and are told it is fine, that is the moment to ask, not later.",
    service: SERVICE,
    phrases: [
      "will i be given an arabic only document at the end",
      "what document do i receive after notarisation",
      "i was given an arabic document i cannot read",
    ],
    keywords: [["arabic", "only", "document"], ["what", "receive", "after", "notarisation"]],
    next: ["not-bilingual-required", "not-interpreter", "not-checks-content"],
  },

  /* ── What to bring, who may sign ───────────────────────────────────────── */
  {
    id: "not-what-to-bring",
    question: "What do I need to bring to the notary?",
    answer:
      "Original identification for every person signing, the document itself in the form it will be notarised in, and — where anyone signs for a company or on someone else's behalf — the document that gives them that authority. Everything current, and originals rather than copies. Send us the list of what you have and we will tell you what is missing before you go.",
    service: SERVICE,
    phrases: [
      "what do i need to bring to the notary",
      "what should i take to my notary appointment in dubai",
      "notary appointment checklist uae",
    ],
    keywords: [["bring", "to", "the", "notary"], ["take", "to", "notary", "appointment"]],
    next: ["not-emirates-id", "not-original-or-copy", "not-company-docs-needed"],
  },
  {
    id: "not-emirates-id",
    question: "What identification does a notary require?",
    answer:
      "Current original identification for everyone whose signature is being notarised — for residents that normally means the Emirates ID, and a passport is generally expected alongside it. The details on the identification are what the document is checked against, so a name that reads differently on the ID and on the document is a problem to solve before the appointment rather than at it.",
    service: SERVICE,
    phrases: [
      "what identification does a notary require",
      "do i need my emirates id at the notary",
      "what id do i show the notary in dubai",
    ],
    keywords: [["identification", "notary", "require"], ["emirates", "id", "notary"], ["what", "id", "notary"]],
    next: ["not-no-emirates-id", "not-expired-id", "not-name-mismatch"],
  },
  {
    id: "not-no-emirates-id",
    question: "I do not have an Emirates ID. Can I still notarise?",
    answer:
      "Possibly — visitors and people whose residence is in process do have documents notarised — but what is accepted depends on the act and on your status, so this is one to confirm before travelling to an appointment. Bring your passport and whatever evidence of status you have, and tell whoever books it that you have no Emirates ID rather than letting it come up at the counter.",
    service: SERVICE,
    phrases: [
      "i do not have an emirates id can i still notarise",
      "notarisation without an emirates id",
      "can a visitor notarise a document in dubai",
    ],
    keywords: [["no", "emirates", "id"], ["do", "not", "have", "emirates", "id"]],
    next: ["not-visit-visa", "not-emirates-id", "not-passport-only"],
  },
  {
    id: "not-visit-visa",
    question: "Can I notarise something while on a visit visa?",
    answer:
      "People do, but what is accepted varies by act and by office, so confirm it for your specific document before booking rather than assuming. If you are here on a short trip specifically to sign something, get the document checked and the requirements confirmed before you fly — there is rarely room in the schedule to fix a problem discovered on the day.",
    service: SERVICE,
    phrases: [
      "can i notarise something while on a visit visa",
      "notarisation on a tourist visa in dubai",
      "i am visiting dubai and need a document notarised",
    ],
    keywords: [["visit", "visa", "notarise"], ["tourist", "visa", "notarisation"], ["visiting", "dubai", "notarised"]],
    quote: true,
  },
  {
    id: "not-expired-id",
    question: "My Emirates ID or passport has expired. Does that matter?",
    answer:
      "Yes. Identification has to be current, and an expired document is one of the most common reasons an appointment ends before it starts. The same applies to a company's trade licence where someone is signing on its behalf. Check every expiry date the week before, not the morning of.",
    service: SERVICE,
    phrases: [
      "my emirates id has expired does that matter for the notary",
      "expired passport at the notary appointment",
      "can i notarise with an expired id",
    ],
    keywords: [["expired", "emirates", "id"], ["expired", "passport", "notary"], ["notarise", "expired", "id"]],
    next: ["not-emirates-id", "not-why-rejected", "not-company-docs-needed"],
  },
  {
    id: "not-minors",
    question: "Can a document be notarised for a child?",
    answer:
      "A child does not sign for themselves; whoever has authority to act for them does, and the notary will want to see the basis for that as well as the child's own documents. Where both parents' involvement is expected, arranging that in advance is the difference between one appointment and two.",
    service: SERVICE,
    phrases: [
      "can a document be notarised for a child",
      "does my child need to attend the notary",
      "signing on behalf of a minor in dubai",
    ],
    keywords: [["notarised", "for", "a", "child"], ["child", "attend", "notary"], ["behalf", "of", "minor"]],
    next: ["not-guardianship", "not-child-travel", "not-what-to-bring"],
  },
  {
    id: "not-original-or-copy",
    question: "Does the notary need the original document?",
    answer:
      "For the instrument being signed, yes — the notary acts on the document in front of them, not on a scan. For supporting documents, originals are the safe assumption and copies are sometimes accepted alongside them. Take the originals of everything; it costs nothing and it is the cheapest insurance against a wasted trip.",
    service: SERVICE,
    phrases: [
      "does the notary need the original document",
      "can i bring copies to the notary in dubai",
      "original or photocopy for notarisation",
    ],
    keywords: [["notary", "need", "original"], ["bring", "copies", "notary"], ["original", "or", "photocopy"]],
    next: ["not-true-copy", "not-what-to-bring", "not-photos-scans"],
  },
  {
    id: "not-passport-only",
    question: "Is a passport enough on its own?",
    answer:
      "It depends on your status and on the act, and for a resident the Emirates ID is normally expected as well. Rather than work it out from general principles, say what your status is and what you are signing when the appointment is arranged, and the requirement can be confirmed in advance.",
    service: SERVICE,
    phrases: [
      "is a passport enough on its own for the notary",
      "can i use only my passport at the notary",
      "passport without emirates id notarisation",
    ],
    keywords: [["passport", "enough", "notary"], ["only", "my", "passport"]],
    next: ["not-emirates-id", "not-no-emirates-id", "not-visit-visa"],
  },
  {
    id: "not-photos-scans",
    question: "Can I send scans to the notary instead of attending?",
    answer:
      "Scans are fine for us to review the document and spot problems in advance, and that review is genuinely worth doing. They are not a substitute for producing originals at the appointment. Be wary of anyone who says the whole thing can be done from scans you email over — that is not how a signature gets witnessed.",
    service: SERVICE,
    phrases: [
      "can i send scans instead of attending with documents",
      "email my documents for notarisation dubai",
      "do you need the physical documents",
    ],
    keywords: [["send", "scans"], ["email", "documents", "notarisation"], ["physical", "documents"]],
    next: ["not-original-or-copy", "not-online", "not-attend-in-person"],
  },

  /* ── What it costs ─────────────────────────────────────────────────────── */
  {
    id: "not-what-it-costs",
    question: "How much does notarisation cost?",
    answer:
      "There is a government fee element set by the authority and revised from time to time, a translation cost that depends on the document's length and language, and a provider's fee for preparing and running it. Because those three move independently and depend on your document, a figure quoted before anyone has seen it is a number someone made up. Tell us what you need done and we will get you a real quote broken down by part.",
    service: SERVICE,
    phrases: [
      "how much does notarisation cost",
      "what is the cost of notarising a document in dubai",
      "price for notarising a document in dubai",
      "notary charges in the uae",
    ],
    keywords: [
      ["how", "much", "notarisation"],
      ["cost", "notarising"],
      ["notary", "charges"],
      ["notary", "fee"],
      ["notary", "fees"],
      ["notarisation", "price"],
      ["notarisation", "rates"],
      ["notarisation", "expensive"],
      ["affidavit", "cost"],
    ],
    quote: true,
  },
  {
    id: "not-poa-cost",
    question: "How much does a power of attorney cost?",
    answer:
      "It depends on how many acts it has to cover, whether one person is signing or several, the length of the Arabic translation, and whether it then has to be legalised for use abroad — a one-act power for someone standing in front of the notary is not the same job as a corporate power for a shareholder overseas. Tell us what the holder needs to be able to do and we will come back with the parts priced separately.",
    service: SERVICE,
    phrases: [
      "how much does a power of attorney cost",
      "what does it cost to notarise a power of attorney",
      "price of a power of attorney in dubai",
      "poa cost uae",
    ],
    keywords: [
      ["cost", "power", "attorney"],
      ["power", "attorney", "price"],
      ["power", "attorney", "fees"],
      ["poa", "cost"],
      ["much", "poa"],
    ],
    quote: true,
  },
  {
    id: "not-no-fixed-price",
    question: "Why will nobody give me a fixed price?",
    answer:
      "Because the honest components are not fixed: official fees are set by the authority and revised periodically, translation is priced on the document, and a case needing two signatories and a company check is not the same job as a one-page declaration. A provider quoting a flat figure sight unseen is either padding it or is about to discover the extras. We show government fees separately from anyone's own fee, so you can see which is which.",
    service: SERVICE,
    phrases: [
      "why will nobody give me a fixed price for notarisation",
      "why is notarisation priced per case",
      "why does the cost of notarising vary",
    ],
    keywords: [["fixed", "price", "notarisation"], ["priced", "per", "case"], ["cost", "notarising", "vary"]],
    quote: true,
  },
  {
    id: "not-per-page",
    question: "Is notarisation charged per page or per document?",
    answer:
      "It varies by what is being charged for. Translation is normally driven by length, so pages matter there; the notarial element and a provider's fee are usually driven by the act and the number of signatories rather than the page count. Ask for a quote broken into those parts — that is the version you can actually compare between providers.",
    service: SERVICE,
    phrases: [
      "is notarisation charged per page or per document",
      "does the notary charge by the page",
      "per signatory or per document notary fees",
    ],
    keywords: [["charged", "per", "page"], ["charge", "by", "the", "page"], ["pay", "per", "signatory"]],
    quote: true,
  },
  {
    id: "not-translation-cost",
    question: "Is the translation charged separately?",
    answer:
      "Yes, and it should appear as its own line. Translation is a separate licensed service with its own pricing based on the document's length and language pair, and a quote that folds it invisibly into one number is a quote you cannot check. If a document also has to be legalised afterwards, that is a third cost again.",
    service: SERVICE,
    phrases: [
      "is the translation charged separately from notarisation",
      "does the notary fee include translation",
      "translation cost on top of notarisation dubai",
      "what does a notarised translation cost",
    ],
    keywords: [
      ["translation", "charged", "separately"],
      ["fee", "include", "translation"],
      ["notarised", "translation", "cost"],
    ],
    quote: true,
  },
  {
    id: "not-refund",
    question: "Do I get my money back if the notary rejects the document?",
    answer:
      "Official fees that have been paid to an authority are generally not recoverable because a document was refused, and translation already done has been done. That is precisely why the document should be checked before anything is paid for — the cheapest rejection is the one that happens on our desk rather than at the counter. Ask any provider what their policy is before you engage them.",
    service: SERVICE,
    phrases: [
      "do i get my money back if the document is rejected",
      "refund if the notary refuses my document",
      "who pays if notarisation fails",
    ],
    keywords: [["money", "back", "rejected"], ["refund", "notary", "refuses"]],
    next: ["not-why-rejected", "not-fix-after-rejection", "not-no-fixed-price"],
  },
  {
    id: "not-payment-method",
    question: "How is payment for notarisation handled?",
    answer:
      "Official fees are paid to the authority through its own channels, and a provider bills their own fee separately. Be cautious about paying cash to an individual for the government portion, and ask for the official receipt — that receipt is also how you check the fee you were charged is the fee that was actually paid.",
    service: SERVICE,
    phrases: [
      "how is payment handled for notarisation",
      "how do i pay notary fees in dubai",
      "do i pay the notary or the agent",
    ],
    keywords: [["payment", "handled", "notarisation"], ["pay", "notary", "fees"]],
    next: ["not-no-fixed-price", "not-cheaper-options", "not-refund"],
  },
  {
    id: "not-cheaper-options",
    question: "Is there a cheaper way to get a document notarised?",
    answer:
      "Sometimes, and it is usually not a discount — it is discovering the step is not needed, or that one document can cover what you were about to do three times, or that the authority accepts something simpler. That is worth ten minutes before you spend anything. Tell us what you are trying to achieve rather than what you have been told to buy.",
    service: SERVICE,
    phrases: [
      "is there a cheaper way to notarise",
      "how do i reduce the cost of notarisation",
      "cheapest way to get a document notarised in dubai",
    ],
    keywords: [["cheaper", "way", "notarise"], ["reduce", "cost", "notarisation"], ["cheapest", "way", "notarised"]],
    quote: true,
  },

  /* ── Rejections and corrections ────────────────────────────────────────── */
  {
    id: "not-why-rejected",
    question: "Why was my document rejected by the notary?",
    answer:
      "In roughly the order they happen: the wording did not spell out the act, the Arabic version was missing or not done by a licensed translator, an identification or a trade licence had expired, the person signing did not have documented authority, or a name did not match across documents. All five are form rather than substance, which is why most refusals are fixable — usually within days.",
    service: SERVICE,
    phrases: [
      "why was my document rejected by the notary",
      "common reasons for notary rejection in dubai",
      "the notary refused my document why",
    ],
    keywords: [["why", "document", "rejected"], ["reasons", "notary", "rejection"]],
    next: ["not-wrong-wording", "not-signatory-not-authorised", "not-fix-after-rejection"],
  },
  {
    id: "not-wrong-wording",
    question: "The notary said the wording is wrong. What does that mean?",
    answer:
      "Usually that the document describes an intention rather than authorising an act — \"deal with my property\" instead of \"sell the apartment at this address and sign the transfer before the Land Department\". Notaries and receiving authorities read these narrowly on purpose, so vagueness is not generous, it is fatal. The fix is redrafting to name the acts, and it is worth doing once, properly.",
    service: SERVICE,
    phrases: [
      "the notary said the wording is wrong",
      "my power of attorney wording was not accepted",
      "how do i fix the wording of my document for the notary",
    ],
    keywords: [["wording", "is", "wrong"], ["wording", "not", "accepted"], ["fix", "the", "wording"]],
    next: ["not-poa-contents", "not-fix-after-rejection", "not-affidavit-wording"],
  },
  {
    id: "not-signatory-not-authorised",
    question: "They said the person signing is not authorised.",
    answer:
      "That means the trade licence, the memorandum or the power of attorney does not show that person as able to sign this. It is not a formality — the whole value of the notarisation is that the right person signed. The fix is either the correct signatory attending, or a properly notarised authority for the one who did, which itself takes time if they are abroad.",
    service: SERVICE,
    phrases: [
      "they said the person signing is not authorised",
      "signatory not authorised at the notary",
      "the notary would not accept our manager signature",
    ],
    keywords: [["person", "signing", "not", "authorised"], ["signatory", "not", "authorised"]],
    next: ["not-company-signatory", "not-company-poa", "not-company-docs-needed"],
  },
  {
    id: "not-name-mismatch",
    question: "My name does not match across the documents I am notarising.",
    answer:
      "This is one of the most common blockers and it is worth fixing at the source rather than working around it each time. Sometimes a notarised declaration that both spellings are the same person is what is wanted; sometimes the underlying document has to be corrected by whoever issued it. Whoever is refusing your paperwork should tell you which of the two they will accept.",
    service: SERVICE,
    phrases: [
      "my name does not match across my documents",
      "name mismatch between passport and emirates id",
      "different spelling on my certificate and passport",
    ],
    keywords: [["name", "does", "not", "match"], ["name", "mismatch"], ["different", "spelling", "passport"]],
    next: ["not-name-change", "not-name-spelling", "not-fix-after-rejection"],
  },
  {
    id: "not-fix-after-rejection",
    question: "What do I do after a notary rejection?",
    answer:
      "Get the reason in specific terms before doing anything else — \"not accepted\" is not a reason, and fixing the wrong thing costs another appointment. Then correct that one thing and go back. Send us what you were told and the document, and we will tell you whether it is a redraft, a translation, an identification problem or an authority problem.",
    service: SERVICE,
    phrases: [
      "what do i do after a notary rejection",
      "my document was refused what now",
      "how do i fix a rejected notarisation",
    ],
    keywords: [["after", "a", "rejection"], ["refused", "what", "now"], ["fix", "rejected", "notarisation"]],
    quote: true,
  },
  {
    id: "not-correct-after",
    question: "Can a notarised document be corrected?",
    answer:
      "Not by editing it. A notarised instrument that is wrong is replaced or formally amended by a further notarised act — crossing something out, adding a line or reprinting a page destroys the value of the notarisation and can make the document worse than useless. If you have spotted an error, stop using the document and get it done again properly.",
    service: SERVICE,
    phrases: [
      "can a notarised document be corrected",
      "there is a mistake in my notarised document",
      "how do i amend a notarised power of attorney",
    ],
    keywords: [["notarised", "document", "corrected"], ["mistake", "notarised", "document"], ["amend", "notarised"]],
    next: ["not-cancel-notarised", "not-poa-blank", "not-fix-after-rejection"],
  },
  {
    id: "not-cancel-notarised",
    question: "Can I cancel a document after it has been notarised?",
    answer:
      "A power of attorney is revoked by a further notarised act. An agreement between parties is a different matter — you generally cannot withdraw from it unilaterally just because you have changed your mind, and what you can do depends on its terms. That distinction is worth understanding before signing, not after.",
    service: SERVICE,
    phrases: [
      "can i cancel a document after it has been notarised",
      "undo a notarised agreement in dubai",
      "i regret signing a notarised document",
    ],
    keywords: [["cancel", "after", "notarised"], ["undo", "notarised", "agreement"]],
    next: ["not-poa-revoke", "not-is-it-binding", "not-vs-lawyer"],
  },
  {
    id: "not-missing-translation",
    question: "They turned me away for not having an Arabic version.",
    answer:
      "That is the most avoidable refusal there is, and the fix is a certified translation by a translator licensed by the Ministry of Justice before you go back. Use the time to have the wording checked as well — a document sent back once for translation quite often has a second problem waiting behind it.",
    service: SERVICE,
    phrases: [
      "they turned me away for not having an arabic version",
      "rejected because there was no arabic translation",
      "notary refused because the document was only in english",
    ],
    keywords: [["no", "arabic", "version"], ["no", "arabic", "translation"], ["only", "in", "english", "refused"]],
    next: ["not-who-translates", "not-bilingual-required", "not-fix-after-rejection"],
  },
  {
    id: "not-document-from-abroad-rejected",
    question: "My document from abroad was not accepted here.",
    answer:
      "Usually because the legalisation chain is incomplete — a document issued or notarised in another country generally needs that country's authorities and the UAE mission there, then the UAE Ministry of Foreign Affairs, before it is usable here. An apostille alone does not do it, because the UAE is not a party to the Apostille Convention. Tell us which country it came from and what stamps it has and we can tell you what is missing.",
    service: SERVICE,
    phrases: [
      "my document from abroad was not accepted here",
      "foreign document rejected in the uae",
      "my apostilled document was refused in dubai",
    ],
    keywords: [["document", "from", "abroad", "not", "accepted"], ["foreign", "document", "rejected"]],
    next: ["not-foreign-document", "not-apostille", "not-mofa"],
  },
  {
    id: "not-notary-refused-poa",
    question: "The notary refused to notarise my power of attorney entirely.",
    answer:
      "A refusal of the whole instrument rather than a request to fix it usually means the act itself is a problem — something that cannot be delegated, a purpose the notary will not facilitate, or an authority that is not there. That is not a wording tweak. Get the reason stated plainly and take it to a lawyer before trying again elsewhere, because the next notary will reach the same conclusion.",
    service: SERVICE,
    phrases: [
      "the notary refused to notarise my power of attorney entirely",
      "notary will not do my poa at all",
      "refused outright by the notary in dubai",
    ],
    keywords: [["refused", "to", "notarise", "entirely"], ["notary", "refused", "poa", "outright"]],
    next: ["not-poa-limits", "not-vs-lawyer", "not-why-rejected"],
  },

  /* ── Across borders ────────────────────────────────────────────────────── */
  {
    id: "not-document-abroad",
    question: "Will my UAE notarised document work in another country?",
    answer:
      "Not on the notary's stamp alone. A document leaving the UAE normally has to be legalised — the UAE Ministry of Foreign Affairs, then the destination country's embassy or consulate here — and the destination may want it translated into their language on arrival. Start from what the receiving authority abroad requires and work backwards, because they are the only ones who can tell you when the chain is complete.",
    service: SERVICE,
    phrases: [
      "will my uae notarised document work in another country",
      "using a dubai notarised document overseas",
      "what do i do after notarising for use abroad",
    ],
    keywords: [["notarised", "document", "another", "country"], ["notarised", "document", "overseas"]],
    next: ["not-mofa", "not-embassy", "not-apostille"],
  },
  {
    id: "not-mofa",
    question: "Do I need MOFA attestation after notarising?",
    answer:
      "If the document is going abroad, almost always — the UAE Ministry of Foreign Affairs step is what lets a foreign authority treat a UAE document as genuine, and the destination's embassy here usually follows it. If the document is only for use inside the UAE, it is generally not needed. So the answer turns entirely on where the document ends up, which is worth settling before you pay for anything.",
    service: SERVICE,
    phrases: [
      "do i need mofa attestation after notarising",
      "ministry of foreign affairs stamp after the notary",
      "is mofa needed for my notarised document",
    ],
    keywords: [["mofa", "after", "notarising"], ["ministry", "foreign", "affairs", "stamp"], ["mofa", "notarised"]],
    next: ["not-embassy", "not-document-abroad", "not-then-attestation"],
  },
  {
    id: "not-then-attestation",
    question: "Does a notarised document then need attesting?",
    answer:
      "For use inside the UAE, normally no — the notarisation is the step. For use abroad, yes in effect: it goes on through the UAE Ministry of Foreign Affairs and then the destination country's mission here, which is the chain people mean when they say the notarised document \"also needs attesting\". Decide the destination first; everything else follows from it.",
    service: SERVICE,
    phrases: [
      "does a notarised document then need attesting",
      "do i attest after notarisation",
      "notarisation and then attestation order uae",
    ],
    keywords: [["notarised", "then", "attesting"], ["attest", "after", "notarisation"]],
    next: ["not-mofa", "not-vs-attestation", "not-document-abroad"],
  },
  {
    id: "not-foreign-document",
    question: "How do I use a document from another country here?",
    answer:
      "It has to be legalised for the UAE before it means anything here: broadly, the issuing country's own authorities, then the UAE mission in that country, then the UAE Ministry of Foreign Affairs once it arrives — plus a certified Arabic translation. The exact steps differ by country. Tell us which country it is from and what stamps it already carries, and we can map what is left.",
    service: SERVICE,
    phrases: [
      "how do i use a document from another country here",
      "bring a foreign document to the uae",
      "legalise my overseas document for dubai",
    ],
    keywords: [["document", "from", "another", "country"], ["foreign", "document", "to", "the", "uae"], ["legalise", "overseas", "document"]],
    next: ["not-apostille", "not-poa-home-country", "not-document-from-abroad-rejected"],
  },
  {
    id: "not-poa-home-country",
    question: "Can I sign a power of attorney in my home country for use in Dubai?",
    answer:
      "Yes, and it is the normal route for someone who cannot travel. It is notarised there, then legalised through that country's authorities and the UAE mission there, and confirmed at the UAE Ministry of Foreign Affairs on arrival, with a certified Arabic translation. Get the required wording from this end first — a document drafted abroad to a local template is the one most often sent back.",
    service: SERVICE,
    phrases: [
      "can i sign a power of attorney in my home country for use in dubai",
      "power of attorney made overseas for the uae",
      "poa from my country to be used in dubai",
    ],
    keywords: [["power", "attorney", "home", "country"], ["power", "attorney", "made", "overseas"]],
    next: ["not-foreign-document", "not-embassy", "not-poa-contents"],
  },
  {
    id: "not-apostille",
    question: "Can I get an apostille on a UAE document?",
    answer:
      "No. The UAE is not a party to the Hague Apostille Convention, so no apostille is issued on a UAE public document and none is available here — a UAE document going abroad takes the legalisation route instead. The same fact catches people coming the other way: an apostille obtained in a member country such as India or the Philippines is not by itself enough to use that document in the UAE, which still needs the full legalisation chain. If an agent abroad has told you the apostille completes it, it does not.",
    service: SERVICE,
    phrases: [
      "can i get an apostille on a uae document",
      "does the uae accept apostille",
      "is the uae part of the hague apostille convention",
      "apostille for a dubai document",
    ],
    keywords: [["apostille", "uae"], ["hague", "apostille"], ["apostille", "dubai", "document"]],
    next: ["not-document-abroad", "not-foreign-document", "not-mofa"],
  },
  {
    id: "not-embassy",
    question: "Can my embassy notarise the document instead?",
    answer:
      "Many consulates in the UAE perform notarial acts for their own nationals, and for a document destined for that country it is sometimes the cleaner route. What it does not do is make the document automatically usable before UAE authorities, which may still want it legalised. Ask your consulate what they offer and ask the receiving authority what they accept — then pick the route that satisfies both.",
    service: SERVICE,
    phrases: [
      "can my embassy notarise the document instead",
      "consulate notarisation in dubai",
      "notarise at my country embassy in the uae",
    ],
    keywords: [["embassy", "notarise"], ["consulate", "notarisation"]],
    next: ["not-poa-home-country", "not-document-abroad", "not-foreign-document"],
  },
  {
    id: "not-india-poa",
    question: "I need a power of attorney between India and the UAE.",
    answer:
      "Both directions are common and both are chains rather than single steps, with the Indian authorities, the relevant mission and the UAE Ministry of Foreign Affairs each involved depending on which way it travels. India is a party to the Apostille Convention and the UAE is not, which is exactly why an apostille alone does not finish the job for use here. Tell us which direction and which state issued anything involved, and we will map it.",
    service: SERVICE,
    phrases: [
      "i need a power of attorney between india and the uae",
      "indian power of attorney for use in dubai",
      "poa from india to uae procedure",
    ],
    keywords: [["power", "attorney", "india"], ["indian", "power", "attorney"]],
    next: ["not-apostille", "not-foreign-document", "not-poa-home-country"],
  },
  {
    id: "not-philippines-poa",
    question: "I need a power of attorney for the Philippines.",
    answer:
      "The usual routes are a consular act at the Philippine consulate here, or a UAE notarisation followed by legalisation for use there — and which one the receiving office in the Philippines will accept is their call, not ours. Ask them first, because the two routes are not interchangeable and doing the wrong one means starting again.",
    service: SERVICE,
    phrases: [
      "i need a power of attorney for the philippines",
      "spa for the philippines from dubai",
      "philippine consulate power of attorney uae",
    ],
    keywords: [["power", "attorney", "philippines"], ["philippine", "consulate", "attorney"]],
    next: ["not-embassy", "not-document-abroad", "not-poa-contents"],
  },
  {
    id: "not-uk-us-poa",
    question: "I need a power of attorney for the UK, the US or Europe.",
    answer:
      "Those countries are parties to the Apostille Convention and the UAE is not, so a document going from here to there takes the UAE legalisation route — the Ministry of Foreign Affairs and then that country's embassy here — rather than an apostille. Coming the other way, their apostille is not sufficient on its own for UAE use. Say which country and which direction and we will set out the chain.",
    service: SERVICE,
    phrases: [
      "i need a power of attorney for the uk",
      "power of attorney for the united states from dubai",
      "european power of attorney from the uae",
    ],
    keywords: [["power", "attorney", "uk"], ["power", "attorney", "united", "states"]],
    next: ["not-apostille", "not-document-abroad", "not-embassy"],
  },

  /* ── What it does and does not do ──────────────────────────────────────── */
  {
    id: "not-is-it-binding",
    question: "Is a notarised document legally binding?",
    answer:
      "Notarisation makes it very hard to deny that you signed it. Whether the obligations inside it bind you is a separate question that depends on the terms, on the law that applies, and on whether what it says is enforceable at all — a notary's stamp does not rescue an agreement that is unenforceable. If you are relying on it for something significant, have a lawyer look at the terms rather than the stamp.",
    service: SERVICE,
    phrases: [
      "is a notarised document legally binding",
      "does notarisation make a contract enforceable",
      "how binding is a notarised agreement in the uae",
    ],
    keywords: [["notarised", "legally", "binding"], ["notarisation", "contract", "enforceable"]],
    next: ["not-checks-content", "not-enforcement", "not-vs-lawyer"],
  },
  {
    id: "not-checks-content",
    question: "Does the notary check whether what my document says is true?",
    answer:
      "No. The notary is concerned with identity, willingness and authority — who signed, that they meant to, and that they were entitled to. They will refuse something unlawful or incomprehensible, but they do not investigate whether your facts are correct or whether the deal is fair to you. Notarisation is not a quality check on the contents, and treating it as one is the most common misunderstanding about it.",
    service: SERVICE,
    phrases: [
      "does the notary check whether my document is true",
      "does notarisation verify the contents",
      "does the notary read my agreement",
    ],
    keywords: [["notary", "check", "true"], ["notarisation", "verify", "contents"], ["notary", "read", "my", "agreement"]],
    next: ["not-is-it-binding", "not-vs-lawyer", "not-what-is"],
  },
  {
    id: "not-enforcement",
    question: "Can I enforce a notarised agreement directly?",
    answer:
      "Certain notarised instruments carry a stronger enforcement route than an ordinary contract, which is part of why people notarise. Whether yours is one of them depends on its type and its terms, and it is not something to assume from the fact that a notary stamped it. If enforcement is the reason you are notarising, get the instrument designed for that with a lawyer, before signing rather than after.",
    service: SERVICE,
    phrases: [
      "can i enforce a notarised agreement directly",
      "enforcement of a notarised document in dubai",
      "does notarisation help me recover money",
    ],
    keywords: [["enforce", "notarised", "agreement"], ["enforcement", "notarised", "document"]],
    next: ["not-executory-deed", "not-debt-acknowledgment", "not-vs-lawyer"],
  },
  {
    id: "not-executory-deed",
    question: "What is an executory deed?",
    answer:
      "It is the name for a notarised instrument that can be taken to enforcement without first obtaining a judgment on the underlying claim — which is why it is worth knowing the category exists. What qualifies, and what such an instrument has to contain, is a legal question rather than a drafting preference. If this is what you want, say so at the drafting stage; it cannot usually be added afterwards.",
    service: SERVICE,
    phrases: [
      "what is an executory deed",
      "executory instrument uae notary",
      "notarised document that can be enforced directly",
    ],
    keywords: [["executory", "deed"], ["executory", "instrument"]],
    next: ["not-enforcement", "not-debt-acknowledgment", "not-vs-lawyer"],
  },
  {
    id: "not-debt-acknowledgment",
    question: "Someone owes me money. Should I notarise an acknowledgment?",
    answer:
      "A notarised acknowledgment of debt is a real and commonly used instrument, and it is far stronger evidence than a message thread. Whether it gives you a direct enforcement route depends on how it is drawn, so this is one to have drafted rather than copied. Get it signed while the other side is still cooperative — nobody signs one after the relationship has broken down.",
    service: SERVICE,
    phrases: [
      "someone owes me money should i notarise an acknowledgment",
      "notarised acknowledgment of debt in dubai",
      "iou notarisation uae",
    ],
    keywords: [["acknowledgment", "of", "debt"], ["owes", "me", "money", "notarise"]],
    next: ["not-executory-deed", "not-enforcement", "not-vs-lawyer"],
  },
  {
    id: "not-vs-registered",
    question: "What is the difference between notarised and registered?",
    answer:
      "Notarising is about the signing event; registering places the document in a system that others consult and that governs its effect — a land register, a company register, a wills registry. They answer different questions, and some documents need both. Asking \"is it registered, and where?\" is often the more useful question of the two.",
    service: SERVICE,
    phrases: [
      "what is the difference between notarised and registered",
      "is registering a document the same as notarising it",
      "notarised versus registered document uae",
    ],
    keywords: [["difference", "notarised", "registered"], ["registering", "same", "notarising"]],
    next: ["not-vs-land-department", "not-will-vs-registered", "not-is-it-binding"],
  },
  {
    id: "not-witnesses",
    question: "Do I need witnesses as well as the notary?",
    answer:
      "For most notarial acts the notary is the witness, which is the point of the exercise. Some documents — and some receiving authorities, particularly abroad — separately require named witnesses, and where they do, those witnesses normally have to be present with their own identification. Check before the appointment, because finding two witnesses on the day is not realistic.",
    service: SERVICE,
    phrases: [
      "do i need witnesses as well as the notary",
      "does my document need witnesses in dubai",
      "witness requirements for notarisation uae",
    ],
    keywords: [["need", "witnesses", "notary"], ["witness", "requirements", "notarisation"]],
    next: ["not-all-signatories", "not-what-to-bring", "not-document-abroad"],
  },
  {
    id: "not-court-evidence",
    question: "Will a notarised document be accepted as evidence in court?",
    answer:
      "A notarised document is strong evidence that the signature is genuine, which removes one of the things most often argued about. It does not settle what the document means, whether it is enforceable, or who is right — those remain for the court. So notarising improves your position on one question rather than winning the case.",
    service: SERVICE,
    phrases: [
      "will a notarised document be accepted as evidence in court",
      "notarised document as proof in a uae court",
      "does notarisation help in a legal dispute",
    ],
    keywords: [["notarised", "evidence", "court"], ["notarised", "proof", "court"]],
    next: ["not-is-it-binding", "not-enforcement", "not-vs-lawyer"],
  },
  {
    id: "not-notary-liability",
    question: "What is the notary responsible for if something goes wrong?",
    answer:
      "The notary is answerable for the act they performed — identity, capacity, authority, and the formalities — not for the bargain you struck or for whether the other side performs. If your complaint is that the deal was bad or that someone has not done what they promised, that is a dispute with them and a matter for a lawyer, not a complaint about the notarisation.",
    service: SERVICE,
    phrases: [
      "what is the notary responsible for if something goes wrong",
      "can i complain about a notary in dubai",
      "notary liability in the uae",
    ],
    keywords: [["notary", "responsible", "goes", "wrong"], ["complain", "about", "a", "notary"], ["notary", "liability"]],
    next: ["not-checks-content", "not-vs-lawyer", "not-enforcement"],
  },
];
