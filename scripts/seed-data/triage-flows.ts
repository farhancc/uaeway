/**
 * "I don't know which of these I need."
 *
 * The eight content packs beside this one each answer a subject well, and all
 * of them assume the visitor has already worked out which subject they are in.
 * A large share of people have not. They have a document and a deadline, and
 * the words attestation, legalisation, translation, notarisation and apostille
 * mean roughly one thing to them — which is why the most expensive question on
 * this site is not "how do I attest a degree" but "do I need to?".
 *
 * That question used to reach the model, in prose, at a cost, and get a hedged
 * answer. This pack answers it from written content and then gets out of the
 * way: a reply here names the step the visitor actually needs and stops, and
 * their next message — "how do I attest my degree" — misses this pack, falls
 * back out to the main flow, and is answered by the pack that owns it. That
 * bounce is free and is the whole design.
 *
 * WHY IT IS A SUBJECT PACK AND NOT A FEW ENTRIES IN THE MAIN FLOW
 *
 * It would fit: the merged flow has about 124 nodes spare. But a comparison
 * pack is *all* confusable phrasings — "what is the difference between X and
 * Y" for every pair of six services — and dropped into the merged graph each
 * one competes with the pack that owns X and the pack that owns Y. Out here
 * the competition is three doors, which is testable in a way that 1,600
 * intents are not. See [[subject-packs-on-demand]] in the schema's `subject`
 * node for the mechanism.
 *
 * THE RULE THAT SHAPES EVERY ENTRY
 *
 * A triage answer names the step and names who performs it, and never
 * performs it. We work out what a case needs — that part is genuinely ours and
 * is the reason this pack exists — and attestation, legalisation, translation,
 * notarisation and visa filing are carried out by licensed providers we
 * introduce people to. An answer here that blurred the two would be the most
 * damaging kind on the site, because it is the one a confused person is most
 * likely to act on.
 *
 * And no answer here states a fee, a processing time or an eligibility rule.
 * Triage is about *which* step, never *how much* or *how long*; the money
 * questions belong to the pack that owns the step, and the three in this file
 * carry `quote: true` so they end at a person instead.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";
import { landDoorPhrases } from "./doors";
import { ORDER_PHRASES, WHICH_PHRASES } from "./uae-life-doors";

const ATTEST = "attestation";
const TRANSLATE = "legal-translation";
const NOTARY = "notary";
const VISA = "visa-processing";
const BIZ = "business-setup";
const STUDY = "higher-studies";

/**
 * A price word plus one noun.
 *
 * One noun, not two or three: inside a subject document there is no other
 * pack to out-length, and a longer group only costs reach — the lesson
 * `scripts/seed-data/own-work-flows.ts` records at length.
 */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

export const TRIAGE_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "pick-hub-start",
    question: "I do not know which of these services I need.",
    answer:
      "That is the normal starting point and it is worth five minutes to get right, because doing these in the wrong order is what costs people weeks. It usually comes down to two things: what the document is, and who is going to receive it. Which would you rather start from?",
    service: ATTEST,
    phrases: [
      "i do not know which of these services i need",
      "i am confused about what i need",
      "which service should i choose",
      "can you tell me what my case needs",
      "i have no idea where to start",
    ],
    keywords: [["which", "need"], ["confused", "about"]],
    faq: false,
    choices: [
      { label: "What the words mean", to: "pick-hub-words" },
      { label: "Start from my document", to: "pick-hub-document" },
      { label: "Start from what it is for", to: "pick-hub-purpose" },
      { label: "What order things go in", to: "pick-order-general" },
    ],
    next: ["pick-hub-words", "pick-hub-document", "pick-hub-purpose"],
  },
  {
    id: "pick-hub-words",
    question: "What is the difference between all these terms?",
    answer:
      "Five words get used as if they were one, and they are five separate things done by different bodies in a fixed order. Attestation proves a document is genuine. Legalisation is the UAE's half of that. Translation makes it readable to the authority. Notarisation witnesses a signature. An apostille is a shortcut that does not apply here. Which pair is tripping you up?",
    service: ATTEST,
    phrases: [
      "what is the difference between all these terms",
      "explain attestation legalisation and notarisation",
      "these words all sound the same to me",
      "glossary of document terms",
    ],
    keywords: [["difference", "terms"], ["words", "same"]],
    faq: false,
    choices: [
      { label: "Attestation vs translation", to: "pick-attest-vs-translate" },
      { label: "Attestation vs notarisation", to: "pick-attest-vs-notary" },
      { label: "Attestation vs legalisation", to: "pick-attest-vs-legalise" },
      { label: "What about an apostille", to: "pick-apostille" },
    ],
    next: ["pick-attest-vs-translate", "pick-attest-vs-notary", "pick-apostille"],
  },
  {
    id: "pick-hub-document",
    question: "Can you tell me what my document needs?",
    answer:
      "Usually yes, from two facts: what it is and which country issued it. A degree from India and a marriage certificate from the UK take different routes even when they are both going to the same desk in Dubai. Which document is in front of you?",
    service: ATTEST,
    phrases: [
      "can you tell me what my document needs",
      "what does my certificate need doing to it",
      "i have a document but do not know the next step",
    ],
    keywords: [["document", "needs"], ["certificate", "next"]],
    faq: false,
    choices: [
      { label: "A degree or transcript", to: "pick-doc-degree" },
      { label: "Marriage or birth certificate", to: "pick-doc-civil" },
      { label: "A company document", to: "pick-doc-company" },
      { label: "A power of attorney", to: "pick-doc-poa" },
      { label: "Something else", to: "pick-doc-other" },
    ],
    next: ["pick-doc-degree", "pick-doc-civil", "pick-doc-other"],
  },
  {
    id: "pick-hub-purpose",
    question: "I know what I am trying to do, not what it is called.",
    answer:
      "That is the better end to start from, honestly — the purpose decides the route, and the document follows. Tell me what you are trying to achieve and I will tell you which steps it takes.",
    service: ATTEST,
    phrases: [
      "i know what i am trying to do not what it is called",
      "i just want to get a job here what do i need",
      "tell me the steps for what i am trying to achieve",
    ],
    keywords: [["trying", "achieve"], ["what", "called"]],
    faq: false,
    choices: [
      { label: "Start a job here", to: "pick-goal-job" },
      { label: "Bring my family", to: "pick-goal-family" },
      { label: "Study here or abroad", to: "pick-goal-study" },
      { label: "Set up a company", to: "pick-goal-company" },
      { label: "Use a UAE document abroad", to: "pick-goal-outbound" },
    ],
    next: ["pick-goal-job", "pick-goal-family", "pick-goal-company"],
  },
  {
    id: "pick-hub-who",
    question: "Who actually does all this — you or someone else?",
    answer:
      "We work out what your case needs, and that part is genuinely ours. The regulated acts are not: attestation, legalisation, legal translation, notarisation and visa filing are carried out by licensed providers and government bodies, and we introduce you to the right one. Two things we do build ourselves are CVs and websites.",
    service: ATTEST,
    phrases: [
      "who actually does all this you or someone else",
      "do you do the attestation yourselves",
      "are you a licensed agent",
      "are you a typing centre",
    ],
    keywords: [["who", "does"], ["licensed", "agent"]],
    faq: false,
    next: ["pick-who-why-not", "pick-who-value", "pick-hub-start"],
  },

  /* ── What the words actually mean ──────────────────────────────────────── */
  {
    id: "pick-attest-vs-translate",
    question: "What is the difference between attestation and translation?",
    answer:
      "They answer two different doubts and most files need both. Attestation proves the document is genuine — a chain of stamps ending at a UAE authority. Translation makes it readable, in Arabic, by a translator licensed by the Ministry of Justice. A perfectly translated document that is not attested is still refused, and the reverse is just as true.",
    service: ATTEST,
    phrases: [
      "what is the difference between attestation and translation",
      "is translating the same as attesting",
      "do i need both attestation and translation",
      "attested or translated which one",
    ],
    keywords: [["difference", "attestation", "translation"], ["both", "attested", "translated"]],
    next: ["pick-order-general", "pick-attest-vs-notary", "pick-doc-degree"],
  },
  {
    id: "pick-attest-vs-notary",
    question: "What is the difference between attestation and notarisation?",
    answer:
      "Attestation is about a document that already exists — proving the certificate in your hand is real. Notarisation is about an act you are performing now: signing something in front of a notary who witnesses that it was you. A degree gets attested. A power of attorney gets notarised. Neither can stand in for the other.",
    service: NOTARY,
    phrases: [
      "what is the difference between attestation and notarisation",
      "is a notary the same as attestation",
      "do i need a notary or an attestation",
      "notarised or attested",
    ],
    keywords: [["difference", "attestation", "notarisation"], ["notary", "or", "attestation"]],
    next: ["pick-doc-poa", "pick-attest-vs-translate", "pick-hub-document"],
  },
  {
    id: "pick-attest-vs-legalise",
    question: "Is legalisation different from attestation?",
    answer:
      "In practice they are two halves of one chain and people use the words interchangeably. The document is attested in the country that issued it, then legalised by the UAE embassy there, then attested again by the Ministry of Foreign Affairs here. If someone tells you a document is \"attested\" without saying where that chain stopped, ask.",
    service: ATTEST,
    phrases: [
      "is legalisation different from attestation",
      "what does legalised mean",
      "embassy legalisation versus attestation",
      "mofa attestation meaning",
    ],
    keywords: [["legalisation", "different"], ["legalised", "means"]],
    next: ["pick-order-general", "pick-attest-vs-translate", "pick-half-done"],
  },
  {
    id: "pick-apostille",
    question: "I have an apostille. Is that enough for the UAE?",
    answer:
      "No, and this is the single most common misunderstanding on this subject. The UAE is not party to the Apostille Convention, so an apostille on a foreign document does not substitute for the embassy and Ministry of Foreign Affairs chain — and no UAE authority issues apostilles on UAE documents either. The apostille you already have is not wasted work, but it is not the finish line.",
    service: ATTEST,
    phrases: [
      "i have an apostille is that enough for the uae",
      "does the uae accept apostilles",
      "can i get an apostille on my uae document",
      "apostille convention uae",
    ],
    keywords: [["apostille", "enough"], ["accept", "apostille"]],
    next: ["pick-attest-vs-legalise", "pick-goal-outbound", "pick-order-general"],
  },
  {
    id: "pick-certified-vs-legal",
    question: "What makes a translation \"legal\" rather than just accurate?",
    answer:
      "Who produced it. A UAE authority accepts a translation from a translator licensed by the Ministry of Justice, stamped and signed; it does not accept one from a fluent friend, a translation app or an unlicensed office, however accurate it is. Accuracy is necessary and is not what is being checked at the counter.",
    service: TRANSLATE,
    phrases: [
      "what makes a translation legal rather than just accurate",
      "difference between certified and legal translation",
      "can my friend translate my document",
      "is a translation app enough",
    ],
    keywords: [["certified", "legal", "translation"], ["friend", "translate"]],
    next: ["pick-attest-vs-translate", "pick-doc-degree", "pick-hub-document"],
  },
  {
    id: "pick-typing-centre",
    question: "What is a typing centre, and is that what I need?",
    answer:
      "A typing centre prepares and submits government applications on your behalf — visa forms, Emirates ID, licence paperwork. It is not an attestation service and not a translator, though some sit next door to both. If your problem is a form, a typing centre is the right building; if it is a certificate, it is not.",
    service: VISA,
    phrases: [
      "what is a typing centre and is that what i need",
      "should i go to a typing centre",
      "amer centre or tasheel",
    ],
    keywords: [["typing", "centre"], ["amer", "tasheel"]],
    next: ["pick-hub-who", "pick-goal-job", "pick-hub-purpose"],
  },
  {
    id: "pick-pro-service",
    question: "People keep telling me to use a PRO. What is that?",
    answer:
      "A public relations officer handles a company's government paperwork — visas, labour files, licence renewals. If you are employed, your employer's PRO does most of this for you and you should ask them before paying anyone. A PRO works for a company, not for an individual walking in off the street.",
    service: VISA,
    phrases: [
      "people keep telling me to use a pro what is that",
      "what does a pro do in the uae",
      "do i need a pro service",
    ],
    keywords: [["what", "pro"], ["pro", "service"]],
    next: ["pick-typing-centre", "pick-hub-who", "pick-goal-job"],
  },

  /* ── Start from the document ───────────────────────────────────────────── */
  {
    id: "pick-doc-degree",
    question: "I have a degree certificate. What does it need?",
    answer:
      "Almost always attestation starting in the country that issued it, then the UAE embassy there, then the Ministry of Foreign Affairs here — and an Arabic translation where the receiving body asks for one. If it is going to a university rather than an employer, equivalency may sit on top of that. Who is going to receive it?",
    service: ATTEST,
    phrases: [
      "i have a degree certificate what does it need",
      "what do i do with my degree for the uae",
      "steps for a university certificate",
      "my diploma needs processing",
    ],
    keywords: [["degree", "certificate", "needs"], ["diploma", "processing"]],
    next: ["pick-goal-job", "pick-goal-study", "pick-order-general"],
  },
  {
    id: "pick-doc-civil",
    question: "I have a marriage or birth certificate. What does it need?",
    answer:
      "The same chain as a degree — attested at home, legalised at the UAE mission, then the Ministry of Foreign Affairs here — plus an Arabic translation, which these almost always need because they are read for names and dates. They are usually wanted for family sponsorship, so the deadline is the visa application rather than the certificate itself.",
    service: ATTEST,
    phrases: [
      "i have a marriage or birth certificate what does it need",
      "what do i do with my marriage certificate",
      "birth certificate for family visa",
    ],
    keywords: [["marriage", "certificate", "needs"], ["birth", "certificate", "needs"]],
    next: ["pick-goal-family", "pick-attest-vs-translate", "pick-order-general"],
  },
  {
    id: "pick-doc-company",
    question: "I have company documents. What do they need?",
    answer:
      "It depends whether they are coming in or going out. Foreign incorporation papers being used to set up here need the full attestation chain and translation; UAE documents going abroad need Ministry of Foreign Affairs attestation and then the destination country's embassy. Which direction are yours going?",
    service: BIZ,
    phrases: [
      "i have company documents what do they need",
      "what does my trade licence need for use abroad",
      "incorporation documents for the uae",
      "board resolution attestation",
    ],
    keywords: [["company", "documents", "need"], ["incorporation", "documents"]],
    next: ["pick-goal-company", "pick-goal-outbound", "pick-doc-poa"],
  },
  {
    id: "pick-doc-poa",
    question: "I need a power of attorney. Which service is that?",
    answer:
      "Notarisation, not attestation — you are signing something now rather than proving something old. In Dubai that means a notary appointment, usually with an Arabic or bilingual text, and the person granting it has to attend. If it is being signed abroad for use here, it takes the attestation chain on top.",
    service: NOTARY,
    phrases: [
      "i need a power of attorney which service is that",
      "poa for the uae",
      "who makes a power of attorney",
      "do i need a notary for a poa",
    ],
    keywords: [["power", "attorney"], ["poa", "uae"]],
    next: ["pick-attest-vs-notary", "pick-doc-signed-abroad", "pick-hub-document"],
  },
  {
    id: "pick-doc-signed-abroad",
    question: "The document has to be signed in another country. Does that change things?",
    answer:
      "Yes, and it adds steps rather than removing them: it is notarised where it is signed, then attested there, then legalised at the UAE mission, then attested by the Ministry of Foreign Affairs here. Each link has to exist and they have to be in that order, which is why a document posted over unstamped cannot be fixed at this end.",
    service: NOTARY,
    phrases: [
      "the document has to be signed in another country does that change things",
      "my father will sign it back home",
      "signing a poa overseas for use in dubai",
    ],
    keywords: [["signed", "another", "country"], ["sign", "back", "home"]],
    next: ["pick-doc-poa", "pick-order-general", "pick-half-done"],
  },
  {
    id: "pick-doc-police",
    question: "I need a police clearance certificate. Where does that fit?",
    answer:
      "It is a document like any other: obtained from the issuing country's police, then attested through the same chain if a UAE body is going to rely on it. The thing that catches people is validity — these are often only accepted within a short window of issue, so getting it too early is its own mistake.",
    service: ATTEST,
    phrases: [
      "i need a police clearance certificate where does that fit",
      "good conduct certificate for the uae",
      "pcc attestation",
    ],
    keywords: [["police", "clearance"], ["good", "conduct"]],
    next: ["pick-doc-degree", "pick-order-general", "pick-goal-job"],
  },
  {
    id: "pick-doc-medical",
    question: "What about medical or vaccination records?",
    answer:
      "Those usually travel as clinical records rather than as legal documents and are not attested — the UAE medical fitness test is its own process here and does not read your home-country file. Where a record is being used for something official, such as a school admission or an insurance claim, ask the receiving body what form they want it in before paying for anything.",
    service: VISA,
    phrases: [
      "what about medical or vaccination records",
      "do i need to attest my medical reports",
      "vaccination certificate for school here",
    ],
    keywords: [["medical", "records"], ["vaccination", "records"]],
    next: ["pick-doc-other", "pick-hub-document"],
  },
  {
    id: "pick-doc-school",
    question: "My child's school records — what do those need?",
    answer:
      "A transfer certificate from the previous school, attested in the country it was issued in, is the usual requirement, and the school here will tell you exactly which form of it they accept. Ask them first: requirements differ by curriculum and by emirate, and a school's own list beats any general rule, including this one.",
    service: ATTEST,
    phrases: [
      "my child's school records what do those need",
      "transfer certificate for a school in dubai",
      "school documents for admission here",
    ],
    keywords: [["school", "records"], ["transfer", "certificate"]],
    next: ["pick-goal-family", "pick-doc-degree", "pick-hub-document"],
  },
  {
    id: "pick-doc-other",
    question: "My document is not on your list.",
    answer:
      "Tell us what it is and who is going to receive it, and we will work out the route. The two facts decide almost everything, and guessing from the document's name alone is how people pay for a step their case never needed.",
    service: ATTEST,
    phrases: [
      "my document is not on your list",
      "i have an unusual document",
      "what about other certificates",
    ],
    keywords: [["not", "on", "list"], ["unusual", "document"]],
    next: ["pick-hub-purpose", "pick-us-check", "pick-hub-document"],
  },

  /* ── Start from what you are trying to do ──────────────────────────────── */
  {
    id: "pick-goal-job",
    question: "I am starting a job here. What do I actually need done?",
    answer:
      "Your employer handles the work permit and the residence visa. What is yours to sort is the certificates behind them — degree and experience documents attested in the country that issued them, and translated where asked. That is the part that holds people up, and it is the part that can be started before you arrive.",
    service: ATTEST,
    phrases: [
      "i am starting a job here what do i actually need done",
      "what paperwork do i need for a new job in dubai",
      "employer asked for attested documents",
    ],
    keywords: [["starting", "job", "need"], ["paperwork", "new", "job"]],
    next: ["pick-doc-degree", "pick-order-general", "pick-us-check"],
  },
  {
    id: "pick-goal-family",
    question: "I want to bring my family. Which services does that touch?",
    answer:
      "Two: the documents and the application. Marriage and birth certificates need attesting and translating, and the sponsorship application itself is a visa matter with its own conditions about salary and housing. The documents take the longest, so they are what to start on.",
    service: VISA,
    phrases: [
      "i want to bring my family which services does that touch",
      "what do i need to sponsor my wife",
      "family visa document list",
    ],
    keywords: [["bring", "family", "services"], ["sponsor", "wife"]],
    next: ["pick-doc-civil", "pick-order-general", "pick-us-check"],
  },
  {
    id: "pick-goal-study",
    question: "I am applying to study. What is different about that?",
    answer:
      "An extra step on top of the usual chain: equivalency, where the Ministry of Education assesses a foreign qualification against the UAE's. Universities also work to intake deadlines, so the sequence is driven by their calendar rather than by how long each stamp takes.",
    service: STUDY,
    phrases: [
      "i am applying to study what is different about that",
      "what do i need for a university application here",
      "equivalency for my degree",
    ],
    keywords: [["applying", "study"], ["equivalency", "degree"]],
    next: ["pick-doc-degree", "pick-order-general", "pick-us-check"],
  },
  {
    id: "pick-goal-company",
    question: "I want to set up a company. Which of these do I need?",
    answer:
      "Fewer documents than most people expect, and the first decision is not a document at all — mainland or free zone determines who you can invoice and what the licence covers. Attestation and notarisation come in for shareholder and incorporation papers once that is settled.",
    service: BIZ,
    phrases: [
      "i want to set up a company which of these do i need",
      "documents to open a business in dubai",
      "what paperwork for a trade licence",
    ],
    keywords: [["set", "up", "company"], ["documents", "business"]],
    next: ["pick-doc-company", "pick-doc-poa", "pick-us-check"],
  },
  {
    id: "pick-goal-outbound",
    question: "I need to use a UAE document in another country.",
    answer:
      "The chain runs the other way: attested by the Ministry of Foreign Affairs here, then legalised by that country's embassy in the UAE, then often translated into their language rather than Arabic. And if the destination is an Apostille country, it still does not take an apostille from here — the UAE does not issue them.",
    service: ATTEST,
    phrases: [
      "i need to use a uae document in another country",
      "sending my uae marriage certificate abroad",
      "attesting a uae document for overseas",
    ],
    keywords: [["uae", "document", "abroad"], ["document", "another", "country"]],
    next: ["pick-apostille", "pick-doc-company", "pick-order-general"],
  },
  {
    id: "pick-goal-court",
    question: "A court or the police has asked for something.",
    answer:
      "Anything going before a UAE court or prosecutor needs to be in Arabic, by a translator licensed by the Ministry of Justice, and the standard is stricter than for an employer's file. Do not act on a general answer here: ask the court or your lawyer exactly what they require, because a rejected filing can cost a hearing date.",
    service: TRANSLATE,
    phrases: [
      "a court or the police has asked for something",
      "documents for a court case in dubai",
      "legal translation for a police report",
    ],
    keywords: [["court", "asked"], ["police", "report", "translation"]],
    next: ["pick-certified-vs-legal", "pick-us-check", "pick-hub-document"],
  },
  {
    id: "pick-goal-licence",
    question: "I need to register with a professional body.",
    answer:
      "Those bodies set their own list and it is usually stricter than an employer's — DHA, DOH or MOHAP for healthcare, the Society of Engineers for engineering, the relevant education authority for teaching. Get the list from them first, because they decide what they will accept and we do not.",
    service: ATTEST,
    phrases: [
      "i need to register with a professional body",
      "documents for dha licensing",
      "what does the engineering society need",
    ],
    keywords: [["professional", "body"], ["licensing", "documents"]],
    next: ["pick-doc-degree", "pick-goal-job", "pick-us-check"],
  },

  /* ── Order, and getting it wrong ───────────────────────────────────────── */
  {
    id: "pick-order-general",
    question: "What order do these steps go in?",
    answer:
      "Country of issue first, always: the document is attested where it was born, then legalised at the UAE mission there, then attested by the Ministry of Foreign Affairs here, then translated. Translation last is the part people get backwards — translate too early and the stamps added afterwards are not in the translation.",
    service: ATTEST,
    phrases: [
      "what order do these steps go in",
      "which comes first attestation or translation",
      "sequence of attestation steps",
      "do i translate before or after attesting",
    ],
    keywords: [["order", "steps"], ["which", "comes", "first"], ["translate", "before"]],
    next: ["pick-order-wrong", "pick-attest-vs-translate", "pick-half-done"],
  },
  {
    id: "pick-order-wrong",
    question: "I did them in the wrong order. How bad is that?",
    answer:
      "Usually recoverable and usually at the cost of redoing one step rather than all of them. The common one is translating before the final stamps, which means a fresh translation of the completed document. Tell us what has been done and we will work out what is still good.",
    service: ATTEST,
    phrases: [
      "i did them in the wrong order how bad is that",
      "i translated it too early",
      "do i have to start again",
    ],
    keywords: [["wrong", "order"], ["translated", "too", "early"], ["start", "again"]],
    next: ["pick-half-done", "pick-order-general", "pick-us-check"],
  },
  {
    id: "pick-half-done",
    question: "Someone already did part of this for me. What is left?",
    answer:
      "Hard to say without seeing where the chain stopped, which is exactly the question worth asking. Look at the back of the document: the last stamp tells you which link you reached. Send us what you have and we will tell you what remains rather than restarting anything already paid for.",
    service: ATTEST,
    phrases: [
      "someone already did part of this for me what is left",
      "my document has some stamps already",
      "how do i know which steps are done",
    ],
    keywords: [["already", "part", "done"], ["some", "stamps"]],
    next: ["pick-us-check", "pick-order-general", "pick-attest-vs-legalise"],
  },
  {
    id: "pick-both-at-once",
    question: "Can the steps be done in parallel to save time?",
    answer:
      "Some can. Documents from different countries move independently, so three certificates can be in three chains at once. What cannot be parallelised is one document's own chain — each stamp is the precondition for the next, and no provider can change that.",
    service: ATTEST,
    phrases: [
      "can the steps be done in parallel to save time",
      "can you do everything at the same time",
      "fastest way to get it all done",
    ],
    keywords: [["parallel", "time"], ["same", "time"]],
    next: ["pick-order-general", "pick-us-check", "pick-urgent"],
  },
  {
    id: "pick-urgent",
    question: "I am in a hurry. Which step should I start today?",
    answer:
      "Whichever one happens in another country, because that is the link you have least control over and the one that cannot be hurried from here. Everything that happens in the UAE can be arranged while that is in motion.",
    service: ATTEST,
    phrases: [
      "i am in a hurry which step should i start today",
      "what should i do first if i am short on time",
      "my deadline is close",
    ],
    keywords: [["in", "hurry"], ["short", "time"], ["deadline", "close"]],
    next: ["pick-both-at-once", "pick-us-check", "pick-order-general"],
  },
  {
    id: "pick-nothing-needed",
    question: "Is there a chance I do not need any of this?",
    answer:
      "A real one, and it is worth checking before you spend anything. Plenty of people are sent here by a rumour rather than by a requirement — an employer who asks for \"attested documents\" out of habit, or a form that turns out to accept a plain copy. Ask the body that will receive it what they actually require, in writing.",
    service: ATTEST,
    phrases: [
      "is there a chance i do not need any of this",
      "maybe i do not need attestation at all",
      "can i avoid all this paperwork",
    ],
    keywords: [["not", "need", "any"], ["avoid", "paperwork"]],
    next: ["pick-us-check", "pick-hub-purpose", "pick-who-value"],
  },

  /* ── Who does what, and what we are for ────────────────────────────────── */
  {
    id: "pick-who-why-not",
    question: "Why do you not do the attestation yourselves?",
    answer:
      "Because it is a regulated act carried out by government bodies and licensed providers, and claiming otherwise would be a false claim about this company. What is not regulated is working out which steps a case needs and making sure they happen in the right order — and that is the part people most often get wrong on their own.",
    service: ATTEST,
    phrases: [
      "why do you not do the attestation yourselves",
      "why do you refer me to someone else",
      "are you just a middleman",
    ],
    keywords: [["why", "not", "yourselves"], ["just", "middleman"]],
    next: ["pick-who-value", "pick-hub-who", "pick-us-check"],
  },
  {
    id: "pick-who-value",
    question: "What do I get from you that I could not do myself?",
    answer:
      "Nothing you could not do with enough time — and we will tell you when that is the right answer. What we are for is the cases where the route is not obvious, where a step is about to be done in the wrong order, or where someone has been quoted for work their file does not need.",
    service: ATTEST,
    phrases: [
      "what do i get from you that i could not do myself",
      "can i just do this myself",
      "why should i use you at all",
    ],
    keywords: [["do", "myself"], ["why", "use", "you"]],
    next: ["pick-nothing-needed", "pick-us-check", "pick-who-why-not"],
  },
  {
    id: "pick-us-check",
    question: "Can someone just look at my case and tell me what it needs?",
    answer:
      "Yes, and it is the thing worth doing before anything is paid for. Tell us what the document is, which country issued it and who is going to receive it, and someone will come back with the actual route rather than a general one.",
    service: ATTEST,
    phrases: [
      "can someone just look at my case and tell me what it needs",
      "i want someone to check my situation",
      "can i speak to a person about this",
      "review my documents and advise",
    ],
    keywords: [["look", "my", "case"], ["speak", "person"]],
    next: ["pick-hub-document", "pick-hub-purpose"],
  },
  {
    id: "pick-us-scam",
    question: "How do I know a provider is genuine?",
    answer:
      "Ask what their licence covers and check it, insist on the government fee and the service fee being shown separately, and be wary of anyone promising a result or a timescale that no authority has given them. Nobody can guarantee an approval, and the ones who say they can are the ones to walk away from.",
    service: ATTEST,
    phrases: [
      "how do i know a provider is genuine",
      "i think i am being overcharged for attestation",
      "is this agent a scam",
      "someone promised guaranteed approval",
    ],
    keywords: [["provider", "genuine"], ["agent", "scam"], ["guaranteed", "approval"]],
    next: ["pick-who-value", "pick-us-check", "pick-money-overall"],
  },

  /* ── Money: named for the step, never answered in prose ────────────────── */
  {
    id: "pick-money-overall",
    question: "What is all of this going to cost me in total?",
    answer:
      "It depends on how many documents there are, which countries issued them and which steps your case actually needs — and a figure given before those are known is a guess that someone later has to walk back. Tell us what you are holding and someone will come back with a real number, government fees shown separately from anything we charge.",
    service: ATTEST,
    quote: true,
    phrases: [
      "what is all of this going to cost me in total",
      "how much for the whole process",
      "total cost of getting my documents ready",
      "give me an estimate for everything",
      "how much am i looking at altogether",
      "what would the whole thing set me back",
    ],
    keywords: [...priceGroups("total"), ...priceGroups("everything")],
  },
  {
    id: "pick-money-which-cheaper",
    question: "Which of these steps could I skip to save money?",
    answer:
      "The honest answer is that skipping a required step costs more than it saves, because the file comes back and the clock restarts. What genuinely saves money is finding out that a step was never required — which is a question about your case rather than about the price list, and worth having someone answer properly.",
    service: ATTEST,
    quote: true,
    phrases: [
      "which of these steps could i skip to save money",
      "what is the cheapest way to do all this",
      "can i do a cheaper version",
    ],
    keywords: priceGroups("skip"),
  },
  {
    id: "pick-money-government",
    question: "How much of the cost is government fees?",
    answer:
      "A large share of it, and it is the part nobody controls — the ministries and embassies set their own charges and change them without notice. We show that separately from anything we charge precisely so you can see which is which. The split for your case comes from a person, not from a chat window.",
    service: ATTEST,
    quote: true,
    phrases: [
      "how much of the cost is government fees",
      "are the ministry charges included",
      "what part of the price is yours",
    ],
    keywords: priceGroups("government"),
  },

  /* ── The pairs people confuse that are not about attestation ───────────── */
  {
    id: "pick-translate-vs-interpret",
    question: "What is the difference between translation and interpretation?",
    answer:
      "Translation is a document; interpretation is a person in the room. A court hearing, a notary appointment or a police statement needs someone speaking, and that is booked for a time and a place rather than delivered as a file. People book the wrong one when the requirement says only \"translator\".",
    service: TRANSLATE,
    phrases: [
      "what is the difference between translation and interpretation",
      "do i need an interpreter or a translator",
      "someone to translate at my appointment",
    ],
    keywords: [["difference", "translation", "interpretation"], ["interpreter", "or", "translator"]],
    next: ["pick-goal-court", "pick-certified-vs-legal", "pick-hub-words"],
  },
  {
    id: "pick-equivalency-vs-attestation",
    question: "Is equivalency the same as attestation?",
    answer:
      "No, and they stack. Attestation proves your certificate is genuine; equivalency is the Ministry of Education deciding what it is worth against a UAE qualification. The second normally requires the first to be finished, so the order matters and the two bodies are different.",
    service: STUDY,
    phrases: [
      "is equivalency the same as attestation",
      "difference between equivalency and attestation",
      "do i need equivalency as well",
    ],
    keywords: [["equivalency", "same", "attestation"], ["need", "equivalency"]],
    next: ["pick-goal-study", "pick-doc-degree", "pick-order-general"],
  },
  {
    id: "pick-notary-vs-lawyer",
    question: "Do I need a notary or a lawyer?",
    answer:
      "A notary witnesses that you signed something and that you understood it; they do not advise you on whether signing is a good idea. If what you need is someone to tell you what a document means for you, that is a lawyer, and we are not one and cannot stand in for one.",
    service: NOTARY,
    phrases: [
      "do i need a notary or a lawyer",
      "can a notary give me legal advice",
      "difference between a notary and a lawyer",
    ],
    keywords: [["notary", "or", "lawyer"], ["notary", "advice"]],
    next: ["pick-attest-vs-notary", "pick-doc-poa", "pick-hub-who"],
  },
  {
    id: "pick-original-or-copy",
    question: "Do they need the original document or will a copy do?",
    answer:
      "Attestation is performed on the original, and that is the answer that surprises people most — a stamped photocopy is not an attested document, whatever the person offering it says. What a receiving body accepts afterwards may well be a copy of the attested original, which is a different question and one to ask them.",
    service: ATTEST,
    phrases: [
      "do they need the original document or will a copy do",
      "can i send a photocopy instead",
      "do i have to post my original certificate",
    ],
    keywords: [["original", "or", "copy"], ["send", "photocopy"]],
    next: ["pick-us-scam", "pick-doc-degree", "pick-hub-document"],
  },
  {
    id: "pick-third-language",
    question: "My document is in neither English nor Arabic.",
    answer:
      "Then it needs translating into Arabic by a translator licensed by the Ministry of Justice, the same as an English one would — the source language does not change the requirement, only who can do the work. Rarer language pairs take longer to arrange, which is worth knowing early rather than late.",
    service: TRANSLATE,
    phrases: [
      "my document is in neither english nor arabic",
      "my certificate is in russian",
      "translating from a rare language",
    ],
    keywords: [["neither", "english", "arabic"], ["rare", "language"]],
    next: ["pick-certified-vs-legal", "pick-attest-vs-translate", "pick-hub-document"],
  },
  {
    id: "pick-name-mismatch",
    question: "The name on my certificate is not exactly the name on my passport.",
    answer:
      "Deal with that before anything else, because every later step copies the name forward and a mismatch discovered at the end means redoing the chain. Depending on the difference it is either a correction at the issuing body or an affidavit declaring the two names are one person — which is a notarisation.",
    service: NOTARY,
    phrases: [
      "the name on my certificate is not exactly the name on my passport",
      "spelling difference between my documents",
      "my surname is written differently",
    ],
    keywords: [["name", "mismatch"], ["spelling", "difference"]],
    next: ["pick-doc-poa", "pick-order-general", "pick-us-check"],
  },
  {
    id: "pick-which-emirate",
    question: "Does it matter which emirate I do this in?",
    answer:
      "For the federal steps, no — Ministry of Foreign Affairs attestation is federal. For notarisation and for anything a local authority receives, yes: the rules, the appointment system and sometimes the accepted wording differ by emirate. Tell us where the document is going and we will say which counter it belongs at.",
    service: NOTARY,
    phrases: [
      "does it matter which emirate i do this in",
      "can i do it in sharjah instead of dubai",
      "is the process the same in abu dhabi",
    ],
    keywords: [["which", "emirate"], ["same", "abu", "dhabi"]],
    next: ["pick-doc-poa", "pick-us-check", "pick-order-general"],
  },
  {
    id: "pick-from-abroad",
    question: "Can any of this be done while I am outside the UAE?",
    answer:
      "The first half has to be — attestation and legalisation happen in the country that issued the document, so being there is an advantage rather than an obstacle. The UAE-side steps can be handled for you. Starting before you fly is the single best use of the time.",
    service: ATTEST,
    phrases: [
      "can any of this be done while i am outside the uae",
      "i am not in the country yet can i start",
      "doing the paperwork from my home country",
    ],
    keywords: [["outside", "uae", "done"], ["not", "country", "yet"]],
    next: ["pick-goal-job", "pick-urgent", "pick-us-check"],
  },
  {
    id: "pick-conflicting-advice",
    question: "My employer says one thing and the website says another.",
    answer:
      "Go with whoever will actually receive the document, and get it from them in writing. Requirements differ by employer, by authority and by emirate, and a general answer — including everything on this site — loses to the specific list from the desk your file lands on.",
    service: ATTEST,
    phrases: [
      "my employer says one thing and the website says another",
      "i am getting conflicting advice",
      "who should i believe about what i need",
    ],
    keywords: [["conflicting", "advice"], ["employer", "says", "another"]],
    next: ["pick-us-check", "pick-nothing-needed", "pick-hub-purpose"],
  },

  /* ── More documents ────────────────────────────────────────────────────── */
  {
    id: "pick-doc-experience",
    question: "What about an experience or employment letter?",
    answer:
      "Treated like any other certificate when a UAE body is going to rely on it: attested in the country that issued it. The practical difficulty is different though — former employers abroad are often slow or unwilling, so start asking for the letter long before you need it stamped.",
    service: ATTEST,
    phrases: [
      "what about an experience or employment letter",
      "does my experience certificate need attesting",
      "employment letter from my old company",
    ],
    keywords: [["experience", "letter"], ["employment", "certificate"]],
    next: ["pick-goal-job", "pick-doc-degree", "pick-order-general"],
  },
  {
    id: "pick-doc-bank",
    question: "A bank statement or salary certificate — does that need anything?",
    answer:
      "Usually not attestation: those are current records and the body asking for one normally wants it issued recently and directly, sometimes stamped by the bank or employer. Ask what form they want before paying for a process it does not need.",
    service: ATTEST,
    phrases: [
      "a bank statement or salary certificate does that need anything",
      "do i need to attest my bank statement",
      "salary certificate requirements",
    ],
    keywords: [["bank", "statement"], ["salary", "certificate"]],
    next: ["pick-nothing-needed", "pick-doc-other", "pick-us-check"],
  },
  {
    id: "pick-doc-divorce",
    question: "A divorce or death certificate — which route is that?",
    answer:
      "The same chain as any other civil document, attested where it was issued and translated into Arabic. These usually arrive attached to something urgent and personal — a sponsorship that has to change, an estate to settle — so it is worth getting the receiving body's exact list before starting.",
    service: ATTEST,
    phrases: [
      "a divorce or death certificate which route is that",
      "attesting a death certificate",
      "divorce decree for the uae",
    ],
    keywords: [["divorce", "certificate"], ["death", "certificate"]],
    next: ["pick-doc-civil", "pick-goal-family", "pick-us-check"],
  },
  {
    id: "pick-doc-contract",
    question: "A contract or agreement between two parties.",
    answer:
      "That is notarisation territory rather than attestation — a notary witnesses the signing — and where it will be read by a UAE authority or court it needs to be in Arabic. Whether the wording itself protects you is a legal question and not one for us.",
    service: NOTARY,
    phrases: [
      "a contract or agreement between two parties",
      "do i need to notarise an agreement",
      "memorandum of understanding notarisation",
    ],
    keywords: [["contract", "agreement"], ["notarise", "agreement"]],
    next: ["pick-notary-vs-lawyer", "pick-doc-poa", "pick-goal-company"],
  },
  {
    id: "pick-doc-driving",
    question: "My driving licence — does that go through any of this?",
    answer:
      "No. Exchanging a foreign licence is an RTA matter with its own rules about which countries qualify, and it does not run through the attestation chain. Some cases need a translation of the licence, which the RTA will tell you about.",
    service: TRANSLATE,
    phrases: [
      "my driving licence does that go through any of this",
      "do i need to attest my driving licence",
      "licence translation for the rta",
    ],
    keywords: [["driving", "licence"], ["licence", "translation"]],
    next: ["pick-nothing-needed", "pick-doc-other", "pick-hub-document"],
  },
  {
    id: "pick-doc-trademark",
    question: "Trade mark or intellectual property papers.",
    answer:
      "Filing is its own process with the Ministry of Economy, and the supporting documents — powers of attorney, company papers from abroad — take the usual notarisation and attestation routes. The filing itself is not something we do; the documents behind it are the part we can scope.",
    service: BIZ,
    phrases: [
      "trade mark or intellectual property papers",
      "documents for registering a trademark",
      "ip filing paperwork",
    ],
    keywords: [["trade", "mark"], ["intellectual", "property"]],
    next: ["pick-doc-company", "pick-goal-company", "pick-doc-poa"],
  },
  {
    id: "pick-doc-affidavit",
    question: "Someone has asked me for an affidavit. What is that?",
    answer:
      "A statement you swear is true, signed in front of a notary — so it is notarisation, and it is created rather than proved. Common ones here are declaring two spellings of a name are the same person, or confirming a relationship where a certificate is missing.",
    service: NOTARY,
    phrases: [
      "someone has asked me for an affidavit what is that",
      "what is a sworn declaration",
      "undertaking letter notarised",
    ],
    keywords: [["what", "affidavit"], ["sworn", "declaration"]],
    next: ["pick-name-mismatch", "pick-doc-poa", "pick-attest-vs-notary"],
  },

  /* ── More goals ────────────────────────────────────────────────────────── */
  {
    id: "pick-goal-bank",
    question: "The bank has asked for documents. Which of these is that?",
    answer:
      "Normally none of them. A bank wants current identity and income records — Emirates ID, visa, salary letter, sometimes a tenancy contract — not attested certificates. If a bank is asking for an attested document it is usually for a corporate account, which is a different list.",
    service: BIZ,
    phrases: [
      "the bank has asked for documents which of these is that",
      "what documents does a uae bank need",
      "opening a corporate account paperwork",
    ],
    keywords: [["bank", "asked", "documents"], ["corporate", "account"]],
    next: ["pick-doc-bank", "pick-goal-company", "pick-nothing-needed"],
  },
  {
    id: "pick-goal-marry",
    question: "We want to get married here. What does that involve?",
    answer:
      "Documents from both sides, attested and translated, and a procedure that depends on the parties' nationalities and religions — some marriages go through the courts, others through an embassy or a civil registry. Get the list from the body that will conduct it, because the variation between routes is wider than on anything else here.",
    service: ATTEST,
    phrases: [
      "we want to get married here what does that involve",
      "marriage procedure in the uae documents",
      "getting married in dubai paperwork",
    ],
    keywords: [["get", "married"], ["marriage", "procedure"]],
    next: ["pick-doc-civil", "pick-goal-family", "pick-us-check"],
  },
  {
    id: "pick-goal-change-job",
    question: "I am moving to a new employer here. Do I redo everything?",
    answer:
      "Usually not the attestation — a certificate attested once stays attested, and a new employer generally wants the same documents you already hold. What changes is the labour and visa side, which is the new employer's process rather than a document one.",
    service: VISA,
    phrases: [
      "i am moving to a new employer here do i redo everything",
      "do i need to attest my degree again for a new job",
      "changing jobs document requirements",
    ],
    keywords: [["new", "employer", "redo"], ["attest", "again"]],
    next: ["pick-goal-job", "pick-nothing-needed", "pick-us-check"],
  },
  {
    id: "pick-goal-freelance",
    question: "I want to work for myself. Which of these applies?",
    answer:
      "A permit and a licence rather than a stack of certificates — though the body issuing it may want your qualifications attested, particularly for a regulated activity. The first question is which free zone or authority, because that decides the document list.",
    service: BIZ,
    phrases: [
      "i want to work for myself which of these applies",
      "freelance permit documents",
      "going self employed in the uae",
    ],
    keywords: [["work", "for", "myself"], ["freelance", "permit"]],
    next: ["pick-goal-company", "pick-doc-degree", "pick-us-check"],
  },
  {
    id: "pick-goal-embassy",
    question: "My own country's embassy has asked for something.",
    answer:
      "Embassies set their own requirements and they are frequently the reverse of the UAE's — a document attested here by the Ministry of Foreign Affairs, then presented to them. Ask them for the list in writing; we can then tell you which of those steps we can arrange.",
    service: ATTEST,
    phrases: [
      "my own country's embassy has asked for something",
      "consulate wants an attested document",
      "what does my embassy need",
    ],
    keywords: [["embassy", "asked"], ["consulate", "wants"]],
    next: ["pick-goal-outbound", "pick-us-check", "pick-order-general"],
  },
];

/* ── Catching what the doors let in ─────────────────────────────────────── */

/** See `./doors.ts`. Most of these are already a specific entry's own
 *  phrasing — this pack is comparisons, so the door and the answers speak the
 *  same words — and those are deliberately left where they are. */
landDoorPhrases(TRIAGE_FLOWS, "pick-hub-start", WHICH_PHRASES);
landDoorPhrases(TRIAGE_FLOWS, "pick-order-general", ORDER_PHRASES);
