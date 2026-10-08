/**
 * The way into the two packs about being here rather than arriving.
 *
 * Six `subject` doors in the main flow — four for `./uae-life-flows.ts` and two
 * for `./triage-flows.ts` — and none of them answers anything. Matching one
 * loads that pack and the visitor's message is matched again inside it, in the
 * same turn. `lib/chat/flow/schema.ts`'s `subject` node has the mechanism.
 *
 * Both subjects are kept in one file because they share the problem that
 * shapes them: each sits against a pack that is already very good at
 * neighbouring questions, and a door that reaches too far breaks the
 * neighbour silently.
 *
 * THE UAE-LIFE DOORS, AND THE RELOCATION BORDER
 *
 * `./relocation-flows.ts` is 203 entries about the first six months and it
 * answers them better than a general door ever could. So these doors are
 * written for the words somebody uses *after* that: expiring, renewing,
 * complaining, disputing, cancelling, leaving. They deliberately do not claim
 * "moving to dubai", "finding a flat", "opening a bank account" or anything
 * else in the arrival vocabulary, and `tests/uae-life-flows.test.ts` walks
 * every relocation phrasing against them in both directions.
 *
 * Four doors rather than one, for the reason `./own-work-doors.ts` records:
 * `hintKeywords` caps an intent at twenty groups, so vocabulary breadth is
 * bought with doors, not with cleverer groups. A door costs one node, one
 * intent and one edge.
 *
 * THE TRIAGE DOORS, AND WHY THEY ARE NARROW
 *
 * `./translation-flows.ts` already has a "what the words mean" section and
 * `./attestation-flows.ts` owns the site-wide price catch-alls. A triage door
 * written as "attestation" or "translation" would take questions those packs
 * answer properly. So they are written for the *confusion itself* — "which do
 * I need", "what is the difference between", "what order" — which is a
 * phrasing neither pack claims, and the test asserts both directions.
 *
 * None of these doors carries a `priceGroups` set. Money questions about a
 * step belong to the pack that owns the step; the three quote entries inside
 * triage and the two inside the life pack are reached from the ordinary doors
 * once a conversation is already in there.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Matches `SUBJECTS` in scripts/seed-authored-flows.ts. */
export const UAE_LIFE = "uae-life";
export const TRIAGE = "triage";

const VISA = "visa-processing";
const ATTEST = "attestation";

/**
 * Each door's vocabulary, named so the pack behind it can answer it.
 *
 * A phrasing that opens a door and then matches nothing inside falls out to
 * the model — a paid reply to a question the pack was written for. The hubs in
 * `./uae-life-flows.ts` and `./triage-flows.ts` spread these in, which makes
 * the property true by construction. See ./own-work-doors.ts, where the same
 * gap was measured at 51 phrasings out of 88.
 */
export const EXPIRY_PHRASES = [
  "my emirates id is expiring",
  "my emirates id has expired",
  "my residence visa is about to expire",
  "my visa has expired what happens now",
  "i need to renew my residence",
  "my passport is running out and my visa is in it",
  "renewing my driving licence here",
  "my tenancy registration needs renewing",
  "i have overstayed my visa",
  "late renewal fine",
  "my car registration is due",
  "do i renew my passport or my visa first",
];

export const DISPUTE_PHRASES = [
  "who do i complain to in dubai",
  "how do i make a formal complaint here",
  "i want to complain about a company",
  "my landlord is raising the rent too much",
  "rental disputes centre case",
  "my deposit has not been returned",
  "the shop will not give me a refund",
  "my insurance claim was refused",
  "i have a complaint about my bank",
  "a contractor took my money and disappeared",
  "i cannot cancel my gym membership",
  "my employer is not following the contract",
  "consumer protection complaint uae",
  "i think a fine is wrong and want to object",
];

export const LEAVING_PHRASES = [
  "i am leaving the uae",
  "i am leaving the country for good",
  "exit checklist for leaving dubai",
  "what do i have to close down before i leave",
  "cancelling my residence visa",
  "who cancels my visa when i resign",
  "leaving the uae with a loan outstanding",
  "closing my bank account before i go",
  "end of service pay when i leave",
  "selling my car before leaving",
  "taking my pet out of the country",
  "can i come back after leaving",
  "do i need a clearance letter from my bank",
  "repatriation checklist",
];

export const RESIDENT_PHRASES = [
  "i have been here a while and something has come up",
  "what is uae pass and do i need it",
  "how do i check if i have fines",
  "black points on my licence",
  "i have had a car accident what do i do",
  "is there a credit score in the uae",
  "one of my cheques has bounced",
  "do i pay tax here",
  "should i make a will here",
  "we have had a baby here what has to be done",
  "how do i judge a school here",
  "can i go freelance while on an employment visa",
  "what is a travel ban",
  "can i stay here after i stop working",
  "my health insurance refused a claim",
  "how much annual leave am i entitled to",
];

export const WHICH_PHRASES = [
  "i do not know which of these services i need",
  "i am confused about what i need",
  "which service should i choose",
  "can you tell me what my case needs",
  "i have no idea where to start",
  "what is the difference between attestation and translation",
  "what is the difference between attestation and notarisation",
  "is legalisation different from attestation",
  "is equivalency the same as attestation",
  "do i need a notary or a lawyer",
  "do i need an interpreter or a translator",
  "which of these do i actually need",
  "can you tell me what my document needs",
  "my employer says one thing and the website says another",
  "is there a chance i do not need any of this",
  "who actually does all this",
];

export const ORDER_PHRASES = [
  "what order do these steps go in",
  "which comes first attestation or translation",
  "do i translate before or after attesting",
  "i did them in the wrong order",
  "someone already did part of this for me",
  "how do i know which steps are done",
  "can the steps be done in parallel",
  "i am in a hurry which step should i start today",
  "i have an apostille is that enough for the uae",
  "my document has some stamps already",
];

export const UAE_LIFE_DOORS: AuthoredFlow[] = [
  {
    id: "life-door-expiry",
    question: "Something of mine is expiring or has expired.",
    answer:
      "Renewals here depend on each other and the order matters. Tell us what is expiring and we will tell you what has to happen first.",
    service: VISA,
    opens: UAE_LIFE,
    phrases: [
      "something of mine is expiring or has expired",
      ...EXPIRY_PHRASES,
    ],
    // "expiring" and "expired" fold to one word under `sameWord`, so never
    // both in a group.
    keywords: [
      ["expired", "visa"],
      ["expired", "emirates"],
      ["renew", "residence"],
      ["renew", "licence"],
      ["renewal", "due"],
      ["overstayed"],
      ["keep", "renewing"],
      ["late", "renewal"],
    ],
    faq: false,
  },
  {
    id: "life-door-dispute",
    question: "I have a dispute and I do not know who hears it.",
    answer:
      "Almost every kind of dispute here has one body that hears it, and going to the wrong one costs weeks. Tell us who the argument is with.",
    service: null,
    opens: UAE_LIFE,
    phrases: [
      "i have a dispute and i do not know who hears it",
      ...DISPUTE_PHRASES,
    ],
    keywords: [
      ["who", "complain"],
      ["formal", "complaint"],
      ["dispute", "centre"],
      ["refused", "claim"],
      ["refund", "refusing"],
      ["deposit", "returned"],
      ["object", "fine"],
      ["complaint", "bank"],
    ],
    faq: false,
  },
  {
    id: "life-door-leaving",
    question: "I am leaving the UAE.",
    answer:
      "There is more to close down than most people allow time for, and the order matters because several things cannot be closed until others are. Tell us when you go.",
    service: VISA,
    opens: UAE_LIFE,
    phrases: [
      ...LEAVING_PHRASES,
    ],
    keywords: [
      ["leaving", "uae"],
      ["leaving", "country"],
      ["exit", "checklist"],
      ["cancelling", "residence"],
      ["close", "down", "before"],
      ["clearance", "letter"],
      ["come", "back", "after"],
    ],
    faq: false,
  },
  {
    id: "life-door-resident",
    question: "A question about living here as a resident.",
    answer:
      "The parts of living here that nobody explains because residents already know them — status changes, government services, schools, the car, health cover and money. Tell us what has come up.",
    service: null,
    opens: UAE_LIFE,
    phrases: [
      "a question about living here as a resident",
      ...RESIDENT_PHRASES,
    ],
    keywords: [
      ["already", "resident"],
      ["black", "points"],
      ["credit", "score"],
      ["bounced", "cheque"],
      ["travel", "ban"],
      ["make", "will"],
      ["uae", "pass"],
      ["check", "fines"],
    ],
    faq: false,
  },
];

export const TRIAGE_DOORS: AuthoredFlow[] = [
  {
    id: "pick-door-which",
    question: "I do not know which of these services I need.",
    answer:
      "That is the normal starting point. It usually comes down to two things: what the document is, and who is going to receive it.",
    service: ATTEST,
    opens: TRIAGE,
    // Written for the confusion rather than for the subject. "attestation" on
    // its own would take questions `./attestation-flows.ts` answers properly.
    phrases: [
      ...WHICH_PHRASES,
    ],
    keywords: [
      ["which", "service", "need"],
      ["confused", "about"],
      ["difference", "between"],
      ["which", "actually", "need"],
      ["no", "idea", "start"],
      ["not", "need", "any"],
    ],
    faq: false,
  },
  {
    id: "pick-door-order",
    question: "What order do these steps go in?",
    answer:
      "Country of issue first, always, and translation last. Tell us what has been done already and we will say what is left.",
    service: ATTEST,
    opens: TRIAGE,
    phrases: [
      ...ORDER_PHRASES,
    ],
    keywords: [
      ["order", "steps"],
      ["comes", "first"],
      ["wrong", "order"],
      ["already", "part"],
      ["steps", "parallel"],
      ["have", "apostille"],
    ],
    faq: false,
  },
];
