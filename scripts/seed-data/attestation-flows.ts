/**
 * What people actually ask about attestation and notarisation in Dubai.
 *
 * The seed for the chat flow that answers them. Edit here and re-run
 * `scripts/seed-authored-flows.ts`; the flow is rebuilt from this file, so this
 * is the place a wrong sentence gets fixed.
 *
 * Attestation is this module. Dubai notarisation is ./notarisation.ts and
 * business setup is ./business-setup-flows.ts; all three are concatenated and
 * built as one graph, so ids must not collide — this file owns `att-`, `doc-`,
 * `cty-`, `use-`, `price-` and `meta-`, and links into `not-` by agreement.
 *
 * Three rules hold across every entry, and they are the reason the content is
 * reviewable:
 *
 *   No figures. Government fees differ by country, document and authority and
 *   are revised without notice, so nothing here quotes one. A question about
 *   money sets `quote`, which sends the person to a callback instead.
 *
 *   No promises about outcomes. Attestation and notarisation are decisions
 *   made by authorities and notaries, not by us, and a chatbot that guarantees
 *   either is the fastest way to lose someone's trust and their document.
 *
 *   No claim to do the work. These are regulated activities carried out by
 *   licensed providers we introduce people to — `delivery: "referred"` in
 *   lib/services.ts — and the replies say so wherever it matters.
 *
 * One fact worth stating plainly, because it is the single most common
 * misunderstanding and a lot of published advice has it backwards: **the UAE
 * is not a party to the Hague Apostille Convention.** An apostille on its own
 * does not make a foreign document usable here — the UAE embassy and MoFAIC
 * steps still follow. Checked against the HCCH status table for Convention 12.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

// Notarisation answers, including its money questions, live in ./notarisation.ts
// — so no entry here carries `service: "notary"`. What this module does do is
// link into that one, which is why `not-` ids appear in `next` and `choices`.
const ATTESTATION = "attestation";
const TRANSLATION = "legal-translation";

export const ATTESTATION_FLOWS: AuthoredFlow[] = [
  /* ── Attestation: what it is and how it works ──────────────────────────── */
  {
    id: "att-what-is",
    question: "What is certificate attestation?",
    answer:
      "Attestation is the chain of stamps that proves a document issued outside the UAE is genuine. Each authority in the chain confirms the signature or seal of the one before it, and the last stamp — from the UAE Ministry of Foreign Affairs — is what makes the document usable here.\n\nIt is not a translation and it is not a notarisation. It says nothing about what the document means, only that it is real.",
    service: ATTESTATION,
    opener: true,
    phrases: [
      "what is attestation",
      "what does attestation mean",
      "explain attestation",
      "what is certificate attestation",
      "what is document attestation",
      "attestation meaning",
      "i dont understand attestation",
      "what is legalisation of documents",
    ],
    keywords: [["attestation", "meaning"]],
    next: ["att-chain", "att-why-needed", "att-who-does-it"],
  },
  {
    id: "att-why-needed",
    question: "Why does the UAE need my certificate attested?",
    answer:
      "Because a UAE authority has no way to tell a real degree from a printed one issued five thousand kilometres away. The chain of stamps is how that gets verified, and it is why every step has to be present — a missing one means nobody downstream can rely on the stamp before it.\n\nWork permits, family visas, school admissions and professional licences all ask for it for the same reason.",
    service: ATTESTATION,
    phrases: [
      "why do i need attestation",
      "why is attestation required",
      "why does uae need attestation",
      "is attestation mandatory",
      "can i skip attestation",
      "do i really need my degree attested",
    ],
    keywords: [["attestation", "mandatory"], ["skip", "attestation"]],
    next: ["use-work-permit", "use-family-visa-spouse", "att-what-is"],
  },
  {
    id: "att-chain",
    question: "What are the steps in the attestation chain?",
    answer:
      "For a document issued abroad the usual order is:\n\n1. The authority that issued it, or a notary in that country, confirms it is genuine\n2. That country's foreign ministry attests it\n3. The UAE embassy or consulate in that country attests it\n4. The UAE Ministry of Foreign Affairs (MoFAIC) attests it here\n\nSome countries add a step before the first — state-level authentication, a university verification, or a designated agency. The order is never optional: an authority will refuse a document that reaches it out of sequence.",
    service: ATTESTATION,
    opener: true,
    phrases: [
      "what are the steps in attestation",
      "attestation process step by step",
      "how does attestation work",
      "attestation procedure",
      "what is the order of attestation",
      "full attestation chain",
      "what stamps do i need",
    ],
    keywords: [["attestation", "steps"], ["attestation", "process"], ["attestation", "chain"]],
    next: ["att-home-country-step", "att-embassy-step", "att-mofaic"],
  },
  {
    id: "att-home-country-step",
    question: "What happens in my home country before the UAE steps?",
    answer:
      "Everything up to and including that country's foreign ministry. Typically the issuing body — a university, a registrar, a police department — confirms the document first, then a national authentication body or foreign ministry stamps it.\n\nThis half cannot be done from Dubai. It happens where the document was issued, either by you on a visit, by someone you authorise, or by a provider with a presence there.",
    service: ATTESTATION,
    phrases: [
      "what happens in my home country",
      "home country attestation",
      "do i need to attest in my country first",
      "can the first steps be done in dubai",
      "issuing country attestation steps",
    ],
    keywords: [["home", "country", "attestation"], ["issuing", "country", "steps"]],
    next: ["att-while-in-uae", "att-on-my-behalf", "att-chain"],
  },
  {
    id: "att-embassy-step",
    question: "What is UAE embassy attestation?",
    answer:
      "The UAE embassy or consulate in the country that issued your document confirms the foreign ministry stamp already on it. It is the step that carries the document from that country's system into ours, and it always comes after that country's foreign ministry, never before.\n\nEmbassies differ in what they will accept — some want the document submitted by a registered agent, some want a copy of the applicant's passport or UAE visa with it.",
    service: ATTESTATION,
    phrases: [
      "what is embassy attestation",
      "uae embassy attestation",
      "why do i need embassy stamp",
      "uae consulate attestation",
      "embassy legalisation",
    ],
    keywords: [["embassy", "attestation"], ["consulate", "attestation"], ["embassy", "stamp"]],
    next: ["att-mofaic", "att-chain", "att-turnaround"],
  },
  {
    id: "att-mofaic",
    question: "What is MoFAIC attestation?",
    answer:
      "The final stamp, applied in the UAE by the Ministry of Foreign Affairs and International Cooperation. It confirms the UAE embassy attestation already on the document, and it is the one UAE authorities look for.\n\nIt is also the only step in the chain that happens here, which is why people sometimes arrive thinking it is the whole process. Without the embassy stamp before it, MoFAIC has nothing to confirm.",
    service: ATTESTATION,
    phrases: [
      "what is mofa attestation",
      "what is mofaic",
      "ministry of foreign affairs attestation",
      "mofa stamp",
      "final attestation step",
      "mofaic attestation dubai",
    ],
    keywords: [["mofa", "attestation"], ["mofaic"], ["foreign", "affairs", "attestation"]],
    next: ["att-chain", "price-mofaic-fee", "att-turnaround"],
  },
  {
    id: "att-apostille-difference",
    question: "What is the difference between attestation and an apostille?",
    answer:
      "An apostille is a single certificate that replaces the whole chain — but only between countries that are both party to the Hague Apostille Convention. Attestation is the longer route used where that shortcut does not apply.\n\nFor documents coming into the UAE, the longer route is the one that applies. An apostille from the issuing country may well be the form its foreign ministry uses, but the UAE embassy and MoFAIC steps still follow it.",
    service: ATTESTATION,
    phrases: [
      "difference between attestation and apostille",
      "attestation vs apostille",
      "is apostille the same as attestation",
      "do i need apostille or attestation",
      "what is an apostille",
    ],
    keywords: [["apostille", "attestation"], ["apostille", "difference"]],
    next: ["att-uae-not-hague", "att-chain", "doc-uae-issued-abroad"],
  },
  {
    id: "att-uae-not-hague",
    question: "Is an apostille enough for the UAE?",
    answer:
      "No. The UAE is not a party to the Hague Apostille Convention, so an apostille on its own does not make a foreign document usable here — the UAE embassy attestation and the MoFAIC stamp still have to follow it.\n\nThis is the single most common thing people are told wrongly, usually by a service that apostilled a document and stopped. If yours has an apostille and nothing else, it is not finished.\n\nIt is also worth confirming current requirements with MoFAIC directly, because this is exactly the kind of rule that changes.",
    service: ATTESTATION,
    phrases: [
      "is apostille enough for uae",
      "is uae part of hague convention",
      "does uae accept apostille",
      "uae apostille convention",
      "i have an apostille is that enough",
      "hague convention uae",
    ],
    keywords: [["apostille", "enough"], ["hague", "uae"], ["uae", "accept", "apostille"]],
    next: ["att-apostille-difference", "att-chain", "att-rejection-reasons"],
  },
  {
    id: "att-photocopy",
    question: "Can you attest a photocopy?",
    answer:
      "No. Attestation is performed on the original document. Anyone offering to attest a copy is not doing real attestation, and the result will be refused wherever it matters.\n\nA true copy certified by a notary is a different thing with different uses, and it does not substitute.",
    service: ATTESTATION,
    phrases: [
      "can you attest a photocopy",
      "can a copy be attested",
      "do i need the original certificate",
      "attest a scanned copy",
      "is a photocopy accepted for attestation",
    ],
    keywords: [["attest", "photocopy"], ["attest", "copy"], ["original", "required"]],
    next: ["att-original-lost", "att-soft-copy", "att-multiple-copies"],
  },
  {
    id: "att-original-lost",
    question: "I lost the original certificate. What now?",
    answer:
      "You need a re-issued original from whoever issued it — a duplicate or replacement certificate from the university, registrar or police department, obtained through their own process. Once that exists, it attests like any other original.\n\nThere is no way around this. Nothing in the chain can be applied to a document that does not exist.",
    service: ATTESTATION,
    phrases: [
      "i lost my degree certificate",
      "lost original certificate attestation",
      "my certificate is missing",
      "can i attest a duplicate certificate",
      "what if i dont have the original",
    ],
    keywords: [["lost", "certificate"], ["lost", "original"], ["duplicate", "certificate"]],
    next: ["att-photocopy", "att-university-verification", "doc-degree"],
  },
  {
    id: "att-validity",
    question: "Does attestation expire?",
    answer:
      "The attestation itself does not carry an expiry date. What changes is whether the authority receiving it still accepts it — some ask for documents attested within a certain period, and police clearance certificates in particular are usually expected to be recent.\n\nSo a degree attested five years ago is normally still fine; a police clearance attested five years ago usually is not.",
    service: ATTESTATION,
    phrases: [
      "does attestation expire",
      "how long is attestation valid",
      "validity of attestation",
      "is my old attestation still good",
      "attestation expiry date",
    ],
    keywords: [["attestation", "expire"], ["attestation", "valid"], ["attestation", "validity"]],
    next: ["att-job-change", "doc-pcc", "att-multiple-copies"],
  },
  {
    id: "att-job-change",
    question: "Do I need to attest my degree again if I change jobs?",
    answer:
      "Usually not. The attestation belongs to the document, not to the employer, so the same attested certificate works for the next job.\n\nWhat sometimes has to be repeated is the equivalency or professional evaluation a particular employer or regulator asks for — that is a separate assessment, not attestation.",
    service: ATTESTATION,
    phrases: [
      "do i need to attest again for a new job",
      "changing jobs attestation",
      "new employer wants attestation again",
      "is attestation transferable between employers",
    ],
    keywords: [["change", "job", "attestation"], ["new", "employer", "attestation"]],
    next: ["att-validity", "use-equivalency", "use-work-permit"],
  },
  {
    id: "att-who-does-it",
    question: "Do you do the attestation yourselves?",
    answer:
      "No, and it matters that we say so. Attestation is carried out by government authorities and by providers licensed to submit to them. What we do is work out exactly which chain your document needs, tell you what each step involves, introduce you to a provider who runs it, and stay in the loop until you have the document back.\n\nAnyone telling you they personally attest documents is describing someone else's work.",
    service: ATTESTATION,
    phrases: [
      "do you do attestation yourself",
      "are you an attestation agency",
      "who actually does the attestation",
      "are you licensed for attestation",
      "do you handle it directly",
    ],
    keywords: [["attestation", "agency"], ["attestation", "licensed"]],
    next: ["meta-who-are-you", "att-do-it-myself", "meta-document-safety"],
  },
  {
    id: "att-where-done",
    question: "Is attestation done in Dubai or in my home country?",
    answer:
      "Both. Every step up to the UAE embassy happens in the country that issued the document; the final MoFAIC stamp happens here.\n\nThat split is why the timeline depends so much on where your certificate came from, and why nobody can honestly give you one figure for every country.",
    service: ATTESTATION,
    phrases: [
      "is attestation done in dubai",
      "where does attestation happen",
      "can attestation be done in uae only",
      "do i have to travel for attestation",
      "attestation in dubai or home country",
    ],
    keywords: [["where", "attestation", "done"], ["attestation", "dubai", "country"]],
    next: ["att-while-in-uae", "att-home-country-step", "att-turnaround"],
  },
  {
    id: "att-while-in-uae",
    question: "Can I get my documents attested while I am already in the UAE?",
    answer:
      "Yes. You do not have to be in the issuing country for it to happen there — the original document does, and it travels by courier.\n\nIn practice you send the original to whoever is running the chain, they work through the authorities in order, and it comes back attested. The MoFAIC step then happens here.",
    service: ATTESTATION,
    phrases: [
      "i am already in dubai can i attest",
      "attestation while living in uae",
      "can attestation be done without travelling",
      "do i need to go back home for attestation",
    ],
    keywords: [["already", "uae", "attestation"], ["travelling", "attestation"]],
    next: ["att-courier-originals", "att-on-my-behalf", "att-turnaround"],
  },
  {
    id: "att-on-my-behalf",
    question: "Can someone else handle attestation for me?",
    answer:
      "Yes. Most attestation is done by an authorised representative rather than by the person named on the certificate, and authorities expect that.\n\nSome steps — particularly university verification and certain embassies — ask for a signed authorisation or a power of attorney before they will deal with a representative. We tell you in advance if yours is one of those.",
    service: ATTESTATION,
    phrases: [
      "can someone else do attestation for me",
      "can my agent attest my documents",
      "do i need power of attorney for attestation",
      "authorised representative attestation",
      "can my brother submit my documents",
    ],
    keywords: [["someone", "else", "attestation"], ["behalf", "attestation"]],
    next: ["not-poa-general", "att-presence-required", "att-while-in-uae"],
  },
  {
    id: "att-turnaround",
    question: "How long does attestation take?",
    answer:
      "It depends almost entirely on the issuing country, and the honest range is wide — a few working days where the chain is short and the authorities are quick, several weeks where university verification is involved.\n\nWhat we can do is give you a realistic range for your country and document before anything starts, rather than a number that sounds good and then slips.",
    service: ATTESTATION,
    phrases: [
      "how long does attestation take",
      "attestation time",
      "how many days for attestation",
      "attestation duration",
      "when will my documents be ready",
      "is attestation fast",
    ],
    keywords: [["attestation", "take"], ["attestation", "time"]],
    next: ["price-urgent", "att-tracking", "att-university-verification"],
  },
  {
    id: "att-tracking",
    question: "Can I track where my document is?",
    answer:
      "Yes. You should know which authority holds it and what stage it has reached at any point, and a provider who cannot tell you that is not one we would introduce you to.\n\nSome authorities also publish their own tracking; where that exists you get the reference number.",
    service: ATTESTATION,
    phrases: [
      "can i track my attestation",
      "where is my document now",
      "attestation status",
      "how do i check my attestation progress",
      "tracking number attestation",
    ],
    keywords: [["track", "attestation"], ["attestation", "status"]],
    next: ["att-turnaround", "meta-document-safety", "att-who-does-it"],
  },
  {
    id: "att-rejection-reasons",
    question: "Why do attested documents get rejected?",
    answer:
      "Almost always one of five things:\n\n- A step in the chain was skipped or taken out of order\n- The name does not match the passport exactly\n- The document is a copy, or a copy certified as a true copy\n- The certificate could not be verified with the issuing body\n- A translation was needed and was not produced by a licensed legal translator\n\nEvery one of those is cheaper to catch before submission than after.",
    service: ATTESTATION,
    phrases: [
      "why was my attested document rejected",
      "attestation rejected",
      "my certificate was refused",
      "reasons for attestation rejection",
      "document not accepted after attestation",
    ],
    keywords: [["attestation", "rejected"], ["document", "rejected"]],
    next: ["att-name-mismatch", "att-verification-failed", "att-uae-not-hague"],
  },
  {
    id: "att-name-mismatch",
    question: "My name is spelled differently on my certificate and my passport.",
    answer:
      "This is the most common single reason a file fails, and it is worth dealing with before attestation rather than after. A missing middle name, a different transliteration, a surname written first — any of them can be enough.\n\nDepending on the difference, the fix is either a correction from the issuing body or a notarised affidavit declaring that both names refer to the same person. Which one works depends on the authority receiving it, so it is worth checking before you pay for a chain that may be refused.",
    service: ATTESTATION,
    phrases: [
      "name mismatch certificate passport",
      "my name is different on my degree",
      "spelling difference passport certificate",
      "surname not matching",
      "one name only in passport",
      "name correction affidavit",
    ],
    keywords: [["name", "mismatch"], ["name", "different", "passport"], ["spelling", "passport"]],
    next: ["not-affidavit", "att-rejection-reasons", "att-university-verification"],
  },
  {
    id: "att-damaged-laminated",
    question: "My certificate is laminated or damaged. Is that a problem?",
    answer:
      "Lamination is a problem: authorities stamp the document itself, and several will refuse a laminated certificate outright because they cannot. Removing lamination risks damaging what is underneath, so it is usually safer to request a re-issued original.\n\nTorn or water-damaged certificates are judged case by case, and the safest assumption is that a badly damaged one will need replacing.",
    service: ATTESTATION,
    phrases: [
      "my certificate is laminated",
      "damaged certificate attestation",
      "torn certificate",
      "can a laminated degree be attested",
      "water damaged document",
    ],
    keywords: [["laminated", "certificate"], ["damaged", "certificate"]],
    next: ["att-original-lost", "att-photocopy", "att-rejection-reasons"],
  },
  {
    id: "att-do-it-myself",
    question: "Can I do the attestation myself?",
    answer:
      "In principle yes, and for a short chain in a country you are living in it can be reasonable. The difficulties are practical: several authorities only accept submissions from registered agents, embassy requirements change without being published, and the original has to physically move between countries.\n\nWhere it goes wrong is rarely the paperwork and usually the sequence — a step taken in the wrong order means starting that part again.",
    service: ATTESTATION,
    phrases: [
      "can i do attestation myself",
      "diy attestation",
      "do i need an agent for attestation",
      "can i go to mofa directly",
      "self attestation",
    ],
    keywords: [["do", "myself", "attestation"]],
    next: ["att-who-does-it", "att-chain", "price-attestation"],
  },
  {
    id: "att-courier-originals",
    question: "Is it safe to courier my original certificates?",
    answer:
      "It is how most attestation is done, and the risk is managed rather than eliminated: tracked courier both ways, a signed receipt when the document is handed over, and a record of which authority holds it at each stage.\n\nBefore sending anything, take a clear scan of every page. It will not substitute for the original, but it makes a replacement far easier to request if the worst happens.",
    service: ATTESTATION,
    phrases: [
      "is it safe to courier my documents",
      "sending original certificates by post",
      "what if my document is lost in transit",
      "courier original degree",
      "safety of my documents",
    ],
    keywords: [["courier", "documents"], ["safe", "send", "original"]],
    next: ["meta-document-safety", "att-tracking", "att-original-lost"],
  },
  {
    id: "att-presence-required",
    question: "Do I need to be present in person?",
    answer:
      "For attestation, usually not — the document travels, you do not. Signed authorisation is sometimes needed for a representative to act, and a few embassies want the applicant's passport copy with the file.\n\nNotarisation is the opposite: a notary needs the signatory in front of them, or a valid power of attorney in place of them.",
    service: ATTESTATION,
    phrases: [
      "do i need to be present for attestation",
      "can it be done without me",
      "is my presence required",
    ],
    keywords: [["present", "person"], ["presence", "required"]],
    next: ["not-all-signatories", "att-on-my-behalf", "not-poa-general"],
  },
  {
    id: "att-soft-copy",
    question: "I only have a PDF or a photo of my certificate.",
    answer:
      "A scan is enough for us to check what the document is, what stamps it already carries and which chain it needs — and that check is worth doing before you move the original anywhere.\n\nThe attestation itself still needs the physical original, so the next step is getting it, either from wherever it is kept or as a re-issue from the issuing body.",
    service: ATTESTATION,
    phrases: [
      "i only have a pdf",
      "can you attest a soft copy",
      "i have a photo of my certificate",
      "digital certificate attestation",
      "e certificate attestation",
    ],
    keywords: [["soft", "copy"], ["pdf", "attestation"], ["digital", "certificate"]],
    next: ["att-photocopy", "att-original-lost", "att-what-is"],
  },
  {
    id: "att-multiple-copies",
    question: "Can I get several attested copies of one certificate?",
    answer:
      "Attestation is applied to the original, so there is one attested document, not several. What you can do afterwards is have certified true copies made from it for the places that will accept a copy, and keep the attested original for the ones that will not.\n\nIf two authorities both insist on holding an original, that usually means requesting a second original from the issuing body and attesting it too.",
    service: ATTESTATION,
    phrases: [
      "can i get multiple attested copies",
      "attest two copies",
      "i need my degree in two places at once",
      "certified true copy after attestation",
    ],
    keywords: [["multiple", "copies"], ["two", "copies", "attested"]],
    next: ["att-photocopy", "not-what-can-be-notarised", "price-multiple-documents"],
  },
  {
    id: "att-university-verification",
    question: "What is university verification and why does it delay things?",
    answer:
      "Several countries require the issuing university to confirm directly to an authentication body that the certificate is theirs, before any stamp is applied. It is the step that most often takes weeks rather than days, because it depends on a university department replying.\n\nIt is also the step people do not know about until their file stops moving, which is why we flag it at the start when your country requires it.",
    service: ATTESTATION,
    phrases: [
      "what is university verification",
      "hrd attestation",
      "why is my attestation taking so long",
      "university verification delay",
      "degree verification process",
    ],
    keywords: [["university", "verification"], ["hrd", "attestation"], ["verification", "delay"]],
    next: ["att-verification-failed", "att-turnaround", "cty-india"],
  },
  {
    id: "att-verification-failed",
    question: "What if my university cannot verify my certificate?",
    answer:
      "It stops the chain, and no later stamp can be obtained without it. The usual causes are records held under a different name or roll number, a college that has since closed or merged, or an institution that was never recognised by the relevant authority.\n\nThe first two are normally fixable through the university or its successor body. The third is not, and it is better to find out before paying for anything downstream.",
    service: ATTESTATION,
    phrases: [
      "university cannot verify my degree",
      "verification failed attestation",
      "my college has closed",
      "university not recognised",
      "fake degree check",
    ],
    keywords: [["verification", "failed"], ["university", "closed"]],
    next: ["att-university-verification", "att-rejection-reasons", "use-equivalency"],
  },
  {
    id: "att-emirates-id",
    question: "Do I need an Emirates ID or a residence visa to attest documents?",
    answer:
      "Not for the attestation chain itself. The document is what is being attested, and plenty of attestation is done for people who have not arrived yet — that is normally the point, since the attested degree is what the work permit depends on.\n\nNotarisation in Dubai is different: a notary will want identification from whoever is signing.",
    service: ATTESTATION,
    phrases: [
      "do i need emirates id for attestation",
      "attestation without residence visa",
      "i am not in uae yet",
      "can i attest before my visa",
    ],
    keywords: [["emirates", "id", "attestation"]],
    next: ["not-emirates-id", "use-work-permit", "att-while-in-uae"],
  },
  {
    id: "att-translation-needed",
    question: "Do I need a translation as well as attestation?",
    answer:
      "Often, and they are separate steps that answer separate questions. Attestation proves the original is genuine; translation makes it readable to the authority receiving it.\n\nIf your document is not in Arabic or English, assume a certified translation will be needed. In the UAE that means a translator licensed by the Ministry of Justice — an ordinary translation is refused.",
    service: TRANSLATION,
    phrases: [
      "do i need translation as well",
      "is translation required with attestation",
      "attestation and translation together",
      "does my certificate need to be in arabic",
    ],
    keywords: [["translation", "attestation"]],
    next: ["att-order-translate-or-attest", "att-attesting-translation", "not-bilingual-required"],
  },
  {
    id: "att-order-translate-or-attest",
    question: "Should I translate first or attest first?",
    answer:
      "Attest first, as a rule. The translation is made from the finished document including its stamps, so translating before the stamps exist usually means paying for it twice.\n\nThere are exceptions where an authority in the issuing country needs a translation to process the document at all. That is worth checking for your specific country before either is ordered.",
    service: TRANSLATION,
    phrases: [
      "should i translate or attest first",
      "order of translation and attestation",
      "translate before attestation",
      "which comes first translation or attestation",
    ],
    keywords: [["translate", "first"], ["order", "translation", "attestation"]],
    next: ["att-translation-needed", "att-attesting-translation", "att-chain"],
  },
  {
    id: "att-attesting-translation",
    question: "Does the translation itself need attesting?",
    answer:
      "Sometimes. A translation produced by a UAE Ministry of Justice licensed translator is already accepted by most UAE authorities on its own. Where the translated document is going to a court, to a foreign authority, or to a body that specifically asks for it, the translation may also need notarisation or a MoFAIC stamp of its own.\n\nIt depends on who is receiving it, so it is worth confirming before ordering.",
    service: TRANSLATION,
    phrases: [
      "does the translation need attestation",
      "attest the translated copy",
      "notarised translation",
      "mofa stamp on translation",
    ],
    keywords: [["translation", "attested"], ["notarised", "translation"]],
    next: ["att-translation-needed", "not-bilingual-required", "not-then-attestation"],
  },

  /* ── Attestation: by document ──────────────────────────────────────────── */
  {
    id: "doc-degree",
    question: "How do I attest my degree certificate?",
    answer:
      "The standard chain applies: the university or an authentication body confirms it, that country's foreign ministry attests it, the UAE embassy there attests it, and MoFAIC stamps it here.\n\nDegrees are the document most likely to need university verification first, which is the step that decides the timeline. Bring the original — degrees are refused as copies more often than anything else.",
    service: ATTESTATION,
    phrases: [
      "how do i attest my degree",
      "degree attestation process",
      "bachelor degree attestation",
      "university certificate attestation",
      "masters degree attestation",
      "graduation certificate attestation",
    ],
    keywords: [["degree", "attestation"], ["degree", "attest"], ["graduation", "certificate"]],
    next: ["att-university-verification", "use-work-permit", "use-equivalency"],
  },
  {
    id: "doc-diploma",
    question: "Can a diploma or a short course certificate be attested?",
    answer:
      "Yes, if it was issued by an institution the relevant authority recognises. Diplomas and technical certificates go through the same chain as a degree.\n\nWhere they differ is acceptance: a short course certificate is attested happily enough but may not satisfy an employer or regulator asking for a recognised qualification. Worth checking what the receiving authority actually requires before paying for the chain.",
    service: ATTESTATION,
    phrases: [
      "diploma attestation",
      "can a diploma be attested",
      "short course certificate attestation",
      "technical certificate attestation",
      "polytechnic certificate",
    ],
    keywords: [["diploma", "attestation"], ["course", "certificate", "attestation"]],
    next: ["doc-degree", "use-equivalency", "att-verification-failed"],
  },
  {
    id: "doc-transcript",
    question: "Do I need my transcripts and marksheets attested too?",
    answer:
      "Only if the receiving authority asks for them. Many employers want the degree alone; equivalency assessments and university admissions usually want transcripts as well.\n\nThey attest alongside the degree, and doing both in one run costs less than going back for the transcripts later.",
    service: ATTESTATION,
    phrases: [
      "do i need transcripts attested",
      "attest my marksheets",
      // "transcript attestation" was removed: as a bare two-word phrase on a
      // prose entry it won `matchByPhrase`'s containment pass against anything
      // holding that adjacency, including "how much to get my transcripts
      // attested for my masters application" — a price question answered with a
      // paragraph instead of a callback. The `["transcript","attestation"]`
      // keyword group below still covers the plain phrasing.
      "mark sheets attestation",
      "do i need all my marksheets",
    ],
    keywords: [["transcript", "attestation"], ["marksheet", "attestation"]],
    next: ["doc-degree", "use-equivalency", "price-multiple-documents"],
  },
  {
    id: "doc-school",
    question: "How do I attest a school certificate for a child's admission?",
    answer:
      "Grade 10 and grade 12 certificates, and transfer certificates from the previous school, go through the same chain as any other document issued abroad.\n\nSchools in Dubai normally want the transfer certificate attested and the last completed year's report. Start early — admission deadlines and attestation timelines do not naturally line up.",
    service: ATTESTATION,
    phrases: [
      // Not "school certificate attestation" on its own: as a bare phrase it won
      // the containment pass against "how much for my school certificate
      // attestation for college", answering a price question with prose instead
      // of routing it to a callback. The keyword group below still covers it.
      "attest a school certificate",
      "transfer certificate attestation",
      "attest my child school documents",
      "grade 12 certificate attestation",
      "tc attestation for school",
    ],
    keywords: [["school", "certificate", "attestation"], ["transfer", "certificate"]],
    next: ["use-school-admission", "att-turnaround", "doc-birth"],
  },
  {
    id: "doc-birth",
    question: "How do I attest a birth certificate?",
    answer:
      "Through the usual chain, starting with the registrar or health authority that issued it. Birth certificates are needed for family visas, school admissions and adding a child to a residence file.\n\nIf it is not in Arabic or English, a certified legal translation will be needed as well as the attestation.",
    service: ATTESTATION,
    phrases: [
      "birth certificate attestation",
      "attest birth certificate for family visa",
      "child birth certificate uae",
      "how to attest birth certificate",
    ],
    keywords: [["birth", "certificate", "attestation"], ["birth", "certificate", "attest"]],
    next: ["use-family-visa-children", "att-translation-needed", "doc-school"],
  },
  {
    id: "doc-marriage",
    question: "How do I attest a marriage certificate?",
    answer:
      "The same chain, beginning with the authority that registered the marriage. This is the document a spouse visa application turns on, so it is worth confirming the names on it match both passports exactly before starting.\n\nA translation is normally needed too unless it was issued in Arabic or English.",
    service: ATTESTATION,
    phrases: [
      "marriage certificate attestation",
      "attest marriage certificate for spouse visa",
      "how to attest my marriage certificate",
      "nikah certificate attestation",
    ],
    keywords: [["marriage", "certificate", "attestation"], ["marriage", "certificate", "attest"]],
    next: ["use-family-visa-spouse", "att-name-mismatch", "att-translation-needed"],
  },
  {
    id: "doc-death",
    question: "Can a death certificate be attested?",
    answer:
      "Yes, and it is usually needed for inheritance, closing accounts, insurance claims or end-of-service settlements. It follows the same chain as any other civil document.\n\nThese are almost always urgent and almost always needed alongside other documents — a succession certificate, a will, or proof of relationship — so it is worth listing everything the receiving body wants before starting any of it.",
    service: ATTESTATION,
    phrases: [
      "death certificate attestation",
      "attest death certificate",
      "inheritance document attestation",
      "succession certificate attestation",
    ],
    keywords: [["death", "certificate", "attestation"], ["inheritance", "attestation"]],
    next: ["use-insurance-eos", "not-will-options", "att-turnaround"],
  },
  {
    id: "doc-divorce",
    question: "Can a divorce decree be attested?",
    answer:
      "Yes. Court-issued decrees normally need the court or a designated judicial authority to confirm them before the foreign ministry will attest, which adds a step.\n\nIt is commonly asked for when remarrying, when changing a dependant's status, or alongside a single status certificate.",
    service: ATTESTATION,
    phrases: [
      "divorce certificate attestation",
      "attest divorce decree",
      "divorce papers attestation uae",
      "court decree attestation",
    ],
    keywords: [["divorce", "attestation"], ["divorce", "decree"]],
    next: ["doc-single-status", "doc-marriage", "att-chain"],
  },
  {
    id: "doc-pcc",
    question: "How do I attest a police clearance certificate?",
    answer:
      "Same chain, starting with the police authority that issued it. The thing to watch is age rather than process: most authorities want a police clearance issued within the last three to six months, so an old one attests fine and is then refused.\n\nGet the certificate, then attest it immediately, then submit it.",
    service: ATTESTATION,
    phrases: [
      "police clearance certificate attestation",
      "pcc attestation",
      "good conduct certificate attestation",
      "how to attest police clearance",
      "criminal record certificate attestation",
    ],
    keywords: [["police", "clearance", "attestation"], ["pcc", "attestation"], ["good", "conduct"]],
    next: ["att-validity", "use-golden-visa", "att-turnaround"],
  },
  {
    id: "doc-experience",
    question: "Can an experience or salary certificate be attested?",
    answer:
      "Yes, though it is usually the harder one, because the chain starts with a private employer rather than a government body. Most countries require the employer's signature to be notarised locally, and sometimes confirmed by a chamber of commerce, before the foreign ministry will touch it.\n\nIf the employer no longer exists, that route usually closes and an alternative form of proof has to be agreed with whoever is asking.",
    service: ATTESTATION,
    phrases: [
      "experience certificate attestation",
      "salary certificate attestation",
      "employment letter attestation",
      "work experience letter attestation",
      "attest my experience letter",
    ],
    keywords: [["experience", "certificate", "attestation"], ["salary", "certificate", "attestation"], ["employment", "letter", "attestation"]],
    next: ["use-professional-licence", "use-golden-visa", "att-rejection-reasons"],
  },
  {
    id: "doc-medical",
    question: "Can medical reports or certificates be attested?",
    answer:
      "Yes. Medical certificates, fitness reports and vaccination records go through the chain starting with the issuing hospital or health authority, usually with a health ministry confirmation before the foreign ministry.\n\nUAE medical fitness testing for a residence visa is a separate process done here and has nothing to do with attestation.",
    service: ATTESTATION,
    phrases: [
      "medical certificate attestation",
      "attest medical report",
      "health certificate attestation",
      "fitness certificate attestation",
    ],
    keywords: [["medical", "certificate", "attestation"], ["medical", "report", "attest"]],
    next: ["doc-vaccination", "doc-nursing-licence", "att-chain"],
  },
  {
    id: "doc-vaccination",
    question: "Do vaccination records need attesting?",
    answer:
      "For school admission, often yes, and it is one people leave to the end. The child's immunisation record goes through the same chain as any other health document.\n\nSome schools accept the record without attestation and re-verify it through a local clinic instead, so ask the school before paying for the chain.",
    service: ATTESTATION,
    phrases: [
      "vaccination record attestation",
      "immunisation certificate attestation",
      "attest vaccination card for school",
    ],
    keywords: [["vaccination", "attestation"], ["immunisation", "record"]],
    next: ["doc-school", "use-school-admission", "doc-medical"],
  },
  {
    id: "doc-bank-statement",
    question: "Can a bank statement be attested?",
    answer:
      "Yes, where a foreign authority or institution has asked for one. The bank has to certify the statement first, then it follows the usual chain.\n\nMost UAE-side uses — a visa file, a tenancy, a loan application — take a stamped statement issued directly by the bank and need no attestation at all, so confirm it is really required.",
    service: ATTESTATION,
    phrases: [
      "bank statement attestation",
      "attest bank statement",
      "financial documents attestation",
      "bank letter attestation",
    ],
    keywords: [["bank", "statement", "attestation"], ["financial", "document", "attestation"]],
    next: ["use-bank-loan", "doc-commercial", "att-chain"],
  },
  {
    id: "doc-commercial",
    question: "How are commercial documents attested?",
    answer:
      "Invoices, certificates of origin, distribution agreements and similar trade documents normally go through a chamber of commerce in the issuing country before the foreign ministry, then the UAE embassy and MoFAIC.\n\nThe chamber step is the one that catches people out — it does not apply to personal documents but it is usually mandatory for commercial ones.",
    service: ATTESTATION,
    phrases: [
      "commercial document attestation",
      "certificate of origin attestation",
      "invoice attestation",
      "export document attestation",
      "chamber of commerce attestation",
    ],
    keywords: [["commercial", "document", "attestation"], ["certificate", "origin"], ["chamber", "commerce"]],
    next: ["doc-trade-licence", "doc-board-resolution", "att-chain"],
  },
  {
    id: "doc-poa-abroad",
    question: "I have a power of attorney issued abroad. Does it need attesting?",
    answer:
      "Yes, if it is to be used in the UAE. It has to be notarised in the country it was signed in, then attested up that country's chain, through the UAE embassy there, and finally by MoFAIC here. A certified legal translation into Arabic is normally required on top.\n\nA power of attorney that has only been notarised abroad has no effect here, which is the assumption that most often costs someone a wasted trip.",
    service: ATTESTATION,
    phrases: [
      "power of attorney issued abroad attestation",
      "attest poa from my country",
      "foreign power of attorney in uae",
      "poa signed outside uae",
      "use my overseas poa in dubai",
    ],
    keywords: [["power", "attorney", "abroad"], ["poa", "attestation"], ["foreign", "poa"]],
    next: ["not-poa-from-abroad", "att-translation-needed", "not-poa-general"],
  },
  {
    id: "doc-affidavit-abroad",
    question: "Can an affidavit sworn abroad be used in the UAE?",
    answer:
      "Only once it has been through the full chain — notarised where it was sworn, attested up to that country's foreign ministry, stamped by the UAE embassy there, then by MoFAIC — and translated by a licensed legal translator.\n\nIf the affidavit is needed for use here and you are here, it is usually simpler and faster to have it drawn up and notarised in Dubai instead.",
    service: ATTESTATION,
    phrases: [
      "affidavit sworn abroad",
      "attest affidavit from my country",
      "foreign affidavit uae",
      "declaration made overseas",
    ],
    keywords: [["affidavit", "abroad"], ["affidavit", "attestation"]],
    next: ["not-affidavit", "doc-poa-abroad", "att-translation-needed"],
  },
  {
    id: "doc-moa",
    question: "Does a memorandum of association from abroad need attesting?",
    answer:
      "Yes. Corporate documents issued outside the UAE — memoranda, articles, incorporation certificates, good standing certificates — go through the chain, usually with a notary and often a chamber of commerce at the start.\n\nThey are almost always needed as a set, so it saves time and money to attest all of them in one run rather than discovering a missing one at the licensing stage.",
    service: ATTESTATION,
    phrases: [
      "memorandum of association attestation",
      "moa attestation",
      "articles of association attestation",
      "certificate of incorporation attestation",
      "corporate documents attestation uae",
    ],
    keywords: [["memorandum", "association", "attestation"], ["moa", "attestation"], ["incorporation", "attestation"]],
    next: ["not-moa", "doc-board-resolution", "doc-commercial"],
  },
  {
    id: "doc-board-resolution",
    question: "How is a board resolution attested for use in the UAE?",
    answer:
      "Signed and notarised in the country the company is registered in, attested up that country's chain, then the UAE embassy, then MoFAIC, then translated by a licensed legal translator.\n\nBoard resolutions are frequently rejected for wording rather than stamps — naming the wrong authority, or granting powers the signatory does not hold — so it is worth having the draft checked before it is signed.",
    service: ATTESTATION,
    phrases: [
      "board resolution attestation",
      "attest board resolution for uae",
      "company resolution attestation",
      "shareholder resolution attestation",
    ],
    keywords: [["board", "resolution", "attestation"], ["company", "resolution"]],
    next: ["not-board-resolution", "doc-moa", "att-rejection-reasons"],
  },
  {
    id: "doc-trade-licence",
    question: "Can a foreign trade licence be attested?",
    answer:
      "Yes, and it is normally required when a foreign company opens a branch or becomes a shareholder here. The licence or registration extract goes through the chain with the rest of the corporate set.\n\nAuthorities usually want it recently issued, so check how old a licence extract the receiving body will accept before starting.",
    service: ATTESTATION,
    phrases: [
      "trade licence attestation",
      "attest foreign company licence",
      "business registration attestation",
      "commercial registration attestation",
    ],
    keywords: [["trade", "licence", "attestation"], ["business", "registration", "attestation"]],
    next: ["doc-moa", "doc-commercial", "att-validity"],
  },
  {
    id: "doc-driving-licence",
    question: "Does my foreign driving licence need attesting?",
    answer:
      "Sometimes. Where a licence can be exchanged directly, an RTA-approved translation is usually all that is asked for. Where the country is not on the exchange list, or where the licence has to be verified, attestation may be required.\n\nBecause the exchange lists change, confirm with the RTA what your licence needs before paying for anything.",
    service: ATTESTATION,
    phrases: [
      "driving licence attestation",
      "attest my driving license",
      "convert foreign driving licence dubai",
      "do i need my licence attested",
    ],
    keywords: [["driving", "licence", "attestation"], ["driving", "license", "attest"]],
    next: ["use-driving-licence-transfer", "att-translation-needed", "att-chain"],
  },
  {
    id: "doc-nursing-licence",
    question: "How do I attest nursing or medical qualifications?",
    answer:
      "The degree, the professional licence and usually the experience certificates all need the full chain, and the health regulator you are licensing with — DHA, MOHAP or DOH — then runs its own evaluation on top.\n\nThe regulator's requirements are stricter than a general work permit's, so get its current document list first and attest against that rather than guessing.",
    service: ATTESTATION,
    phrases: [
      "nursing certificate attestation",
      "dha licence documents attestation",
      "medical degree attestation uae",
      "mohap attestation requirements",
      "doctor qualification attestation",
    ],
    keywords: [["nursing", "attestation"], ["dha", "attestation"], ["mohap", "attestation"], ["medical", "degree", "attestation"]],
    next: ["use-professional-licence", "doc-experience", "use-equivalency"],
  },
  {
    id: "doc-teaching",
    question: "How do I attest teaching qualifications for a school in Dubai?",
    answer:
      "Degree and teaching qualification through the full chain, plus experience letters where the school asks for them. KHDA-regulated schools then verify the attested documents themselves as part of the teacher permit.\n\nSchools hire on a season, so the attestation timeline is usually the binding constraint — start before the offer is finalised if you can.",
    service: ATTESTATION,
    phrases: [
      "teaching certificate attestation",
      "khda teacher documents",
      "attest b ed certificate",
      "teacher qualification attestation dubai",
    ],
    keywords: [["teaching", "attestation"], ["khda", "attestation"], ["teacher", "qualification"]],
    next: ["use-professional-licence", "doc-degree", "att-turnaround"],
  },
  {
    id: "doc-engineering",
    question: "How do I attest engineering qualifications?",
    answer:
      "The degree goes through the full chain, and the Society of Engineers or the relevant municipality then runs its own assessment for registration, which normally wants transcripts and experience letters as well as the degree.\n\nAttest the transcripts at the same time as the degree — engineering registration asks for them far more often than a plain work permit does.",
    service: ATTESTATION,
    phrases: [
      "engineering degree attestation",
      "society of engineers attestation",
      "engineer registration documents uae",
      "attest engineering certificate",
    ],
    keywords: [["engineering", "attestation"], ["society", "engineers"]],
    next: ["doc-transcript", "use-professional-licence", "use-equivalency"],
  },
  {
    id: "doc-single-status",
    question: "What is a single status certificate and does it need attesting?",
    answer:
      "A certificate from your home authority stating you are not currently married. It is normally asked for when marrying in the UAE, and yes, it needs the full chain plus a certified translation.\n\nThey are usually only valid for a short window, so time it against the marriage appointment rather than getting it early.",
    service: ATTESTATION,
    phrases: [
      "single status certificate attestation",
      "certificate of no impediment",
      "unmarried certificate attestation",
      "documents to marry in dubai",
    ],
    keywords: [["single", "status", "certificate"], ["no", "impediment"], ["unmarried", "certificate"]],
    next: ["not-marriage-documents", "doc-divorce", "att-validity"],
  },
  {
    id: "doc-uae-issued-abroad",
    question: "How do I use a UAE-issued document in another country?",
    answer:
      "The chain runs the other way: the issuing UAE authority, then MoFAIC, then the embassy of the destination country here, and finally that country's foreign ministry if it asks for it.\n\nBecause the UAE is not party to the Hague Apostille Convention, a UAE document cannot be apostilled — if a foreign authority asks you for an apostille, what it will actually have to accept is this legalisation chain. Confirm with them in writing before you start.",
    service: ATTESTATION,
    phrases: [
      "use uae document abroad",
      "attest uae certificate for another country",
      "apostille uae document",
      "uae marriage certificate for use overseas",
      "emirates id document for foreign country",
      "attestation for documents going out of uae",
    ],
    keywords: [["uae", "document", "abroad"], ["apostille", "uae", "document"], ["document", "another", "country"]],
    next: ["att-uae-not-hague", "att-apostille-difference", "not-document-abroad"],
  },

  /* ── Attestation: by issuing country ───────────────────────────────────── */
  {
    id: "cty-india",
    question: "My documents are from India. What is the route?",
    answer:
      "Indian documents normally need authentication before the national level: educational certificates typically go through the state HRD or a designated authority, personal documents through the state home department or a notary and General Administration Department. The Ministry of External Affairs then attests, followed by the UAE embassy or consulate in India and MoFAIC here.\n\nThe state-level step and university verification are what make Indian degree attestation take weeks rather than days.",
    service: ATTESTATION,
    phrases: [
      "attestation for indian documents",
      "my degree is from india",
      "india degree attestation process",
      "mea attestation india",
      "hrd attestation india",
      "indian certificate attestation dubai",
    ],
    keywords: [["india", "attestation"], ["indian", "certificate", "attestation"], ["mea", "attestation"]],
    next: ["att-university-verification", "doc-degree", "att-turnaround"],
  },
  {
    id: "cty-pakistan",
    question: "My documents are from Pakistan. What is the route?",
    answer:
      "Educational documents are usually verified by the relevant board or the Higher Education Commission first, then attested by the Ministry of Foreign Affairs in Pakistan, then the UAE embassy or consulate there, then MoFAIC here.\n\nHEC verification is the step that sets the timeline, and it is done on the original certificate.",
    service: ATTESTATION,
    phrases: [
      "attestation for pakistani documents",
      "my degree is from pakistan",
      "hec attestation",
      "pakistan certificate attestation dubai",
    ],
    keywords: [["pakistan", "attestation"], ["hec", "attestation"]],
    next: ["att-university-verification", "doc-degree", "att-turnaround"],
  },
  {
    id: "cty-philippines",
    question: "My documents are from the Philippines. What is the route?",
    answer:
      "Civil documents normally start with the PSA, educational ones with CHED or the issuing school, then the Department of Foreign Affairs authenticates, then the UAE embassy in Manila, then MoFAIC here.\n\nThe DFA issues authentication in its own certificate form. That is not an apostille for UAE purposes — the UAE embassy step still follows it.",
    service: ATTESTATION,
    phrases: [
      "attestation for philippine documents",
      "psa birth certificate attestation",
      "dfa authentication uae",
      "philippines certificate attestation dubai",
      "red ribbon document uae",
    ],
    keywords: [["philippines", "attestation"], ["psa", "attestation"], ["dfa", "authentication"]],
    next: ["att-uae-not-hague", "doc-birth", "att-chain"],
  },
  {
    id: "cty-nepal",
    question: "My documents are from Nepal. What is the route?",
    answer:
      "Educational documents are verified by the issuing institution and the relevant ministry, then attested by the Ministry of Foreign Affairs in Kathmandu, then the UAE embassy or consulate covering Nepal, then MoFAIC here.\n\nWhere no UAE mission handles it locally, the file goes to the mission covering Nepal, which adds transit time.",
    service: ATTESTATION,
    phrases: [
      "attestation for nepali documents",
      "nepal certificate attestation",
      "my degree is from nepal",
    ],
    keywords: [["nepal", "attestation"], ["nepali", "certificate"]],
    next: ["att-turnaround", "doc-degree", "cty-other"],
  },
  {
    id: "cty-bangladesh",
    question: "My documents are from Bangladesh. What is the route?",
    answer:
      "Educational documents are normally verified by the education board or university and the Ministry of Education, then attested by the Ministry of Foreign Affairs, then the UAE embassy in Dhaka, then MoFAIC here.\n\nBoard verification on the original is the step that takes the time.",
    service: ATTESTATION,
    phrases: [
      "attestation for bangladeshi documents",
      "bangladesh certificate attestation",
      "my degree is from bangladesh",
    ],
    keywords: [["bangladesh", "attestation"], ["bangladeshi", "certificate"]],
    next: ["att-university-verification", "doc-degree", "att-turnaround"],
  },
  {
    id: "cty-srilanka",
    question: "My documents are from Sri Lanka. What is the route?",
    answer:
      "Documents are confirmed by the issuing authority — the Department of Examinations, a university, or the Registrar General for civil documents — then attested by the Ministry of Foreign Affairs in Colombo, then the UAE embassy there, then MoFAIC here.",
    service: ATTESTATION,
    phrases: [
      "attestation for sri lankan documents",
      "sri lanka certificate attestation",
      "my degree is from sri lanka",
    ],
    keywords: [["sri", "lanka", "attestation"], ["lankan", "certificate"]],
    next: ["doc-degree", "att-chain", "att-turnaround"],
  },
  {
    id: "cty-egypt",
    question: "My documents are from Egypt. What is the route?",
    answer:
      "The issuing body confirms the document, the Ministry of Foreign Affairs in Cairo attests it, the UAE embassy there attests it, and MoFAIC stamps it here. Educational documents usually need the Ministry of Higher Education first.\n\nDocuments already in Arabic will not need translating, which shortens the overall job.",
    service: ATTESTATION,
    phrases: [
      "attestation for egyptian documents",
      "egypt certificate attestation",
      "my degree is from egypt",
    ],
    keywords: [["egypt", "attestation"], ["egyptian", "certificate"]],
    next: ["doc-degree", "att-translation-needed", "att-chain"],
  },
  {
    id: "cty-nigeria",
    question: "My documents are from Nigeria. What is the route?",
    answer:
      "Educational documents normally need the issuing institution and the relevant federal ministry to confirm them, then the Ministry of Foreign Affairs in Abuja, then the UAE embassy there, then MoFAIC here.\n\nInstitutional verification is often the slow step, and some institutions require the graduate to request it personally or through a signed authorisation.",
    service: ATTESTATION,
    phrases: [
      "attestation for nigerian documents",
      "nigeria certificate attestation",
      "my degree is from nigeria",
    ],
    keywords: [["nigeria", "attestation"], ["nigerian", "certificate"]],
    next: ["att-university-verification", "att-on-my-behalf", "att-turnaround"],
  },
  {
    id: "cty-uk",
    question: "My documents are from the UK. What is the route?",
    answer:
      "UK documents are legalised by the FCDO, which issues its certificate in apostille form, and are then attested by the UAE embassy in London and by MoFAIC here.\n\nThe FCDO certificate alone is not enough for the UAE — the embassy and MoFAIC steps still follow. Degrees sometimes need the university to confirm them or a solicitor to certify them before the FCDO will act.",
    service: ATTESTATION,
    phrases: [
      "attestation for uk documents",
      "fcdo legalisation uae",
      "my degree is from the uk",
      "british certificate attestation dubai",
      "uk apostille for uae",
    ],
    keywords: [["uk", "attestation"], ["fcdo", "legalisation"], ["british", "certificate", "attestation"]],
    next: ["att-uae-not-hague", "att-apostille-difference", "doc-degree"],
  },
  {
    id: "cty-usa",
    question: "My documents are from the USA. What is the route?",
    answer:
      "Usually notarisation, then authentication by the Secretary of State of the issuing state, then the US Department of State where the document is federal, then the UAE embassy in Washington or the relevant consulate, then MoFAIC here.\n\nBecause authentication is state-level, documents from two different states follow two separate routes, and a state apostille on its own is not sufficient for the UAE.",
    service: ATTESTATION,
    phrases: [
      "attestation for us documents",
      "american degree attestation",
      "secretary of state authentication uae",
      "my degree is from the usa",
      "us apostille for uae",
    ],
    keywords: [["usa", "attestation"], ["american", "degree", "attestation"], ["secretary", "state", "authentication"]],
    next: ["att-uae-not-hague", "att-apostille-difference", "doc-degree"],
  },
  {
    id: "cty-canada",
    question: "My documents are from Canada. What is the route?",
    answer:
      "Provincial authentication where the province offers it, or Global Affairs Canada, then the UAE embassy in Ottawa or the relevant consulate, then MoFAIC here.\n\nWhich body authenticates depends on the province and the document type, so that is the first thing to establish rather than assume.",
    service: ATTESTATION,
    phrases: [
      "attestation for canadian documents",
      "global affairs canada authentication uae",
      "my degree is from canada",
    ],
    keywords: [["canada", "attestation"], ["canadian", "certificate", "attestation"]],
    next: ["att-chain", "doc-degree", "cty-other"],
  },
  {
    id: "cty-australia",
    question: "My documents are from Australia or New Zealand. What is the route?",
    answer:
      "DFAT in Australia, or DIA and MFAT in New Zealand, legalise the document — in apostille form — and the UAE embassy and MoFAIC steps then follow.\n\nAs everywhere, the apostille alone is not enough for the UAE. Degrees often need the university to certify the copy before the national body will act.",
    service: ATTESTATION,
    phrases: [
      "attestation for australian documents",
      "dfat authentication uae",
      "my degree is from australia",
      "new zealand document attestation uae",
    ],
    keywords: [["australia", "attestation"], ["dfat", "authentication"], ["new", "zealand", "attestation"]],
    next: ["att-uae-not-hague", "doc-degree", "att-chain"],
  },
  {
    id: "cty-south-africa",
    question: "My documents are from South Africa. What is the route?",
    answer:
      "DIRCO legalises the document, after the issuing body or a notary has confirmed it, and the UAE embassy in Pretoria and MoFAIC then follow.\n\nSAQA evaluation is a separate qualification assessment some employers and regulators ask for, and it is not a substitute for attestation.",
    service: ATTESTATION,
    phrases: [
      "attestation for south african documents",
      "dirco legalisation uae",
      "my degree is from south africa",
      "saqa evaluation uae",
    ],
    keywords: [["south", "africa", "attestation"], ["dirco", "legalisation"]],
    next: ["use-equivalency", "doc-degree", "att-chain"],
  },
  {
    id: "cty-china",
    question: "My documents are from China. What is the route?",
    answer:
      "Notarisation by a Chinese notary office, then the Ministry of Foreign Affairs or an authorised provincial foreign affairs office, then the UAE embassy in Beijing or the relevant consulate, then MoFAIC here.\n\nDegrees usually need CHSI or CDGDC verification first, and documents will need a certified Arabic or English translation.",
    service: ATTESTATION,
    phrases: [
      "attestation for chinese documents",
      "china certificate attestation",
      "my degree is from china",
      "chsi verification uae",
    ],
    keywords: [["china", "attestation"], ["chinese", "certificate", "attestation"]],
    next: ["att-translation-needed", "doc-degree", "att-university-verification"],
  },
  {
    id: "cty-russia",
    question: "My documents are from Russia, Ukraine or the CIS. What is the route?",
    answer:
      "The issuing body or a notary confirms the document, the relevant ministry — often education for degrees, justice for civil documents — then the foreign ministry, then the UAE embassy, then MoFAIC here.\n\nA certified Arabic or English translation is always needed, and it is usually produced after the stamps are on rather than before.",
    service: ATTESTATION,
    phrases: [
      "attestation for russian documents",
      "ukraine certificate attestation",
      "cis documents attestation uae",
      "my degree is from russia",
    ],
    keywords: [["russia", "attestation"], ["ukraine", "attestation"], ["russian", "certificate", "attestation"]],
    next: ["att-translation-needed", "att-order-translate-or-attest", "att-chain"],
  },
  {
    id: "cty-jordan-lebanon-syria",
    question: "My documents are from Jordan, Lebanon or Syria. What is the route?",
    answer:
      "The issuing authority, then the relevant ministry for that document type, then the foreign ministry, then the UAE embassy there, then MoFAIC here.\n\nDocuments already in Arabic save the translation step. Where a UAE mission is not operating normally in the country, the file may have to be routed through another mission, which changes the timeline.",
    service: ATTESTATION,
    phrases: [
      "attestation for jordanian documents",
      "lebanon certificate attestation",
      "syria document attestation uae",
      "my degree is from jordan",
    ],
    keywords: [["jordan", "attestation"], ["lebanon", "attestation"], ["syria", "attestation"]],
    next: ["att-chain", "att-turnaround", "cty-other"],
  },
  {
    id: "cty-kenya-uganda-ghana",
    question: "My documents are from Kenya, Uganda or Ghana. What is the route?",
    answer:
      "Verification by the issuing institution and the relevant national body, then the foreign ministry, then the UAE embassy or the mission covering that country, then MoFAIC here.\n\nEast and West African routes vary a lot by institution, and university verification is normally the step that decides how long it takes.",
    service: ATTESTATION,
    phrases: [
      "attestation for kenyan documents",
      "uganda certificate attestation",
      "ghana document attestation uae",
      "east africa attestation",
    ],
    keywords: [["kenya", "attestation"], ["uganda", "attestation"], ["ghana", "attestation"]],
    next: ["att-university-verification", "att-turnaround", "cty-other"],
  },
  {
    id: "cty-iran-iraq",
    question: "My documents are from Iran or Iraq. What is the route?",
    answer:
      "The issuing body and the relevant ministry confirm the document, then the foreign ministry, then the UAE mission covering that country, then MoFAIC here. A certified Arabic or English translation is normally required.\n\nThese routes are more variable than most, so it is worth confirming the current position before committing to a timeline.",
    service: ATTESTATION,
    phrases: [
      "attestation for iranian documents",
      "iraq certificate attestation",
      "my degree is from iran",
    ],
    keywords: [["iran", "attestation"], ["iraq", "attestation"]],
    next: ["att-translation-needed", "att-turnaround", "cty-other"],
  },
  {
    id: "cty-indonesia",
    question: "My documents are from Indonesia or Malaysia. What is the route?",
    answer:
      "The issuing institution and relevant ministry — education, law and human rights, or foreign affairs depending on the document — then the UAE embassy in Jakarta or Kuala Lumpur, then MoFAIC here.\n\nA certified translation is usually needed unless the document was issued in English.",
    service: ATTESTATION,
    phrases: [
      "attestation for indonesian documents",
      "malaysia certificate attestation",
      "my degree is from indonesia",
    ],
    keywords: [["indonesia", "attestation"], ["malaysia", "attestation"]],
    next: ["att-translation-needed", "doc-degree", "cty-other"],
  },
  {
    id: "cty-other",
    question: "My country is not on your list. Can you still help?",
    answer:
      "Yes. Every country runs the same four-stage idea — issuing body, national authentication, UAE mission, MoFAIC — and what differs is which local authority does the first two and whether a verification step sits in front of them.\n\nTell us the country and the document and we will map the actual chain for your case rather than guessing at it.",
    service: ATTESTATION,
    phrases: [
      "my country is not listed",
      "what about other countries",
      "do you handle all countries",
      "attestation for any country",
    ],
    keywords: [["country", "not", "listed"], ["other", "countries", "attestation"]],
    next: ["att-chain", "price-attestation", "meta-callback"],
  },

  /* ── Attestation: what it is for ───────────────────────────────────────── */
  {
    id: "use-work-permit",
    question: "What do I need attested for a UAE work permit?",
    answer:
      "Normally the highest degree certificate, attested through the full chain. Some employers and some regulated roles also want transcripts, experience letters or a professional licence attested.\n\nThe degree is the one that holds the permit up, so it is the one to start first — before the offer is finalised if you can, because the timeline depends on your issuing country rather than on the employer.",
    service: ATTESTATION,
    phrases: [
      "what do i need for a work permit",
      "attestation for employment visa",
      "labour card documents attestation",
      "work visa degree attestation",
      "my employer asked for attested degree",
    ],
    keywords: [["work", "permit", "attestation"], ["employment", "visa", "attestation"], ["labour", "card"]],
    next: ["doc-degree", "use-equivalency", "att-turnaround"],
  },
  {
    id: "use-family-visa-spouse",
    question: "What do I need attested to sponsor my spouse?",
    answer:
      "The marriage certificate, attested through the full chain and translated into Arabic by a licensed legal translator if it was not issued in Arabic.\n\nNames are the usual failure point — the certificate has to match both passports. Check that before starting rather than after.",
    service: ATTESTATION,
    phrases: [
      "attestation for spouse visa",
      "sponsor my wife documents",
      "family visa marriage certificate",
      "what do i need to sponsor my husband",
    ],
    keywords: [["spouse", "visa", "attestation"], ["sponsor", "wife"], ["sponsor", "husband"]],
    next: ["doc-marriage", "att-name-mismatch", "att-translation-needed"],
  },
  {
    id: "use-family-visa-children",
    question: "What do I need attested to sponsor my children?",
    answer:
      "Each child's birth certificate, attested through the full chain and translated if not in Arabic or English. The marriage certificate is usually wanted alongside it.\n\nIf a child was born in the UAE, the birth certificate is issued here and needs no attestation for use here.",
    service: ATTESTATION,
    phrases: [
      "attestation for children visa",
      "sponsor my son documents",
      "family visa birth certificate",
      "what do i need to sponsor my kids",
    ],
    keywords: [["children", "visa", "attestation"], ["sponsor", "children"], ["sponsor", "son"]],
    next: ["doc-birth", "use-newborn", "use-school-admission"],
  },
  {
    id: "use-school-admission",
    question: "What does a Dubai school need attested?",
    answer:
      "Usually the transfer certificate from the previous school and the last completed year's results, attested through the full chain, plus the child's birth certificate and often immunisation records.\n\nKHDA-regulated schools set their own document lists, so get the list from the school first and attest against it rather than attesting everything.",
    service: ATTESTATION,
    phrases: [
      "school admission documents dubai",
      "khda attestation requirements",
      "what does the school need attested",
      "attestation for school admission",
    ],
    keywords: [["school", "admission", "attestation"], ["khda", "requirements"]],
    next: ["doc-school", "doc-vaccination", "att-turnaround"],
  },
  {
    id: "use-equivalency",
    question: "What is equivalency and do I need it?",
    answer:
      "An assessment by the Ministry of Education confirming that a foreign qualification is equivalent to a UAE one. It is separate from attestation and comes after it — attestation proves the degree is real, equivalency says what it is worth here.\n\nIt is required for some regulated professions, for certain government roles and for further study. Plenty of private-sector jobs never ask for it.",
    service: ATTESTATION,
    phrases: [
      "what is equivalency",
      "ministry of education equivalency",
      "do i need equivalency certificate",
      "degree equivalency uae",
      "moe equivalency",
    ],
    keywords: [["equivalency", "certificate"], ["equivalency", "uae"], ["moe", "equivalency"]],
    next: ["use-higher-studies", "use-professional-licence", "doc-degree"],
  },
  {
    id: "use-golden-visa",
    question: "What documents does a golden visa application need attested?",
    answer:
      "It depends entirely on the category — degree and experience letters for the skilled professional routes, different evidence for investors and for specialised talent.\n\nWhat is consistent is that the supporting documents from abroad need the full chain, and that a recent police clearance is commonly asked for. Get the category's current list first; it changes more often than the attestation process does.",
    service: ATTESTATION,
    phrases: [
      "golden visa documents attestation",
      "attestation for golden visa",
      "what do i need for golden visa",
      "long term residence documents",
    ],
    keywords: [["golden", "visa", "attestation"], ["golden", "visa", "documents"]],
    next: ["doc-experience", "doc-pcc", "doc-degree"],
  },
  {
    id: "use-professional-licence",
    question: "What does a professional licence need attested?",
    answer:
      "The qualification, the existing professional licence where you hold one, and usually experience letters — all through the full chain. The regulator then runs its own evaluation and, for many professions, an exam.\n\nDHA, MOHAP, DOH, KHDA and the Society of Engineers each publish their own requirements, and they are stricter than a general work permit's. Attest against the regulator's list, not a generic one.",
    service: ATTESTATION,
    phrases: [
      "professional licence documents attestation",
      "dha licence attestation",
      "attestation for licensing exam",
      "regulator document requirements uae",
    ],
    keywords: [["professional", "licence", "attestation"], ["licence", "documents", "attestation"]],
    next: ["doc-nursing-licence", "doc-engineering", "use-equivalency"],
  },
  {
    id: "use-higher-studies",
    question: "What do I need attested to study in the UAE?",
    answer:
      "Previous degree or school certificates and transcripts, attested through the full chain. Universities here normally want equivalency as well for a foreign degree.\n\nAdmission deadlines and attestation timelines rarely line up, so start as soon as you have an offer rather than waiting for enrolment.",
    service: ATTESTATION,
    phrases: [
      "attestation for university admission uae",
      "documents to study in dubai",
      "masters admission documents attestation",
      "student visa document attestation",
    ],
    keywords: [["study", "uae", "attestation"], ["university", "admission", "attestation"]],
    next: ["use-equivalency", "doc-transcript", "att-turnaround"],
  },
  {
    id: "use-bank-loan",
    question: "Do banks ask for attested documents?",
    answer:
      "Rarely for a personal loan or a credit card — salary certificates and statements issued here are normally enough.\n\nWhere a bank is relying on something issued abroad, or where a corporate facility involves a foreign parent company, the foreign documents will usually need the full chain.",
    service: ATTESTATION,
    phrases: [
      "do banks need attested documents",
      "bank loan attestation",
      "mortgage document attestation",
      "attestation for credit application",
    ],
    keywords: [["bank", "loan", "attestation"], ["mortgage", "attestation"]],
    next: ["doc-bank-statement", "doc-commercial", "att-chain"],
  },
  {
    id: "use-court",
    question: "What does a UAE court need for a foreign document?",
    answer:
      "The full chain plus a certified translation into Arabic by a Ministry of Justice licensed translator. Courts are the least forgiving readers of a document set — a missing stamp or an uncertified translation gets it refused rather than queried.\n\nWhere the document is a power of attorney for the case, the wording matters as much as the stamps.",
    service: ATTESTATION,
    phrases: [
      "foreign document for uae court",
      "court case document attestation",
      "attestation for legal case",
      "evidence from abroad uae court",
    ],
    keywords: [["court", "document", "attestation"], ["court", "attestation"]],
    next: ["att-translation-needed", "doc-poa-abroad", "not-poa-general"],
  },
  {
    id: "use-property",
    question: "Do I need attested documents to buy property in Dubai?",
    answer:
      "For a straightforward purchase in your own name, usually not — passport and payment are the substance of it.\n\nAttestation and notarisation come in when someone else is signing for you, when a company is buying, or when a foreign corporate document is part of the file. Those need the chain and, for a power of attorney, notarisation here.",
    service: ATTESTATION,
    phrases: [
      "attestation to buy property dubai",
      "property purchase documents attestation",
      "do i need attestation for real estate",
      "buying property through poa",
    ],
    keywords: [["property", "attestation"], ["property", "purchase", "documents"]],
    next: ["not-poa-property-sale", "doc-moa", "not-poa-general"],
  },
  {
    id: "use-insurance-eos",
    question: "What is needed for an insurance or end-of-service claim?",
    answer:
      "Where the claim depends on a document issued abroad — a death certificate, a proof of relationship, a succession or heirship document — that document normally needs the full chain and a certified Arabic translation.\n\nInsurers and employers each set their own list, so get it in writing before attesting anything.",
    service: ATTESTATION,
    phrases: [
      "insurance claim document attestation",
      "end of service claim documents",
      "gratuity claim attestation",
      "heirship certificate attestation",
    ],
    keywords: [["insurance", "claim", "attestation"], ["end", "service", "documents"]],
    next: ["doc-death", "att-translation-needed", "not-will-options"],
  },
  {
    id: "use-driving-licence-transfer",
    question: "What do I need to exchange my driving licence?",
    answer:
      "For countries on the RTA exchange list, normally the licence itself plus an approved translation, and no attestation. For countries that are not, or where the licence has to be verified with the issuing authority, attestation may be required.\n\nThe exchange lists change, so confirm the current position with the RTA before paying for anything.",
    service: ATTESTATION,
    phrases: [
      "exchange my driving licence dubai",
      "convert driving license uae",
      "rta licence transfer documents",
      "do i need attestation for driving licence",
    ],
    keywords: [["driving", "licence", "exchange"], ["rta", "licence", "transfer"]],
    next: ["doc-driving-licence", "att-translation-needed", "att-chain"],
  },
  {
    id: "use-newborn",
    question: "My child was born in the UAE. What do I need?",
    answer:
      "The birth certificate is issued here, so it needs no attestation for use here — it goes to the registration and residence file directly, usually with a translation if it was issued in Arabic and you need it in English.\n\nIt does need the outbound chain if you want it recognised in your home country: MoFAIC, then your country's embassy here.",
    service: ATTESTATION,
    phrases: [
      "my baby was born in dubai",
      "uae born child birth certificate",
      "newborn documents uae",
      "register my baby born in uae",
    ],
    keywords: [["born", "uae", "certificate"], ["newborn", "documents"]],
    next: ["doc-uae-issued-abroad", "use-family-visa-children", "att-translation-needed"],
  },

  /* ── Money ─────────────────────────────────────────────────────────────────
   *
   * Every one of these sets `quote`, so the reply is followed in the same turn
   * by the service's qualification and then the callback form. None of them
   * quotes a figure, and none should ever be edited to.
   */
  {
    id: "price-attestation",
    question: "How much does attestation cost?",
    answer:
      "There is no single figure, and any site that gives you one is guessing. The cost is mostly government fees, and those differ by issuing country, by document type and by how many documents you have — they are also revised periodically.\n\nSo a provider quotes per case, with government fees shown separately from their own. Let me take a few details and someone will come back to you with a real number for your documents.",
    service: ATTESTATION,
    opener: true,
    quote: true,
    phrases: [
      "how much does attestation cost",
      "attestation price",
      "what is the cost of attestation",
      "attestation charges dubai",
      "how much for attestation",
      "attestation fees",
      "price for attestation",
      "cost of document attestation",
    ],
    keywords: [
      ["attestation", "cost"],
      ["attestation", "price"],
      ["attestation", "fee"],
      ["attestation", "fees"],
      ["attestation", "charges"],
    ],
  },
  {
    id: "price-degree-attestation",
    question: "How much does degree attestation cost?",
    answer:
      "It depends on the country that issued the degree more than on anything else — the number of authorities in the chain, and whether university verification is involved, is what moves the figure.\n\nTell me a little about the certificate and someone will come back with a quote covering every step, government fees shown separately.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "how much for degree attestation",
      "degree attestation cost",
      "price of degree attestation",
      "certificate attestation charges",
      "cost to attest my degree",
    ],
    // Three words, so they outrank `doc-degree`'s ["degree","attestation"] at two.
    // A bare ["fee"] on the catch-all loses to any real two-word prose group, which
    // is why each money entry carries its own service-scoped pairs as well.
    keywords: [
      ["degree", "attestation", "cost"],
      ["degree", "attestation", "price"],
      ["degree", "attestation", "fee"],
      ["degree", "attestation", "fees"],
      ["degree", "attestation", "charges"],
    ],
  },
  {
    id: "price-mofaic-fee",
    question: "What is the MoFAIC attestation fee?",
    answer:
      "MoFAIC charges per document and publishes its own fees, which are revised from time to time — so the right place to confirm the current figure is MoFAIC itself rather than a third party quoting it second-hand.\n\nIt is also only the last step. The larger part of the cost is usually everything before it. Let me take a few details and someone will come back with the whole picture.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "mofa attestation fee",
      "how much is mofaic attestation",
      "ministry of foreign affairs fee",
      "mofa charges per document",
      "mofaic fee dubai",
    ],
    keywords: [["mofa", "fee"], ["mofaic", "fee"], ["mofa", "charges"]],
  },
  {
    id: "price-breakdown",
    question: "Can you break down what I am paying for?",
    answer:
      "Yes, and you should insist on it from anyone. A proper quote separates government and authority fees, which are fixed and not ours, from the service fee, which is what the provider charges to run it — plus courier and translation where they apply.\n\nLet me take a few details and you will get that breakdown rather than one number.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "break down the cost",
      "what am i paying for",
      "cost breakdown attestation",
      "itemised quote",
      "what does the fee include",
    ],
    keywords: [["cost", "breakdown"], ["what", "fee", "includes"], ["itemised", "quote"]],
  },
  {
    id: "price-hidden-charges",
    question: "Are there any hidden charges?",
    answer:
      "There should not be, and the way to be sure is a written quote that separates authority fees from the service fee before anything starts.\n\nWhat legitimately changes mid-way is a step nobody knew was needed — a verification a university insists on, or a document an embassy asks for. That should be told to you and agreed, not added quietly. Let me take a few details and someone will set the whole thing out for you.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "are there hidden charges",
      "any extra fees",
      "will the price change",
      "hidden costs attestation",
      "is the quote final",
    ],
    keywords: [["hidden", "charges"], ["hidden", "costs"], ["extra", "fees"]],
  },
  {
    id: "price-payment",
    question: "How do I pay, and can I pay in instalments?",
    answer:
      "Payment terms are set by the provider who does the work, and they vary — government fees usually have to be paid as each step is reached, which limits how far they can be spread.\n\nRather than guess at terms that are not ours to set, let me take a few details and someone will tell you exactly what is possible for your case.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "how do i pay",
      "payment options",
      "can i pay in instalments",
      "do you accept card",
      "payment plan attestation",
    ],
    keywords: [["payment", "options"], ["pay", "instalments"], ["payment", "plan"]],
  },
  {
    id: "price-cheapest",
    question: "What is the cheapest way to get this done?",
    answer:
      "Honestly: doing it in the right order the first time. Most of the cost is government fees, which nobody can discount, and the expensive outcome is a step taken out of sequence that has to be paid for twice.\n\nWhere there is genuine saving is in batching documents and in not attesting things the receiving authority never asked for. Let me take a few details and someone will tell you what you actually need.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "cheapest attestation",
      "how can i save money",
      "cheapest way to attest documents",
      "lowest price attestation",
      "any discount",
    ],
    keywords: [["cheapest", "attestation"], ["save", "money"], ["lowest", "price"]],
  },
  {
    id: "price-multiple-documents",
    question: "Is it cheaper to do several documents together?",
    answer:
      "Usually, yes. Government fees are charged per document and do not change, but the service fee, the courier and the handling are often lower per document when they move together — and it avoids paying twice for the same trip through the same authorities.\n\nTell me how many documents and which country they are from, and someone will come back with a figure for the set.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "discount for multiple documents",
      "cost for several certificates",
      "cheaper to do all documents together",
      "bulk attestation price",
      "family documents attestation cost",
    ],
    keywords: [["multiple", "documents", "cost"], ["bulk", "attestation"], ["several", "certificates"]],
  },
  {
    id: "price-urgent",
    question: "Can it be done urgently, and what does that cost?",
    answer:
      "Some steps have an express option and some simply do not — a university verification or an embassy's processing time cannot be bought down, whatever anyone tells you.\n\nWhere express handling exists it carries an authority fee of its own. Tell me your deadline and someone will tell you honestly whether it is achievable before quoting you for it.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "urgent attestation",
      "express attestation cost",
      "can it be done faster",
      "same day attestation",
      "i need it urgently",
      "rush attestation price",
    ],
    keywords: [["urgent", "attestation"], ["express", "attestation"], ["same", "day", "attestation"]],
  },
  {
    id: "price-refund",
    question: "What happens to my money if the document is rejected?",
    answer:
      "Government fees are paid to authorities and are not normally refundable once a step has been taken, whatever the outcome. What a provider does about its own fee is a matter of its terms, and you should have those in writing before paying.\n\nThis is the strongest argument for checking a document properly before the chain starts. Let me take a few details and someone will go through it with you.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "refund if rejected",
      "do i get my money back",
      "what if it fails",
      "money back guarantee attestation",
      "refund policy",
    ],
    keywords: [["refund", "rejected"], ["money", "back"], ["refund", "policy"]],
  },
  {
    id: "price-quote-generic",
    question: "Can I get a quote?",
    answer:
      "Yes. A quote needs a few specifics to be worth anything — which document, which country issued it, and what it is for — because those are what the price is made of.\n\nLet me take those now and someone will come back to you with a figure and the steps behind it.",
    service: ATTESTATION,
    quote: true,
    phrases: [
      "can i get a quote",
      "i would like a quote",
      "send me a quote",
      "i want a quotation",
      "give me a price",
      "can you give me a price",
      "what would this cost",
      "how much will it be",
      "what will this cost me",
      "send me your rates",
      "what are your rates",
      "i need pricing",
      "i need a price",
    ],
    // Single words on purpose. This is the catch-all, and `matchByKeywords`
    // ranks by how many words of a group matched — so every more specific money
    // group in every module outranks these, and they only win when nothing else
    // claimed the question. A two-word group here would leave "i would like a
    // quote" owned by nobody, which is a paid model call where a callback
    // should be.
    keywords: [
      ["quote"],
      ["quotation"],
      ["rates"],
      ["pricing"],
      ["charge"],
      ["charges"],
      ["cost"],
      ["price"],
      ["fee"],
      ["fees"],
      ["estimate"],
      ["expensive"],
      ["afford"],
      ["ballpark"],
      // Two words, so it loses to every "<service> cost" group rather than
      // swallowing them, but still catches "how much am i looking at".
      ["how", "much"],
    ],
  },
  {
    id: "price-translation",
    question: "How much does legal translation cost?",
    answer:
      "Legal translation is normally priced per page and varies with the language pair and how technical the document is — a degree certificate and a fifty-page contract are not comparable.\n\nTell me what needs translating and someone will come back with a per-document figure rather than a range.",
    service: TRANSLATION,
    quote: true,
    phrases: [
      "how much does translation cost",
      "legal translation price",
      "translation charges dubai",
      "cost per page translation",
      "certified translation cost",
    ],
    keywords: [["translation", "cost"], ["translation", "price"], ["translation", "charges"]],
  },

  /* ── About us, and getting to a person ─────────────────────────────────── */
  {
    id: "meta-callback",
    question: "Can someone call me about this?",
    answer:
      "Yes. Tell me which of these it is about and I will take a few details so the right person calls you back.",
    service: null,
    faq: false,
    phrases: [
      "can someone call me",
      "i want to speak to someone",
      "call me back",
      "can i talk to a person",
      "contact me",
      "i need to speak to a human",
      "phone number",
      "whatsapp me",
    ],
    keywords: [["call", "me"], ["speak", "someone"], ["talk", "person"], ["call", "back"]],
    choices: [
      { label: "Attestation", to: "price-attestation" },
      { label: "Notarisation or a power of attorney", to: "not-what-it-costs" },
      { label: "Legal translation", to: "price-translation" },
    ],
  },
  {
    id: "meta-who-are-you",
    question: "Who are you, and do you do the work yourselves?",
    answer:
      "We are a UAE services company. Attestation, legal translation, notarisation and visa filing are regulated activities carried out by licensed providers, and for those our job is to work out exactly what your case needs, introduce you to a provider who can do it, and stay with it until you have the document.\n\nWe say which is which on every service page, because you should know who you are dealing with before you hand over an original certificate.",
    service: null,
    phrases: [
      "who are you",
      "are you an agency",
      "do you do the work yourself",
      "are you licensed",
      "what company is this",
      "about your company",
    ],
    keywords: [["are", "you", "licensed"]],
    next: ["att-who-does-it", "meta-document-safety", "meta-guarantee"],
  },
  {
    id: "meta-document-safety",
    question: "Is my original document safe with you?",
    answer:
      "Originals move by tracked courier, they are handed over against a signed receipt, and you should be able to find out which authority holds your document at any point.\n\nBefore sending anything anywhere, scan every page. It does not replace the original but it makes a re-issue far easier to request if something goes wrong.",
    service: null,
    phrases: [
      "is my document safe",
      "what if you lose my certificate",
      "document security",
      "can i trust you with my original",
      "who holds my documents",
    ],
    keywords: [["document", "safe"], ["lose", "my", "certificate"], ["trust", "original"]],
    next: ["att-courier-originals", "att-tracking", "meta-who-are-you"],
  },
  {
    id: "meta-guarantee",
    question: "Can you guarantee my documents will be accepted?",
    answer:
      "No, and nobody honestly can — acceptance is the receiving authority's decision, not a provider's.\n\nWhat can be done is to make sure the file does not fail on the things that are within anyone's control: the right chain in the right order, names matching the passport, originals rather than copies, and a certified translation where one is needed. That is where nearly every rejection comes from.",
    service: null,
    phrases: [
      "do you guarantee acceptance",
      "is it guaranteed",
      "will my documents definitely be accepted",
      "guarantee approval",
      "what if it gets rejected",
    ],
    keywords: [["guarantee", "accepted"], ["guarantee", "approval"]],
    next: ["att-rejection-reasons", "price-refund", "meta-who-are-you"],
  },
  {
    id: "meta-hours",
    question: "What are your working hours?",
    answer:
      "You can send a message here at any time and someone picks it up during UAE business hours, Monday to Saturday.\n\nGovernment authorities and notary offices keep their own hours, and those are usually what decides when a step can actually be taken.",
    service: null,
    faq: false,
    phrases: [
      "what are your working hours",
      "are you open now",
      "when are you available",
      "office timings",
      "are you open on friday",
    ],
    keywords: [["working", "hours"], ["office", "timings"], ["are", "you", "open"]],
    next: ["meta-callback", "not-how-to-book", "meta-who-are-you"],
  },
  {
    id: "meta-languages",
    question: "Which languages can I talk to you in?",
    answer:
      "Write to us in English or Arabic here and we will follow. Our team also covers several of the languages most common in the UAE, and if the call needs to be in one of those we will arrange it.\n\nThat is separate from legal translation, which has to be done by a translator licensed by the Ministry of Justice.",
    service: null,
    faq: false,
    phrases: [
      "do you speak arabic",
      "which languages do you support",
      "can we talk in hindi",
      "do you speak urdu",
      "language support",
    ],
    keywords: [["speak", "arabic"], ["languages", "support"], ["speak", "urdu"]],
    next: ["att-translation-needed", "meta-callback", "meta-who-are-you"],
  },
  {
    id: "meta-where",
    question: "Where are you based?",
    answer:
      "We are in the UAE and work across all the emirates. Most of what attestation involves happens without you going anywhere — documents move by courier and the only step that reliably needs a person present is a notary appointment.\n\nIf you would rather deal with someone in person, say so and we will arrange it.",
    service: null,
    faq: false,
    phrases: [
      "where are you located",
      "what is your address",
      "are you in dubai",
      "do you have an office",
      "can i come to your office",
    ],
    keywords: [["where", "located"], ["your", "address"], ["have", "office"]],
    next: ["meta-callback", "att-while-in-uae", "meta-hours"],
  },
];
