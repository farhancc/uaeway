/** The seven emirates, as we label them across the site. */
export const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
] as const;

export type Emirate = (typeof EMIRATES)[number];

/** Free-text locations mapped onto an emirate, or null when it is unclear.
 *  Includes the spellings and well-known districts that actually turn up in
 *  job feeds, because "Jebel Ali" and "RAK" are far more common than the
 *  official names. */
const ALIASES: Record<string, Emirate> = {
  dubai: "Dubai",
  dxb: "Dubai",
  deira: "Dubai",
  bur: "Dubai",
  jebel: "Dubai",
  jumeirah: "Dubai",
  "al qusais": "Dubai",
  "business bay": "Dubai",
  "abu dhabi": "Abu Dhabi",
  abudhabi: "Abu Dhabi",
  auh: "Abu Dhabi",
  "al ain": "Abu Dhabi",
  ruwais: "Abu Dhabi",
  sharjah: "Sharjah",
  shj: "Sharjah",
  ajman: "Ajman",
  "ras al khaimah": "Ras Al Khaimah",
  "ras al-khaimah": "Ras Al Khaimah",
  rak: "Ras Al Khaimah",
  fujairah: "Fujairah",
  "umm al quwain": "Umm Al Quwain",
  "umm al quwait": "Umm Al Quwain",
  "umm al-quwain": "Umm Al Quwain",
  uaq: "Umm Al Quwain",
};

/**
 * A location field, as one of the seven.
 *
 * Substring matching is deliberate and right for the thing this was written
 * for: a feed's location is "Jebel Ali Free Zone, Dubai, UAE" and nothing else,
 * so finding an alias anywhere in it is finding the emirate. It is the wrong
 * rule for free prose — see `emirateInText` below.
 */
export function normalizeEmirate(input: string | null | undefined): Emirate | null {
  if (!input) return null;
  const text = input.toLowerCase();
  for (const [alias, emirate] of Object.entries(ALIASES)) {
    if (text.includes(alias)) return emirate;
  }
  return null;
}

/**
 * The emirate a sentence names, on whole words only.
 *
 * The chat needs this and `normalizeEmirate` is unsafe for it: `bur` is an
 * alias — Bur Dubai, which really does turn up in job feeds — and a substring
 * test for it against a visitor's sentence finds it inside "burger" and
 * "bartender". One wrong word turns "any burger chef jobs" into a search
 * filtered to Dubai, and nothing about the reply would show it.
 *
 * So the aliases are matched against the message's own words, longest first,
 * because three of the seven are spelled with two or three of them.
 */
export function emirateInText(text: string): Emirate | null {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  for (const width of [3, 2, 1]) {
    for (let i = 0; i + width <= words.length; i++) {
      const window = words.slice(i, i + width).join(" ");
      const found = ALIASES[window];
      if (found) return found;
    }
  }
  return null;
}

/** Job categories we file listings under. Fixed so filters stay stable. */
export const JOB_CATEGORIES = [
  "Sales & Marketing",
  "Accounting & Finance",
  "Administration",
  "Construction & Engineering",
  "Driving & Logistics",
  "Healthcare",
  "Hospitality & Retail",
  "Human Resources",
  "IT & Software",
  "Education",
  "Legal",
  "Other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
