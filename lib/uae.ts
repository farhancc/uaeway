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

export function normalizeEmirate(input: string | null | undefined): Emirate | null {
  if (!input) return null;
  const text = input.toLowerCase();
  for (const [alias, emirate] of Object.entries(ALIASES)) {
    if (text.includes(alias)) return emirate;
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
