/**
 * The four situations people actually arrive in, and the real sequence of steps
 * each one requires.
 *
 * This is the site's most useful content: almost every enquiry is someone who
 * knows what they want but not what order the paperwork happens in. It lives as
 * data rather than markup so the hero, the service pages and later the chatbot
 * all answer from one description of the process.
 *
 * Steps deliberately describe the process, not our pricing, and never state a
 * government fee or a duration — those change and are quoted per case.
 */

export interface PathStep {
  /** What the applicant has to get done at this point. */
  text: string;
  /** The service that does it, or null when it is the applicant's own move. */
  service: string | null;
}

export interface Path {
  id: string;
  /** First person, because that is how someone identifies themselves. */
  label: string;
  labelAr: string;
  /** Shown once a path is open, to confirm they picked the right one. */
  intro: string;
  steps: PathStep[];
}

/** One journey a service appears in, and where along it. */
export interface Stage {
  path: Path;
  /** 0-based index of the first step this service does. */
  index: number;
}

/**
 * The journeys this service is a step of.
 *
 * The site's whole premise is that nobody arrives at the beginning, so a
 * service page that says only what the service is leaves the most useful thing
 * unsaid: which stage of what you are at, and what happens either side of it.
 * That is already written down in `PATHS` — this just reads it back out.
 */
export function stagesFor(serviceSlug: string): Stage[] {
  const found: Stage[] = [];
  for (const path of PATHS) {
    const index = path.steps.findIndex((step) => step.service === serviceSlug);
    if (index !== -1) found.push({ path, index });
  }
  return found;
}

export const PATHS: Path[] = [
  {
    id: "job-offer",
    label: "I have a job offer",
    labelAr: "لدي عرض عمل",
    intro:
      "Your employer handles the permit. What holds most people up is their own certificates — those have to be attested and translated before the permit can be issued.",
    steps: [
      {
        text: "Get your degree and experience certificates attested, starting in the country that issued them",
        service: "attestation",
      },
      {
        text: "Have them translated into Arabic by a translator licensed by the Ministry of Justice",
        service: "legal-translation",
      },
      {
        text: "Your employer applies for the work permit and entry permit",
        service: null,
      },
      {
        text: "Medical test, Emirates ID, then the residence visa is stamped",
        service: "visa-processing",
      },
    ],
  },
  {
    id: "family",
    label: "I'm bringing my family",
    labelAr: "أريد كفالة عائلتي",
    intro:
      "Sponsorship depends on your salary and your housing, so it is worth checking you qualify before you start paying for attestation.",
    steps: [
      {
        text: "Check your salary and tenancy meet the sponsorship conditions for your emirate",
        service: "visa-processing",
      },
      {
        text: "Get your marriage certificate, and each child's birth certificate, attested",
        service: "attestation",
      },
      {
        text: "Have them translated into Arabic",
        service: "legal-translation",
      },
      {
        text: "Apply for entry permits, then medicals and Emirates ID for each person",
        service: "visa-processing",
      },
    ],
  },
  {
    id: "company",
    label: "I'm starting a company",
    labelAr: "أريد تأسيس شركة",
    intro:
      "The first decision sets everything after it. Mainland or free zone determines who you are allowed to invoice, how many visas you get, and what the licence costs.",
    steps: [
      {
        text: "Choose mainland or free zone based on who your customers will be",
        service: "business-setup",
      },
      {
        text: "Reserve the trade name and obtain initial approval for your activity",
        service: "business-setup",
      },
      {
        text: "Notarise the memorandum and any powers of attorney",
        service: "notary",
      },
      {
        text: "Licence issued, then establishment card, bank account and investor visa",
        service: "business-setup",
      },
    ],
  },
  {
    id: "study",
    label: "I'm applying to study",
    labelAr: "أريد إكمال دراستي",
    intro:
      "Universities work to intake deadlines, and equivalency takes longer than people expect. Start with the certificates, not the application.",
    steps: [
      {
        text: "Shortlist programmes that match your grades, budget and what you want afterwards",
        service: "higher-studies",
      },
      {
        text: "Get your school or degree certificates attested",
        service: "attestation",
      },
      {
        text: "Apply for equivalency where the university or regulator requires it",
        service: "higher-studies",
      },
      {
        text: "Once you hold an offer, apply for the student visa",
        service: "higher-studies",
      },
    ],
  },
];
