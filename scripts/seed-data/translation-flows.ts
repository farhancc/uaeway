/**
 * Every translation and interpretation question we are prepared to answer.
 *
 * Seed content in the same shape as ./notarisation.ts, and written for the same
 * reason: an answer is sentences, and the nodes, edges and intents are
 * `buildAuthoredFlow`'s problem. After the first seed this content is edited at
 * /admin/flow, not here — but the file stays as the reviewable source of what
 * was published.
 *
 * WHY THIS PACK EXISTS SEPARATELY
 *
 * Translation is where the other four packs meet. Attestation, notarisation,
 * visas and company setup all stall on the same handful of translation
 * questions — who is allowed to translate, in what order, and why the last one
 * was refused — and answering them inside each of those packs would mean four
 * copies drifting apart. They live here once, wired to `legal-translation`, and
 * the neighbouring packs keep only the one-line "it is a separate step" answer
 * that their own conversation needs.
 *
 * WHERE THE BORDER WITH ./notarisation.ts RUNS
 *
 * That pack owns the notary's *own* translation questions: must my document be
 * bilingual, do I translate before or after notarising, why did the notary
 * refuse my translation. This pack owns translation as a service in its own
 * right — the licence behind it, the document types, the attestation chain a
 * translation travels through, and interpretation, which the notary pack touches
 * only for its own appointment. Duplicating a phrasing across the two is not a
 * harmless overlap: `matchByPhrase` takes the first candidate whose phrase
 * appears in the message, so the loser becomes unreachable with nothing failing.
 *
 * WHY IT IS SHAPED IN CLUSTERS
 *
 * Two hundred and fifty answers hanging off one start node match badly:
 * `matchByEmbedding` needs the winner to beat the runner-up by
 * `SIMILARITY_MARGIN`, and every certified-translation question looks like every
 * other one. So there are hubs, one per subject, each offering its cluster as
 * buttons — a tap arrives at an exact node with no matching at all, and a typed
 * question is matched against that hub's local intents. Every answer is also
 * wired from `start`, because someone who types "why did MoFA reject my
 * translation" on the home page should get that answer rather than a menu.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind written answers harder than
 * generated ones, because these publish under the company's name with no model
 * in the loop to hedge them:
 *
 *   - No fee, per-page rate, hourly rate, turnaround or validity period stated
 *     as fact. Say what it depends on and who confirms it.
 *   - Nothing implying we translate or interpret. Legal translation in the UAE
 *     is done by translators licensed by the Ministry of Justice; we work out
 *     what a case needs and introduce people to one. Saying otherwise is the
 *     one claim that would be both false and a licensing problem.
 *   - No promised outcome. A court, a ministry or an embassy can refuse.
 *
 * The first is enforced mechanically in tests/translation-flows.test.ts by the
 * same `findUnsupportedAmounts` the chatbot's own replies go through.
 *
 * A money question therefore gets no number. It gets an honest sentence and
 * `quote: true`, which walks it into the translation qualification and ends at
 * the callback form — because "how much per page" cannot be answered without
 * seeing the page, and a made-up number is worse than a phone call. That flag
 * is on the questions nobody can answer in the abstract, not on every question:
 * a conversation that reaches for the contact form after each answer is a
 * conversation people close.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every id here starts with `tr-`. The other packs hold `att-`, `not-`, `biz-`,
 *  `visa-` and `hs-`; all six are concatenated before the graph is built, so a
 *  collision is a silently overwritten answer rather than an error. */
const SERVICE = "legal-translation";

export const TRANSLATION_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "tr-hub-basics",
    question: "I need something translated for the UAE",
    answer:
      "Most of the difficulty here is naming the thing you actually need. Certified, legal, sworn, notarised and MoFAIC-attested translation are five different steps, and people are routinely sold one when the authority asked for another. Where would you like to start?",
    service: SERVICE,
    phrases: [
      "i need something translated for the uae",
      "help me get a document translated in dubai",
      "i need a translation for a uae authority",
      "where do i start with translating my documents",
      "explain translation requirements in the uae",
    ],
    keywords: [["translated", "for", "the", "uae"], ["start", "translating", "documents"]],
    opener: true,
    faq: false,
    choices: [
      { label: "What is legal translation?", to: "tr-what-is-legal-translation" },
      { label: "Certified, sworn or legal?", to: "tr-difference-certified-sworn" },
      { label: "Do I even need one?", to: "tr-do-i-need-translation" },
      { label: "Who is allowed to do it?", to: "tr-who-may-translate" },
      { label: "Which document is it?", to: "tr-hub-documents" },
    ],
    next: ["tr-what-is-legal-translation", "tr-do-i-need-translation", "tr-who-may-translate"],
  },
  {
    id: "tr-hub-types",
    question: "Certified, sworn, legal and notarised translation",
    answer:
      "These five words get used as if they were one. They are not, and asking the authority which of them they meant is usually cheaper than guessing. Which pair is confusing you?",
    service: SERVICE,
    phrases: [
      "certified sworn and legal translation explained",
      "the different kinds of translation in the uae",
      "types of official translation in dubai",
      "which kind of translation do i need",
    ],
    keywords: [["kinds", "translation", "uae"], ["types", "official", "translation"]],
    faq: false,
    choices: [
      { label: "Certified vs sworn", to: "tr-difference-certified-sworn" },
      { label: "Certified vs notarised", to: "tr-difference-certified-notarised" },
      { label: "Legal vs ordinary", to: "tr-certified-vs-ordinary" },
      { label: "What MoFAIC adds", to: "tr-mofa-attested-translation" },
      { label: "What technical means", to: "tr-what-is-technical-translation" },
    ],
    next: ["tr-difference-certified-sworn", "tr-difference-certified-notarised", "tr-certified-vs-ordinary"],
  },
  {
    id: "tr-hub-mofa",
    question: "MoFAIC attestation and the legalisation chain",
    answer:
      "A translation on its own proves nothing about where the original came from. MoFAIC attestation and embassy legalisation are the steps that do, and the order they happen in is what most chains get wrong. Which part are you working out?",
    service: SERVICE,
    phrases: [
      "mofaic attestation and legalisation of a translation",
      "how does the legalisation chain work for translations",
      "ministry of foreign affairs stamp on a translation",
      "getting my translation attested in the uae",
    ],
    keywords: [["legalisation", "chain", "translation"], ["foreign", "affairs", "stamp", "translation"]],
    faq: false,
    choices: [
      { label: "What MoFAIC actually does", to: "tr-mofa-what-it-does" },
      { label: "Translate first or attest first?", to: "tr-translate-before-or-after-attestation" },
      { label: "Is an apostille enough?", to: "tr-apostille-and-translation" },
      { label: "Translated abroad or here?", to: "tr-translate-abroad-or-here" },
      { label: "MoFAIC refused it", to: "tr-mofa-rejected-translation" },
    ],
    next: ["tr-mofa-what-it-does", "tr-translate-before-or-after-attestation", "tr-apostille-and-translation"],
  },
  {
    id: "tr-hub-documents",
    question: "Which document needs translating?",
    answer:
      "The document decides almost everything — who has to translate it, whether the original is needed, and what has to happen before or after. Pick the one closest to yours.",
    service: SERVICE,
    phrases: [
      "which documents can be translated in dubai",
      "what kind of document do you translate",
      "list of documents needing legal translation",
      "i have a document and i do not know what it needs",
    ],
    keywords: [["documents", "can", "be", "translated"], ["document", "needing", "legal", "translation"]],
    faq: false,
    choices: [
      { label: "Degree or transcript", to: "tr-doc-degree" },
      { label: "Birth, marriage, divorce", to: "tr-doc-birth-certificate" },
      { label: "Contract or agreement", to: "tr-doc-contract" },
      { label: "Court or police document", to: "tr-hub-court" },
      { label: "Company documents", to: "tr-hub-corporate" },
      { label: "Medical or technical", to: "tr-hub-technical" },
    ],
    next: ["tr-doc-degree", "tr-doc-birth-certificate", "tr-doc-contract"],
  },
  {
    id: "tr-hub-court",
    question: "Translation for courts, police and prosecution",
    answer:
      "Anything filed in a UAE court has to be readable by the court, which means Arabic produced by a translator the court will accept. Filing something that is not costs a hearing date, not just a fee. What is it for?",
    service: SERVICE,
    phrases: [
      "translation for a court case in dubai",
      "translating documents for dubai courts",
      "police station and prosecution translation",
      "court filing translation requirements uae",
    ],
    keywords: [["translation", "court", "case"], ["prosecution", "translation"], ["court", "filing", "translation"]],
    faq: false,
    choices: [
      { label: "Dubai Courts filings", to: "tr-court-dubai-requirements" },
      { label: "DIFC and ADGM", to: "tr-court-difc" },
      { label: "A foreign judgment", to: "tr-court-foreign-judgment" },
      { label: "Police statement", to: "tr-court-police-statement" },
      { label: "Interpreter at a hearing", to: "tr-interp-court" },
    ],
    next: ["tr-court-dubai-requirements", "tr-court-difc", "tr-court-police-statement"],
  },
  {
    id: "tr-hub-corporate",
    question: "Company, licence and contract translation",
    answer:
      "Corporate documents are where a translation is read by several authorities in a row — the notary, the licensing authority, a bank, sometimes a court — and each can refuse it for a different reason. Which document is it?",
    service: SERVICE,
    phrases: [
      "translating company documents in the uae",
      "trade licence and memorandum translation",
      "corporate document translation for dubai",
      "business contract translation into arabic",
    ],
    keywords: [["company", "documents", "translation"], ["corporate", "document", "translation"], ["business", "contract", "arabic"]],
    faq: false,
    choices: [
      { label: "Trade licence", to: "tr-doc-trade-licence" },
      { label: "Memorandum of association", to: "tr-doc-moa" },
      { label: "Board resolution", to: "tr-doc-board-resolution" },
      { label: "Contracts", to: "tr-doc-contract" },
      { label: "Audited accounts", to: "tr-doc-audit-report" },
    ],
    next: ["tr-doc-trade-licence", "tr-doc-moa", "tr-doc-board-resolution"],
  },
  {
    id: "tr-hub-technical",
    question: "Technical, medical and engineering translation",
    answer:
      "Technical work is judged on terminology rather than on a stamp: the reader is an engineer, a doctor or a regulator who will notice one wrong term. Which field is it?",
    service: SERVICE,
    phrases: [
      "technical translation services in dubai",
      "engineering and medical document translation",
      "i need a technical manual translated",
      "specialist subject translation in the uae",
    ],
    keywords: [["technical", "translation", "dubai"], ["engineering", "medical", "translation"], ["technical", "manual", "translated"]],
    faq: false,
    choices: [
      { label: "What technical means", to: "tr-what-is-technical-translation" },
      { label: "Medical and pharma", to: "tr-tech-medical" },
      { label: "Engineering drawings", to: "tr-tech-drawings" },
      { label: "Safety data sheets", to: "tr-tech-sds" },
      { label: "Patents", to: "tr-tech-patent" },
    ],
    next: ["tr-what-is-technical-translation", "tr-tech-medical", "tr-tech-drawings"],
  },
  {
    id: "tr-hub-interpretation",
    question: "I need an interpreter, not a translation",
    answer:
      "Interpreting is spoken and happens once, live, so the thing that matters is booking the right kind for the setting rather than the cheapest available person. Where do you need one?",
    service: SERVICE,
    phrases: [
      "i need an interpreter in dubai",
      "book an interpreter for a meeting in the uae",
      "arrange someone to interpret for me",
      "spoken interpreting rather than document translation",
    ],
    keywords: [["need", "interpreter", "dubai"], ["book", "interpreter", "meeting"], ["arrange", "interpret"]],
    opener: true,
    faq: false,
    choices: [
      { label: "Translation or interpreting?", to: "tr-interp-vs-translation" },
      { label: "In court", to: "tr-interp-court" },
      { label: "At a hospital", to: "tr-interp-medical" },
      { label: "Business meeting", to: "tr-interp-business" },
      { label: "Conference", to: "tr-interp-conference" },
      { label: "Remote or by phone", to: "tr-interp-remote" },
    ],
    next: ["tr-interp-vs-translation", "tr-interp-court", "tr-interp-business"],
  },
  {
    id: "tr-hub-languages",
    question: "Which languages can be handled?",
    answer:
      "Arabic into and out of English is the pair almost every UAE authority cares about, and everything else is usually a route to one of those two. Which language are you working from?",
    service: SERVICE,
    phrases: [
      "which languages do you cover for translation",
      "what language pairs are available in dubai",
      "can you handle my language for a uae document",
      "languages available for legal translation",
    ],
    keywords: [["languages", "cover", "translation"], ["language", "pairs", "available"]],
    faq: false,
    choices: [
      { label: "Arabic and English", to: "tr-lang-arabic-english" },
      { label: "South Asian languages", to: "tr-lang-south-asian" },
      { label: "European languages", to: "tr-lang-european" },
      { label: "East Asian languages", to: "tr-lang-east-asian" },
      { label: "A rare language", to: "tr-lang-rare" },
    ],
    next: ["tr-lang-arabic-english", "tr-lang-south-asian", "tr-lang-rare"],
  },
  {
    id: "tr-hub-process",
    question: "How the process works and what you need from me",
    answer:
      "Almost every delay is caused at the start — an unreadable scan, a name nobody confirmed, or a document sent without saying who it is for. What would you like to know?",
    service: SERVICE,
    phrases: [
      "how does the translation process work",
      "what do you need from me to start a translation",
      "how do i send my documents to you",
      "steps to get a document translated in dubai",
    ],
    keywords: [["translation", "process", "work"], ["send", "my", "documents"], ["steps", "document", "translated"]],
    faq: false,
    choices: [
      { label: "How to send documents", to: "tr-proc-how-to-send" },
      { label: "Do you need originals?", to: "tr-proc-originals" },
      { label: "Scan quality", to: "tr-proc-scan-quality" },
      { label: "Getting it back", to: "tr-proc-delivery" },
      { label: "Confidentiality", to: "tr-proc-confidentiality" },
    ],
    next: ["tr-proc-how-to-send", "tr-proc-originals", "tr-proc-delivery"],
  },
  {
    id: "tr-hub-rejection",
    question: "My translation was refused",
    answer:
      "A refusal is nearly always one of five things, and four of them are fixable without starting again. Who turned it down?",
    service: SERVICE,
    phrases: [
      "my translation was refused",
      "they did not accept my translated document",
      "translation rejected what do i do now",
      "my translated certificate came back",
    ],
    keywords: [["translation", "was", "refused"], ["rejected", "translated", "document"]],
    faq: false,
    choices: [
      { label: "MoFAIC refused it", to: "tr-mofa-rejected-translation" },
      { label: "A ministry refused it", to: "tr-reject-ministry" },
      { label: "A university refused it", to: "tr-reject-university" },
      { label: "A bank refused it", to: "tr-reject-bank" },
      { label: "An embassy abroad refused it", to: "tr-reject-embassy-abroad" },
      { label: "The name is wrong", to: "tr-reject-name-spelling" },
    ],
    next: ["tr-reject-common-reasons", "tr-reject-name-spelling", "tr-reject-fix"],
  },
  {
    id: "tr-hub-notary",
    question: "Translation for a notary appointment in Dubai",
    answer:
      "A Dubai notary performs the act in Arabic, so the translation is not an extra — it is what makes the appointment possible at all. The questions people arrive with are about sequence and about who signs. Which is yours?",
    service: SERVICE,
    phrases: [
      "translation needed for a notary appointment in dubai",
      "getting a document ready for the dubai notary",
      "preparing a bilingual document for notarisation",
      "what the dubai notary expects from a translation",
    ],
    keywords: [["ready", "dubai", "notary"], ["bilingual", "document", "notarisation"]],
    faq: false,
    choices: [
      { label: "What the notary needs", to: "tr-notary-what-is-needed" },
      { label: "Bilingual layout", to: "tr-notary-bilingual-layout" },
      { label: "Power of attorney", to: "tr-notary-poa" },
      { label: "Signatory does not read Arabic", to: "tr-notary-signatory-language" },
      { label: "Then MoFAIC", to: "tr-notary-then-mofa" },
    ],
    next: ["tr-notary-what-is-needed", "tr-notary-bilingual-layout", "tr-notary-poa"],
  },

  /* ── What the words mean ───────────────────────────────────────────────── */
  {
    id: "tr-what-is-legal-translation",
    question: "What is legal translation in the UAE?",
    answer:
      "It is translation carried out by a translator holding a licence from the UAE Ministry of Justice, who signs and stamps the result and puts their registration number on it. The stamp is what a government department, a court or a notary is actually looking for — it makes the translation an official document rather than a rendering of one. Accuracy matters, but an accurate translation without that licence behind it is refused all the same.",
    service: SERVICE,
    phrases: [
      "what is legal translation in the uae",
      "what does legal translation mean in dubai",
      "define legal translation for uae purposes",
      "what makes a translation legal here",
    ],
    keywords: [["legal", "translation", "mean"], ["define", "legal", "translation"]],
    opener: true,
    next: ["tr-who-may-translate", "tr-certified-vs-ordinary", "tr-translator-stamp"],
  },
  {
    id: "tr-certified-vs-ordinary",
    question: "What is the difference between a certified and an ordinary translation?",
    answer:
      "An ordinary translation is for understanding; a certified one is for submitting. The certified version carries a licensed translator's declaration, signature, stamp and registration number, and it covers the whole page — every seal, every handwritten note, every line of a header — because an authority checks the translation against the original mark for mark. An ordinary translation is usually fine internally and useless the moment anyone official reads it.",
    service: SERVICE,
    phrases: [
      "difference between certified and ordinary translation",
      "is a normal translation good enough for the uae",
      "why is my agency translation not accepted",
      "can i use a regular translation for a government office",
    ],
    keywords: [["certified", "ordinary", "translation"], ["normal", "translation", "enough"], ["regular", "translation", "government"]],
    next: ["tr-what-is-legal-translation", "tr-who-may-translate", "tr-translator-stamp"],
  },
  {
    id: "tr-who-may-translate",
    question: "Who is allowed to produce a legal translation in the UAE?",
    answer:
      "Only a translator licensed by the UAE Ministry of Justice for that language pair. A bilingual colleague, a translation app, an unlicensed agency or a translator licensed in another country cannot substitute, however good the result. This is the single most common reason a translation is thrown out, and it is the one that costs the whole fee rather than a correction.",
    service: SERVICE,
    phrases: [
      "who is allowed to produce a legal translation in the uae",
      "does the translator have to be licensed in the uae",
      "can my colleague translate my certificate officially",
      "can i translate my own documents for a uae authority",
    ],
    keywords: [["allowed", "produce", "legal", "translation"], ["translator", "licensed", "uae"], ["translate", "own", "documents", "authority"]],
    next: ["tr-check-translator-licence", "tr-certified-vs-ordinary", "tr-machine-translation"],
  },
  {
    id: "tr-check-translator-licence",
    question: "How can I check a translator is really licensed?",
    answer:
      "Ask for the licence number and the name it is issued in, then verify it against the Ministry of Justice register rather than against the agency's website. An agency can be perfectly legitimate and still put your document through someone unlicensed when they are busy, so the name on the stamp is worth reading. We check this as a matter of course before anything is sent for translation.",
    service: SERVICE,
    phrases: [
      "how can i check a translator is really licensed",
      "verify a legal translator in the uae",
      "is this translation agency legitimate",
      "check a translator licence number",
    ],
    keywords: [["check", "translator", "licensed"], ["verify", "legal", "translator"], ["translator", "licence", "number"]],
    next: ["tr-who-may-translate", "tr-translator-stamp", "tr-proc-confidentiality"],
  },
  {
    id: "tr-translator-stamp",
    question: "What should the translator's stamp actually say?",
    answer:
      "The translator's name, their Ministry of Justice licence number, a signature and a dated statement that the translation is a true rendering of the attached original. It belongs on the translation itself, not on a separate covering letter that can drift away from it. If what you have back carries only a company logo, you are holding an agency's assurance rather than a licensed translation.",
    service: SERVICE,
    phrases: [
      "what should the translator stamp say",
      "what does a legal translator stamp look like",
      "is a company logo enough on a translation",
      "translator seal requirements uae",
    ],
    keywords: [["translator", "stamp", "say"], ["translator", "seal", "requirements"], ["company", "logo", "translation"]],
    next: ["tr-who-may-translate", "tr-certified-vs-ordinary", "tr-reject-common-reasons"],
  },
  {
    id: "tr-difference-certified-sworn",
    question: "What is the difference between a certified and a sworn translation?",
    answer:
      "In practice, in the UAE, they describe the same thing from two directions. \"Sworn\" comes from the civil-law countries where a translator takes an oath before a court; the UAE equivalent is the Ministry of Justice licence, and the translator's signed declaration is the oath in written form. So if a foreign authority asks for a sworn translation, a UAE legal translation is normally what answers it — but confirm with whoever asked, because some countries mean their own register specifically.",
    service: SERVICE,
    phrases: [
      "difference between a certified and a sworn translation",
      "is a sworn translation the same as a certified one",
      "what is a sworn translator in the uae",
      "i was asked for a sworn translation",
    ],
    keywords: [["certified", "sworn", "translation"], ["sworn", "translator", "uae"], ["asked", "sworn", "translation"]],
    next: ["tr-what-is-legal-translation", "tr-difference-certified-notarised", "tr-uae-translation-for-abroad"],
  },
  {
    id: "tr-difference-certified-notarised",
    question: "What is the difference between a certified and a notarised translation?",
    answer:
      "The certification is about the translation; the notarisation is about a signature. A licensed translator certifies that the Arabic matches the original, and a notary witnesses someone signing — often the translator, sometimes you. Being asked for a \"notarised translation\" usually means both steps in sequence, and paying for the notary step when nobody required it is a common piece of wasted money.",
    service: SERVICE,
    phrases: [
      "difference between a certified and a notarised translation",
      "does a translation need to be notarised as well",
      "what is a notarised translation exactly",
      "i was asked for a notarised translation",
    ],
    keywords: [["certified", "notarised", "translation"], ["notarised", "translation", "exactly"]],
    next: ["tr-difference-certified-sworn", "tr-notary-what-is-needed", "tr-who-decides-requirement"],
  },
  {
    id: "tr-attested-translation-meaning",
    question: "What does an attested translation mean?",
    answer:
      "Attestation is a stamp added by an authority — most often MoFAIC here — confirming that the signature or seal on a document is genuine. Applied to a translation it says the licensed translator's stamp is real, not that the translation is good. So \"attested translation\" is a certified translation plus one or more stamps on top, and which stamps depends entirely on who will read it.",
    service: SERVICE,
    phrases: [
      "what does an attested translation mean",
      "what is an attested translation in the uae",
      "is attestation the same as certification of a translation",
      "i need my translation attested",
    ],
    keywords: [["attested", "translation", "mean"], ["attestation", "certification", "translation"]],
    next: ["tr-mofa-what-it-does", "tr-mofa-attested-translation", "tr-difference-certified-notarised"],
  },
  {
    id: "tr-legalised-translation-meaning",
    question: "What does legalising a translation mean?",
    answer:
      "Legalisation is the whole chain of confirmations that lets one country trust another country's paperwork — the issuing authority, that country's foreign ministry, the UAE embassy there, then MoFAIC in the UAE. The translation is one link in it, not the chain itself, and putting the translation in the wrong place in the sequence is the usual reason a completed file is sent back.",
    service: SERVICE,
    phrases: [
      "what does legalising a translation mean",
      "what is document legalisation for the uae",
      "legalisation versus certification of documents",
      "explain the legalisation chain for my papers",
    ],
    keywords: [["legalising", "translation", "mean"], ["document", "legalisation", "uae"], ["legalisation", "chain", "papers"]],
    next: ["tr-mofa-what-it-does", "tr-translate-before-or-after-attestation", "tr-apostille-and-translation"],
  },
  {
    id: "tr-which-one-do-i-need",
    question: "How do I work out which kind of translation I need?",
    answer:
      "Work backwards from whoever will read it — a ministry, a court, an employer, a university, a foreign embassy. They hold the requirement and they will normally tell you plainly whether they need it certified, notarised, attested or simply readable. Tell us who is asking and what for, and we will map the chain for your case before you pay for a step nobody wanted.",
    service: SERVICE,
    phrases: [
      "how do i work out which kind of translation i need",
      "which translation service is right for my case",
      "i do not know what the authority wants from me",
      "help me decide what my document needs",
    ],
    keywords: [["which", "kind", "translation", "need"], ["decide", "document", "needs"]],
    quote: true,
  },
  {
    id: "tr-do-i-need-translation",
    question: "Do I actually need a translation at all?",
    answer:
      "Not always. Many UAE departments accept English for routine submissions, and some documents are already bilingual. It is the courts, the notary, and anything that will end up in an Arabic-language file that reliably need the Arabic. The cheapest move is to ask the receiving office whether English is acceptable for your specific submission before commissioning anything.",
    service: SERVICE,
    phrases: [
      "do i actually need a translation at all",
      "is english accepted or must it be arabic",
      "can i submit my document without translating it",
      "does everything have to be in arabic in the uae",
    ],
    keywords: [["need", "translation", "at", "all"], ["english", "accepted", "arabic"], ["submit", "translating"]],
    next: ["tr-arabic-requirement-reason", "tr-who-decides-requirement", "tr-english-only-departments"],
  },
  {
    id: "tr-arabic-requirement-reason",
    question: "Why does everything have to be in Arabic?",
    answer:
      "Arabic is the official language of the UAE, so it is the language the courts hear cases in, the notary performs acts in, and official registers are kept in. That is a rule about the record rather than about you: the version that carries legal weight has to be the one the institution can read and rely on. Where an English version is allowed it is usually alongside the Arabic, not instead of it.",
    service: SERVICE,
    phrases: [
      "why does everything have to be in arabic",
      "why do uae authorities insist on arabic",
      "is arabic legally required for documents here",
      "reason arabic is needed for official papers",
    ],
    keywords: [["why", "insist", "arabic"], ["arabic", "legally", "required"], ["reason", "arabic", "needed"]],
    next: ["tr-do-i-need-translation", "tr-which-version-prevails", "tr-english-only-departments"],
  },
  {
    id: "tr-english-only-departments",
    question: "Are there places that accept English only?",
    answer:
      "Yes — DIFC and ADGM operate in English, and plenty of free zones and private counterparties are content with an English document. What you cannot do is generalise from one of them to the next: an English contract that was fine for a free zone authority will still need Arabic the moment it goes to a mainland court or a notary. Check per submission, not per company.",
    service: SERVICE,
    phrases: [
      "are there places that accept english only",
      "which uae authorities accept english documents",
      "do free zones require arabic translation",
      "is english enough in difc",
    ],
    keywords: [["authorities", "accept", "english"], ["free", "zones", "require", "arabic"], ["english", "enough", "difc"]],
    next: ["tr-court-difc", "tr-arabic-requirement-reason", "tr-who-decides-requirement"],
  },
  {
    id: "tr-who-decides-requirement",
    question: "Who decides what my document needs?",
    answer:
      "The authority that will receive it, always — not the translator, not an agency, and not us. A translator can tell you what a compliant translation looks like; only the receiving office can tell you whether they also want it notarised, attested or legalised. If two people have told you different things, the one who will stamp your file is the one to believe.",
    service: SERVICE,
    phrases: [
      "who decides what my document needs",
      "who sets the translation requirements",
      "two people told me different things about my documents",
      "whose rules apply to my translation",
    ],
    keywords: [["decides", "document", "needs"], ["sets", "translation", "requirements"], ["whose", "rules", "translation"]],
    next: ["tr-which-one-do-i-need", "tr-do-i-need-translation", "tr-reject-common-reasons"],
  },
  {
    id: "tr-which-version-prevails",
    question: "If the Arabic and English differ, which version counts?",
    answer:
      "Before a UAE court, the Arabic. That is why a bilingual contract is not simply a convenience — a discrepancy between the two columns is a discrepancy you may be held to in the version you did not read. Have the Arabic reviewed by someone acting for you rather than accepting it as a formality, particularly on anything with money or liability in it.",
    service: SERVICE,
    phrases: [
      "if the arabic and english differ which version counts",
      "which language prevails in a bilingual contract",
      "does the arabic version override the english",
      "governing language in a uae contract",
    ],
    keywords: [["arabic", "english", "differ", "counts"], ["language", "prevails", "bilingual"], ["arabic", "override", "english"]],
    next: ["tr-doc-contract", "tr-quality-review", "tr-arabic-requirement-reason"],
  },
  {
    id: "tr-machine-translation",
    question: "Can I use Google Translate or an AI tool instead?",
    answer:
      "For working out what a document says, by all means. For submitting it, no — there is no licensed translator behind it, so there is nothing to stamp, and the errors machine translation makes in legal Arabic tend to be the confident kind rather than the obvious kind. Where it does help is deciding whether a document is worth translating properly at all.",
    service: SERVICE,
    phrases: [
      "can i use google translate instead of a legal translator",
      "is ai translation accepted in the uae",
      "machine translation for official documents",
      "why can i not just use an app to translate this",
    ],
    keywords: [["google", "translate", "instead"], ["machine", "translation", "official"], ["translation", "accepted", "uae"]],
    next: ["tr-who-may-translate", "tr-quality-accuracy", "tr-certified-vs-ordinary"],
  },
  {
    id: "tr-translation-vs-attestation",
    question: "Is translation the same as attestation?",
    answer:
      "No, and they answer different doubts. Attestation proves a document is genuine; translation makes it readable. A degree certificate from abroad usually needs both, in a particular order, and someone who has only had it attested is often told at the counter that they now need the other half. Neither one substitutes for the other at any point.",
    service: SERVICE,
    phrases: [
      "is translation the same as attestation",
      "do i need attestation or translation for my certificate",
      "difference between attestation and translation of documents",
      "translation and attestation both needed",
    ],
    keywords: [["translation", "same", "attestation"], ["attestation", "or", "translation", "certificate"]],
    next: ["tr-translate-before-or-after-attestation", "tr-mofa-what-it-does", "tr-doc-degree"],
  },
  {
    id: "tr-translation-affidavit",
    question: "What is a translator's affidavit or certificate of accuracy?",
    answer:
      "A signed statement, attached to the translation, in which the translator declares the rendering is complete and accurate and gives their licence details. Some foreign authorities ask for it as a separate page and will not accept a stamp alone. If the body asking is outside the UAE, find out whether they want that page notarised as well, because that is the version most people are missing.",
    service: SERVICE,
    phrases: [
      "what is a translator affidavit",
      "certificate of accuracy for a translation",
      "translator declaration page requirement",
      "i was asked for a certificate of translation accuracy",
    ],
    keywords: [["translator", "affidavit"], ["certificate", "accuracy", "translation"], ["translator", "declaration", "page"]],
    next: ["tr-translator-stamp", "tr-uae-translation-for-abroad", "tr-difference-certified-notarised"],
  },
  {
    id: "tr-what-is-technical-translation",
    question: "What counts as technical translation?",
    answer:
      "Anything where the reader is a specialist and the vocabulary is fixed by their field rather than by general usage — engineering specifications, medical reports, pharmaceutical labelling, safety data sheets, patents, software strings. The certification question is separate: a technical document may or may not need a licensed legal translator depending on who receives it, and a regulator usually does require one.",
    service: SERVICE,
    phrases: [
      "what counts as technical translation",
      "what is technical translation exactly",
      "is my manual a technical translation",
      "difference between technical and legal translation",
    ],
    keywords: [["counts", "technical", "translation"], ["technical", "translation", "exactly"], ["technical", "versus", "legal", "translation"]],
    next: ["tr-tech-terminology", "tr-tech-medical", "tr-tech-drawings"],
  },
  {
    id: "tr-interp-vs-translation",
    question: "What is the difference between translation and interpreting?",
    answer:
      "Translation is written and can be checked; interpreting is spoken and happens once. They are different skills and largely different people — an excellent legal translator may be poor in a live hearing, and the reverse is just as true. If what you need is someone in a room with you, say interpreter when you book, because asking for a translator usually gets you a document.",
    service: SERVICE,
    phrases: [
      "what is the difference between translation and interpreting",
      "is an interpreter the same as a translator",
      "do i need a translator or an interpreter",
      "spoken translation versus written translation",
    ],
    keywords: [["difference", "translation", "interpreting"], ["interpreter", "same", "translator"], ["translator", "or", "interpreter"]],
    next: ["tr-hub-interpretation", "tr-interp-court", "tr-interp-business"],
  },

  /* ── MoFAIC, embassies and the chain ───────────────────────────────────── */
  {
    id: "tr-mofa-what-it-does",
    question: "What does MoFAIC actually do to my document?",
    answer:
      "The Ministry of Foreign Affairs and International Cooperation confirms that the signature or seal already on a document is genuine. It is not reading the content and it is not checking the quality of a translation — it is authenticating the stamp before it. That is why MoFAIC is always a later link in a chain and never the first one.",
    service: SERVICE,
    phrases: [
      "what does mofaic actually do to my document",
      "what is the ministry of foreign affairs attestation for",
      "what does the mofa stamp confirm",
      "purpose of mofaic attestation on documents",
    ],
    keywords: [["mofaic", "attestation", "for"], ["mofa", "stamp", "confirm"], ["ministry", "foreign", "affairs", "attestation"]],
    next: ["tr-mofa-attested-translation", "tr-translate-before-or-after-attestation", "tr-legalised-translation-meaning"],
  },
  {
    id: "tr-mofa-attested-translation",
    question: "What is a MoFA attested translation?",
    answer:
      "A translation done by a Ministry of Justice licensed translator and then taken to MoFAIC, which authenticates that translator's stamp. It is what people usually mean by \"MoFA attested legal translation\", and it is asked for when the document has to satisfy someone who does not know the translator — a foreign embassy, an overseas university, or a ministry working from a file rather than from you in front of them.",
    service: SERVICE,
    phrases: [
      "what is a mofa attested translation",
      "i need a mofa attested legal translation",
      "mofaic attested translation meaning",
      "translation with a ministry of foreign affairs stamp",
    ],
    keywords: [["mofa", "attested", "translation"], ["mofaic", "attested", "translation"]],
    opener: true,
    next: ["tr-mofa-steps", "tr-mofa-what-it-does", "tr-mofa-rejected-translation"],
  },
  {
    id: "tr-mofa-steps",
    question: "What are the steps to get a translation MoFA attested?",
    answer:
      "In outline: the original is legalised so that MoFAIC has a genuine signature to work from, then a licensed legal translator produces the Arabic, and the translation is submitted to MoFAIC for its stamp. Where the original came from decides how long the first part is — a UAE-issued document skips most of it, a foreign one does not. We map the actual sequence for your document before anything is paid for, because doing these out of order means paying twice.",
    service: SERVICE,
    phrases: [
      "what are the steps to get a translation mofa attested",
      "process for mofaic attestation of a translation",
      "how do i get my translation attested by mofaic",
      "order of steps for a mofa attested translation",
    ],
    keywords: [["steps", "translation", "mofa", "attested"], ["process", "mofaic", "attestation"]],
    next: ["tr-translate-before-or-after-attestation", "tr-mofa-original-or-translation", "tr-mofa-appointment"],
  },
  {
    id: "tr-translate-before-or-after-attestation",
    question: "Should the translation be done before or after the stamps?",
    answer:
      "For a foreign document, the usual answer is attest the original first and translate afterwards, because the translation has to include the attestation stamps that are on the page. Translating first often means paying for a second translation once the stamps arrive. It is not universal though — some receiving authorities want it the other way round, so the sequence is worth confirming for your specific chain before anyone starts.",
    service: SERVICE,
    phrases: [
      "should the translation be done before or after the stamps",
      "should attestation come first or translation",
      "which comes first attestation or legal translation",
      "sequence of attestation and translation for my certificate",
    ],
    keywords: [["translate", "before", "after", "attestation"], ["attestation", "first", "or", "translation"], ["sequence", "attestation", "translation"]],
    next: ["tr-mofa-steps", "tr-mofa-original-or-translation", "tr-translation-vs-attestation"],
  },
  {
    id: "tr-mofa-original-or-translation",
    question: "Does MoFAIC attest the original or the translation?",
    answer:
      "It can do either, and which one you need depends on the requirement you were given. Attesting the original authenticates the foreign chain behind it; attesting the translation authenticates the licensed translator's stamp. People who were told \"get it attested\" and had only one of the two done are the most common kind of second visit.",
    service: SERVICE,
    phrases: [
      "does mofaic attest the original or the translation",
      "should i attest the original document or the translated one",
      "which copy goes to mofaic",
      "do both the original and translation need attesting",
    ],
    keywords: [["mofaic", "attest", "original", "translation"], ["which", "copy", "goes", "mofaic"]],
    next: ["tr-mofa-steps", "tr-translate-before-or-after-attestation", "tr-mofa-rejected-translation"],
  },
  {
    id: "tr-mofa-appointment",
    question: "Do I have to go to MoFAIC myself?",
    answer:
      "Not necessarily. Submission is done through MoFAIC's own channels and by service providers who lodge documents on clients' behalf, so in most cases you hand over the document rather than queue with it. What you should not do is hand an original to anyone without a receipt naming the document and the service, because an original certificate is not something you can reissue casually.",
    service: SERVICE,
    phrases: [
      "do i have to go to mofaic myself",
      "can someone submit to mofaic on my behalf",
      "do i need an appointment at the ministry of foreign affairs",
      "can attestation be done without me attending",
    ],
    keywords: [["submit", "mofaic", "behalf"], ["appointment", "ministry", "foreign", "affairs"], ["attestation", "me", "attending"]],
    next: ["tr-proc-originals", "tr-mofa-steps", "tr-proc-delivery"],
  },
  {
    id: "tr-mofa-rejected-translation",
    question: "MoFAIC refused my translation. Why?",
    answer:
      "Usually one of four things: the translator was not licensed for that pair, the underlying original was not legalised so there was no genuine signature to authenticate, the translation is partial and left out a seal or a marginal note, or a name does not match the passport. All four are diagnosable from the document itself, so send it over and we will tell you which one it is before you pay for anything again.",
    service: SERVICE,
    phrases: [
      "mofaic refused my translation why",
      "mofa rejected my attested translation",
      "ministry of foreign affairs would not attest my document",
      "my document came back from mofaic unattested",
    ],
    keywords: [["mofaic", "refused", "translation"], ["mofa", "rejected", "translation"], ["mofaic", "would", "not", "attest"]],
    quote: true,
  },
  {
    id: "tr-apostille-and-translation",
    question: "My translation was apostilled abroad. Does that help here?",
    answer:
      "Not on its own. The UAE is not a party to the Hague Apostille Convention, so an apostille attached to a foreign translation does not make it usable here — and the translation itself still has to come from a Ministry of Justice licensed translator for a UAE authority to accept it. The route here is consular: the issuing country's foreign ministry, then the UAE embassy there, then MoFAIC, and the Arabic produced locally.",
    service: SERVICE,
    phrases: [
      "my translation was apostilled abroad does that help here",
      "is an apostilled translation usable in the uae",
      "my translator abroad attached an apostille",
      "apostilled translation refused in dubai",
    ],
    keywords: [["apostilled", "translation", "usable"], ["apostilled", "translation", "refused"], ["translator", "abroad", "apostille"]],
    next: ["tr-legalised-translation-meaning", "tr-embassy-legalisation", "tr-mofa-steps"],
  },
  {
    id: "tr-embassy-legalisation",
    question: "What does embassy legalisation add?",
    answer:
      "The UAE embassy in the country that issued the document confirms that country's foreign ministry stamp, which is what lets MoFAIC recognise the chain when the document arrives here. Skipping it is the reason a document that looks fully stamped is still refused in Dubai. Requirements and the order of steps vary by country, so confirm with that specific embassy rather than with a general guide.",
    service: SERVICE,
    phrases: [
      "what does embassy legalisation add",
      "why do i need the uae embassy stamp",
      "embassy attestation before mofaic",
      "uae embassy legalisation in my home country",
    ],
    keywords: [["embassy", "legalisation", "add"], ["uae", "embassy", "stamp"], ["embassy", "attestation", "before", "mofaic"]],
    next: ["tr-apostille-and-translation", "tr-translate-abroad-or-here", "tr-mofa-steps"],
  },
  {
    id: "tr-translate-abroad-or-here",
    question: "Should I get it translated in my home country or in the UAE?",
    answer:
      "For anything a UAE authority will read, in the UAE, by a Ministry of Justice licensed translator — a translation certified abroad usually has to be redone here, so paying for it twice is the common outcome. The exception is a document going the other way: something a foreign authority will read is often better translated at that end, to their rules.",
    service: SERVICE,
    phrases: [
      "should i get it translated in my home country or in the uae",
      "can i translate my documents before i arrive in dubai",
      "is a translation from my country accepted here",
      "translate abroad or in the uae",
    ],
    keywords: [["translated", "home", "country", "uae"], ["translation", "from", "my", "country", "accepted"], ["translate", "abroad", "uae"]],
    next: ["tr-foreign-translation-accepted", "tr-uae-translation-for-abroad", "tr-who-may-translate"],
  },
  {
    id: "tr-foreign-translation-accepted",
    question: "I already have a translation from abroad. Is it usable?",
    answer:
      "Sometimes, as a reference, rarely as a submission. A UAE authority wants a licensed UAE translator's stamp, and a foreign certification is not that — even a sworn translation from a country with a strict register. Send it anyway when you ask us to look: a good existing translation can cut the work on the new one, which is not nothing.",
    service: SERVICE,
    phrases: [
      "i already have a translation from abroad is it usable",
      "will my existing foreign translation be accepted in dubai",
      "can i reuse a translation done in another country",
      "my translation was certified overseas",
    ],
    keywords: [["existing", "foreign", "translation", "accepted"], ["reuse", "translation", "another", "country"], ["translation", "certified", "overseas"]],
    next: ["tr-translate-abroad-or-here", "tr-who-may-translate", "tr-proc-reuse-old-translation"],
  },
  {
    id: "tr-uae-translation-for-abroad",
    question: "I need a UAE document translated for use in another country.",
    answer:
      "That runs the chain in reverse: the UAE document is attested by the relevant UAE authority and MoFAIC, translated into the destination language, and then usually legalised by that country's embassy or consulate here. The destination sets the rules, including whether they will accept a translation done in the UAE at all, so their requirement list is the one to work from.",
    service: SERVICE,
    phrases: [
      "i need a uae document translated for use in another country",
      "translating an emirati certificate for abroad",
      "uae documents for a foreign authority",
      "sending my dubai paperwork overseas",
    ],
    keywords: [["uae", "document", "another", "country"], ["emirati", "certificate", "abroad"], ["dubai", "paperwork", "overseas"]],
    next: ["tr-reject-embassy-abroad", "tr-difference-certified-sworn", "tr-lang-european"],
  },
  {
    id: "tr-double-translation",
    question: "My document is in neither Arabic nor English. What then?",
    answer:
      "It usually goes through English on the way to Arabic, because the licensed pairs that exist here are mostly to and from one of those two. That means two translations rather than one, and it means naming the languages accurately at the start — a document described as \"Indian\" could be in any of a dozen and the route changes with each. Send a photo and we will tell you what the path looks like.",
    service: SERVICE,
    phrases: [
      "my document is in neither arabic nor english what then",
      "my certificate is in another language entirely",
      "translating from a third language into arabic",
      "does my document need two translations",
    ],
    keywords: [["neither", "arabic", "nor", "english"], ["third", "language", "into", "arabic"], ["document", "two", "translations"]],
    next: ["tr-lang-rare", "tr-hub-languages", "tr-proc-how-to-send"],
  },
  {
    id: "tr-mofa-stamp-validity",
    question: "Does a MoFAIC stamp expire?",
    answer:
      "The stamp itself does not carry an expiry, but the authority receiving it can still insist on a recently issued or recently attested document — that is their rule, not a property of the stamp. Police clearances and bank letters are the usual ones treated as perishable. Ask the receiving office how recent they need it to be before you commission anything, because that answer changes what is worth paying for.",
    service: SERVICE,
    phrases: [
      "does a mofaic stamp expire",
      "how long is an attested translation valid",
      "is there an expiry on attestation",
      "my attestation is a few years old",
    ],
    keywords: [["mofaic", "stamp", "expire"], ["attested", "translation", "valid"], ["expiry", "attestation"]],
    next: ["tr-proc-reuse-old-translation", "tr-mofa-what-it-does", "tr-who-decides-requirement"],
  },
  {
    id: "tr-notary-then-mofa",
    question: "Does a notarised document still need MoFAIC?",
    answer:
      "It depends on where it is going. Inside the UAE, a notarised instrument is usually complete as it stands. Going abroad, it generally needs MoFAIC and then the destination country's embassy here, in that order. So the question is not about the notary at all — it is about who reads the document last.",
    service: SERVICE,
    phrases: [
      "does a notarised document still need mofaic",
      "do i need attestation after notarisation for abroad",
      "notarised power of attorney going overseas",
      "next step after the notary for a foreign country",
    ],
    keywords: [["notarised", "document", "need", "mofaic"], ["attestation", "after", "notarisation", "abroad"], ["after", "notary", "foreign", "country"]],
    next: ["tr-uae-translation-for-abroad", "tr-notary-poa", "tr-mofa-what-it-does"],
  },

  /* ── Document by document ──────────────────────────────────────────────── */
  {
    id: "tr-doc-degree",
    question: "Does my degree certificate need translating?",
    answer:
      "If it is not in Arabic and it is going to a UAE government body — a work permit file, an equivalency application, a professional licence — then almost always yes, and the attestation chain comes first so the stamps appear in the translation. An employer on its own may be satisfied with the English. Which of those two you are dealing with changes the whole cost, so it is worth pinning down before you commission anything.",
    service: SERVICE,
    phrases: [
      "does my degree certificate need translating",
      "translate my university degree for the uae",
      "degree certificate arabic translation dubai",
      "do i need my diploma in arabic",
    ],
    keywords: [["degree", "certificate", "need", "translating"], ["university", "degree", "uae"], ["diploma", "arabic"]],
    next: ["tr-doc-transcript", "tr-doc-equivalency", "tr-translate-before-or-after-attestation"],
  },
  {
    id: "tr-doc-transcript",
    question: "Do transcripts and mark sheets need translating too?",
    answer:
      "Usually, when the body assessing you wants to see subjects and grades rather than just the award — equivalency and professional licensing both do. Transcripts are long and dense, which makes them the part of a file people try to skip, and a partial submission is refused as readily as a wrong one. Check whether the assessor wants all years or only the final one before paying per page.",
    service: SERVICE,
    phrases: [
      "do transcripts and mark sheets need translating too",
      "translate my academic transcript into arabic",
      "mark sheet translation for the uae",
      "do i need every year of my marksheets translated",
    ],
    keywords: [["transcripts", "mark", "sheets", "translating"], ["academic", "transcript", "arabic"], ["mark", "sheet", "translation"]],
    next: ["tr-doc-degree", "tr-doc-equivalency", "tr-proc-page-count"],
  },
  {
    id: "tr-doc-equivalency",
    question: "What does an equivalency application need translated?",
    answer:
      "An equivalency assessment looks at the award and the study behind it, so the certificate and the transcripts are both normally in scope, attested first and then translated. The ministry handling it publishes its own requirement list and it does change, so work from their current one rather than from what a friend submitted last year. We check your set against it before anything goes to a translator.",
    service: SERVICE,
    phrases: [
      "what does an equivalency application need translated",
      "translation for certificate equivalency in the uae",
      "documents to translate for equivalency",
      "equivalency of my foreign degree in dubai",
    ],
    keywords: [["equivalency", "application", "translated"], ["certificate", "equivalency", "uae"], ["equivalency", "foreign", "degree"]],
    next: ["tr-doc-degree", "tr-doc-transcript", "tr-reject-ministry"],
  },
  {
    id: "tr-doc-school-certificate",
    question: "Does a school certificate need translating for a UAE school?",
    answer:
      "Schools here generally want the previous school's records attested and, where they are not in Arabic or English, translated — plus a transfer certificate from the school the child is leaving. Requirements differ between a private curriculum school and a government one, and between emirates. Ask the admissions office for their list in writing; it is the cheapest five minutes in the process.",
    service: SERVICE,
    phrases: [
      "does a school certificate need translating for a uae school",
      "translate my child school records for dubai admission",
      "transfer certificate translation for school",
      "school documents for admission in the uae",
    ],
    keywords: [["school", "certificate", "translating"], ["child", "school", "records"], ["transfer", "certificate", "school"]],
    next: ["tr-doc-degree", "tr-proc-how-to-send", "tr-reject-common-reasons"],
  },
  {
    id: "tr-doc-birth-certificate",
    question: "Does a birth certificate need legal translation?",
    answer:
      "For most UAE uses, yes — a residence application for a child, a school admission, adding a dependant — and it is attested in the issuing country first. The two things that go wrong are name order and parents' names: if the birth certificate spells a parent differently from their passport, somebody downstream will treat them as two people. Fix the spelling before translation, not after.",
    service: SERVICE,
    phrases: [
      "does a birth certificate need legal translation",
      "translate a birth certificate into arabic dubai",
      "birth certificate for a child visa translation",
      "my baby birth certificate needs to be in arabic",
    ],
    keywords: [["birth", "certificate", "legal", "translation"], ["birth", "certificate", "arabic"], ["birth", "certificate", "child", "visa"]],
    next: ["tr-reject-name-spelling", "tr-doc-marriage-certificate", "tr-translate-before-or-after-attestation"],
  },
  {
    id: "tr-doc-marriage-certificate",
    question: "Does a marriage certificate need translating?",
    answer:
      "For sponsoring a spouse, for a family visa, and for most things where the relationship has to be proved on paper — yes, attested then translated. A religious or church certificate is often not enough on its own; the civil registration of the marriage is what authorities generally want to see. If you only have the religious document, say so early, because that changes the work.",
    service: SERVICE,
    phrases: [
      "does a marriage certificate need translating",
      "translate my marriage certificate for a spouse visa",
      "marriage certificate arabic translation uae",
      "is my church marriage certificate enough",
    ],
    keywords: [["marriage", "certificate", "translating"], ["marriage", "certificate", "spouse", "visa"], ["church", "marriage", "certificate"]],
    next: ["tr-doc-birth-certificate", "tr-doc-divorce", "tr-reject-name-spelling"],
  },
  {
    id: "tr-doc-divorce",
    question: "Do divorce papers need legal translation?",
    answer:
      "Yes, wherever the divorce has to be recognised here — remarriage, a change of sponsorship, custody arrangements. A foreign divorce decree is a court document, so it needs the full legalisation chain behind it and then a translation that covers the whole judgment including any annexes. Partial translations of judgments are refused more often than any other document type.",
    service: SERVICE,
    phrases: [
      "do divorce papers need legal translation",
      "translate a divorce decree for the uae",
      "divorce certificate translation dubai",
      "my foreign divorce needs recognising here",
    ],
    keywords: [["divorce", "papers", "legal", "translation"], ["divorce", "decree", "uae"], ["divorce", "certificate", "translation"]],
    next: ["tr-court-foreign-judgment", "tr-doc-marriage-certificate", "tr-doc-custody"],
  },
  {
    id: "tr-doc-custody",
    question: "Do custody or guardianship orders need translating?",
    answer:
      "Yes, and carefully — a guardianship or custody order is read for exactly what it permits, so a loose translation of one clause can change what an authority believes you are allowed to do. These go through the court-document route: legalised, then translated in full by a licensed translator, with the operative wording checked rather than skimmed.",
    service: SERVICE,
    phrases: [
      "do custody or guardianship orders need translating",
      "translate a custody order for the uae",
      "guardianship document translation dubai",
      "court order about my children translated",
    ],
    keywords: [["custody", "guardianship", "orders", "translating"], ["custody", "order", "uae"], ["guardianship", "document", "translation"]],
    next: ["tr-court-foreign-judgment", "tr-doc-divorce", "tr-quality-review"],
  },
  {
    id: "tr-doc-death-certificate",
    question: "Does a death certificate need translating?",
    answer:
      "Yes, for anything that follows from it here — closing accounts, releasing end-of-service entitlements, an inheritance file, repatriation paperwork. These are usually urgent and the process is unforgiving about names and dates matching the passport exactly. Tell us what the certificate is for and we will work out the shortest compliant chain rather than the longest.",
    service: SERVICE,
    phrases: [
      "does a death certificate need translating",
      "translate a death certificate in dubai",
      "death certificate for inheritance translation",
      "paperwork after a death in the uae translation",
    ],
    keywords: [["death", "certificate", "translating"], ["death", "certificate", "dubai"], ["death", "certificate", "inheritance"]],
    next: ["tr-doc-inheritance", "tr-doc-will", "tr-proc-urgent"],
  },
  {
    id: "tr-doc-single-status",
    question: "Does a single status or no-impediment certificate need translating?",
    answer:
      "If it is being used here, yes — attested and then translated, and the authority conducting the marriage decides how recent it has to be. These are issued under different names in different countries, which is why one is sometimes rejected as \"not the right document\" when it is in fact the local equivalent. Send a photo and we will tell you whether it matches what was asked for.",
    service: SERVICE,
    phrases: [
      "does a single status certificate need translating",
      "no impediment certificate translation uae",
      "certificate of no marriage translated for dubai",
      "single status letter for marriage in the uae",
    ],
    keywords: [["single", "status", "certificate", "translating"], ["impediment", "certificate", "translation"], ["single", "status", "letter", "marriage"]],
    next: ["tr-doc-marriage-certificate", "tr-mofa-steps", "tr-reject-common-reasons"],
  },
  {
    id: "tr-doc-police-clearance",
    question: "Does a police clearance certificate need translating?",
    answer:
      "Where the receiving body is a UAE authority and the certificate is not in Arabic, generally yes, and it travels with the same legalisation chain as anything else issued abroad. The complication is freshness: several authorities will only look at a recently issued one, so a slow chain can outlive the document. Start with how recent theirs must be and work backwards.",
    service: SERVICE,
    phrases: [
      "does a police clearance certificate need translating",
      "translate a police clearance for the uae",
      "good conduct certificate translation dubai",
      "criminal record certificate in arabic",
    ],
    keywords: [["police", "clearance", "certificate", "translating"], ["good", "conduct", "certificate", "translation"], ["criminal", "record", "certificate", "arabic"]],
    next: ["tr-mofa-stamp-validity", "tr-proc-urgent", "tr-mofa-steps"],
  },
  {
    id: "tr-doc-medical-report",
    question: "Can a medical report be legally translated?",
    answer:
      "Yes, and it is the clearest case for pairing a licensed legal translator with someone who knows the clinical vocabulary — an insurer, a court or a licensing body reads the diagnosis, not the prose around it. Say who will read it when you send it: a report for an insurance claim and the same report for a court case are handled to different standards.",
    service: SERVICE,
    phrases: [
      "can a medical report be legally translated",
      "translate a hospital report into arabic",
      "medical records translation dubai",
      "doctor report translation for insurance",
    ],
    keywords: [["medical", "report", "legally", "translated"], ["hospital", "report", "arabic"], ["medical", "records", "translation"]],
    next: ["tr-tech-medical", "tr-doc-insurance", "tr-quality-review"],
  },
  {
    id: "tr-doc-vaccination",
    question: "Do vaccination or health records need translating?",
    answer:
      "Sometimes — schools and some visa categories ask for them, and where they are in another language a translation is needed. These are short documents with heavy abbreviation, and abbreviations are where errors hide, so the translator should be working from a legible original rather than a phone photo of a folded card.",
    service: SERVICE,
    phrases: [
      "do vaccination records need translating",
      "translate immunisation records for a uae school",
      "health card translation dubai",
      "vaccination certificate in arabic",
    ],
    keywords: [["vaccination", "records", "translating"], ["immunisation", "records", "school"], ["vaccination", "certificate", "arabic"]],
    next: ["tr-doc-school-certificate", "tr-proc-scan-quality", "tr-doc-medical-report"],
  },
  {
    id: "tr-doc-passport",
    question: "Does a passport need translating?",
    answer:
      "Rarely — passports are bilingual enough for most purposes. What does get translated is a page with a stamp or an endorsement on it in another language, or an old passport being used as proof of a former name. If someone has asked for \"passport translation\", find out which page and why, because the answer is usually narrower than the request.",
    service: SERVICE,
    phrases: [
      "does a passport need translating",
      "translate a passport page into arabic",
      "passport stamp translation dubai",
      "do i need my old passport translated",
    ],
    keywords: [["passport", "need", "translating"], ["passport", "page", "arabic"], ["passport", "stamp", "translation"]],
    next: ["tr-reject-name-spelling", "tr-doc-name-change", "tr-who-decides-requirement"],
  },
  {
    id: "tr-doc-driving-licence",
    question: "Does a foreign driving licence need translating?",
    answer:
      "For an exchange or a conversion at the licensing authority, a translation of a non-Arabic, non-English licence is commonly required, and some countries' licences are eligible for exchange while others are not. The eligibility list is set by the authority and changes, so confirm your country's position with them before paying for a translation you may not need.",
    service: SERVICE,
    phrases: [
      "does a foreign driving licence need translating",
      "translate my driving licence for the rta",
      "driving licence translation dubai",
      "converting my licence in the uae translation",
    ],
    keywords: [["driving", "licence", "translating"], ["driving", "licence", "translation"], ["converting", "licence", "uae"]],
    next: ["tr-who-decides-requirement", "tr-proc-how-to-send", "tr-lang-rare"],
  },
  {
    id: "tr-doc-bank-statement",
    question: "Do bank statements need legal translation?",
    answer:
      "Where they are in another language and being submitted as proof — a visa file, a court case, a tender — yes. Statements are long, so the first question is whether the receiving body wants the full period or a summary letter from the bank instead, which is usually a fraction of the work. Ask them before you translate a year of transactions.",
    service: SERVICE,
    phrases: [
      "do bank statements need legal translation",
      "translate bank statements into arabic",
      "bank statement translation for a visa",
      "financial statements translation dubai",
    ],
    keywords: [["bank", "statements", "legal", "translation"], ["bank", "statements", "arabic"], ["bank", "statement", "translation", "visa"]],
    next: ["tr-proc-page-count", "tr-doc-audit-report", "tr-reject-bank"],
  },
  {
    id: "tr-doc-salary-certificate",
    question: "Does a salary or experience certificate need translating?",
    answer:
      "For a UAE government submission, if it is not in Arabic, usually yes. Experience letters cause a particular problem: they often describe a role in terms that do not map onto the job title on a permit application, and a literal translation can create a mismatch that was not there in the original. Say what the letter is being used for so the wording is handled with that in mind.",
    service: SERVICE,
    phrases: [
      "does a salary certificate need translating",
      "translate an experience certificate into arabic",
      "employment letter translation dubai",
      "experience letter for a work permit translation",
    ],
    keywords: [["salary", "certificate", "translating"], ["experience", "certificate", "arabic"], ["employment", "letter", "translation"]],
    next: ["tr-doc-employment-contract", "tr-reject-ministry", "tr-quality-review"],
  },
  {
    id: "tr-doc-employment-contract",
    question: "Does an employment contract need to be in Arabic?",
    answer:
      "Anything filed with the labour authorities is in Arabic, and in a dispute the Arabic is what is read. A contract drafted in English and never properly translated is a risk to whoever signed it rather than a formality. If you are being asked to sign a bilingual contract you cannot read one half of, have that half reviewed before signing, not after.",
    service: SERVICE,
    phrases: [
      "does an employment contract need to be in arabic",
      "translate my employment contract for mohre",
      "labour contract translation dubai",
      "is my english job contract valid in the uae",
    ],
    keywords: [["employment", "contract", "arabic"], ["labour", "contract", "translation"], ["english", "job", "contract", "valid"]],
    next: ["tr-which-version-prevails", "tr-court-labour", "tr-doc-contract"],
  },
  {
    id: "tr-doc-contract",
    question: "Should a contract be translated into Arabic?",
    answer:
      "If it may ever be enforced in a UAE court, yes, and preferably drafted bilingually from the start rather than translated in a hurry when a dispute begins. A contract translation is judged on whether the obligations survive intact, which is a different job from rendering a certificate — the terms, the defined words and the governing-law clause all have to line up across both columns.",
    service: SERVICE,
    phrases: [
      "should a contract be translated into arabic",
      "translate a commercial contract for the uae",
      "bilingual contract for dubai",
      "agreement translation into arabic",
    ],
    keywords: [["should", "contract", "translated"], ["commercial", "contract", "uae"], ["agreement", "translation", "arabic"]],
    next: ["tr-which-version-prevails", "tr-doc-employment-contract", "tr-quality-review"],
  },
  {
    id: "tr-doc-tenancy",
    question: "Does a tenancy contract or Ejari need translating?",
    answer:
      "Tenancy contracts here are normally issued bilingually already, so the usual need is the reverse: an English summary of an Arabic-only contract, or a translation for a landlord or tenant abroad. If you are heading to the rental disputes committee, the Arabic version is the one that matters and it is worth having it read properly first.",
    service: SERVICE,
    phrases: [
      "does a tenancy contract need translating",
      "translate my ejari or rental contract",
      "lease agreement translation dubai",
      "rental contract in arabic i cannot read",
    ],
    keywords: [["tenancy", "contract", "translating"], ["ejari", "rental", "contract"], ["lease", "agreement", "translation"]],
    next: ["tr-court-rdc", "tr-which-version-prevails", "tr-doc-title-deed"],
  },
  {
    id: "tr-doc-title-deed",
    question: "Does a title deed need translating?",
    answer:
      "For use abroad — a mortgage application, a tax filing, an inheritance file in another country — yes, and usually attested as well. Inside the UAE the land department's own record is the reference, so a translation is for the reader rather than for the register. Say which country will read it, because their rules decide whether a UAE translation will be accepted there at all.",
    service: SERVICE,
    phrases: [
      "does a title deed need translating",
      "translate my dubai title deed",
      "property deed translation for abroad",
      "land department document translation",
    ],
    keywords: [["title", "deed", "translating"], ["property", "deed", "translation"], ["land", "department", "document", "translation"]],
    next: ["tr-uae-translation-for-abroad", "tr-doc-inheritance", "tr-mofa-steps"],
  },
  {
    id: "tr-doc-trade-licence",
    question: "Does a trade licence need translating?",
    answer:
      "UAE trade licences are generally issued bilingually, so the usual job is translating one into a third language for a foreign bank, partner or registry. Going the other way, a foreign company's registration documents need legalising and translating into Arabic before a UAE authority will act on them. Which direction you are going changes everything about the work.",
    service: SERVICE,
    phrases: [
      "does a trade licence need translating",
      "translate my trade licence for a foreign bank",
      "commercial registration translation uae",
      "company licence translation dubai",
    ],
    keywords: [["trade", "licence", "translating"], ["trade", "licence", "foreign", "bank"], ["commercial", "registration", "translation"]],
    next: ["tr-doc-moa", "tr-doc-certificate-of-incorporation", "tr-uae-translation-for-abroad"],
  },
  {
    id: "tr-doc-moa",
    question: "Does a memorandum of association need legal translation?",
    answer:
      "A mainland MoA is notarised in Arabic, so the Arabic is the instrument rather than a translation of one — and the English version beside it is for the shareholders' benefit. That makes accuracy in both columns a commercial matter, not a formality: profit shares, management powers and signing authority are exactly the clauses a loose translation blurs.",
    service: SERVICE,
    phrases: [
      "does a memorandum of association need legal translation",
      "translate an moa for the dubai notary",
      "memorandum of association arabic version",
      "articles of association translation uae",
    ],
    keywords: [["memorandum", "association", "legal", "translation"], ["memorandum", "association", "arabic"], ["articles", "association", "translation"]],
    next: ["tr-notary-what-is-needed", "tr-which-version-prevails", "tr-doc-board-resolution"],
  },
  {
    id: "tr-doc-board-resolution",
    question: "Does a board resolution need translating?",
    answer:
      "For filing with a UAE authority or presenting to a notary, yes, in Arabic, and the person named as authorised has to be authorised on the underlying documents too. A resolution passed abroad also needs the legalisation chain behind it before anyone here will act on it. The translation is the easy half; the authority to sign is where these fail.",
    service: SERVICE,
    phrases: [
      "does a board resolution need translating",
      "translate a board resolution into arabic",
      "shareholder resolution translation dubai",
      "company resolution for a uae authority",
    ],
    keywords: [["board", "resolution", "translating"], ["board", "resolution", "arabic"], ["shareholder", "resolution", "translation"]],
    next: ["tr-doc-moa", "tr-notary-what-is-needed", "tr-doc-certificate-of-incorporation"],
  },
  {
    id: "tr-doc-certificate-of-incorporation",
    question: "Does a certificate of incorporation need translating?",
    answer:
      "To open a bank account, register a branch or appear as a shareholder here, a foreign company's incorporation documents are legalised in the home country, attested by MoFAIC, and translated into Arabic by a licensed translator. The set required is usually more than the certificate alone — the register of directors and the constitutional documents tend to come with it.",
    service: SERVICE,
    phrases: [
      "does a certificate of incorporation need translating",
      "translate foreign company documents for the uae",
      "incorporation certificate translation dubai",
      "registering my overseas company here documents",
    ],
    keywords: [["certificate", "incorporation", "translating"], ["foreign", "company", "documents", "uae"], ["incorporation", "certificate", "translation"]],
    next: ["tr-doc-trade-licence", "tr-doc-board-resolution", "tr-mofa-steps"],
  },
  {
    id: "tr-doc-audit-report",
    question: "Do audited accounts need translating?",
    answer:
      "Where they are being filed or presented to a UAE authority or bank in another language, yes. Financial statements are a specialist translation — the line items are terms of art and the notes carry the meaning — so they are better handled by someone who has done accounts before, not simply by whoever is available and licensed.",
    service: SERVICE,
    phrases: [
      "do audited accounts need translating",
      "translate financial statements into arabic",
      "audit report translation dubai",
      "annual accounts translation for a uae bank",
    ],
    keywords: [["audited", "accounts", "translating"], ["financial", "statements", "arabic"], ["audit", "report", "translation"]],
    next: ["tr-doc-bank-statement", "tr-tech-terminology", "tr-doc-trade-licence"],
  },
  {
    id: "tr-doc-invoice",
    question: "Do invoices and shipping documents need translating?",
    answer:
      "Customs and some free zone processes ask for Arabic where the paperwork is in another language, and a mismatch between an invoice and a packing list is a clearance delay rather than a translation problem. For recurring shipments it is worth agreeing the terminology once so every consignment reads the same way.",
    service: SERVICE,
    phrases: [
      "do invoices and shipping documents need translating",
      "translate customs documents for the uae",
      "commercial invoice translation dubai",
      "shipping paperwork arabic translation",
    ],
    keywords: [["invoices", "shipping", "documents", "translating"], ["customs", "documents", "uae"], ["commercial", "invoice", "translation"]],
    next: ["tr-tech-terminology", "tr-doc-trade-licence", "tr-proc-repeat-work"],
  },
  {
    id: "tr-doc-insurance",
    question: "Does an insurance policy need translating?",
    answer:
      "For a claim or a dispute here, the Arabic is what gets read, and policy wording is where small translation choices change what is covered. If you are relying on a policy written in another language, having the operative clauses properly rendered before you need them is worth more than doing it under pressure afterwards.",
    service: SERVICE,
    phrases: [
      "does an insurance policy need translating",
      "translate an insurance policy into arabic",
      "insurance claim documents translation dubai",
      "policy wording translation for a claim",
    ],
    keywords: [["insurance", "policy", "translating"], ["insurance", "policy", "arabic"], ["insurance", "claim", "documents", "translation"]],
    next: ["tr-which-version-prevails", "tr-doc-medical-report", "tr-quality-review"],
  },
  {
    id: "tr-doc-will",
    question: "Does a will need legal translation?",
    answer:
      "A will intended to operate here is normally registered in Arabic or bilingually, depending on which registry it goes to, and the translation is part of the instrument rather than a convenience. A will drafted abroad may need legalising and translating before anyone here can act on it, and whether it will be recognised at all is a legal question for a lawyer rather than a translation question.",
    service: SERVICE,
    phrases: [
      "does a will need legal translation",
      "translate a will for registration in dubai",
      "foreign will translation for the uae",
      "my will is in english will that work here",
    ],
    keywords: [["will", "need", "legal", "translation"], ["translate", "a", "will", "registration"], ["foreign", "will", "translation"]],
    next: ["tr-doc-inheritance", "tr-uae-translation-for-abroad", "tr-quality-review"],
  },
  {
    id: "tr-doc-inheritance",
    question: "What does an inheritance file need translated?",
    answer:
      "Typically the death certificate, proof of relationship, any will or succession certificate, and whatever the court or bank holding the asset asks for — all legalised where they were issued abroad and then translated into Arabic. These files are assembled under time pressure and refused for missing parts, so getting the list from the receiving body first is the step that saves the most.",
    service: SERVICE,
    phrases: [
      "what does an inheritance file need translated",
      "succession certificate translation for the uae",
      "documents for inheritance in dubai translation",
      "translating papers to claim an estate here",
    ],
    keywords: [["inheritance", "file", "translated"], ["succession", "certificate", "translation"], ["inheritance", "dubai", "translation"]],
    next: ["tr-doc-death-certificate", "tr-doc-will", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-doc-name-change",
    question: "Does a name change deed need translating?",
    answer:
      "Yes, and it is one of the documents most worth getting right, because its whole job is to connect two names that otherwise look like two people. It needs the legalisation chain if it was issued abroad, and the translated version has to render both spellings exactly as they appear on the passports involved.",
    service: SERVICE,
    phrases: [
      "does a name change deed need translating",
      "translate a deed poll for the uae",
      "name change document translation dubai",
      "my documents are in my maiden name",
    ],
    keywords: [["name", "change", "deed", "translating"], ["deed", "poll", "uae"], ["name", "change", "document", "translation"]],
    next: ["tr-reject-name-spelling", "tr-doc-passport", "tr-mofa-steps"],
  },
  {
    id: "tr-doc-adoption",
    question: "Do adoption papers need translating?",
    answer:
      "Yes, and they are handled as court documents: full legalisation chain, complete translation including annexes, nothing summarised. Whether a foreign adoption is recognised for a particular UAE purpose is a legal question, and it is worth having that answered before spending on a long translation.",
    service: SERVICE,
    phrases: [
      "do adoption papers need translating",
      "translate adoption documents for the uae",
      "adoption order translation dubai",
      "guardianship papers for my adopted child",
    ],
    keywords: [["adoption", "papers", "translating"], ["adoption", "documents", "uae"], ["adoption", "order", "translation"]],
    next: ["tr-doc-custody", "tr-court-foreign-judgment", "tr-doc-birth-certificate"],
  },
  {
    id: "tr-doc-noc",
    question: "Does a no objection letter need translating?",
    answer:
      "If the body receiving it works in Arabic and the letter is not, yes — and an NOC is usually short, so the translation is the small part. The larger question is whether the letter says what the recipient needs it to say, because a correctly translated NOC that omits the required point is still refused.",
    service: SERVICE,
    phrases: [
      "does a no objection letter need translating",
      "translate an noc into arabic",
      "no objection certificate translation dubai",
      "sponsor letter translation for the uae",
    ],
    keywords: [["objection", "letter", "translating"], ["noc", "into", "arabic"], ["objection", "certificate", "translation"]],
    next: ["tr-who-decides-requirement", "tr-proc-how-to-send", "tr-quality-review"],
  },
  {
    id: "tr-doc-academic-paper",
    question: "Can research papers and theses be translated?",
    answer:
      "Yes, and this is subject-matter work rather than certification work — the reader is an examiner or a journal, and terminology consistency across a long document matters more than a stamp. If a university also wants the award certified, that is a separate, shorter job on the certificate rather than on the thesis.",
    service: SERVICE,
    phrases: [
      "can research papers and theses be translated",
      "translate my thesis into arabic or english",
      "academic paper translation dubai",
      "dissertation translation for a university",
    ],
    keywords: [["research", "papers", "theses", "translated"], ["thesis", "into", "arabic"], ["academic", "paper", "translation"]],
    next: ["tr-tech-terminology", "tr-doc-transcript", "tr-proc-page-count"],
  },
  {
    id: "tr-doc-tender",
    question: "Do tender documents need translating?",
    answer:
      "Government tenders here are normally issued and answered in Arabic, and a bid that arrives in the wrong language can be set aside on that basis alone regardless of its merits. Tender work is deadline-bound and terminology-heavy, so the realistic move is to agree the glossary and the format early rather than to send the whole pack at the last moment.",
    service: SERVICE,
    phrases: [
      "do tender documents need translating",
      "translate a tender submission into arabic",
      "bid document translation dubai",
      "rfp translation for a uae government tender",
    ],
    keywords: [["tender", "documents", "translating"], ["tender", "submission", "arabic"], ["bid", "document", "translation"]],
    next: ["tr-tech-terminology", "tr-doc-boq", "tr-proc-urgent"],
  },
  {
    id: "tr-doc-boq",
    question: "Can a bill of quantities or specification be translated?",
    answer:
      "Yes. These are dense, repetitive and mostly tables, so the work is as much about preserving the structure as the words — a specification whose item numbering has shifted is worse than useless to a quantity surveyor. Send it in an editable format if you have one; a scanned table takes considerably more work to rebuild.",
    service: SERVICE,
    phrases: [
      "can a bill of quantities be translated",
      "translate a technical specification into arabic",
      "boq translation for a construction tender",
      "specification document translation dubai",
    ],
    keywords: [["bill", "quantities", "translated"], ["technical", "specification", "arabic"], ["specification", "document", "translation"]],
    next: ["tr-tech-drawings", "tr-doc-tender", "tr-proc-file-formats"],
  },

  /* ── Courts, police and prosecution ────────────────────────────────────── */
  {
    id: "tr-court-dubai-requirements",
    question: "What does Dubai Courts require a translation to look like?",
    answer:
      "Arabic, complete, and produced by a translator the court accepts — which in practice means a Ministry of Justice licensed legal translator, with the stamp and licence number on the document. Exhibits are translated in full rather than in extract, because the other side is entitled to read what you filed. Procedural details are set by the court and by your lawyer's filing practice, so take the format from them.",
    service: SERVICE,
    phrases: [
      "what does dubai courts require a translation to look like",
      "translation requirements for filing at dubai courts",
      "how must court documents be translated in dubai",
      "court accepted translation format uae",
    ],
    keywords: [["dubai", "courts", "require", "translation"], ["translation", "requirements", "filing"], ["court", "accepted", "translation", "format"]],
    next: ["tr-court-exhibits", "tr-court-foreign-judgment", "tr-interp-court"],
  },
  {
    id: "tr-court-difc",
    question: "Do DIFC or ADGM cases need Arabic translations?",
    answer:
      "Those courts work in English, so an English document generally needs no translation to be filed there. Two things still catch people out: a document in a third language still needs an English translation, and anything that has to be enforced outside those jurisdictions — against a mainland asset, for instance — needs Arabic at that point. Enforcement is where the translation bill usually appears.",
    service: SERVICE,
    phrases: [
      "do difc or adgm cases need arabic translations",
      "is english enough for the difc courts",
      "adgm filing language requirements",
      "difc court document translation",
    ],
    keywords: [["difc", "adgm", "arabic", "translations"], ["english", "enough", "difc", "courts"], ["adgm", "filing", "language"]],
    next: ["tr-english-only-departments", "tr-court-enforcement", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-foreign-judgment",
    question: "How do I get a foreign judgment translated for use here?",
    answer:
      "The judgment is legalised in the country that issued it, attested by MoFAIC, and then translated into Arabic in full by a licensed legal translator — operative parts, reasoning, annexes and all. Whether the judgment can then be recognised or enforced here is a legal question for a lawyer; the translation is a precondition, not the decision.",
    service: SERVICE,
    phrases: [
      "how do i get a foreign judgment translated for use here",
      "translate an overseas court judgment for the uae",
      "enforcing a foreign judgment translation requirement",
      "foreign court order translation dubai",
    ],
    keywords: [["foreign", "judgment", "translated"], ["overseas", "court", "judgment"], ["foreign", "court", "order", "translation"]],
    next: ["tr-court-enforcement", "tr-mofa-steps", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-enforcement",
    question: "What translation does an enforcement application need?",
    answer:
      "Everything the enforcing court will read, in Arabic — the judgment or award, proof it is final, proof of service, and the legalisation chain behind each. Enforcement files are refused on completeness more often than on substance, so the checklist from whoever is running the application should drive the translation order rather than the other way round.",
    service: SERVICE,
    phrases: [
      "what translation does an enforcement application need",
      "translating documents to enforce an award in dubai",
      "execution case translation requirements",
      "enforcing an arbitration award translation",
    ],
    keywords: [["enforcement", "application", "translation"], ["execution", "case", "translation"], ["arbitration", "award", "translation"]],
    next: ["tr-court-arbitration", "tr-court-foreign-judgment", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-arbitration",
    question: "Do arbitration documents need certified translation?",
    answer:
      "Inside the arbitration, the tribunal and the agreed rules decide the language, and many UAE-seated arbitrations run in English throughout. The moment an award goes to a court for ratification or enforcement, Arabic becomes necessary. Planning for that at the start is cheaper than translating a five-hundred-page record at the end.",
    service: SERVICE,
    phrases: [
      "do arbitration documents need certified translation",
      "language of arbitration in the uae and translation",
      "translating an arbitral award into arabic",
      "arbitration bundle translation dubai",
    ],
    keywords: [["arbitration", "documents", "certified", "translation"], ["arbitral", "award", "arabic"], ["arbitration", "bundle", "translation"]],
    next: ["tr-court-enforcement", "tr-court-exhibits", "tr-interp-arbitration"],
  },
  {
    id: "tr-court-exhibits",
    question: "Do all the exhibits have to be translated?",
    answer:
      "Anything the court is asked to rely on, yes. Where a bundle is enormous, the usual approach is to agree with your lawyer which documents are genuinely relied on and translate those in full rather than to summarise everything — a partial translation of a document you are relying on invites the other side to object to it. That decision belongs to the lawyer running the case.",
    service: SERVICE,
    phrases: [
      "do all the exhibits have to be translated",
      "does every page of my evidence need translating",
      "translating a court bundle in dubai",
      "can i translate only the relevant parts of a document",
    ],
    keywords: [["exhibits", "have", "translated"], ["evidence", "need", "translating"], ["court", "bundle", "dubai"]],
    next: ["tr-court-dubai-requirements", "tr-proc-page-count", "tr-court-partial"],
  },
  {
    id: "tr-court-partial",
    question: "Can a translation cover only part of a document?",
    answer:
      "An extract translation exists and is sometimes accepted, but it has to be labelled as one, and many authorities refuse it outright — a certified translation is normally expected to cover the whole page including seals, marginal notes and the reverse side. Where someone has offered you a cheaper \"relevant parts only\" version, check acceptability with the receiving body before agreeing to it.",
    service: SERVICE,
    phrases: [
      "can a translation cover only part of a document",
      "is an extract translation acceptable",
      "do the stamps and seals need translating as well",
      "partial translation of a certificate",
    ],
    keywords: [["translation", "only", "part", "document"], ["extract", "translation", "acceptable"], ["stamps", "seals", "need", "translating"]],
    next: ["tr-reject-common-reasons", "tr-court-exhibits", "tr-certified-vs-ordinary"],
  },
  {
    id: "tr-court-police-statement",
    question: "What happens about language at a police station?",
    answer:
      "Statements are recorded in Arabic, so if you do not read Arabic you should not be signing one you cannot check — an interpreter's presence is the normal answer, and asking for one is a reasonable request rather than an obstruction. Whether a particular station provides one or expects you to bring one varies, so ask at the outset rather than after the statement is written.",
    service: SERVICE,
    phrases: [
      "what happens about language at a police station",
      "do i need an interpreter at the police station in dubai",
      "police statement in arabic i cannot read",
      "signing a police statement i do not understand",
    ],
    keywords: [["interpreter", "police", "station"], ["police", "statement", "arabic"], ["signing", "police", "statement"]],
    next: ["tr-interp-police", "tr-court-prosecution", "tr-interp-court"],
  },
  {
    id: "tr-court-prosecution",
    question: "What about language at the public prosecution?",
    answer:
      "The same principle as the police stage: proceedings are in Arabic and what is recorded is the Arabic. If you are attending without a lawyer and without Arabic, an interpreter is not a luxury — the record made that day is what later stages work from. Raise the language question before the session begins.",
    service: SERVICE,
    phrases: [
      "what about language at the public prosecution",
      "interpreter for a prosecution hearing in dubai",
      "public prosecution summons i cannot read",
      "attending prosecution without arabic",
    ],
    keywords: [["language", "public", "prosecution"], ["interpreter", "prosecution", "hearing"], ["prosecution", "summons", "read"]],
    next: ["tr-court-police-statement", "tr-interp-court", "tr-court-summons"],
  },
  {
    id: "tr-court-summons",
    question: "I received a court document in Arabic. What should I do?",
    answer:
      "Get it read properly and quickly, because these carry deadlines and a missed one is not easily undone. A certified translation is worth having if the matter is live, but the first step is simply to know what it says and by when — so send it over, and do not rely on a phone camera translation of a legal notice.",
    service: SERVICE,
    phrases: [
      "i received a court document in arabic what should i do",
      "translate a court notice i was given",
      "i got a legal letter in arabic",
      "arabic summons translation urgent",
    ],
    keywords: [["received", "court", "document", "arabic"], ["court", "notice", "given"], ["legal", "letter", "arabic"]],
    next: ["tr-proc-urgent", "tr-court-dubai-requirements", "tr-court-prosecution"],
  },
  {
    id: "tr-court-labour",
    question: "What translation does a labour case need?",
    answer:
      "The contract, the correspondence you are relying on, payslips and any warning or termination letters — in Arabic, complete. Where a contract exists in both languages, the Arabic filed with the authorities is the reference point, which sometimes differs from the English an employee signed. That difference is worth identifying before the case is argued, not during it.",
    service: SERVICE,
    phrases: [
      "what translation does a labour case need",
      "translating documents for a mohre complaint",
      "labour dispute translation dubai",
      "employment case documents in arabic",
    ],
    keywords: [["labour", "case", "translation"], ["mohre", "complaint", "translating"], ["labour", "dispute", "translation"]],
    next: ["tr-doc-employment-contract", "tr-which-version-prevails", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-rdc",
    question: "What does the rental disputes committee need translated?",
    answer:
      "The tenancy contract, the Ejari record, notices served and any correspondence relied on, in Arabic. Most tenancy contracts here are already bilingual, so the translation work is usually in the correspondence rather than the contract. Check the committee's current filing requirements, as the procedure is theirs to set.",
    service: SERVICE,
    phrases: [
      "what does the rental disputes committee need translated",
      "translating documents for a rent dispute in dubai",
      "rdc filing translation requirements",
      "landlord dispute paperwork translation",
    ],
    keywords: [["rental", "disputes", "committee", "translated"], ["rent", "dispute", "translating"], ["landlord", "dispute", "paperwork"]],
    next: ["tr-doc-tenancy", "tr-court-dubai-requirements", "tr-proc-urgent"],
  },
  {
    id: "tr-court-personal-status",
    question: "What does a personal status case need translated?",
    answer:
      "Marriage and birth certificates, any foreign divorce or custody order, and proof of the law you are asking to have applied where that arises — all legalised if issued abroad, then translated in full. These cases turn on precise family facts, so a name or a date rendered loosely is a real problem rather than a cosmetic one.",
    service: SERVICE,
    phrases: [
      "what does a personal status case need translated",
      "family court documents translation dubai",
      "translating marriage and custody papers for court",
      "personal status court translation requirements",
    ],
    keywords: [["personal", "status", "case", "translated"], ["family", "court", "documents", "translation"], ["custody", "papers", "court"]],
    next: ["tr-doc-marriage-certificate", "tr-doc-custody", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-expert-report",
    question: "Do court-appointed expert reports need translating?",
    answer:
      "The report itself will be in Arabic, and if you need to respond to it you need to understand it properly — a summary from someone else is not enough when you are being asked to comment on figures or findings. Going the other way, a report you commission in English needs translating before it can be put before the court.",
    service: SERVICE,
    phrases: [
      "do court appointed expert reports need translating",
      "translate an expert report from the court",
      "responding to an arabic expert report",
      "expert witness report translation dubai",
    ],
    keywords: [["expert", "reports", "need", "translating"], ["expert", "report", "court"], ["expert", "witness", "report", "translation"]],
    next: ["tr-court-exhibits", "tr-tech-terminology", "tr-court-dubai-requirements"],
  },
  {
    id: "tr-court-witness-statement",
    question: "How is a witness statement handled across languages?",
    answer:
      "It is taken in the language the witness actually speaks and then translated, rather than drafted in Arabic and signed by someone who cannot read it — a statement the witness did not understand is a weakness the other side will find. Where a statement is taken through an interpreter, that fact is normally recorded on it.",
    service: SERVICE,
    phrases: [
      "how is a witness statement handled across languages",
      "translating a witness statement for dubai courts",
      "my witness does not speak arabic",
      "statement taken through an interpreter",
    ],
    keywords: [["witness", "statement", "languages"], ["witness", "statement", "translating"], ["witness", "speak", "arabic"]],
    next: ["tr-interp-court", "tr-court-exhibits", "tr-court-police-statement"],
  },
  {
    id: "tr-court-power-of-attorney",
    question: "Does a litigation power of attorney need translating?",
    answer:
      "A power of attorney used before a UAE court is in Arabic and has to spell out the litigation powers being granted act by act — courts read these narrowly, and a general authority often will not do. If it was signed abroad it needs the legalisation chain and then the Arabic. This is the document where a cheap translation costs a hearing.",
    service: SERVICE,
    phrases: [
      "does a litigation power of attorney need translating",
      "translate a power of attorney for a court case",
      "poa for litigation in dubai translation",
      "authorising a lawyer from abroad translation",
    ],
    keywords: [["litigation", "power", "attorney", "translating"], ["power", "attorney", "court", "case"], ["poa", "litigation", "translation"]],
    next: ["tr-notary-poa", "tr-court-dubai-requirements", "tr-mofa-steps"],
  },
  {
    id: "tr-court-criminal-record",
    question: "Do I need a translation for a travel ban or case check?",
    answer:
      "The records and notices are in Arabic, so yes if you need to act on them. Whether a ban or a case exists at all is a question for the authority or a lawyer with access to the file, not something a translation answers — but once you have the document, understanding exactly what it says is the difference between resolving it and guessing.",
    service: SERVICE,
    phrases: [
      "do i need a translation for a travel ban check",
      "translate a case document about a travel ban",
      "arabic court record i need explained",
      "translation of a police case notice",
    ],
    keywords: [["travel", "ban", "check", "translation"], ["case", "document", "travel", "ban"], ["police", "case", "notice", "translation"]],
    next: ["tr-court-summons", "tr-court-prosecution", "tr-proc-urgent"],
  },

  /* ── Technical and specialist ──────────────────────────────────────────── */
  {
    id: "tr-tech-terminology",
    question: "How is terminology kept consistent across a long document?",
    answer:
      "With a glossary agreed before the work starts, and a translation memory so the same term is rendered the same way on page two hundred as on page two. On regulated or engineering material this matters more than style: a component called three different things across a specification reads as three components. If you already have approved Arabic terminology, send it — it is worth more than any instruction.",
    service: SERVICE,
    phrases: [
      "how is terminology kept consistent across a long document",
      "do you use a glossary for technical translation",
      "translation memory and consistent terms",
      "keeping technical terms the same throughout",
    ],
    keywords: [["terminology", "consistent", "long", "document"], ["glossary", "technical", "translation"], ["translation", "memory", "consistent", "terms"]],
    next: ["tr-what-is-technical-translation", "tr-proc-repeat-work", "tr-quality-review"],
  },
  {
    id: "tr-tech-medical",
    question: "Who should translate a medical or pharmaceutical document?",
    answer:
      "Someone with the clinical vocabulary, working to the certification the receiving body requires — a regulator, an insurer and a court each want something different from the same report. Drug names, dosages and units are where errors are dangerous rather than merely embarrassing, so these are checked rather than trusted to a single pass.",
    service: SERVICE,
    phrases: [
      "who should translate a medical document",
      "pharmaceutical translation requirements in the uae",
      "clinical document translation dubai",
      "medical terminology translation into arabic",
    ],
    keywords: [["translate", "medical", "document"], ["pharmaceutical", "translation", "requirements"], ["clinical", "document", "translation"]],
    next: ["tr-doc-medical-report", "tr-tech-clinical-trial", "tr-tech-terminology"],
  },
  {
    id: "tr-tech-clinical-trial",
    question: "Can clinical trial documents be translated?",
    answer:
      "Yes, and consent forms are the part that carries the most weight: a participant has to understand what they are agreeing to in their own language, which is an ethics requirement rather than a courtesy. Protocols, investigator brochures and regulatory submissions are all standard work, handled to whatever the approving authority specifies.",
    service: SERVICE,
    phrases: [
      "can clinical trial documents be translated",
      "informed consent form translation uae",
      "trial protocol translation into arabic",
      "research ethics documents translation dubai",
    ],
    keywords: [["clinical", "trial", "documents", "translated"], ["informed", "consent", "form", "translation"], ["trial", "protocol", "arabic"]],
    next: ["tr-tech-medical", "tr-tech-regulatory", "tr-tech-terminology"],
  },
  {
    id: "tr-tech-drawings",
    question: "Can engineering drawings be translated?",
    answer:
      "Yes — titles, legends, notes and dimension callouts, with the layout preserved so the drawing is still readable. The practical question is the file: a native CAD or editable file lets the text be replaced in place, while a flattened scan means rebuilding the annotation layer, which is a different amount of work. Send whatever you have and say what it will be submitted to.",
    service: SERVICE,
    phrases: [
      "can engineering drawings be translated",
      "translate cad drawing annotations into arabic",
      "drawing title block translation dubai",
      "technical drawings for municipality submission translation",
    ],
    keywords: [["engineering", "drawings", "translated"], ["cad", "drawing", "annotations"], ["drawing", "title", "block", "translation"]],
    next: ["tr-proc-file-formats", "tr-tech-civil-defence", "tr-doc-boq"],
  },
  {
    id: "tr-tech-sds",
    question: "Do safety data sheets need Arabic?",
    answer:
      "For products placed on the UAE market, Arabic labelling and safety information is generally expected, and the format is set by the regulator rather than by preference. Safety data sheets have a fixed section structure that has to survive translation intact — a reordered or abbreviated sheet is a compliance problem, not a translation preference. Confirm the current requirement with the authority for your product category.",
    service: SERVICE,
    phrases: [
      "do safety data sheets need arabic",
      "translate an sds or msds for the uae",
      "chemical safety sheet translation dubai",
      "product safety documentation in arabic",
    ],
    keywords: [["safety", "data", "sheets", "arabic"], ["chemical", "safety", "sheet", "translation"], ["product", "safety", "documentation", "arabic"]],
    next: ["tr-tech-regulatory", "tr-tech-labelling", "tr-tech-terminology"],
  },
  {
    id: "tr-tech-labelling",
    question: "Does product labelling have to be in Arabic?",
    answer:
      "For most consumer goods sold here, Arabic on the label is a requirement, and what exactly must appear depends on the product category and the authority regulating it. Label space forces hard choices about wording, so it is worth doing this alongside whoever handles your registration rather than translating a label in isolation and finding it does not fit the template.",
    service: SERVICE,
    phrases: [
      "does product labelling have to be in arabic",
      "arabic labelling requirements for the uae market",
      "translate packaging text into arabic",
      "label translation for product registration",
    ],
    keywords: [["product", "labelling", "arabic"], ["arabic", "labelling", "requirements", "market"], ["packaging", "text", "arabic"]],
    next: ["tr-tech-regulatory", "tr-tech-sds", "tr-tech-marketing"],
  },
  {
    id: "tr-tech-regulatory",
    question: "What do regulatory submissions need in terms of translation?",
    answer:
      "Whatever the regulator's own guidance says, which is specific and does change — sometimes a certified translation, sometimes a company declaration, sometimes both. The reliable approach is to get their current checklist, then translate to it, rather than to translate a dossier first and discover the format was wrong. We will read the checklist with you before anything starts.",
    service: SERVICE,
    phrases: [
      "what do regulatory submissions need in terms of translation",
      "translation for a product registration dossier",
      "regulator required translation format uae",
      "submitting a technical file in arabic",
    ],
    keywords: [["regulatory", "submissions", "translation"], ["product", "registration", "dossier"], ["technical", "file", "arabic"]],
    quote: true,
  },
  {
    id: "tr-tech-civil-defence",
    question: "Do civil defence or municipality submissions need Arabic?",
    answer:
      "Commonly yes, and these authorities are specific about format as well as language — a drawing set or a method statement that is correct but laid out differently from what they expect is still sent back. Work from the current submission requirements for that authority and that emirate, and translate to them.",
    service: SERVICE,
    phrases: [
      "do civil defence submissions need arabic",
      "municipality submission translation requirements dubai",
      "translate a method statement into arabic",
      "authority approval documents translation",
    ],
    keywords: [["civil", "defence", "submissions", "arabic"], ["municipality", "submission", "translation"], ["method", "statement", "arabic"]],
    next: ["tr-tech-drawings", "tr-tech-regulatory", "tr-doc-boq"],
  },
  {
    id: "tr-tech-patent",
    question: "Can patents and patent applications be translated?",
    answer:
      "Yes, and patent translation is its own discipline — the claims define the scope of protection, so a word changed is a right changed. This is work for someone who has translated claims before and who will flag an ambiguity rather than resolve it silently. Filing requirements come from the office you are filing at, so start from their rules.",
    service: SERVICE,
    phrases: [
      "can patents be translated",
      "patent application translation into arabic",
      "translating patent claims for a uae filing",
      "intellectual property document translation dubai",
    ],
    keywords: [["patents", "be", "translated"], ["patent", "application", "translation"], ["patent", "claims", "filing"]],
    next: ["tr-tech-terminology", "tr-tech-trademark", "tr-quality-review"],
  },
  {
    id: "tr-tech-trademark",
    question: "Do trademark filings need translation?",
    answer:
      "Supporting documents generally do, in Arabic, and there is a second question people miss: how the mark itself reads in Arabic. A transliteration that means something unintended is a commercial problem rather than a legal one, and it is much cheaper to discover before filing than after launch.",
    service: SERVICE,
    phrases: [
      "do trademark filings need translation",
      "translate trademark documents for the uae",
      "how will my brand name read in arabic",
      "trademark application translation dubai",
    ],
    keywords: [["trademark", "filings", "translation"], ["trademark", "documents", "uae"], ["brand", "name", "read", "arabic"]],
    next: ["tr-tech-marketing", "tr-tech-patent", "tr-lang-transliteration"],
  },
  {
    id: "tr-tech-software",
    question: "Can software and app content be localised into Arabic?",
    answer:
      "Yes, and the hard part is rarely the words — Arabic runs right to left, so interfaces need mirroring, strings expand and contract, and text baked into images has to be rebuilt. Send the string files rather than screenshots, and plan for a round of review inside the running product, because a string that reads well in a spreadsheet can be wrong in a button.",
    service: SERVICE,
    phrases: [
      "can software be localised into arabic",
      "app localisation into arabic dubai",
      "translate my website into arabic properly",
      "right to left layout for arabic content",
    ],
    keywords: [["software", "localised", "arabic"], ["app", "localisation", "arabic"], ["right", "left", "layout", "arabic"]],
    next: ["tr-tech-marketing", "tr-proc-file-formats", "tr-tech-terminology"],
  },
  {
    id: "tr-tech-marketing",
    question: "Is marketing copy translated differently?",
    answer:
      "Yes — it is adapted rather than translated, because a slogan that works in one language usually does not survive a literal rendering. That is a different brief and a different kind of reviewer from a certified document, and the two should not be given to the same process. Say up front that the text is persuasive rather than procedural.",
    service: SERVICE,
    phrases: [
      "is marketing copy translated differently",
      "translate advertising material into arabic",
      "transcreation of brand copy for the gulf",
      "marketing translation dubai",
    ],
    keywords: [["marketing", "copy", "translated", "differently"], ["advertising", "material", "arabic"], ["marketing", "translation", "dubai"]],
    next: ["tr-tech-software", "tr-lang-dialects", "tr-tech-trademark"],
  },
  {
    id: "tr-tech-manual",
    question: "Can user manuals and operating instructions be translated?",
    answer:
      "Yes, and this is where terminology discipline pays for itself, because a manual is read by someone holding the machine. Warnings and safety notices are the sections to get reviewed properly — they are also usually the ones a regulator checks first. An editable source file makes the layout work considerably lighter.",
    service: SERVICE,
    phrases: [
      "can user manuals be translated",
      "translate operating instructions into arabic",
      "equipment manual translation dubai",
      "installation guide translation for the uae",
    ],
    keywords: [["user", "manuals", "be", "translated"], ["operating", "instructions", "arabic"], ["equipment", "manual", "translation"]],
    next: ["tr-tech-terminology", "tr-proc-file-formats", "tr-tech-sds"],
  },
  {
    id: "tr-tech-hse",
    question: "Can HSE and training material be translated?",
    answer:
      "Yes, and it is one of the clearest cases for translating into the languages the workforce actually reads rather than only into Arabic and English. Safety material that a crew cannot read is a paper exercise. Say which languages your teams use and the work can be scoped around that rather than around a default pair.",
    service: SERVICE,
    phrases: [
      "can hse and training material be translated",
      "safety training translation for workers",
      "toolbox talk translation into urdu and hindi",
      "workforce safety material translation dubai",
    ],
    keywords: [["hse", "training", "material", "translated"], ["safety", "training", "translation", "workers"], ["workforce", "safety", "material"]],
    next: ["tr-lang-south-asian", "tr-tech-manual", "tr-tech-sds"],
  },
  {
    id: "tr-tech-oil-gas",
    question: "Do you handle oil, gas and energy documentation?",
    answer:
      "Yes — specifications, procedures, inspection reports and contracts. The vocabulary is standardised within the industry and differs between operators, so an existing glossary or a previous approved translation is the most useful thing you can send with the first job. Where the document is contractual as well as technical, it is treated as both.",
    service: SERVICE,
    phrases: [
      "do you handle oil and gas documentation",
      "energy sector translation in the uae",
      "translate inspection reports into arabic",
      "industrial documentation translation dubai",
    ],
    keywords: [["oil", "gas", "documentation"], ["energy", "sector", "translation"], ["inspection", "reports", "arabic"]],
    next: ["tr-tech-terminology", "tr-tech-manual", "tr-doc-tender"],
  },
  {
    id: "tr-tech-it-security",
    question: "Can IT and cybersecurity documents be translated?",
    answer:
      "Yes — policies, audit findings, incident reports and compliance documentation. Two cautions: much of the vocabulary is used in English even in Arabic documents, so a fully Arabised version can read oddly to the specialists who have to use it, and security material is sensitive, which is a confidentiality question worth settling before you send anything.",
    service: SERVICE,
    phrases: [
      "can it and cybersecurity documents be translated",
      "translate a security policy into arabic",
      "audit findings translation dubai",
      "compliance documentation translation uae",
    ],
    keywords: [["cybersecurity", "documents", "translated"], ["security", "policy", "arabic"], ["compliance", "documentation", "translation"]],
    next: ["tr-proc-confidentiality", "tr-tech-terminology", "tr-doc-audit-report"],
  },
  {
    id: "tr-tech-certified-and-technical",
    question: "Can one document be both technical and certified?",
    answer:
      "Yes, and that combination is common — a medical report for a court, an engineering report for a ministry. It is handled as two requirements on one document: the subject-matter work to get the terminology right, and a licensed legal translator's certification to make it submittable. Tell us both the subject and the recipient and it can be scoped properly the first time.",
    service: SERVICE,
    phrases: [
      "can one document be both technical and certified",
      "certified translation of a technical report",
      "do i need a legal translator for a technical document",
      "technical document that also needs a stamp",
    ],
    keywords: [["both", "technical", "certified"], ["certified", "translation", "technical", "report"], ["legal", "translator", "technical", "document"]],
    next: ["tr-what-is-technical-translation", "tr-who-may-translate", "tr-tech-terminology"],
  },
  {
    id: "tr-tech-handwriting",
    question: "Can handwritten documents be translated?",
    answer:
      "Usually, but legibility sets the limit, and a translator will mark a passage illegible rather than guess — which is the correct behaviour, not a failure. Old handwritten certificates and doctors' notes are the common cases. If you can get a clearer copy or a typed transcript from the issuer, that is worth more than a higher-resolution photograph of the same handwriting.",
    service: SERVICE,
    phrases: [
      "can handwritten documents be translated",
      "translate a handwritten certificate",
      "my document is handwritten and hard to read",
      "illegible document translation dubai",
    ],
    keywords: [["handwritten", "documents", "translated"], ["handwritten", "certificate", "translate"], ["illegible", "document", "translation"]],
    next: ["tr-proc-scan-quality", "tr-proc-originals", "tr-quality-accuracy"],
  },
  {
    id: "tr-tech-tables",
    question: "What happens to tables, stamps and layout?",
    answer:
      "A certified translation is expected to mirror the original's structure, so tables stay tables and stamps are described in place — \"[round seal: Ministry of Education]\" rather than quietly omitted. That is why a translation sometimes looks odd: it is reproducing a document, not writing a clean one. If you need a presentation-quality layout as well, say so, because that is extra work on top.",
    service: SERVICE,
    phrases: [
      "what happens to tables and stamps in a translation",
      "does the translation keep the original layout",
      "how are seals shown in a certified translation",
      "formatting of a translated document",
    ],
    keywords: [["tables", "stamps", "translation"], ["translation", "keep", "original", "layout"], ["seals", "shown", "certified", "translation"]],
    next: ["tr-court-partial", "tr-proc-file-formats", "tr-tech-drawings"],
  },

  /* ── Interpretation ────────────────────────────────────────────────────── */
  {
    id: "tr-interp-simultaneous-vs-consecutive",
    question: "What is the difference between simultaneous and consecutive interpreting?",
    answer:
      "Simultaneous runs at the same time as the speaker, through headsets, and is what conferences use — it needs booths or equipment and interpreters working in pairs because it cannot be sustained alone. Consecutive waits for the speaker to pause and is what meetings, depositions and appointments use: slower, no equipment, and easier to correct. Choosing the wrong one is usually a budget surprise rather than a failure.",
    service: SERVICE,
    phrases: [
      "difference between simultaneous and consecutive interpreting",
      "what kind of interpreting do i need for my event",
      "simultaneous interpreting explained",
      "consecutive interpreting meaning",
    ],
    keywords: [["simultaneous", "consecutive", "interpreting"], ["simultaneous", "interpreting", "explained"], ["consecutive", "interpreting", "meaning"]],
    next: ["tr-interp-conference", "tr-interp-business", "tr-interp-equipment"],
  },
  {
    id: "tr-interp-court",
    question: "How do I arrange an interpreter for a court hearing?",
    answer:
      "Through the court where it appoints one, or by arranging a legal interpreter in advance where you are expected to bring one — your lawyer will know which applies to your hearing. Book early and send the case documents beforehand: an interpreter who has read the file performs very differently from one hearing the terminology for the first time in the room.",
    service: SERVICE,
    phrases: [
      "how do i arrange an interpreter for a court hearing",
      "court interpreter in dubai",
      "i need someone to interpret at my hearing",
      "legal interpreter for a case in the uae",
    ],
    keywords: [["interpreter", "court", "hearing"], ["court", "interpreter", "dubai"], ["legal", "interpreter", "case"]],
    next: ["tr-interp-preparation", "tr-court-witness-statement", "tr-interp-sworn"],
  },
  {
    id: "tr-interp-sworn",
    question: "Does a court interpreter have to be certified?",
    answer:
      "For proceedings, the interpreter has to be one the forum accepts, and in practice that means a legal interpreter recognised for that language rather than a bilingual relative. The point is impartiality as much as skill: a family member interpreting for you in a legal setting is a conflict, and a court may refuse them for that reason alone.",
    service: SERVICE,
    phrases: [
      "does a court interpreter have to be certified",
      "can a family member interpret for me in court",
      "sworn interpreter requirement uae",
      "who is allowed to interpret in legal proceedings",
    ],
    keywords: [["court", "interpreter", "certified"], ["family", "member", "interpret"], ["sworn", "interpreter", "requirement"]],
    next: ["tr-interp-court", "tr-interp-confidentiality", "tr-who-may-translate"],
  },
  {
    id: "tr-interp-police",
    question: "Can I get an interpreter for a police interview?",
    answer:
      "Yes, and you should ask for one before the interview rather than during it, because what is recorded is the Arabic. Bring or request a professional rather than relying on a friend: the record made that day travels with the case, and the person interpreting has to be both accurate and neutral.",
    service: SERVICE,
    phrases: [
      "can i get an interpreter for a police interview",
      "interpreter at a dubai police station",
      "i was called to the police and do not speak arabic",
      "police interview language help uae",
    ],
    keywords: [["interpreter", "police", "interview"], ["interpreter", "police", "station"], ["police", "interview", "language"]],
    next: ["tr-court-police-statement", "tr-interp-court", "tr-interp-availability"],
  },
  {
    id: "tr-interp-arbitration",
    question: "Do arbitration hearings need interpreters?",
    answer:
      "Where a witness or a party does not work in the hearing language, yes, and the tribunal usually wants to know in advance because it changes the timetable — consecutive interpreting roughly doubles the time a witness takes. Send the bundle and the witness statements to the interpreters beforehand; tribunals generally expect that rather than object to it.",
    service: SERVICE,
    phrases: [
      "do arbitration hearings need interpreters",
      "interpreter for an arbitration in dubai",
      "witness interpreting at a tribunal hearing",
      "arbitration hearing language arrangements",
    ],
    keywords: [["arbitration", "hearings", "interpreters"], ["interpreter", "arbitration", "dubai"], ["witness", "interpreting", "tribunal"]],
    next: ["tr-interp-preparation", "tr-court-arbitration", "tr-interp-simultaneous-vs-consecutive"],
  },
  {
    id: "tr-interp-medical",
    question: "Can I get an interpreter for a hospital appointment?",
    answer:
      "Yes. Many hospitals here have staff who can help informally, but for a consultation where consent, a diagnosis or a treatment decision is involved, a professional medical interpreter is a different standard of care. Say the specialty when you book — oncology and obstetrics are not interchangeable vocabulary — and mention if the patient prefers a particular gender of interpreter.",
    service: SERVICE,
    phrases: [
      "can i get an interpreter for a hospital appointment",
      "medical interpreter in dubai",
      "interpreter for a doctor visit in the uae",
      "language help at the hospital for my parents",
    ],
    keywords: [["interpreter", "hospital", "appointment"], ["medical", "interpreter", "dubai"], ["interpreter", "doctor", "visit"]],
    next: ["tr-interp-preparation", "tr-interp-gender", "tr-doc-medical-report"],
  },
  {
    id: "tr-interp-business",
    question: "Can I book an interpreter for a business meeting?",
    answer:
      "Yes, and consecutive interpreting is normally what a meeting needs. The single thing that improves the result most is sending an agenda and any company or product terminology in advance — an interpreter who knows what \"the Phase Two handover\" refers to will render it as that rather than describing it. Say whether the meeting is a negotiation, because that calls for a different manner.",
    service: SERVICE,
    phrases: [
      "can i book an interpreter for a business meeting",
      "business interpreter in dubai",
      "interpreter for a negotiation in the uae",
      "i need someone to interpret at a company meeting",
    ],
    keywords: [["interpreter", "business", "meeting"], ["business", "interpreter", "dubai"], ["interpreter", "negotiation", "uae"]],
    next: ["tr-interp-preparation", "tr-interp-simultaneous-vs-consecutive", "tr-interp-confidentiality"],
  },
  {
    id: "tr-interp-conference",
    question: "Can you arrange conference interpreting?",
    answer:
      "Yes — simultaneous interpreting with the equipment it needs, and interpreters working in pairs per language because nobody sustains simultaneous alone. Conference work is booked on the room and the programme as much as on the language, so the useful first message includes the date, the venue, the languages and roughly how long each session runs.",
    service: SERVICE,
    phrases: [
      "can you arrange conference interpreting",
      "simultaneous interpreters for an event in dubai",
      "conference interpreting with booths",
      "multilingual event interpreting uae",
    ],
    keywords: [["arrange", "conference", "interpreting"], ["simultaneous", "interpreters", "event"], ["multilingual", "event", "interpreting"]],
    next: ["tr-interp-equipment", "tr-interp-multiple-languages", "tr-interp-simultaneous-vs-consecutive"],
  },
  {
    id: "tr-interp-equipment",
    question: "Do I need interpreting equipment?",
    answer:
      "For simultaneous interpreting, yes — at minimum transmitters and receivers, and for larger events a soundproof booth and a technician. Portable tour-guide systems work for small mobile groups and are not suitable for a conference hall. Whether the venue already has a booth is worth checking before anything is hired, because many purpose-built ones here do.",
    service: SERVICE,
    phrases: [
      "do i need interpreting equipment",
      "interpretation booth hire dubai",
      "headsets and receivers for simultaneous interpreting",
      "what equipment does an interpreter need",
    ],
    keywords: [["interpreting", "equipment", "need"], ["interpretation", "booth", "hire"], ["headsets", "receivers", "simultaneous"]],
    next: ["tr-interp-conference", "tr-interp-venue", "tr-interp-simultaneous-vs-consecutive"],
  },
  {
    id: "tr-interp-remote",
    question: "Can interpreting be done remotely or by phone?",
    answer:
      "Yes, and for short exchanges it is often the sensible choice. What it needs is a stable connection and a clear turn-taking discipline, because remote interpreting fails on people talking over each other far more than on the language. For a hearing or a signing, check first whether the forum accepts a remote interpreter at all.",
    service: SERVICE,
    phrases: [
      "can interpreting be done remotely or by phone",
      "remote interpreter over video call",
      "telephone interpreting in the uae",
      "online interpreter for a meeting",
    ],
    keywords: [["interpreting", "remotely", "phone"], ["remote", "interpreter", "video"], ["telephone", "interpreting", "uae"]],
    next: ["tr-interp-availability", "tr-interp-business", "tr-interp-preparation"],
  },
  {
    id: "tr-interp-preparation",
    question: "What should I send an interpreter in advance?",
    answer:
      "Anything the conversation will rely on — an agenda, names and job titles, documents that will be discussed, product or case terminology, and any acronyms your side uses without thinking. Interpreters are bound to confidentiality, so material can be shared for preparation. The gap between a prepared and an unprepared interpreter is larger than the gap between two interpreters.",
    service: SERVICE,
    phrases: [
      "what should i send an interpreter in advance",
      "how do i prepare an interpreter for my meeting",
      "does the interpreter need the documents beforehand",
      "briefing an interpreter before an appointment",
    ],
    keywords: [["send", "interpreter", "advance"], ["prepare", "interpreter", "meeting"], ["briefing", "interpreter", "before"]],
    next: ["tr-interp-confidentiality", "tr-interp-business", "tr-interp-court"],
  },
  {
    id: "tr-interp-confidentiality",
    question: "Is what I say to an interpreter confidential?",
    answer:
      "Professional interpreters work under confidentiality as a matter of course, and a written undertaking can be put in place where the subject calls for it — commercial negotiations, medical consultations, anything with a case around it. If confidentiality is a real concern, say so when you book rather than at the start of the meeting.",
    service: SERVICE,
    phrases: [
      "is what i say to an interpreter confidential",
      "will the interpreter sign an nda",
      "interpreter confidentiality in the uae",
      "can i trust an interpreter with sensitive information",
    ],
    keywords: [["interpreter", "confidential"], ["interpreter", "sign", "nda"], ["interpreter", "confidentiality", "uae"]],
    next: ["tr-proc-confidentiality", "tr-interp-preparation", "tr-interp-sworn"],
  },
  {
    id: "tr-interp-availability",
    question: "How far in advance should I book an interpreter?",
    answer:
      "As early as you can, and earlier for a rare language or a fixed date you cannot move — court hearings and conferences are the two that cannot simply be rescheduled around availability. Short-notice bookings are often possible, but you are choosing from whoever is free rather than from whoever is best suited.",
    service: SERVICE,
    phrases: [
      "how far in advance should i book an interpreter",
      "can i get an interpreter at short notice",
      "booking an interpreter for tomorrow",
      "last minute interpreter in dubai",
    ],
    keywords: [["advance", "book", "interpreter"], ["interpreter", "short", "notice"], ["last", "minute", "interpreter"]],
    next: ["tr-interp-remote", "tr-interp-cancellation", "tr-lang-rare"],
  },
  {
    id: "tr-interp-cancellation",
    question: "What happens if I have to cancel an interpreter?",
    answer:
      "Interpreters block out the time, so a cancellation close to the date is usually chargeable in whole or in part — that is standard practice rather than a penalty, and the terms should be agreed in writing when you book. If a hearing is adjourned at the last minute, say so immediately; it is sometimes possible to move the booking rather than lose it.",
    service: SERVICE,
    phrases: [
      "what happens if i have to cancel an interpreter",
      "cancellation terms for an interpreter booking",
      "my hearing was adjourned and i booked an interpreter",
      "can i reschedule an interpreter",
    ],
    keywords: [["cancel", "an", "interpreter"], ["cancellation", "terms", "interpreter"], ["reschedule", "an", "interpreter"]],
    quote: true,
  },
  {
    id: "tr-interp-venue",
    question: "Will an interpreter travel to my venue?",
    answer:
      "Yes, within the UAE, and travel outside Dubai or to a remote site is arranged as part of the booking rather than assumed. Say where the assignment actually is when you ask — a site visit in another emirate and a meeting in a city office are different jobs even when the language and the hours are identical.",
    service: SERVICE,
    phrases: [
      "will an interpreter travel to my venue",
      "interpreter for a site visit outside dubai",
      "can an interpreter come to abu dhabi",
      "interpreter travel to another emirate",
    ],
    keywords: [["interpreter", "travel", "venue"], ["interpreter", "site", "visit"], ["interpreter", "another", "emirate"]],
    next: ["tr-interp-availability", "tr-interp-business", "tr-interp-remote"],
  },
  {
    id: "tr-interp-multiple-languages",
    question: "Can one event have several languages at once?",
    answer:
      "Yes, and each language needs its own team — you cannot add a third language by adding one person. Where a direct pair is unavailable, interpreting relays through a bridge language, which works but adds a beat of delay and one more link where meaning can slip. Tell us every language in the room and the setup can be planned honestly.",
    service: SERVICE,
    phrases: [
      "can one event have several languages at once",
      "interpreting into three languages at a conference",
      "relay interpreting through english",
      "multiple language interpreting setup",
    ],
    keywords: [["event", "several", "languages"], ["interpreting", "three", "languages"], ["relay", "interpreting", "through", "english"]],
    next: ["tr-interp-conference", "tr-interp-equipment", "tr-lang-rare"],
  },
  {
    id: "tr-interp-whisper",
    question: "What is whispered interpreting?",
    answer:
      "Simultaneous interpreting delivered quietly to one or two people without equipment, with the interpreter sitting beside them. It suits a board meeting where one attendee needs the language and the rest do not. It does not scale — beyond two or three listeners it becomes disruptive and the equipment answer is better.",
    service: SERVICE,
    phrases: [
      "what is whispered interpreting",
      "chuchotage interpreting explained",
      "interpreter sitting next to me at a meeting",
      "quiet interpreting for one person",
    ],
    keywords: [["whispered", "interpreting"], ["chuchotage", "interpreting"], ["quiet", "interpreting", "one", "person"]],
    next: ["tr-interp-simultaneous-vs-consecutive", "tr-interp-business", "tr-interp-equipment"],
  },
  {
    id: "tr-interp-escort",
    question: "Can I hire an interpreter to accompany me for a day?",
    answer:
      "Yes — accompanying someone through appointments, viewings, government offices or a series of meetings is a normal assignment. It is language work rather than representation, so an interpreter renders what is said and does not negotiate or advise on your behalf. If you need someone to act for you, that is a different arrangement.",
    service: SERVICE,
    phrases: [
      "can i hire an interpreter to accompany me for a day",
      "interpreter to come with me to appointments",
      "escort interpreting in dubai",
      "someone to help me at government offices language",
    ],
    keywords: [["interpreter", "accompany", "day"], ["interpreter", "come", "appointments"], ["escort", "interpreting", "dubai"]],
    next: ["tr-interp-venue", "tr-interp-scope", "tr-interp-business"],
  },
  {
    id: "tr-interp-scope",
    question: "Will the interpreter explain things or give advice?",
    answer:
      "No — an interpreter conveys what each side says, including when it is unclear, and does not add explanation, soften a refusal or advise you. That restraint is the job: the moment an interpreter starts interpreting your interests as well as your words, you have stopped hearing what the other side actually said. For advice you need a lawyer or a consultant alongside.",
    service: SERVICE,
    phrases: [
      "will the interpreter explain things or give advice",
      "does an interpreter act on my behalf",
      "can the interpreter negotiate for me",
      "what is the interpreter role exactly",
    ],
    keywords: [["interpreter", "explain", "advice"], ["interpreter", "act", "behalf"], ["interpreter", "negotiate", "for", "me"]],
    next: ["tr-interp-sworn", "tr-interp-escort", "tr-interp-business"],
  },
  {
    id: "tr-interp-gender",
    question: "Can I request a male or female interpreter?",
    answer:
      "Yes, and it is a reasonable request rather than an awkward one — medical appointments, family matters and some cultural contexts make it genuinely important. Ask when you book, because availability is the constraint and it cannot be fixed on the day.",
    service: SERVICE,
    phrases: [
      "can i request a male or female interpreter",
      "female interpreter for a medical appointment",
      "gender preference for an interpreter",
      "i would prefer a woman interpreter",
    ],
    keywords: [["male", "female", "interpreter"], ["female", "interpreter", "medical"], ["gender", "preference", "interpreter"]],
    next: ["tr-interp-medical", "tr-interp-availability", "tr-interp-preparation"],
  },
  {
    id: "tr-interp-sign-language",
    question: "Can you arrange sign language interpreting?",
    answer:
      "Sign language interpreting is a separate specialism, and it is language-specific — Emirati Sign Language is not interchangeable with British or American sign language. Tell us which one is needed and the setting, and we will tell you plainly whether it can be arranged rather than promising first and checking later.",
    service: SERVICE,
    phrases: [
      "can you arrange sign language interpreting",
      "sign language interpreter in dubai",
      "emirati sign language interpreting",
      "deaf interpreting services uae",
    ],
    keywords: [["sign", "language", "interpreting"], ["sign", "language", "interpreter"], ["deaf", "interpreting", "services"]],
    next: ["tr-interp-availability", "tr-lang-rare", "tr-interp-venue"],
  },
  {
    id: "tr-interp-marriage",
    question: "Do I need an interpreter to get married here?",
    answer:
      "If either party does not understand the language the ceremony and the paperwork are conducted in, the registering authority will normally require one — the point is that you understood what you agreed to. Requirements differ between the court, a church and a consulate, so ask the body conducting the marriage what they expect and who they accept.",
    service: SERVICE,
    phrases: [
      "do i need an interpreter to get married here",
      "interpreter for a marriage ceremony in dubai",
      "language requirement for registering a marriage",
      "getting married in the uae without arabic",
    ],
    keywords: [["interpreter", "get", "married"], ["interpreter", "marriage", "ceremony"], ["married", "uae", "arabic"]],
    next: ["tr-doc-marriage-certificate", "tr-doc-single-status", "tr-interp-availability"],
  },
  {
    id: "tr-interp-immigration",
    question: "Can an interpreter attend a visa or immigration appointment?",
    answer:
      "Often yes, though the office decides who may accompany you and some appointments are conducted one to one. Check with them before booking anyone, and ask whether a remote interpreter on a phone is acceptable, which is sometimes the practical answer where a third person cannot be in the room.",
    service: SERVICE,
    phrases: [
      "can an interpreter attend a visa appointment",
      "interpreter for an immigration interview in the uae",
      "language help at a typing centre or amer office",
      "someone to interpret at my residency appointment",
    ],
    keywords: [["interpreter", "visa", "appointment"], ["interpreter", "immigration", "interview"], ["interpret", "residency", "appointment"]],
    next: ["tr-interp-remote", "tr-interp-escort", "tr-interp-availability"],
  },
  {
    id: "tr-interp-bank",
    question: "Can an interpreter help at a bank or with an official form?",
    answer:
      "Yes, and it is a common assignment — account opening, mortgage paperwork, a form in Arabic you are being asked to sign. Be clear that signing remains your decision: an interpreter tells you what the document says, and nobody should be signing a financial commitment on a verbal summary alone. If the document matters, have it translated properly as well.",
    service: SERVICE,
    phrases: [
      "can an interpreter help at a bank",
      "interpreter to help me fill an arabic form",
      "language help signing bank paperwork in dubai",
      "someone to explain an arabic form to me",
    ],
    keywords: [["interpreter", "help", "bank"], ["interpreter", "fill", "arabic", "form"], ["explain", "arabic", "form"]],
    next: ["tr-interp-escort", "tr-doc-bank-statement", "tr-interp-scope"],
  },
  {
    id: "tr-interp-training",
    question: "Can an interpreter cover a training session or inspection?",
    answer:
      "Yes — toolbox talks, inductions, audits and site inspections are regular work, usually consecutive and often into the languages a workforce actually speaks rather than Arabic. For a long day or a noisy site, two interpreters is the honest recommendation: accuracy falls off after a couple of hours of continuous work.",
    service: SERVICE,
    phrases: [
      "can an interpreter cover a training session",
      "interpreter for a site inspection in the uae",
      "interpreting for a workforce induction",
      "audit interpreter dubai",
    ],
    keywords: [["interpreter", "training", "session"], ["interpreter", "site", "inspection"], ["interpreting", "workforce", "induction"]],
    next: ["tr-tech-hse", "tr-lang-south-asian", "tr-interp-venue"],
  },
  {
    id: "tr-interp-recording",
    question: "Can an interpreted session be recorded or transcribed?",
    answer:
      "It can, with everyone's agreement — and in some settings recording is not permitted at all, which the forum decides rather than the interpreter. If you want a written record afterwards, say so before the session: transcription and translation of a recording is separate work, and audio quality determines whether it is possible.",
    service: SERVICE,
    phrases: [
      "can an interpreted session be recorded",
      "transcribe and translate a recording",
      "audio transcription translation dubai",
      "i have a recording in arabic i need written up",
    ],
    keywords: [["interpreted", "session", "recorded"], ["transcribe", "translate", "recording"], ["audio", "transcription", "translation"]],
    next: ["tr-interp-confidentiality", "tr-proc-file-formats", "tr-interp-preparation"],
  },
  {
    id: "tr-interp-how-many-hours",
    question: "How long can one interpreter work?",
    answer:
      "Consecutive interpreting is sustainable for a normal working session with breaks; simultaneous is not, which is why it is always staffed in pairs. Booking one person for a full day of simultaneous work is the most common false economy in this field — accuracy drops well before stamina does, and you will not notice until something important is missed.",
    service: SERVICE,
    phrases: [
      "how long can one interpreter work",
      "do i need two interpreters for a full day",
      "why are simultaneous interpreters booked in pairs",
      "interpreter working hours and breaks",
    ],
    keywords: [["long", "one", "interpreter", "work"], ["two", "interpreters", "full", "day"], ["interpreters", "booked", "pairs"]],
    next: ["tr-interp-simultaneous-vs-consecutive", "tr-interp-conference", "tr-interp-training"],
  },

  /* ── Languages ─────────────────────────────────────────────────────────── */
  {
    id: "tr-lang-arabic-english",
    question: "Is Arabic to English the main pair?",
    answer:
      "It is the pair nearly every UAE requirement reduces to, in one direction or the other, and it is the one with the deepest pool of Ministry of Justice licensed translators. Anything else is usually routed through English on its way to Arabic. If your document is already in English, you are starting from the easiest position there is here.",
    service: SERVICE,
    phrases: [
      "is arabic to english the main pair",
      "translate from english into arabic officially",
      "arabic english legal translation dubai",
      "do you translate arabic to english",
    ],
    keywords: [["arabic", "english", "main", "pair"], ["arabic", "english", "legal", "translation"]],
    next: ["tr-double-translation", "tr-lang-rare", "tr-who-may-translate"],
  },
  {
    id: "tr-lang-south-asian",
    question: "Can you handle Hindi, Urdu, Malayalam, Tamil or Bengali?",
    answer:
      "These are among the most requested languages in the UAE and are well served, both for documents and for interpreting. The thing to name precisely is the language rather than the country: certificates from India arrive in a dozen different languages, and \"Indian certificate\" tells a translator nothing useful. A photo settles it in seconds.",
    service: SERVICE,
    phrases: [
      "can you handle hindi urdu or malayalam",
      "translate a tamil certificate for the uae",
      "bengali document translation dubai",
      "urdu to arabic legal translation",
    ],
    keywords: [["hindi", "urdu", "malayalam"], ["tamil", "certificate", "uae"], ["bengali", "document", "translation"]],
    next: ["tr-double-translation", "tr-lang-arabic-english", "tr-proc-how-to-send"],
  },
  {
    id: "tr-lang-european",
    question: "Can you handle French, German, Spanish, Italian or Russian?",
    answer:
      "Yes, for documents and for interpreting, and these are also the languages where a document is most often going the other way — a UAE certificate being prepared for use in Europe. In that direction the destination country's rules decide whether a translation certified here will be accepted, so ask them before commissioning it.",
    service: SERVICE,
    phrases: [
      "can you handle french german or spanish",
      "russian document translation in dubai",
      "italian certificate translation for the uae",
      "european language legal translation dubai",
    ],
    keywords: [["french", "german", "spanish"], ["russian", "document", "translation"], ["european", "language", "legal", "translation"]],
    next: ["tr-uae-translation-for-abroad", "tr-difference-certified-sworn", "tr-reject-embassy-abroad"],
  },
  {
    id: "tr-lang-east-asian",
    question: "Can you handle Chinese, Japanese, Korean or Filipino?",
    answer:
      "Yes. Chinese needs one extra detail when you ask — simplified or traditional script, and which jurisdiction issued the document, because the certification route differs. Filipino documents are common here and usually travel with their own consular requirements, which are worth checking at the same time as the translation.",
    service: SERVICE,
    phrases: [
      "can you handle chinese japanese or korean",
      "filipino document translation in dubai",
      "chinese certificate translation for the uae",
      "tagalog translation dubai",
    ],
    keywords: [["chinese", "japanese", "korean"], ["filipino", "document", "translation"], ["tagalog", "translation", "dubai"]],
    next: ["tr-double-translation", "tr-lang-rare", "tr-mofa-steps"],
  },
  {
    id: "tr-lang-rare",
    question: "What if my language is unusual?",
    answer:
      "It is usually possible, but it takes longer to arrange and sometimes routes through a second language to get there. Tell us the language and the country, and whether the need is a document or a person in a room, and you will get a straight answer about whether it can be done rather than an optimistic one.",
    service: SERVICE,
    phrases: [
      "what if my language is unusual",
      "do you cover rare languages for translation",
      "my language is not commonly available",
      "uncommon language interpreter in the uae",
    ],
    keywords: [["language", "unusual"], ["rare", "languages", "translation"], ["uncommon", "language", "interpreter"]],
    next: ["tr-double-translation", "tr-interp-availability", "tr-lang-african"],
  },
  {
    id: "tr-lang-african",
    question: "Can you handle African languages?",
    answer:
      "Amharic, Somali, Swahili and others come up regularly here and can generally be arranged, though availability is thinner than for the major pairs and lead time matters more. Documents from many African countries also carry a longer legalisation chain than the translation itself, so ask about both at once.",
    service: SERVICE,
    phrases: [
      "can you handle african languages",
      "amharic document translation dubai",
      "somali or swahili translation in the uae",
      "african certificate translation for dubai",
    ],
    keywords: [["african", "languages", "handle"], ["amharic", "document", "translation"], ["somali", "swahili", "translation"]],
    next: ["tr-lang-rare", "tr-mofa-steps", "tr-embassy-legalisation"],
  },
  {
    id: "tr-lang-farsi-turkish",
    question: "Can you handle Farsi, Turkish or Hebrew?",
    answer:
      "Yes, for documents and interpreting. As with any less common pair, the constraint is which licensed translators are available for the certified version rather than whether the language can be translated at all — so name the language and the purpose together when you ask, and the realistic route can be given straight away.",
    service: SERVICE,
    phrases: [
      "can you handle farsi turkish or hebrew",
      "persian document translation dubai",
      "turkish certificate translation for the uae",
      "hebrew translation in dubai",
    ],
    keywords: [["farsi", "turkish", "hebrew"], ["persian", "document", "translation"], ["turkish", "certificate", "translation"]],
    next: ["tr-lang-rare", "tr-double-translation", "tr-who-may-translate"],
  },
  {
    id: "tr-lang-dialects",
    question: "Does the Arabic dialect matter?",
    answer:
      "For documents, no — official written Arabic is standard and that is what a certified translation uses. For interpreting, it can matter a great deal: an interpreter comfortable in Gulf Arabic is the right choice for a meeting here, and Levantine or Egyptian speech in a hearing is understood but not identical. Say where the speakers are from when you book.",
    service: SERVICE,
    phrases: [
      "does the arabic dialect matter",
      "gulf arabic versus standard arabic translation",
      "which arabic will my document be in",
      "egyptian or levantine interpreter",
    ],
    keywords: [["arabic", "dialect", "matter"], ["gulf", "arabic", "standard"], ["egyptian", "levantine", "interpreter"]],
    next: ["tr-interp-business", "tr-tech-marketing", "tr-lang-arabic-english"],
  },
  {
    id: "tr-lang-transliteration",
    question: "How are names written in Arabic?",
    answer:
      "By transliteration, and the same name can be spelled several defensible ways — which is exactly the problem. Pick the spelling that already appears on your Emirates ID or residence visa, give it to the translator, and use it on everything afterwards. Letting each translator choose is how one person ends up looking like two in a government system.",
    service: SERVICE,
    phrases: [
      "how are names written in arabic on documents",
      "arabic spelling of my name for official papers",
      "my name is written differently on each document",
      "transliteration of names into arabic",
    ],
    keywords: [["names", "written", "arabic", "documents"], ["arabic", "spelling", "my", "name"], ["transliteration", "names", "arabic"]],
    next: ["tr-reject-name-spelling", "tr-doc-name-change", "tr-proc-name-confirmation"],
  },
  {
    id: "tr-lang-numbers-dates",
    question: "What happens to dates and numbers in the Arabic version?",
    answer:
      "They are rendered so that the meaning is unambiguous, which sometimes means showing both calendars where a document uses the Hijri one. Dates are a frequent source of apparent mismatches between a certificate and a passport, so if two of your documents seem to disagree on a date, check whether they are simply using different calendars before assuming an error.",
    service: SERVICE,
    phrases: [
      "what happens to dates and numbers in the arabic version",
      "hijri and gregorian dates on my documents",
      "my date of birth differs between documents",
      "calendar conversion on a translated certificate",
    ],
    keywords: [["dates", "numbers", "arabic", "version"], ["hijri", "gregorian", "dates"], ["calendar", "conversion", "translated"]],
    next: ["tr-reject-name-spelling", "tr-quality-accuracy", "tr-lang-transliteration"],
  },
  {
    id: "tr-lang-which-direction",
    question: "Does it matter which direction the translation goes?",
    answer:
      "Yes, more than people expect. Into Arabic for a UAE authority means a licensed translator here. Out of Arabic for a foreign body means meeting that country's rules, which may require their own sworn translator instead. Saying \"translate this\" without naming the destination is the most common reason work has to be redone.",
    service: SERVICE,
    phrases: [
      "does it matter which direction the translation goes",
      "into arabic or out of arabic which is different",
      "translating from arabic for another country",
      "direction of translation and requirements",
    ],
    keywords: [["direction", "translation", "goes"], ["translating", "from", "arabic", "another", "country"], ["direction", "translation", "requirements"]],
    next: ["tr-uae-translation-for-abroad", "tr-translate-abroad-or-here", "tr-who-decides-requirement"],
  },
  {
    id: "tr-lang-bilingual-document",
    question: "My document is already bilingual. Is that enough?",
    answer:
      "Often yes, and it is worth checking before paying for anything — many UAE-issued certificates and contracts already carry Arabic alongside English. What is not enough is a document where only part is bilingual, or where the Arabic is a summary rather than a full rendering. Send a photo and it takes a moment to tell you which you have.",
    service: SERVICE,
    phrases: [
      "my document is already bilingual is that enough",
      "my certificate already has arabic on it",
      "do i still need a translation if it is bilingual",
      "partially bilingual document requirement",
    ],
    keywords: [["already", "bilingual", "enough"], ["certificate", "already", "arabic"], ["partially", "bilingual", "document"]],
    next: ["tr-do-i-need-translation", "tr-court-partial", "tr-who-decides-requirement"],
  },

  /* ── How the work actually happens ─────────────────────────────────────── */
  {
    id: "tr-proc-how-to-send",
    question: "How do I send my documents?",
    answer:
      "A clear scan or photo of every page through the enquiry form is enough to start — that is all anyone needs to tell you what the document requires and what the work involves. Originals only come into it later, and only for the steps that genuinely need them. Say what the document is for in the same message; it changes the answer more than the document does.",
    service: SERVICE,
    phrases: [
      "how do i send my documents for translation",
      "where do i upload my certificate",
      "can i send a photo of my document on whatsapp",
      "how to submit documents for a translation enquiry",
    ],
    keywords: [["send", "documents", "translation"], ["upload", "my", "certificate"], ["submit", "documents", "translation"]],
    next: ["tr-proc-scan-quality", "tr-proc-originals", "tr-proc-confidentiality"],
  },
  {
    id: "tr-proc-originals",
    question: "Do you need the original document?",
    answer:
      "For the translation itself, usually not — a legible copy is what the translator works from. Originals are needed for attestation steps, because those authorities stamp the physical document. So the honest answer depends on which steps your case includes, and it is worth establishing that before anyone couriers an irreplaceable certificate across the city.",
    service: SERVICE,
    phrases: [
      "do you need the original document",
      "must i hand over my original certificate",
      "can you work from a copy of my document",
      "do i have to give up my originals",
    ],
    keywords: [["need", "original", "document"], ["hand", "over", "original", "certificate"], ["work", "from", "copy"]],
    next: ["tr-proc-delivery", "tr-mofa-appointment", "tr-proc-how-to-send"],
  },
  {
    id: "tr-proc-scan-quality",
    question: "How good does the scan have to be?",
    answer:
      "Good enough that every character, stamp and marginal note is readable — including the faint ones, which are usually the seals that matter most. A flat, well-lit photo of the whole page beats a high-resolution photo of a curled document. If part of it is genuinely illegible the translator will mark it as such rather than guess, which is correct but not what you want on a certificate.",
    service: SERVICE,
    phrases: [
      "how good does the scan have to be",
      "is a phone photo good enough for translation",
      "scan quality requirements for documents",
      "my scan is blurry will that matter",
    ],
    keywords: [["good", "scan", "have", "be"], ["phone", "photo", "good", "enough"], ["scan", "quality", "requirements"]],
    next: ["tr-tech-handwriting", "tr-proc-how-to-send", "tr-proc-file-formats"],
  },
  {
    id: "tr-proc-file-formats",
    question: "What file formats work best?",
    answer:
      "Editable originals where you have them — a Word file, a native CAD file, the spreadsheet behind a table — because the text can be replaced in place instead of the layout being rebuilt. PDF is fine, a scanned PDF is workable, and a photo of a screen is the hardest of all. Send the best version you have rather than the most convenient one.",
    service: SERVICE,
    phrases: [
      "what file formats work best for translation",
      "should i send a word file or a pdf",
      "can you translate a scanned pdf",
      "editable file versus scan for translation",
    ],
    keywords: [["file", "formats", "translation"], ["word", "file", "or", "pdf"], ["translate", "scanned", "pdf"]],
    next: ["tr-proc-scan-quality", "tr-tech-tables", "tr-tech-drawings"],
  },
  {
    id: "tr-proc-name-confirmation",
    question: "Will anyone check the spelling of my name before translating?",
    answer:
      "It should be confirmed with you against your passport and Emirates ID before the work is done, not after — changing a name in a completed certified translation means reissuing it. Send the passport page alongside the document and state which spelling is the one already used on your UAE records.",
    service: SERVICE,
    phrases: [
      "will anyone check the spelling of my name before translating",
      "how is my name confirmed for a translation",
      "i want my name spelled a particular way",
      "checking details before the translation starts",
    ],
    keywords: [["check", "spelling", "name", "before"], ["name", "confirmed", "translation"], ["checking", "details", "before", "translation"]],
    next: ["tr-lang-transliteration", "tr-reject-name-spelling", "tr-proc-amendments"],
  },
  {
    id: "tr-proc-page-count",
    question: "What counts as a page?",
    answer:
      "It varies by provider, which is precisely why it should be agreed in writing before the work starts rather than discovered on an invoice. Some count physical pages, some count a standard number of words, and a dense certificate can be more than one by either measure. Ask for the basis in the quotation and you will be able to compare two of them honestly.",
    service: SERVICE,
    phrases: [
      "what counts as a page for translation",
      "how is a page measured in a translation quote",
      "is a page counted by words or by sheets",
      "definition of a page in translation work",
    ],
    keywords: [["counts", "as", "page", "translation"], ["page", "measured", "translation"], ["page", "counted", "words", "sheets"]],
    quote: true,
  },
  {
    id: "tr-proc-urgent",
    question: "Can something be done urgently?",
    answer:
      "Often, and it is worth saying so at the start rather than after the work has been scheduled. What cannot be compressed is anything that depends on a government office's own processing — attestation steps run at their pace, not ours. So an urgent translation is usually possible and an urgent attestation chain frequently is not; knowing which your case is changes what you should plan around.",
    service: SERVICE,
    phrases: [
      "can something be done urgently",
      "i need a translation quickly",
      "is there an express option for documents",
      "i need this by tomorrow can you help",
    ],
    keywords: [["done", "urgently"], ["need", "translation", "quickly"], ["express", "option", "documents"]],
    quote: true,
  },
  {
    id: "tr-proc-delivery",
    question: "How do I get the finished document back?",
    answer:
      "A certified translation is a physical document with a stamp and a signature, so there is normally a hard copy to collect or have couriered, with a scan sent ahead so you can check the details. Where a receiving authority accepts a digital version, say so early — it can change how the work is prepared.",
    service: SERVICE,
    phrases: [
      "how do i get the finished document back",
      "will you courier the translation to me",
      "can i collect my translated documents",
      "delivery of completed translations in dubai",
    ],
    keywords: [["finished", "document", "back"], ["courier", "the", "translation"], ["collect", "translated", "documents"]],
    next: ["tr-proc-soft-copy", "tr-proc-extra-copies", "tr-proc-originals"],
  },
  {
    id: "tr-proc-soft-copy",
    question: "Is a scanned copy of the translation acceptable?",
    answer:
      "It depends entirely on who is receiving it. Plenty of submissions now go through online portals and a scan is fine; a notary, a court filing and most attestation steps want the stamped paper. Ask the recipient before assuming, because printing a scan of a certified translation does not make it a certified translation.",
    service: SERVICE,
    phrases: [
      "is a scanned copy of the translation acceptable",
      "can i submit a digital copy of my certified translation",
      "do they accept a pdf of the stamped translation",
      "soft copy or hard copy for submission",
    ],
    keywords: [["scanned", "copy", "translation", "acceptable"], ["digital", "copy", "certified", "translation"], ["soft", "copy", "hard", "copy"]],
    next: ["tr-proc-delivery", "tr-proc-extra-copies", "tr-who-decides-requirement"],
  },
  {
    id: "tr-proc-extra-copies",
    question: "Can I get extra stamped copies?",
    answer:
      "Yes, and it is much cheaper to ask for them while the job is open than to come back for one later. Think about how many bodies will each want to keep an original — a visa file, an employer, a professional register — and order accordingly rather than photocopying a stamped document and hoping.",
    service: SERVICE,
    phrases: [
      "can i get extra stamped copies",
      "i need more than one certified copy",
      "additional originals of my translation",
      "can i photocopy a certified translation",
    ],
    keywords: [["extra", "stamped", "copies"], ["more", "than", "one", "certified", "copy"], ["additional", "originals", "translation"]],
    quote: true,
  },
  {
    id: "tr-proc-reuse-old-translation",
    question: "Can I reuse a translation I already paid for?",
    answer:
      "Sometimes. If the document has not changed and the receiving authority accepts the translator's certification, a previous translation can serve again. It fails where the authority wants a recent one, where the original has since been reissued or re-attested, or where the earlier translator's licence details cannot be verified. Send what you have and it can be checked before you pay again.",
    service: SERVICE,
    phrases: [
      "can i reuse a translation i already paid for",
      "is my old translation still valid",
      "do i have to translate the same document again",
      "reusing a certified translation for another application",
    ],
    keywords: [["reuse", "translation", "already", "paid"], ["old", "translation", "still", "valid"], ["translate", "same", "document", "again"]],
    next: ["tr-mofa-stamp-validity", "tr-foreign-translation-accepted", "tr-who-decides-requirement"],
  },
  {
    id: "tr-proc-repeat-work",
    question: "I have documents coming regularly. Can that be set up?",
    answer:
      "Yes, and it is worth it — an agreed glossary, a consistent format and a known contact remove most of the back and forth from each job. For companies sending similar files monthly, the terminology being stable across submissions matters to the reader as much as to you. Tell us the volume and the type and it can be arranged properly.",
    service: SERVICE,
    phrases: [
      "i have documents coming regularly can that be set up",
      "ongoing translation arrangement for my company",
      "regular translation work for a business in dubai",
      "can we set up an account for repeat translations",
    ],
    keywords: [["documents", "coming", "regularly"], ["ongoing", "translation", "arrangement"], ["regular", "translation", "work", "business"]],
    quote: true,
  },
  {
    id: "tr-proc-confidentiality",
    question: "Is my document kept confidential?",
    answer:
      "Yes. Documents are handled on a need-to-know basis and translators work under confidentiality obligations; a written undertaking can be put in place where the material calls for it. If your file is commercially sensitive or subject to a case, say so when you send it rather than afterwards, because that changes how it is handled from the first step.",
    service: SERVICE,
    phrases: [
      "is my document kept confidential",
      "who will see my personal documents",
      "will you sign a confidentiality agreement",
      "data protection for my translated documents",
    ],
    keywords: [["document", "kept", "confidential"], ["see", "my", "personal", "documents"], ["sign", "confidentiality", "agreement"]],
    next: ["tr-proc-data-retention", "tr-interp-confidentiality", "tr-proc-how-to-send"],
  },
  {
    id: "tr-proc-data-retention",
    question: "What happens to my documents afterwards?",
    answer:
      "Copies are kept only as long as there is a reason to — a reissue, a query from the authority, a repeat order — and you can ask for them to be removed once the matter is closed. Ask at the outset if you would rather nothing was retained at all; it is a reasonable request and better raised before the work than after.",
    service: SERVICE,
    phrases: [
      "what happens to my documents afterwards",
      "do you keep copies of my certificates",
      "can you delete my documents after the work",
      "how long are my files stored",
    ],
    keywords: [["happens", "documents", "afterwards"], ["keep", "copies", "certificates"], ["delete", "my", "documents", "after"]],
    next: ["tr-proc-confidentiality", "tr-proc-extra-copies", "tr-proc-repeat-work"],
  },
  {
    id: "tr-proc-amendments",
    question: "Can a completed translation be corrected?",
    answer:
      "Yes — if something is genuinely wrong, it is put right, and a factual error like a misspelled name should be corrected without argument. What is not a correction is changing what the original says: a translator renders the document, including its mistakes, and cannot quietly improve it. If the original itself is wrong, that has to be fixed at the issuing authority.",
    service: SERVICE,
    phrases: [
      "can a completed translation be corrected",
      "there is a mistake in my translation",
      "who fixes an error in a certified translation",
      "the translation does not match my passport",
    ],
    keywords: [["completed", "translation", "corrected"], ["mistake", "in", "my", "translation"], ["error", "certified", "translation"]],
    next: ["tr-quality-accuracy", "tr-reject-name-spelling", "tr-proc-original-error"],
  },
  {
    id: "tr-proc-original-error",
    question: "The original document has a mistake in it. What now?",
    answer:
      "The translation has to reflect the original, errors included, because a translation that silently corrects the source no longer matches it — and any authority comparing the two will notice. The fix belongs at the issuing authority: get the original reissued, then translate. Translating first and correcting later means paying twice.",
    service: SERVICE,
    phrases: [
      "the original document has a mistake in it what now",
      "my certificate has a typo should the translation fix it",
      "wrong details on the issued document",
      "can the translator correct an error in the original",
    ],
    keywords: [["original", "document", "mistake"], ["certificate", "typo", "translation"], ["translator", "correct", "error", "original"]],
    next: ["tr-proc-amendments", "tr-reject-name-spelling", "tr-doc-name-change"],
  },
  {
    id: "tr-proc-tracking",
    question: "How do I know where my document has got to?",
    answer:
      "You should be told which step it is at and who is holding it, particularly once an original is inside an attestation chain. Ask for a reference and a point of contact at the start rather than chasing later. If a document has been somewhere for longer than expected, saying so early is what gets it looked at.",
    service: SERVICE,
    phrases: [
      "how do i know where my document has got to",
      "can i track the progress of my translation",
      "who do i contact about my documents",
      "my documents have been with you a while",
    ],
    keywords: [["where", "document", "got", "to"], ["track", "progress", "translation"], ["contact", "about", "my", "documents"]],
    next: ["tr-proc-delivery", "tr-proc-originals", "tr-proc-urgent"],
  },
  {
    id: "tr-proc-who-does-the-work",
    question: "Do you do the translation yourselves?",
    answer:
      "No, and it matters that we say so plainly: legal translation in the UAE is carried out by translators licensed by the Ministry of Justice. What we do is work out what your case actually needs, check the document before it goes anywhere, and introduce you to a licensed provider with the scope and price agreed before anything starts. Nobody here stamps your document.",
    service: SERVICE,
    phrases: [
      "do you do the translation yourselves",
      "are you a translation company or an agency",
      "who actually does the work on my document",
      "is this an in house translation service",
    ],
    keywords: [["you", "translate", "documents"], ["translation", "company", "agency"], ["actually", "does", "the", "work"]],
    next: ["tr-who-may-translate", "tr-check-translator-licence", "tr-proc-how-to-send"],
  },
  {
    id: "tr-proc-weekend",
    question: "Are government steps possible at the weekend?",
    answer:
      "Translation work can be arranged around a weekend; the government steps in a chain cannot, because those offices keep their own hours and holidays. If you are working to a deadline that falls near a public holiday, say so at the start — it usually changes what order things should be done in.",
    service: SERVICE,
    phrases: [
      "are government steps possible at the weekend",
      "can documents be processed on friday or saturday",
      "public holidays and document processing in the uae",
      "weekend translation service dubai",
    ],
    keywords: [["government", "steps", "weekend"], ["documents", "processed", "friday"], ["public", "holidays", "document", "processing"]],
    next: ["tr-proc-urgent", "tr-mofa-appointment", "tr-proc-tracking"],
  },

  /* ── Quality, refusals and putting it right ────────────────────────────── */
  {
    id: "tr-quality-accuracy",
    question: "How do I know the translation is accurate?",
    answer:
      "The certification puts a named, licensed translator's registration behind it, which is accountability rather than proof. Beyond that: check the things you can check yourself — names, dates, numbers, the spelling on your passport — because those are both the most common errors and the ones you are best placed to catch. For anything substantive, a second reviewer is the honest answer.",
    service: SERVICE,
    phrases: [
      "how do i know the translation is accurate",
      "can i trust the arabic i cannot read",
      "who checks the quality of a legal translation",
      "verifying a translation i cannot read myself",
    ],
    keywords: [["know", "translation", "accurate"], ["checks", "quality", "legal", "translation"], ["trust", "arabic", "cannot", "read"]],
    next: ["tr-quality-review", "tr-proc-amendments", "tr-lang-transliteration"],
  },
  {
    id: "tr-quality-review",
    question: "Can a second person review the translation?",
    answer:
      "Yes, and on contracts, court documents and anything with money in it, it is worth the extra step. An independent review is a different job from the translation and priced as one, but it catches the kind of error that only shows up when someone is reading for meaning rather than producing text. Say up front if the document is high stakes.",
    service: SERVICE,
    phrases: [
      "can a second person review the translation",
      "independent review of a translated contract",
      "proofreading of a legal translation",
      "i want the arabic checked by someone else",
    ],
    keywords: [["second", "person", "review", "translation"], ["independent", "review", "translated"], ["proofreading", "legal", "translation"]],
    quote: true,
  },
  {
    id: "tr-reject-common-reasons",
    question: "Why do translations get refused?",
    answer:
      "Five reasons cover nearly all of them: the translator was not licensed here, the translation is partial and left out a seal or a reverse side, a name or date does not match the passport, the underlying original was never properly legalised, or the wrong thing was translated — the copy rather than the attested original. All five are visible on the document, so a refusal can usually be diagnosed before you spend anything further.",
    service: SERVICE,
    phrases: [
      "why do translations get refused",
      "common reasons a translation is rejected in the uae",
      "what makes an authority reject a translated document",
      "reasons my translated paperwork failed",
    ],
    keywords: [["why", "translations", "get", "refused"], ["reasons", "translation", "rejected"], ["authority", "reject", "translated", "document"]],
    next: ["tr-reject-name-spelling", "tr-reject-fix", "tr-court-partial"],
  },
  {
    id: "tr-reject-name-spelling",
    question: "The name on my translation does not match my passport.",
    answer:
      "That has to be fixed, and it is the error most likely to cause a refusal downstream — in a government system two spellings become two people. Use the spelling already on your Emirates ID and residence visa, have the translation reissued to match, and keep that spelling for everything afterwards. A correction here is a reissue, not an annotation.",
    service: SERVICE,
    phrases: [
      "the name on my translation does not match my passport",
      "my name is spelled wrong on the translated document",
      "name mismatch between my documents",
      "different spelling of my name on my certificate",
    ],
    keywords: [["name", "translation", "match", "passport"], ["name", "spelled", "wrong", "translated"], ["name", "mismatch", "between", "documents"]],
    next: ["tr-lang-transliteration", "tr-proc-amendments", "tr-doc-name-change"],
  },
  {
    id: "tr-reject-fix",
    question: "My translation was refused. What do I do now?",
    answer:
      "Get the reason in writing if you can, because the fix depends entirely on it — a licensing problem means a new translation, a partial translation means an extension, a chain problem means going back a step. Do not commission anything new until the reason is clear. Send us the document and the refusal and we will tell you which of the five it is before you pay anyone again.",
    service: SERVICE,
    phrases: [
      "my translation was refused what do i do now",
      "how do i fix a rejected translation",
      "they sent my document back what next",
      "putting right a refused submission",
    ],
    keywords: [["translation", "refused", "what", "do", "now"], ["fix", "rejected", "translation"], ["sent", "document", "back", "next"]],
    quote: true,
  },
  {
    id: "tr-reject-ministry",
    question: "A ministry refused my translated document.",
    answer:
      "Ministries usually refuse on completeness or on the chain rather than on wording — a missing attestation behind the translation, or a set that is short one document. Their counter staff will normally say which, and that sentence is worth more than any amount of guessing afterwards. Ask for it before you leave.",
    service: SERVICE,
    phrases: [
      "a ministry refused my translated document",
      "my application was rejected by a uae ministry",
      "government department did not accept my papers",
      "ministry sent back my attested translation",
    ],
    keywords: [["ministry", "refused", "translated", "document"], ["rejected", "by", "uae", "ministry"], ["department", "not", "accept", "papers"]],
    next: ["tr-reject-common-reasons", "tr-reject-fix", "tr-mofa-rejected-translation"],
  },
  {
    id: "tr-reject-university",
    question: "A university would not accept my translation.",
    answer:
      "Universities often have their own rule — some insist the translation come from their own approved list, some want it sent directly from the issuing institution rather than from you. Neither is about quality, and neither can be argued around. Get their written requirement and work from it; sending it to us saves a second wrong attempt.",
    service: SERVICE,
    phrases: [
      "a university would not accept my translation",
      "my college rejected the translated transcript",
      "university wants its own approved translator",
      "admissions office refused my documents",
    ],
    keywords: [["university", "not", "accept", "translation"], ["college", "rejected", "translated", "transcript"], ["admissions", "office", "refused", "documents"]],
    next: ["tr-doc-transcript", "tr-reject-fix", "tr-who-decides-requirement"],
  },
  {
    id: "tr-reject-bank",
    question: "A bank refused my translated documents.",
    answer:
      "Banks apply their own compliance rules on top of the legal requirement, and those are stricter and less negotiable than most people expect — recency, the exact form of certification, and sometimes a requirement that the document come through a channel they recognise. Ask the relationship manager for the written policy rather than working from what the counter said.",
    service: SERVICE,
    phrases: [
      "a bank refused my translated documents",
      "my bank did not accept the certified translation",
      "compliance rejected my paperwork at the bank",
      "bank wants a different kind of translation",
    ],
    keywords: [["bank", "refused", "translated", "documents"], ["bank", "not", "accept", "certified"], ["compliance", "rejected", "paperwork"]],
    next: ["tr-doc-bank-statement", "tr-reject-fix", "tr-mofa-stamp-validity"],
  },
  {
    id: "tr-reject-embassy-abroad",
    question: "An embassy abroad refused a translation done here.",
    answer:
      "That is usually a rules mismatch rather than an error: the destination country wants its own sworn translator, or its own consular legalisation on top. It is the reason a document going out of the UAE should be scoped against the destination's requirements from the start. Send us their refusal and we will work out what they actually want.",
    service: SERVICE,
    phrases: [
      "an embassy abroad refused a translation done here",
      "my uae translation was not accepted overseas",
      "foreign consulate rejected my documents",
      "translation done in dubai refused in another country",
    ],
    keywords: [["embassy", "abroad", "refused", "translation"], ["uae", "translation", "not", "accepted", "overseas"], ["foreign", "consulate", "rejected"]],
    next: ["tr-uae-translation-for-abroad", "tr-lang-which-direction", "tr-reject-fix"],
  },
  {
    id: "tr-reject-expired",
    question: "I was told my translation is too old.",
    answer:
      "That is the receiving authority's rule about how recent a document must be, not a property of the translation itself. Some bodies want anything issued within a defined recent window; others never ask. Find out their actual requirement before reordering, because \"too old\" sometimes means the underlying certificate rather than the translation.",
    service: SERVICE,
    phrases: [
      "i was told my translation is too old",
      "they say my documents are out of date",
      "how recent must my translated certificate be",
      "my attestation is too old for them",
    ],
    keywords: [["translation", "is", "too", "old"], ["documents", "out", "of", "date"], ["recent", "translated", "certificate"]],
    next: ["tr-mofa-stamp-validity", "tr-proc-reuse-old-translation", "tr-reject-fix"],
  },
  {
    id: "tr-reject-disagreement",
    question: "I think the translation is wrong. What are my options?",
    answer:
      "Raise it specifically — point at the words rather than at the document — and ask for the passage to be reviewed. A genuine error is corrected. Where it is a matter of interpretation rather than accuracy, an independent second opinion settles it, and that is worth doing before a document is filed anywhere rather than after.",
    service: SERVICE,
    phrases: [
      "i think the translation is wrong what are my options",
      "i disagree with how my document was translated",
      "how do i challenge a translation",
      "complaint about a translated document",
    ],
    keywords: [["think", "translation", "is", "wrong"], ["disagree", "how", "document", "translated"], ["challenge", "a", "translation"]],
    next: ["tr-quality-review", "tr-proc-amendments", "tr-quality-accuracy"],
  },
  {
    id: "tr-reject-wrong-document-translated",
    question: "The wrong version of my document was translated.",
    answer:
      "It happens when a plain copy is sent instead of the attested original — the translation is then of a document that carries none of the stamps, and an authority comparing them will refuse it. The fix is to translate the attested version, which means the chain has to be complete first. Check which version you sent before ordering anything again.",
    service: SERVICE,
    phrases: [
      "the wrong version of my document was translated",
      "they translated the copy instead of the attested original",
      "my translation does not show the stamps",
      "translated before the attestation was done",
    ],
    keywords: [["wrong", "version", "document", "translated"], ["translated", "copy", "instead", "attested"], ["translation", "not", "show", "stamps"]],
    next: ["tr-translate-before-or-after-attestation", "tr-reject-fix", "tr-court-partial"],
  },
  {
    id: "tr-reject-agency-unreachable",
    question: "The agency that translated my document has disappeared.",
    answer:
      "Then the practical question is whether the stamp can still be verified — a licence number can be checked against the register even if the office has closed. If it cannot be verified, a new translation is usually faster than pursuing the old one. Send what you have; it takes very little to establish which situation you are in.",
    service: SERVICE,
    phrases: [
      "the agency that translated my document has disappeared",
      "i cannot reach the translator who did my documents",
      "my translation company has closed down",
      "no way to contact the translator for a correction",
    ],
    keywords: [["agency", "translated", "document", "disappeared"], ["cannot", "reach", "the", "translator"], ["translation", "company", "closed"]],
    next: ["tr-check-translator-licence", "tr-reject-fix", "tr-proc-reuse-old-translation"],
  },
  {
    id: "tr-reject-two-opinions",
    question: "Two providers have told me different things.",
    answer:
      "Usually because they were told different things about the purpose — the same certificate needs different handling for an employer, a ministry and a foreign embassy. Go back to the authority that will receive it and get their requirement in writing; that settles it. Where the disagreement survives a written requirement, one of the two has not read it.",
    service: SERVICE,
    phrases: [
      "two providers have told me different things",
      "i am getting conflicting advice about my documents",
      "one agency says attestation first another says translation",
      "who is right about what my document needs",
    ],
    keywords: [["providers", "told", "different", "things"], ["conflicting", "advice", "documents"], ["right", "about", "document", "needs"]],
    next: ["tr-who-decides-requirement", "tr-translate-before-or-after-attestation", "tr-which-one-do-i-need"],
  },
  {
    id: "tr-reject-lost-document",
    question: "My original was lost during the process.",
    answer:
      "Report it immediately to whoever was holding it and ask for that in writing, because a replacement usually has to be requested from the issuing authority and that is a longer road than any translation. This is the reason to get a receipt naming the document before handing an original to anyone, including us.",
    service: SERVICE,
    phrases: [
      "my original was lost during the process",
      "the agency lost my certificate",
      "what happens if my document goes missing",
      "my original document was not returned",
    ],
    keywords: [["original", "lost", "during", "process"], ["agency", "lost", "my", "certificate"], ["original", "document", "not", "returned"]],
    next: ["tr-proc-originals", "tr-proc-tracking", "tr-reject-fix"],
  },

  /* ── Where translation meets the Dubai notary ──────────────────────────── */
  {
    id: "tr-notary-what-is-needed",
    question: "What does a Dubai notary expect a translation to be?",
    answer:
      "Arabic, produced by a Ministry of Justice licensed translator, covering the whole instrument rather than a summary, and presented alongside the version you can read. The notary is performing an act in Arabic, so the Arabic is the document — the English beside it exists so that you know what you signed. A translation that does not meet that is a wasted appointment rather than a small problem.",
    service: SERVICE,
    phrases: [
      "what does a dubai notary expect a translation to be",
      "translation standard required at the notary office",
      "what the notary looks for in a translated instrument",
      "preparing a translation for a notary in dubai",
    ],
    keywords: [["notary", "expect", "translation"], ["translation", "standard", "notary", "office"], ["preparing", "translation", "notary"]],
    next: ["tr-notary-bilingual-layout", "tr-who-may-translate", "tr-notary-poa"],
  },
  {
    id: "tr-notary-bilingual-layout",
    question: "How should a bilingual instrument be laid out?",
    answer:
      "Normally in two columns or facing pages, so each clause can be read against its counterpart, with the Arabic complete rather than abridged. The layout is not cosmetic: a notary and anyone reading it later has to be able to see that the two versions correspond clause by clause. A document where the English runs long and the Arabic summarises invites exactly the dispute it was meant to prevent.",
    service: SERVICE,
    phrases: [
      "how should a bilingual instrument be laid out",
      "two column layout for an arabic document",
      "facing page format for a bilingual agreement",
      "how bilingual documents are formatted in the uae",
    ],
    keywords: [["bilingual", "instrument", "laid", "out"], ["two", "column", "layout", "arabic"], ["bilingual", "documents", "formatted"]],
    next: ["tr-which-version-prevails", "tr-tech-tables", "tr-notary-what-is-needed"],
  },
  {
    id: "tr-notary-poa",
    question: "How is a power of attorney translated for the notary?",
    answer:
      "Powers are read narrowly here, so each act being granted has to appear explicitly in the Arabic — a general phrase that works in another legal system may grant nothing at all in front of a UAE notary. That makes the translation and the drafting one job rather than two. Have the Arabic checked against what you actually intend to authorise before the appointment.",
    service: SERVICE,
    phrases: [
      "how is a power of attorney translated for the notary",
      "arabic wording of a power of attorney in dubai",
      "translating the powers granted in a poa",
      "poa arabic version accuracy",
    ],
    keywords: [["power", "attorney", "translated", "notary"], ["arabic", "wording", "power", "attorney"], ["translating", "powers", "granted"]],
    next: ["tr-court-power-of-attorney", "tr-notary-what-is-needed", "tr-notary-signed-abroad"],
  },
  {
    id: "tr-notary-signatory-language",
    question: "What if the person signing does not read Arabic?",
    answer:
      "Then they need the document in a language they genuinely read, and in many cases an interpreter present so the notary can be satisfied the signatory understood what they signed. Arrange that before the appointment rather than raising it at the desk — a notary who is not satisfied on this point will stop, which is the system working correctly.",
    service: SERVICE,
    phrases: [
      "what if the person signing does not read arabic",
      "signatory cannot read the arabic version",
      "my business partner does not understand arabic signing",
      "language support for someone signing a document here",
    ],
    keywords: [["person", "signing", "not", "read", "arabic"], ["signatory", "cannot", "read", "arabic"], ["partner", "understand", "arabic", "signing"]],
    next: ["tr-notary-bilingual-layout", "tr-interp-scope", "tr-notary-what-is-needed"],
  },
  {
    id: "tr-notary-signed-abroad",
    question: "The document was signed abroad. What translation does it need?",
    answer:
      "It runs the legalisation chain in the country where it was signed, comes to MoFAIC here, and is then translated into Arabic by a licensed translator so a UAE authority can act on it. Translating it before the stamps exist means the translation does not show them, which is the most common reason a foreign-signed instrument has to be redone.",
    service: SERVICE,
    phrases: [
      "the document was signed abroad what translation does it need",
      "power of attorney signed overseas for use in dubai",
      "instrument executed abroad translation requirement",
      "using a foreign signed document in the uae",
    ],
    keywords: [["signed", "abroad", "translation", "need"], ["attorney", "signed", "overseas", "dubai"], ["foreign", "signed", "document", "uae"]],
    next: ["tr-mofa-steps", "tr-embassy-legalisation", "tr-notary-poa"],
  },
  {
    id: "tr-notary-moa-translation",
    question: "Who translates a memorandum for a company formation?",
    answer:
      "A licensed legal translator, and the Arabic is the version that goes on the record — so shares, powers and signing authority have to be exactly what the partners agreed rather than approximately. It is worth having the Arabic read back to you clause by clause before the notary appointment, particularly on anything about money.",
    service: SERVICE,
    phrases: [
      "who translates a memorandum for a company formation",
      "moa arabic version for the dubai notary",
      "company formation documents arabic translation",
      "partner agreement translation before notarising",
    ],
    keywords: [["translates", "memorandum", "company", "formation"], ["moa", "arabic", "version"], ["company", "formation", "documents", "arabic"]],
    next: ["tr-doc-moa", "tr-notary-bilingual-layout", "tr-which-version-prevails"],
  },
  {
    id: "tr-notary-affidavit-translation",
    question: "Does an affidavit need translating before the notary sees it?",
    answer:
      "Yes, into Arabic, and the wording is the whole point of the document — an affidavit is read for exactly what it states, so a loose rendering changes what you have sworn to. Where the affidavit is for a foreign authority, check their wording requirements first, because they sometimes prescribe the form and a UAE translation has to match it.",
    service: SERVICE,
    phrases: [
      "does an affidavit need translating before the notary sees it",
      "translating a sworn statement into arabic",
      "declaration wording in arabic for dubai",
      "affidavit arabic translation requirement",
    ],
    keywords: [["affidavit", "translating", "before", "notary"], ["sworn", "statement", "into", "arabic"], ["affidavit", "arabic", "translation"]],
    next: ["tr-notary-what-is-needed", "tr-translation-affidavit", "tr-uae-translation-for-abroad"],
  },
  {
    id: "tr-notary-copy-translation",
    question: "Can a translation of a copy be notarised?",
    answer:
      "Be careful here: a notary acts on what is in front of them, and a translation made from a photocopy is a translation of a photocopy. Where an authority later wants the translation tied to the attested original, that distinction is exactly what they check. Establish which document the chain has to run through before anything is translated.",
    service: SERVICE,
    phrases: [
      "can a translation of a copy be notarised",
      "does the translation have to be from the original",
      "translating from a photocopy for official use",
      "certified copy versus original for translation",
    ],
    keywords: [["translation", "copy", "be", "notarised"], ["translation", "from", "the", "original"], ["certified", "copy", "versus", "original"]],
    next: ["tr-proc-originals", "tr-reject-wrong-document-translated", "tr-notary-what-is-needed"],
  },
  {
    id: "tr-notary-english-instrument",
    question: "Can I keep my agreement in English and notarise it anyway?",
    answer:
      "Do not plan on it. The safe assumption for a Dubai notary is that Arabic is required, and any exception is something to confirm with the notary office in advance rather than to discover on the day. If someone has told you English alone is fine for your particular instrument, get that from the office that will actually perform the act.",
    service: SERVICE,
    phrases: [
      "can i keep my agreement in english and notarise it anyway",
      "english language instrument at the dubai notary",
      "must every notarised agreement have arabic",
      "is an english contract notarisable here",
    ],
    keywords: [["agreement", "english", "notarise", "anyway"], ["english", "language", "instrument", "notary"], ["english", "contract", "notarisable"]],
    next: ["tr-notary-what-is-needed", "tr-arabic-requirement-reason", "tr-english-only-departments"],
  },
  {
    id: "tr-notary-private-notary",
    question: "Does a private notary have different translation rules?",
    answer:
      "The language requirement is the same: the act is in Arabic and the translation has to come from a licensed translator. What differs between a private notary and a public one is convenience, availability and their own procedure. Ask the specific office what they want to see, because their document checklist is theirs to set.",
    service: SERVICE,
    phrases: [
      "does a private notary have different translation rules",
      "private notary in dubai translation requirements",
      "is a private notary the same for arabic documents",
      "choosing between a public and private notary translation",
    ],
    keywords: [["private", "notary", "different", "translation"], ["private", "notary", "translation", "requirements"]],
    next: ["tr-notary-what-is-needed", "tr-who-decides-requirement", "tr-notary-bilingual-layout"],
  },
  {
    id: "tr-notary-corrections",
    question: "The notary marked a correction on my document. What now?",
    answer:
      "Any correction has to be carried across to both language versions, and a change made only on one side creates precisely the discrepancy a bilingual instrument exists to avoid. If the notary altered the Arabic, get the English brought into line before you leave with it, not on the way to the next appointment.",
    service: SERVICE,
    phrases: [
      "the notary marked a correction on my document what now",
      "changes made to the arabic at the notary office",
      "amendment on one language version only",
      "correcting a bilingual document after the notary",
    ],
    keywords: [["notary", "marked", "correction"], ["changes", "arabic", "notary", "office"], ["amendment", "one", "language", "version"]],
    next: ["tr-proc-amendments", "tr-notary-bilingual-layout", "tr-which-version-prevails"],
  },
  {
    id: "tr-notary-what-you-receive",
    question: "What should I walk out of the notary with?",
    answer:
      "The bilingual instrument that was actually notarised, including the language you can read, plus any receipt for documents left behind. Check before you leave that what you are holding matches what you signed. Being handed an Arabic-only page and told it is fine is the moment to ask questions, not a formality to accept.",
    service: SERVICE,
    phrases: [
      "what should i walk out of the notary with",
      "what document do i keep after the notary appointment",
      "i was handed something i cannot read at the notary",
      "checking what i received from the notary office",
    ],
    keywords: [["walk", "out", "notary", "with"], ["keep", "after", "notary", "appointment"], ["notary", "handed", "cannot", "read"]],
    next: ["tr-notary-then-mofa", "tr-notary-corrections", "tr-proc-extra-copies"],
  },

  /* ── Money ─────────────────────────────────────────────────────────────────
   *
   * Every entry below is `quote: true`, which means the answer is followed in
   * the same turn by the translation qualification and then the callback form.
   * None of them states a figure, because none of them can: the price of a
   * translation depends on the document in front of you, and the price of an
   * attestation chain depends on a government schedule that is not ours to
   * quote. An honest sentence and a person who will call is worth more than a
   * number that turns out to be wrong.
   *
   * The keyword groups here are deliberately two and three words and always
   * scoped to this service — `["translation", "cost"]` rather than `["cost"]`.
   * A bare money word would fight the other four packs over questions that are
   * not ours, and a scoped pair wins at weight two exactly when the question
   * is about translation.
   * ------------------------------------------------------------------------ */
  {
    id: "tr-cost-general",
    question: "How much does legal translation cost?",
    answer:
      "There is no list price worth giving you, and anyone who quotes one before seeing the document is guessing. It depends on the language pair, the length and density of what is on the page, whether it is certified, and whether attestation steps sit around it. Tell us what the document is and what it is for, and you will get a real figure from someone who has looked at it.",
    service: SERVICE,
    phrases: [
      "how much does legal translation cost",
      "what is the price of a certified translation",
      "translation charges in dubai",
      "what do you charge for translating a document",
      "cost of translation services in the uae",
    ],
    keywords: [["translation", "cost"], ["translation", "price"], ["translation", "fee"], ["translation", "charges"], ["translation", "rates"], ["how", "much", "translate"]],
    opener: true,
    quote: true,
  },
  {
    id: "tr-cost-per-page",
    question: "Is translation charged per page?",
    answer:
      "Often, but what counts as a page differs between providers — some measure sheets, some measure a standard word count, and a dense certificate can be more than one either way. That is why two quotes priced \"per page\" are not comparable until you know the basis. Send the document and you will get the basis and the total together, rather than a rate you cannot apply.",
    service: SERVICE,
    phrases: [
      "is translation charged per page",
      "what is the per page rate for translation",
      "price per page for a certified translation",
      "do you charge by the page or by the word",
    ],
    keywords: [["translation", "per", "page"], ["per", "page", "rate"], ["page", "price", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-per-word",
    question: "Is translation priced per word?",
    answer:
      "Technical and long-form work often is, because it reflects the actual volume rather than how the pages were laid out. Certified certificate work is more commonly per document or per page. Either way the honest number comes from the file itself, so send it and the basis will be stated with the price.",
    service: SERVICE,
    phrases: [
      "is translation priced per word",
      "what is your per word rate",
      "word count pricing for translation",
      "how do you calculate a translation price",
    ],
    keywords: [["translation", "per", "word"], ["per", "word", "rate"], ["word", "count", "pricing"]],
    quote: true,
  },
  {
    id: "tr-cost-certified",
    question: "What does a certified translation cost?",
    answer:
      "More than an uncertified one, because a licensed translator is putting their registration behind it and the whole document has to be rendered rather than the useful parts. Beyond that it is the same variables: language, length, and what has to happen around it. One photograph of the document is enough for a real answer.",
    service: SERVICE,
    phrases: [
      "what does a certified translation cost",
      "price for a stamped legal translation",
      "how much for a translation with the translator stamp",
      "certified translation price dubai",
    ],
    keywords: [["certified", "translation", "cost"], ["certified", "translation", "price"], ["stamped", "translation", "price"]],
    quote: true,
  },
  {
    id: "tr-cost-sworn",
    question: "What does a sworn translation cost?",
    answer:
      "In UAE terms a sworn translation is a legal translation by a licensed translator, so it prices the same way — by the document rather than by the label. If the word \"sworn\" came from a foreign authority, the thing that changes the cost is what they require on top, which is worth establishing before anyone quotes. Tell us who asked and we will scope it properly.",
    service: SERVICE,
    phrases: [
      "what does a sworn translation cost",
      "price of a sworn translation in dubai",
      "how much is a sworn translator",
      "sworn translation fees uae",
    ],
    keywords: [["sworn", "translation", "cost"], ["sworn", "translation", "price"], ["sworn", "translator", "fees"]],
    quote: true,
  },
  {
    id: "tr-cost-mofa-attested",
    question: "What does a MoFA attested translation cost?",
    answer:
      "Two separate costs sit inside that question — the translator's work and the government attestation fees, which are set by the authority and are not ours to quote. A quote that folds them into one number is a quote you cannot check, so ask for them as separate lines. Send the document and you will get both, itemised, from someone who has seen what stamps it already carries.",
    service: SERVICE,
    phrases: [
      "what does a mofa attested translation cost",
      "attested translation cost",
      "cost of attestation and translation together",
      "mofaic fees plus translation price",
      "how much for an attested legal translation",
    ],
    keywords: [["mofa", "attested", "translation", "cost"], ["attested", "translation", "cost"], ["attestation", "translation", "together", "cost"], ["mofaic", "fees", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-technical",
    question: "What does technical translation cost?",
    answer:
      "More than a certificate, and for a reason worth knowing: it takes a translator with the subject vocabulary, usually a glossary, and often a review pass. The trade is that a specification translated cheaply and wrongly costs more to fix than it saved. Send a representative page or two and the scope can be priced honestly rather than optimistically.",
    service: SERVICE,
    phrases: [
      "what does technical translation cost",
      "price for translating a technical manual",
      "engineering translation rates in dubai",
      "how much to translate a specification",
    ],
    keywords: [["technical", "translation", "cost"], ["technical", "translation", "price"], ["engineering", "translation", "rates"]],
    quote: true,
  },
  {
    id: "tr-cost-interpreter",
    question: "How much does an interpreter cost?",
    answer:
      "Interpreting is priced on time and setting rather than on words — a two-hour meeting, a full day on site and a conference with equipment are three different jobs. Minimum booking periods are normal, and simultaneous work needs two interpreters, which people are often surprised by. Tell us the date, the hours, the languages and where it is, and the figure will be real.",
    service: SERVICE,
    phrases: [
      "how much does an interpreter cost",
      "what is the hourly rate for an interpreter",
      "interpreter charges in dubai",
      "price for booking an interpreter",
      "what do you charge for interpreting",
    ],
    keywords: [["interpreter", "cost"], ["interpreter", "rate"], ["interpreter", "fee"], ["interpreter", "charges"], ["interpreting", "price"], ["how", "much", "interpreter"]],
    quote: true,
  },
  {
    id: "tr-cost-interpreter-day",
    question: "Is there a half-day or full-day rate for interpreters?",
    answer:
      "Usually, and the half-day and full-day bands are where most assignments land. What changes the number is whether the work is simultaneous — that needs a pair — and whether there is travel or equipment. Give us the hours and the setting and the right band can be quoted rather than guessed at.",
    service: SERVICE,
    phrases: [
      "is there a half day rate for interpreters",
      "full day interpreter price in dubai",
      "minimum booking time for an interpreter",
      "how are interpreting hours charged",
    ],
    keywords: [["half", "day", "interpreter", "rate"], ["full", "day", "interpreter", "price"], ["minimum", "booking", "interpreter"]],
    quote: true,
  },
  {
    id: "tr-cost-court-interpreter",
    question: "What does a court interpreter cost?",
    answer:
      "It depends on whether the court appoints one, in which case the court's own schedule applies, or whether you are arranging one yourself. Hearings also run over, so the booking has to allow for that rather than assume the listed time. Tell us which court and which stage, and the position can be checked before you commit to anything.",
    service: SERVICE,
    phrases: [
      "what does a court interpreter cost",
      "price of an interpreter for a hearing",
      "legal interpreting fees in dubai",
      "how much is an interpreter for a police statement",
    ],
    keywords: [["court", "interpreter", "cost"], ["interpreter", "hearing", "price"], ["legal", "interpreting", "fees"]],
    quote: true,
  },
  {
    id: "tr-cost-conference",
    question: "What does conference interpreting cost?",
    answer:
      "It is built from three things: the interpreters, who work in pairs per language, the equipment, and the number of sessions. That is why a one-line answer is impossible and why an honest quote asks about the programme first. Send the dates, the languages and the venue, and you will get a breakdown rather than a headline number.",
    service: SERVICE,
    phrases: [
      "what does conference interpreting cost",
      "price for simultaneous interpreting at an event",
      "interpretation booth hire price",
      "budget for a multilingual conference in dubai",
    ],
    keywords: [["conference", "interpreting", "cost"], ["simultaneous", "interpreting", "price"], ["booth", "hire", "price"]],
    quote: true,
  },
  {
    id: "tr-cost-urgent",
    question: "Does urgent work cost more?",
    answer:
      "Usually, because it means someone working outside the normal queue or outside normal hours. What an urgency charge cannot buy is a faster government office — attestation steps run at their own pace whatever you pay. So the useful question is which part of your chain is actually on the critical path, and that is answerable once someone has seen the case.",
    service: SERVICE,
    phrases: [
      "does urgent work cost more",
      "what is the express translation charge",
      "rush fee for same day translation",
      "how much extra for urgent documents",
    ],
    keywords: [["urgent", "translation", "cost"], ["express", "translation", "charge"], ["rush", "fee", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-language-pair",
    question: "Does the language change the price?",
    answer:
      "Yes, and more than most people expect. Arabic and English is the deepest market here so it prices accordingly; a rare pair with few licensed translators costs more and takes longer to arrange, and a document routed through a bridge language is effectively two jobs. Name the language when you ask and the answer stops being generic.",
    service: SERVICE,
    phrases: [
      "does the language change the price",
      "is a rare language more expensive to translate",
      "do different language pairs cost differently",
      "why is my language more expensive",
    ],
    keywords: [["language", "change", "price"], ["rare", "language", "expensive"], ["language", "pairs", "cost"]],
    quote: true,
  },
  {
    id: "tr-cost-minimum",
    question: "Is there a minimum charge for a short document?",
    answer:
      "Generally yes. A one-page certificate still involves a licensed translator reading, rendering, formatting and certifying it, so it does not scale down to nothing. Where you have several short documents, sending them together is usually better value than one at a time — worth mentioning when you ask.",
    service: SERVICE,
    phrases: [
      "is there a minimum charge for a short document",
      "how much for one page only",
      "minimum fee for a small translation",
      "i only have a short certificate to translate",
    ],
    keywords: [["minimum", "charge", "translation"], ["minimum", "fee", "translation"], ["one", "page", "only", "cost"]],
    quote: true,
  },
  {
    id: "tr-cost-bulk",
    question: "Is there a discount for a large volume?",
    answer:
      "For bulk and for ongoing work, usually — repeated material, a shared glossary and a predictable format all reduce the effort per page, and that should be reflected in the price rather than pocketed. Tell us the volume and how often it recurs, and it can be quoted as an arrangement instead of a stack of one-off jobs.",
    service: SERVICE,
    phrases: [
      "is there a discount for a large volume",
      "bulk translation pricing for a company",
      "do you offer a rate for regular work",
      "corporate translation account pricing",
    ],
    keywords: [["bulk", "translation", "pricing"], ["volume", "discount", "translation"], ["corporate", "translation", "pricing"]],
    quote: true,
  },
  {
    id: "tr-cost-vat-invoice",
    question: "Will I get a proper invoice, and is VAT included?",
    answer:
      "You should get an itemised invoice showing what each part of the work is — translation, any attestation fees paid on your behalf, courier — with tax treated correctly. Government fees passed through are not the same line as a service fee, and a provider who cannot separate them is a provider you cannot check. Ask for the breakdown before you pay, not after.",
    service: SERVICE,
    phrases: [
      "will i get a proper invoice for translation",
      "is vat included in the translation price",
      "can i have a tax invoice for my documents",
      "itemised bill for translation and attestation",
    ],
    keywords: [["vat", "translation", "price"], ["tax", "invoice", "translation"], ["itemised", "bill", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-payment",
    question: "How and when do I pay?",
    answer:
      "Terms are agreed before the work starts, and for regulated steps it is normal to pay government fees up front because those are paid to the authority on your behalf rather than held. What you should always have is the scope and the amount in writing first. If anyone asks for money before telling you what it covers, that is the point to stop.",
    service: SERVICE,
    phrases: [
      "how and when do i pay for translation",
      "payment terms for document work",
      "do i have to pay in advance for translation",
      "what payment methods do you accept",
    ],
    keywords: [["pay", "advance", "translation"], ["payment", "terms", "document"], ["payment", "methods", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-extra-copies",
    question: "What do extra stamped copies cost?",
    answer:
      "Less than the first one, and far less than coming back for one later, because the translation already exists and it is the certification and printing being repeated. Work out how many bodies will each want to keep an original before the job closes. Tell us the number when you ask and it goes into the same quote.",
    service: SERVICE,
    phrases: [
      "what do extra stamped copies cost",
      "price for additional certified copies",
      "how much for a second original of my translation",
      "cost of more copies later",
    ],
    keywords: [["extra", "copies", "cost"], ["additional", "certified", "copies", "price"], ["more", "copies", "later", "cost"]],
    quote: true,
  },
  {
    id: "tr-cost-review",
    question: "What does an independent review cost?",
    answer:
      "It is priced as its own piece of work, because it is one — a second qualified reader going through the Arabic against the original for meaning rather than for typos. On a contract or a court document it is cheap next to what an unnoticed error costs. Send the document and the context and it can be scoped for what it actually needs.",
    service: SERVICE,
    phrases: [
      "what does an independent review cost",
      "price for checking an existing translation",
      "how much to have my arabic contract reviewed",
      "second opinion on a translation cost",
    ],
    keywords: [["independent", "review", "cost"], ["checking", "existing", "translation", "price"], ["second", "opinion", "translation", "cost"]],
    quote: true,
  },
  {
    id: "tr-cost-why-no-price-list",
    question: "Why is there no price list for translation?",
    answer:
      "Because two documents that look alike can be very different work, and because part of what you are paying is government fees that are not ours to set or to promise. A number given before the document is seen is either padded to be safe or too low to honour. The five minutes it takes to look at your document is what turns a guess into a quote.",
    service: SERVICE,
    phrases: [
      "why is there no price list for translation",
      "why can nobody quote a translation price up front",
      "is there a fixed rate for translating documents",
      "i just want a rough idea what translation costs",
    ],
    keywords: [["price", "list", "translation"], ["fixed", "rate", "translating"], ["rough", "idea", "translation", "costs"]],
    quote: true,
  },
  {
    id: "tr-cost-cheaper",
    question: "Is there a cheaper way to do this?",
    answer:
      "Sometimes, and it is usually about doing less rather than paying less — checking whether the authority accepts English at all, whether your document is already bilingual, whether an extract will do, or whether a previous translation can be reused. Those questions are free to ask and occasionally remove the job entirely. The one thing that is not a saving is an unlicensed translation, which gets refused.",
    service: SERVICE,
    phrases: [
      "is there a cheaper way to do this",
      "what is the cheapest legal translation option",
      "how can i reduce my translation costs",
      "is legal translation expensive",
      "is legal translation expensive in dubai",
    ],
    keywords: [["cheaper", "translation", "option"], ["cheapest", "legal", "translation"], ["translation", "expensive"]],
    quote: true,
  },
  {
    id: "tr-cost-compare-quotes",
    question: "How do I compare two translation quotes?",
    answer:
      "Line by line, on four points: what counts as a page or a word, whether certification is included, whether government fees are listed separately, and what happens if the authority refuses it. A cheaper headline with a different page definition is not cheaper. Send us both quotes and the document if you want a straight read on them.",
    service: SERVICE,
    phrases: [
      "how do i compare two translation quotes",
      "one quote is much cheaper than the other",
      "how to check a translation quotation is fair",
      "comparing prices between translation agencies",
    ],
    keywords: [["compare", "translation", "quotes"], ["translation", "quotation", "fair"], ["comparing", "prices", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-refund",
    question: "What happens to the money if it gets refused?",
    answer:
      "It depends on why. Where the error is the provider's — an unlicensed translator, a missing page — putting it right is theirs to do. Where an authority changes what it wants, or the requirement was different from what you were told at the start, that is a new piece of work. Agree that distinction in writing before the job begins; it is much harder to settle afterwards.",
    service: SERVICE,
    phrases: [
      "what happens to the money if it gets refused",
      "do i get a refund if my translation is rejected",
      "who pays when a document is turned down",
      "is redoing a refused translation free",
    ],
    keywords: [["refund", "translation", "rejected"], ["pays", "document", "turned", "down"], ["redoing", "refused", "translation"]],
    quote: true,
  },
  {
    id: "tr-cost-quote-request",
    question: "Can you give me a quote for my document?",
    answer:
      "Yes — send a photo or scan of every page and say what the document is for and who will receive it. That second part matters as much as the first, because the same certificate is a different job depending on whether an employer, a ministry or a foreign embassy is reading it. Leave your number and someone will come back with a figure and the steps for your case.",
    service: SERVICE,
    phrases: [
      "can you give me a quote for my document",
      "i want a quote for translating my certificate",
      "please send me a price for this document",
      "how do i get a quotation for translation",
      "can someone call me about translation costs",
      "give me a price for document translation",
    ],
    keywords: [["quote", "for", "my", "document"], ["quote", "translating", "certificate"], ["quotation", "for", "translation"], ["call", "me", "translation"]],
    opener: true,
    quote: true,
  },
];
