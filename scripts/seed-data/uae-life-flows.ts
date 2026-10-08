/**
 * Living here, after the move is over.
 *
 * `./relocation-flows.ts` answers the first six months — what to pack, what
 * happens at the airport, the residence chain, finding a flat, opening a bank
 * account, the first payslip. It ends roughly where someone stops feeling new.
 * This pack starts there, and it is about the things that only happen to people
 * who have been here a while: the renewal, the dispute, the change of status,
 * and eventually the leaving.
 *
 * WHERE THE BOUNDARY WITH RELOCATION IS
 *
 * The test of whether an entry belongs here is **could this happen in your
 * first fortnight?** Finding a flat is relocation's; a rent increase you want
 * to contest at the Rental Disputes Centre is this pack's. Opening an account
 * is relocation's; a bounced cheque is this pack's. Exchanging a driving
 * licence is relocation's; the police report after an accident is this pack's.
 *
 * That line was drawn after reading relocation's 203 entries rather than from
 * memory, and the sections below deliberately start where its sections stop.
 * Nineteen housing entries there, so housing here is renewal, notice,
 * disputes and moving out. Fifteen money entries there, so money here is
 * cheques, credit records, debt and closing down. Twelve health entries there,
 * so health here is claims, refusals and the things a resident discovers in
 * year three.
 *
 * WHY IT IS A SUBJECT PACK
 *
 * Two reasons, and the second one is new. The merged flow has about 124 nodes
 * of headroom and this is two hundred entries, so it does not fit — see the
 * `subject` node in `lib/chat/flow/schema.ts`.
 *
 * But the better reason is the boundary above. In the merged graph, every one
 * of these entries would compete with a relocation entry on a neighbouring
 * subject, and the loser of each pair would become unreachable with nothing
 * failing. Out here relocation is not in the room: the only place the two packs
 * can collide is the door, which is four intents, and
 * `tests/uae-life-flows.test.ts` walks every relocation phrasing against them.
 * The subject pack did not just make this affordable, it made it safe.
 *
 * WHAT MAY BE SAID HERE
 *
 * `lib/chat/prompt.ts`'s rules, and this pack strains two of them harder than
 * any other, because it is the one people arrive at when something has gone
 * wrong:
 *
 *   - **No legal advice, ever.** A quarter of this file is disputes — a
 *     landlord, an insurer, a bank, a former employer, a divorce. Each one
 *     names the body that hears it (the Rental Disputes Centre, MOHRE, the
 *     Central Bank's Sanadak, Consumer Protection at the Ministry of Economy,
 *     the courts) and stops. Naming the right door is useful and is not
 *     advice; telling someone what their contract means is advice and is not
 *     ours to give.
 *   - **No figure, threshold, deadline or eligibility rule stated as fact.**
 *     Rent caps, grace periods, notice periods, fine amounts, debt thresholds
 *     and visa conditions all change, and this is the pack whose readers are
 *     most likely to act immediately on a number. Say what it turns on, name
 *     who publishes it, and offer to have it confirmed.
 *
 * And the standing one: we write CVs and build websites. Everything here that
 * touches attestation, translation, notarisation or a visa filing is carried
 * out by licensed providers we introduce people to.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";
import { landDoorPhrases } from "./doors";
import {
  DISPUTE_PHRASES,
  EXPIRY_PHRASES,
  LEAVING_PHRASES,
  RESIDENT_PHRASES,
} from "./uae-life-doors";

const VISA = "visa-processing";
const ATTEST = "attestation";
const TRANSLATE = "legal-translation";
const NOTARY = "notary";
const BIZ = "business-setup";

/** A price word plus one noun — the inside-a-pack rule. */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

export const UAE_LIFE_FLOWS: AuthoredFlow[] = [
  /* ── Hubs ──────────────────────────────────────────────────────────────── */
  {
    id: "life-hub-start",
    question: "I have been here a while and something has come up.",
    answer:
      "Most of what catches residents out falls into four piles: something is expiring, something has gone wrong with a company or a landlord, something about your status is changing, or you are leaving. Which is it?",
    service: null,
    phrases: [
      "a question about living here as a resident",
      "i am already a resident and need help with something",
      "question about living in the uae long term",
    ],
    keywords: [["already", "resident"], ["living", "longer"]],
    faq: false,
    choices: [
      { label: "Something is expiring", to: "life-hub-renewals" },
      { label: "A dispute", to: "life-hub-disputes" },
      { label: "My status is changing", to: "life-hub-status" },
      { label: "I am leaving the UAE", to: "life-hub-leaving" },
      { label: "Everyday admin", to: "life-hub-admin" },
    ],
    next: ["life-hub-renewals", "life-hub-disputes", "life-hub-leaving"],
  },
  {
    id: "life-hub-renewals",
    question: "What do I have to keep renewing here?",
    answer:
      "More than people expect, and they fall due on different clocks: the residence visa and Emirates ID, the tenancy and its Ejari registration, health insurance, the driving licence, the car's registration and its test, and your passport underneath all of it. The trap is that several of them depend on each other.",
    service: VISA,
    phrases: [
      "something of mine is expiring or has expired",
      "what do i have to keep renewing here",
      "list of things that expire in the uae",
      "what renewals do residents have",
    ],
    keywords: [["keep", "renewing"], ["things", "expire"]],
    faq: false,
    choices: [
      { label: "Which depends on which", to: "life-renew-chain" },
      { label: "Something has already expired", to: "life-renew-expired" },
      { label: "My passport is running out", to: "life-renew-passport" },
      { label: "The car", to: "life-hub-car" },
    ],
    next: ["life-renew-chain", "life-renew-expired", "life-renew-reminders"],
  },
  {
    id: "life-hub-disputes",
    question: "Something has gone wrong and I do not know who to complain to.",
    answer:
      "Almost every kind of dispute here has one specific body that hears it, and going to the wrong one costs weeks. Tell me who the argument is with and I will name the right door — what I cannot do is tell you what your contract means, which is a lawyer's job.",
    service: null,
    phrases: [
      "something has gone wrong and i do not know who to complain to",
      "i have a dispute and i do not know who hears it",
      "where do i take a dispute",
    ],
    keywords: [["who", "complain"], ["formal", "complaint"], ["take", "dispute"]],
    faq: false,
    choices: [
      { label: "My landlord", to: "life-dispute-landlord" },
      { label: "A shop or a company", to: "life-dispute-consumer" },
      { label: "My insurer", to: "life-dispute-insurer" },
      { label: "A bank", to: "life-dispute-bank" },
      { label: "An employer", to: "life-dispute-employer" },
    ],
    next: ["life-dispute-landlord", "life-dispute-consumer", "life-dispute-employer"],
  },
  {
    id: "life-hub-status",
    question: "My situation is changing. Does my visa have to change with it?",
    answer:
      "Usually yes, and usually before the thing you are changing to starts rather than after. Leaving a job, going freelance, starting a company, a spouse's sponsorship ending, finishing a degree — each one has a window, and the windows are short. Which applies?",
    service: VISA,
    phrases: [
      "my situation is changing does my visa have to change with it",
      "i need to change my visa type",
      "switching from one visa to another",
    ],
    keywords: [["change", "visa"], ["switching", "visa"]],
    faq: false,
    choices: [
      { label: "Going freelance", to: "life-status-freelance" },
      { label: "Starting a company", to: "life-status-company" },
      { label: "Off my spouse's visa", to: "life-status-off-spouse" },
      { label: "Between jobs", to: "life-status-between-jobs" },
    ],
    next: ["life-status-between-jobs", "life-status-freelance", "life-status-grace"],
  },
  {
    id: "life-hub-leaving",
    question: "I am leaving the UAE. What has to be closed down?",
    answer:
      "More than most people allow time for, and the order matters because several things cannot be closed until others are. Debts and the bank come first and take longest; the visa cancellation is near the end, not the beginning. Where shall we start?",
    service: VISA,
    phrases: [
      "i am leaving the uae what has to be closed down",
      "moving away from the uae permanently",
    ],
    keywords: [["leaving", "uae"], ["exit", "checklist"], ["moving", "away"]],
    faq: false,
    choices: [
      { label: "The right order", to: "life-leave-order" },
      { label: "Loans and credit cards", to: "life-leave-debt" },
      { label: "My flat and utilities", to: "life-leave-tenancy" },
      { label: "The car", to: "life-leave-car" },
      { label: "Gratuity and final pay", to: "life-leave-gratuity" },
    ],
    next: ["life-leave-order", "life-leave-debt", "life-leave-gratuity"],
  },
  {
    id: "life-hub-admin",
    question: "What everyday admin should I know about?",
    answer:
      "The parts of living here that nobody explains because residents already know them: how government services actually work, what the fines system does, where your official address lives, and which app does what. Which do you want?",
    service: null,
    phrases: [
      "what everyday admin should i know about",
      "government services in the uae explained",
      "day to day paperwork as a resident",
    ],
    keywords: [["everyday", "admin"], ["government", "services"]],
    faq: false,
    choices: [
      { label: "UAE Pass and apps", to: "life-admin-uaepass" },
      { label: "Fines", to: "life-admin-fines" },
      { label: "My official address", to: "life-admin-address" },
      { label: "Getting documents from a UAE body", to: "life-admin-uae-documents" },
    ],
    next: ["life-admin-uaepass", "life-admin-fines", "life-admin-uae-documents"],
  },
  {
    id: "life-hub-car",
    question: "Questions about having a car here.",
    answer:
      "Owning one is more admin than driving one: registration and its annual test, insurance, fines and black points, and what happens after a scrape in a car park. Which part?",
    service: null,
    phrases: [
      "questions about having a car here",
      "car ownership admin in the uae",
      "what do i need to know about my vehicle",
    ],
    keywords: [["having", "car"], ["vehicle", "admin"]],
    faq: false,
    choices: [
      { label: "After an accident", to: "life-car-accident" },
      { label: "Fines and black points", to: "life-car-points" },
      { label: "Registration and testing", to: "life-car-registration" },
      { label: "Selling it", to: "life-car-selling" },
    ],
    next: ["life-car-accident", "life-car-points", "life-car-registration"],
  },
  {
    id: "life-hub-family",
    question: "Something has changed in my family.",
    answer:
      "Births, marriages, separations and deaths all produce documents here, and all of them have a registration step that is easier done immediately than later. Several also change somebody's visa. What has happened?",
    service: ATTEST,
    phrases: [
      "something has changed in my family",
      "family life events in the uae paperwork",
      "registering a family event here",
    ],
    keywords: [["changed", "family"], ["family", "event"]],
    faq: false,
    choices: [
      { label: "A baby", to: "life-family-birth" },
      { label: "A separation", to: "life-family-divorce" },
      { label: "A death", to: "life-family-death" },
      { label: "A will", to: "life-family-will" },
    ],
    next: ["life-family-birth", "life-family-will", "life-family-death"],
  },
  {
    id: "life-hub-health",
    question: "Questions about insurance and healthcare as a resident.",
    answer:
      "The ones that come up after the first year are rarely about finding a clinic — they are about what your policy actually covers, what to do when a claim is refused, and what changes when your employer or your insurer does. Which is it?",
    service: null,
    phrases: [
      "questions about insurance and healthcare as a resident",
      "my health insurance is not covering something",
      "healthcare admin in the uae",
    ],
    keywords: [["insurance", "resident"], ["healthcare", "admin"]],
    faq: false,
    choices: [
      { label: "A refused claim", to: "life-health-claim-refused" },
      { label: "Changing insurer", to: "life-health-changing" },
      { label: "Medicines", to: "life-health-medicines" },
      { label: "Having a baby", to: "life-health-maternity" },
    ],
    next: ["life-health-claim-refused", "life-health-changing", "life-health-medicines"],
  },
  {
    id: "life-hub-money",
    question: "Money questions that are not about my salary.",
    answer:
      "Credit, cheques, debt and tax — the four that behave differently here from almost anywhere else, and the four where getting it wrong has consequences beyond money. Which one?",
    service: null,
    phrases: [
      "money questions that are not about my salary",
      "credit and debt in the uae",
      "financial admin as a resident",
    ],
    keywords: [["credit", "debt"], ["financial", "admin"]],
    faq: false,
    choices: [
      { label: "Cheques", to: "life-money-cheque" },
      { label: "Loans and credit record", to: "life-money-credit-record" },
      { label: "Debt I cannot pay", to: "life-money-debt-trouble" },
      { label: "Tax", to: "life-money-tax" },
    ],
    next: ["life-money-cheque", "life-money-credit-record", "life-money-tax"],
  },

  /* ── Renewals and the things that expire ───────────────────────────────── */
  {
    id: "life-renew-chain",
    question: "Which renewals depend on which?",
    answer:
      "Your passport sits under everything — a residence visa cannot outlast it, so a passport close to expiry limits the visa you can be issued. The visa then gates the Emirates ID, and the Emirates ID gates most other things: a tenancy registration, a driving licence renewal, a bank account staying open. Renew from the bottom up.",
    service: VISA,
    phrases: [
      "which renewals depend on which",
      "what order should i renew things in",
      "my passport and visa expire around the same time",
    ],
    keywords: [["renewals", "depend"], ["order", "renew"]],
    next: ["life-renew-passport", "life-renew-expired", "life-renew-reminders"],
  },
  {
    id: "life-renew-passport",
    question: "My passport is running out. What do I do first?",
    answer:
      "Renew the passport before anything else, through your own embassy or consulate, because the new one has to be linked to your residence file afterwards. Leaving it until the visa renewal is due is how people end up doing both at once under time pressure.",
    service: VISA,
    phrases: [
      "my passport is running out what do i do first",
      "renewing my passport while living in dubai",
      "new passport and my residence visa",
    ],
    keywords: [["passport", "running", "out"], ["new", "passport", "visa"]],
    next: ["life-renew-chain", "life-renew-passport-link", "life-admin-uae-documents"],
  },
  {
    id: "life-renew-passport-link",
    question: "I have a new passport. Does my visa move across automatically?",
    answer:
      "No. The residence stamp or record is tied to the old passport number and has to be updated, and until it is you can hit trouble at immigration and at any counter that checks it. Your employer's PRO usually handles this; if you are self-sponsored it is yours to arrange.",
    service: VISA,
    phrases: [
      "i have a new passport does my visa move across automatically",
      "transferring my residence to a new passport",
      "old passport has my visa in it",
    ],
    keywords: [["new", "passport", "transfer"], ["old", "passport", "visa"]],
    next: ["life-renew-passport", "life-renew-chain", "life-admin-uaepass"],
  },
  {
    id: "life-renew-expired",
    question: "Something has already expired. How much trouble am I in?",
    answer:
      "Usually fixable, usually with a fine that grows the longer it is left, and the fine is rarely the real problem — an expired residence or ID blocks things you need while sorting it out. Deal with it now rather than reading about it: the amounts and the grace periods change and are set by the authority, not by us.",
    service: VISA,
    phrases: [
      "something has already expired how much trouble am i in",
      "my emirates id expired",
      "my visa expired what happens now",
      "overstayed by a few days",
    ],
    keywords: [["already", "expired"], ["overstayed", "days"]],
    next: ["life-renew-fines-grow", "life-status-grace", "life-renew-chain"],
  },
  {
    id: "life-renew-fines-grow",
    question: "Do late fines keep increasing?",
    answer:
      "On most things here, yes — they accrue per day rather than sitting at a flat amount, which is why a small lapse becomes an expensive one over a holiday period. The rate and any cap are the issuing authority's and change; check with them rather than relying on a figure you read anywhere, including here.",
    service: VISA,
    phrases: [
      "do late fines keep increasing",
      "does the overstay fine go up every day",
      "is there a maximum fine",
    ],
    keywords: [["fines", "increasing"], ["fine", "every", "day"]],
    next: ["life-renew-expired", "life-admin-fines"],
  },
  {
    id: "life-renew-reminders",
    question: "How do people keep track of all these dates?",
    answer:
      "Badly, mostly, which is why the fines exist. The practical answer is one calendar with every expiry on it and a reminder two months out, not one: most renewals need a document from somewhere else first, and two months is roughly how long getting that takes when it goes wrong.",
    service: null,
    phrases: [
      "how do people keep track of all these dates",
      "reminder system for uae renewals",
      "i keep missing renewal dates",
    ],
    keywords: [["keep", "track", "dates"], ["missing", "renewal"]],
    next: ["life-renew-chain", "life-admin-uaepass", "life-renew-expired"],
  },
  {
    id: "life-renew-insurance",
    question: "My health insurance renewal changed the cover.",
    answer:
      "That happens at every renewal and the changes are often in the network and the limits rather than the premium — the same policy name can mean a different list of hospitals a year later. Read the new table of benefits before you need it, not after a claim is refused.",
    service: null,
    phrases: [
      "my health insurance renewal changed the cover",
      "my insurer changed my network",
      "policy renewed with different benefits",
    ],
    keywords: [["renewal", "changed", "cover"], ["changed", "network"]],
    next: ["life-health-claim-refused", "life-health-changing", "life-hub-health"],
  },
  {
    id: "life-renew-ejari",
    question: "Does the tenancy registration need renewing every year?",
    answer:
      "Yes, with each new contract, and it is not optional paperwork: it is what a utility transfer, a visa application and sometimes a school admission are checked against. A tenancy that was never registered usually surfaces at the worst moment, when something else needs it.",
    service: null,
    phrases: [
      "does the tenancy registration need renewing every year",
      "do i have to renew ejari",
      "my landlord did not register the contract",
    ],
    keywords: [["tenancy", "registration", "renew"], ["renew", "ejari"]],
    next: ["life-house-renewal", "life-dispute-landlord", "life-admin-address"],
  },
  {
    id: "life-renew-licence",
    question: "When does a UAE driving licence need renewing?",
    answer:
      "On its own cycle, and the renewal usually needs a current eye test and a valid residence — so an expired visa quietly blocks it. Driving on an expired licence is treated seriously and insurers lean on it after an accident, which is the part that costs real money.",
    service: null,
    phrases: [
      "when does a uae driving licence need renewing",
      "renewing my dubai driving licence",
      "driving on an expired licence",
    ],
    keywords: [["driving", "licence", "renewing"], ["expired", "licence"]],
    next: ["life-car-registration", "life-car-accident", "life-renew-chain"],
  },

  /* ── Housing, after the first contract ─────────────────────────────────── */
  {
    id: "life-house-renewal",
    question: "My tenancy is coming up for renewal. What should I be doing?",
    answer:
      "Start earlier than feels necessary, because both sides have to give notice within a window set by law and a late conversation removes your options. If the landlord wants an increase, that is governed rather than freely negotiable — the emirate publishes an index that bounds it.",
    service: null,
    phrases: [
      "my tenancy is coming up for renewal what should i be doing",
      "renewing my lease in dubai",
      "landlord wants to renew at a higher rent",
    ],
    keywords: [["tenancy", "renewal"], ["renewing", "lease"]],
    next: ["life-house-increase", "life-house-notice", "life-dispute-landlord"],
  },
  {
    id: "life-house-increase",
    question: "My landlord wants to raise the rent a lot. Can they?",
    answer:
      "Only within what the emirate's rental index allows for a property like yours, and only with proper notice — an increase announced a fortnight before renewal generally is not valid. The index is published by the land department and is the thing to check; the Rental Disputes Centre hears it if you disagree.",
    service: null,
    phrases: [
      "my landlord wants to raise the rent a lot can they",
      "is this rent increase legal",
      "rera rental index",
      "how much can rent go up",
    ],
    keywords: [["raise", "rent"], ["rent", "increase", "legal"], ["rental", "index"]],
    next: ["life-dispute-landlord", "life-house-notice", "life-house-renewal"],
  },
  {
    id: "life-house-notice",
    question: "How much notice does either side have to give?",
    answer:
      "A set period before the contract ends, in writing and in a form that can be proved — and the requirement runs both ways, so a landlord wanting the property back faces it too. The exact period and the accepted method of serving it are set by the emirate's tenancy law; confirm yours rather than relying on what a friend did.",
    service: null,
    phrases: [
      "how much notice does either side have to give",
      "notice period to leave my flat",
      "landlord gave me notice to vacate",
    ],
    keywords: [["notice", "period"], ["notice", "vacate"]],
    next: ["life-house-eviction", "life-house-renewal", "life-dispute-landlord"],
  },
  {
    id: "life-house-eviction",
    question: "I have been told to leave the property.",
    answer:
      "There are only a few grounds a landlord can rely on and each carries its own notice requirement, so the first thing to establish is which one has been used and whether it was served properly. The Rental Disputes Centre is where this is decided — not between you and the agent — and it is worth getting legal help rather than negotiating blind.",
    service: null,
    phrases: [
      "i have been told to leave the property",
      "eviction notice from my landlord",
      "landlord says he is selling and i must go",
    ],
    keywords: [["told", "leave", "property"], ["eviction", "notice"]],
    next: ["life-dispute-landlord", "life-house-notice", "life-house-deposit"],
  },
  {
    id: "life-house-deposit",
    question: "My deposit has not come back.",
    answer:
      "The usual sticking point is what counts as fair wear and tear versus damage, and the usual mistake is having no record of the condition at move-in. Photographs with dates settle most of it. Where it cannot be settled, this is a tenancy dispute and goes to the same centre as any other.",
    service: null,
    phrases: [
      "my deposit has not come back",
      "landlord is keeping my security deposit",
      "how do i get my deposit refunded",
    ],
    keywords: [["deposit", "back"], ["security", "deposit"]],
    next: ["life-dispute-landlord", "life-house-moving-out", "life-house-maintenance"],
  },
  {
    id: "life-house-maintenance",
    question: "The landlord will not fix anything.",
    answer:
      "Major maintenance is normally the owner's responsibility and minor upkeep the tenant's, unless your contract says otherwise — so the contract is the first thing to read. Put every request in writing from the start, because a dispute about repairs is won on the paper trail rather than on who is right.",
    service: null,
    phrases: [
      "the landlord will not fix anything",
      "who pays for repairs in a rented flat",
      "my ac has been broken for weeks",
    ],
    keywords: [["landlord", "fix"], ["pays", "repairs"]],
    next: ["life-dispute-landlord", "life-house-deposit", "life-house-renewal"],
  },
  {
    id: "life-house-leaving-early",
    question: "I need to break my tenancy early.",
    answer:
      "Most contracts here set a penalty for it, commonly expressed as a number of months' rent, and it is a contractual matter rather than a legal right — so what you owe is whatever you signed. Talk to the landlord before stopping payment: an agreed early exit is nearly always cheaper than a defended one.",
    service: null,
    phrases: [
      "i need to break my tenancy early",
      "early termination of my lease",
      "leaving my flat before the contract ends",
    ],
    keywords: [["break", "tenancy"], ["early", "termination"]],
    next: ["life-leave-tenancy", "life-house-deposit", "life-dispute-landlord"],
  },
  {
    id: "life-house-subletting",
    question: "Can I sublet a room?",
    answer:
      "Only with the landlord's written consent in most contracts, and informal arrangements are common and risky — they can void the tenancy and complicate anything that relies on the registration, including a visa application. Get it in writing or do not do it.",
    service: null,
    phrases: [
      "can i sublet a room",
      "is room sharing allowed in dubai",
      "renting out a spare room",
    ],
    keywords: [["sublet", "room"], ["room", "sharing"]],
    next: ["life-house-renewal", "life-admin-address", "life-dispute-landlord"],
  },
  {
    id: "life-house-moving-out",
    question: "What has to be done when I move out of a flat?",
    answer:
      "Final utility bills settled and the account closed, a clearance from the building, the property returned in the condition the contract requires, and the tenancy registration ended. Each produces a piece of paper somebody later asks for — particularly if you are leaving the country.",
    service: null,
    phrases: [
      "what has to be done when i move out of a flat",
      "moving out checklist dubai",
      "clearance certificate from my building",
    ],
    keywords: [["move", "out", "flat"], ["clearance", "building"]],
    next: ["life-leave-tenancy", "life-house-deposit", "life-leave-order"],
  },
  {
    id: "life-house-buying",
    question: "Should I buy rather than keep renting?",
    answer:
      "That is a financial decision rather than a paperwork one and depends on how long you intend to stay, which nobody here can judge for you. What is worth knowing is that ownership is only permitted in designated areas for most nationalities, and that the purchase costs beyond the price are substantial. Speak to the land department and a mortgage adviser, not to us.",
    service: null,
    phrases: [
      "should i buy rather than keep renting",
      "can expats buy property in dubai",
      "buying a flat as a resident",
    ],
    keywords: [["buy", "rather", "renting"], ["expats", "buy", "property"]],
    next: ["life-house-renewal", "life-money-credit-record", "life-hub-money"],
  },
  {
    id: "life-house-service-charges",
    question: "What are service charges and who sets them?",
    answer:
      "An annual charge owners pay towards the building's upkeep, set per square foot and approved by the regulator rather than invented by the developer. Tenants do not usually pay them directly but do pay for them indirectly, and owners can query them with the land department.",
    service: null,
    phrases: [
      "what are service charges and who sets them",
      "building service fees in dubai",
      "owners association charges",
    ],
    keywords: [["service", "charges"], ["owners", "association"]],
    next: ["life-house-buying", "life-house-maintenance", "life-dispute-landlord"],
  },

  /* ── Disputes, and who hears them ──────────────────────────────────────── */
  {
    id: "life-dispute-landlord",
    question: "How do I take a landlord to a dispute?",
    answer:
      "Through the emirate's rental disputes body — in Dubai the Rental Disputes Centre, with equivalents elsewhere — and the case is built on documents: the contract, the registration, the notice served, the payment record, the written requests. Filing has a fee and a form, and a case with no paper trail rarely survives.",
    service: null,
    phrases: [
      "how do i take a landlord to a dispute",
      "rental disputes centre case",
      "suing my landlord in dubai",
      "tenant rights complaint",
    ],
    keywords: [["landlord", "dispute"], ["rental", "disputes"], ["tenant", "complaint"]],
    next: ["life-house-increase", "life-house-deposit", "life-dispute-lawyer"],
  },
  {
    id: "life-dispute-consumer",
    question: "A shop or a company has taken my money and not delivered.",
    answer:
      "Consumer complaints go to the Ministry of Economy's consumer protection service, or to the economic department of the emirate where the business is licensed — and naming the licence is what makes a complaint stick. Keep the invoice and every message; most of these are settled once a regulator asks the company for its side.",
    service: null,
    phrases: [
      "a shop or a company has taken my money and not delivered",
      "consumer complaint in the uae",
      "i want a refund and they are refusing",
      "how do i report a business",
    ],
    keywords: [["consumer", "complaint"], ["refund", "refusing"], ["report", "business"]],
    next: ["life-dispute-online", "life-dispute-contractor", "life-dispute-lawyer"],
  },
  {
    id: "life-dispute-online",
    question: "I ordered something online and it never arrived.",
    answer:
      "If the seller is licensed here, it is an ordinary consumer complaint and the economic department will take it. If the seller is overseas, your realistic route is the payment provider's chargeback process rather than a UAE regulator — which is a reason to pay by card rather than by transfer.",
    service: null,
    phrases: [
      "i ordered something online and it never arrived",
      "online shopping dispute uae",
      "chargeback for a purchase",
    ],
    keywords: [["ordered", "online"], ["online", "dispute"], ["chargeback", "purchase"]],
    next: ["life-dispute-consumer", "life-dispute-bank", "life-money-card-fraud"],
  },
  {
    id: "life-dispute-contractor",
    question: "A contractor took a deposit and disappeared.",
    answer:
      "Check first whether they were licensed for the work at all, because that changes both the complaint and your chances — an unlicensed trader is a police matter rather than a regulatory one. Where they are licensed, the economic department of their emirate is the route, and the licence number on the quote is what you need.",
    service: null,
    phrases: [
      "a contractor took a deposit and disappeared",
      "builder did not finish the work",
      "handyman took my money",
    ],
    keywords: [["contractor", "deposit"], ["builder", "finish"]],
    next: ["life-dispute-consumer", "life-dispute-police", "life-dispute-lawyer"],
  },
  {
    id: "life-dispute-telecom",
    question: "I cannot get out of a phone or internet contract.",
    answer:
      "Complain to the provider first and get a reference number, because the regulator will ask whether you did. If that fails it goes to the telecoms regulator, the TDRA, which handles consumer complaints about licensed operators. An unpaid dispute left to run can reach a credit record, so do not simply stop paying.",
    service: null,
    phrases: [
      "i cannot get out of a phone or internet contract",
      "complaint about my telecom provider",
      "etisalat or du billing dispute",
    ],
    keywords: [["phone", "contract"], ["telecom", "complaint"]],
    next: ["life-dispute-consumer", "life-money-credit-record", "life-leave-utilities"],
  },
  {
    id: "life-dispute-gym",
    question: "A gym or a club will not cancel my membership.",
    answer:
      "Read what you signed first — many of these are fixed-term and the cancellation terms are the whole argument. Where the contract allows it and they still refuse, it is a consumer complaint like any other and the economic department of their emirate is the right door.",
    service: null,
    phrases: [
      "a gym or a club will not cancel my membership",
      "cancelling a gym contract in dubai",
      "stuck in a subscription",
    ],
    keywords: [["gym", "membership"], ["cancelling", "subscription"]],
    next: ["life-dispute-consumer", "life-dispute-telecom"],
  },
  {
    id: "life-dispute-insurer",
    question: "My insurer has refused a claim.",
    answer:
      "Ask for the refusal in writing with the policy clause it relies on — that single request resolves a surprising share of them. If it stands, health insurance complaints go to the health authority that regulates the policy in your emirate, and other insurance to the Central Bank, which now supervises insurers.",
    service: null,
    phrases: [
      "my insurer has refused a claim",
      "insurance company rejected my claim",
      "complain about an insurer in the uae",
    ],
    keywords: [["insurer", "refused"], ["rejected", "claim"]],
    next: ["life-health-claim-refused", "life-dispute-bank", "life-hub-health"],
  },
  {
    id: "life-dispute-bank",
    question: "I have a complaint about a bank.",
    answer:
      "The bank's own complaints process first, with a reference number, and then Sanadak — the independent ombudsman unit for banking and insurance complaints that the Central Bank established. It is free to the consumer and it is the right escalation; a social media post is not.",
    service: null,
    phrases: [
      "i have a complaint about a bank",
      "how do i escalate a banking problem",
      "central bank complaint uae",
      "sanadak ombudsman",
    ],
    keywords: [["complaint", "bank"], ["escalate", "banking"], ["ombudsman"]],
    next: ["life-money-card-fraud", "life-money-credit-record", "life-dispute-lawyer"],
  },
  {
    id: "life-dispute-employer",
    question: "I have a problem with my employer.",
    answer:
      "Labour complaints go to MOHRE for mainland employment, or to the free zone authority if you are employed in one — and they have their own mediation stage before anything reaches a court. Do not resign, sign anything, or hand over your passport while a dispute is live without getting proper advice first.",
    service: null,
    phrases: [
      "i have a problem with my employer",
      "labour complaint mohre",
      "my company is not following the contract",
      "unpaid salary complaint",
    ],
    keywords: [["problem", "employer"], ["labour", "complaint"], ["unpaid", "salary"]],
    next: ["life-dispute-lawyer", "life-status-between-jobs", "life-leave-gratuity"],
  },
  {
    id: "life-dispute-police",
    question: "When is something a police matter rather than a complaint?",
    answer:
      "Where there is an allegation of a crime rather than a disagreement about a contract — fraud, theft, threats, an accident with injury. The police app or station takes it, and once a case is filed it runs on its own track. Anything that might become criminal is a point to get legal advice before speaking, not after.",
    service: null,
    phrases: [
      "when is something a police matter rather than a complaint",
      "should i go to the police in dubai",
      "how do i file a police report",
    ],
    keywords: [["police", "matter"], ["file", "police", "report"]],
    next: ["life-dispute-lawyer", "life-car-accident", "life-dispute-contractor"],
  },
  {
    id: "life-dispute-lawyer",
    question: "When do I actually need a lawyer?",
    answer:
      "Any time money or your status is seriously at risk, anything that could become criminal, and anything going to a court rather than to a regulator. Many firms here will give an initial view cheaply. What we can do is tell you which body hears your issue; what the law says about your case is not ours to say.",
    service: null,
    phrases: [
      "when do i actually need a lawyer",
      "do i need legal advice for this",
      "finding a lawyer in dubai",
    ],
    keywords: [["need", "lawyer"], ["legal", "advice"]],
    next: ["life-dispute-translate", "life-hub-disputes"],
  },
  {
    id: "life-dispute-translate",
    question: "Do my documents need translating for a case?",
    answer:
      "Anything going before a UAE court or prosecutor does, into Arabic, by a translator licensed by the Ministry of Justice — and the standard is stricter than for an employer's file. That is a service we can arrange through a licensed translator; the case itself is your lawyer's.",
    service: TRANSLATE,
    phrases: [
      "do my documents need translating for a case",
      "court translation requirements",
      "legal translation for my dispute",
    ],
    keywords: [["documents", "translating", "case"], ["court", "translation"]],
    next: ["life-dispute-lawyer", "life-admin-uae-documents"],
  },

  /* ── When your status changes ──────────────────────────────────────────── */
  {
    id: "life-status-between-jobs",
    question: "I have left my job. How long can I stay?",
    answer:
      "There is a grace period after a residence visa is cancelled, and it is shorter than most people assume and counted from the cancellation rather than from your last working day. The exact length depends on the visa type and the rules change, so confirm it with ICP or GDRFA immediately rather than planning around a number.",
    service: VISA,
    phrases: [
      "i have left my job how long can i stay",
      "grace period after visa cancellation",
      "how long before i have to leave after losing my job",
    ],
    keywords: [["left", "job", "stay"], ["grace", "period"]],
    next: ["life-status-grace", "life-status-job-hunting", "life-leave-order"],
  },
  {
    id: "life-status-grace",
    question: "What happens when the grace period runs out?",
    answer:
      "You start accruing overstay fines per day and your position gets harder rather than simply more expensive — it affects what you can be issued next. If a new job is close, a new employer can usually start the process inside the window; if it is not, leaving and returning is often cheaper than staying.",
    service: VISA,
    phrases: [
      "what happens when the grace period runs out",
      "overstaying after my visa is cancelled",
      "i am out of time on my grace period",
    ],
    keywords: [["grace", "runs", "out"], ["overstaying", "cancelled"]],
    next: ["life-status-between-jobs", "life-renew-expired", "life-leave-order"],
  },
  {
    id: "life-status-job-hunting",
    question: "Can I stay and look for work?",
    answer:
      "There are permits intended for exactly that, with their own conditions about qualifications and previous employment, and whether you qualify is ICP's decision rather than anyone else's. It is worth asking about before your current visa is cancelled, not after.",
    service: VISA,
    phrases: [
      "can i stay and look for work",
      "job seeker visa uae",
      "staying in the country while unemployed",
    ],
    keywords: [["stay", "look", "work"], ["job", "seeker", "visa"]],
    next: ["life-status-between-jobs", "life-status-visit-switch", "life-status-grace"],
  },
  {
    id: "life-status-visit-switch",
    question: "Can I switch from a visit visa to a work visa without leaving?",
    answer:
      "Sometimes, through a status change done inside the country, and sometimes not — it depends on the visa you hold and on current rules. An employer's PRO or a typing centre will know the position this month; it is one of the things that changes most often.",
    service: VISA,
    phrases: [
      "can i switch from a visit visa to a work visa without leaving",
      "status change inside the country",
      "do i have to exit and re enter",
    ],
    keywords: [["switch", "visit", "work"], ["status", "change"]],
    next: ["life-status-job-hunting", "life-status-between-jobs"],
  },
  {
    id: "life-status-freelance",
    question: "I want to go freelance. What changes?",
    answer:
      "Your sponsorship does. A freelance permit with the right authority or free zone replaces an employer as the thing your residence hangs on, and it brings its own renewals and its own insurance requirement. The permit comes first and the visa follows it.",
    service: BIZ,
    phrases: [
      "i want to go freelance what changes",
      "moving from employment to freelance here",
      "freelance permit and my visa",
    ],
    keywords: [["go", "freelance"], ["freelance", "permit", "visa"]],
    next: ["life-status-company", "life-money-tax-freelance", "life-status-between-jobs"],
  },
  {
    id: "life-status-company",
    question: "I want to start a company while employed. Can I?",
    answer:
      "It depends on your employment contract and on the licence you want, and doing it quietly is the version that goes wrong — a second economic activity is visible. Get your employer's position in writing first; the licensing side is a separate question we can scope.",
    service: BIZ,
    phrases: [
      "i want to start a company while employed can i",
      "side business while on an employment visa",
      "noc from my employer for a licence",
    ],
    keywords: [["company", "while", "employed"], ["side", "business"]],
    next: ["life-status-freelance", "life-money-tax-freelance", "life-hub-status"],
  },
  {
    id: "life-status-off-spouse",
    question: "I am on my spouse's visa and want my own.",
    answer:
      "Usually possible and often worth it, because a dependent visa ends if the sponsor's does. Working on a family visa generally needs a work permit even though the residence is already in place — the permit and the visa are two separate things and people assume they are one.",
    service: VISA,
    phrases: [
      "i am on my spouse's visa and want my own",
      "working on a family visa",
      "transferring from dependent to employment visa",
    ],
    keywords: [["spouse", "visa", "own"], ["working", "family", "visa"]],
    next: ["life-status-sponsor-ends", "life-status-between-jobs", "life-hub-status"],
  },
  {
    id: "life-status-sponsor-ends",
    question: "My sponsor's visa is ending. What happens to mine?",
    answer:
      "A dependent's residence is tied to the sponsor's, so it ends with it and the same grace period logic applies. If you intend to stay, start arranging your own sponsorship before the sponsor's is cancelled rather than after — the window afterwards is tight.",
    service: VISA,
    phrases: [
      "my sponsor's visa is ending what happens to mine",
      "my husband lost his job and i am on his visa",
      "dependent visa when the sponsor leaves",
    ],
    keywords: [["sponsor", "visa", "ending"], ["dependent", "sponsor", "leaves"]],
    next: ["life-status-off-spouse", "life-status-grace", "life-family-divorce"],
  },
  {
    id: "life-status-long-term",
    question: "Is there a way to stay that does not depend on an employer?",
    answer:
      "There are long-term residence routes with their own criteria — investment, property, specialised talent, and others — and eligibility is assessed by ICP against published conditions that are revised periodically. Whether you qualify is their decision; what we can do is help you get the documents a application needs in order.",
    service: VISA,
    phrases: [
      "is there a way to stay that does not depend on an employer",
      "golden visa eligibility",
      "long term residence uae",
      "self sponsored residence",
    ],
    keywords: [["not", "depend", "employer"], ["golden", "visa"], ["long", "term", "residence"]],
    next: ["life-status-freelance", "life-house-buying", "life-hub-status"],
  },
  {
    id: "life-status-unemployment-insurance",
    question: "What is the unemployment insurance scheme?",
    answer:
      "A mandatory scheme for most employees that pays a limited benefit for a limited period after involuntary job loss, funded by a small subscription you pay. Missing the subscription attracts a penalty, which is how most people find out about it. The scheme's own site has the current terms.",
    service: null,
    phrases: [
      "what is the unemployment insurance scheme",
      "iloe subscription",
      "do i have to pay unemployment insurance",
    ],
    keywords: [["unemployment", "insurance"], ["iloe", "subscription"]],
    next: ["life-status-between-jobs", "life-admin-fines"],
  },
  {
    id: "life-status-absence",
    question: "I need to be out of the country for several months.",
    answer:
      "A residence visa can lapse if you are outside the UAE for longer than the permitted continuous period, and the limit differs by visa type — long-term routes are more forgiving than standard employment ones. If a long absence is coming, check the rule for your specific visa with ICP before you go.",
    service: VISA,
    phrases: [
      "i need to be out of the country for several months",
      "how long can i stay outside the uae",
      "will my residence lapse if i am away",
    ],
    keywords: [["out", "country", "months"], ["stay", "outside", "uae"]],
    next: ["life-status-long-term", "life-renew-chain", "life-leave-order"],
  },

  /* ── Leaving ───────────────────────────────────────────────────────────── */
  {
    id: "life-leave-order",
    question: "What is the right order to close everything down?",
    answer:
      "Debts and anything with a notice period first, because they take longest: loans settled, credit cards closed with a liability letter, the tenancy ended, schools notified, utilities closed. The visa cancellation and the bank account come near the end — closing the account too early leaves you unable to pay the bills still arriving.",
    service: VISA,
    phrases: [
      "what is the right order to close everything down",
      "sequence for leaving the uae",
      "what do i do first when leaving",
    ],
    keywords: [["order", "close", "everything"], ["sequence", "leaving"]],
    next: ["life-leave-debt", "life-leave-bank", "life-leave-tenancy"],
  },
  {
    id: "life-leave-debt",
    question: "What happens to my loans and credit cards?",
    answer:
      "They have to be settled, and leaving with an unpaid facility is treated seriously — it can result in a case and a travel ban that only surfaces when you try to return. Ask each bank for a liability letter and then a clearance letter once paid; the clearance is the document that matters later.",
    service: null,
    phrases: [
      "what happens to my loans and credit cards",
      "leaving the uae with debt",
      "do i need a clearance letter from my bank",
      "can i leave with an unpaid credit card",
    ],
    keywords: [["loans", "credit", "cards"], ["leaving", "debt"], ["clearance", "letter"]],
    next: ["life-money-debt-trouble", "life-leave-bank", "life-leave-order"],
  },
  {
    id: "life-leave-bank",
    question: "When should I close my bank account?",
    answer:
      "Last, and not before the final salary, the gratuity and any deposit refunds have landed. Keep it open long enough for stray direct debits to clear, then close it formally and ask for written confirmation — an account left dormant rather than closed can cause problems on a return.",
    service: null,
    phrases: [
      "when should i close my bank account",
      "closing my uae bank account when leaving",
      "can i keep my account after i leave",
    ],
    keywords: [["close", "bank", "account"], ["keep", "account", "after"]],
    next: ["life-leave-debt", "life-leave-gratuity", "life-leave-order"],
  },
  {
    id: "life-leave-gratuity",
    question: "How does end-of-service pay work when I leave?",
    answer:
      "It is calculated on your basic salary and your length of service, with the formula set by the labour law and varying with how the employment ended. Ask for the calculation in writing before you sign anything final — disputes about it go to MOHRE, and once you have signed a settlement your position is much weaker.",
    service: null,
    phrases: [
      "how does end of service pay work when i leave",
      "gratuity calculation uae",
      "my final settlement looks wrong",
    ],
    keywords: [["end", "service", "pay"], ["gratuity", "calculation"], ["final", "settlement"]],
    next: ["life-dispute-employer", "life-leave-order", "life-leave-debt"],
  },
  {
    id: "life-leave-tenancy",
    question: "How do I end the tenancy properly?",
    answer:
      "Notice in the form and timeframe the contract requires, then a final inspection, final utility bills, a building clearance and the registration ended. Leaving any of those open delays the deposit and can leave a bill chasing you after you have gone.",
    service: null,
    phrases: [
      "how do i end the tenancy properly",
      "cancelling my lease when leaving the country",
      "final inspection of my flat",
    ],
    keywords: [["end", "tenancy", "properly"], ["cancelling", "lease", "leaving"]],
    next: ["life-house-moving-out", "life-leave-utilities", "life-house-deposit"],
  },
  {
    id: "life-leave-utilities",
    question: "What about DEWA, internet and the rest?",
    answer:
      "Each needs closing rather than simply stopping payment, and each issues a final bill and a clearance — the utility clearance is usually required before a deposit is returned. Telecoms contracts often have a notice period of their own, so start them early.",
    service: null,
    phrases: [
      "what about dewa internet and the rest",
      "closing my utility accounts",
      "final dewa bill before leaving",
    ],
    keywords: [["closing", "utility"], ["final", "dewa"]],
    next: ["life-leave-tenancy", "life-dispute-telecom", "life-leave-order"],
  },
  {
    id: "life-leave-car",
    question: "What do I do with the car?",
    answer:
      "Sell it or export it, and either way the finance has to be cleared first and the fines paid — ownership cannot transfer with either outstanding. Deregistering and cancelling the insurance come after the sale, and the buyer usually wants the transfer done the same day.",
    service: null,
    phrases: [
      "what do i do with the car",
      "selling my car before leaving the uae",
      "exporting my car",
      "car loan when i leave",
    ],
    keywords: [["do", "with", "car"], ["selling", "car", "leaving"], ["exporting", "car"]],
    next: ["life-car-selling", "life-leave-debt", "life-leave-order"],
  },
  {
    id: "life-leave-visa-cancel",
    question: "Who cancels my residence visa?",
    answer:
      "Your sponsor — the employer, or you if you are self-sponsored — and it is a formal process rather than something that lapses on its own. Dependents you sponsor are cancelled first. Get proof of the cancellation; it is sometimes asked for years later.",
    service: VISA,
    phrases: [
      "who cancels my residence visa",
      "visa cancellation process when leaving",
      "do i have to cancel my visa before i go",
    ],
    keywords: [["cancels", "residence", "visa"], ["cancellation", "process"]],
    next: ["life-leave-order", "life-leave-dependents", "life-status-grace"],
  },
  {
    id: "life-leave-dependents",
    question: "What about the family's visas?",
    answer:
      "Dependents are cancelled before the sponsor, which catches people who book flights in the wrong order. Schools also need notice and will usually want fees settled before releasing a transfer certificate, which the next school will ask for.",
    service: VISA,
    phrases: [
      "what about the family's visas",
      "cancelling my wife and children's visas",
      "school transfer certificate before leaving",
    ],
    keywords: [["family", "visas", "cancel"], ["children", "visas"]],
    next: ["life-leave-school", "life-leave-visa-cancel", "life-leave-order"],
  },
  {
    id: "life-leave-school",
    question: "How much notice do schools need?",
    answer:
      "A term is common and it is set by the school's own policy rather than by a general rule, and fees are usually payable for the notice period whether or not the child attends. Ask for the transfer certificate in writing early — it is the document the next school will not enrol without.",
    service: null,
    phrases: [
      "how much notice do schools need",
      "taking my child out of school in dubai",
      "school fees when leaving mid year",
    ],
    keywords: [["notice", "schools"], ["child", "out", "school"]],
    next: ["life-leave-dependents", "life-admin-uae-documents", "life-leave-order"],
  },
  {
    id: "life-leave-documents",
    question: "Which documents should I take with me?",
    answer:
      "More than you think, and attested where a future employer or authority abroad might need them: the tenancy and its clearances, the end-of-service calculation, bank clearance letters, school transfer certificates, medical records, and anything UAE-issued you may need to prove later — marriage, birth, qualifications earned here.",
    service: ATTEST,
    phrases: [
      "which documents should i take with me",
      "what paperwork do i need when leaving the uae",
      "attesting uae documents before i go",
    ],
    keywords: [["documents", "take", "with"], ["paperwork", "leaving"]],
    next: ["life-admin-uae-documents", "life-leave-order", "life-leave-return"],
  },
  {
    id: "life-leave-return",
    question: "Could I come back later?",
    answer:
      "Usually yes, and what makes it hard is almost always something left unresolved — an unpaid debt, an open case, an uncancelled visa. Leaving cleanly is the thing that protects a return, which is why the clearance letters are worth collecting even when nobody asks for them.",
    service: VISA,
    phrases: [
      "could i come back later",
      "will i be able to return to the uae",
      "does leaving affect coming back",
    ],
    keywords: [["come", "back", "later"], ["return", "uae"]],
    next: ["life-leave-debt", "life-leave-documents", "life-money-travel-ban"],
  },
  {
    id: "life-leave-shipping",
    question: "Shipping my things out — anything to know?",
    answer:
      "Quotes vary enormously and the cheap one is often cheap at the destination end rather than this one, so compare door to door. Some items that are ordinary here are restricted where you are going, and the reverse — the destination country's customs is who to ask, not the shipper.",
    service: null,
    phrases: [
      "shipping my things out anything to know",
      "moving my furniture out of the uae",
      "international movers from dubai",
    ],
    keywords: [["shipping", "things", "out"], ["international", "movers"]],
    next: ["life-leave-order", "life-leave-car"],
  },

  /* ── The car, beyond buying one ────────────────────────────────────────── */
  {
    id: "life-car-accident",
    question: "I have had an accident. What do I do?",
    answer:
      "Do not move the cars if anyone is hurt, and get a police report either way — insurers here work from it and a claim without one is usually refused. Minor knocks can often be reported through the police app rather than by waiting at the roadside. Keep the report: it states fault, and fault decides who pays.",
    service: null,
    phrases: [
      "i have had an accident what do i do",
      "car accident police report dubai",
      "minor collision what now",
      "do i need a police report for a scratch",
    ],
    keywords: [["had", "accident"], ["accident", "police", "report"]],
    next: ["life-car-insurance-claim", "life-dispute-insurer", "life-car-points"],
  },
  {
    id: "life-car-insurance-claim",
    question: "How does a motor claim work after the report?",
    answer:
      "The report colour tells the insurer who was at fault, and that determines whether you claim on your own policy or the other party's. Comprehensive and third-party cover behave very differently here, which is the thing people discover at exactly the wrong moment.",
    service: null,
    phrases: [
      "how does a motor claim work after the report",
      "claiming on my car insurance",
      "the other driver was at fault",
    ],
    keywords: [["motor", "claim"], ["car", "insurance", "claim"]],
    next: ["life-dispute-insurer", "life-car-accident", "life-car-registration"],
  },
  {
    id: "life-car-points",
    question: "What are black points and what happens if I collect them?",
    answer:
      "A penalty record attached to your licence alongside the monetary fine. Enough of them within a period and the licence is suspended, with the vehicle sometimes impounded as well. The thresholds and the offences that carry them are the RTA's and are published; disputing a specific point is done through them.",
    service: null,
    phrases: [
      "what are black points and what happens if i collect them",
      "black points on my licence",
      "licence suspension for traffic offences",
    ],
    keywords: [["black", "points"], ["licence", "suspension"]],
    next: ["life-admin-fines", "life-car-impound", "life-renew-licence"],
  },
  {
    id: "life-car-impound",
    question: "My car has been impounded.",
    answer:
      "Release depends on the reason and usually means paying the fine plus a daily storage charge that keeps growing, so speed matters more than arguing. The traffic department of the emirate that impounded it is who to deal with; a dispute about whether it was justified comes after the release, not before.",
    service: null,
    phrases: [
      "my car has been impounded",
      "how do i get my car released",
      "vehicle seized by the police",
    ],
    keywords: [["car", "impounded"], ["vehicle", "seized"]],
    next: ["life-car-points", "life-admin-fines", "life-dispute-police"],
  },
  {
    id: "life-car-registration",
    question: "What is involved in renewing the car's registration?",
    answer:
      "A technical test for vehicles over a certain age, valid insurance, and every fine settled — the fines are what stop most renewals. It is an annual cycle and driving on an expired registration is itself an offence, so it is not one to let slide.",
    service: null,
    phrases: [
      "what is involved in renewing the car's registration",
      "car passing and renewal",
      "vehicle test in the uae",
    ],
    keywords: [["renewing", "registration"], ["vehicle", "test"]],
    next: ["life-admin-fines", "life-car-points", "life-renew-licence"],
  },
  {
    id: "life-car-selling",
    question: "How do I sell a car here?",
    answer:
      "Finance cleared, fines settled, then a transfer at the traffic department with both parties present — ownership does not change by handshake or by bank transfer alone. Cancel the insurance only after the transfer is registered, not before.",
    service: null,
    phrases: [
      "how do i sell a car here",
      "transferring car ownership in dubai",
      "selling a financed car",
    ],
    keywords: [["sell", "car"], ["transferring", "ownership"]],
    next: ["life-leave-car", "life-car-registration", "life-money-credit-record"],
  },
  {
    id: "life-car-salik-tolls",
    question: "How do tolls and parking work if I am not the registered owner?",
    answer:
      "They follow the plate, so a hire car, a company car or a car still in a friend's name sends the charge to whoever is registered — and that person gets the fine. Settle these before any transfer or departure; they are small individually and surface at the worst time.",
    service: null,
    phrases: [
      "how do tolls and parking work if i am not the registered owner",
      "salik charges on a company car",
      "parking fines on a hire car",
    ],
    keywords: [["tolls", "registered", "owner"], ["salik", "company", "car"]],
    next: ["life-admin-fines", "life-car-selling"],
  },

  /* ── Family events ─────────────────────────────────────────────────────── */
  {
    id: "life-family-birth",
    question: "We have had a baby here. What has to be done?",
    answer:
      "A birth certificate from the hospital registered with the health authority, then attested, then the child's own passport through your embassy, then a residence visa under your sponsorship — and each step has a window. Starting late is the most common and most expensive mistake.",
    service: ATTEST,
    phrases: [
      "we have had a baby here what has to be done",
      "registering a birth in dubai",
      "newborn visa and passport",
      "birth certificate for my baby born in the uae",
    ],
    keywords: [["had", "baby"], ["registering", "birth"], ["newborn", "visa"]],
    next: ["life-family-birth-translate", "life-family-birth-late", "life-hub-family"],
  },
  {
    id: "life-family-birth-translate",
    question: "The birth certificate is in Arabic. Will my country accept it?",
    answer:
      "It will need translating into your own language and usually legalising for use abroad — attested here by the Ministry of Foreign Affairs and then by your embassy. Do it while you are still here; arranging it afterwards from another country is far harder.",
    service: TRANSLATE,
    phrases: [
      "the birth certificate is in arabic will my country accept it",
      "translating a uae birth certificate",
      "registering my baby with my home country",
    ],
    keywords: [["birth", "certificate", "arabic"], ["translating", "birth"]],
    next: ["life-admin-uae-documents", "life-family-birth", "life-leave-documents"],
  },
  {
    id: "life-family-birth-late",
    question: "We are late registering the birth.",
    answer:
      "There are fines and they increase, and the child's residence status is the part that actually matters — an unregistered newborn cannot be sponsored and that blocks travel. Deal with it as a priority and get the current position from the health authority and ICP rather than from a forum.",
    service: VISA,
    phrases: [
      "we are late registering the birth",
      "missed the deadline for my baby's visa",
      "fine for late birth registration",
    ],
    keywords: [["late", "registering", "birth"], ["missed", "deadline", "baby"]],
    next: ["life-family-birth", "life-renew-expired", "life-hub-family"],
  },
  {
    id: "life-family-divorce",
    question: "We are separating. What does that affect?",
    answer:
      "Sponsorship first, if one spouse is on the other's visa, and that is the part with a deadline. Personal status matters here can be heard under different frameworks depending on the parties, and which one applies to you is a question for a lawyer rather than for us.",
    service: VISA,
    phrases: [
      "we are separating what does that affect",
      "divorce in the uae and my visa",
      "my wife is on my sponsorship and we are splitting up",
    ],
    keywords: [["separating", "affect"], ["divorce", "visa"]],
    next: ["life-status-sponsor-ends", "life-dispute-lawyer", "life-family-custody"],
  },
  {
    id: "life-family-custody",
    question: "What happens with the children?",
    answer:
      "Arrangements for children are decided by the courts here and the framework that applies depends on the family's circumstances. This is not something to take a general answer on from anyone, including us — get a family lawyer early, because decisions made informally at the start are hard to undo.",
    service: null,
    phrases: [
      "what happens with the children",
      "custody arrangements in the uae",
      "can i take my child out of the country",
    ],
    keywords: [["happens", "children"], ["custody", "arrangements"]],
    next: ["life-dispute-lawyer", "life-family-divorce", "life-family-travel-consent"],
  },
  {
    id: "life-family-travel-consent",
    question: "Do I need the other parent's permission to travel with my child?",
    answer:
      "Frequently yes, and airlines and immigration do ask — a notarised consent letter from the non-travelling parent is the usual document. Where there is a dispute or a court order, do not rely on a general answer: the order governs and ignoring it is serious.",
    service: NOTARY,
    phrases: [
      "do i need the other parent's permission to travel with my child",
      "travel consent letter for a child",
      "taking my kids abroad without my husband",
    ],
    keywords: [["parent", "permission", "travel"], ["consent", "letter", "child"]],
    next: ["life-family-custody", "life-family-will", "life-dispute-lawyer"],
  },
  {
    id: "life-family-death",
    question: "Someone has died. What has to happen?",
    answer:
      "A medical certificate, then a death certificate, then either burial here or repatriation, which needs embassy involvement and clearances. The person's visa, accounts and liabilities are frozen and dealt with afterwards. Your embassy is the first call and they will walk you through it.",
    service: ATTEST,
    phrases: [
      "someone has died what has to happen",
      "death of a family member in the uae",
      "repatriating a body from dubai",
    ],
    keywords: [["someone", "died"], ["death", "family", "member"]],
    next: ["life-family-estate", "life-family-will", "life-hub-family"],
  },
  {
    id: "life-family-estate",
    question: "What happens to a deceased person's assets here?",
    answer:
      "Accounts are typically frozen until the estate is settled, and how it is distributed depends on whether a recognised will exists and on the deceased's circumstances. This is precisely the case where a registered will changes the outcome, and where a lawyer is needed rather than general guidance.",
    service: NOTARY,
    phrases: [
      "what happens to a deceased person's assets here",
      "frozen bank account after a death",
      "inheritance in the uae for expats",
    ],
    keywords: [["deceased", "assets"], ["inheritance", "expats"]],
    next: ["life-family-will", "life-dispute-lawyer", "life-family-death"],
  },
  {
    id: "life-family-will",
    question: "Should I make a will here?",
    answer:
      "If you have assets or children here, it is one of the few pieces of paperwork that genuinely changes what happens to your family, and non-Muslim residents have registration options intended for exactly this. The drafting is a lawyer's work; the registration and notarisation are steps we can help arrange.",
    service: NOTARY,
    phrases: [
      "should i make a will here",
      "wills for expats in dubai",
      "registering a will in the uae",
      "difc wills",
    ],
    keywords: [["make", "will"], ["wills", "expats"], ["registering", "will"]],
    next: ["life-family-estate", "life-dispute-lawyer", "life-family-guardianship"],
  },
  {
    id: "life-family-guardianship",
    question: "Who would look after my children if something happened to us?",
    answer:
      "Without a registered arrangement that is decided by the authorities rather than by your wishes, which is the single strongest argument for making a will while you are both here. Interim guardianship provisions exist for exactly the gap between an incident and a decision.",
    service: NOTARY,
    phrases: [
      "who would look after my children if something happened to us",
      "guardianship for my kids in the uae",
      "interim guardian provision",
    ],
    keywords: [["look", "after", "children"], ["guardianship", "kids"]],
    next: ["life-family-will", "life-family-custody", "life-dispute-lawyer"],
  },
  {
    id: "life-family-maid",
    question: "We want to employ a nanny or a housemaid.",
    answer:
      "Domestic workers are sponsored under a separate framework with its own contract, permit and obligations, and employing someone on another sponsor's visa is an offence for both of you. The rules on wages, hours and accommodation are real obligations rather than guidance.",
    service: VISA,
    phrases: [
      "we want to employ a nanny or a housemaid",
      "sponsoring a domestic worker",
      "part time maid legal uae",
    ],
    keywords: [["employ", "nanny"], ["sponsoring", "domestic"], ["maid", "legal"]],
    next: ["life-family-maid-leaving", "life-hub-family", "life-dispute-employer"],
  },
  {
    id: "life-family-maid-leaving",
    question: "Our housemaid wants to leave. What do we have to do?",
    answer:
      "Cancel the sponsorship properly, settle the end-of-service entitlement, and do not withhold a passport under any circumstances — that is unlawful regardless of what is owed. Where there is a dispute, the relevant ministry has a route for it.",
    service: VISA,
    phrases: [
      "our housemaid wants to leave what do we have to do",
      "cancelling a maid's visa",
      "domestic worker end of service",
    ],
    keywords: [["housemaid", "leave"], ["cancelling", "maid"]],
    next: ["life-family-maid", "life-leave-gratuity", "life-dispute-employer"],
  },

  /* ── Health, after the first year ──────────────────────────────────────── */
  {
    id: "life-health-claim-refused",
    question: "My claim was refused. What now?",
    answer:
      "Get the refusal in writing with the clause relied on, then use the insurer's internal appeal — a large share are overturned there, usually because a code or a pre-authorisation was missing rather than because the treatment was not covered. If it stands, the health authority regulating the policy in your emirate takes complaints.",
    service: null,
    phrases: [
      "my claim was refused what now",
      "insurance refused to pay for my treatment",
      "appealing a rejected medical claim",
    ],
    keywords: [["claim", "refused"], ["appealing", "rejected"]],
    next: ["life-dispute-insurer", "life-health-preauth", "life-hub-health"],
  },
  {
    id: "life-health-preauth",
    question: "What is pre-authorisation and why does it keep catching me out?",
    answer:
      "Approval from the insurer before a procedure happens, and without it even covered treatment can be refused. Clinics usually handle it, but the responsibility lands on you when they do not — so ask, before the appointment, whether it has been obtained.",
    service: null,
    phrases: [
      "what is pre authorisation and why does it keep catching me out",
      "insurance approval before treatment",
      "clinic did not get approval",
    ],
    keywords: [["pre", "authorisation"], ["approval", "before", "treatment"]],
    next: ["life-health-claim-refused", "life-health-network", "life-hub-health"],
  },
  {
    id: "life-health-network",
    question: "What does it mean that a hospital is out of network?",
    answer:
      "That your policy either will not pay there or will pay less, and the network attached to a policy changes at renewal without the policy's name changing. Check the current list before you need it; in an emergency, go to the nearest hospital and deal with the paperwork afterwards.",
    service: null,
    phrases: [
      "what does it mean that a hospital is out of network",
      "my clinic is not covered by my insurance",
      "which hospitals does my policy cover",
    ],
    keywords: [["out", "network"], ["hospitals", "policy", "cover"]],
    next: ["life-renew-insurance", "life-health-claim-refused", "life-health-emergency"],
  },
  {
    id: "life-health-emergency",
    question: "What happens in a genuine emergency?",
    answer:
      "Go to the nearest emergency department and do not shop around for a covered one — emergency treatment is treated differently from planned care and arguing about networks is for afterwards. The national emergency number connects ambulance, police and fire.",
    service: null,
    phrases: [
      "what happens in a genuine emergency",
      "emergency number in the uae",
      "nearest hospital in an emergency",
    ],
    keywords: [["genuine", "emergency"], ["emergency", "number"]],
    next: ["life-health-network", "life-health-claim-refused"],
  },
  {
    id: "life-health-changing",
    question: "Can I change insurer or top up my cover?",
    answer:
      "If your employer provides the policy, usually only at their renewal, though many allow an upgrade you pay for yourself — and buying cover for a dependent separately is common. Pre-existing conditions are the thing to ask about before switching, because a new policy may treat them differently.",
    service: null,
    phrases: [
      "can i change insurer or top up my cover",
      "upgrading my health insurance",
      "buying extra cover for my family",
    ],
    keywords: [["change", "insurer"], ["upgrading", "insurance"]],
    next: ["life-health-preexisting", "life-renew-insurance", "life-hub-health"],
  },
  {
    id: "life-health-preexisting",
    question: "How are pre-existing conditions treated?",
    answer:
      "Declared ones may be covered, excluded or subject to a waiting period depending on the policy; undeclared ones are the common reason a large claim is refused years later. Declare everything at the outset — the downside of declaring is a condition on the policy, and the downside of not is no policy at all when it matters.",
    service: null,
    phrases: [
      "how are pre existing conditions treated",
      "do i have to declare my medical history",
      "will my condition be covered",
    ],
    keywords: [["pre", "existing", "conditions"], ["declare", "medical", "history"]],
    next: ["life-health-changing", "life-health-claim-refused", "life-hub-health"],
  },
  {
    id: "life-health-maternity",
    question: "What does maternity cover usually involve?",
    answer:
      "Often a waiting period before it applies, limits on what is included, and a separate question about whether the newborn is covered and from when. Check all three the moment you start planning rather than when you are pregnant — the waiting period is the one that cannot be fixed retrospectively.",
    service: null,
    phrases: [
      "what does maternity cover usually involve",
      "is pregnancy covered by my insurance",
      "newborn cover after birth",
    ],
    keywords: [["maternity", "cover"], ["pregnancy", "covered"]],
    next: ["life-family-birth", "life-health-preauth", "life-health-changing"],
  },
  {
    id: "life-health-medicines",
    question: "My usual medication is not available or needs approval.",
    answer:
      "Some medicines that are routine elsewhere are controlled here and need a prescription from a licensed local doctor, and a few require advance approval to bring in at all. Check with the Ministry of Health before travelling with anything regular — arriving with a controlled substance and a foreign prescription is a serious matter.",
    service: null,
    phrases: [
      "my usual medication is not available or needs approval",
      "bringing my prescription into the uae",
      "controlled medicines in dubai",
    ],
    keywords: [["usual", "medication"], ["bringing", "prescription"], ["controlled", "medicines"]],
    next: ["life-health-chronic", "life-health-emergency", "life-hub-health"],
  },
  {
    id: "life-health-chronic",
    question: "I have a long-term condition. What should I set up?",
    answer:
      "A local specialist who can prescribe, a clear understanding of what your policy covers and for how long, and a copy of your records in English. The administrative work is worth doing while you are well; it is not something to arrange during a flare.",
    service: null,
    phrases: [
      "i have a long term condition what should i set up",
      "managing a chronic illness as a resident",
      "transferring my medical records here",
    ],
    keywords: [["long", "term", "condition"], ["chronic", "illness"]],
    next: ["life-health-medicines", "life-health-preexisting", "life-hub-health"],
  },
  {
    id: "life-health-mental",
    question: "Where do I go for mental health support?",
    answer:
      "Licensed clinics and hospitals provide it and coverage varies a great deal by policy, so check the limit before committing to a course of sessions. If someone is in immediate danger, that is an emergency and the emergency number is the right call.",
    service: null,
    phrases: [
      "where do i go for mental health support",
      "therapy in dubai and insurance",
      "counselling covered by my policy",
    ],
    keywords: [["mental", "health"], ["therapy", "insurance"]],
    next: ["life-health-network", "life-health-emergency", "life-hub-health"],
  },

  /* ── Money, credit and tax ─────────────────────────────────────────────── */
  {
    id: "life-money-cheque",
    question: "Why does everyone take cheques so seriously here?",
    answer:
      "Because a cheque is a payment instrument with legal weight rather than a casual promise, and one that bounces has consequences beyond the debt itself. Security cheques for rent and loans are normal, and the time to think about one is before signing it, not when it is presented.",
    service: null,
    phrases: [
      "why does everyone take cheques so seriously here",
      "bounced cheque in the uae",
      "security cheque for my rent",
      "what happens if my cheque does not clear",
    ],
    keywords: [["cheques", "seriously"], ["bounced", "cheque"], ["security", "cheque"]],
    next: ["life-money-cheque-bounced", "life-money-debt-trouble", "life-hub-money"],
  },
  {
    id: "life-money-cheque-bounced",
    question: "One of my cheques has bounced.",
    answer:
      "Talk to the holder immediately — most are resolved by paying before anything formal starts, and the window for that is short. Do not ignore it: the escalation route exists and it is far harder to unwind once begun. If it has already gone further, that is a point for a lawyer.",
    service: null,
    phrases: [
      "one of my cheques has bounced",
      "my landlord is threatening a police case over a cheque",
      "cheque returned unpaid",
    ],
    keywords: [["cheque", "bounced"], ["cheque", "returned"]],
    next: ["life-money-debt-trouble", "life-dispute-lawyer", "life-money-travel-ban"],
  },
  {
    id: "life-money-credit-record",
    question: "Is there a credit score here?",
    answer:
      "Yes — the Al Etihad Credit Bureau keeps a record of your borrowing and repayment, and banks read it before lending. You can request your own report, and it is worth doing before applying for anything large, because errors do occur and take time to correct.",
    service: null,
    phrases: [
      "is there a credit score here",
      "al etihad credit bureau report",
      "my loan application was refused",
      "checking my credit record uae",
    ],
    keywords: [["credit", "score"], ["credit", "bureau"], ["credit", "record"]],
    next: ["life-money-credit-fix", "life-money-debt-trouble", "life-hub-money"],
  },
  {
    id: "life-money-credit-fix",
    question: "There is something wrong on my credit report.",
    answer:
      "Raise it with the bureau and with the bank that reported it, in writing, and keep the reference numbers — a disputed entry can be marked while it is investigated. An unpaid telecom bill or a forgotten card is the usual culprit, and small amounts do real damage.",
    service: null,
    phrases: [
      "there is something wrong on my credit report",
      "disputing an entry with the credit bureau",
      "an old bill is on my credit record",
    ],
    keywords: [["wrong", "credit", "report"], ["disputing", "entry"]],
    next: ["life-money-credit-record", "life-dispute-telecom", "life-dispute-bank"],
  },
  {
    id: "life-money-debt-trouble",
    question: "I cannot pay what I owe.",
    answer:
      "Speak to the lender before missing the payment rather than after — restructuring is far easier to arrange while the account is current, and banks here do it. The thing not to do is leave the country quietly: that turns a debt into something much harder to resolve and can prevent a return.",
    service: null,
    phrases: [
      "i cannot pay what i owe",
      "struggling with debt in the uae",
      "restructuring my loan",
      "i am behind on my credit card",
    ],
    keywords: [["cannot", "pay", "owe"], ["struggling", "debt"], ["restructuring", "loan"]],
    next: ["life-money-travel-ban", "life-leave-debt", "life-dispute-lawyer"],
  },
  {
    id: "life-money-travel-ban",
    question: "What is a travel ban and how would I know?",
    answer:
      "A restriction on leaving, usually attached to an unresolved case or debt, and many people only discover one at the airport. Some authorities offer a way to check. If you suspect one, find out before booking a flight rather than after, and get legal help to deal with the underlying case.",
    service: null,
    phrases: [
      "what is a travel ban and how would i know",
      "how do i check if i have a travel ban",
      "stopped at the airport over a case",
    ],
    keywords: [["travel", "ban"], ["stopped", "airport"]],
    next: ["life-money-debt-trouble", "life-dispute-lawyer", "life-leave-return"],
  },
  {
    id: "life-money-card-fraud",
    question: "There is a transaction on my card I did not make.",
    answer:
      "Tell the bank immediately and in writing, freeze the card, and ask for the dispute reference — the timeframe for raising a chargeback is limited and starts at the transaction, not at the day you noticed. If the bank will not resolve it, the banking ombudsman route is next.",
    service: null,
    phrases: [
      "there is a transaction on my card i did not make",
      "fraudulent charge on my account",
      "someone used my card",
    ],
    keywords: [["transaction", "not", "make"], ["fraudulent", "charge"]],
    next: ["life-dispute-bank", "life-money-scams", "life-hub-money"],
  },
  {
    id: "life-money-scams",
    question: "How do I know if something is a scam?",
    answer:
      "The pattern is nearly always the same: urgency, a request to move money or share a one-time code, and a story that discourages you from checking. No bank or government body asks for a code or a password. If you are unsure, hang up and call the organisation on a number you found yourself.",
    service: null,
    phrases: [
      "how do i know if something is a scam",
      "someone called claiming to be from the bank",
      "otp scam uae",
      "investment opportunity that sounds too good",
    ],
    keywords: [["is", "scam"], ["claiming", "bank"], ["investment", "opportunity"]],
    next: ["life-money-card-fraud", "life-dispute-police", "life-dispute-bank"],
  },
  {
    id: "life-money-tax",
    question: "Do I pay tax here?",
    answer:
      "There is no personal income tax on salary, which is the headline, and it is not the whole picture: VAT applies to most goods and services, businesses may fall within corporate tax, and your home country may still tax you depending on its own rules. The last of those is the one that catches people, and it is a question for an adviser there.",
    service: null,
    phrases: [
      "do i pay tax here",
      "income tax in the uae",
      "am i still taxed at home while living in dubai",
      "tax residency certificate",
    ],
    keywords: [["pay", "tax"], ["income", "tax"], ["tax", "residency"]],
    next: ["life-money-tax-freelance", "life-money-tax-home", "life-hub-money"],
  },
  {
    id: "life-money-tax-home",
    question: "Does my home country still tax me?",
    answer:
      "That depends entirely on its rules about residence and domicile, and some countries tax citizens wherever they live. A tax residency certificate from the UAE authority is sometimes part of the answer. Get advice in the country that might tax you — we are not qualified to give it and nor is anyone here.",
    service: null,
    phrases: [
      "does my home country still tax me",
      "double taxation while working in dubai",
      "do i need to file a tax return back home",
    ],
    keywords: [["home", "country", "tax"], ["double", "taxation"]],
    next: ["life-money-tax", "life-money-tax-certificate", "life-hub-money"],
  },
  {
    id: "life-money-tax-certificate",
    question: "What is a tax residency certificate for?",
    answer:
      "Proving to another country's tax authority that you are resident here, usually to claim relief under a treaty. It is issued by the Federal Tax Authority against conditions about how long you have been in the country, and your adviser abroad will tell you whether you need one.",
    service: null,
    phrases: [
      "what is a tax residency certificate for",
      "how do i get a trc in the uae",
      "proving i live in dubai for tax",
    ],
    keywords: [["residency", "certificate"], ["proving", "live", "tax"]],
    next: ["life-money-tax-home", "life-admin-uae-documents", "life-money-tax"],
  },
  {
    id: "life-money-tax-freelance",
    question: "If I freelance or run a company, what tax applies?",
    answer:
      "Corporate tax applies to business profits above a threshold, and VAT registration becomes mandatory above a turnover threshold — both set by the Federal Tax Authority and both with registration deadlines and penalties for missing them. Get an accountant before the first invoice, not at the first filing.",
    service: BIZ,
    phrases: [
      "if i freelance or run a company what tax applies",
      "corporate tax for a small business",
      "do i need to register for vat",
    ],
    keywords: [["freelance", "tax"], ["corporate", "tax"], ["register", "vat"]],
    next: ["life-status-freelance", "life-money-tax", "life-hub-money"],
  },
  {
    id: "life-money-remittance",
    question: "Is there a limit on sending money home?",
    answer:
      "Exchange houses and banks apply their own checks and will ask about source of funds for larger amounts, which is compliance rather than suspicion. Rates and fees differ enough between providers to be worth comparing, and the advertised rate is not always the one applied.",
    service: null,
    phrases: [
      "is there a limit on sending money home",
      "transferring large amounts out of the uae",
      "best way to send money abroad",
    ],
    keywords: [["limit", "sending", "money"], ["transferring", "amounts"]],
    next: ["life-money-tax-home", "life-leave-bank", "life-hub-money"],
  },
  {
    id: "life-money-savings",
    question: "Someone is trying to sell me a long-term savings plan.",
    answer:
      "Be careful, and ask two questions in writing: what the total charges are over the full term, and what happens if you stop paying in year two. Products of this kind have caused a great deal of harm to residents here. Check the seller is regulated, and take independent advice before signing anything.",
    service: null,
    phrases: [
      "someone is trying to sell me a long term savings plan",
      "offshore investment plan dubai",
      "financial adviser cold called me",
    ],
    keywords: [["savings", "plan"], ["investment", "plan"], ["financial", "adviser"]],
    next: ["life-money-scams", "life-dispute-bank", "life-hub-money"],
  },

  /* ── Everyday admin ────────────────────────────────────────────────────── */
  {
    id: "life-admin-uaepass",
    question: "What is UAE Pass and do I need it?",
    answer:
      "A single digital identity used to sign in to most government services and to sign documents electronically. It is not optional in practice: more services are moving behind it, and setting it up takes minutes against an Emirates ID. Do it before you urgently need a service that requires it.",
    service: null,
    phrases: [
      "what is uae pass and do i need it",
      "setting up uae pass",
      "digital signature for government services",
    ],
    keywords: [["uae", "pass"], ["digital", "signature"]],
    next: ["life-admin-apps", "life-admin-uae-documents", "life-hub-admin"],
  },
  {
    id: "life-admin-apps",
    question: "Which government apps actually matter?",
    answer:
      "The ones for the services you touch: immigration and residence, the police for reports and fines, the roads authority for the car and transport, the utility for the flat, and the health authority for your records. Each emirate has its own, which is why there are more than there should be.",
    service: null,
    phrases: [
      "which government apps actually matter",
      "useful apps for living in dubai",
      "do i need all these government apps",
    ],
    keywords: [["government", "apps"], ["useful", "apps"]],
    next: ["life-admin-uaepass", "life-admin-fines", "life-hub-admin"],
  },
  {
    id: "life-admin-fines",
    question: "How do I find out if I have fines?",
    answer:
      "Check each authority separately, because they do not share a single bill — traffic fines sit with the police or roads authority of each emirate you have driven in, and other penalties sit with whoever issued them. Several are only discovered when a renewal is blocked.",
    service: null,
    phrases: [
      "how do i find out if i have fines",
      "checking my traffic fines",
      "unpaid fines blocking my renewal",
      "do fines expire",
    ],
    keywords: [["find", "fines"], ["traffic", "fines"], ["unpaid", "fines"]],
    next: ["life-admin-fines-dispute", "life-car-registration", "life-car-points"],
  },
  {
    id: "life-admin-fines-dispute",
    question: "I think a fine is wrong. Can I challenge it?",
    answer:
      "Yes — each authority has an objection process with a time limit, and it is usually online. Evidence wins these: a photograph, a timestamp, a receipt showing you were elsewhere. Pay nothing until the objection is decided if the process allows it, because paying can be treated as accepting.",
    service: null,
    phrases: [
      "i think a fine is wrong can i challenge it",
      "objecting to a traffic fine",
      "i was not driving the car",
    ],
    keywords: [["fine", "wrong"], ["objecting", "fine"]],
    next: ["life-admin-fines", "life-car-salik-tolls", "life-car-points"],
  },
  {
    id: "life-admin-address",
    question: "What counts as my official address here?",
    answer:
      "The registered tenancy, in practice — there is no residents' register as such, and post is not generally delivered to homes, which surprises people. Banks and government bodies use the tenancy registration and your phone number, so keeping both current matters more than it sounds.",
    service: null,
    phrases: [
      "what counts as my official address here",
      "proof of address in the uae",
      "how does post work in dubai",
      "do i need a po box",
    ],
    keywords: [["official", "address"], ["proof", "address"], ["po", "box"]],
    next: ["life-renew-ejari", "life-admin-uaepass", "life-hub-admin"],
  },
  {
    id: "life-admin-uae-documents",
    question: "How do I get an official copy of a document issued here?",
    answer:
      "From the body that issued it — the health authority for a birth or death certificate, the court for a judgment, the school for a transcript, the economic department for a licence. If it is going abroad it then needs Ministry of Foreign Affairs attestation and the destination embassy, which is a chain we can arrange.",
    service: ATTEST,
    phrases: [
      "how do i get an official copy of a document issued here",
      "replacing a lost uae certificate",
      "getting a copy of my marriage certificate from dubai",
    ],
    keywords: [["official", "copy", "document"], ["replacing", "lost", "certificate"]],
    next: ["life-leave-documents", "life-admin-lost", "life-hub-admin"],
  },
  {
    id: "life-admin-lost",
    question: "I have lost my Emirates ID or passport.",
    answer:
      "Report it first — a police report is usually needed for the replacement and always for a passport — then the issuing authority for a replacement, which takes time and carries a fee. Until it is replaced you will struggle with anything that needs identification, which is most things.",
    service: VISA,
    phrases: [
      "i have lost my emirates id or passport",
      "replacing a lost emirates id",
      "my passport was stolen in dubai",
    ],
    keywords: [["lost", "emirates", "id"], ["passport", "stolen"]],
    next: ["life-dispute-police", "life-admin-uae-documents", "life-renew-expired"],
  },
  {
    id: "life-admin-attest-uae-doc",
    question: "Someone abroad wants my UAE document attested.",
    answer:
      "The chain runs outward: Ministry of Foreign Affairs attestation here, then the destination country's embassy in the UAE, then usually a translation into their language. And it does not take an apostille — the UAE does not issue them, whatever the receiving body's form says.",
    service: ATTEST,
    phrases: [
      "someone abroad wants my uae document attested",
      "attesting a uae certificate for another country",
      "they are asking for an apostille on my uae document",
    ],
    keywords: [["uae", "document", "attested"], ["asking", "apostille"]],
    next: ["life-admin-uae-documents", "life-leave-documents", "life-hub-admin"],
  },
  {
    id: "life-admin-public-holidays",
    question: "Does anything close for long periods?",
    answer:
      "Government offices follow public holidays announced each year and working hours shift during Ramadan, so anything with a deadline is worth starting well before one. The announcements come shortly in advance rather than months, which is its own planning problem.",
    service: null,
    phrases: [
      "does anything close for long periods",
      "government offices during ramadan",
      "public holidays and my deadline",
    ],
    keywords: [["offices", "ramadan"], ["public", "holidays"]],
    next: ["life-renew-reminders", "life-hub-admin"],
  },

  /* ── What we can actually do about any of this ─────────────────────────── */
  {
    id: "life-us-what-we-do",
    question: "Which of these can you actually help with?",
    answer:
      "The document and application side: attestation, legal translation, notarised papers, and visa and licence applications, all through licensed providers we introduce you to. The disputes we can point at the right body and no further. CVs and websites we build ourselves.",
    service: null,
    phrases: [
      "which of these can you actually help with",
      "what can you do for me as a resident",
      "do you handle any of this yourselves",
    ],
    keywords: [["can", "you", "help"], ["do", "for", "me"]],
    next: ["life-us-not-lawyers", "life-us-talk", "life-hub-start"],
  },
  {
    id: "life-us-not-lawyers",
    question: "Can you tell me what the law says about my case?",
    answer:
      "No, and we will not pretend otherwise — we are not a law firm and the answers here are general information. What we can do is name the body that hears your kind of problem and help with the documents it will ask for, which is genuinely most of the practical work.",
    service: null,
    phrases: [
      "can you tell me what the law says about my case",
      "are you lawyers",
      "can you give me legal advice",
    ],
    keywords: [["law", "says"], ["are", "you", "lawyers"], ["legal", "advice"]],
    next: ["life-dispute-lawyer", "life-us-what-we-do", "life-us-talk"],
  },
  {
    id: "life-us-talk",
    question: "Can I just speak to someone about my situation?",
    answer:
      "Yes. Tell us roughly what has happened and someone will come back to you — and if the honest answer is that you need a lawyer or a specific government department rather than us, that is what you will be told.",
    service: null,
    phrases: [
      "can i just speak to someone about my situation",
      "i want to talk to a person about this",
      "call me back about my case",
    ],
    keywords: [["speak", "someone"], ["talk", "person"], ["call", "me", "back"]],
    next: ["life-us-what-we-do", "life-hub-start"],
  },
  {
    id: "life-us-money-documents",
    question: "What would you charge to sort out my documents?",
    answer:
      "It depends on how many there are, which countries issued them and which steps are actually needed — and a figure given before those are known is one somebody later has to walk back. Tell us what you are holding and someone will come back with a real number, government fees shown separately.",
    service: ATTEST,
    quote: true,
    phrases: [
      "what would you charge to sort out my documents",
      "how much to get my paperwork done",
      "cost of sorting my residency documents",
      "give me an estimate for the document work",
    ],
    keywords: [...priceGroups("documents"), ...priceGroups("paperwork")],
  },
  {
    id: "life-us-money-translation",
    question: "What does a legal translation cost?",
    answer:
      "It turns on the document, its length and the language pair, and court-standard work is priced differently from an ordinary certificate. Send us what needs translating and someone will come back with a figure rather than a range that would not fit your case anyway.",
    service: TRANSLATE,
    quote: true,
    phrases: [
      "what does a legal translation cost",
      "how much to translate my documents into arabic",
      "translation price per page",
    ],
    keywords: priceGroups("translation"),
  },

  /* ── Being employed here for a few years ───────────────────────────────── */
  {
    id: "life-work-leave",
    question: "How does annual leave work, and can I carry it over?",
    answer:
      "There is a statutory minimum and your contract may give more; carry-over and payment in lieu are governed rather than purely discretionary. If leave is being refused or quietly lost at year end, that is a labour matter and MOHRE or your free zone authority hears it.",
    service: null,
    phrases: [
      "how does annual leave work and can i carry it over",
      "my employer will not let me take leave",
      "unused holiday at the end of the year",
    ],
    keywords: [["annual", "leave"], ["carry", "over", "holiday"]],
    next: ["life-work-sick-leave", "life-dispute-employer", "life-hub-start"],
  },
  {
    id: "life-work-sick-leave",
    question: "What am I entitled to if I am off sick?",
    answer:
      "A defined period, with the pay varying across it, and a medical certificate from a licensed clinic is normally required. The entitlement differs during probation. If you are being pressed to work through a signed-off absence, that is a complaint rather than a negotiation.",
    service: null,
    phrases: [
      "what am i entitled to if i am off sick",
      "sick leave rules in the uae",
      "my employer is not paying me while i am ill",
    ],
    keywords: [["off", "sick"], ["sick", "leave"]],
    next: ["life-work-leave", "life-dispute-employer", "life-health-claim-refused"],
  },
  {
    id: "life-work-parental-leave",
    question: "What leave is there for a new baby?",
    answer:
      "Maternity leave with a defined length and a pay structure across it, plus a shorter parental entitlement available to either parent. Your contract may improve on the minimum and some employers do. Check both before planning, and raise any shortfall early rather than after returning.",
    service: null,
    phrases: [
      "what leave is there for a new baby",
      "maternity leave entitlement uae",
      "paternity leave in dubai",
    ],
    keywords: [["leave", "new", "baby"], ["maternity", "leave"], ["paternity", "leave"]],
    next: ["life-family-birth", "life-health-maternity", "life-work-leave"],
  },
  {
    id: "life-work-contract-change",
    question: "My employer wants to change my contract.",
    answer:
      "A registered contract is not changed unilaterally — a variation needs agreement and registration, and a new one signed under pressure is still a new one. Read what is actually different, particularly salary structure, because the basic figure drives the gratuity.",
    service: null,
    phrases: [
      "my employer wants to change my contract",
      "they are asking me to sign a new contract",
      "salary restructure at work",
    ],
    keywords: [["change", "my", "contract"], ["sign", "new", "contract"]],
    next: ["life-leave-gratuity", "life-dispute-employer", "life-work-noncompete"],
  },
  {
    id: "life-work-noncompete",
    question: "My contract has a non-compete clause. Does it bind me?",
    answer:
      "Clauses of this kind are enforceable within limits on duration, geography and activity, and an unreasonably wide one is less useful to an employer than it looks. Whether yours binds you is a legal question about your wording — worth a lawyer's half hour before you accept an offer elsewhere.",
    service: null,
    phrases: [
      "my contract has a non compete clause does it bind me",
      "can my employer stop me joining a competitor",
      "labour ban after resigning",
    ],
    keywords: [["non", "compete"], ["joining", "competitor"], ["labour", "ban"]],
    next: ["life-dispute-lawyer", "life-work-resigning", "life-status-between-jobs"],
  },
  {
    id: "life-work-resigning",
    question: "What should I know before resigning?",
    answer:
      "Your notice period, what happens to accrued leave, how the gratuity is affected, and when your visa will be cancelled — in that order, and in writing. Resigning before the next offer is confirmed in writing is the mistake that costs the most, because the grace period starts regardless.",
    service: null,
    phrases: [
      "what should i know before resigning",
      "notice period before i quit",
      "resigning from my job in dubai",
    ],
    keywords: [["before", "resigning"], ["notice", "quit"]],
    next: ["life-status-between-jobs", "life-leave-gratuity", "life-work-noncompete"],
  },
  {
    id: "life-work-remote",
    question: "Can I work remotely for a company abroad while living here?",
    answer:
      "Your residence has to come from somewhere — a remote-work permit, a freelance licence or a family sponsorship — because living here needs a visa and working needs that visa to permit it. There are routes designed for exactly this; which fits depends on your situation.",
    service: VISA,
    phrases: [
      "can i work remotely for a company abroad while living here",
      "remote work visa uae",
      "working for an overseas employer from dubai",
    ],
    keywords: [["work", "remotely", "abroad"], ["remote", "work", "visa"]],
    next: ["life-status-freelance", "life-money-tax-freelance", "life-status-long-term"],
  },
  {
    id: "life-work-second-job",
    question: "Can I take a second job?",
    answer:
      "There are part-time and multiple-employer permits, and doing it without one is a risk to your residence rather than just to your employment. Your main employer's position matters too. Get the permit route checked before starting, not after.",
    service: VISA,
    phrases: [
      "can i take a second job",
      "part time work permit uae",
      "working two jobs here",
    ],
    keywords: [["second", "job"], ["part", "time", "permit"]],
    next: ["life-status-freelance", "life-work-remote", "life-status-company"],
  },

  /* ── Schools, after the first admission ────────────────────────────────── */
  {
    id: "life-school-choosing",
    question: "How do I judge a school here?",
    answer:
      "The regulator in each emirate inspects and publishes ratings, and that report says more than a prospectus does. Beyond it: the curriculum, whether it continues to the age your child will leave at, and the real fee including everything that is not tuition.",
    service: null,
    phrases: [
      "how do i judge a school here",
      "khda ratings explained",
      "choosing a school in dubai",
      "school inspection reports",
    ],
    keywords: [["judge", "school"], ["school", "ratings"], ["choosing", "school"]],
    next: ["life-school-fees", "life-school-changing", "life-hub-family"],
  },
  {
    id: "life-school-fees",
    question: "Can a school raise its fees whenever it wants?",
    answer:
      "No — increases are regulated by the emirate's education authority and linked to inspection outcomes, which is why they are announced rather than negotiated. What is not capped is the long list of extras, so ask for the full annual cost in writing including transport, uniform, trips and exams.",
    service: null,
    phrases: [
      "can a school raise its fees whenever it wants",
      "school fee increase rules",
      "hidden costs of schools in dubai",
    ],
    keywords: [["school", "fees", "raise"], ["fee", "increase"]],
    next: ["life-school-choosing", "life-school-unpaid", "life-leave-school"],
  },
  {
    id: "life-school-unpaid",
    question: "What happens if school fees fall behind?",
    answer:
      "Schools can withhold reports and transfer certificates and ultimately a place, which is the pressure point because the next school needs that certificate. Talk to them early — payment plans are common — rather than letting it reach the end of term.",
    service: null,
    phrases: [
      "what happens if school fees fall behind",
      "cannot pay school fees",
      "school is withholding my child's report",
    ],
    keywords: [["fees", "behind"], ["withholding", "report"]],
    next: ["life-school-fees", "life-leave-school", "life-money-debt-trouble"],
  },
  {
    id: "life-school-changing",
    question: "We want to move our child to another school.",
    answer:
      "A transfer certificate from the current school and a place at the new one, and the two have to line up — most schools want the certificate before enrolling and release it only once fees are settled. Mid-year moves are possible and are harder for the child than the paperwork is for you.",
    service: null,
    phrases: [
      "we want to move our child to another school",
      "transferring schools mid year",
      "getting a transfer certificate",
    ],
    keywords: [["move", "child", "school"], ["transferring", "schools"]],
    next: ["life-school-unpaid", "life-leave-school", "life-school-choosing"],
  },
  {
    id: "life-school-university-here",
    question: "Can my child go to university here?",
    answer:
      "Yes, and the questions are whether the institution and the programme are licensed and accredited by the Ministry of Higher Education, and whether the qualification will be recognised where they might go next. Accreditation is checkable and worth checking rather than assuming.",
    service: null,
    phrases: [
      "can my child go to university here",
      "are uae universities recognised",
      "accredited degree programmes in dubai",
    ],
    keywords: [["university", "here"], ["universities", "recognised"]],
    next: ["life-school-choosing", "life-status-off-spouse", "life-hub-family"],
  },

  /* ── The flat and the building ─────────────────────────────────────────── */
  {
    id: "life-home-bill-high",
    question: "My utility bill is suddenly enormous.",
    answer:
      "Check for a leak and check whether the reading was estimated rather than actual — both are common causes and both are fixable. The utility has a dispute process and will send someone. Chiller charges are often billed separately by another company entirely, which surprises people.",
    service: null,
    phrases: [
      "my utility bill is suddenly enormous",
      "dewa bill is too high",
      "huge chiller charge",
    ],
    keywords: [["bill", "enormous"], ["bill", "too", "high"], ["chiller", "charge"]],
    next: ["life-home-chiller", "life-dispute-consumer", "life-house-maintenance"],
  },
  {
    id: "life-home-chiller",
    question: "What is a chiller charge and who pays it?",
    answer:
      "District cooling, billed by a separate provider, and whether it is included in your rent is a contract question you should settle before signing rather than discover in July. Consumption charges plus a standing capacity charge is the usual structure, and the standing charge continues when you are away.",
    service: null,
    phrases: [
      "what is a chiller charge and who pays it",
      "district cooling bill",
      "is chiller free in my building",
    ],
    keywords: [["chiller", "charge"], ["district", "cooling"]],
    next: ["life-home-bill-high", "life-house-renewal", "life-dispute-landlord"],
  },
  {
    id: "life-home-neighbours",
    question: "I have a problem with a neighbour.",
    answer:
      "Building management first, in writing, because they hold the community rules and most issues are resolved there. Beyond that it depends on what it is — noise and nuisance can reach the police, and anything structural goes to the owners association or the landlord.",
    service: null,
    phrases: [
      "i have a problem with a neighbour",
      "noise complaint in my building",
      "neighbour is subletting to a crowd",
    ],
    keywords: [["problem", "neighbour"], ["noise", "complaint"]],
    next: ["life-house-maintenance", "life-dispute-police", "life-hub-disputes"],
  },
  {
    id: "life-home-moving-permit",
    question: "Do I need permission to move furniture in or out?",
    answer:
      "Most buildings require a move permit booked in advance, with a service lift slot and sometimes a deposit, and a clearance from the landlord or the management. Arranging it late is the usual reason a move day falls apart.",
    service: null,
    phrases: [
      "do i need permission to move furniture in or out",
      "move in permit for my building",
      "booking the service lift",
    ],
    keywords: [["permission", "move", "furniture"], ["move", "permit"]],
    next: ["life-house-moving-out", "life-leave-shipping", "life-house-deposit"],
  },
  {
    id: "life-home-maintenance-contract",
    question: "Is an annual maintenance contract worth it?",
    answer:
      "For air conditioning in particular, often yes — it fails in summer and an emergency call-out then is both expensive and slow. Check first whether your tenancy already makes the landlord responsible, because paying for something you are owed is a common waste.",
    service: null,
    phrases: [
      "is an annual maintenance contract worth it",
      "amc for my ac",
      "who maintains the air conditioning",
    ],
    keywords: [["maintenance", "contract"], ["maintains", "conditioning"]],
    next: ["life-house-maintenance", "life-home-bill-high", "life-dispute-landlord"],
  },
  {
    id: "life-home-pets",
    question: "What do I need to know about keeping a pet here?",
    answer:
      "Registration and vaccination with the municipality, a landlord or building that permits animals in writing, and a plan for the summer. Some breeds are restricted. The expensive surprise is usually the export paperwork years later when you leave.",
    service: null,
    phrases: [
      "what do i need to know about keeping a pet here",
      "registering my dog in dubai",
      "pet rules in apartment buildings",
    ],
    keywords: [["keeping", "pet"], ["registering", "dog"]],
    next: ["life-home-pets-leaving", "life-house-renewal", "life-hub-start"],
  },
  {
    id: "life-home-pets-leaving",
    question: "Taking a pet out of the country.",
    answer:
      "An export permit, vaccinations within specific windows, a health certificate and whatever the destination requires — and the destination's rules are the strict half, with some requiring months of preparation. Start the moment leaving becomes likely rather than when the flight is booked.",
    service: null,
    phrases: [
      "taking a pet out of the country",
      "exporting my dog from the uae",
      "pet relocation when leaving",
    ],
    keywords: [["pet", "out", "country"], ["exporting", "dog"]],
    next: ["life-leave-order", "life-home-pets", "life-leave-shipping"],
  },

  /* ── Travel, on a residence visa ───────────────────────────────────────── */
  {
    id: "life-travel-reentry",
    question: "Is there anything to watch when re-entering the UAE?",
    answer:
      "Your residence has to be valid and your passport has to have enough validity left for the airline to board you — the airline check is the one that catches people, not immigration. Carry your Emirates ID; it speeds the gates considerably.",
    service: VISA,
    phrases: [
      "is there anything to watch when re entering the uae",
      "coming back into dubai on my residence",
      "do i need my emirates id to travel",
    ],
    keywords: [["re", "entering"], ["coming", "back", "residence"]],
    next: ["life-status-absence", "life-renew-passport", "life-travel-visafree"],
  },
  {
    id: "life-travel-visafree",
    question: "Does a UAE residence help me travel elsewhere?",
    answer:
      "For some destinations yes, with visa-free or visa-on-arrival access that depends on your nationality and on the destination's current rules rather than on the residence alone. Check the destination's own guidance close to travel; these change frequently and a stale answer is worse than none.",
    service: null,
    phrases: [
      "does a uae residence help me travel elsewhere",
      "visa free countries with uae residence",
      "schengen visa from dubai",
    ],
    keywords: [["residence", "help", "travel"], ["visa", "free", "countries"]],
    next: ["life-travel-reentry", "life-admin-uae-documents", "life-hub-admin"],
  },
  {
    id: "life-travel-child-alone",
    question: "My child is flying without me.",
    answer:
      "Airlines have their own unaccompanied-minor rules and immigration may ask for a notarised consent from the non-travelling parents. Arrange the consent in advance — it is a notary appointment, not something that can be produced at a check-in desk.",
    service: NOTARY,
    phrases: [
      "my child is flying without me",
      "unaccompanied minor from dubai",
      "consent letter for a child travelling alone",
    ],
    keywords: [["child", "flying", "without"], ["unaccompanied", "minor"]],
    next: ["life-family-travel-consent", "life-family-custody", "life-travel-reentry"],
  },

  /* ── Later on ──────────────────────────────────────────────────────────── */
  {
    id: "life-later-retirement",
    question: "Can I stay here after I stop working?",
    answer:
      "There are retirement residence routes with conditions around age and financial means, assessed by the immigration authority against published criteria. Whether you qualify is their decision; the document side of an application is what we can help put in order.",
    service: VISA,
    phrases: [
      "can i stay here after i stop working",
      "retirement visa uae",
      "staying in dubai after retiring",
    ],
    keywords: [["after", "stop", "working"], ["retirement", "visa"]],
    next: ["life-status-long-term", "life-later-pension", "life-hub-status"],
  },
  {
    id: "life-later-pension",
    question: "What happens to pensions when you have worked here?",
    answer:
      "For most expatriate employees there is no local pension and the end-of-service gratuity is the equivalent, which is why people treat it as savings rather than as a bonus. Some employers now offer workplace savings schemes in its place. Your home-country pension is a question for that country.",
    service: null,
    phrases: [
      "what happens to pensions when you have worked here",
      "is there a pension in the uae for expats",
      "end of service instead of a pension",
    ],
    keywords: [["pensions", "worked", "here"], ["pension", "expats"]],
    next: ["life-leave-gratuity", "life-later-retirement", "life-money-savings"],
  },
  {
    id: "life-later-long-residents",
    question: "I have been here twenty years. Does that count for anything?",
    answer:
      "Length of residence does not by itself create a right to remain, which is the hard answer and worth knowing early rather than at sixty. What does exist are the long-term routes with their own criteria, and planning towards one of those is the practical response.",
    service: VISA,
    phrases: [
      "i have been here twenty years does that count for anything",
      "long residence and citizenship",
      "rights after many years in the uae",
    ],
    keywords: [["twenty", "years"], ["long", "residence"]],
    next: ["life-status-long-term", "life-later-retirement", "life-family-will"],
  },
];

/* ── Catching what the doors let in ─────────────────────────────────────── */

/** Only the phrasings nothing above already answers — `./doors.ts` says why
 *  copying the whole list onto a hub takes questions away from the entries
 *  that answer them properly. */
landDoorPhrases(UAE_LIFE_FLOWS, "life-hub-renewals", EXPIRY_PHRASES);
landDoorPhrases(UAE_LIFE_FLOWS, "life-hub-disputes", DISPUTE_PHRASES);
landDoorPhrases(UAE_LIFE_FLOWS, "life-hub-leaving", LEAVING_PHRASES);
landDoorPhrases(UAE_LIFE_FLOWS, "life-hub-start", RESIDENT_PHRASES);
