/**
 * The way into the pack about the two things we make ourselves.
 *
 * Three entries, and none of them answers anything. Each is a `subject` door:
 * matching one loads `./own-work-flows.ts` — its own document, not part of the
 * graph every conversation reads — and the visitor's message is matched again
 * inside it, in the same turn. `lib/chat/flow/schema.ts`'s `subject` node says
 * why the pack is kept out there; this file is the only part of it the main
 * flow carries.
 *
 * WHY THREE, AND WHY MONEY DOES NOT GET ONE OF ITS OWN
 *
 * A door's phrases are not competing to be the best answer to one question.
 * They are the only route to two hundred and forty-two answers, so a phrasing
 * that misses the door misses all of them — and unlike an ordinary entry,
 * nothing downstream can rescue it.
 *
 * CVs and websites are two vocabularies with almost no words in common, so one
 * intent holding both would be a worse match for each than two are for either:
 * `matchByPhrase` and the embedding both reward a tight topic.
 *
 * A money question does **not** get a third and fourth door, and the first
 * draft of this file was wrong about that. Every other pack separates its
 * price entries because `matchByKeywords` ranks an AND-group by length and ties
 * go to the earlier candidate, so a money entry has to out-length the prose
 * entry that would otherwise answer it. That reasoning does not transfer here:
 * both kinds of question open the *same* pack, and which of them it is gets
 * decided inside, where the competition is. Splitting them here only spent the
 * twenty groups `hintKeywords` allows an intent across two intents instead of
 * one.
 *
 * What there are three of, instead, is **vocabulary**. `hintKeywords` caps an
 * intent at twenty groups, and a price word crossed with a subject noun is
 * multiplicative: seven price words and two nouns is already fourteen. One
 * door per service could therefore hold two nouns and nothing else, which left
 * "how much for web design" and "is there a cheaper option for seo" reaching
 * the model — both measured, not imagined. A door costs one node, one intent
 * and one edge in the main flow, so the answer is more doors rather than
 * cleverer groups: `own-door-web-build` holds the nouns for having one made
 * and `own-door-web-running` the nouns for having one already.
 *
 * WHY THE SHORT ANCHOR PHRASES ARE NOT THERE
 *
 * An earlier draft put "website", "seo" and "web design" in `phrases`, reasoning
 * that `matchByPhrase` matches by containment and nothing else on this site owns
 * those words. It does not work and should not: `lookup.ts` only uses a phrase
 * for containment when it is three words or twelve characters long, precisely so
 * that a one-word phrase cannot claim every message it appears in. The short
 * vocabulary has to be carried by keyword groups, which is what the extra door
 * is for.
 *
 * WHERE THE BOUNDARY WITH JOB SEARCH IS, AND WHY IT IS HERE
 *
 * `./job-search-flows.ts` already answers thirty CV questions — format, length,
 * photo, ATS, gaps, the cover letter, the LinkedIn headline — and four about
 * this service. Those stay there. This door is deliberately written for the
 * *other* question, which is not "how should a CV look" but "will you write
 * mine": the phrasings are commissioning phrasings, not advice phrasings. A
 * visitor asking how long a Gulf CV should be should keep reaching job search,
 * and `tests/own-work-flows.test.ts` asserts in both directions that they do.
 *
 * Websites have no such boundary. Nothing anywhere else answers a single
 * question about them, which is why that door is written wide.
 */

import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/** Matches `SUBJECTS` in scripts/seed-authored-flows.ts and the `subject` on
 *  every door below. One string, three places, and the seed refuses to run if
 *  they disagree. */
export const OWN_WORK = "own-work";

const CV = "cv-resume";
const WEB = "web-development";

/** One price word plus the subject's noun, for each of the words people use
 *  about money. "expensive" earns its place here and not in the content packs:
 *  "is your cv service expensive" is a real opener and no other price word
 *  appears in it. */
const PRICE_WORDS = ["cost", "much", "price", "fees", "charges", "cheaper", "expensive"];

const priceGroups = (...subject: string[]): string[][] =>
  PRICE_WORDS.map((word) => [word, ...subject]);

/**
 * The door vocabularies, named so the pack behind them can answer them.
 *
 * A door's phrases get a visitor *into* the pack and then stop being useful,
 * because they are not phrases of any entry inside it. Measured: 51 of the 88
 * phrasings on these three doors matched the door and then matched nothing
 * behind it, so the turn fell out to the model — a paid, hedged reply to a
 * question we have 242 written answers for.
 *
 * `./own-work-flows.ts` spreads each list onto the hub that should catch it,
 * which makes "every door phrase lands somewhere in its pack" true by
 * construction rather than by vigilance. `tests/own-work-flows.test.ts`
 * asserts it anyway, because the mapping is still a judgement.
 */
export const CV_DOOR_PHRASES = [
  "will you write my cv for me",
  "can you write my resume",
  "do you offer a cv writing service",
  "i want someone to write my cv",
  "cv writing service dubai",
  "professional resume writing in the uae",
  "can you fix my cv",
  "i need help with my cv",
  "can you rewrite my resume",
  "i want a professionally written cv",
  "can you prepare a cv for me",
  "who can write my cv in dubai",
  "can you update my existing cv",
  "my cv needs rewriting by a professional",
  "do you write cvs for nurses",
  "do you write engineering cvs",
  "can you write an academic cv",
  "i need a cv and a cover letter written",
  "do you do cv editing",
];

export const WEB_BUILD_DOOR_PHRASES = [
  "can you build me a website",
  "do you make websites",
  "i need a website for my company",
  "website design dubai",
  "web development service",
  "can you design a site for my business",
  "i want a portfolio website",
  "i need a personal website",
  "can you build an online store",
  "ecommerce website uae",
  "i need a new website my old one is outdated",
  "can you redesign my website",
  "do you do web design",
  "i need a landing page",
  "website for my new trade licence",
  "can you make a website in arabic",
  "i need a booking website",
  "i want a one page site",
  "do you build websites for small businesses in dubai",
  "corporate website design",
  "can you write the content for my website too",
];

export const WEB_RUNNING_DOOR_PHRASES = [
  "can you help with a website i already have",
  "my website is slow can you fix it",
  "do you do seo for websites",
  "i need a website that shows up on google",
  "my website is not on google",
  "can you host my website",
  "i need a domain and a website",
  "website maintenance service",
  "can you move my website from wordpress",
  "my site has been hacked",
  "i cannot get access to my own website",
];

export const OWN_WORK_DOORS: AuthoredFlow[] = [
  {
    id: "own-door-cv",
    question: "Will you write my CV for me?",
    answer:
      "Yes — CV and resume writing is one of the two things we do ourselves rather than refer out. Tell us the role you are aiming at and we will take it from there.",
    service: CV,
    opens: OWN_WORK,
    // Long and about commissioning, never short and about CVs. Job search owns
    // thirty CV advice questions, and a phrase here that matched them would
    // route somebody asking how long a Gulf CV should be into a sales
    // conversation.
    phrases: [
      ...CV_DOOR_PHRASES,
      "what do you charge for a cv",
      "how much is your cv writing service",
      "cv writing price",
      "resume writing cost in dubai",
      "how much to get my cv written",
      "what is the fee for a professional cv",
      "is your cv service expensive",
      "cv writing packages and prices",
      "how much for a cv and cover letter",
      "give me a quote for a resume",
      "what would you charge to rewrite my cv",
      "what would a cv set me back",
      "ballpark for a cv",
      "whats the damage for a resume",
    ],
    // "writing" and "written" fold to one word under `sameWord`, so never both
    // in a group. Six commissioning groups and fourteen price ones is exactly
    // the twenty `hintKeywords` allows.
    keywords: [
      ["write", "cv"],
      ["write", "resume"],
      ["rewrite", "cv"],
      ["prepare", "resume"],
      ["professional", "cv"],
      ["help", "with", "cv"],
      ...priceGroups("cv"),
      ...priceGroups("resume"),
    ],
    faq: false,
  },
  {
    id: "own-door-web-build",
    question: "Can you build me a website?",
    answer:
      "Yes — websites are the other thing we build in-house. Business sites, portfolios and personal sites, designed and written here rather than dropped onto a template.",
    service: WEB,
    opens: OWN_WORK,
    phrases: [
      ...WEB_BUILD_DOOR_PHRASES,
      "what does a website cost with you",
      "how much do you charge to build a website",
      "website design price in dubai",
      "how much is an ecommerce site",
      "give me a quote for a website",
      "how much for a five page website",
      "website packages and pricing",
      "what would a portfolio site cost",
      // Money idioms with no price word in them. Each keeps its subject noun,
      // or a bare "set me back" on a door would open this pack for a question
      // about attestation.
      "what would a website set me back",
      "what would a site set me back",
      "ballpark for a website",
      "whats the damage for a website",
    ],
    // "website" and "websites" are one word to `sameWord`, as are "design" and
    // "designer"; each group pairs a noun with a word the other reading cannot
    // supply. Six commissioning, fourteen price, which is the ceiling.
    keywords: [
      ["build", "website"],
      ["design", "website"],
      ["redesign", "website"],
      ["portfolio", "site"],
      ["landing", "page"],
      ["online", "store"],
      ...priceGroups("website"),
      ...priceGroups("site"),
    ],
    faq: false,
  },
  {
    id: "own-door-web-running",
    question: "Can you help with a website I already have?",
    answer:
      "Yes — search visibility, speed, hosting, a domain that needs moving, or a site somebody else built and then disappeared. Tell us what is wrong with it and we will look.",
    service: WEB,
    opens: OWN_WORK,
    phrases: [
      ...WEB_RUNNING_DOOR_PHRASES,
    ],
    /**
     * The long tail of the website vocabulary, and the reason this door exists
     * rather than being folded into the one above.
     *
     * "web" is three characters, so `sameWord` compares it exactly rather than
     * by prefix — which makes it a precise token that appears in "web design",
     * "web hosting" and "web development" and in almost nothing else a visitor
     * types here. That one noun carries three subjects for the price of seven
     * groups.
     */
    keywords: [
      ...priceGroups("web"),
      ...priceGroups("seo"),
      ["slow", "website"],
      ["hacked", "website"],
      ["move", "website"],
      ["maintain", "website"],
      ["renew", "domain"],
      ["google", "website", "showing"],
    ],
    faq: false,
  },
];
