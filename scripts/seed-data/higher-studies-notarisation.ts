/**
 * Every question a student asks about getting their documents notarised,
 * attested and recognised in Dubai — and how those questions connect.
 *
 * The fourth authored pack, beside ./attestation-flows.ts, ./notarisation.ts and
 * ./business-setup-flows.ts. It exists because the student is a different person
 * from the other three packs' visitor and asks in a different voice: not "what is
 * a notarial deed" but "my uni wants a notarised copy of my marksheet, what do I
 * do". The notarisation pack answers the first. Nothing answered the second.
 *
 * WHY THE IDS AND THE WORDING ARE STUDENT-SHAPED
 *
 * Four packs are concatenated and built as one graph, and `matchByPhrase` takes
 * the first candidate whose phrase appears in the message — across the whole
 * merged set, not within a pack. So a phrase written here as a bare sentence
 * ("do I need to notarise this?") would be competing with a hundred and fifty
 * notary answers for it, and would usually lose.
 *
 * Every phrasing here is therefore anchored on something only a student says —
 * degree, transcript, marksheet, university, admission, intake, equivalency,
 * student visa, registrar, scholarship. That is not decoration. It is what makes
 * these two hundred and some answers reachable at all, and it is checked
 * mechanically in tests/higher-studies-notarisation.test.ts against the merged
 * set rather than against this file alone.
 *
 * WHY ONE SERVICE THROUGHOUT
 *
 * Every entry names `higher-studies`, even the ones that are notary or
 * attestation work in substance. `quote` walks the reply into the named service's
 * qualification, and the qualification is the thing the visitor actually
 * experiences: a student asking what a notarised transcript costs should be
 * asked what they want to study and where, not what their business will sell.
 * Splitting the pack by subject matter would split it by the wrong axis.
 *
 * WHAT MAY BE SAID HERE
 *
 * lib/chat/prompt.ts's rules, and they bind harder on written content than on
 * generated content, because a person wrote these and no model is in the loop to
 * hedge them:
 *
 *   - No fee, processing time, validity period, quota, grade threshold or
 *     eligibility rule stated as fact. University and ministry requirements move,
 *     and a student who missed an intake because of a sentence here got it from
 *     us. Say what it depends on and who confirms it.
 *   - Nothing implying we notarise, attest or legalise anything. We check
 *     documents and introduce people to licensed providers. The notary, the
 *     ministry and the university are always someone else.
 *   - No promised outcome. An admissions office can refuse, an equivalency
 *     application can be declined, and a notary can turn a document away.
 *
 * The one hard fact stated plainly and repeatedly is convention membership: the
 * UAE is not a party to the Hague Apostille Convention, so no apostille is issued
 * on a UAE degree and a foreign apostille is not sufficient here. It is stable,
 * checkable, and the single most expensive thing students are wrong about —
 * an agent abroad sells them an apostille and tells them the job is finished.
 * The procedural detail around it is still hedged, because that moves.
 *
 * A money question gets no number. It gets an honest sentence and `quote: true`,
 * which walks it into the higher-studies qualification and ends at the callback
 * form. There are deliberately many of them here, in many registers — "how much",
 * "is it expensive", "what's the damage", "my dad wants to know the total" —
 * because a student asking about money is the one moment where a paragraph is
 * worth less to them than a person.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Every id here starts with this. `att-`, `not-` and `biz-` belong to the other
 *  content modules concatenated with this one; a collision is a silently
 *  overwritten answer, so the namespace is checked in the tests. */
const SERVICE = "higher-studies";

/**
 * A money question's keyword groups: one price word, plus the subject's nouns.
 *
 * Written once rather than per entry because it encodes a rule about weights,
 * not a preference. `matchByKeywords` ranks an AND-group by its LENGTH, and
 * ties go to the earlier candidate — and the earlier candidates are the three
 * packs concatenated ahead of this one. So a money entry only wins a price
 * question if its group is strictly longer than whatever prose entry would
 * otherwise answer it: the attestation pack's `["degree","attestation"]` and
 * `["school","certificate","attestation"]` are the ones that matter, at two and
 * three. A price word plus two or three subject nouns clears both, and every
 * word of it is genuinely present in the question rather than padding.
 *
 * One trap in choosing the subjects: `sameWord` treats two words sharing five
 * leading characters as one, so "translating", "transcripts" and "transfer" are
 * all one word here. A group pairing two of them asks for the same word twice and
 * fires far wider than it reads.
 *
 * The cluster hubs are held to the opposite rule — groups of at most two words —
 * so that a hub is what answers a vague message and never what intercepts a
 * specific one. Both halves are enforced in tests/higher-studies-notarisation.
 */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

export const HIGHER_STUDIES_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "hst-hub-start",
    question: "I am applying to university and my documents need to be notarised",
    answer:
      "Almost every application asks for something done to your certificates before they count — notarisation, attestation, legalisation, translation or equivalency — and the four are different steps that students are constantly told to mix up. Getting the order wrong is the usual reason a file comes back. Where shall we start?",
    service: SERVICE,
    phrases: [
      "i am applying to university and my documents need to be notarised",
      "my university documents need notarisation",
      "what do i need to do with my certificates for university",
      "help me get my study documents ready",
      "i am applying for a masters and need my papers sorted",
      "where do i start with my education documents",
    ],
    keywords: [["university", "documents"], ["education", "documents"]],
    opener: true,
    faq: false,
    choices: [
      { label: "Which step do I actually need?", to: "hst-which-step" },
      { label: "My degree certificate", to: "hst-hub-degree" },
      { label: "My school certificates", to: "hst-hub-school" },
      { label: "Equivalency in the UAE", to: "hst-hub-equivalency" },
      { label: "Studying abroad", to: "hst-hub-abroad" },
    ],
    next: ["hst-which-step", "hst-order-of-steps", "hst-what-documents"],
  },
  {
    id: "hst-hub-degree",
    question: "My degree certificate and transcripts need attesting for study",
    answer:
      "A degree certificate and its transcripts usually travel together and are treated as one job, but they are separate documents and a receiving office can accept one and reject the other. Which part are you working out?",
    service: SERVICE,
    phrases: [
      "my degree certificate needs attesting for study",
      "i need my transcripts attested for university",
      "what do i do with my degree certificate and marksheets",
      "help with my degree certificate for higher studies",
      "attesting my bachelors degree for a masters application",
    ],
    keywords: [["degree", "transcripts"], ["marksheets", "degree"]],
    opener: true,
    faq: false,
    choices: [
      { label: "Original or copy?", to: "hst-degree-original-or-copy" },
      { label: "Transcripts and marksheets", to: "hst-transcripts-separate" },
      { label: "My university has to send it", to: "hst-university-sends-sealed" },
      { label: "It is from another country", to: "hst-degree-foreign-country" },
      { label: "I have lost the original", to: "hst-lost-original" },
    ],
    next: ["hst-degree-original-or-copy", "hst-transcripts-separate", "hst-degree-foreign-country"],
  },
  {
    id: "hst-hub-school",
    question: "My school certificates need to be ready for a university application",
    answer:
      "School leaving certificates, grade twelve results and board marksheets are the documents most often sent back, usually because the school's own stamp was missing before anything else was done to them. Which of them are you dealing with?",
    service: SERVICE,
    phrases: [
      "my school certificates need to be ready for university",
      "attesting my grade twelve certificate for university",
      "what do i do with my school leaving certificate",
      "my board marksheet needs attestation for college",
      "high school certificate for a university application",
    ],
    keywords: [["school", "certificates"], ["board", "marksheet"]],
    faq: false,
    choices: [
      { label: "Grade 12 or board results", to: "hst-grade-twelve" },
      { label: "School leaving certificate", to: "hst-leaving-certificate" },
      { label: "A UAE school, for a foreign university", to: "hst-uae-school-abroad" },
      { label: "A foreign school, for a UAE university", to: "hst-foreign-school-uae" },
    ],
    next: ["hst-grade-twelve", "hst-leaving-certificate", "hst-school-stamp-first"],
  },
  {
    id: "hst-hub-equivalency",
    question: "I need equivalency for my qualification in the UAE",
    answer:
      "Equivalency is the UAE ministry of education recognising a qualification earned elsewhere as comparable to a UAE one. It is a separate application from attestation, it comes after it rather than instead of it, and it is where most UAE applications stall. What do you need to know?",
    service: SERVICE,
    phrases: [
      "i need equivalency for my qualification in the uae",
      "how does certificate equivalency work in the uae",
      "my degree needs equivalency in dubai",
      "ministry of education equivalency for my degree",
      "do i need equivalency for my foreign degree",
    ],
    keywords: [["equivalency", "works"], ["ministry", "equivalency"]],
    opener: true,
    faq: false,
    choices: [
      { label: "What equivalency actually is", to: "hst-equivalency-what" },
      { label: "Do I need it?", to: "hst-equivalency-need-it" },
      { label: "What it asks for", to: "hst-equivalency-documents" },
      { label: "If it is refused", to: "hst-equivalency-refused" },
      { label: "Online and distance degrees", to: "hst-equivalency-online" },
    ],
    next: ["hst-equivalency-what", "hst-equivalency-need-it", "hst-equivalency-documents"],
  },
  {
    id: "hst-hub-translation",
    question: "My academic documents are not in English or Arabic",
    answer:
      "A document in a third language normally needs a legal translation before anyone here will act on it, and the translation has to come from a translator the receiving authority accepts rather than from whoever is cheapest. Which part is the problem?",
    service: SERVICE,
    phrases: [
      "my academic documents are not in english or arabic",
      "my degree certificate is in another language",
      "do my transcripts need translating for university",
      "translating my marksheets for a uae university",
      "my certificate is in french and the university wants arabic",
    ],
    keywords: [["translating", "marksheets"], ["academic", "language"]],
    faq: false,
    choices: [
      { label: "Who may translate it", to: "hst-translator-who" },
      { label: "Translate before or after?", to: "hst-translate-order" },
      { label: "Does the translation get notarised?", to: "hst-translation-notarised" },
      { label: "Arabic for a UAE university", to: "hst-arabic-for-uae-uni" },
    ],
    next: ["hst-translator-who", "hst-translate-order", "hst-translation-notarised"],
  },
  {
    id: "hst-hub-affidavit",
    question: "My university wants a notarised affidavit or undertaking from me",
    answer:
      "Admissions offices and embassies ask students for a lot of signed statements — financial support, accommodation, a gap in study, an intention to return. The wording is what decides whether it is accepted, so it is worth knowing which one they meant. Which have you been asked for?",
    service: SERVICE,
    phrases: [
      "my university wants a notarised affidavit from me",
      "i need a notarised undertaking for my application",
      "the university asked for a sworn statement",
      "i have been asked for a notarised declaration for my studies",
      "what affidavit does a university need",
    ],
    keywords: [["notarised", "affidavit"], ["sworn", "statement"]],
    faq: false,
    choices: [
      { label: "Financial support affidavit", to: "hst-affidavit-financial" },
      { label: "Sponsor's letter", to: "hst-sponsor-letter" },
      { label: "Gap in my studies", to: "hst-affidavit-gap" },
      { label: "Accommodation or guardian", to: "hst-affidavit-accommodation" },
      { label: "Who has to sign it", to: "hst-affidavit-who-signs" },
    ],
    next: ["hst-affidavit-financial", "hst-sponsor-letter", "hst-affidavit-who-signs"],
  },
  {
    id: "hst-hub-poa",
    question: "Someone needs to handle my university paperwork for me",
    answer:
      "If you cannot be in the country where the documents are, a power of attorney is how you let a parent, sibling or agent collect a transcript, submit a file or accept an offer on your behalf. UAE notaries read these narrowly, so the powers have to be written out act by act. What do you need it for?",
    service: SERVICE,
    phrases: [
      "someone needs to handle my university paperwork for me",
      "power of attorney to collect my degree certificate",
      "can my father submit my university application for me",
      "authorising my brother to collect my transcripts",
      "i need someone to act for me on my admission",
    ],
    keywords: [["university", "paperwork"], ["attorney", "transcripts"]],
    faq: false,
    choices: [
      { label: "To collect my documents", to: "hst-poa-collect" },
      { label: "To submit my application", to: "hst-poa-submit" },
      { label: "I am outside the UAE", to: "hst-poa-from-abroad" },
      { label: "What has to go in it", to: "hst-poa-contents" },
      { label: "Cancelling it afterwards", to: "hst-poa-revoke" },
    ],
    next: ["hst-poa-collect", "hst-poa-contents", "hst-poa-from-abroad"],
  },
  {
    id: "hst-hub-abroad",
    question: "I am taking my UAE documents abroad to study",
    answer:
      "A certificate earned here and used overseas goes out through the legalisation route: the issuing authority, then the UAE ministry of foreign affairs, then the destination country's embassy or consulate in the UAE. The UAE is not a party to the Hague Apostille Convention, so nobody here issues an apostille on it. Which country are you asking about?",
    service: SERVICE,
    phrases: [
      "i am taking my uae documents abroad to study",
      "using my uae degree in another country",
      "my uae certificate for a foreign university",
      "sending my dubai documents overseas for admission",
      "legalising my uae degree for study abroad",
    ],
    keywords: [["documents", "abroad"], ["degree", "overseas"]],
    opener: true,
    faq: false,
    choices: [
      { label: "Is there an apostille?", to: "hst-apostille-outbound" },
      { label: "The embassy step", to: "hst-embassy-step" },
      { label: "UK, Europe, Canada, Australia", to: "hst-abroad-by-country" },
      { label: "A UAE university degree", to: "hst-uae-degree-abroad" },
    ],
    next: ["hst-apostille-outbound", "hst-embassy-step", "hst-abroad-by-country"],
  },
  {
    id: "hst-hub-inbound",
    question: "I am bringing my foreign certificates into the UAE to study",
    answer:
      "A certificate issued abroad has to be legalised in the country that issued it before the UAE will look at it, and then attested here. An apostille obtained in your home country is not sufficient on its own, because the UAE is not a party to the Apostille Convention. Which part are you at?",
    service: SERVICE,
    phrases: [
      "i am bringing my foreign certificates into the uae to study",
      "using my indian degree in the uae for a masters",
      "my foreign qualification for a dubai university",
      "getting my overseas certificate accepted in the uae",
      "i studied abroad and now want to study in dubai",
    ],
    keywords: [["foreign", "certificates"], ["overseas", "certificate"]],
    faq: false,
    choices: [
      { label: "I already have an apostille", to: "hst-apostille-inbound" },
      { label: "The order of the steps", to: "hst-inbound-order" },
      { label: "I am already in the UAE", to: "hst-inbound-already-here" },
      { label: "Then equivalency", to: "hst-equivalency-what" },
    ],
    next: ["hst-apostille-inbound", "hst-inbound-order", "hst-inbound-already-here"],
  },
  {
    id: "hst-hub-visa",
    question: "I need a student visa and I am not sure what it needs",
    answer:
      "A student visa is issued on the back of an offer and a set of documents the university or the authority sponsors you against, and the document work usually has to be finished before the visa file opens rather than alongside it. What are you trying to work out?",
    service: SERVICE,
    phrases: [
      "i need a student visa and i am not sure what it needs",
      "what documents does a student visa need",
      "student visa requirements for studying in dubai",
      "help me with my student visa file",
      "applying for a study visa in the uae",
    ],
    keywords: [["student", "visa"], ["study", "visa"]],
    faq: false,
    choices: [
      { label: "Which documents it wants", to: "hst-visa-documents" },
      { label: "Who sponsors a student", to: "hst-visa-sponsor" },
      { label: "I am already on a family visa", to: "hst-visa-family-to-student" },
      { label: "Visa for studying abroad", to: "hst-visa-abroad" },
    ],
    next: ["hst-visa-documents", "hst-visa-sponsor", "hst-visa-family-to-student"],
  },
  {
    id: "hst-hub-appointment",
    question: "What happens at the notary appointment for my student documents",
    answer:
      "The appointment itself is short, and it is nearly always the preparation that decides whether it works: the right identification, the right people present, and a document worded the way the receiving office asked for. What would you like to check?",
    service: SERVICE,
    phrases: [
      "what happens at the notary appointment for my student documents",
      "what do i bring to notarise my student papers",
      "do i have to attend the notary in person as a student",
      "booking a notary appointment for my university documents",
    ],
    keywords: [["notary", "appointment"], ["bring", "notarise"]],
    faq: false,
    choices: [
      { label: "What to bring", to: "hst-appointment-bring" },
      { label: "Do I have to be there?", to: "hst-appointment-in-person" },
      { label: "I am under eighteen", to: "hst-minor-appointment" },
      { label: "Can it be done online?", to: "hst-appointment-online" },
    ],
    next: ["hst-appointment-bring", "hst-appointment-in-person", "hst-minor-appointment"],
  },
  {
    id: "hst-hub-rejected",
    question: "My documents were rejected and my application is stuck",
    answer:
      "A rejection is usually about a formality rather than about you — a missing prior stamp, a name that does not match, a translation from the wrong source, or a step done in the wrong order. Almost all of them are fixable. What were you told?",
    service: SERVICE,
    phrases: [
      "my documents were rejected and my application is stuck",
      "the university rejected my attested certificate",
      "my equivalency application was refused",
      "they sent my degree certificate back",
      "my student documents were not accepted",
    ],
    keywords: [["documents", "rejected"], ["certificate", "returned"]],
    faq: false,
    choices: [
      { label: "Common reasons", to: "hst-rejection-reasons" },
      { label: "A name does not match", to: "hst-name-mismatch" },
      { label: "Do I start again?", to: "hst-rejection-start-again" },
      { label: "My intake deadline is close", to: "hst-deadline-close" },
    ],
    next: ["hst-rejection-reasons", "hst-name-mismatch", "hst-rejection-start-again"],
  },
  {
    id: "hst-hub-timing",
    question: "When should I start getting my study documents done",
    answer:
      "Earlier than feels necessary, because the steps are sequential — each office wants the previous one's stamp already on the paper — and none of them can be compressed by asking. The intake deadline is the fixed point to work backwards from. What is your situation?",
    service: SERVICE,
    phrases: [
      "when should i start getting my study documents done",
      "how early should i prepare my university documents",
      "my intake deadline is coming and my papers are not ready",
      "timing for getting my certificates attested for university",
    ],
    keywords: [["intake", "deadline"], ["prepare", "early"]],
    faq: false,
    choices: [
      { label: "The order of the steps", to: "hst-order-of-steps" },
      { label: "My deadline is close", to: "hst-deadline-close" },
      { label: "Can it be rushed?", to: "hst-can-it-be-rushed" },
      { label: "I have a conditional offer", to: "hst-conditional-offer" },
    ],
    next: ["hst-order-of-steps", "hst-deadline-close", "hst-can-it-be-rushed"],
  },
  {
    id: "hst-hub-paying",
    question: "I have questions about paying for my student document work",
    answer:
      "Honest answer first: the total depends on which documents you have, which country issued them, how many steps each one needs and which authority is receiving them, and the government portions are set by those authorities rather than by us. Rather than guess at a number, let us take your actual documents and come back to you with the real figure.",
    service: SERVICE,
    phrases: [
      "i have questions about paying for my student document work",
      "i want to talk about paying for my education documents",
      "who do i pay for my student paperwork",
    ],
    keywords: [
      ...priceGroups("student", "document"),
      ...priceGroups("education", "documents"),
    ],
    faq: false,
    quote: true,
  },
  {
    id: "hst-hub-scholarship",
    question: "I need documents for a scholarship or an education loan",
    answer:
      "Scholarship panels and education lenders ask for a different set of papers from admissions offices — income proof, bank statements, sponsorship undertakings — and they usually want them certified rather than just photocopied. Which are you applying for?",
    service: SERVICE,
    phrases: [
      "i need documents for a scholarship or an education loan",
      "what documents does a scholarship application need",
      "notarised documents for my education loan",
      "bank statements for my student application",
    ],
    keywords: [["scholarship", "documents"], ["education", "loan"]],
    faq: false,
    choices: [
      { label: "Scholarship paperwork", to: "hst-scholarship-documents" },
      { label: "Education loan paperwork", to: "hst-loan-documents" },
      { label: "Proving my sponsor's income", to: "hst-sponsor-income" },
      { label: "Bank statements", to: "hst-bank-statements" },
    ],
    next: ["hst-scholarship-documents", "hst-loan-documents", "hst-sponsor-income"],
  },
  {
    id: "hst-hub-special",
    question: "My situation with my study documents is complicated",
    answer:
      "Most of what looks like a dead end is a situation the offices have seen before: a lost certificate, a closed university, a single-name passport, parents who are separated, a document in a maiden name. Which is yours?",
    service: SERVICE,
    phrases: [
      "my situation with my study documents is complicated",
      "my education documents are a special case",
      "i have an unusual problem with my certificates",
    ],
    keywords: [["documents", "complicated"], ["unusual", "certificates"]],
    faq: false,
    choices: [
      { label: "I lost the original", to: "hst-lost-original" },
      { label: "My university has closed", to: "hst-university-closed" },
      { label: "One name in my passport", to: "hst-single-name" },
      { label: "My parents are separated", to: "hst-parents-separated" },
      { label: "My name has changed", to: "hst-name-changed" },
    ],
    next: ["hst-lost-original", "hst-university-closed", "hst-single-name"],
  },
  {
    id: "hst-hub-after",
    question: "I have finished studying and need my new degree recognised",
    answer:
      "A degree you have just been awarded needs the same treatment as any other certificate before an employer, a licensing body or a PhD admissions office here will act on it, and which route it takes depends on where it was awarded. What is it for?",
    service: SERVICE,
    phrases: [
      "i have finished studying and need my new degree recognised",
      "i just graduated and need my degree attested",
      "using my new masters degree for a job in dubai",
      "getting my fresh degree recognised in the uae",
    ],
    keywords: [["graduated", "attested"], ["degree", "recognised"]],
    faq: false,
    choices: [
      { label: "For a job here", to: "hst-degree-for-job" },
      { label: "For a PhD or further study", to: "hst-degree-for-phd" },
      { label: "For a professional licence", to: "hst-degree-for-licence" },
      { label: "Equivalency again?", to: "hst-equivalency-after-study" },
    ],
    next: ["hst-degree-for-job", "hst-degree-for-phd", "hst-degree-for-licence"],
  },

  /* ── Which step is this, actually ───────────────────────────────────────── */
  {
    id: "hst-which-step",
    question: "Does my certificate need notarisation or attestation for university",
    answer:
      "They are different things and universities use the words loosely. Notarisation is a notary confirming a signature or certifying a copy. Attestation is a chain of government stamps confirming the document is genuine. Equivalency is a ministry judging a foreign qualification against a UAE one. Send us the exact wording the university used and we can tell you which of the three they meant, because guessing costs a cycle.",
    service: SERVICE,
    phrases: [
      "does my certificate need notarisation or attestation for university",
      "notarisation or attestation for my degree",
      "what is the difference between notarisation and attestation for students",
      "the university said notarised but i think they mean attested",
      "which one do i need for my university application",
      "confused between notarised and attested certificates",
    ],
    keywords: [
      ["notarisation", "attestation", "university"],
      ["difference", "notarisation", "attestation", "students"],
      ["confused", "notarised", "attested", "certificates"],
    ],
    next: ["hst-what-is-notarisation-student", "hst-what-is-attestation-student", "hst-order-of-steps"],
  },
  {
    id: "hst-what-is-notarisation-student",
    question: "What does notarisation mean for a student document",
    answer:
      "For a student document it usually means one of two things: a notary certifying that a photocopy is a true copy of an original you showed them, or a notary witnessing you sign a statement such as a financial undertaking. It says nothing about whether your grades are real — that is what attestation is for. We check documents and introduce you to a licensed provider; the notary is always someone else.",
    service: SERVICE,
    phrases: [
      "what does notarisation mean for a student document",
      "what is a notarised copy of my certificate",
      "explain notarisation for university documents",
      "what does the notary do with my degree certificate",
    ],
    keywords: [
      ["notarisation", "student", "document"],
      ["notarised", "copy", "certificate"],
      ["notary", "degree", "certificate"],
    ],
    next: ["hst-true-copy", "hst-what-is-attestation-student", "hst-appointment-bring"],
  },
  {
    id: "hst-what-is-attestation-student",
    question: "What does attestation mean for my education certificates",
    answer:
      "Attestation is a chain: each authority stamps the document to confirm the previous stamp is genuine, ending with whoever needs to rely on it. For education documents it typically starts at the issuing school or university, runs through the education and foreign affairs authorities of the issuing country, and finishes at the receiving country's side. Which offices, and in which order, depends on the pair of countries involved.",
    service: SERVICE,
    phrases: [
      "what does attestation mean for my education certificates",
      "explain certificate attestation for students",
      "what is degree attestation",
      "why does my certificate need so many stamps",
    ],
    keywords: [
      ["attestation", "education", "certificates"],
      ["certificate", "attestation", "students"],
      ["certificate", "many", "stamps"],
    ],
    next: ["hst-order-of-steps", "hst-who-does-what", "hst-embassy-vs-ministry"],
  },
  {
    id: "hst-legalisation-meaning",
    question: "The university asked for my documents to be legalised",
    answer:
      "Legalisation is the word most countries use for the chain that ends at an embassy or consulate, and in practice it is the same idea as attestation described from the other end. If a university outside the UAE asked for legalised documents, they generally mean stamped by the UAE authorities and then by their own country's mission here. Ask them to name the final stamp they want — that removes all the ambiguity.",
    service: SERVICE,
    phrases: [
      "the university asked for my documents to be legalised",
      "what does legalised mean for my study documents",
      "legalisation of my degree for a foreign university",
      "difference between legalisation and attestation for students",
    ],
    keywords: [
      ["university", "documents", "legalised"],
      ["legalised", "study", "documents"],
      ["legalisation", "degree", "foreign", "university"],
    ],
    next: ["hst-embassy-step", "hst-apostille-outbound", "hst-who-does-what"],
  },
  {
    id: "hst-order-of-steps",
    question: "What order do the steps go in for my education documents",
    answer:
      "The principle is that each office wants to see the previous office's stamp already on the paper, so the sequence runs outward from where the document was issued: the issuing institution first, then its country's authorities, then the receiving country's side, and any translation or equivalency fitted in where that country requires. Do one out of turn and it is usually rejected rather than accepted early, which is the single most common way students lose a cycle.",
    service: SERVICE,
    phrases: [
      "what order do the steps go in for my education documents",
      "what is the correct sequence for attesting my degree",
      "which step comes first for my certificates",
      "do i translate before or after attestation",
      "correct order for my university paperwork",
    ],
    keywords: [
      ["order", "steps", "education", "documents"],
      ["sequence", "attesting", "degree"],
      ["step", "comes", "first", "certificates"],
    ],
    next: ["hst-translate-order", "hst-school-stamp-first", "hst-hub-timing"],
  },
  {
    id: "hst-what-documents",
    question: "Which of my documents do I actually need for a university application",
    answer:
      "Typically the qualification you are applying on the strength of, its transcripts, your passport, and whatever the specific programme adds — an English test result, a reference, a portfolio, a medical. The list varies by university and by country, so work from the offer letter or the programme page rather than from a general list, and treat anything ambiguous as something to confirm with admissions.",
    service: SERVICE,
    phrases: [
      "which of my documents do i actually need for a university application",
      "what papers do i need for my university application",
      "list of documents for a masters application",
      "what should i get ready for my admission",
      "do i need everything attested or only some documents",
    ],
    keywords: [
      ["documents", "university", "application"],
      ["papers", "university", "application"],
      ["documents", "masters", "application"],
      ["ready", "admission"],
    ],
    next: ["hst-how-many-copies", "hst-hub-degree", "hst-hub-school"],
  },
  {
    id: "hst-who-does-what",
    question: "Who actually does the attestation and what do you do",
    answer:
      "The stamps are applied by government authorities and licensed offices — a school or university registry, education and foreign affairs ministries, an embassy or consulate, a notary public. What we do is work out which of those your specific document needs and in which order, check it is fit to be submitted before it goes anywhere, and connect you with the licensed provider who handles the submission. We do not issue any of the stamps ourselves.",
    service: SERVICE,
    phrases: [
      "who actually does the attestation and what do you do",
      "do you attest my certificate yourselves",
      "are you an agent or the government",
      "who puts the stamps on my degree certificate",
    ],
    keywords: [
      ["actually", "does", "attestation"],
      ["attest", "certificate", "yourselves"],
      ["stamps", "degree", "certificate"],
    ],
    next: ["hst-what-is-attestation-student", "hst-embassy-vs-ministry", "hst-order-of-steps"],
  },
  {
    id: "hst-true-copy",
    question: "My university wants a certified true copy of my certificate",
    answer:
      "A certified true copy is someone with authority comparing a photocopy against the original in front of them and stamping the copy to say it matches. Universities ask for it so that you keep the original. Who is allowed to certify it varies — a notary, the issuing institution, sometimes the embassy — so check which of those the university names, because a copy certified by the wrong party is the same as an uncertified one.",
    service: SERVICE,
    phrases: [
      "my university wants a certified true copy of my certificate",
      "what is a certified true copy of a degree",
      "how do i get a true copy of my marksheet",
      "attested photocopy of my certificate for university",
    ],
    keywords: [
      ["certified", "true", "copy"],
      ["true", "copy", "degree"],
      ["attested", "photocopy", "certificate", "university"],
    ],
    next: ["hst-degree-original-or-copy", "hst-how-many-copies", "hst-appointment-bring"],
  },
  {
    id: "hst-embassy-vs-ministry",
    question: "Is it the embassy or the ministry that has to stamp my certificate",
    answer:
      "Usually both, in a fixed order, and which comes first depends on which direction the document is travelling. A document going out of the UAE generally finishes at the destination country's mission here; a document coming in generally starts with its own country's authorities and then the UAE mission there. The exact offices differ by country and they change their arrangements, so confirm the current chain for your pair of countries before paying for anything.",
    service: SERVICE,
    phrases: [
      "is it the embassy or the ministry that has to stamp my certificate",
      "do i go to the embassy or the ministry first for my degree",
      "embassy attestation for my education documents",
      "which office stamps my certificate first",
    ],
    keywords: [
      ["embassy", "ministry", "stamp", "certificate"],
      ["embassy", "attestation", "education", "documents"],
      ["office", "stamps", "certificate", "first"],
    ],
    next: ["hst-order-of-steps", "hst-embassy-step", "hst-hub-inbound"],
  },
  {
    id: "hst-how-many-copies",
    question: "How many attested copies of my certificates should I get",
    answer:
      "More than one, because each place that keeps your file keeps a copy: a university, an equivalency application, a visa file and a future employer will not share. Producing extra copies while the document is already in the chain is far easier than starting again later. Ask each receiving office whether they need to retain a copy or only to see one, and work from that.",
    service: SERVICE,
    phrases: [
      "how many attested copies of my certificates should i get",
      "how many copies of my degree do i need attested",
      "should i get extra attested copies for university",
      "do i need more than one attested transcript",
    ],
    keywords: [
      ["many", "attested", "copies", "certificates"],
      ["copies", "degree", "attested"],
      ["extra", "attested", "copies", "university"],
    ],
    next: ["hst-true-copy", "hst-degree-original-risk", "hst-what-documents"],
  },
  {
    id: "hst-digital-certificate",
    question: "My university only gave me a digital certificate with a QR code",
    answer:
      "Digital and QR-verified certificates are increasingly normal and increasingly accepted, but the offices in the chain each decide separately whether they will stamp a printout or insist on a signed original from the registry. If your university can issue a signed hard copy alongside the digital one, get it — it costs you one request now and avoids being stuck between two offices later.",
    service: SERVICE,
    phrases: [
      "my university only gave me a digital certificate with a qr code",
      "can a digital degree certificate be attested",
      "my degree is an online pdf can it be notarised",
      "e certificate from my university for attestation",
    ],
    keywords: [
      ["digital", "certificate", "code"],
      ["digital", "degree", "certificate", "attested"],
      ["online", "pdf", "notarised"],
    ],
    next: ["hst-university-sends-sealed", "hst-degree-original-or-copy", "hst-hub-degree"],
  },
  {
    id: "hst-do-i-need-notary-or-not",
    question: "Do I even need a notary for my university documents",
    answer:
      "Often not. A great deal of student document work is attestation and equivalency, where no notary is involved at all. A notary becomes necessary when you are signing something — an affidavit, an undertaking, a power of attorney — or when a receiving office specifically asks for a notarised copy. If nobody has asked for a notary in writing, that is a good sign you do not need one yet.",
    service: SERVICE,
    phrases: [
      "do i even need a notary for my university documents",
      "is a notary necessary for my student application",
      "can i skip notarisation for my degree",
      "does every student document need a notary",
    ],
    keywords: [
      ["need", "notary", "university", "documents"],
      ["notary", "necessary", "student", "application"],
      ["skip", "notarisation", "degree"],
    ],
    next: ["hst-which-step", "hst-university-said-notarised-copy", "hst-hub-affidavit"],
  },
  {
    id: "hst-university-said-notarised-copy",
    question: "The university just said notarised copies with no other detail",
    answer:
      "Write back and ask them one question: who do they want to have certified the copy, and do they need it in English or Arabic. An admissions office answering that in a line saves you a step you cannot undo, because a copy certified by the wrong party has to be redone from the original. It is a normal question and they are asked it constantly.",
    service: SERVICE,
    phrases: [
      "the university just said notarised copies with no other detail",
      "the university instructions about notarising are vague",
      "admissions did not say who should notarise my documents",
      "what do i ask the university about notarisation",
    ],
    keywords: [
      ["university", "notarised", "copies", "detail"],
      ["instructions", "notarising", "vague"],
      ["admissions", "notarise", "documents"],
    ],
    next: ["hst-true-copy", "hst-which-step", "hst-do-i-need-notary-or-not"],
  },

  /* ── Degree certificates and transcripts ────────────────────────────────── */
  {
    id: "hst-degree-original-or-copy",
    question: "Do I have to hand over the original degree certificate",
    answer:
      "Most offices in the chain want to see the original and stamp either it or a copy taken from it in front of them, and some will hold it while they work. That is normal, but it is also the reason to find out in advance which offices retain documents and for how long, and to have certified copies made before anything leaves your hands. Never post an original anywhere without agreeing first who is responsible for it.",
    service: SERVICE,
    phrases: [
      "do i have to hand over the original degree certificate",
      "will they keep my original certificate",
      "do i submit the original or a copy of my degree",
      "is it safe to give my original marksheet",
      "can i keep my original degree certificate",
    ],
    keywords: [
      ["hand", "over", "original", "degree", "certificate"],
      ["submit", "original", "copy", "degree"],
      ["safe", "original", "marksheet"],
    ],
    next: ["hst-degree-original-risk", "hst-true-copy", "hst-how-many-copies"],
  },
  {
    id: "hst-degree-original-risk",
    question: "What happens if my original certificate is lost in the process",
    answer:
      "It is rare, and it is also why the sequence matters: get certified copies made at the start, keep a photographed record of every page and every stamp, and use a provider who gives you a receipt naming the documents they hold. If an original does go missing, the issuing university is the only body that can replace it, and that is a slow route you do not want to be on.",
    service: SERVICE,
    phrases: [
      "what happens if my original certificate is lost in the process",
      "i am worried about losing my original degree",
      "what if the agent loses my marksheet",
      "how do i protect my original certificates",
    ],
    keywords: [
      ["original", "certificate", "lost", "process"],
      ["losing", "original", "degree"],
      ["protect", "original", "certificates"],
    ],
    next: ["hst-lost-original", "hst-degree-courier", "hst-how-many-copies"],
  },
  {
    id: "hst-transcripts-separate",
    question: "Do my transcripts need attesting separately from my degree certificate",
    answer:
      "Treat them as separate documents, because the offices do. They usually travel together and are handled in one visit, but each one is stamped in its own right, and a receiving office can accept the certificate and come back on the transcripts. Check whether the university wants the transcripts as a single consolidated record or year by year before you start.",
    service: SERVICE,
    phrases: [
      "do my transcripts need attesting separately from my degree certificate",
      "are transcripts and degree certificate attested together",
      "does my marksheet need its own attestation",
      "separate attestation for transcripts and degree",
    ],
    keywords: [
      ["transcripts", "attesting", "separately", "degree"],
      ["transcripts", "degree", "certificate", "together"],
      ["marksheet", "own", "attestation"],
    ],
    next: ["hst-consolidated-marksheet", "hst-marksheet-each-semester", "hst-transcript-sealed-envelope"],
  },
  {
    id: "hst-university-sends-sealed",
    question: "My university insists on sending the transcript directly to the new university",
    answer:
      "That is a common admissions requirement and it sits awkwardly with attestation, because a transcript sent institution to institution never passes through your hands to be stamped. Ask the receiving university whether the direct copy satisfies them on its own, and whether they separately need an attested copy from you. The two requirements are often both real and both satisfiable.",
    service: SERVICE,
    phrases: [
      "my university insists on sending the transcript directly to the new university",
      "my transcript has to be sent university to university",
      "can a transcript sent directly be attested",
      "official transcript sent by my college for admission",
    ],
    keywords: [
      ["university", "sending", "transcript", "directly"],
      ["transcript", "sent", "institution"],
      ["official", "transcript", "college", "admission"],
    ],
    next: ["hst-transcript-sealed-envelope", "hst-transcripts-separate", "hst-what-documents"],
  },
  {
    id: "hst-transcript-sealed-envelope",
    question: "My transcript came in a sealed envelope and I was told not to open it",
    answer:
      "Then do not open it, because the seal is the thing being relied on and breaking it usually voids the document for the purpose it was issued for. If an office in the chain needs to see the content, ask the university for a second copy issued for attestation rather than opening the sealed one. Universities issue sealed and unsealed copies for exactly this reason.",
    service: SERVICE,
    phrases: [
      "my transcript came in a sealed envelope and i was told not to open it",
      "can i open the sealed transcript envelope",
      "sealed marksheet envelope for my application",
      "does the notary need to open my sealed transcript",
    ],
    keywords: [
      ["transcript", "sealed", "envelope", "open"],
      ["sealed", "marksheet", "envelope", "application"],
      ["notary", "sealed", "transcript"],
    ],
    next: ["hst-university-sends-sealed", "hst-transcripts-separate", "hst-hub-degree"],
  },
  {
    id: "hst-degree-foreign-country",
    question: "My degree is from another country and I am in Dubai now",
    answer:
      "Then the first part of the chain happens where the degree was issued, not here, which is the fact that surprises people most: being in Dubai does not move the starting point. The issuing country's authorities have to act on it first, and only then does the UAE side become relevant. That can be handled without you flying back, usually through a representative or a service in that country.",
    service: SERVICE,
    phrases: [
      "my degree is from another country and i am in dubai now",
      "i am in dubai but my degree is from india",
      "can i attest my foreign degree while living in the uae",
      "my certificate was issued abroad and i live in dubai",
      "i am already in the uae and my degree is from overseas",
    ],
    keywords: [
      ["degree", "another", "country", "dubai"],
      ["attest", "foreign", "degree", "living", "uae"],
      ["certificate", "issued", "abroad", "live", "dubai"],
    ],
    next: ["hst-inbound-order", "hst-inbound-already-here", "hst-poa-collect"],
  },
  {
    id: "hst-degree-provisional",
    question: "I only have a provisional certificate not the final degree",
    answer:
      "A provisional certificate is a real document and is often enough to get an application moving, but many receiving offices treat it as a placeholder and ask for the final degree before they finish. Start with what you have, tell the receiving office exactly what it is, and ask whether they accept it conditionally. Do not let a provisional certificate sit unused while you wait for the final one.",
    service: SERVICE,
    phrases: [
      "i only have a provisional certificate not the final degree",
      "can a provisional certificate be attested",
      "my final degree has not been issued yet",
      "using my provisional degree for a masters application",
    ],
    keywords: [
      ["provisional", "certificate", "final", "degree"],
      ["provisional", "certificate", "attested"],
      ["final", "degree", "issued"],
    ],
    next: ["hst-degree-not-graduated-yet", "hst-conditional-offer", "hst-hub-degree"],
  },
  {
    id: "hst-degree-not-graduated-yet",
    question: "I have not graduated yet but the application deadline is now",
    answer:
      "Universities deal with this constantly and usually admit on a conditional basis against your current transcript and an expected completion letter from your institution. Get whatever your registry can issue now and have that prepared, so that when the final certificate arrives the only outstanding item is the certificate itself rather than the whole chain.",
    service: SERVICE,
    phrases: [
      "i have not graduated yet but the application deadline is now",
      "applying to university before i finish my degree",
      "can i apply for a masters while still studying",
      "my results are not out and the intake is closing",
    ],
    keywords: [
      ["graduated", "application", "deadline"],
      ["applying", "university", "before", "finish", "degree"],
      ["results", "intake", "closing"],
    ],
    next: ["hst-degree-provisional", "hst-conditional-offer", "hst-deadline-close"],
  },
  {
    id: "hst-degree-two-universities",
    question: "I studied at two universities and have credits from both",
    answer:
      "Each institution's documents are handled on their own, through the chain that applies to the country that issued them — so two universities in two countries is genuinely two jobs. Tell the receiving office up front that your record is split, and ask which parts they need attested; sometimes only the awarding institution's documents matter and the transfer credits are read from its transcript.",
    service: SERVICE,
    phrases: [
      "i studied at two universities and have credits from both",
      "i transferred universities during my degree",
      "documents from two different colleges for my application",
      "my credits are split between two institutions",
    ],
    keywords: [
      ["studied", "two", "universities", "credits"],
      ["transferred", "universities", "during", "degree"],
      ["documents", "two", "different", "colleges"],
    ],
    next: ["hst-transcripts-separate", "hst-equivalency-documents", "hst-hub-degree"],
  },
  {
    id: "hst-degree-backlog-subjects",
    question: "My transcript shows failed or repeated subjects will that matter",
    answer:
      "For attestation it does not matter at all — the offices in the chain confirm the document is genuine, not that the grades are good. It can matter to the university's admissions decision and sometimes to an equivalency assessment, which looks at the structure and duration of the programme. Present the record as it is; an altered or selectively presented transcript is a far worse problem than a repeated subject.",
    service: SERVICE,
    phrases: [
      "my transcript shows failed or repeated subjects will that matter",
      "do backlogs affect my certificate attestation",
      "my marksheet has a fail in it for my application",
      "does a repeated year matter for equivalency",
    ],
    keywords: [
      ["transcript", "failed", "repeated", "subjects"],
      ["backlogs", "affect", "certificate", "attestation"],
      ["repeated", "year", "matter", "equivalency"],
    ],
    next: ["hst-equivalency-documents", "hst-transcripts-separate", "hst-equivalency-refused"],
  },
  {
    id: "hst-marksheet-each-semester",
    question: "Do I need every semester marksheet attested or just the final one",
    answer:
      "It depends on who is receiving them. Admissions offices often want the full set; an equivalency assessment usually wants enough to show the programme's structure and duration; an employer may only want the degree. Ask before you pay for eight documents when three were wanted, and ask again before you pay for three when eight were wanted.",
    service: SERVICE,
    phrases: [
      "do i need every semester marksheet attested or just the final one",
      "all my semester marksheets for attestation",
      "do i attest every year marksheet for my application",
      "only the final marksheet or all of them",
    ],
    keywords: [
      ["semester", "marksheet", "attested", "final"],
      ["semester", "marksheets", "attestation"],
      ["year", "marksheet", "application"],
    ],
    next: ["hst-consolidated-marksheet", "hst-transcripts-separate", "hst-how-many-copies"],
  },
  {
    id: "hst-consolidated-marksheet",
    question: "Should I use the consolidated marksheet or the individual ones",
    answer:
      "A consolidated marksheet is convenient and is often accepted in place of the individual sheets, but some assessments want the year-by-year detail it summarises. If your registry issues both, prepare the consolidated one first and keep the individual sheets available, so you are not restarting the chain if they are asked for later.",
    service: SERVICE,
    phrases: [
      "should i use the consolidated marksheet or the individual ones",
      "is a consolidated marksheet enough for my application",
      "consolidated transcript for equivalency",
      "cumulative marksheet or separate ones for university",
    ],
    keywords: [
      ["consolidated", "marksheet", "individual"],
      ["consolidated", "marksheet", "enough", "application"],
      ["consolidated", "transcript", "equivalency"],
    ],
    next: ["hst-marksheet-each-semester", "hst-equivalency-documents", "hst-transcripts-separate"],
  },
  {
    id: "hst-university-name-changed",
    question: "My university has changed its name since I graduated",
    answer:
      "This is ordinary and the fix is documentary: ask the registry for a letter confirming the name change and that your certificate was issued by the same institution. Attach it to the file from the beginning rather than waiting for someone to query the mismatch, because a query part-way through the chain is what costs the time.",
    service: SERVICE,
    phrases: [
      "my university has changed its name since i graduated",
      "the college on my certificate has a different name now",
      "my university was renamed after i finished",
      "institution name mismatch on my degree certificate",
    ],
    keywords: [
      ["university", "changed", "name", "graduated"],
      ["college", "certificate", "different", "name"],
      ["institution", "name", "mismatch", "degree"],
    ],
    next: ["hst-university-closed", "hst-name-mismatch", "hst-rejection-reasons"],
  },
  {
    id: "hst-medium-of-instruction",
    question: "The university is asking for a medium of instruction certificate",
    answer:
      "That is a letter from your institution confirming your programme was taught and examined in English, and universities use it in place of an English test for applicants who studied in English. Your registry issues it. Whether it needs attesting depends on the receiving university, and it is worth asking, because it is a cheap document to prepare alongside the others and an awkward one to add later.",
    service: SERVICE,
    phrases: [
      "the university is asking for a medium of instruction certificate",
      "what is a medium of instruction letter",
      "moi certificate for my university application",
      "proof that my degree was taught in english",
    ],
    keywords: [
      ["medium", "instruction", "certificate"],
      ["medium", "instruction", "letter"],
      ["degree", "taught", "english"],
    ],
    next: ["hst-english-test", "hst-what-documents", "hst-hub-translation"],
  },
  {
    id: "hst-cgpa-conversion",
    question: "My grades are in a different system and the university wants a percentage",
    answer:
      "Ask your institution for its official conversion or grading scale rather than converting the numbers yourself, because an admissions office will accept the registry's statement and will not accept yours. Many universities publish their own conversion for common systems too, so check theirs before commissioning anything.",
    service: SERVICE,
    phrases: [
      "my grades are in a different system and the university wants a percentage",
      "converting my cgpa for a university application",
      "how do i convert my gpa for admission",
      "grading scale letter from my university",
    ],
    keywords: [
      ["grades", "different", "system", "percentage"],
      ["converting", "cgpa", "university", "application"],
      ["grading", "scale", "letter", "university"],
    ],
    next: ["hst-medium-of-instruction", "hst-equivalency-documents", "hst-what-documents"],
  },
  {
    id: "hst-english-test",
    question: "Does my English test result need attesting too",
    answer:
      "Usually not, because test providers verify results directly with institutions through their own systems, which is stronger than a stamp. Send the result to the university through the provider's official route and ask whether they need anything else. If a visa authority rather than a university is asking, check with them separately — their requirements are not always the same.",
    service: SERVICE,
    phrases: [
      "does my english test result need attesting too",
      "do i need to attest my ielts score",
      "attestation of my english language certificate",
      "does the toefl result need a stamp",
    ],
    keywords: [
      ["english", "test", "result", "attesting"],
      ["attest", "ielts", "score"],
      ["english", "language", "certificate", "attestation"],
    ],
    next: ["hst-medium-of-instruction", "hst-visa-documents", "hst-what-documents"],
  },
  {
    id: "hst-degree-courier",
    question: "Can I courier my certificates instead of going in person",
    answer:
      "For many of the steps yes, and for the country-of-issue part of the chain it is often the only practical option. The things to settle before anything ships are who signs for it, who is liable if it is lost, and whether the receiving office accepts couriered originals at all. Get that in writing, not on a phone call.",
    service: SERVICE,
    phrases: [
      "can i courier my certificates instead of going in person",
      "sending my degree certificate by courier for attestation",
      "do i have to travel with my documents",
      "posting my marksheets for attestation",
    ],
    keywords: [
      ["courier", "certificates", "person"],
      ["degree", "certificate", "courier", "attestation"],
      ["posting", "marksheets", "attestation"],
    ],
    next: ["hst-degree-original-risk", "hst-poa-collect", "hst-degree-foreign-country"],
  },
  {
    id: "hst-degree-photocopy-only",
    question: "All I have is a photocopy of my certificate",
    answer:
      "A photocopy on its own cannot start the chain, because the first office wants to compare it against the original or to be the issuer of it. The route back is your institution's registry, which can normally issue a fresh original or a certified duplicate. Start that request now in parallel with everything else, since it is the item with the longest lead time and the least within your control.",
    service: SERVICE,
    phrases: [
      "all i have is a photocopy of my certificate",
      "can i attest a photocopy of my degree",
      "i only have a scan of my marksheet",
      "my original certificate is with my parents abroad",
    ],
    keywords: [
      ["photocopy", "certificate"],
      ["attest", "photocopy", "degree"],
      ["scan", "marksheet"],
      ["original", "certificate", "parents", "abroad"],
    ],
    next: ["hst-lost-original", "hst-poa-collect", "hst-degree-original-or-copy"],
  },

  /* ── School certificates ────────────────────────────────────────────────── */
  {
    id: "hst-school-stamp-first",
    question: "Does my school have to stamp the certificate before anything else",
    answer:
      "Generally yes, and it is the step students skip most often. The first office in the chain is confirming the issuing institution's own signature, so it needs the institution's attestation already on the document. Going to a ministry with an unstamped school certificate is the classic wasted trip.",
    service: SERVICE,
    phrases: [
      "does my school have to stamp the certificate before anything else",
      "do i need the school attestation first",
      "school stamp before ministry attestation",
      "my school has not signed my certificate",
    ],
    keywords: [
      ["school", "stamp", "certificate", "before"],
      ["school", "attestation", "first"],
      ["school", "stamp", "ministry", "attestation"],
    ],
    next: ["hst-order-of-steps", "hst-grade-twelve", "hst-school-closed"],
  },
  {
    id: "hst-grade-twelve",
    question: "How do I get my grade twelve certificate ready for university",
    answer:
      "Work backwards from the university's list, because school-level requirements vary more than degree-level ones. Typically the board or school issues the result, the school attests it, and then the country's education and foreign affairs authorities and the receiving side follow. If you are applying within the UAE, ask whether an equivalency of the school certificate is also expected.",
    service: SERVICE,
    phrases: [
      "how do i get my grade twelve certificate ready for university",
      "attesting my twelfth standard marksheet",
      "grade 12 certificate attestation for college admission",
      "my higher secondary certificate for university",
      "hsc certificate for a dubai university",
    ],
    keywords: [
      ["grade", "twelve", "certificate", "university"],
      ["twelfth", "standard", "marksheet"],
      ["higher", "secondary", "certificate", "university"],
    ],
    next: ["hst-school-stamp-first", "hst-equivalency-school-level", "hst-leaving-certificate"],
  },
  {
    id: "hst-leaving-certificate",
    question: "What is a school leaving certificate for and does it need attesting",
    answer:
      "It is the school confirming you completed your studies there and left in good standing, and UAE universities and visa files often ask for it alongside the results. Whether it needs the full chain depends on the receiving office, so ask specifically about the leaving certificate rather than assuming it follows the same rule as the marksheet.",
    service: SERVICE,
    phrases: [
      "what is a school leaving certificate for and does it need attesting",
      "do i need my school leaving certificate attested",
      "transfer certificate for a university application",
      "tc from my school for admission",
    ],
    keywords: [
      ["school", "leaving", "certificate", "attesting"],
      ["transfer", "certificate", "university", "application"],
      ["school", "leaving", "certificate", "attested"],
    ],
    next: ["hst-grade-twelve", "hst-school-attendance", "hst-school-stamp-first"],
  },
  {
    id: "hst-school-attendance",
    question: "The university wants proof of which years I attended school",
    answer:
      "Ask the school for an attendance or study record covering the years in question, signed by the principal on school letterhead. Schools issue these routinely. If the school cannot produce one because its records are archived, the board or education authority that oversees it is the next place to ask.",
    service: SERVICE,
    phrases: [
      "the university wants proof of which years i attended school",
      "attendance certificate from my school for university",
      "study record for my school years",
      "proof of schooling for my application",
    ],
    keywords: [
      ["proof", "years", "attended", "school"],
      ["attendance", "certificate", "school", "university"],
      ["study", "record", "school", "years"],
    ],
    next: ["hst-leaving-certificate", "hst-school-closed", "hst-what-documents"],
  },
  {
    id: "hst-school-closed",
    question: "The school I went to has closed down",
    answer:
      "A closed school's records normally pass to the board or the education authority that licensed it, and that body can usually issue or confirm what the school would have. It is slower and it needs you to know which authority took over, which the education ministry of that country can tell you. Start this early because it is the step most likely to stall.",
    service: SERVICE,
    phrases: [
      "the school i went to has closed down",
      "my school no longer exists how do i get my certificate",
      "closed school records for my certificate",
      "who keeps records of a shut down school",
    ],
    keywords: [
      ["school", "closed", "down"],
      ["school", "longer", "exists", "certificate"],
      ["closed", "school", "records", "certificate"],
    ],
    next: ["hst-university-closed", "hst-lost-original", "hst-school-attendance"],
  },
  {
    id: "hst-uae-school-abroad",
    question: "I studied at a school in the UAE and am applying to a university overseas",
    answer:
      "Your certificate is a UAE document, so it goes out through the legalisation route: the school and the UAE education authority, then the UAE ministry of foreign affairs, then the destination country's embassy or consulate here. There is no apostille on a UAE document, because the UAE is not a party to the Apostille Convention — if an overseas university asks for one, that is the conversation to have with them early.",
    service: SERVICE,
    phrases: [
      "i studied at a school in the uae and am applying to a university overseas",
      "my dubai school certificate for a uk university",
      "using my uae school results abroad",
      "cbse certificate from a dubai school for a foreign university",
    ],
    keywords: [
      ["school", "uae", "university", "overseas"],
      ["dubai", "school", "certificate", "university"],
      ["uae", "school", "results", "abroad"],
    ],
    next: ["hst-apostille-outbound", "hst-embassy-step", "hst-abroad-by-country"],
  },
  {
    id: "hst-foreign-school-uae",
    question: "I studied at a school abroad and want to join a UAE university",
    answer:
      "Your school certificate has to be legalised in the country that issued it and then attested on the UAE side, and a school-level equivalency is often expected on top of that for UAE admissions. An apostille from your home country is not sufficient on its own here. Ask the UAE university which of the two — attestation, equivalency, or both — they require of school leavers.",
    service: SERVICE,
    phrases: [
      "i studied at a school abroad and want to join a uae university",
      "my foreign school certificate for a dubai university",
      "overseas school results for admission in the uae",
      "school certificate from india for a uae university",
    ],
    keywords: [
      ["school", "abroad", "join", "uae", "university"],
      ["foreign", "school", "certificate", "dubai", "university"],
      ["overseas", "school", "results", "admission", "uae"],
    ],
    next: ["hst-equivalency-school-level", "hst-apostille-inbound", "hst-inbound-order"],
  },
  {
    id: "hst-igcse-ib",
    question: "Are IB or IGCSE results treated differently for admission",
    answer:
      "The document chain is the same — it depends on where the certificate was issued, not on the curriculum — but admissions and equivalency treatment does vary by qualification, and international boards sometimes issue results centrally rather than through the school. Ask the board how it issues verifiable originals, and ask the university how it reads your particular qualification.",
    service: SERVICE,
    phrases: [
      "are ib or igcse results treated differently for admission",
      "attesting my ib diploma for university",
      "igcse certificate attestation for a uae university",
      "a level results for admission in dubai",
    ],
    keywords: [
      ["igcse", "results", "treated", "admission"],
      ["attesting", "diploma", "university"],
      ["igcse", "certificate", "attestation", "university"],
      ["level", "results", "admission", "dubai"],
    ],
    next: ["hst-grade-twelve", "hst-equivalency-school-level", "hst-digital-certificate"],
  },
  {
    id: "hst-school-records-old",
    question: "My school certificate is very old and handwritten",
    answer:
      "Age is not usually the problem; legibility and a verifiable signature are. If the certificate is hard to read or the signatory is long gone, ask the school or board for a fresh transcript or a confirmation letter issued now, and put the two together. Offices in the chain are far more comfortable with a current document referring to an old one than with an old document alone.",
    service: SERVICE,
    phrases: [
      "my school certificate is very old and handwritten",
      "can an old certificate still be attested for study",
      "my marksheet is from many years ago",
      "faded school certificate for attestation",
    ],
    keywords: [
      ["school", "certificate", "old", "handwritten"],
      ["old", "certificate", "attested", "study"],
      ["faded", "school", "certificate", "attestation"],
    ],
    next: ["hst-school-closed", "hst-degree-photocopy-only", "hst-rejection-reasons"],
  },

  /* ── Equivalency ────────────────────────────────────────────────────────── */
  {
    id: "hst-equivalency-what",
    question: "What is certificate equivalency in the UAE",
    answer:
      "It is the UAE education authority assessing a qualification earned outside the country and deciding what UAE qualification it is comparable to. It looks at the institution, the programme's structure and duration and how it was delivered, not just the title on the certificate. It is an application with its own outcome, which means it can be granted, limited, or declined.",
    service: SERVICE,
    phrases: [
      "what is certificate equivalency in the uae",
      "what does equivalency mean for my degree",
      "explain equivalency of qualifications in dubai",
      "what is degree equivalency",
    ],
    keywords: [
      ["certificate", "equivalency", "uae"],
      ["equivalency", "mean", "degree"],
      ["equivalency", "qualifications", "dubai"],
    ],
    next: ["hst-equivalency-need-it", "hst-equivalency-documents", "hst-equivalency-before-or-after"],
  },
  {
    id: "hst-equivalency-need-it",
    question: "Do I actually need equivalency for my degree",
    answer:
      "It depends on what you are using the degree for rather than on the degree itself. Further study at a UAE institution, many government and licensed roles, and some professional registrations ask for it; plenty of private-sector jobs do not. Ask the specific body you are applying to whether they require it, because obtaining it speculatively is effort you may not need.",
    service: SERVICE,
    phrases: [
      "do i actually need equivalency for my degree",
      "is equivalency compulsory in the uae",
      "do i need equivalency for a masters in dubai",
      "who asks for certificate equivalency",
    ],
    keywords: [
      ["actually", "need", "equivalency", "degree"],
      ["equivalency", "compulsory", "uae"],
      ["asks", "certificate", "equivalency"],
    ],
    next: ["hst-equivalency-what", "hst-degree-for-job", "hst-degree-for-phd"],
  },
  {
    id: "hst-equivalency-before-or-after",
    question: "Does equivalency come before or after attestation",
    answer:
      "After. The assessment is made on a document whose authenticity has already been established, so the attestation chain comes first and the equivalency application is built on top of it. Applying for equivalency with unattested documents is one of the more common reasons a file is returned untouched.",
    service: SERVICE,
    phrases: [
      "does equivalency come before or after attestation",
      "do i attest first or apply for equivalency first",
      "order of attestation and equivalency",
      "can i apply for equivalency without attestation",
    ],
    keywords: [
      ["equivalency", "before", "after", "attestation"],
      ["attest", "first", "apply", "equivalency"],
      ["order", "attestation", "equivalency"],
    ],
    next: ["hst-order-of-steps", "hst-equivalency-documents", "hst-equivalency-what"],
  },
  {
    id: "hst-equivalency-documents",
    question: "What documents does an equivalency application ask for",
    answer:
      "Generally the degree certificate and full transcripts, your passport and residency details, and often evidence about the programme itself — its duration, mode of study and the institution's standing. Requirements differ by country of study and get updated, so take the current checklist from the authority rather than from a forum post, and have your transcripts complete before you start.",
    service: SERVICE,
    phrases: [
      "what documents does an equivalency application ask for",
      "equivalency requirements for my degree",
      "checklist for certificate equivalency in the uae",
      "what do i need to submit for equivalency",
    ],
    keywords: [
      ["documents", "equivalency", "application"],
      ["equivalency", "requirements", "degree"],
      ["checklist", "certificate", "equivalency"],
    ],
    next: ["hst-equivalency-where-apply", "hst-equivalency-duration", "hst-consolidated-marksheet"],
  },
  {
    id: "hst-equivalency-where-apply",
    question: "Where do I apply for equivalency in the UAE",
    answer:
      "Through the federal education authority's own channel, which is where the current forms, fees and document list live. Because those channels and their names change, use the authority's official site as the starting point rather than a third-party page, and be careful of sites that look official and charge for the application itself.",
    service: SERVICE,
    phrases: [
      "where do i apply for equivalency in the uae",
      "how do i submit an equivalency application",
      "which ministry handles equivalency in dubai",
      "equivalency application portal",
    ],
    keywords: [
      ["apply", "equivalency", "uae"],
      ["submit", "equivalency", "application"],
      ["ministry", "handles", "equivalency"],
    ],
    next: ["hst-equivalency-documents", "hst-equivalency-what", "hst-equivalency-refused"],
  },
  {
    id: "hst-equivalency-duration",
    question: "My degree was three years and I am told the UAE expects four",
    answer:
      "Programme duration is one of the things an equivalency assessment looks at, and a shorter programme is sometimes recognised at a different level than the title suggests rather than refused outright. What helps is documentary evidence of contact hours, credits and content from your institution. Get that from the registry before you apply rather than after a query.",
    service: SERVICE,
    phrases: [
      "my degree was three years and i am told the uae expects four",
      "is a three year degree accepted in the uae",
      "does my degree duration affect equivalency",
      "my bachelors was shorter than four years",
    ],
    keywords: [
      ["degree", "three", "years", "uae", "expects"],
      ["three", "year", "degree", "accepted"],
      ["degree", "duration", "affect", "equivalency"],
    ],
    next: ["hst-equivalency-refused", "hst-equivalency-partial", "hst-equivalency-documents"],
  },
  {
    id: "hst-equivalency-online",
    question: "Will an online or distance degree get equivalency",
    answer:
      "Mode of study is assessed, and distance or online programmes are looked at more closely than campus ones — but the deciding factors are usually the institution's accreditation and whether the programme was recognised where it was delivered, not the word online by itself. Gather the accreditation evidence before applying, because a thin file is what turns a difficult case into a refused one.",
    service: SERVICE,
    phrases: [
      "will an online or distance degree get equivalency",
      "is my distance learning degree recognised in the uae",
      "equivalency for an online masters",
      "does the uae accept correspondence degrees",
    ],
    keywords: [
      ["online", "distance", "degree", "equivalency"],
      ["distance", "learning", "degree", "recognised"],
      ["equivalency", "online", "masters"],
      ["accept", "correspondence", "degrees"],
    ],
    next: ["hst-unrecognised-university", "hst-equivalency-refused", "hst-equivalency-documents"],
  },
  {
    id: "hst-equivalency-school-level",
    question: "Is there an equivalency for school certificates as well",
    answer:
      "Yes, school-level qualifications earned abroad are often assessed in a similar way before a UAE university will admit on them. It is a separate application from the degree-level one and asks for its own documents. If you are a school leaver applying here, ask the university whether they need the equivalency in hand at application or only before enrolment.",
    service: SERVICE,
    phrases: [
      "is there an equivalency for school certificates as well",
      "equivalency for my grade twelve certificate",
      "school certificate equivalency in the uae",
      "do school leavers need equivalency",
    ],
    keywords: [
      ["equivalency", "school", "certificates"],
      ["equivalency", "grade", "twelve", "certificate"],
      ["school", "certificate", "equivalency", "uae"],
    ],
    next: ["hst-grade-twelve", "hst-foreign-school-uae", "hst-equivalency-documents"],
  },
  {
    id: "hst-equivalency-refused",
    question: "My equivalency application was refused what now",
    answer:
      "Read the stated reason carefully, because most refusals name a specific gap — accreditation, duration, mode of study, or a missing document — and several of those are answerable with evidence from your institution. There is normally a route to submit again or to ask for a review. What does not work is reapplying unchanged and hoping for a different reader.",
    service: SERVICE,
    phrases: [
      "my equivalency application was refused what now",
      "equivalency rejected for my degree",
      "they did not give equivalency to my qualification",
      "can i appeal an equivalency decision",
    ],
    keywords: [
      ["equivalency", "application", "refused"],
      ["equivalency", "rejected", "degree"],
      ["appeal", "equivalency", "decision"],
    ],
    next: ["hst-equivalency-partial", "hst-equivalency-duration", "hst-unrecognised-university"],
  },
  {
    id: "hst-equivalency-partial",
    question: "My equivalency came back at a lower level than my degree title",
    answer:
      "That outcome is a judgement about the programme, not a mistake, and it is common where duration, credits or mode of study differ from the UAE structure. Ask what evidence would change the assessment; sometimes a detailed transcript, an accreditation letter or proof of contact hours moves it. Sometimes it does not, and then the honest question is whether the qualification you need is a top-up rather than a review.",
    service: SERVICE,
    phrases: [
      "my equivalency came back at a lower level than my degree title",
      "they equated my masters to something lower",
      "partial equivalency for my qualification",
      "my degree was downgraded in equivalency",
    ],
    keywords: [
      ["equivalency", "lower", "level", "degree", "title"],
      ["partial", "equivalency", "qualification"],
      ["degree", "downgraded", "equivalency"],
    ],
    next: ["hst-equivalency-refused", "hst-equivalency-duration", "hst-degree-for-phd"],
  },
  {
    id: "hst-unrecognised-university",
    question: "I think my university may not be recognised here",
    answer:
      "Find out before you spend anything on the chain. Recognition generally turns on whether the institution was accredited by the competent authority in the country where it operated, and that is checkable. If it was not, attestation stamps will not fix it — no amount of certification makes an unrecognised award recognised, and it is better to know that now than after an equivalency refusal.",
    service: SERVICE,
    phrases: [
      "i think my university may not be recognised here",
      "is my university accredited for the uae",
      "my college might not be approved in dubai",
      "how do i check if my university is recognised",
    ],
    keywords: [
      ["university", "recognised", "here"],
      ["university", "accredited", "uae"],
      ["college", "approved", "dubai"],
      ["check", "university", "recognised"],
    ],
    next: ["hst-equivalency-online", "hst-equivalency-refused", "hst-equivalency-need-it"],
  },
  {
    id: "hst-equivalency-after-study",
    question: "Do I need equivalency again for the degree I just finished abroad",
    answer:
      "If you earned it outside the UAE and you want to use it here for further study, a licensed profession or many public-sector roles, then yes — it is a fresh qualification and gets its own assessment. Getting the attestation done while you are still in the country of study, with the university close at hand, is much easier than arranging it remotely afterwards.",
    service: SERVICE,
    phrases: [
      "do i need equivalency again for the degree i just finished abroad",
      "equivalency for my new foreign masters",
      "i graduated overseas and came back to dubai",
      "recognising the degree i just completed abroad",
    ],
    keywords: [
      ["equivalency", "degree", "finished", "abroad"],
      ["equivalency", "new", "foreign", "masters"],
      ["graduated", "overseas", "came", "back", "dubai"],
    ],
    next: ["hst-degree-for-job", "hst-degree-for-phd", "hst-hub-after"],
  },

  /* ── Translation ────────────────────────────────────────────────────────── */
  {
    id: "hst-translator-who",
    question: "Who is allowed to translate my degree certificate",
    answer:
      "Whoever the receiving authority accepts, which in the UAE generally means a translator licensed for legal translation rather than any fluent person. A translation from an unapproved source is normally rejected even when it is accurate, so confirm the requirement before commissioning the work — that is the whole cost of the mistake.",
    service: SERVICE,
    phrases: [
      "who is allowed to translate my degree certificate",
      "does my transcript translation have to be legal",
      "can any translator do my academic documents",
      "certified translator for my university certificate",
    ],
    keywords: [
      ["allowed", "translate", "degree", "certificate"],
      ["legal", "translation", "degree"],
      ["certified", "translator", "university"],
    ],
    next: ["hst-translate-myself", "hst-translate-order", "hst-translation-notarised"],
  },
  {
    id: "hst-translate-order",
    question: "Should my certificate be translated before or after attestation",
    answer:
      "Usually after the stamps from the issuing country are on it, because the translation has to reproduce the stamps as well as the text — translate too early and you have a translation of an incomplete document. The exception is where an office in the chain cannot read the original at all. Ask the office that will receive the translation which they expect.",
    service: SERVICE,
    phrases: [
      "should my certificate be translated before or after attestation",
      "translate my transcript first or attest first",
      "when do i translate my academic documents",
      "order of translation and attestation for my degree",
    ],
    keywords: [
      ["certificate", "translated", "before", "after", "attestation"],
      // "translate" and "transcript" share five leading characters, and
      // `sameWord` treats that as the same word — so this group once fired on
      // "how much to get my transcripts attested", a price question with no form
      // of "translate" in it. "first" is what the price question cannot supply.
      ["translate", "attest", "first"],
      ["order", "translation", "attestation", "degree"],
    ],
    next: ["hst-order-of-steps", "hst-translation-notarised", "hst-translator-who"],
  },
  {
    id: "hst-translation-notarised",
    question: "Does the translation of my transcript need to be notarised too",
    answer:
      "Sometimes. Some authorities accept a licensed translator's own stamp and declaration; others want the translation notarised or attested in its own right. It is one question to the receiving office and it decides whether you are making one appointment or two, so ask it before the translation is done.",
    service: SERVICE,
    phrases: [
      "does the translation of my transcript need to be notarised too",
      "notarising the translation of my degree certificate",
      "does my translated marksheet need a stamp",
      "attestation of a translated academic document",
    ],
    keywords: [
      ["notarised", "translated", "marksheet"],
      ["notarising", "translation", "degree", "certificate"],
      ["translated", "marksheet", "stamp"],
    ],
    next: ["hst-translator-who", "hst-translate-order", "hst-hub-appointment"],
  },
  {
    id: "hst-arabic-for-uae-uni",
    question: "Does a UAE university need my documents in Arabic",
    answer:
      "Many UAE institutions teach in English and accept English documents, while government-facing steps such as equivalency or a visa file more often want Arabic. So the answer can be different for the university and for the authority behind your application. Ask both, and keep the English original with the Arabic rather than replacing it.",
    service: SERVICE,
    phrases: [
      "does a uae university need my documents in arabic",
      "do i need an arabic translation of my degree for dubai",
      "arabic translation for my university application in the uae",
      "is english enough for a dubai university",
    ],
    keywords: [
      ["uae", "university", "documents", "arabic"],
      ["arabic", "translation", "degree", "dubai"],
      ["english", "enough", "dubai", "university"],
    ],
    next: ["hst-translator-who", "hst-translation-notarised", "hst-equivalency-documents"],
  },
  {
    id: "hst-translate-myself",
    question: "Can I translate my own marksheet if my language is good",
    answer:
      "No, and not because of your language. The point of a legal translation is that an accountable licensed party certifies it, so a self-made translation carries no weight however accurate it is — and translating your own academic record raises exactly the question the requirement exists to answer.",
    service: SERVICE,
    phrases: [
      "can i translate my own marksheet if my language is good",
      "may i translate my own degree certificate",
      "can my friend translate my transcript",
      "is a self translation of my certificate accepted",
    ],
    keywords: [
      ["translate", "own", "marksheet"],
      ["translate", "own", "degree", "certificate"],
      ["friend", "translate", "marksheet"],
      ["self", "translation", "certificate", "accepted"],
    ],
    next: ["hst-translator-who", "hst-translation-rejected", "hst-translation-notarised"],
  },
  {
    id: "hst-translation-rejected",
    question: "My translated certificate was rejected by the university",
    answer:
      "The usual causes are the translator not being from an accepted source, the stamps and seals on the original not being reproduced, or a name spelled differently from the passport. All three are fixable, and the second is the one people miss — a translation of the text alone is an incomplete translation of the document.",
    service: SERVICE,
    phrases: [
      "my translated certificate was rejected by the university",
      "they did not accept my translated transcript",
      "translation of my degree was returned",
      "why was my academic translation refused",
    ],
    keywords: [
      ["translated", "certificate", "rejected", "university"],
      ["accept", "translated", "university"],
      ["translation", "degree", "returned"],
    ],
    next: ["hst-translation-name-spelling", "hst-translator-who", "hst-rejection-reasons"],
  },
  {
    id: "hst-translation-name-spelling",
    question: "My name is spelled differently in the translation and my passport",
    answer:
      "Have it corrected to match the passport exactly, including the order of the names, before the document goes any further. Offices compare strings rather than interpret them, and a single differing letter between a transcript, a translation and a passport is enough to stop a file at any point in the chain.",
    service: SERVICE,
    phrases: [
      "my name is spelled differently in the translation and my passport",
      "spelling mistake in my name on the translated certificate",
      "my name does not match between my marksheet and passport",
      "different spelling of my name on my degree",
    ],
    keywords: [
      ["name", "spelled", "differently", "translation", "passport"],
      ["spelling", "mistake", "name", "translated", "certificate"],
      ["different", "spelling", "name", "degree"],
    ],
    next: ["hst-name-mismatch", "hst-translation-rejected", "hst-single-name"],
  },
  {
    id: "hst-translation-abroad-or-here",
    question: "Should I get the translation done in my home country or in Dubai",
    answer:
      "Have it done wherever the office that will read it accepts translators from. A translation made abroad is often fine for the steps taken abroad and then not accepted here, which is why students sometimes end up paying twice. If the document is destined for a UAE authority, a UAE-licensed legal translator is the safer starting point.",
    service: SERVICE,
    phrases: [
      "should i get the translation done in my home country or in dubai",
      "translate my documents abroad or in the uae",
      "is a translation from india accepted in dubai",
      "where should my academic translation be done",
    ],
    keywords: [
      ["translation", "home", "country", "dubai"],
      ["translate", "documents", "abroad", "uae"],
      ["academic", "translation", "done"],
    ],
    next: ["hst-translator-who", "hst-translation-rejected", "hst-inbound-order"],
  },
  {
    id: "hst-translation-transcript-tables",
    question: "My transcript is mostly tables and grades does that translate",
    answer:
      "Yes, and it has to — grade tables, subject names, credit columns and any legend explaining the scale are all part of the document. Ask the translator to reproduce the layout rather than summarise it, because an assessor reading the translation is looking for structure as much as for words.",
    service: SERVICE,
    phrases: [
      "my transcript is mostly tables and grades does that translate",
      "translating the grade table on my marksheet",
      "does the whole transcript get translated",
      "subject names in my translated transcript",
    ],
    keywords: [
      ["transcript", "tables", "grades"],
      ["translating", "grade", "table", "marksheet"],
      ["whole", "marksheet", "translated"],
    ],
    next: ["hst-translator-who", "hst-cgpa-conversion", "hst-translation-notarised"],
  },

  /* ── Affidavits, undertakings and letters ───────────────────────────────── */
  {
    id: "hst-affidavit-financial",
    question: "The university wants a notarised affidavit of financial support",
    answer:
      "That is a signed statement by whoever is funding you, confirming they will cover your studies and living costs, usually with bank evidence attached. Universities and visa authorities both use it. The wording matters more than the length: it should name you, the programme, the period covered and the relationship, and it should be signed in front of the notary rather than beforehand.",
    service: SERVICE,
    phrases: [
      "the university wants a notarised affidavit of financial support",
      "affidavit of support for my student application",
      "notarised financial guarantee for my studies",
      "proof my parents will pay for my education",
      "financial affidavit for my student visa",
    ],
    keywords: [
      ["notarised", "affidavit", "financial", "support"],
      ["affidavit", "support", "student", "application"],
      ["financial", "affidavit", "student", "visa"],
    ],
    next: ["hst-sponsor-letter", "hst-bank-statements", "hst-affidavit-who-signs"],
  },
  {
    id: "hst-sponsor-letter",
    question: "My father is sponsoring me and they want a letter from him",
    answer:
      "A sponsor's letter usually states who he is, his relationship to you, what he undertakes to cover and for how long, with identification and income or bank evidence attached. Whether it needs notarising depends on who is asking. If he is abroad, he can normally sign it in front of a notary there and have it legalised for use here, which is slower than doing it locally.",
    service: SERVICE,
    phrases: [
      "my father is sponsoring me and they want a letter from him",
      "sponsor letter for my university application",
      "my parents need to write a support letter for my studies",
      "notarised letter from my sponsor for admission",
    ],
    keywords: [
      ["father", "sponsoring", "letter"],
      ["sponsor", "letter", "university", "application"],
      ["notarised", "letter", "sponsor", "admission"],
    ],
    next: ["hst-affidavit-financial", "hst-affidavit-parent-abroad", "hst-sponsor-income"],
  },
  {
    id: "hst-affidavit-who-signs",
    question: "Who has to sign the affidavit and be present at the notary",
    answer:
      "Whoever is making the statement, in person, with original identification — a notary is certifying that this person said this, so the person has to be there. If two people are undertaking something jointly, both usually attend. Someone who cannot attend generally has to make their own statement wherever they are rather than have it signed for them.",
    service: SERVICE,
    phrases: [
      "who has to sign the affidavit and be present at the notary",
      "does my father have to come to the notary with me",
      "can someone else sign my student affidavit",
      "do both parents need to attend for the undertaking",
    ],
    keywords: [
      ["sign", "affidavit", "present", "notary"],
      ["father", "come", "notary"],
      ["someone", "else", "sign", "student", "affidavit"],
      ["both", "parents", "attend", "undertaking"],
    ],
    next: ["hst-affidavit-parent-abroad", "hst-appointment-in-person", "hst-appointment-bring"],
  },
  {
    id: "hst-affidavit-parent-abroad",
    question: "My parents are abroad and cannot come to a notary in Dubai",
    answer:
      "They can normally sign in front of a notary where they are, and then that document is legalised in that country and through the UAE mission there before it is used here. It works, it just takes longer and has more steps than signing locally, so start it as early as you can and confirm the exact chain for their country first.",
    service: SERVICE,
    phrases: [
      "my parents are abroad and cannot come to a notary in dubai",
      "my sponsor is not in the uae to sign",
      "my father is overseas and has to sign my affidavit",
      "notarising a support letter from another country",
    ],
    keywords: [
      ["parents", "abroad", "come", "notary", "dubai"],
      ["sponsor", "not", "uae", "sign"],
      ["father", "overseas", "sign", "affidavit"],
    ],
    next: ["hst-poa-from-abroad", "hst-sponsor-letter", "hst-affidavit-who-signs"],
  },
  {
    id: "hst-affidavit-gap",
    question: "I have a gap in my studies and they want an explanation letter",
    answer:
      "Write it plainly: the dates, what you were doing, and any evidence you have — employment, illness, caring responsibilities, national service. Admissions offices and visa authorities see gaps constantly and are looking for a coherent account rather than an impressive one. Notarise it only if the office asked for it notarised.",
    service: SERVICE,
    phrases: [
      "i have a gap in my studies and they want an explanation letter",
      "gap year explanation for my university application",
      "affidavit for a study gap",
      "how do i explain the break in my education",
    ],
    keywords: [
      ["gap", "studies", "explanation", "letter"],
      ["gap", "year", "explanation", "university", "application"],
      ["affidavit", "study", "gap"],
      ["explain", "break", "education"],
    ],
    next: ["hst-affidavit-wording", "hst-visa-documents", "hst-affidavit-intention-return"],
  },
  {
    id: "hst-affidavit-accommodation",
    question: "They want a notarised letter about where I will live or who my guardian is",
    answer:
      "Accommodation and guardianship undertakings are common for younger students and for visa files, and they are usually signed by the person taking on the responsibility rather than by you. The statement should name the address or the guardian, the period, and the relationship, with identification attached.",
    service: SERVICE,
    phrases: [
      "they want a notarised letter about where i will live or who my guardian is",
      "guardian letter for my student visa",
      "accommodation undertaking for a student",
      "notarised letter about my housing as a student",
    ],
    keywords: [
      ["notarised", "letter", "live", "guardian"],
      ["guardian", "letter", "student", "visa"],
      ["accommodation", "undertaking", "student"],
    ],
    next: ["hst-minor-appointment", "hst-visa-documents", "hst-affidavit-who-signs"],
  },
  {
    id: "hst-affidavit-intention-return",
    question: "An embassy wants a statement that I intend to come back after studying",
    answer:
      "Some student visa processes ask for it. Keep it factual — your ties here, what you plan to do afterwards — and attach whatever supports it. It is a statement of intention rather than a binding promise, but it is made on the record, so it should be something you can stand behind.",
    service: SERVICE,
    phrases: [
      "an embassy wants a statement that i intend to come back after studying",
      "intention to return letter for my student visa",
      "notarised declaration that i will return home after my course",
      "statement of intent for a study visa",
    ],
    keywords: [
      ["embassy", "statement", "intend", "come", "back", "studying"],
      ["intention", "return", "letter", "student", "visa"],
      ["statement", "intent", "study", "visa"],
    ],
    next: ["hst-visa-abroad", "hst-affidavit-wording", "hst-visa-documents"],
  },
  {
    id: "hst-affidavit-no-objection",
    question: "I have been asked for a no objection certificate for my studies",
    answer:
      "A no objection letter is a third party — an employer, a sponsor, a parent, sometimes a current institution — confirming they do not object to what you are doing. Who must issue it depends entirely on who is asking, so get that clear first; a letter from the wrong party is not a weaker version of the right one, it is no use at all.",
    service: SERVICE,
    phrases: [
      "i have been asked for a no objection certificate for my studies",
      "noc for my university application",
      "no objection letter from my employer to study",
      "do i need an noc to study in dubai",
    ],
    keywords: [
      ["objection", "certificate", "studies"],
      ["noc", "university", "application"],
      ["objection", "letter", "employer", "study"],
    ],
    next: ["hst-affidavit-who-signs", "hst-affidavit-wording", "hst-visa-family-to-student"],
  },
  {
    id: "hst-affidavit-relationship",
    question: "They want proof that my sponsor is actually my parent",
    answer:
      "That is usually a birth certificate or family book showing the relationship, and if it was issued abroad it goes through the same legalisation chain as your certificates. Prepare it alongside the academic documents rather than afterwards, because it is the item most often remembered last and it is on the critical path for a visa file.",
    service: SERVICE,
    phrases: [
      "they want proof that my sponsor is actually my parent",
      "proving my relationship to my sponsor for a student visa",
      "birth certificate for my university application",
      "documents showing my father is my father",
    ],
    keywords: [
      ["proof", "sponsor", "actually", "parent"],
      ["proving", "relationship", "sponsor", "student", "visa"],
      ["birth", "certificate", "university", "application"],
    ],
    next: ["hst-visa-documents", "hst-affidavit-financial", "hst-parents-separated"],
  },
  {
    id: "hst-affidavit-wording",
    question: "How should the affidavit be worded so it is accepted",
    answer:
      "Use the receiving office's own words wherever they have given you any, name the parties and dates precisely, say what is being undertaken and for what period, and leave out anything you cannot evidence. If they have published a template, use it. We can review a draft against what the office asked for before you take it to a notary, which is cheaper than finding out afterwards.",
    service: SERVICE,
    phrases: [
      "how should the affidavit be worded so it is accepted",
      "what wording does my student undertaking need",
      "is there a format for a study affidavit",
      "can you check my affidavit before i notarise it",
    ],
    keywords: [
      ["affidavit", "worded", "accepted"],
      ["wording", "student", "undertaking"],
      ["format", "study", "affidavit"],
      ["check", "affidavit", "before", "notarise"],
    ],
    next: ["hst-affidavit-template", "hst-affidavit-financial", "hst-hub-appointment"],
  },
  {
    id: "hst-affidavit-template",
    question: "Is there a template I can use for my student declaration",
    answer:
      "If the university or embassy published one, that is the template — use it unchanged. If they did not, a plain statement in your own words with the required facts is normally better than a form found online, because the online forms are usually written for a different country's process and carry clauses that raise questions.",
    service: SERVICE,
    phrases: [
      "is there a template i can use for my student declaration",
      "sample affidavit for a university application",
      "format of an undertaking letter for studies",
      "can you send me a draft student affidavit",
    ],
    keywords: [
      ["template", "student", "declaration"],
      ["sample", "affidavit", "university", "application"],
      ["format", "undertaking", "letter", "studies"],
    ],
    next: ["hst-affidavit-wording", "hst-affidavit-financial", "hst-affidavit-gap"],
  },
  {
    id: "hst-affidavit-english-or-arabic",
    question: "Should my affidavit be in English or Arabic for the notary",
    answer:
      "A UAE notary generally works with Arabic, and a bilingual document is the usual answer: the Arabic is what is notarised and the English is there for the receiving office abroad. Check which language the receiving office needs the final version in, because that decides whether a translation is part of the job or an afterthought.",
    service: SERVICE,
    phrases: [
      "should my affidavit be in english or arabic for the notary",
      "does my student undertaking need to be in arabic",
      "bilingual affidavit for my university application",
      "language of a notarised declaration in dubai",
    ],
    keywords: [
      ["affidavit", "english", "arabic", "notary"],
      ["student", "undertaking", "arabic"],
      ["bilingual", "affidavit", "university", "application"],
    ],
    next: ["hst-translator-who", "hst-affidavit-wording", "hst-arabic-for-uae-uni"],
  },

  /* ── Power of attorney, for students ────────────────────────────────────── */
  {
    id: "hst-poa-collect",
    question: "Can someone collect my degree certificate from my university for me",
    answer:
      "Usually yes, with a power of attorney or an authorisation the university accepts, plus their identification and yours. Universities differ on what they will accept, and some insist on their own authorisation form rather than a general power of attorney — ask the registry what they need before anything is drafted or notarised.",
    service: SERVICE,
    phrases: [
      "can someone collect my degree certificate from my university for me",
      "authorising my brother to collect my marksheet",
      "my mother wants to collect my transcript from college",
      "can a relative pick up my certificate from the university",
      "letter authorising someone to collect my documents",
    ],
    keywords: [
      ["someone", "collect", "degree", "certificate", "university"],
      ["authorising", "brother", "collect", "marksheet"],
      ["relative", "pick", "certificate", "university"],
    ],
    next: ["hst-poa-contents", "hst-poa-who-can-hold", "hst-poa-from-abroad"],
  },
  {
    id: "hst-poa-submit",
    question: "Can my agent submit my university application on my behalf",
    answer:
      "For many universities yes, though a lot of them now require the applicant's own account and signature for the application itself and allow an agent only for document handling. Find out which of the two your university runs, because a power of attorney does not override a university's own rule about who may apply.",
    service: SERVICE,
    phrases: [
      "can my agent submit my university application on my behalf",
      "authorising a consultant to apply for me",
      "can someone else lodge my admission file",
      "power of attorney to apply to university for me",
    ],
    keywords: [
      ["agent", "submit", "university", "application", "behalf"],
      ["authorising", "consultant", "apply"],
      ["someone", "else", "lodge", "admission", "file"],
    ],
    next: ["hst-poa-accept-offer", "hst-poa-contents", "hst-poa-collect"],
  },
  {
    id: "hst-poa-contents",
    question: "What has to be written in a power of attorney for my study documents",
    answer:
      "Each act, spelled out: which documents, which institution, whether the holder may collect, submit, sign, pay, or receive on your behalf, and for how long. UAE notaries read these narrowly, so a power that says someone may deal with your education matters generally is likely to be read as covering nothing in particular.",
    service: SERVICE,
    phrases: [
      "what has to be written in a power of attorney for my study documents",
      "what powers should i give for my education documents",
      "contents of a power of attorney for my certificates",
      "how specific does my study authorisation need to be",
    ],
    keywords: [
      ["written", "power", "attorney", "study", "documents"],
      ["powers", "give", "education", "documents"],
      ["contents", "power", "attorney", "certificates"],
    ],
    next: ["hst-poa-validity", "hst-poa-who-can-hold", "hst-poa-revoke"],
  },
  {
    id: "hst-poa-who-can-hold",
    question: "Who can I appoint to deal with my university paperwork",
    answer:
      "Normally any adult you trust who has identification and is willing to act — a parent, a sibling, a friend, or an agency. The practical questions are whether they can physically attend the offices involved and whether the institution accepts a third party at all. Trust matters more than the relationship: this person is handling your original certificates.",
    service: SERVICE,
    phrases: [
      "who can i appoint to deal with my university paperwork",
      "who can hold a power of attorney for my education documents",
      "can a friend act for me on my admission",
      "does it have to be a family member to collect my certificate",
    ],
    keywords: [
      ["appoint", "deal", "university", "paperwork"],
      ["hold", "power", "attorney", "education", "documents"],
      ["friend", "act", "admission"],
      ["family", "member", "collect", "certificate"],
    ],
    next: ["hst-poa-contents", "hst-poa-collect", "hst-degree-original-risk"],
  },
  {
    id: "hst-poa-from-abroad",
    question: "I am outside the UAE how do I give a power of attorney for my documents",
    answer:
      "You sign it in front of a notary where you are, then it is legalised in that country and through the UAE mission there before it is usable here. It is the same chain your certificates take, with the same ordering trap, and it is the reason to arrange the power of attorney at the same time as the certificates rather than when you discover you need it.",
    service: SERVICE,
    phrases: [
      "i am outside the uae how do i give a power of attorney for my documents",
      "signing a power of attorney abroad for my studies",
      "i am in my home country and need to authorise someone in dubai",
      "power of attorney from overseas for my education documents",
    ],
    keywords: [
      ["outside", "uae", "power", "attorney", "documents"],
      ["signing", "power", "attorney", "abroad", "studies"],
      ["power", "attorney", "overseas", "education", "documents"],
    ],
    next: ["hst-poa-translated", "hst-inbound-order", "hst-poa-contents"],
  },
  {
    id: "hst-poa-validity",
    question: "How long does a power of attorney for my studies stay valid",
    answer:
      "Until it expires by its own terms, is revoked, or the act it covers is done — and many receiving offices separately prefer a recently issued one even when an older one is technically still in force. Put an end date in it that comfortably covers your intake, and expect to be asked for a fresh one if the process runs long.",
    service: SERVICE,
    phrases: [
      "how long does a power of attorney for my studies stay valid",
      "does my education power of attorney expire",
      "validity of a study authorisation letter",
      "is my old power of attorney still usable for my certificates",
    ],
    keywords: [
      ["long", "power", "attorney", "studies", "valid"],
      ["education", "power", "attorney", "expire"],
      ["validity", "study", "authorisation", "letter"],
    ],
    next: ["hst-poa-revoke", "hst-poa-contents", "hst-hub-timing"],
  },
  {
    id: "hst-poa-revoke",
    question: "How do I cancel the authorisation I gave for my education documents",
    answer:
      "By revoking it formally through the same kind of channel it was made in, and then telling every institution and office that has been relying on it. The second half is the part people skip, and it is what actually stops someone acting: an office that has not been told still has a document on file saying they may.",
    service: SERVICE,
    phrases: [
      "how do i cancel the authorisation i gave for my education documents",
      "revoking a power of attorney i gave my agent",
      "i want to stop my consultant acting for my admission",
      "cancel the authority to collect my certificates",
    ],
    keywords: [
      ["cancel", "authorisation", "education", "documents"],
      ["revoking", "power", "attorney", "agent"],
      ["stop", "consultant", "acting", "admission"],
    ],
    next: ["hst-poa-validity", "hst-poa-who-can-hold", "hst-agent-problem"],
  },
  {
    id: "hst-poa-accept-offer",
    question: "Can someone accept a university offer for me",
    answer:
      "Sometimes, and it is worth asking rather than assuming, because an acceptance often carries financial commitments and universities are cautious about who may make them. If they do allow it, the authorisation usually has to say so explicitly — accepting an offer is not implied by permission to submit documents.",
    service: SERVICE,
    phrases: [
      "can someone accept a university offer for me",
      "can my father accept my admission offer",
      "authorising someone to confirm my place at university",
      "can an agent accept my offer letter",
    ],
    keywords: [
      ["someone", "accept", "university", "offer"],
      ["father", "accept", "admission", "offer"],
      ["authorising", "someone", "confirm", "place", "university"],
    ],
    next: ["hst-poa-contents", "hst-poa-submit", "hst-conditional-offer"],
  },
  {
    id: "hst-poa-translated",
    question: "Does my power of attorney need translating for the university",
    answer:
      "If it was made in a language the institution or office does not work in, yes, and through a translator they accept. A power of attorney made in Arabic for use at a university abroad, or made abroad for use here, normally travels with a legal translation attached.",
    service: SERVICE,
    phrases: [
      "does my power of attorney need translating for the university",
      "translating my education power of attorney",
      "arabic power of attorney for a foreign university",
      "does my study authorisation need a translation",
    ],
    keywords: [
      ["power", "attorney", "translating", "university"],
      ["translating", "education", "power", "attorney"],
      ["study", "authorisation", "translation"],
    ],
    next: ["hst-translator-who", "hst-poa-from-abroad", "hst-poa-contents"],
  },
  {
    id: "hst-poa-minor",
    question: "I am under eighteen can I give someone authority over my documents",
    answer:
      "Generally not on your own — a minor's affairs are handled by a parent or legal guardian, and it is they who sign. That usually simplifies things rather than complicating them, since a guardian acting for you needs proof of the relationship rather than a power of attorney from you.",
    service: SERVICE,
    phrases: [
      "i am under eighteen can i give someone authority over my documents",
      "can a minor sign a power of attorney for study documents",
      "i am seventeen and applying to university",
      "does my guardian need authorisation from me",
    ],
    keywords: [
      ["under", "eighteen", "give", "someone", "authority", "documents"],
      ["minor", "sign", "power", "attorney", "study", "documents"],
      ["guardian", "need", "authorisation"],
    ],
    next: ["hst-minor-appointment", "hst-affidavit-accommodation", "hst-poa-who-can-hold"],
  },

  /* ── Taking UAE documents out ───────────────────────────────────────────── */
  {
    id: "hst-apostille-outbound",
    question: "Can I get an apostille on my UAE certificate for a foreign university",
    answer:
      "No. The United Arab Emirates is not a party to the Hague Apostille Convention, so no authority here issues an apostille on a UAE document. It takes the legalisation route instead: the UAE authorities, then the destination country's embassy or consulate here. If a university asks for an apostille, tell them the document is from a non-member state and ask what they accept in its place — they deal with this regularly.",
    service: SERVICE,
    phrases: [
      "can i get an apostille on my uae certificate for a foreign university",
      "apostille for my dubai degree",
      "does the uae issue apostilles for education documents",
      "my university abroad is asking for an apostille on my uae certificate",
      "apostille stamp on my uae marksheet",
    ],
    keywords: [
      ["apostille", "uae", "certificate", "foreign", "university"],
      ["apostille", "dubai", "degree"],
      ["uae", "issue", "apostilles", "education", "documents"],
    ],
    next: ["hst-embassy-step", "hst-abroad-by-country", "hst-uae-degree-abroad"],
  },
  {
    id: "hst-apostille-inbound",
    question: "I already have an apostille from my home country is that enough",
    answer:
      "Not on its own. Because the UAE is not a party to the Apostille Convention, an apostille issued in a member state is not sufficient to use the document here — the full legalisation chain is still required. This is the most expensive misunderstanding students arrive with, usually because an agent abroad sold them the apostille and said the job was finished.",
    service: SERVICE,
    phrases: [
      "i already have an apostille from my home country is that enough",
      "my degree has an apostille do i still need attestation for the uae",
      "is an apostilled certificate accepted in dubai",
      "i paid for an apostille and now they want attestation",
      "apostille or attestation for my degree in the uae",
    ],
    keywords: [
      ["apostille", "home", "country", "enough"],
      ["apostille", "still", "need", "attestation", "uae"],
      ["apostilled", "certificate", "accepted", "dubai"],
    ],
    next: ["hst-inbound-order", "hst-agent-problem", "hst-hub-inbound"],
  },
  {
    id: "hst-embassy-step",
    question: "What does the embassy do to my certificate and do I go there myself",
    answer:
      "The destination country's mission here confirms the UAE stamps so that its own institutions will rely on the document. Some missions accept applications only through an appointment system or an approved channel rather than at the counter, and their requirements change, so check the mission's own current instructions before travelling to it.",
    service: SERVICE,
    phrases: [
      "what does the embassy do to my certificate and do i go there myself",
      "embassy legalisation of my degree for study abroad",
      "do i visit the consulate myself for my certificate",
      "embassy stamp on my transcript for a foreign university",
    ],
    keywords: [
      ["embassy", "certificate", "there", "myself"],
      ["embassy", "legalisation", "degree", "study", "abroad"],
      ["consulate", "myself", "certificate"],
    ],
    next: ["hst-mofa-step", "hst-abroad-by-country", "hst-apostille-outbound"],
  },
  {
    id: "hst-mofa-step",
    question: "What is the foreign ministry step for my education documents",
    answer:
      "It is the UAE ministry of foreign affairs confirming the stamps already on a UAE document so that a foreign mission will accept it, and it sits between the local authorities and the embassy. It works only on documents that already carry the earlier stamps, which is why it is the step people are turned away from most often.",
    service: SERVICE,
    phrases: [
      "what is the foreign ministry step for my education documents",
      "mofa attestation for my degree certificate",
      "ministry of foreign affairs stamp on my transcript",
      "do i need mofa for my student documents",
    ],
    keywords: [
      ["foreign", "ministry", "step", "education", "documents"],
      ["mofa", "attestation", "degree", "certificate"],
      ["foreign", "affairs", "stamp", "transcript"],
    ],
    next: ["hst-embassy-step", "hst-order-of-steps", "hst-apostille-outbound"],
  },
  {
    id: "hst-abroad-by-country",
    question: "Does the process differ depending on which country I am studying in",
    answer:
      "Yes, and that is the main variable. Every destination sets what its own institutions and mission require, and those arrangements are revised without much notice. Tell us the country and the university and we will work from their current requirements rather than from a general chain, because the general chain is what gets documents sent back.",
    service: SERVICE,
    phrases: [
      "does the process differ depending on which country i am studying in",
      "is attestation different for the uk and canada",
      "requirements by country for my study documents",
      "does each country have its own rules for my certificate",
    ],
    keywords: [
      ["process", "differ", "country", "studying"],
      ["attestation", "different", "canada"],
      ["requirements", "country", "study", "documents"],
    ],
    next: ["hst-embassy-step", "hst-apostille-outbound", "hst-hub-abroad"],
  },
  {
    id: "hst-uae-degree-abroad",
    question: "I have a degree from a UAE university and want to do a masters overseas",
    answer:
      "Your certificate starts with the issuing university and the UAE education authority, then the UAE foreign ministry, then the destination country's mission here. Since there is no apostille on a UAE document, expect to explain that to the overseas admissions office once — it is a routine conversation and they will tell you what they accept instead.",
    service: SERVICE,
    phrases: [
      "i have a degree from a uae university and want to do a masters overseas",
      "using my dubai university degree abroad",
      "my uae bachelors for a foreign masters application",
      "attesting a degree from a uae university for overseas study",
    ],
    keywords: [
      ["degree", "uae", "university", "masters", "overseas"],
      ["dubai", "university", "degree", "abroad"],
      ["uae", "bachelors", "foreign", "masters", "application"],
    ],
    next: ["hst-apostille-outbound", "hst-mofa-step", "hst-embassy-step"],
  },
  {
    id: "hst-abroad-freezone-university",
    question: "My university is in a free zone does that change the attestation",
    answer:
      "It can change which authority attests at the first step, because some institutions sit under a free zone or an academic authority of their own rather than under the general education authority. Ask your university's registry which body attests its certificates — they are asked this weekly and will name it precisely.",
    service: SERVICE,
    phrases: [
      "my university is in a free zone does that change the attestation",
      "attesting a degree from a free zone university in dubai",
      "which authority attests my academic city university degree",
      "free zone college certificate attestation",
    ],
    keywords: [
      ["university", "free", "zone", "change", "attestation"],
      ["attesting", "degree", "free", "zone", "university"],
      ["authority", "attests", "academic", "city", "degree"],
    ],
    next: ["hst-uae-degree-abroad", "hst-who-does-what", "hst-mofa-step"],
  },
  {
    id: "hst-abroad-two-destinations",
    question: "I am applying to universities in three different countries",
    answer:
      "Then you need a set of documents per destination, because the final stamp is country-specific and one embassy's legalisation does not serve another. Prepare enough attested originals early in the chain so that the country-specific step is the only thing you repeat, and decide your shortlist before the embassy stage rather than after it.",
    service: SERVICE,
    phrases: [
      "i am applying to universities in three different countries",
      "documents for applications to several countries",
      "one set of attested documents for multiple universities",
      "applying to the uk and canada at the same time",
    ],
    keywords: [
      ["applying", "universities", "three", "different", "countries"],
      ["documents", "applications", "several", "countries"],
      ["attested", "documents", "multiple", "universities"],
    ],
    next: ["hst-how-many-copies", "hst-abroad-by-country", "hst-embassy-step"],
  },

  /* ── Bringing foreign documents in ──────────────────────────────────────── */
  {
    id: "hst-inbound-order",
    question: "What is the order for getting my foreign certificate accepted in the UAE",
    answer:
      "Broadly: the issuing institution, then that country's education and foreign affairs authorities, then the UAE mission in that country, then the UAE foreign ministry here, and equivalency after all of it if you need it. Each office wants the previous stamp already present, so the sequence is not a suggestion. Confirm the current chain for your country before you begin, since missions revise their requirements.",
    service: SERVICE,
    phrases: [
      "what is the order for getting my foreign certificate accepted in the uae",
      "steps to attest my foreign degree for the uae",
      "sequence for attesting my indian degree in dubai",
      "what is the process for my overseas certificate in the uae",
    ],
    keywords: [
      ["order", "foreign", "certificate", "accepted", "uae"],
      ["steps", "attest", "foreign", "degree", "uae"],
      ["sequence", "attesting", "indian", "degree", "dubai"],
    ],
    next: ["hst-inbound-already-here", "hst-apostille-inbound", "hst-equivalency-before-or-after"],
  },
  {
    id: "hst-inbound-already-here",
    question: "I am already living in Dubai and my certificate is still in my home country",
    answer:
      "You do not have to fly back for it, but the early steps still have to happen there — the institution and that country's authorities are the only ones who can do them. In practice that means either a trusted representative with an authorisation, or a service operating in that country. Arrange that first, because everything else waits on it.",
    service: SERVICE,
    phrases: [
      "i am already living in dubai and my certificate is still in my home country",
      "my documents are back home and i am in the uae",
      "can i do the home country attestation from dubai",
      "attesting my degree without travelling back",
    ],
    keywords: [
      ["living", "dubai", "certificate", "home", "country"],
      ["documents", "back", "home", "uae"],
      ["attesting", "degree", "without", "travelling", "back"],
    ],
    next: ["hst-poa-collect", "hst-degree-courier", "hst-inbound-order"],
  },
  {
    id: "hst-inbound-which-mission",
    question: "Which UAE embassy abroad has to stamp my certificate",
    answer:
      "The UAE mission with jurisdiction over the place the document was issued, which is not always the one nearest to where your family lives. Getting this wrong means the document is returned rather than redirected, so check the mission's stated area of responsibility before sending anything to it.",
    service: SERVICE,
    phrases: [
      "which uae embassy abroad has to stamp my certificate",
      "uae consulate attestation for my degree in my home country",
      "which uae mission handles my state for attestation",
      "uae embassy attestation of my education documents",
    ],
    keywords: [
      ["uae", "embassy", "abroad", "stamp", "certificate"],
      ["uae", "consulate", "attestation", "degree", "home", "country"],
      ["uae", "mission", "handles", "attestation"],
    ],
    next: ["hst-inbound-order", "hst-inbound-already-here", "hst-embassy-vs-ministry"],
  },
  {
    id: "hst-inbound-state-level",
    question: "Do I need a state level attestation before the national one",
    answer:
      "In several countries yes — a state, provincial or regional education authority attests before the national ministry does, and the national ministry will not look at a document that skipped it. Whether your document needs it depends on which authority issued the certificate, so ask the institution which chain applies to their awards.",
    service: SERVICE,
    phrases: [
      "do i need a state level attestation before the national one",
      "state education department attestation for my marksheet",
      "hrd attestation for my degree certificate",
      "regional authority stamp before the ministry",
    ],
    keywords: [
      ["state", "level", "attestation", "before", "national"],
      ["state", "education", "department", "attestation", "marksheet"],
      ["regional", "authority", "stamp", "before", "ministry"],
    ],
    next: ["hst-inbound-order", "hst-school-stamp-first", "hst-inbound-which-mission"],
  },
  {
    id: "hst-agent-problem",
    question: "An agent took my documents and I cannot get a straight answer",
    answer:
      "Ask for three specific things in writing: an itemised receipt of exactly which originals they hold, the current stage of each document, and the reference numbers from the offices involved. A provider who cannot produce those is a problem regardless of the explanation. Keep everything in writing from that point on, and do not send further documents until the ones held are accounted for.",
    service: SERVICE,
    phrases: [
      "an agent took my documents and i cannot get a straight answer",
      "my consultant is not responding about my certificates",
      "the agency has had my degree for a long time",
      "i think my education agent is stalling",
    ],
    keywords: [
      ["agent", "took", "documents", "straight", "answer"],
      ["consultant", "responding", "certificates"],
      ["agency", "degree", "long", "time"],
      ["education", "agent", "stalling"],
    ],
    next: ["hst-degree-original-risk", "hst-poa-revoke", "hst-hub-rejected"],
  },

  /* ── Student visas ──────────────────────────────────────────────────────── */
  {
    id: "hst-visa-documents",
    question: "Which documents does a UAE student visa file need",
    answer:
      "Typically the university's admission or sponsorship confirmation, your passport, photographs, a medical, Emirates ID steps, and the attested education documents the university relied on — plus proof of funding or a sponsor's undertaking where required. The list is set by the sponsoring institution and the immigration authority together, so take it from them and treat any other list as a rough guide.",
    service: SERVICE,
    phrases: [
      "which documents does a uae student visa file need",
      "student visa document checklist for dubai",
      "what do i submit for my study visa in the uae",
      "papers needed for a student residence visa",
    ],
    keywords: [
      ["documents", "uae", "student", "visa", "file"],
      ["student", "visa", "document", "checklist", "dubai"],
      ["papers", "needed", "student", "residence", "visa"],
    ],
    next: ["hst-visa-sponsor", "hst-visa-attestation-first", "hst-affidavit-financial"],
  },
  {
    id: "hst-visa-sponsor",
    question: "Who sponsors a student visa in the UAE",
    answer:
      "Usually the university or the academic free zone the university sits in, and in some cases a parent's residency sponsors a dependent studying here instead. Which applies changes what you have to provide and who chases the file, so ask the admissions office who the sponsor will be before assuming it is them.",
    service: SERVICE,
    phrases: [
      "who sponsors a student visa in the uae",
      "does the university sponsor my student visa",
      "can my father sponsor me while i study in dubai",
      "student visa sponsorship in the uae",
    ],
    keywords: [
      ["sponsors", "student", "visa", "uae"],
      ["university", "sponsor", "student", "visa"],
      ["father", "sponsor", "study", "dubai"],
    ],
    next: ["hst-visa-family-to-student", "hst-visa-documents", "hst-affidavit-financial"],
  },
  {
    id: "hst-visa-attestation-first",
    question: "Does my certificate attestation have to be finished before the visa file opens",
    answer:
      "Generally the university needs the education documents settled before it will sponsor you, so in practice the attestation comes first. Some institutions open a file on a conditional basis and hold the visa step until the documents land. Ask yours which they do, because the answer changes your whole timeline.",
    service: SERVICE,
    phrases: [
      "does my certificate attestation have to be finished before the visa file opens",
      "can i start my student visa before attestation is done",
      "attestation before or after my study visa",
      "do i need attested documents for the student visa application",
    ],
    keywords: [
      ["certificate", "attestation", "finished", "before", "visa", "file"],
      ["start", "student", "visa", "before", "attestation"],
      ["attested", "documents", "student", "visa", "application"],
    ],
    next: ["hst-hub-timing", "hst-visa-documents", "hst-deadline-close"],
  },
  {
    id: "hst-visa-family-to-student",
    question: "I am on my parents visa do I have to switch to a student visa",
    answer:
      "Not always — plenty of students study here as dependents on a parent's residency, and some universities are content with that while others require their own sponsorship. It also affects what happens if your parent's residency changes during your course. Ask the university which status they need you to hold for the whole programme.",
    service: SERVICE,
    phrases: [
      "i am on my parents visa do i have to switch to a student visa",
      "can i study in dubai on my family visa",
      "changing from a dependent visa to a student visa",
      "studying on my father sponsorship in the uae",
    ],
    keywords: [
      ["parents", "visa", "switch", "student"],
      ["study", "dubai", "family", "visa"],
      ["changing", "dependent", "visa", "student"],
    ],
    next: ["hst-visa-sponsor", "hst-visa-documents", "hst-affidavit-no-objection"],
  },
  {
    id: "hst-visa-abroad",
    question: "What documents does a student visa for studying abroad need",
    answer:
      "That is set by the destination country's mission, and it almost always includes legalised education documents, financial evidence and sometimes notarised undertakings about funding or intention. Work from the mission's own published checklist, because visa requirements are the most frequently revised part of this whole process.",
    service: SERVICE,
    phrases: [
      "what documents does a student visa for studying abroad need",
      "study visa requirements for the uk from dubai",
      "documents for a canadian student visa from the uae",
      "applying for a study permit from dubai",
    ],
    keywords: [
      ["documents", "student", "visa", "studying", "abroad"],
      ["study", "visa", "requirements", "dubai"],
      ["documents", "canadian", "student", "visa", "uae"],
      ["applying", "study", "permit", "dubai"],
    ],
    next: ["hst-affidavit-intention-return", "hst-bank-statements", "hst-embassy-step"],
  },
  {
    id: "hst-visa-rejected",
    question: "My student visa was refused because of a document",
    answer:
      "Get the stated reason in writing and read it literally — document refusals are usually about a specific item being missing, expired, inconsistent with another document, or certified by a party the authority does not accept. Fix that one thing properly rather than resubmitting the same file, and ask whether a fresh application or a review is the right route.",
    service: SERVICE,
    phrases: [
      "my student visa was refused because of a document",
      "study visa rejected over my certificates",
      "they refused my student visa what do i do",
      "visa refusal because of my degree attestation",
    ],
    keywords: [
      ["student", "visa", "refused", "document"],
      ["study", "visa", "rejected", "certificates"],
      ["visa", "refusal", "degree", "attestation"],
    ],
    next: ["hst-rejection-reasons", "hst-name-mismatch", "hst-visa-documents"],
  },
  {
    id: "hst-visa-during-processing",
    question: "Can I stay in the UAE while my student visa is being processed",
    answer:
      "That depends on the status you are currently on and on the sponsoring institution's arrangements, and it is not something to work out from a forum. Ask the university's student services and, where it matters, take it up with the immigration authority directly — a wrong assumption about permission to remain is a much more serious problem than a document delay.",
    service: SERVICE,
    phrases: [
      "can i stay in the uae while my student visa is being processed",
      "what is my status while waiting for my study visa",
      "do i have to leave while my student visa is issued",
      "visit visa while my student visa is in process",
    ],
    keywords: [
      ["stay", "uae", "student", "visa", "being", "processed"],
      ["status", "waiting", "study", "visa"],
      ["leave", "while", "student", "visa", "issued"],
    ],
    next: ["hst-visa-sponsor", "hst-visa-documents", "hst-visa-rejected"],
  },

  /* ── The appointment ────────────────────────────────────────────────────── */
  {
    id: "hst-appointment-bring",
    question: "What should I bring to the notary for my student documents",
    answer:
      "The original of anything being copied or relied on, your passport and Emirates ID where you have one, the document to be signed in its final wording, and anyone else who has to sign. Bring the receiving office's instructions too — if there is a dispute about wording on the day, the instructions settle it faster than a phone call.",
    service: SERVICE,
    phrases: [
      "what should i bring to the notary for my student documents",
      "what do i take to notarise my study affidavit",
      "documents to bring for notarising my certificate copy",
      "checklist for my notary appointment as a student",
    ],
    keywords: [
      ["bring", "notary", "student", "documents"],
      ["take", "notarise", "study", "affidavit"],
      ["checklist", "notary", "appointment", "student"],
    ],
    next: ["hst-appointment-in-person", "hst-affidavit-wording", "hst-minor-appointment"],
  },
  {
    id: "hst-appointment-in-person",
    question: "Do I have to attend the notary myself for my study papers",
    answer:
      "If you are the one signing, yes — a notary is certifying that you personally signed in front of them, and that cannot be delegated. If the document is a certified copy of a certificate rather than something you sign, a representative with the right authorisation can sometimes attend instead. Check which of the two you are doing.",
    service: SERVICE,
    phrases: [
      "do i have to attend the notary myself for my study papers",
      "can someone go to the notary instead of me for my certificate",
      "must i be present to notarise my student declaration",
      "do i need to be there in person for my education documents",
    ],
    keywords: [
      ["attend", "notary", "myself", "study", "papers"],
      ["someone", "notary", "instead", "certificate"],
      ["present", "notarise", "student", "declaration"],
    ],
    next: ["hst-poa-collect", "hst-appointment-bring", "hst-appointment-online"],
  },
  {
    id: "hst-minor-appointment",
    question: "I am under eighteen and my documents need signing",
    answer:
      "A parent or legal guardian normally signs for you and attends with proof of the relationship and their own identification. Bring your birth certificate or family book as well as your passport, and if the relationship documents were issued abroad, expect them to need the same legalisation as your certificates.",
    service: SERVICE,
    phrases: [
      "i am under eighteen and my documents need signing",
      "notarising documents for a student under eighteen",
      "my son is a minor and needs a notarised declaration for university",
      "guardian signing for a minor student in dubai",
    ],
    keywords: [
      ["under", "eighteen", "documents", "signing"],
      ["notarising", "documents", "student", "under", "eighteen"],
      ["guardian", "signing", "minor", "student", "dubai"],
    ],
    next: ["hst-poa-minor", "hst-affidavit-relationship", "hst-appointment-bring"],
  },
  {
    id: "hst-appointment-online",
    question: "Can any of this be done online without an appointment",
    answer:
      "Parts of it, increasingly — several authorities in the chain accept electronic submission, and some notarial acts can be done remotely with identity verification. Which parts, for which document, changes with the service, so check the current position for your specific step rather than assuming the whole chain is now digital.",
    service: SERVICE,
    phrases: [
      "can any of this be done online without an appointment",
      "online notarisation for my student documents",
      "remote notary for my university papers",
      "can i attest my degree online in dubai",
    ],
    keywords: [
      ["done", "online", "without", "appointment"],
      ["online", "notarisation", "student", "documents"],
      ["remote", "notary", "university", "papers"],
    ],
    next: ["hst-appointment-in-person", "hst-digital-certificate", "hst-appointment-bring"],
  },
  {
    id: "hst-appointment-refused",
    question: "The notary refused to act on my document",
    answer:
      "A notary can decline, and when they do it is usually about the document rather than about you: wording they cannot certify, a document they are not the right authority for, identification that does not match, or a missing prior step. Ask which of those it was, in those terms, because the answer tells you exactly what to change.",
    service: SERVICE,
    phrases: [
      "the notary refused to act on my document",
      "they would not notarise my student affidavit",
      "notary turned away my certificate copy",
      "why did the notary refuse my education document",
    ],
    keywords: [
      ["notary", "refused", "act", "document"],
      ["notarise", "student", "affidavit", "refused"],
      ["notary", "turned", "away", "certificate", "copy"],
    ],
    next: ["hst-affidavit-wording", "hst-rejection-reasons", "hst-appointment-bring"],
  },

  /* ── When it goes wrong ─────────────────────────────────────────────────── */
  {
    id: "hst-rejection-reasons",
    question: "Why do student documents usually get rejected",
    answer:
      "In rough order of frequency: a step done out of sequence, the issuing institution's own stamp missing, a name that does not match the passport, a translation from a source the office does not accept, a copy certified by the wrong party, and a document that has been laminated or altered. Almost none of these are about the substance of your qualification.",
    service: SERVICE,
    phrases: [
      "why do student documents usually get rejected",
      "common reasons my certificate attestation fails",
      "what makes a university reject my documents",
      "reasons for rejection of education documents",
    ],
    keywords: [
      ["student", "documents", "usually", "rejected"],
      ["reasons", "certificate", "attestation", "fails"],
      ["university", "reject", "documents"],
    ],
    next: ["hst-name-mismatch", "hst-laminated", "hst-rejection-start-again"],
  },
  {
    id: "hst-name-mismatch",
    question: "My name is different on my certificate and my passport",
    answer:
      "This stops files more than anything else, and the fix is a document that bridges the two rather than an explanation. Depending on the cause that is a corrected certificate from the institution, an affidavit of one and the same person, or a marriage or name-change record. Ask the receiving office which of those they accept before commissioning one.",
    service: SERVICE,
    phrases: [
      "my name is different on my certificate and my passport",
      "name mismatch between my degree and passport",
      "my initials are expanded on my marksheet but not my passport",
      "one and the same person affidavit for my certificate",
      "my surname is missing on my degree certificate",
    ],
    keywords: [
      ["name", "different", "certificate", "passport"],
      ["name", "mismatch", "degree", "passport"],
      ["initials", "expanded", "marksheet", "passport"],
      ["same", "person", "affidavit", "certificate"],
    ],
    next: ["hst-single-name", "hst-name-changed", "hst-translation-name-spelling"],
  },
  {
    id: "hst-single-name",
    question: "I have only one name in my passport and forms want a surname",
    answer:
      "It is common and the offices are used to it, but the documents have to agree with each other. Where a form insists on a surname, follow the receiving office's instruction on how single-name applicants should complete it rather than inventing a split, and if your certificate and passport already differ, bridge them with a declaration the office accepts.",
    service: SERVICE,
    phrases: [
      "i have only one name in my passport and forms want a surname",
      "single name on my passport for a university application",
      "no surname on my certificate",
      "mononym problem with my student documents",
    ],
    keywords: [
      ["only", "one", "name", "passport", "surname"],
      ["single", "name", "passport", "university", "application"],
      ["surname", "certificate", "missing"],
    ],
    next: ["hst-name-mismatch", "hst-rejection-reasons", "hst-translation-name-spelling"],
  },
  {
    id: "hst-name-changed",
    question: "My name changed after marriage and my degree is in my maiden name",
    answer:
      "Keep the certificate as it was issued — it is a record of an award made to you at that time and should not be altered. What you add is the link: the marriage or name-change document, legalised if it was issued abroad, submitted alongside. Tell the receiving office up front rather than letting them find the discrepancy.",
    service: SERVICE,
    phrases: [
      "my name changed after marriage and my degree is in my maiden name",
      "maiden name on my certificate for my application",
      "i changed my name after graduating",
      "married name different from my transcript",
    ],
    keywords: [
      ["name", "changed", "marriage", "degree", "maiden"],
      ["maiden", "name", "certificate", "application"],
      ["changed", "name", "after", "graduating"],
    ],
    next: ["hst-name-mismatch", "hst-affidavit-relationship", "hst-rejection-reasons"],
  },
  {
    id: "hst-laminated",
    question: "My certificate is laminated is that a problem",
    answer:
      "Often yes. Offices need to apply stamps and to examine the paper and the seal, and lamination prevents both — some will refuse the document outright. Do not try to remove it yourself; ask the issuing institution for a fresh copy instead, and never laminate anything that still has stamps to collect.",
    service: SERVICE,
    phrases: [
      "my certificate is laminated is that a problem",
      "can my laminated marksheet be attested for university",
      "i laminated my marksheet by mistake",
      "does lamination stop certificate attestation",
    ],
    keywords: [
      ["certificate", "laminated", "problem"],
      ["laminated", "degree", "attested"],
      ["laminated", "marksheet", "mistake"],
      ["lamination", "certificate", "attestation"],
    ],
    next: ["hst-degree-photocopy-only", "hst-rejection-reasons", "hst-lost-original"],
  },
  {
    id: "hst-rejection-start-again",
    question: "Do I have to start the whole process again after a rejection",
    answer:
      "Usually not. Most rejections send you back to the specific step that was wrong and everything before it still stands, so establish precisely which office objected and why before assuming the whole chain is void. Re-doing steps that were fine is the most common way a rejection becomes twice as expensive as it needed to be.",
    service: SERVICE,
    phrases: [
      "do i have to start the whole process again after a rejection",
      "do the earlier stamps still count after a rejection",
      "can i fix one step or redo everything for my certificate",
      "my document was returned do i restart",
    ],
    keywords: [
      ["start", "whole", "process", "again", "rejection"],
      ["earlier", "stamps", "still", "count", "rejection"],
      ["document", "returned", "restart"],
    ],
    next: ["hst-rejection-reasons", "hst-deadline-close", "hst-hub-rejected"],
  },
  {
    id: "hst-wrong-document-attested",
    question: "I had the wrong document attested by mistake",
    answer:
      "It happens, and the stamps on it are not wasted if that document is needed anywhere else in your application. Work out what the receiving office actually asked for — in their words — and start that document now. Do not submit the attested wrong document hoping it passes; a substituted document is read as carelessness at best.",
    service: SERVICE,
    phrases: [
      "i had the wrong document attested by mistake",
      "i attested my transcript but they wanted the degree",
      "i prepared the wrong certificate for my application",
      "wasted money attesting the wrong marksheet",
    ],
    keywords: [
      ["wrong", "document", "attested", "mistake"],
      ["attested", "transcript", "wanted", "degree"],
      ["prepared", "wrong", "certificate", "application"],
    ],
    next: ["hst-what-documents", "hst-which-step", "hst-rejection-start-again"],
  },

  /* ── Timing ─────────────────────────────────────────────────────────────── */
  {
    id: "hst-deadline-close",
    question: "My intake deadline is close and my documents are not ready",
    answer:
      "Tell the university now rather than at the deadline. Admissions offices routinely accept a file with the document work in progress, or admit conditionally pending it, and the one thing that removes that option is silence. At the same time, find out which single step is the bottleneck so that the effort goes where it changes the date.",
    service: SERVICE,
    phrases: [
      "my intake deadline is close and my documents are not ready",
      "my application deadline is next week and my certificate is not attested",
      "i am running out of time before the intake",
      "admission closes soon and my papers are stuck",
    ],
    keywords: [
      ["intake", "deadline", "close", "documents", "ready"],
      ["application", "deadline", "certificate", "attested"],
      ["running", "out", "time", "before", "intake"],
      ["admission", "closes", "papers", "stuck"],
    ],
    next: ["hst-can-it-be-rushed", "hst-conditional-offer", "hst-hub-timing"],
  },
  {
    id: "hst-can-it-be-rushed",
    question: "Can the attestation of my certificates be speeded up",
    answer:
      "Some offices in the chain offer an expedited service and some do not, and no provider can compress a step that an authority controls. What genuinely saves time is running the independent items in parallel, having every prior stamp in place before each submission, and not losing a cycle to an avoidable rejection. Anyone promising a fixed short turnaround for the whole chain is promising something they do not control.",
    service: SERVICE,
    phrases: [
      "can the attestation of my certificates be speeded up",
      "is there an express service for my degree attestation",
      "urgent attestation for my university deadline",
      "can you fast track my education documents",
    ],
    keywords: [
      ["attestation", "certificates", "speeded", "up"],
      ["express", "service", "degree", "attestation"],
      ["urgent", "attestation", "university", "deadline"],
      ["fast", "track", "education", "documents"],
    ],
    next: ["hst-deadline-close", "hst-order-of-steps", "hst-hub-timing"],
  },
  {
    id: "hst-conditional-offer",
    question: "I have a conditional offer what do I need to clear it",
    answer:
      "Read the conditions literally and one by one — they usually name the exact document, the exact grade and sometimes the exact form of certification. Then confirm with admissions which of them need attested or legalised versions and which they accept as a scan. Clearing the wrong condition first is the usual way a conditional offer lapses.",
    service: SERVICE,
    phrases: [
      "i have a conditional offer what do i need to clear it",
      "meeting the conditions of my university offer",
      "what documents clear my conditional admission",
      "my offer is conditional on attested certificates",
    ],
    keywords: [
      ["conditional", "offer", "need", "clear"],
      ["meeting", "conditions", "university", "offer"],
      ["documents", "clear", "conditional", "admission"],
    ],
    next: ["hst-degree-not-graduated-yet", "hst-deadline-close", "hst-what-documents"],
  },
  {
    id: "hst-deferring-intake",
    question: "Should I defer to the next intake if my documents are delayed",
    answer:
      "It is often the calmer choice, and universities grant deferrals for document delays more readily than students expect — but ask before assuming, because some programmes cannot defer and some scholarships do not carry over. Get the deferral position in writing before you stop chasing the documents.",
    service: SERVICE,
    phrases: [
      "should i defer to the next intake if my documents are delayed",
      "can i postpone my admission because of attestation delays",
      "deferring my university place for a semester",
      "moving to the next intake because of my certificates",
    ],
    keywords: [
      ["defer", "next", "intake", "documents", "delayed"],
      ["postpone", "admission", "attestation", "delays"],
      ["deferring", "university", "place", "semester"],
    ],
    next: ["hst-deadline-close", "hst-conditional-offer", "hst-scholarship-documents"],
  },
  {
    id: "hst-how-long-valid",
    question: "Do attested documents expire or can I reuse them later",
    answer:
      "The attestation itself does not usually expire, but receiving offices often have their own preference for recently issued or recently certified documents, and some want evidence produced within a recent window. So a document from an earlier application may well be reusable, and it is the receiving office rather than the stamp that decides.",
    service: SERVICE,
    phrases: [
      "do attested documents expire or can i reuse them later",
      "can i reuse my attested degree for another university",
      "does certificate attestation have a validity period",
      "are my old attested documents still good",
    ],
    keywords: [
      ["attested", "documents", "expire", "reuse"],
      ["reuse", "attested", "degree", "another", "university"],
      ["certificate", "attestation", "validity", "period"],
    ],
    next: ["hst-how-many-copies", "hst-poa-validity", "hst-equivalency-after-study"],
  },

  /* ── Difficult situations ───────────────────────────────────────────────── */
  {
    id: "hst-lost-original",
    question: "I have lost my original degree certificate",
    answer:
      "Only the issuing institution can replace it, usually through a duplicate or reissue procedure that may need a police report or a sworn statement of loss. Start that request immediately and in parallel with everything else, because it is the longest and least controllable item in your timeline. A notarised declaration of loss is often part of the institution's own process.",
    service: SERVICE,
    phrases: [
      "i have lost my original degree certificate",
      "my marksheet is lost what do i do for my application",
      "duplicate degree certificate from my university",
      "my certificates were destroyed and i need them for admission",
    ],
    keywords: [
      ["lost", "original", "degree", "certificate"],
      ["marksheet", "lost", "application"],
      ["duplicate", "degree", "certificate", "university"],
    ],
    next: ["hst-degree-photocopy-only", "hst-university-closed", "hst-affidavit-wording"],
  },
  {
    id: "hst-university-closed",
    question: "The university I graduated from no longer exists",
    answer:
      "Its records normally pass to a successor institution, an affiliating university or the education authority that licensed it, and that body issues or confirms what you need. Finding out which one took over is the whole difficulty, and the education ministry of that country is the right place to start asking.",
    service: SERVICE,
    phrases: [
      "the university i graduated from no longer exists",
      "my college has shut down and i need my transcript",
      "closed university records for attestation",
      "my institution lost its licence after i graduated",
    ],
    keywords: [
      ["university", "graduated", "longer", "exists"],
      ["college", "shut", "down", "need", "transcript"],
      ["closed", "university", "records", "attestation"],
    ],
    next: ["hst-school-closed", "hst-unrecognised-university", "hst-lost-original"],
  },
  {
    id: "hst-parents-separated",
    question: "My parents are separated and both signatures are being asked for",
    answer:
      "Explain the position to the receiving office early and ask what they accept — many will work from a custody or guardianship document naming who may act for you, rather than insisting on both signatures. If a court order exists, that is the document that resolves it, and it travels through the same legalisation chain as everything else.",
    service: SERVICE,
    phrases: [
      "my parents are separated and both signatures are being asked for",
      "my father is not in contact and has to sign my documents",
      "divorced parents and my student paperwork",
      "custody document for my university application",
    ],
    keywords: [
      ["parents", "separated", "both", "signatures"],
      ["father", "contact", "sign", "documents"],
      ["divorced", "parents", "student", "paperwork"],
      ["custody", "document", "university", "application"],
    ],
    next: ["hst-affidavit-relationship", "hst-minor-appointment", "hst-affidavit-who-signs"],
  },
  {
    id: "hst-parent-deceased",
    question: "My father has passed away and documents ask for his signature",
    answer:
      "Tell the receiving office and provide the death certificate, legalised if it was issued abroad, together with whatever names your guardian or the surviving parent. Offices have a route for this and it is a common situation; what causes problems is leaving the field blank or having someone sign in his place.",
    service: SERVICE,
    phrases: [
      "my father has passed away and documents ask for his signature",
      "my parent died and i need documents for university",
      "deceased sponsor on my student application",
      "death certificate for my education paperwork",
    ],
    keywords: [
      ["father", "passed", "away", "documents", "signature"],
      ["parent", "died", "documents", "university"],
      ["deceased", "sponsor", "student", "application"],
    ],
    next: ["hst-parents-separated", "hst-affidavit-relationship", "hst-sponsor-letter"],
  },
  {
    id: "hst-refugee-documents",
    question: "I cannot get documents from my home country because of the situation there",
    answer:
      "This is genuinely difficult and the answer is institutional rather than procedural: many universities and authorities have alternative evidence routes for applicants who cannot obtain records, and some accept assessments or sworn statements in place of certificates. Ask the university's admissions team directly what they accept — they are the ones with discretion here.",
    service: SERVICE,
    phrases: [
      "i cannot get documents from my home country because of the situation there",
      "my country is in conflict and i cannot obtain my certificates",
      "no access to my university records back home",
      "applying to university without my original documents",
    ],
    keywords: [
      ["cannot", "get", "documents", "home", "country", "situation"],
      ["country", "conflict", "cannot", "obtain", "certificates"],
      ["access", "university", "records", "back", "home"],
    ],
    next: ["hst-university-closed", "hst-lost-original", "hst-what-documents"],
  },
  {
    id: "hst-disability-support",
    question: "I need my medical documents recognised for study support",
    answer:
      "Universities usually ask for recent evidence from a qualified professional, and where it was issued abroad it may need translation and legalisation like any other document. Ask the disability or student support office what they accept and how recent it has to be, and ask them early — support arrangements are set before term rather than during it.",
    service: SERVICE,
    phrases: [
      "i need my medical documents recognised for study support",
      "disability evidence for my university application",
      "attesting a medical report for student accommodations",
      "learning support documents for university",
    ],
    keywords: [
      ["medical", "documents", "recognised", "study", "support"],
      ["disability", "evidence", "university", "application"],
      ["learning", "support", "documents", "university"],
    ],
    next: ["hst-translator-who", "hst-what-documents", "hst-inbound-order"],
  },
  {
    id: "hst-police-clearance",
    question: "The university is asking for a police clearance certificate",
    answer:
      "Some programmes and some visa routes require one, and it usually has to be issued by the country you lived in and then legalised for the receiving country. Many receiving offices also expect one issued within a recent window, so check that before requesting it — an old certificate is often the wrong document rather than a partial one.",
    service: SERVICE,
    phrases: [
      "the university is asking for a police clearance certificate",
      "do i need a good conduct certificate for my student visa",
      "attesting a police clearance for university",
      "criminal record check for my study application",
    ],
    keywords: [
      ["university", "asking", "police", "clearance", "certificate"],
      ["good", "conduct", "certificate", "student", "visa"],
      ["criminal", "record", "check", "study", "application"],
    ],
    next: ["hst-visa-documents", "hst-inbound-order", "hst-what-documents"],
  },

  /* ── Scholarships, loans and financial evidence ─────────────────────────── */
  {
    id: "hst-scholarship-documents",
    question: "What documents does a scholarship application usually ask for",
    answer:
      "Beyond the academic record, typically evidence of need or merit: income documents for your family, bank statements, sometimes a sponsor's undertaking, and references. Panels are stricter about form than admissions offices are, so read the certification requirement for each item — many want certified or notarised copies rather than scans.",
    service: SERVICE,
    phrases: [
      "what documents does a scholarship application usually ask for",
      "papers needed for a scholarship application",
      "notarised documents for a scholarship",
      "what evidence does a scholarship panel want",
    ],
    keywords: [
      ["documents", "scholarship", "application"],
      ["papers", "needed", "scholarship", "application"],
      ["notarised", "documents", "scholarship"],
    ],
    next: ["hst-sponsor-income", "hst-bank-statements", "hst-scholarship-deadline"],
  },
  {
    id: "hst-loan-documents",
    question: "What paperwork does an education loan need",
    answer:
      "Lenders generally want the admission letter, the programme's fee structure, your academic documents, and income and asset evidence for whoever is co-signing — often certified rather than plain copies. Ask the lender for their document list in writing early, because their certification rules are usually stricter than the university's.",
    service: SERVICE,
    phrases: [
      "what paperwork does an education loan need",
      "documents for a student loan application",
      "notarised papers for my education loan",
      "what does the bank want for my study loan",
    ],
    keywords: [
      ["paperwork", "education", "loan", "need"],
      ["documents", "student", "loan", "application"],
      ["bank", "want", "study", "loan"],
    ],
    next: ["hst-loan-sanction-letter", "hst-bank-statements", "hst-sponsor-income"],
  },
  {
    id: "hst-loan-sanction-letter",
    question: "The university wants proof my loan is approved",
    answer:
      "Ask the lender for a sanction or approval letter naming you, the programme and the amount committed, on their letterhead. Universities and visa authorities both accept these routinely; what they do not accept is an application receipt presented as an approval, so check which one you have been given.",
    service: SERVICE,
    phrases: [
      "the university wants proof my loan is approved",
      "loan sanction letter for my university application",
      "evidence of my education loan for admission",
      "proof of funding from my bank for university",
    ],
    keywords: [
      ["university", "proof", "loan", "approved"],
      ["loan", "sanction", "letter", "university", "application"],
      ["evidence", "education", "loan", "admission"],
    ],
    next: ["hst-bank-statements", "hst-visa-abroad", "hst-loan-documents"],
  },
  {
    id: "hst-sponsor-income",
    question: "How do I prove my sponsor's income for my application",
    answer:
      "Usually salary certificates or employment letters, recent payslips, and where relevant business or tax documents — issued by the employer or institution rather than written by the sponsor. If they were issued abroad they may need legalisation and translation like any other document, so factor that in rather than treating them as easy paperwork.",
    service: SERVICE,
    phrases: [
      "how do i prove my sponsor's income for my application",
      "salary certificate for my student application",
      "income proof for my university sponsor",
      "employment letter for my father as my sponsor",
    ],
    keywords: [
      ["prove", "sponsor", "income", "application"],
      ["salary", "certificate", "student", "application"],
      ["income", "proof", "university", "sponsor"],
    ],
    next: ["hst-bank-statements", "hst-affidavit-financial", "hst-sponsor-letter"],
  },
  {
    id: "hst-bank-statements",
    question: "Do my bank statements need to be notarised or stamped",
    answer:
      "Many universities and most visa authorities want statements issued and stamped by the bank itself rather than printed from an app, and some additionally ask for them attested. Ask for the bank's official stamped version at the counter, and check the required period and currency before you request them.",
    service: SERVICE,
    phrases: [
      "do my bank statements need to be notarised or stamped",
      "bank statement requirements for my student visa",
      "does the university need stamped bank statements",
      "attesting bank statements for my study application",
    ],
    keywords: [
      ["bank", "statements", "notarised", "stamped"],
      ["bank", "statement", "requirements", "student", "visa"],
      ["attesting", "bank", "statements", "study", "application"],
    ],
    next: ["hst-affidavit-financial", "hst-visa-abroad", "hst-sponsor-income"],
  },
  {
    id: "hst-scholarship-deadline",
    question: "The scholarship deadline is before my documents can be attested",
    answer:
      "Apply anyway with what you have and say clearly in the application which items are in progress. Panels often accept a certified copy later where they would not accept a missing item now, and an application submitted incomplete but on time is in far better shape than a perfect one submitted late.",
    service: SERVICE,
    phrases: [
      "the scholarship deadline is before my documents can be attested",
      "scholarship closes before my certificates are ready",
      "can i apply for a scholarship with unattested documents",
      "missing the scholarship deadline because of attestation",
    ],
    keywords: [
      ["scholarship", "deadline", "before", "documents", "attested"],
      ["scholarship", "closes", "certificates", "ready"],
      ["apply", "scholarship", "unattested", "documents"],
    ],
    next: ["hst-deadline-close", "hst-scholarship-documents", "hst-deferring-intake"],
  },

  /* ── After the degree ───────────────────────────────────────────────────── */
  {
    id: "hst-degree-for-job",
    question: "I need my degree recognised for a job in the UAE",
    answer:
      "Employers and the labour authorities generally want the degree attested through the chain from the issuing country, and for many roles an equivalency as well. Which of the two applies depends on the role and the employer, so ask what they require before you start, and expect regulated professions to ask for more than unregulated ones.",
    service: SERVICE,
    phrases: [
      "i need my degree recognised for a job in the uae",
      "attesting my degree for employment in dubai",
      "does my employer need my degree attested",
      "degree attestation for a work permit in the uae",
    ],
    keywords: [
      ["degree", "recognised", "job", "uae"],
      ["attesting", "degree", "employment", "dubai"],
      ["degree", "attestation", "work", "permit", "uae"],
    ],
    next: ["hst-equivalency-need-it", "hst-degree-for-licence", "hst-equivalency-after-study"],
  },
  {
    id: "hst-degree-for-phd",
    question: "I want to go on to a PhD does my masters need anything more",
    answer:
      "A doctoral admission usually wants the masters certificate and transcripts through the same chain, and if the masters was earned abroad and the PhD is here, an equivalency is often expected too. Doctoral programmes also frequently want the thesis or research record, so ask the department what they need beyond the certificate.",
    service: SERVICE,
    phrases: [
      "i want to go on to a phd does my masters need anything more",
      "documents for a phd application in the uae",
      "attesting my masters for doctoral study",
      "using my masters degree to apply for a phd here",
    ],
    keywords: [
      ["phd", "masters", "need", "anything", "more"],
      ["documents", "phd", "application", "uae"],
      ["attesting", "masters", "doctoral", "study"],
    ],
    next: ["hst-equivalency-after-study", "hst-transcripts-separate", "hst-equivalency-partial"],
  },
  {
    id: "hst-degree-for-licence",
    question: "I need my qualification accepted by a professional licensing body",
    answer:
      "Licensing bodies — health, engineering, law, teaching, accountancy — set their own evidence rules and they are usually the strictest link in the chain, often requiring equivalency plus verification direct from the institution. Start with their published requirements rather than the general attestation route, because they frequently ask for something extra that has to be arranged from the beginning.",
    service: SERVICE,
    phrases: [
      "i need my qualification accepted by a professional licensing body",
      "degree requirements for a dha or moh licence",
      "getting my engineering degree accepted for licensing in dubai",
      "professional registration with my foreign qualification",
    ],
    keywords: [
      ["qualification", "accepted", "professional", "licensing", "body"],
      ["degree", "requirements", "licence"],
      ["professional", "registration", "foreign", "qualification"],
    ],
    next: ["hst-equivalency-need-it", "hst-degree-for-job", "hst-equivalency-after-study"],
  },
  {
    id: "hst-degree-for-golden-visa",
    question: "Does a long term residency application need my degree attested",
    answer:
      "Where a residency route is based on education or profession, the qualification usually has to be evidenced in attested form and sometimes with equivalency. The categories and their evidence rules are revised periodically, so take the current requirement from the authority handling the application rather than from a summary.",
    service: SERVICE,
    phrases: [
      "does a long term residency application need my degree attested",
      "attested degree for a golden visa application",
      "education documents for long term residence in the uae",
      "does my qualification need attesting for residency",
    ],
    keywords: [
      ["long", "term", "residency", "degree", "attested"],
      ["attested", "degree", "golden", "visa", "application"],
      ["education", "documents", "long", "term", "residence"],
    ],
    next: ["hst-degree-for-job", "hst-equivalency-need-it", "hst-hub-after"],
  },

  /* ── The rest of the doubts ─────────────────────────────────────────────── */
  {
    id: "hst-migration-certificate",
    question: "What is a migration certificate and do I need one",
    answer:
      "It is the issuing institution or board confirming you have left and are free to enrol elsewhere, and some universities ask for it at admission. Your previous institution issues it on request. Whether it needs attesting depends on the receiving university, and it is worth asking at the same time as you request it.",
    service: SERVICE,
    phrases: [
      "what is a migration certificate and do i need one",
      "migration certificate for my university admission",
      "do i need a migration certificate to join a new university",
      "how do i get a migration certificate from my college",
    ],
    keywords: [
      ["migration", "certificate", "need"],
      ["migration", "certificate", "university", "admission"],
      ["migration", "certificate", "college"],
    ],
    next: ["hst-leaving-certificate", "hst-bonafide-certificate", "hst-what-documents"],
  },
  {
    id: "hst-bonafide-certificate",
    question: "My university asked for a bonafide certificate",
    answer:
      "That is a letter from an institution confirming you are or were a genuine enrolled student there, with the dates and programme. Registries issue them routinely and usually quickly. It is a supporting document rather than a qualification, so it is often accepted as a stamped original without the full chain — but confirm that with whoever asked.",
    service: SERVICE,
    phrases: [
      "my university asked for a bonafide certificate",
      "what is a bonafide certificate for students",
      "getting a bonafide letter from my college",
      "student status letter for my application",
    ],
    keywords: [
      ["university", "asked", "bonafide", "certificate"],
      ["bonafide", "certificate", "students"],
      ["student", "status", "letter", "application"],
    ],
    next: ["hst-migration-certificate", "hst-school-attendance", "hst-what-documents"],
  },
  {
    id: "hst-character-certificate",
    question: "Do I need a character or conduct certificate from my school",
    answer:
      "Some universities and some visa routes ask for one, issued by the last institution you attended. It is distinct from a police clearance, which comes from an authority rather than a school, and applicants often supply one when the other was wanted. Check which of the two the wording means.",
    service: SERVICE,
    phrases: [
      "do i need a character or conduct certificate from my school",
      "character certificate for my university application",
      "conduct certificate from my college for admission",
      "is a character certificate the same as police clearance",
    ],
    keywords: [
      ["character", "conduct", "certificate", "school"],
      ["character", "certificate", "university", "application"],
      ["conduct", "certificate", "college", "admission"],
    ],
    next: ["hst-police-clearance", "hst-leaving-certificate", "hst-what-documents"],
  },
  {
    id: "hst-syllabus-copy",
    question: "An equivalency or credit transfer is asking for my syllabus",
    answer:
      "Course descriptions, credit hours and a syllabus are what an assessor uses to judge content rather than titles, and your institution's registry or department can issue them officially. An unofficial copy downloaded from a website is usually not accepted, so ask for the stamped version.",
    service: SERVICE,
    phrases: [
      "an equivalency or credit transfer is asking for my syllabus",
      "course syllabus for my credit transfer",
      "they want my course outline and credit hours",
      "syllabus copy for equivalency of my degree",
    ],
    keywords: [
      ["equivalency", "credit", "transfer", "syllabus"],
      ["course", "syllabus", "credit", "transfer"],
      ["course", "outline", "credit", "hours"],
    ],
    next: ["hst-equivalency-documents", "hst-equivalency-duration", "hst-degree-two-universities"],
  },
  {
    id: "hst-diploma-vs-degree",
    question: "I have a diploma rather than a degree does that change things",
    answer:
      "The document chain is the same, but how it is read is not — a diploma, an advanced diploma and a bachelor's are assessed differently for equivalency and for admission, and a diploma sometimes gives partial credit towards a degree rather than standing in its place. Ask the university how they treat your specific qualification before preparing anything.",
    service: SERVICE,
    phrases: [
      "i have a diploma rather than a degree does that change things",
      "attesting my diploma for a university application",
      "is my diploma accepted for a bachelors in dubai",
      "diploma equivalency in the uae",
    ],
    keywords: [
      ["diploma", "rather", "degree", "change"],
      ["attesting", "diploma", "university", "application"],
      ["diploma", "accepted", "bachelors", "dubai"],
      ["diploma", "equivalency", "uae"],
    ],
    next: ["hst-equivalency-partial", "hst-vocational-certificate", "hst-equivalency-what"],
  },
  {
    id: "hst-vocational-certificate",
    question: "Can a vocational or trade certificate be attested for study",
    answer:
      "Yes, through the authority that issued or oversees it, which for vocational awards is often a different body from the general education ministry. Which authority applies is the thing to establish first, because starting at the wrong one wastes the trip and tells you nothing about the right one.",
    service: SERVICE,
    phrases: [
      "can a vocational or trade certificate be attested for study",
      "attesting my technical certificate for a course",
      "trade qualification attestation in the uae",
      "is my vocational diploma recognised for further study",
    ],
    keywords: [
      ["vocational", "trade", "certificate", "attested", "study"],
      ["attesting", "technical", "certificate", "course"],
      ["trade", "qualification", "attestation", "uae"],
    ],
    next: ["hst-diploma-vs-degree", "hst-professional-certification", "hst-unrecognised-university"],
  },
  {
    id: "hst-professional-certification",
    question: "Do professional qualifications need attesting like a degree",
    answer:
      "It depends on who is asking and on what the award is. A professional body's certification is often verified directly with that body, which is stronger than a stamp, while a university-issued qualification goes through the document chain. Ask the receiving office which route they use for yours.",
    service: SERVICE,
    phrases: [
      "do professional qualifications need attesting like a degree",
      "attesting my professional certification for further study",
      "does my accountancy qualification need attestation",
      "chartered qualification for a masters application",
    ],
    keywords: [
      ["professional", "qualifications", "attesting", "degree"],
      ["attesting", "professional", "certification", "further", "study"],
      ["chartered", "qualification", "masters", "application"],
    ],
    next: ["hst-degree-for-licence", "hst-vocational-certificate", "hst-short-course"],
  },
  {
    id: "hst-short-course",
    question: "Does a short course or online certificate count for my application",
    answer:
      "For admission it is usually supporting evidence rather than a qualification, and most short-course certificates are not part of any attestation chain because no education authority issued them. Include them if they are relevant, but do not build your application on them or spend on certifying them before asking whether they are read at all.",
    service: SERVICE,
    phrases: [
      "does a short course or online certificate count for my application",
      "attesting an online course certificate",
      "do my coursera certificates matter for admission",
      "short course certificate for my university application",
    ],
    keywords: [
      ["short", "course", "online", "certificate", "count", "application"],
      ["attesting", "online", "course", "certificate"],
      ["short", "course", "certificate", "university", "application"],
    ],
    next: ["hst-professional-certification", "hst-what-documents", "hst-equivalency-online"],
  },
  {
    id: "hst-recommendation-letter",
    question: "Do recommendation letters need to be notarised",
    answer:
      "Almost never. Universities want references to come from the referee, often through their own portal or from an institutional email address, precisely so that you have not handled them. Notarising a reference you are carrying yourself can look worse rather than better — follow the university's stated route instead.",
    service: SERVICE,
    phrases: [
      "do recommendation letters need to be notarised",
      "does my reference letter need attesting",
      "notarising a letter of recommendation for university",
      "how should my professor send the reference",
    ],
    keywords: [
      ["recommendation", "letters", "notarised"],
      ["reference", "letter", "attesting"],
      ["notarising", "letter", "recommendation", "university"],
    ],
    next: ["hst-statement-of-purpose", "hst-what-documents", "hst-do-i-need-notary-or-not"],
  },
  {
    id: "hst-statement-of-purpose",
    question: "Does my statement of purpose need any certification",
    answer:
      "No — it is your own writing and universities want it unmediated. Nothing is gained by stamping it and a notarised personal statement raises a question rather than answering one. Spend the effort on the documents that genuinely need certifying.",
    service: SERVICE,
    phrases: [
      "does my statement of purpose need any certification",
      "should i notarise my personal statement",
      "does my sop need attestation",
      "certifying my motivation letter for university",
    ],
    keywords: [
      ["statement", "purpose", "need", "certification"],
      ["notarise", "personal", "statement"],
      ["certifying", "motivation", "letter", "university"],
    ],
    next: ["hst-recommendation-letter", "hst-cv-for-application", "hst-what-documents"],
  },
  {
    id: "hst-cv-for-application",
    question: "Does the CV I send with my application need stamping",
    answer:
      "No. A CV is a claim you are making and the university verifies the parts that matter through the documents behind it, so certifying the CV itself adds nothing. What is worth effort is making sure the dates and titles on it match the certificates you are submitting.",
    service: SERVICE,
    phrases: [
      "does the cv i send with my application need stamping",
      "should i attest my cv for my university application",
      "notarised resume for admission",
      "does my academic cv need certifying",
    ],
    keywords: [
      ["send", "application", "need", "stamping"],
      ["attest", "university", "application", "resume"],
      ["notarised", "resume", "admission"],
      ["academic", "need", "certifying"],
    ],
    next: ["hst-statement-of-purpose", "hst-internship-letter", "hst-what-documents"],
  },
  {
    id: "hst-internship-letter",
    question: "Should my internship or work experience letters be attested",
    answer:
      "For admission usually not — they are read as supporting evidence and verified by contact if at all. It changes where experience is a formal entry requirement or counts towards a licence, in which case the body assessing it will say what form it needs. Ask before certifying anything.",
    service: SERVICE,
    phrases: [
      "should my internship or work experience letters be attested",
      "attesting my experience certificate for a masters",
      "does my employment letter need notarising for university",
      "work experience proof for my application",
    ],
    keywords: [
      ["internship", "work", "experience", "letters", "attested"],
      ["attesting", "experience", "certificate", "masters"],
      ["work", "experience", "proof", "application"],
    ],
    next: ["hst-degree-for-licence", "hst-cv-for-application", "hst-what-documents"],
  },
  {
    id: "hst-portfolio",
    question: "My programme wants a portfolio does that need certifying",
    answer:
      "No — a portfolio is assessed on its content and submitted the way the programme specifies, usually digitally. Follow their format and file requirements exactly, since portfolio submissions are rejected far more often for being in the wrong format than for anything to do with certification.",
    service: SERVICE,
    phrases: [
      "my programme wants a portfolio does that need certifying",
      "does my design portfolio need attesting",
      "submitting a portfolio for my university application",
      "portfolio requirements for an art course application",
    ],
    keywords: [
      ["programme", "portfolio", "need", "certifying"],
      ["design", "portfolio", "attesting"],
      ["submitting", "portfolio", "university", "application"],
    ],
    next: ["hst-statement-of-purpose", "hst-what-documents", "hst-recommendation-letter"],
  },
  {
    id: "hst-two-passports",
    question: "I have two passports which one should my documents match",
    answer:
      "Pick the one you are applying and travelling on, and make every document consistent with it — the university, the visa authority and the offices in the chain all compare against the passport you present. Where an old certificate carries the other passport's name, bridge the two with a document rather than leaving it to be noticed.",
    service: SERVICE,
    phrases: [
      "i have two passports which one should my documents match",
      "dual nationality and my student documents",
      "my certificate has my old passport details",
      "which passport do i use for my university application",
    ],
    keywords: [
      ["two", "passports", "documents", "match"],
      ["dual", "nationality", "student", "documents"],
      ["certificate", "old", "passport", "details"],
    ],
    next: ["hst-name-mismatch", "hst-passport-expired", "hst-what-documents"],
  },
  {
    id: "hst-passport-expired",
    question: "My passport is about to expire in the middle of my course",
    answer:
      "Renew it before the visa and admission files are built on it, because a residency or student visa tied to a passport that expires shortly is a problem you will have to solve twice. If documents already carry the old number, keep the old passport as evidence of continuity.",
    service: SERVICE,
    phrases: [
      "my passport is about to expire in the middle of my course",
      "do i need to renew my passport before my student visa",
      "passport validity for a study visa application",
      "my passport expires during my degree",
    ],
    keywords: [
      ["passport", "expire", "middle", "course"],
      ["renew", "passport", "before", "student", "visa"],
      ["passport", "validity", "study", "visa", "application"],
    ],
    next: ["hst-two-passports", "hst-visa-documents", "hst-emirates-id"],
  },
  {
    id: "hst-emirates-id",
    question: "Do I need an Emirates ID for my student document work",
    answer:
      "For steps taken inside the UAE it is usually asked for alongside the passport if you hold one, and it comes with the residency rather than before it. If you are not yet resident, the passport is the identification the offices work from. Bring both wherever you have both.",
    service: SERVICE,
    phrases: [
      "do i need an emirates id for my student document work",
      "emirates id for notarising my university documents",
      "can i attest documents without an emirates id",
      "identification needed for my student paperwork in dubai",
    ],
    keywords: [
      ["emirates", "student", "document", "work"],
      ["emirates", "notarising", "university", "documents"],
      ["attest", "documents", "without", "emirates"],
    ],
    next: ["hst-appointment-bring", "hst-visa-documents", "hst-passport-expired"],
  },
  {
    id: "hst-attestation-vs-verification",
    question: "The university said they will verify my degree directly is attestation still needed",
    answer:
      "Sometimes not, and it is worth asking outright, because direct verification with the issuing institution is stronger evidence than a stamp and some universities rely on it alone. Where a government authority is also involved — a visa, an equivalency, a licence — they usually still want the attested document regardless of what the university does.",
    service: SERVICE,
    phrases: [
      "the university said they will verify my degree directly is attestation still needed",
      "my university is doing its own verification of my certificate",
      "does direct verification replace attestation",
      "they are checking with my college instead of asking for attestation",
    ],
    keywords: [
      ["university", "verify", "degree", "directly", "attestation", "needed"],
      ["direct", "verification", "replace", "attestation"],
      ["checking", "college", "instead", "attestation"],
    ],
    next: ["hst-university-verification-request", "hst-which-step", "hst-equivalency-before-or-after"],
  },
  {
    id: "hst-university-verification-request",
    question: "A university has written to my old college to verify my record",
    answer:
      "That is normal and you usually do not need to do anything except make sure your old institution can find you — give them your enrolment number and the years, and follow up if the verification stalls, since registries answer these in their own time. Do not send a certified copy in its place unless asked.",
    service: SERVICE,
    phrases: [
      "a university has written to my old college to verify my record",
      "my new university is contacting my previous college",
      "verification request sent to my institution",
      "my old university is not responding to the verification",
    ],
    keywords: [
      ["university", "written", "old", "college", "verify", "record"],
      ["new", "university", "contacting", "previous", "college"],
      ["verification", "request", "sent", "institution"],
    ],
    next: ["hst-attestation-vs-verification", "hst-university-closed", "hst-deadline-close"],
  },
  {
    id: "hst-fake-certificate-warning",
    question: "Someone offered to get me a certificate without studying",
    answer:
      "Do not go near it. A qualification that was not earned is detected at verification rather than at submission, and the consequence is not a rejected application — it is a fraud finding that follows you through every future application, visa and employment check in the region. There is no version of this that is a shortcut.",
    service: SERVICE,
    phrases: [
      "someone offered to get me a certificate without studying",
      "can i buy a degree certificate for my application",
      "is a fake degree detected in attestation",
      "an agent says he can arrange a degree for me",
    ],
    keywords: [
      ["offered", "certificate", "without", "studying"],
      ["buy", "degree", "certificate", "application"],
      ["fake", "degree", "detected", "attestation"],
    ],
    next: ["hst-unrecognised-university", "hst-who-to-trust", "hst-attestation-vs-verification"],
  },
  {
    id: "hst-who-to-trust",
    question: "How do I know which document agent to trust with my certificates",
    answer:
      "Ask for a licence, an itemised written scope naming every step and who performs it, and a receipt for any original they take. Be wary of a single fixed price covering government portions they do not control, and of anyone discouraging you from contacting the offices yourself. A provider confident in their work does not mind you checking.",
    service: SERVICE,
    phrases: [
      "how do i know which document agent to trust with my certificates",
      "how to choose an attestation service for my degree",
      "is my education consultant legitimate",
      "how do i avoid being cheated on my student documents",
    ],
    keywords: [
      ["know", "document", "agent", "trust", "certificates"],
      ["choose", "attestation", "service", "degree"],
      ["education", "consultant", "legitimate"],
      ["avoid", "cheated", "student", "documents"],
    ],
    next: ["hst-agent-problem", "hst-fake-certificate-warning", "hst-track-progress"],
  },
  {
    id: "hst-track-progress",
    question: "How do I know where my documents are in the process",
    answer:
      "Ask for the reference number each office issues and check on it yourself where the authority allows it, rather than relying on being told. Keep a photograph of every page and stamp as it happens — that record is what lets anyone pick the job up mid-way if you change provider or something goes missing.",
    service: SERVICE,
    phrases: [
      "how do i know where my documents are in the process",
      "can i track my certificate attestation",
      "how do i check the status of my education documents",
      "no update on my degree attestation",
    ],
    keywords: [
      ["know", "where", "documents", "process"],
      ["track", "certificate", "attestation"],
      ["check", "status", "education", "documents"],
    ],
    next: ["hst-agent-problem", "hst-who-to-trust", "hst-can-it-be-rushed"],
  },
  {
    id: "hst-documents-storage",
    question: "How should I keep my certificates once they are attested",
    answer:
      "Flat, unlaminated, in a folder rather than folded, with a scanned copy of every page and every stamp stored somewhere you can reach from another country. You are likely to need these documents again for a visa, a job or further study, and the scan is what saves you when an original is in an office's hands.",
    service: SERVICE,
    phrases: [
      "how should i keep my certificates once they are attested",
      "storing my attested education documents",
      "should i scan my attested degree",
      "looking after my original certificates after attestation",
    ],
    keywords: [
      ["keep", "certificates", "once", "attested"],
      ["storing", "attested", "education", "documents"],
      ["scan", "attested", "degree"],
    ],
    next: ["hst-laminated", "hst-how-long-valid", "hst-how-many-copies"],
  },
  {
    id: "hst-multiple-children",
    question: "I am doing this for two children at once",
    answer:
      "Handle each child's documents as a separate file with its own checklist, even where the steps look identical, because the commonest mistake is a document filed under the wrong sibling and discovered at the embassy. Where a parent's sponsorship documents serve both, prepare enough certified copies for each file to keep its own.",
    service: SERVICE,
    phrases: [
      "i am doing this for two children at once",
      "documents for both my kids applying to university",
      "my son and daughter are both applying abroad",
      "handling two students applications together",
    ],
    keywords: [
      ["doing", "two", "children", "once"],
      ["documents", "both", "kids", "applying", "university"],
      ["son", "daughter", "both", "applying", "abroad"],
    ],
    next: ["hst-how-many-copies", "hst-affidavit-financial", "hst-what-documents"],
  },
  {
    id: "hst-parent-asking-on-behalf",
    question: "I am a parent asking on behalf of my child",
    answer:
      "That is the usual case and nothing here changes for it, except that anything your child has to sign personally still needs them, and anything you undertake as sponsor needs you. Work from the university's list and note against each item whose signature it carries — that one column prevents most of the wasted appointments.",
    service: SERVICE,
    phrases: [
      "i am a parent asking on behalf of my child",
      "i am asking for my son who wants to study abroad",
      "my daughter is applying and i am handling the documents",
      "can i sort out my child education documents myself",
    ],
    keywords: [
      ["parent", "asking", "behalf", "child"],
      ["asking", "son", "study", "abroad"],
      ["daughter", "applying", "handling", "documents"],
    ],
    next: ["hst-affidavit-who-signs", "hst-minor-appointment", "hst-multiple-children"],
  },

  /* ── Money ──────────────────────────────────────────────────────────────────
   *
   * Every entry below carries `quote: true`, which is the whole point of them:
   * the reply is one honest sentence and then the higher-studies qualification,
   * ending at the callback form. No figure appears anywhere, because the total
   * genuinely depends on which documents, which countries and which receiving
   * authority — and because the government portions are set by those authorities.
   *
   * They are deliberately named for the service and for the student's own
   * subject, never as bare sentences. `matchByPhrase` compares whole questions
   * for equality before it compares anything for containment, and equality is
   * length-blind — so an entry called "Can I get a quote?" would claim that
   * phrasing across all four merged packs, and a visitor asking about a company
   * licence would be asked what they want to study. The question is also the chip
   * label, so naming it for the service reads better as well.
   * ─────────────────────────────────────────────────────────────────────────── */
  {
    id: "hst-cost-overall",
    question: "How much does it cost to get my education documents ready for university",
    answer:
      "There is no honest single figure, and anyone who gives you one before seeing your documents is guessing. It depends on how many documents you have, which country issued them, how many steps each one needs, whether translation and equivalency are involved, and which authority is receiving them — and a large part of it is government charges set by those authorities rather than by us. Let us take your actual list and come back to you with the real number.",
    service: SERVICE,
    phrases: [
      "how much does it cost to get my education documents ready for university",
      "what is the total cost of my student document work",
      "how much for the whole process for my study documents",
      "price for getting all my academic documents done",
      "how much",
      "what does it cost",
    ],
    keywords: [
      ...priceGroups("education", "documents"),
      ...priceGroups("student", "documents"),
      ...priceGroups("university", "documents"),
    ],
    opener: true,
    quote: true,
  },
  {
    id: "hst-cost-degree",
    question: "What does it cost to attest my degree certificate for a university application",
    answer:
      "It depends on where the degree was issued, which authorities are in its chain and whether a translation is needed, and the government portions of it are set by those authorities. Rather than quote you a figure that changes with your country of study, tell us about the degree and we will come back with what it actually involves and costs.",
    service: SERVICE,
    phrases: [
      "what does it cost to attest my degree certificate for a university application",
      "how much to attest my degree certificate",
      "degree attestation charges for higher studies",
      "fees for attesting my bachelors certificate",
    ],
    keywords: [
      ...priceGroups("degree", "attestation"),
      ...priceGroups("degree", "certificate", "attestation"),
      ...priceGroups("bachelors", "certificate"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-transcripts",
    question: "How much is it to get my transcripts and marksheets attested for study",
    answer:
      "Transcripts are usually charged per document rather than as one item, so the number turns on how many sheets you have and whether a consolidated record will be accepted in place of the individual ones. That is worth getting right before you pay for eight when three were needed — let us look at the set and come back to you.",
    service: SERVICE,
    phrases: [
      "how much is it to get my transcripts and marksheets attested for study",
      "cost of attesting my marksheets",
      "charges for transcript attestation for university",
      "how much for all my semester marksheets",
    ],
    keywords: [
      ...priceGroups("transcripts", "attested"),
      ...priceGroups("marksheets", "attested"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-equivalency",
    question: "What is the cost of getting equivalency for my degree in the UAE",
    answer:
      "The equivalency application carries its own charge set by the authority, separate from anything spent on attestation before it, and the documents it asks for can add to the total. Because it also depends on where you studied, the useful thing is a proper look at your case rather than a figure — let us do that and come back to you.",
    service: SERVICE,
    phrases: [
      "what is the cost of getting equivalency for my degree in the uae",
      "how much does equivalency cost",
      "equivalency fees for my qualification",
      "charges for ministry of education equivalency",
    ],
    keywords: [
      ...priceGroups("equivalency", "degree"),
      ...priceGroups("equivalency", "qualification"),
      ...priceGroups("equivalency", "uae"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-translation",
    question: "How much does a legal translation of my academic documents cost",
    answer:
      "Translation is normally priced by the document and its length, so a transcript full of grade tables is not the same job as a one-page certificate. Send us the list of what needs translating and into which language, and we will come back with the real figure instead of a range that will not match your case.",
    service: SERVICE,
    phrases: [
      "how much does a legal translation of my academic documents cost",
      "translation charges for my degree certificate",
      "price of translating my transcripts",
      "cost to translate my marksheet into arabic",
    ],
    keywords: [
      ...priceGroups("translating", "marksheets"),
      ...priceGroups("translation", "degree"),
      ...priceGroups("translating", "academic"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-affidavit",
    question: "What does a notarised affidavit for my university application cost",
    answer:
      "A notarial act carries a charge set by the notary and it can depend on the document and on whether a translation is attached. We do not perform the notarisation ourselves, so the sensible step is to tell us what the university asked for and let us come back with what the whole item involves.",
    service: SERVICE,
    phrases: [
      "what does a notarised affidavit for my university application cost",
      "how much to notarise my student undertaking",
      "charges for a notarised financial support letter",
      "cost of notarising my declaration for university",
    ],
    keywords: [
      ...priceGroups("notarised", "affidavit"),
      ...priceGroups("affidavit", "university"),
      ...priceGroups("notarising", "declaration"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-poa",
    question: "How much does a power of attorney for my study documents cost",
    answer:
      "It depends on the notary's charge, the drafting, whether it is bilingual and whether it is being made abroad and legalised for use here — the last of those is the expensive version. Tell us where you are signing and what the holder needs to do, and we will come back with the figure.",
    service: SERVICE,
    phrases: [
      "how much does a power of attorney for my study documents cost",
      "cost of a power of attorney to collect my certificate",
      "charges for an education power of attorney",
      "price of authorising someone for my university paperwork",
    ],
    keywords: [
      ...priceGroups("power", "attorney"),
      ...priceGroups("attorney", "study"),
      ...priceGroups("attorney", "certificate"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-visa",
    question: "What does the student visa paperwork cost",
    answer:
      "The visa charges themselves are set by the immigration authority and usually collected through the sponsoring institution, and the document work behind the file is separate from them. Since the split depends on who is sponsoring you, let us look at your case and come back with what falls where.",
    service: SERVICE,
    phrases: [
      "what does the student visa paperwork cost",
      "how much is a student visa for dubai",
      "student visa charges in the uae",
      "cost of a study visa application",
    ],
    keywords: [
      ...priceGroups("student", "visa"),
      ...priceGroups("study", "visa"),
      ...priceGroups("visa", "paperwork"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-school",
    question: "How much to get my school certificate ready for a university application",
    answer:
      "School-level documents have their own chain and their own charges, and whether an equivalency is needed on top changes the total noticeably. Tell us which board or school issued it and where you are applying, and we will come back with the actual figure.",
    service: SERVICE,
    phrases: [
      "how much to get my school certificate ready for a university application",
      "cost of attesting my grade twelve certificate",
      "school certificate attestation charges",
      "price for my board marksheet attestation",
    ],
    keywords: [
      ...priceGroups("school", "certificate", "attestation"),
      ...priceGroups("grade", "twelve", "certificate"),
      ...priceGroups("board", "marksheet", "attestation"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-per-document",
    question: "Is my student document work charged per document or as one job",
    answer:
      "Most of the chain is charged per document, because each office acts on each document separately — which is why the number of transcripts you prepare matters so much to the total. Let us count what you actually need and come back with the figure rather than a per-item guess.",
    service: SERVICE,
    phrases: [
      "is my student document work charged per document or as one job",
      "do you charge for each certificate separately",
      "is attestation priced per marksheet",
      "per document charges for my education papers",
    ],
    keywords: [
      ...priceGroups("per", "document"),
      ...priceGroups("each", "certificate"),
      ...priceGroups("per", "marksheet"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-package",
    question: "Is there a package price for a full set of student documents",
    answer:
      "A single all-in figure can be given once we know what the set is, and that is the honest order — a package quoted before anyone has seen your documents is either padded or has exclusions you find later. Tell us the list and we will come back with one number and what it covers.",
    service: SERVICE,
    phrases: [
      "is there a package price for a full set of student documents",
      "all inclusive price for my education documents",
      "do you have a bundle for student attestation",
      "one price for everything my university needs",
    ],
    keywords: [
      ...priceGroups("package", "student", "documents"),
      ...priceGroups("bundle", "attestation"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-government-share",
    question: "How much of this is government fees and how much is your fee",
    answer:
      "A fair question and the answer should always be itemised. The government and authority portions are fixed by them and we cannot change them; a service charge sits on top for the handling, checking and running around. Let us send you the breakdown for your specific documents so you can see both halves.",
    service: SERVICE,
    phrases: [
      "how much of this is government fees and how much is your fee",
      "what part of the cost is government charges for my documents",
      "breakdown of attestation charges for my degree",
      "your service fee versus the ministry fee",
    ],
    // Written out rather than built with `priceGroups`: here the price word is
    // itself part of the subject, and the generator would produce
    // ["fees","government","fees"] — a group asking for one word twice.
    keywords: [
      ["government", "fees"],
      ["ministry", "charges"],
      ["service", "charge", "breakdown"],
      ["much", "government", "portion"],
      ["cost", "government", "share"],
      ["breakdown", "attestation", "charges"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-cheapest",
    question: "What is the cheapest way to get my study documents attested",
    answer:
      "The cheapest route is genuinely the one with no rejected steps in it, because a document sent back costs the whole step again plus the time. Beyond that, the savings are in not certifying documents nobody asked for and not making more copies than you need. Let us go through your list and cut it to what is actually required.",
    service: SERVICE,
    phrases: [
      "what is the cheapest way to get my study documents attested",
      "cheaper option for my education document work",
      "how do i save money on my certificate attestation",
      "is there a low cost way to do my student paperwork",
    ],
    keywords: [
      ["cheapest", "study", "documents", "attested"],
      ["cheaper", "option", "education", "document"],
      ["save", "money", "certificate", "attestation"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-afford",
    question: "I am a student and cannot really afford much what are my options",
    answer:
      "Then the first thing worth doing is cutting the list to what the university and the authority genuinely require, which is often smaller than the list a student arrives with. Some steps can also be sequenced so you pay as your application progresses rather than all at once. Tell us your situation and we will be straight with you about what is unavoidable and what is not.",
    service: SERVICE,
    phrases: [
      "i am a student and cannot really afford much what are my options",
      "i cannot afford the attestation charges",
      "my budget is very tight for my education documents",
      "is there any help for students who cannot pay",
    ],
    keywords: [
      ["student", "cannot", "afford", "options"],
      ["cannot", "afford", "attestation", "charges"],
      ["budget", "tight", "education", "documents"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-why-expensive",
    question: "Why is getting my certificates ready for university so expensive",
    answer:
      "Because it is several separate authorities each charging for their own act, multiplied by the number of documents — not one service with one price. That also means the total is largely outside anyone's control, and the part a provider influences is avoiding wasted steps. Let us show you the itemisation for your documents so you can see where it actually goes.",
    service: SERVICE,
    phrases: [
      "why is getting my certificates ready for university so expensive",
      "why does attestation of my degree cost so much",
      "this seems very expensive for a few stamps",
      "why are education document charges so high",
    ],
    keywords: [
      ["certificates", "ready", "university", "expensive"],
      ["attestation", "degree", "cost", "much"],
      ["education", "document", "charges", "high"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-instalments",
    question: "Can I pay for my student document work in instalments",
    answer:
      "Payment terms are something to agree with a person rather than read off a page, and they also depend on which steps are being paid to an authority up front. Tell us what you need done and we will come back on how it can be staged.",
    service: SERVICE,
    phrases: [
      "can i pay for my student document work in instalments",
      "is part payment possible for my education documents",
      "can i pay in stages for my attestation",
      "do you accept instalments for student paperwork",
    ],
    keywords: [
      ...priceGroups("instalments", "documents"),
      ...priceGroups("part", "payment", "documents"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-refund",
    question: "Do I get my money back if my education document is rejected",
    answer:
      "An authority's own charge for an act it has performed is generally not returned, which is exactly why the checking beforehand matters more than any refund promise. What a provider owes you in that situation is something to agree in writing before you start. Let us set that out for your case rather than leave it implied.",
    service: SERVICE,
    phrases: [
      "do i get my money back if my education document is rejected",
      "is there a refund if my certificate attestation fails",
      "what happens to my payment if the university rejects it",
      "do i lose the fee if my equivalency is refused",
    ],
    keywords: [
      ...priceGroups("refund", "attestation"),
      ...priceGroups("money", "back", "rejected"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-quote",
    question: "Can I get a quote for getting my study documents done",
    answer:
      "Yes, and a real one rather than a range. We need to know which documents you have, which country issued them, which university or authority is receiving them and whether translation or equivalency is in play. A couple of questions and we will come back to you with it.",
    service: SERVICE,
    phrases: [
      "can i get a quote for getting my study documents done",
      "please send me a quotation for my education documents",
      "i want a quote for my degree attestation",
      "can you quote me for my student paperwork",
    ],
    keywords: [
      ["quote", "study", "documents", "done"],
      ["quotation", "education", "documents"],
      ["quote", "degree", "attestation"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-no-fixed-price",
    question: "Why can nobody give me a fixed price for my education documents",
    answer:
      "Because a large part of the total is other people's charges, applied per document and varying by the country that issued it — so a fixed price quoted blind is either padded to cover the worst case or carries exclusions. A firm figure is perfectly possible once someone has seen your documents, and that is the quick part. Let us do that.",
    service: SERVICE,
    phrases: [
      "why can nobody give me a fixed price for my education documents",
      "i just want an exact amount for my certificate work",
      "why does everyone give me a range instead of a price",
      "nobody tells me the final amount for my degree attestation",
    ],
    keywords: [
      ["nobody", "fixed", "price", "education", "documents"],
      ["exact", "amount", "certificate", "work"],
      ["final", "amount", "degree", "attestation"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-extra-copies",
    question: "What does an extra attested copy of my certificate cost",
    answer:
      "Additional copies are usually charged per copy, and they are far cheaper produced while the document is already in the chain than arranged again later. That is a decision worth making with the whole application in view, so tell us how many places will hold your file and we will come back with the figure.",
    service: SERVICE,
    phrases: [
      "what does an extra attested copy of my certificate cost",
      "cost of additional attested copies of my degree",
      "how much for a second attested transcript",
      "charges for extra certified copies for university",
    ],
    keywords: [
      ...priceGroups("extra", "attested", "copy"),
      ...priceGroups("additional", "attested", "copies"),
      ...priceGroups("extra", "certified", "copies"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-urgent",
    question: "Does it cost more to rush my documents before an intake deadline",
    answer:
      "Where an authority offers an expedited service it charges for it, and where it does not, no fee makes it faster. So an urgent job costs more only for the steps that genuinely can be expedited. Tell us your deadline and we will come back on what is possible and what it adds.",
    service: SERVICE,
    phrases: [
      "does it cost more to rush my documents before an intake deadline",
      "urgent attestation charges for my degree",
      "how much extra for express processing of my certificates",
      "price for fast track student document work",
    ],
    keywords: [
      ...priceGroups("urgent", "attestation"),
      ...priceGroups("express", "processing"),
      ...priceGroups("fast", "track", "documents"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-two-countries",
    question: "My documents come from two different countries what does that cost",
    answer:
      "Two countries means two chains, each with its own authorities and charges, so it is closer to two jobs than one with a surcharge. The good news is they can usually run in parallel. Tell us which countries and which documents and we will come back with the combined figure.",
    service: SERVICE,
    phrases: [
      "my documents come from two different countries what does that cost",
      "cost when my school and degree are from different countries",
      "charges for documents from more than one country",
      "i studied in two countries how much is the attestation",
    ],
    keywords: [
      ...priceGroups("two", "countries", "attestation"),
      ...priceGroups("different", "countries", "documents"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-parents-total",
    question: "My parents want to know the total before I start anything",
    answer:
      "That is the right instinct and they should have a written itemisation, not a verbal estimate — government portions, service charge, and what is excluded. We can put that together once we know your documents and destination. Let us take those details and send them something they can actually check.",
    service: SERVICE,
    phrases: [
      "my parents want to know the total before i start anything",
      "my father wants the full amount in writing",
      "my family needs to know the complete cost first",
      "i have to tell my parents the total before we begin",
    ],
    keywords: [
      ["parents", "know", "total", "before", "start"],
      ["father", "wants", "full", "amount", "writing"],
      ["family", "needs", "complete", "cost", "first"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-hidden",
    question: "Are there hidden charges in student document work",
    answer:
      "There should not be, and the way to make sure is an itemised scope in writing naming every step, who performs it, and what is not included — couriers, translations, extra copies and embassy charges are the usual omissions. Ask us for it in that form and hold any provider to the same standard.",
    service: SERVICE,
    phrases: [
      "are there hidden charges in student document work",
      "will there be extra costs later for my certificates",
      "any surprise charges in education document work",
      "what is not included in the price for my degree",
    ],
    // Same reason as the entry above: "charges" and "costs" are price words.
    keywords: [
      ["hidden", "charges"],
      ["surprise", "charges"],
      ["extra", "costs", "later"],
      ["much", "hidden", "charges"],
      ["included", "price", "degree"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-compare",
    question: "Another agent quoted me less for my certificate attestation",
    answer:
      "Then compare the two scopes rather than the two numbers, because the difference is almost always in what is included: which steps, how many documents, translation, couriers, and whether the government portions are inside or outside the figure. Send us what you were quoted and we will tell you plainly what it does and does not cover.",
    service: SERVICE,
    phrases: [
      "another agent quoted me less for my certificate attestation",
      "someone else is doing my degree attestation for less",
      "i got a cheaper quote from another company for my documents",
      "why are you more expensive than the other agency",
    ],
    keywords: [
      ["another", "agent", "quoted", "less", "certificate", "attestation"],
      ["someone", "else", "degree", "attestation", "less"],
      ["cheaper", "quote", "another", "company", "documents"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-casual",
    question: "Roughly how much are we talking for all this",
    answer:
      "Fair question, and a rough number would be a made-up one — it swings a long way depending on your documents, your country of study and how many copies you need. Two minutes of details and we will call you back with a real figure instead of a guess.",
    service: SERVICE,
    phrases: [
      "roughly how much are we talking for all this",
      "bro how much for all this",
      "any idea what this is going to cost me",
      "how much is this going to set me back",
      "just give me a rough figure",
    ],
    keywords: [
      ["roughly", "much", "talking"],
      ["idea", "going", "cost", "me"],
      ["going", "set", "me", "back"],
      ["rough", "figure"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-diy",
    question: "Is it worth paying someone or should I do my student paperwork myself",
    answer:
      "Plenty of people do it themselves and it works, particularly if you are in the right country and have the time to queue and to be turned away once. What you are paying for is the sequencing and the checking that stops a rejection, which is where the real money goes. We will tell you honestly which parts of your case are straightforward enough to handle alone.",
    service: SERVICE,
    phrases: [
      "is it worth paying someone or should i do my student paperwork myself",
      "can i do my degree attestation myself and save money",
      "should i handle my education documents on my own",
      "is it better to do the attestation myself",
    ],
    keywords: [
      ["worth", "paying", "someone", "student", "paperwork", "myself"],
      ["degree", "attestation", "myself", "save", "money"],
      ["handle", "education", "documents", "own"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-abroad-vs-here",
    question: "Is it cheaper to get my degree attested in my home country or in Dubai",
    answer:
      "Different parts of the chain happen in each place, so it is not really a choice between them — the country of issue does its steps and the UAE does its own. Where there is a genuine decision is who handles the part abroad, and that does affect the total. Tell us the country and we will come back with both routes and what each involves.",
    service: SERVICE,
    phrases: [
      "is it cheaper to get my degree attested in my home country or in dubai",
      "should i do the attestation back home to save money",
      "cost difference between attesting in india and dubai",
      "cheaper to attest my certificate before i travel",
    ],
    keywords: [
      ["cheaper", "degree", "attested", "home", "country", "dubai"],
      ["attestation", "back", "home", "save", "money"],
      ["cost", "difference", "attesting", "dubai"],
    ],
    quote: true,
  },
  {
    id: "hst-cost-scholarship",
    question: "What does the paperwork for a scholarship application cost",
    answer:
      "It depends on which documents the panel wants certified and whether any of them are coming from abroad, and it is usually a smaller job than a full admission file. Tell us the scholarship's document list and we will come back with the figure — worth doing before the deadline rather than after.",
    service: SERVICE,
    phrases: [
      "what does the paperwork for a scholarship application cost",
      "cost of certified documents for a scholarship",
      "how much for my scholarship document work",
      "charges for notarising scholarship papers",
    ],
    keywords: [
      ...priceGroups("scholarship", "documents"),
      ...priceGroups("scholarship", "papers"),
    ],
    quote: true,
  },
  {
    id: "hst-cost-loan",
    question: "How much for the certified documents my education loan needs",
    answer:
      "Lenders' lists are usually short but specific, and the cost turns on whether the income and asset documents are local or coming from another country. Send us what the lender asked for and we will come back with the figure and the order to do them in.",
    service: SERVICE,
    phrases: [
      "how much for the certified documents my education loan needs",
      "cost of notarised papers for my student loan",
      "charges for my education loan documentation",
      "how much to prepare documents for a study loan",
    ],
    keywords: [
      ...priceGroups("education", "loan", "documents"),
      ...priceGroups("student", "loan", "papers"),
    ],
    quote: true,
  },

  /* ── Asking for a person ────────────────────────────────────────────────────
   *
   * `quote` is the mechanism for "walk into the qualification and end at the
   * callback form", which is exactly what someone asking for a human wants. Used
   * here for that rather than inventing a second field that would do the same
   * thing — the reply is honest about why it is asking the questions.
   * ─────────────────────────────────────────────────────────────────────────── */
  {
    id: "hst-talk-to-someone",
    question: "Can I speak to someone about my university documents",
    answer:
      "Yes. A couple of quick questions so that whoever calls you already knows your case, and then we will come back to you.",
    service: SERVICE,
    phrases: [
      "can i speak to someone about my university documents",
      "i want to talk to a person about my study documents",
      "can someone call me about my education paperwork",
      "put me through to a human about my certificates",
      "i need to discuss my case with someone",
    ],
    keywords: [
      ["speak", "someone", "university", "documents"],
      ["talk", "person", "study", "documents"],
      ["someone", "call", "education", "paperwork"],
    ],
    quote: true,
  },
  {
    id: "hst-callback-request",
    question: "Please call me back about my study documents",
    answer:
      "Of course. Two or three details so the call is useful rather than a repeat of this conversation, and then we will get back to you.",
    service: SERVICE,
    phrases: [
      "please call me back about my study documents",
      "call me on my number about my university application",
      "request a callback about my certificates",
      "arrange a call about my education documents",
    ],
    keywords: [
      ["call", "back", "study", "documents"],
      ["request", "callback", "certificates"],
      ["arrange", "call", "education", "documents"],
    ],
    quote: true,
  },
  {
    id: "hst-can-you-handle-everything",
    question: "Can you handle my whole university document process for me",
    answer:
      "We work out exactly what your documents need, check each one before it goes anywhere, and connect you with the licensed providers who perform each step — we do not issue the stamps ourselves, and nobody who tells you otherwise does either. Let us take your details and come back with what the whole thing looks like for your case.",
    service: SERVICE,
    phrases: [
      "can you handle my whole university document process for me",
      "will you take care of all my education documents",
      "can you do everything for my student application",
      "do you handle the full attestation for students",
    ],
    keywords: [
      ["handle", "whole", "university", "document", "process"],
      ["take", "care", "all", "education", "documents"],
      ["everything", "student", "application"],
      ["handle", "full", "attestation", "students"],
    ],
    quote: true,
  },
];
