/**
 * Who arrives, and what the site owes each of them.
 *
 * `./paths.ts` already answers "what order does the paperwork happen in" for
 * four situations, and it is the site's best content. What it cannot answer is
 * the question most people actually open with, which is not about a process at
 * all: *I am an engineer / a teacher / a landlord / here on a visit — what
 * applies to me?*
 *
 * Those are two different axes and this file holds both, because a visitor
 * does not know they are on one.
 *
 *   - A **situation** is something you are trying to do. Four of them already
 *     exist as `PATHS` and are referenced by id rather than restated, so the
 *     homepage picker, the stage strip on a service page, the seeded chat
 *     answers and these pages all describe the sequence once. The rest —
 *     visiting, renting property out, leaving — are new and carry their own
 *     steps.
 *   - A **profession** is what you do. The paperwork barely changes between
 *     an engineer and a teacher; what changes is *who decides*, and that is
 *     the whole value of the page. An engineer needs the Society of Engineers,
 *     a teacher needs the emirate's education authority, a nurse needs DHA,
 *     DOH or MOHAP, an agent needs RERA — and none of them can find that out
 *     from a page about attestation.
 *
 * WHAT MAY BE SAID HERE
 *
 * The same rules as every other piece of published content, and `authorities`
 * exists to make the hardest one easy to keep. No fee, no processing time, no
 * eligibility rule and no outcome is stated as fact anywhere in this file;
 * where a page would want to, it names the body that decides instead. A reader
 * who leaves with the right authority's name has got the thing they could not
 * have found on their own, and nothing they can be misled by.
 *
 * Data rather than markup, like `./services.ts` and `./paths.ts`, so the page,
 * the index, the sitemap and the internal links all read one description.
 */

import { PATHS, type Path, type PathStep } from "./paths";
import { getService, type Service } from "./services";

/** A body that decides something about this person, and what it decides.
 *  Never what it will decide — that is theirs, and it changes. */
export interface Authority {
  name: string;
  decides: string;
}

export interface Audience {
  /** The URL segment: /en/for/engineers. Permanent once published. */
  slug: string;
  /**
   * Which axis this is.
   *
   * It drives how the index groups them and nothing else. A visitor does not
   * care about the distinction; an author adding the fourteenth entry does,
   * because the two kinds are written differently.
   */
  kind: "situation" | "profession";
  /** The page's H1, and how the index lists it. */
  title: string;
  titleAr: string;
  /** First person, because that is how someone recognises themselves in a
   *  list. Used on the index and in internal links. */
  label: string;
  /** The sentence under the H1, and the meta description. */
  intro: string;
  whoItsFor: string[];
  /**
   * The journey already described in `./paths.ts`, by id.
   *
   * Referenced rather than copied: a path's steps are the site's single
   * description of a sequence, and a second copy here would be the one that
   * goes stale.
   */
  path: string | null;
  /** Steps this audience has that the path does not, or the whole sequence
   *  where there is no path. */
  steps: PathStep[];
  authorities: Authority[];
  /** Service slugs, in the order they come up for this person. */
  services: string[];
  /**
   * What to search the jobs board for, or null where listings are not the
   * point. Deliberately a term the board actually returns rows for — see the
   * verified yields in `lib/chat/jobs/`; "technician" and "chef" return none,
   * so an audience page built on one would be an empty section.
   */
  jobQuery: string | null;
}

export const AUDIENCES: Audience[] = [
  /* ── Situations ────────────────────────────────────────────────────────── */
  {
    slug: "job-seekers",
    kind: "situation",
    title: "Looking for work in the UAE",
    titleAr: "الباحثون عن عمل",
    label: "I am looking for a job",
    intro:
      "Most of the work happens before an employer ever sees you: a CV written for this market, certificates that will survive being checked, and knowing which offers are worth answering.",
    whoItsFor: [
      "People applying from outside the UAE for the first time",
      "Residents on a family or student visa who want to work",
      "Anyone whose applications are not getting replies",
    ],
    path: null,
    steps: [
      { text: "Get your CV into the format this market screens for", service: "cv-resume" },
      {
        text: "Start attesting your degree and experience certificates now — this is the slow part and it happens in the country that issued them",
        service: "attestation",
      },
      { text: "Apply, and check every employer and agency before sending documents", service: null },
      {
        text: "Once you have an offer, the employer applies for the permit and the residence visa",
        service: "visa-processing",
      },
    ],
    authorities: [
      { name: "MOHRE", decides: "work permits and the labour contract for mainland employers" },
      { name: "The free zone authority", decides: "the same, where the employer is in a free zone" },
    ],
    services: ["cv-resume", "attestation", "legal-translation", "visa-processing"],
    jobQuery: "",
  },
  {
    slug: "new-arrivals",
    kind: "situation",
    title: "Moving here for a job",
    titleAr: "القادمون الجدد",
    label: "I have accepted an offer and I am moving",
    intro:
      "You have the job. What is left is a sequence that starts in the country you are leaving and finishes with an Emirates ID — and doing it in the wrong order is what costs people weeks.",
    whoItsFor: [
      "People who have signed an offer and not yet flown",
      "Anyone in their first weeks here and unsure what happens next",
      "Employees whose employer has asked for attested documents",
    ],
    path: "job-offer",
    steps: [],
    authorities: [
      { name: "ICP or GDRFA", decides: "the entry permit and the residence visa" },
      { name: "MOFAIC", decides: "the final attestation of a foreign document inside the UAE" },
    ],
    services: ["attestation", "legal-translation", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "visitors",
    kind: "situation",
    title: "Here on a visit",
    titleAr: "الزوار",
    label: "I am visiting, not living here",
    intro:
      "A visit visa is not a work permit and not a residence, and the two questions worth getting right early are what you may do on it and what happens if your plans change while you are here.",
    whoItsFor: [
      "People exploring the market before committing to a move",
      "Anyone attending interviews on a visit visa",
      "Family visiting a resident",
    ],
    path: null,
    steps: [
      { text: "Check what your visa permits before accepting any paid work", service: null },
      {
        text: "If an employer wants to hire you, ask whether your status can be changed from inside the country or whether you have to exit",
        service: "visa-processing",
      },
      {
        text: "Bring any certificate you might need already attested — starting that chain from here is far harder",
        service: "attestation",
      },
    ],
    authorities: [
      { name: "ICP", decides: "visit visas, extensions and whether a status change is possible" },
    ],
    services: ["visa-processing", "attestation", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "families",
    kind: "situation",
    title: "Bringing your family",
    titleAr: "كفالة العائلة",
    label: "I want to sponsor my family",
    intro:
      "Two things run in parallel and only one of them is in your control: the documents, which you can start today, and the sponsorship conditions, which are the authority's.",
    whoItsFor: [
      "Residents sponsoring a spouse or children",
      "Anyone whose marriage or birth certificates were issued abroad",
      "Parents timing a move around a school year",
    ],
    path: "family",
    steps: [],
    authorities: [
      { name: "ICP or GDRFA", decides: "sponsorship eligibility and the residence visas" },
      { name: "The school's regulator", decides: "admission requirements, which differ by emirate" },
    ],
    services: ["attestation", "legal-translation", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "business-owners",
    kind: "situation",
    title: "Setting up a company",
    titleAr: "أصحاب الأعمال",
    label: "I am starting a business",
    intro:
      "The first decision is not a document. Mainland or free zone determines who you may invoice, how many visas you get and what the licence covers, and everything after it follows from that.",
    whoItsFor: [
      "Founders choosing between mainland and a free zone",
      "Existing companies opening a UAE branch",
      "Freelancers deciding whether a permit or a licence fits",
    ],
    path: "company",
    steps: [],
    authorities: [
      { name: "The DED of your emirate", decides: "a mainland licence and its activities" },
      { name: "The free zone authority", decides: "a free zone licence, its visas and its premises" },
      { name: "The Federal Tax Authority", decides: "corporate tax and VAT registration" },
    ],
    services: ["business-setup", "notary", "attestation", "web-development"],
    jobQuery: null,
  },
  {
    slug: "students",
    kind: "situation",
    title: "Studying here",
    titleAr: "الطلاب",
    label: "I am applying to study",
    intro:
      "Universities work to intake deadlines and equivalency takes longer than people expect, so the sequence is driven by their calendar rather than by how long each stamp takes.",
    whoItsFor: [
      "Applicants to a UAE university from abroad",
      "Residents whose children are finishing school here",
      "Anyone who needs a foreign qualification recognised",
    ],
    path: "study",
    steps: [],
    authorities: [
      { name: "The Ministry of Higher Education", decides: "equivalency of a foreign qualification" },
      { name: "The university", decides: "admission, and which form of each document it accepts" },
    ],
    services: ["higher-studies", "attestation", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "landlords",
    kind: "situation",
    title: "Renting out a property",
    titleAr: "أصحاب العقارات",
    label: "I rent out a property",
    intro:
      "Most of what goes wrong between a landlord and a tenant here is decided by two things written down before anyone moves in: the contract, and whether the tenancy was registered.",
    whoItsFor: [
      "Owners letting a property for the first time",
      "Overseas owners managing from abroad",
      "Anyone in a dispute with a tenant",
    ],
    path: null,
    steps: [
      { text: "Register the tenancy — a utility transfer, a visa application and a dispute all get checked against it", service: null },
      {
        text: "If you are not in the country, put a power of attorney in place so someone can act for you",
        service: "notary",
      },
      { text: "Keep every notice and request in writing; a dispute is won on the paper trail", service: null },
      {
        text: "Where it cannot be settled, the emirate's rental disputes body hears it",
        service: null,
      },
    ],
    authorities: [
      { name: "The land department", decides: "tenancy registration and the rental index that bounds an increase" },
      { name: "The Rental Disputes Centre", decides: "a dispute between landlord and tenant in Dubai" },
      { name: "RERA", decides: "what a letting agent may do on your behalf" },
    ],
    services: ["notary", "legal-translation", "web-development"],
    jobQuery: null,
  },
  {
    slug: "leavers",
    kind: "situation",
    title: "Leaving the UAE",
    titleAr: "المغادرون",
    label: "I am leaving the country",
    intro:
      "There is more to close down than most people allow time for, and the order matters: debts and anything with a notice period take longest, and the visa cancellation comes near the end rather than the beginning.",
    whoItsFor: [
      "Anyone with a departure date and a list they have not written yet",
      "People leaving with a loan, a lease or a car still open",
      "Parents needing a school transfer certificate",
    ],
    path: null,
    steps: [
      { text: "Settle loans and cards, and get a clearance letter from each bank", service: null },
      { text: "End the tenancy, close the utilities and collect the clearances", service: null },
      { text: "Attest anything UAE-issued you may need to prove abroad, while you are still here", service: "attestation" },
      { text: "Cancel dependants' visas, then your own, and keep proof of it", service: "visa-processing" },
    ],
    authorities: [
      { name: "ICP or GDRFA", decides: "the visa cancellation and the grace period after it" },
      { name: "Your bank", decides: "the liability and clearance letters a return may depend on" },
    ],
    services: ["attestation", "legal-translation", "visa-processing"],
    jobQuery: null,
  },

  /* ── Professions ───────────────────────────────────────────────────────── */
  {
    slug: "engineers",
    kind: "profession",
    title: "Engineers",
    titleAr: "المهندسون",
    label: "I am an engineer",
    intro:
      "Your degree does the work here, which is why its attestation is the long pole — and for a lot of roles the registration sitting on top of it decides whether you can sign anything at all.",
    whoItsFor: [
      "Civil, mechanical, electrical and MEP engineers moving here",
      "Engineers already here who need to register to sign off work",
      "Graduates whose first role is on site",
    ],
    path: null,
    steps: [
      {
        text: "Attest your degree in the country that issued it, then at the UAE mission, then MOFAIC",
        service: "attestation",
      },
      { text: "Have it translated into Arabic where the receiving body asks", service: "legal-translation" },
      { text: "Ask the Society of Engineers and the municipality what your discipline and grade require", service: null },
      { text: "Write the CV around projects and scope rather than job titles", service: "cv-resume" },
    ],
    authorities: [
      { name: "The Society of Engineers", decides: "engineering registration and its grades" },
      { name: "The municipality of your emirate", decides: "who may sign off work locally" },
    ],
    services: ["attestation", "legal-translation", "cv-resume", "visa-processing"],
    jobQuery: "engineer",
  },
  {
    slug: "healthcare",
    kind: "profession",
    title: "Doctors, nurses and allied health",
    titleAr: "القطاع الصحي",
    label: "I work in healthcare",
    intro:
      "Nothing moves until the licence does. Which authority licenses you depends on where you will work, and an application that reaches a recruiter without a clear licensing position is set aside whatever the experience says.",
    whoItsFor: [
      "Nurses, doctors, pharmacists and technicians applying from abroad",
      "Anyone part-way through an eligibility or exam process",
      "Clinicians moving between emirates",
    ],
    path: null,
    steps: [
      { text: "Work out which authority licenses your role in the emirate you are aiming at", service: null },
      { text: "Attest your degree, your registration and your experience letters", service: "attestation" },
      { text: "Translate what the authority asks to be translated", service: "legal-translation" },
      { text: "Put your licensing stage on the CV in plain words, whatever it is", service: "cv-resume" },
    ],
    authorities: [
      { name: "DHA", decides: "licensing to practise in Dubai" },
      { name: "DOH", decides: "licensing to practise in Abu Dhabi" },
      { name: "MOHAP", decides: "licensing in the northern emirates" },
    ],
    services: ["attestation", "legal-translation", "cv-resume", "visa-processing"],
    jobQuery: "nurse",
  },
  {
    slug: "teachers",
    kind: "profession",
    title: "Teachers",
    titleAr: "المعلمون",
    label: "I am a teacher",
    intro:
      "Schools hire against a curriculum before they hire against a subject, and they hire months ahead of the academic year — so the documents have to be ready long before the posts appear.",
    whoItsFor: [
      "Teachers applying to British, American, IB and Indian curriculum schools",
      "Teaching assistants and school administrators",
      "Anyone who needs a teaching permit for the emirate they will work in",
    ],
    path: null,
    steps: [
      { text: "Attest your degree and your teaching qualification", service: "attestation" },
      { text: "Translate them where the school or the authority asks", service: "legal-translation" },
      { text: "Ask the emirate's education authority what permit your role needs", service: null },
      { text: "Lead the CV with the curriculum and the key stages, not the subject", service: "cv-resume" },
    ],
    authorities: [
      { name: "KHDA", decides: "teaching permits and school inspection in Dubai" },
      { name: "ADEK", decides: "the same in Abu Dhabi" },
      { name: "The Ministry of Education", decides: "equivalency of a foreign qualification" },
    ],
    services: ["attestation", "legal-translation", "cv-resume", "higher-studies"],
    jobQuery: "teacher",
  },
  {
    slug: "accountants",
    kind: "profession",
    title: "Accountants and finance",
    titleAr: "المحاسبون",
    label: "I work in finance",
    intro:
      "The screening here is mechanical: the qualification, the standards you have worked to, and the systems named in the advert. Getting those three onto the page in a form a filter can read is most of the battle.",
    whoItsFor: [
      "Qualified and part-qualified accountants moving here",
      "Auditors and management accountants",
      "Finance staff whose company is now in scope for corporate tax",
    ],
    path: null,
    steps: [
      { text: "Attest your degree and your professional qualification", service: "attestation" },
      { text: "Put the qualification and its stage high on the CV, with the systems you genuinely know", service: "cv-resume" },
      { text: "If you are advising a business, check its registration and filing position", service: "business-setup" },
    ],
    authorities: [
      { name: "The Federal Tax Authority", decides: "corporate tax and VAT registration and filing" },
      { name: "The Ministry of Economy", decides: "the register of practising auditors" },
    ],
    services: ["attestation", "cv-resume", "business-setup", "legal-translation"],
    jobQuery: "accountant",
  },
  {
    slug: "real-estate-agents",
    kind: "profession",
    title: "Real estate agents",
    titleAr: "وكلاء العقارات",
    label: "I work in real estate",
    intro:
      "Broking here is licensed, and the licence is the thing a client checks before anything else. The rest of the job is being findable — which for an agent is a profile and a site rather than a portal listing.",
    whoItsFor: [
      "Agents moving into the UAE market",
      "Brokers setting up on their own",
      "Anyone who needs their own site rather than a portal page",
    ],
    path: null,
    steps: [
      { text: "Attest your degree where the brokerage or the regulator asks for one", service: "attestation" },
      { text: "Complete the registration your emirate requires before you practise", service: null },
      { text: "If you are setting up alone, the licence comes before the clients", service: "business-setup" },
      { text: "Build a site that carries your licence number and the areas you actually work", service: "web-development" },
    ],
    authorities: [
      { name: "RERA", decides: "broker registration and what an agent may do in Dubai" },
      { name: "The DED or free zone", decides: "the trade licence if you set up on your own" },
    ],
    services: ["business-setup", "web-development", "attestation", "cv-resume"],
    jobQuery: "sales",
  },
];

export const audienceSlugs = (): string[] => AUDIENCES.map((a) => a.slug);

export function getAudience(slug: string): Audience | undefined {
  return AUDIENCES.find((a) => a.slug === slug);
}

export const situations = (): Audience[] => AUDIENCES.filter((a) => a.kind === "situation");
export const professions = (): Audience[] => AUDIENCES.filter((a) => a.kind === "profession");

/** The path this audience is on, resolved. */
export function pathFor(audience: Audience): Path | undefined {
  return audience.path ? PATHS.find((p) => p.id === audience.path) : undefined;
}

/**
 * The sequence to draw: the referenced path's steps, then anything this
 * audience adds. One of the two is always empty today, and the concatenation
 * is what lets that stop being true without a second template.
 */
export function stepsFor(audience: Audience): PathStep[] {
  return [...(pathFor(audience)?.steps ?? []), ...audience.steps];
}

/** The services named, in the order this person meets them, skipping any slug
 *  that no longer exists in `./services.ts`. */
export function servicesFor(audience: Audience): Service[] {
  return audience.services.flatMap((slug) => {
    const service = getService(slug);
    return service ? [service] : [];
  });
}
