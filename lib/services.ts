import { phraseMatches, tokenize } from "./text";

/**
 * The eight service lines the site exists to sell.
 *
 * These are fixed business facts, not content — they change perhaps once a year,
 * so they live in code rather than the database. Service pages, chatbot
 * grounding, lead routing and the job-page CTAs all read from here, which keeps
 * one definition of what we sell and how we talk about it.
 */

export type LicenceStatus =
  /** Wordcraft is licensed to deliver this itself. */
  | "direct"
  /** Delivered through a licensed partner; the site must say so. */
  | "partner"
  /** Not yet confirmed by the business — copy stays neutral until it is. */
  | "unconfirmed";

export interface IntakeField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export interface Service {
  slug: string;
  /** Full name, used as the page H1. */
  name: string;
  /** Arabic name, shown as the bilingual counterpart the way UAE documents do.
   *  Have a native speaker verify these before launch. */
  nameAr: string;
  /** Short label for navigation and CTA buttons. */
  shortName: string;
  /** One line under the H1. */
  tagline: string;
  /** Two or three sentences; also fed to the chatbot as grounding. */
  summary: string;
  whoItsFor: string[];
  /** What we do, in order. Shown as a numbered process. */
  process: string[];
  /** Documents the client must provide. Often the real reason someone calls. */
  documents: string[];
  turnaround: string;
  /** Matched against visitor questions and job categories for CTA targeting. */
  keywords: string[];
  intake: IntakeField[];
  related: string[];
  licence: LicenceStatus;
  /**
   * Set once pricing is agreed. Left undefined deliberately: an invented price
   * on a regulated service is worse than no price.
   */
  priceFrom?: { amountAed: number; unit: string };
}

const CONTACT_FIELDS: IntakeField[] = [
  { name: "name", label: "Your name", type: "text", required: true },
  { name: "phone", label: "WhatsApp number", type: "tel", required: true },
  { name: "email", label: "Email", type: "email", required: false },
];

export const SERVICES: Service[] = [
  {
    slug: "legal-translation",
    name: "Certified Legal Translation",
    nameAr: "ترجمة قانونية معتمدة",
    shortName: "Legal translation",
    tagline: "Arabic and English translations accepted by UAE authorities.",
    summary:
      "Certified translation of certificates, contracts and court documents between Arabic and English. UAE government departments, courts and most employers will only accept a translation produced by a legal translator licensed by the Ministry of Justice, which is why an ordinary translation is usually rejected.",
    whoItsFor: [
      "Job seekers whose degree or experience certificates are not in Arabic",
      "Anyone submitting documents to a UAE court, notary or government department",
      "Companies filing contracts, MoUs or licences",
    ],
    process: [
      "Send a photo or scan of the document on WhatsApp for a quote",
      "We confirm price and turnaround before starting",
      "A licensed legal translator produces the translation",
      "You receive the stamped, signed certified copy — soft copy first, hard copy on request",
    ],
    documents: [
      "Clear scan or photo of every page",
      "Correct spelling of names as written in the passport",
      "The authority the translation is for, if you know it",
    ],
    turnaround: "Same day for short documents; 2–3 working days for long or technical files",
    keywords: [
      "legal translation",
      "certified translation",
      "arabic translation",
      "translate certificate",
      "ministry of justice translator",
      "document translation",
      "court translation",
    ],
    intake: [
      ...CONTACT_FIELDS,
      {
        name: "documentType",
        label: "What needs translating?",
        type: "select",
        required: true,
        options: [
          "Degree or diploma certificate",
          "Experience or salary certificate",
          "Marriage or birth certificate",
          "Contract or agreement",
          "Court or legal document",
          "Other",
        ],
      },
      { name: "need", label: "Anything else we should know?", type: "textarea", required: false },
    ],
    related: ["attestation", "notary", "visa-processing"],
    licence: "unconfirmed",
  },
  {
    slug: "attestation",
    name: "Certificate Attestation",
    nameAr: "تصديق الشهادات",
    shortName: "Attestation",
    tagline: "Home country, embassy and MoFAIC attestation, handled end to end.",
    summary:
      "Attestation is the chain of stamps that proves a document issued outside the UAE is genuine. It normally runs from the issuing authority in your home country, through that country's foreign ministry, the UAE embassy there, and finally the UAE Ministry of Foreign Affairs. Missing one step means the document is refused.",
    whoItsFor: [
      "New employees whose degree certificate must be attested for a work permit",
      "Parents enrolling children in a UAE school",
      "Anyone applying for a family or golden visa",
    ],
    process: [
      "We confirm which stamps your document already has and what is missing",
      "We quote the full remaining chain, with government fees itemised separately",
      "We run the document through each authority in order",
      "You get the attested original back, plus a scan at each milestone",
    ],
    documents: [
      "Original certificate (copies cannot be attested)",
      "Passport copy",
      "Any attestation stamps already obtained",
    ],
    turnaround: "Depends heavily on the issuing country — we give a realistic range before starting",
    keywords: [
      "attestation",
      "certificate attestation",
      "degree attestation",
      "mofa attestation",
      "embassy attestation",
      "document verification",
      "equivalency",
    ],
    intake: [
      ...CONTACT_FIELDS,
      {
        name: "documentType",
        label: "Which document?",
        type: "select",
        required: true,
        options: [
          "Degree or diploma certificate",
          "School certificate",
          "Marriage certificate",
          "Birth certificate",
          "Police clearance",
          "Other",
        ],
      },
      { name: "issuingCountry", label: "Country that issued it", type: "text", required: true },
      { name: "need", label: "What is it for?", type: "textarea", required: false },
    ],
    related: ["legal-translation", "visa-processing", "higher-studies"],
    licence: "unconfirmed",
  },
  {
    slug: "visa-processing",
    name: "UAE Visa Processing",
    nameAr: "تأشيرات الإقامة",
    shortName: "Visa processing",
    tagline: "Employment, family, freelance and long-term residence applications.",
    summary:
      "Paperwork and submission support for UAE residence visa applications — employment, family sponsorship, freelance permits and long-term residence. Most rejections come from document mismatches rather than eligibility, so the work is in getting the file right before it is submitted.",
    whoItsFor: [
      "Employers processing a new hire's residence visa",
      "Residents sponsoring a spouse, children or parents",
      "Freelancers and remote workers who need their own permit",
    ],
    process: [
      "We review your situation and list exactly which documents your application needs",
      "We check every document for the mismatches that cause rejections",
      "We prepare and submit the application through the correct channel",
      "We track it and tell you what each status change actually means",
    ],
    documents: [
      "Passport with sufficient validity",
      "Passport photo to UAE specification",
      "Attested certificates where the visa type requires them",
      "Supporting documents that vary by visa type — we confirm per case",
    ],
    turnaround: "Varies by visa type and authority; we give a current estimate at the start",
    keywords: [
      "visa",
      "residence visa",
      "employment visa",
      "work permit",
      "family visa",
      "golden visa",
      "freelance visa",
      "visa renewal",
      "status change",
      "emirates id",
    ],
    intake: [
      ...CONTACT_FIELDS,
      {
        name: "visaType",
        label: "Which visa?",
        type: "select",
        required: true,
        options: [
          "Employment visa",
          "Family sponsorship",
          "Freelance permit",
          "Golden / long-term residence",
          "Renewal",
          "Not sure yet",
        ],
      },
      { name: "need", label: "Tell us your situation", type: "textarea", required: false },
    ],
    related: ["attestation", "legal-translation", "business-setup"],
    licence: "unconfirmed",
  },
  {
    slug: "notary",
    name: "Notary & Public Documentation",
    nameAr: "كاتب العدل",
    shortName: "Notary",
    tagline: "Powers of attorney, affidavits and notarised agreements.",
    summary:
      "Preparation and notarisation support for powers of attorney, affidavits, declarations, memoranda of association and similar instruments. A UAE notary will reject a document whose wording, translation or signatory authority is not exactly right, so drafting matters as much as the appointment.",
    whoItsFor: [
      "Anyone granting a power of attorney inside or outside the UAE",
      "Business partners formalising an agreement",
      "People who need a sworn declaration for a government or court process",
    ],
    process: [
      "We confirm what instrument you actually need and who must sign",
      "We draft or review the wording in the required bilingual format",
      "We arrange the notary appointment",
      "You receive the notarised document and a digital copy",
    ],
    documents: [
      "Emirates ID and passport of every signatory",
      "Trade licence and company documents for corporate instruments",
      "Details of the person or company being granted authority",
    ],
    turnaround: "Typically 1–3 working days including the appointment",
    keywords: [
      "notary",
      "notary public",
      "power of attorney",
      "poa",
      "affidavit",
      "notarised agreement",
      "memorandum of association",
      "declaration",
    ],
    intake: [
      ...CONTACT_FIELDS,
      {
        name: "documentType",
        label: "What do you need notarised?",
        type: "select",
        required: true,
        options: [
          "Power of attorney",
          "Affidavit or declaration",
          "Company agreement",
          "Memorandum of association",
          "Other",
        ],
      },
      { name: "need", label: "Brief details", type: "textarea", required: false },
    ],
    related: ["legal-translation", "business-setup", "attestation"],
    licence: "unconfirmed",
  },
  {
    slug: "business-setup",
    name: "Business Setup in the UAE",
    nameAr: "تأسيس الشركات",
    shortName: "Business setup",
    tagline: "Mainland and free zone company formation, start to licence in hand.",
    summary:
      "End-to-end company formation: choosing between mainland and free zone, reserving the trade name, drafting the constitutional documents, obtaining the licence, opening the corporate bank account and processing investor and staff visas. The structure you pick at the start determines your costs, your visa quota and what you are allowed to invoice for.",
    whoItsFor: [
      "Founders setting up their first UAE entity",
      "Foreign companies opening a UAE branch",
      "Freelancers outgrowing a permit and needing a real licence",
    ],
    process: [
      "We map your activity to the right jurisdiction and licence type",
      "Trade name reservation and initial approval",
      "Constitutional documents, notarisation and lease or flexi-desk",
      "Licence issue, establishment card, then bank account and visas",
    ],
    documents: [
      "Passport copies of all shareholders",
      "Proposed trade names in order of preference",
      "A clear description of the activities you intend to carry out",
      "Existing corporate documents if a company is a shareholder",
    ],
    turnaround: "Free zone setups are typically faster than mainland; we give a realistic timeline per jurisdiction",
    keywords: [
      "business setup",
      "company formation",
      "trade licence",
      "free zone",
      "mainland",
      "llc",
      "corporate bank account",
      "investor visa",
      "start a business in dubai",
      "branch office",
    ],
    intake: [
      ...CONTACT_FIELDS,
      { name: "activity", label: "What will the business do?", type: "text", required: true },
      {
        name: "jurisdiction",
        label: "Preference",
        type: "select",
        required: false,
        options: ["Mainland", "Free zone", "Not sure — advise me"],
      },
      { name: "need", label: "Anything else?", type: "textarea", required: false },
    ],
    related: ["visa-processing", "notary", "web-development"],
    licence: "unconfirmed",
  },
  {
    slug: "higher-studies",
    name: "Higher Studies & Student Visa Support",
    nameAr: "الدراسة والقبول الجامعي",
    shortName: "Higher studies",
    tagline: "University applications, equivalency and student visas.",
    summary:
      "Support for students applying to universities in the UAE and abroad: shortlisting programmes, preparing the application, getting certificates attested and equivalency recognised, and processing the student visa. Certificate equivalency is where most UAE applications stall.",
    whoItsFor: [
      "School leavers applying to UAE universities",
      "UAE residents applying to universities abroad",
      "Professionals returning to study part-time",
    ],
    process: [
      "We shortlist programmes that match your grades, budget and goal",
      "We prepare the application file and personal statement",
      "We handle certificate attestation and equivalency",
      "We process the student visa once you have an offer",
    ],
    documents: [
      "School or previous degree certificates and transcripts",
      "Passport copy",
      "English language test result where required",
    ],
    turnaround: "Driven by university intake deadlines — start early",
    keywords: [
      "higher studies",
      "university admission",
      "student visa",
      "equivalency",
      "study in dubai",
      "masters",
      "scholarship",
      "transcript",
    ],
    intake: [
      ...CONTACT_FIELDS,
      { name: "programme", label: "What do you want to study?", type: "text", required: true },
      {
        name: "destination",
        label: "Where?",
        type: "select",
        required: false,
        options: ["UAE", "UK", "Europe", "Canada / USA", "Australia", "Not decided"],
      },
      { name: "need", label: "Your current qualification", type: "textarea", required: false },
    ],
    related: ["attestation", "legal-translation", "cv-resume"],
    licence: "unconfirmed",
  },
  {
    slug: "cv-resume",
    name: "CV & Resume Writing",
    nameAr: "كتابة السيرة الذاتية",
    shortName: "CV writing",
    tagline: "A UAE-market CV that gets past the filter and reads like a person wrote it.",
    summary:
      "We rewrite your CV for the UAE market: the format recruiters here expect, the keywords applicant tracking systems screen for, and achievements written as results rather than duties. Includes a matching cover letter and LinkedIn summary.",
    whoItsFor: [
      "Job seekers applying to UAE employers for the first time",
      "Experienced professionals whose CV is not getting interviews",
      "Graduates with no UAE work history",
    ],
    process: [
      "You send your current CV and the kind of role you are targeting",
      "A short call or WhatsApp exchange to pull out achievements you left off",
      "We write the CV, cover letter and LinkedIn summary",
      "One round of revisions included",
    ],
    documents: [
      "Your current CV in any format",
      "One or two job adverts for roles you want",
      "Certificates you want referenced",
    ],
    turnaround: "2–3 working days",
    keywords: [
      "cv",
      "resume",
      "cv writing",
      "resume writing",
      "cover letter",
      "linkedin profile",
      "ats",
      "job application",
      "interview",
    ],
    intake: [
      ...CONTACT_FIELDS,
      { name: "targetRole", label: "Role you are targeting", type: "text", required: true },
      { name: "need", label: "Years of experience and current field", type: "textarea", required: false },
    ],
    related: ["legal-translation", "attestation", "web-development"],
    licence: "direct",
  },
  {
    slug: "web-development",
    name: "Business & Portfolio Websites",
    nameAr: "تصميم المواقع",
    shortName: "Websites",
    tagline: "A fast, findable website for your company or your own name.",
    summary:
      "We design and build business websites, portfolios and personal sites: a clear structure, copy that reads well, technical SEO done properly, and a contact path that actually produces enquiries. Built to load fast on a phone, because that is where your visitors are.",
    whoItsFor: [
      "New UAE companies that need a site before they can pitch",
      "Professionals who need a portfolio or personal site",
      "Businesses whose current site is slow, dated or invisible on Google",
    ],
    process: [
      "We agree the pages, the audience and what a visitor should do",
      "Design, then build, with you reviewing at both stages",
      "Content, SEO fundamentals and analytics",
      "Launch on your domain, with a handover you can maintain",
    ],
    documents: [
      "Logo and any brand assets you have",
      "Trade licence if the site makes commercial claims",
      "Text, photos and product details, or brief us and we will write it",
    ],
    turnaround: "1–3 weeks for a standard business site",
    keywords: [
      "website",
      "web design",
      "web development",
      "portfolio website",
      "personal website",
      "company website",
      "landing page",
      "seo",
      "ecommerce",
    ],
    intake: [
      ...CONTACT_FIELDS,
      {
        name: "siteType",
        label: "What kind of site?",
        type: "select",
        required: true,
        options: ["Business website", "Portfolio / personal", "Online store", "Landing page", "Redesign"],
      },
      { name: "need", label: "What should it achieve?", type: "textarea", required: false },
    ],
    related: ["business-setup", "cv-resume"],
    licence: "direct",
  },
];

const BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));

export function getService(slug: string): Service | undefined {
  return BY_SLUG.get(slug);
}

export function serviceSlugs(): string[] {
  return SERVICES.map((s) => s.slug);
}

/**
 * Services whose keywords appear in the given text, best match first.
 *
 * Used to put the right CTA on a job page and to pick the service the chatbot
 * should steer toward. A multi-word keyword only counts when every one of its
 * words is present, so "business setup" does not fire on the word "business"
 * alone; longer keywords score higher because they are more specific.
 */
export function matchServices(text: string, limit = 3): Service[] {
  const words = tokenize(text);
  if (words.length === 0) return [];

  return SERVICES.map((service) => {
    let score = 0;
    for (const keyword of service.keywords) {
      if (phraseMatches(words, keyword)) {
        score += tokenize(keyword).length * 2 + keyword.length / 10;
      }
    }
    return { service, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.service);
}
