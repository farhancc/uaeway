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

  /* ── Situations, continued ─────────────────────────────────────────────── */
  {
    slug: "freelancers",
    kind: "situation",
    title: "Working for yourself",
    titleAr: "العمل الحر",
    label: "I want to work for myself",
    intro:
      "Going freelance here changes what your residence hangs on. A permit or a licence replaces an employer as your sponsor, and it comes first — the visa follows it, not the other way round.",
    whoItsFor: [
      "Employees thinking about going independent",
      "People already freelancing on the wrong visa",
      "Anyone deciding between a freelance permit and a company licence",
    ],
    path: null,
    steps: [
      { text: "Decide which authority or free zone fits the work you actually do", service: "business-setup" },
      { text: "Get the permit or licence issued before you stop being sponsored by anyone else", service: null },
      { text: "Arrange your own residence and health insurance under it", service: "visa-processing" },
      { text: "Register for tax if your turnover or profit brings you into scope", service: null },
    ],
    authorities: [
      { name: "The free zone or DED", decides: "the freelance permit or licence and what it covers" },
      { name: "The Federal Tax Authority", decides: "corporate tax and VAT registration thresholds" },
    ],
    services: ["business-setup", "visa-processing", "web-development", "cv-resume"],
    jobQuery: "consultant",
  },
  {
    slug: "remote-workers",
    kind: "situation",
    title: "Working remotely from the UAE",
    titleAr: "العمل عن بُعد",
    label: "I work remotely for a company abroad",
    intro:
      "Living here needs a visa and working needs that visa to permit it, so the question is never whether you can do the job from Dubai — it is what your residence comes from while you do.",
    whoItsFor: [
      "Employees of overseas companies who want to live here",
      "Couples where one partner is sponsored and the other works remotely",
      "Anyone currently doing this on a visit visa",
    ],
    path: null,
    steps: [
      { text: "Work out which route gives you residence: a remote-work permit, a freelance licence, or a family sponsorship", service: "visa-processing" },
      { text: "Check what your overseas employer needs to provide for the application", service: null },
      { text: "Settle where you are tax resident before the first year ends", service: null },
    ],
    authorities: [
      { name: "ICP", decides: "remote-work residence and its conditions" },
      { name: "Your home tax authority", decides: "whether it still taxes you while you live here" },
    ],
    services: ["visa-processing", "business-setup", "attestation"],
    jobQuery: null,
  },
  {
    slug: "between-jobs",
    kind: "situation",
    title: "Between jobs",
    titleAr: "بين وظيفتين",
    label: "I have left a job and not started another",
    intro:
      "The clock starts at the cancellation, not at your last working day, and it is shorter than most people assume. What you do in the first week of it decides whether you stay or start again from outside.",
    whoItsFor: [
      "Anyone whose visa has just been cancelled",
      "People made redundant or whose employer has closed",
      "Residents weighing a job-seeker permit against going home",
    ],
    path: null,
    steps: [
      { text: "Confirm the exact date your residence was cancelled and what the grace period is for your visa type", service: "visa-processing" },
      { text: "Get the end-of-service calculation in writing before signing any settlement", service: null },
      { text: "Decide early between a new sponsor, a job-seeker permit, and leaving — the options narrow as the window closes", service: null },
      { text: "Keep the CV current while this runs; the paperwork is not the job search", service: "cv-resume" },
    ],
    authorities: [
      { name: "ICP or GDRFA", decides: "the grace period and whether you can stay on another basis" },
      { name: "MOHRE", decides: "an end-of-service dispute with a mainland employer" },
    ],
    services: ["visa-processing", "cv-resume", "attestation"],
    jobQuery: "",
  },
  {
    slug: "changing-employer",
    kind: "situation",
    title: "Moving to another UAE employer",
    titleAr: "تغيير جهة العمل",
    label: "I am changing jobs within the UAE",
    intro:
      "A certificate attested once stays attested, so the document half is usually already done. What is new is the labour side, and the part worth reading twice is whatever your current contract says about leaving.",
    whoItsFor: [
      "Residents who have accepted an offer from another company",
      "Anyone moving between mainland and a free zone",
      "People worried about a notice period or a non-compete",
    ],
    path: null,
    steps: [
      { text: "Read your notice period and any non-compete before you resign", service: null },
      { text: "Get the new offer in writing, registered, before cancelling anything", service: null },
      { text: "The new employer applies for the permit; your old one cancels", service: "visa-processing" },
      { text: "Check your existing attested certificates still match the new role's requirements", service: "attestation" },
    ],
    authorities: [
      { name: "MOHRE", decides: "the work permit and transfer for mainland employment" },
      { name: "The free zone authority", decides: "the same inside a free zone, with its own rules" },
      { name: "ICP or GDRFA", decides: "the residence transfer, and any gap between the two visas" },
    ],
    services: ["visa-processing", "cv-resume", "attestation"],
    jobQuery: "",
  },
  {
    slug: "property-buyers",
    kind: "situation",
    title: "Buying property",
    titleAr: "شراء العقارات",
    label: "I want to buy a property",
    intro:
      "Ownership is permitted in designated areas for most nationalities, and the costs beyond the price are substantial. The two things to establish before anything else are where you may buy and who is actually selling it to you.",
    whoItsFor: [
      "Residents considering buying rather than renting",
      "Overseas buyers investing in UAE property",
      "Anyone being pressed to sign a reservation form quickly",
    ],
    path: null,
    steps: [
      { text: "Check the area permits foreign ownership and the seller or developer is registered", service: null },
      { text: "Verify the broker's registration before paying anyone a commission", service: null },
      { text: "If you are buying from abroad, put a power of attorney in place", service: "notary" },
      { text: "Budget for the transfer and registration costs on top of the price", service: null },
    ],
    authorities: [
      { name: "The land department", decides: "registration, transfer and what each fee is" },
      { name: "RERA", decides: "broker and developer registration" },
      { name: "The Central Bank", decides: "the lending rules a mortgage has to fit" },
    ],
    services: ["notary", "legal-translation", "attestation"],
    jobQuery: null,
  },
  {
    slug: "investors",
    kind: "situation",
    title: "Investing here",
    titleAr: "المستثمرون",
    label: "I am investing in the UAE",
    intro:
      "Investment can carry residence with it, through more than one route and each with its own criteria. Which one fits is a question about what you are investing in, and the answer is the authority's rather than an agent's.",
    whoItsFor: [
      "People investing in property, a company or a fund",
      "Founders capitalising a UAE entity",
      "Anyone offered residence as part of an investment pitch",
    ],
    path: null,
    steps: [
      { text: "Establish which route your investment actually qualifies under, from the authority rather than the seller", service: null },
      { text: "Get the supporting documents attested and translated early — they date quickly", service: "attestation" },
      { text: "Where a company is involved, the licence comes before the residence", service: "business-setup" },
    ],
    authorities: [
      { name: "ICP", decides: "long-term residence and which investments qualify" },
      { name: "The land department", decides: "a property investment's registered value" },
      { name: "SCA", decides: "what may be marketed to you as a securities investment" },
    ],
    services: ["business-setup", "attestation", "notary", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "retirees",
    kind: "situation",
    title: "Retiring in the UAE",
    titleAr: "التقاعد",
    label: "I want to stay after I stop working",
    intro:
      "Length of residence does not by itself create a right to remain, which is the hard part and the one worth knowing at fifty rather than at sixty-five. There are retirement routes, with conditions, and planning toward one is the practical response.",
    whoItsFor: [
      "Long-term residents approaching the end of employment",
      "People whose employment visa is about to be cancelled on retirement",
      "Couples planning where to spend retirement",
    ],
    path: null,
    steps: [
      { text: "Check the retirement route's criteria against your own position, with the authority", service: "visa-processing" },
      { text: "Sort health cover, which stops being the employer's problem", service: null },
      { text: "Get the supporting financial and civil documents attested", service: "attestation" },
      { text: "Make or update a will while you are both still here", service: "notary" },
    ],
    authorities: [
      { name: "ICP", decides: "retirement residence and its conditions" },
      { name: "The health authority of your emirate", decides: "the insurance you must hold" },
    ],
    services: ["visa-processing", "notary", "attestation"],
    jobQuery: null,
  },
  {
    slug: "new-parents",
    kind: "situation",
    title: "Having a baby here",
    titleAr: "الولادة في الإمارات",
    label: "We have had a baby in the UAE",
    intro:
      "Four things have to happen in order and each has a window: the birth certificate, its attestation, the child's passport through your embassy, and the residence visa under your sponsorship. Starting late is the expensive mistake.",
    whoItsFor: [
      "Residents whose child was born here",
      "Parents registering a birth with their own country",
      "Anyone who has missed a registration deadline",
    ],
    path: null,
    steps: [
      { text: "Register the birth with the health authority and collect the certificate", service: null },
      { text: "Have it attested and translated for your own country's registration", service: "attestation" },
      { text: "Apply to your embassy for the child's passport", service: null },
      { text: "Sponsor the child's residence visa within the window", service: "visa-processing" },
    ],
    authorities: [
      { name: "The health authority of your emirate", decides: "the birth certificate and its issue" },
      { name: "Your embassy", decides: "the child's passport and citizenship registration" },
      { name: "ICP or GDRFA", decides: "the child's residence visa and the deadline for it" },
    ],
    services: ["attestation", "legal-translation", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "bereaved",
    kind: "situation",
    title: "After a death in the family",
    titleAr: "في حالة الوفاة",
    label: "Someone in my family has died",
    intro:
      "Your embassy is the first call and they will walk you through it. What follows is a death certificate, a decision about burial or repatriation, and an estate that is frozen until it is settled — which is where a registered will changes everything.",
    whoItsFor: [
      "Families dealing with a death in the UAE",
      "Anyone arranging repatriation",
      "Beneficiaries facing a frozen account",
    ],
    path: null,
    steps: [
      { text: "Contact your embassy, then obtain the medical and death certificates", service: null },
      { text: "Decide between burial here and repatriation; each needs its own clearances", service: null },
      { text: "Have the certificate attested and translated for use in your own country", service: "attestation" },
      { text: "Take legal advice on the estate before signing anything", service: "notary" },
    ],
    authorities: [
      { name: "The health authority", decides: "the death certificate" },
      { name: "Your embassy", decides: "repatriation paperwork and your own country's registration" },
      { name: "The courts", decides: "how an estate is distributed where no recognised will exists" },
    ],
    services: ["attestation", "legal-translation", "notary"],
    jobQuery: null,
  },
  {
    slug: "separating",
    kind: "situation",
    title: "Separating or divorcing",
    titleAr: "الانفصال والطلاق",
    label: "My marriage is ending",
    intro:
      "Sponsorship is the part with a deadline: a dependent's residence ends with the sponsor's, and the window afterwards is short. Everything else — the personal status framework that applies, and arrangements for children — is a court's and a lawyer's, not ours.",
    whoItsFor: [
      "Residents whose spouse sponsors their visa",
      "Parents working out arrangements for children",
      "Anyone who needs to move onto their own sponsorship quickly",
    ],
    path: null,
    steps: [
      { text: "Establish immediately what happens to each person's residence and when", service: "visa-processing" },
      { text: "Get a family lawyer before any informal arrangement is agreed", service: null },
      { text: "Where documents from abroad are involved, they will need attesting and translating", service: "attestation" },
      { text: "A notarised travel consent is usually needed to take a child out of the country", service: "notary" },
    ],
    authorities: [
      { name: "The courts", decides: "the personal status framework that applies and arrangements for children" },
      { name: "ICP or GDRFA", decides: "what happens to a dependent's residence" },
    ],
    services: ["visa-processing", "notary", "legal-translation", "attestation"],
    jobQuery: null,
  },
  {
    slug: "household-employers",
    kind: "situation",
    title: "Employing a nanny or housemaid",
    titleAr: "استقدام العمالة المنزلية",
    label: "I want to employ someone at home",
    intro:
      "Domestic workers are sponsored under their own framework, with a contract, a permit and real obligations about wages, hours and accommodation. Employing someone who is on another sponsor's visa is an offence for both of you.",
    whoItsFor: [
      "Families sponsoring a nanny, housemaid, cook or driver",
      "Anyone currently using someone part-time without a permit",
      "Employers whose worker wants to leave",
    ],
    path: null,
    steps: [
      { text: "Sponsor through the proper channel rather than an informal arrangement", service: "visa-processing" },
      { text: "Put the contract, the wage and the accommodation in writing", service: null },
      { text: "Never hold a passport — that is unlawful whatever is owed", service: null },
      { text: "On departure, cancel the sponsorship and settle the end-of-service entitlement", service: null },
    ],
    authorities: [
      { name: "MOHRE", decides: "domestic worker permits, contracts and complaints" },
      { name: "ICP or GDRFA", decides: "the worker's residence visa" },
      { name: "Tadbeer centres", decides: "the regulated channel a placement has to run through" },
    ],
    services: ["visa-processing", "attestation", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "in-dispute",
    kind: "situation",
    title: "In a dispute",
    titleAr: "النزاعات",
    label: "I am in a dispute with someone",
    intro:
      "Almost every kind of dispute here has one body that hears it, and going to the wrong one costs weeks. Naming the right door is useful and is something we can do; telling you what your contract means is a lawyer's job and not ours.",
    whoItsFor: [
      "Tenants and landlords at an impasse",
      "Anyone owed money by a company, or chased by one",
      "Employees with a complaint their employer has not answered",
    ],
    path: null,
    steps: [
      { text: "Identify who hears your kind of dispute before filing anything", service: null },
      { text: "Assemble the paper trail — contract, notices, payments, messages", service: null },
      { text: "Anything going before a court needs an Arabic translation by a licensed translator", service: "legal-translation" },
      { text: "Take legal advice where money or your status is seriously at risk", service: null },
    ],
    authorities: [
      { name: "The Rental Disputes Centre", decides: "landlord and tenant disputes in Dubai" },
      { name: "MOHRE or the free zone", decides: "employment disputes" },
      { name: "Consumer Protection at the Ministry of Economy", decides: "complaints against a licensed business" },
      { name: "Sanadak", decides: "escalated banking and insurance complaints" },
    ],
    services: ["legal-translation", "notary", "attestation"],
    jobQuery: null,
  },
  {
    slug: "in-debt",
    kind: "situation",
    title: "Struggling with debt",
    titleAr: "التعثر المالي",
    label: "I cannot pay what I owe",
    intro:
      "Speak to the lender before missing a payment rather than after — restructuring is far easier while an account is current, and banks here do it. The thing not to do is leave the country quietly.",
    whoItsFor: [
      "Residents behind on a loan or a card",
      "Anyone who has had a cheque returned",
      "People who suspect there is a travel ban against them",
    ],
    path: null,
    steps: [
      { text: "Contact each lender in writing and ask what restructuring is available", service: null },
      { text: "Request your own credit report and check it for errors", service: null },
      { text: "Deal with a returned cheque immediately — the window to settle it is short", service: null },
      { text: "Get legal advice before leaving the country with anything outstanding", service: null },
    ],
    authorities: [
      { name: "Al Etihad Credit Bureau", decides: "what your credit report says and how a dispute is resolved" },
      { name: "Sanadak", decides: "an escalated complaint against a bank" },
      { name: "The courts", decides: "a case and any travel ban attached to it" },
    ],
    services: ["legal-translation", "notary"],
    jobQuery: null,
  },
  {
    slug: "returning-residents",
    kind: "situation",
    title: "Coming back to the UAE",
    titleAr: "العودة إلى الإمارات",
    label: "I lived here before and I am coming back",
    intro:
      "Prior residence is an advantage and the thing that complicates a return is almost always something left unresolved last time — an unpaid debt, an open case, a visa nobody cancelled.",
    whoItsFor: [
      "Former residents returning for a new job",
      "Anyone who left in a hurry and is unsure what was closed",
      "People whose previous visa may never have been cancelled",
    ],
    path: null,
    steps: [
      { text: "Check that your previous residence was actually cancelled and nothing is outstanding", service: "visa-processing" },
      { text: "Confirm there is no case or ban recorded against you before booking anything", service: null },
      { text: "Certificates attested last time are usually still good — check before paying again", service: "attestation" },
      { text: "Say on the CV that you have worked here before; it removes a reader's biggest doubt", service: "cv-resume" },
    ],
    authorities: [
      { name: "ICP or GDRFA", decides: "your immigration record and whether anything blocks a return" },
      { name: "Your former employer", decides: "whether the cancellation was ever completed" },
    ],
    services: ["visa-processing", "cv-resume", "attestation"],
    jobQuery: "",
  },
  {
    slug: "renewing",
    kind: "situation",
    title: "Renewing your residence",
    titleAr: "تجديد الإقامة",
    label: "Something of mine is coming up for renewal",
    intro:
      "The renewals here depend on each other, which is what catches people: your passport sits under the visa, the visa gates the Emirates ID, and the ID gates most of the rest. Renew from the bottom up.",
    whoItsFor: [
      "Residents with a visa or Emirates ID about to expire",
      "Anyone whose passport runs out before their visa does",
      "People who have already let something lapse",
    ],
    path: null,
    steps: [
      { text: "Renew the passport first if it is close, then link the new one to your residence file", service: "visa-processing" },
      { text: "Renew the residence and the Emirates ID, with insurance in place", service: null },
      { text: "Keep the tenancy registration current — several renewals are checked against it", service: null },
      { text: "If something has already expired, deal with it now: the penalty accrues daily", service: null },
    ],
    authorities: [
      { name: "ICP or GDRFA", decides: "the residence renewal and any late penalty" },
      { name: "Your embassy", decides: "the passport renewal" },
    ],
    services: ["visa-processing", "attestation", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "pet-owners",
    kind: "situation",
    title: "Bringing or taking a pet",
    titleAr: "الحيوانات الأليفة",
    label: "I am moving with a pet",
    intro:
      "This is the part of a move with the longest lead time and the least flexibility: vaccinations fall in fixed windows, permits are issued against them, and the destination's rules are usually the strict half.",
    whoItsFor: [
      "People relocating here with a cat or dog",
      "Residents leaving and taking an animal with them",
      "Anyone who has been told their breed may be restricted",
    ],
    path: null,
    steps: [
      { text: "Check the destination's requirements first — they drive the whole timetable", service: null },
      { text: "Get the vaccinations and the health certificate inside the windows required", service: null },
      { text: "Apply for the import or export permit", service: null },
      { text: "Register the animal with the municipality once it is here", service: null },
    ],
    authorities: [
      { name: "MOCCAE", decides: "import and export permits for animals" },
      { name: "Your municipality", decides: "local registration and any breed restriction" },
      { name: "The destination country", decides: "what it will accept, and usually the long lead time" },
    ],
    services: ["attestation", "legal-translation"],
    jobQuery: null,
  },

  /* ── Professions, continued ────────────────────────────────────────────── */
  {
    slug: "it-professionals",
    kind: "profession",
    title: "Software and IT",
    titleAr: "تقنية المعلومات",
    label: "I work in software or IT",
    intro:
      "One of the few fields here with no licensing body in the way, which means the whole contest is the application itself — and a link to something tidy does more than another paragraph of stack list.",
    whoItsFor: [
      "Developers, engineers and IT staff moving here",
      "People applying to UAE companies from abroad",
      "Freelancers deciding between a permit and a licence",
    ],
    path: null,
    steps: [
      { text: "Attest your degree — no regulator asks for it, but an employer's visa file will", service: "attestation" },
      { text: "Write the CV so a recruiter can screen it and an engineer can place you", service: "cv-resume" },
      { text: "Put one tidy link in front of them rather than a profile of half-finished experiments", service: "web-development" },
      { text: "If you will contract rather than be employed, sort the licence first", service: "business-setup" },
    ],
    authorities: [
      { name: "MOHRE or the free zone", decides: "the work permit; there is no professional licence for this field" },
      { name: "The TDRA", decides: "rules that apply if you operate a service rather than work for one" },
    ],
    services: ["cv-resume", "web-development", "attestation", "business-setup"],
    jobQuery: "developer",
  },
  {
    slug: "sales-professionals",
    kind: "profession",
    title: "Sales and business development",
    titleAr: "المبيعات",
    label: "I work in sales",
    intro:
      "The largest single category on the board, and the one where a CV without numbers is read as a CV with nothing to report. Target, achievement, territory, deal size — in that order.",
    whoItsFor: [
      "Field and inside sales people moving here",
      "Business development and account management",
      "Anyone whose figures are confidential and does not know what they may say",
    ],
    path: null,
    steps: [
      { text: "Rebuild the CV around figures, using percentages where absolute revenue is confidential", service: "cv-resume" },
      { text: "Attest the degree for the employer's visa file", service: "attestation" },
      { text: "If the sector is regulated — property, insurance, financial products — check what you must hold before you sell", service: null },
    ],
    authorities: [
      { name: "MOHRE or the free zone", decides: "the work permit" },
      { name: "The sector's regulator", decides: "whether selling that product needs a registration of its own" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "sales",
  },
  {
    slug: "marketing-creatives",
    kind: "profession",
    title: "Marketing",
    titleAr: "التسويق",
    label: "I work in marketing",
    intro:
      "A field where the CV is a door and the work is the room. Keep the page short and specific, and point it at something a reader can actually look at.",
    whoItsFor: [
      "Marketing managers, digital and performance specialists",
      "Agency staff moving client-side or the reverse",
      "Anyone who needs a portfolio rather than a longer CV",
    ],
    path: null,
    steps: [
      { text: "Write campaigns as outcomes rather than activities", service: "cv-resume" },
      { text: "Put the work somewhere permanent that is yours rather than a platform's", service: "web-development" },
      { text: "Attest the degree for the visa file", service: "attestation" },
    ],
    authorities: [
      { name: "MOHRE or the free zone", decides: "the work permit" },
      { name: "The UAE's advertising rules", decides: "what a campaign may claim, which is stricter than many markets" },
    ],
    services: ["cv-resume", "web-development", "attestation"],
    jobQuery: "marketing",
  },
  {
    slug: "hospitality",
    kind: "profession",
    title: "Hotels and hospitality",
    titleAr: "الضيافة",
    label: "I work in hotels or hospitality",
    intro:
      "A reader in this sector sizes you by the property before they read a single line, so brand, format and covers or rooms belong in the heading rather than buried in the body.",
    whoItsFor: [
      "Front office, housekeeping, F&B and kitchen staff",
      "Hotel managers and supervisors moving here",
      "Anyone being asked for photographs before an interview",
    ],
    path: null,
    steps: [
      { text: "Lead the CV with the property, the standard and the department", service: "cv-resume" },
      { text: "Attest your certificates; large groups check them properly", service: "attestation" },
      { text: "If you handle food, the municipality's own training and clearance apply", service: null },
      { text: "Treat a request for photographs before any interview as a reason to check who you are dealing with", service: null },
    ],
    authorities: [
      { name: "Your municipality", decides: "food safety training and the personal health card" },
      { name: "The emirate's tourism department", decides: "what a licensed hospitality venue may do" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "hospitality",
  },
  {
    slug: "hr-professionals",
    kind: "profession",
    title: "Human resources",
    titleAr: "الموارد البشرية",
    label: "I work in HR",
    intro:
      "Here the job usually includes the administrative side of visas and onboarding, which is not true everywhere — so headcount, the labour framework you have worked under, and whether you have run a PRO relationship are the three things worth stating.",
    whoItsFor: [
      "HR generalists and specialists moving here",
      "People moving from a free zone employer to mainland or back",
      "Anyone whose role will include the labour file",
    ],
    path: null,
    steps: [
      { text: "State the labour framework and headcount you have worked with", service: "cv-resume" },
      { text: "Attest your degree and any professional qualification", service: "attestation" },
      { text: "Know which regulator covers your employer before the first interview", service: null },
    ],
    authorities: [
      { name: "MOHRE", decides: "mainland labour law, contracts and complaints" },
      { name: "The free zone authority", decides: "the same inside its own zone, with different rules" },
      { name: "The Wage Protection System", decides: "how salaries must be paid and recorded, and what counts as late" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "hr",
  },
  {
    /**
     * Reception, administration and customer service are one page rather than
     * three. The test below refuses two pages that name the same bodies, and
     * these genuinely have no regulator between them — nothing licenses a
     * receptionist. Splitting them would have produced the thing this whole
     * set is supposed to avoid: a page that exists to repeat another one with
     * the job title changed.
     */
    slug: "admin-office",
    kind: "profession",
    title: "Admin, reception and customer service",
    titleAr: "الإدارة وخدمة العملاء",
    label: "I work in admin, reception or customer service",
    intro:
      "The most competitive categories on the board and the ones where screening is most mechanical: the systems you genuinely use, the languages you genuinely speak, and when you can work. Nothing licenses these roles, so the application is the whole contest.",
    whoItsFor: [
      "Receptionists, secretaries and office administrators",
      "Executive assistants moving here",
      "Call centre, contact centre and front-of-house staff",
      "Multilingual candidates who undersell the languages",
    ],
    path: null,
    steps: [
      { text: "Put the systems, the languages and your availability where they are read first", service: "cv-resume" },
      { text: "Attest your certificates — the employer's visa file needs them even where the job does not", service: "attestation" },
      { text: "Apply early and often; these roles close faster than any other category", service: null },
      { text: "Check the employer and the agency before sending documents", service: null },
    ],
    authorities: [
      { name: "MOHRE or the free zone", decides: "the work permit, and the hours and shift rules that apply" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "receptionist",
  },
  {
    slug: "drivers-logistics",
    kind: "profession",
    title: "Driving, logistics and warehousing",
    titleAr: "النقل والخدمات اللوجستية",
    label: "I drive or work in logistics",
    intro:
      "The licence is the page. Category, validity and whether yours can be exchanged decide what you can apply for, and that is the roads authority's answer rather than an employer's.",
    whoItsFor: [
      "Drivers of every category moving here",
      "Warehouse and supply chain staff",
      "Anyone whose home licence may or may not be exchangeable",
    ],
    path: null,
    steps: [
      { text: "Find out whether your licence can be exchanged or whether you must test here", service: null },
      { text: "List the categories you hold and their validity at the top of the CV", service: "cv-resume" },
      { text: "Attest your certificates for the visa file", service: "attestation" },
    ],
    authorities: [
      { name: "The RTA or your emirate's traffic department", decides: "licence exchange, categories and testing" },
      { name: "MOHRE", decides: "the work permit" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "driver",
  },
  {
    slug: "construction-trades",
    kind: "profession",
    title: "Construction and site trades",
    titleAr: "البناء والمهن الحرفية",
    label: "I work on site",
    intro:
      "The project and the ticket carry this CV. Every current card or certificate goes on with its expiry, because a lapsed safety certification is worse than one you never had — it will be checked.",
    whoItsFor: [
      "Site supervisors, foremen and skilled trades",
      "HSE officers and safety staff",
      "Anyone whose safety cards are close to expiry",
    ],
    path: null,
    steps: [
      { text: "List every current card and certificate with its expiry date", service: "cv-resume" },
      { text: "Attest the trade or technical qualification", service: "attestation" },
      { text: "Check what approvals the municipality requires for your role on site", service: null },
    ],
    authorities: [
      { name: "Your municipality", decides: "site approvals and who may do what" },
      { name: "The emirate's HSE regulator", decides: "safety certification requirements" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: "construction",
  },
  {
    slug: "designers",
    kind: "profession",
    title: "Designers",
    titleAr: "المصممون",
    label: "I am a designer",
    intro:
      "Six strong pieces with a line each about the problem beat thirty with no context, because a reviewer gives the page under a minute and judges you by whatever they land on.",
    whoItsFor: [
      "Graphic, product and UX designers",
      "Interior designers moving into the UAE market",
      "Anyone whose portfolio is spread across three platforms",
    ],
    path: null,
    steps: [
      { text: "Build one portfolio you control rather than three profiles you do not", service: "web-development" },
      { text: "Keep the CV short and point it at the work", service: "cv-resume" },
      { text: "Attest the degree for the visa file", service: "attestation" },
    ],
    authorities: [
      { name: "MOHRE or the free zone", decides: "the work permit" },
      { name: "Your municipality", decides: "registration where interior design work is signed off" },
    ],
    services: ["web-development", "cv-resume", "attestation"],
    jobQuery: "designer",
  },
  {
    slug: "consultants",
    kind: "profession",
    title: "Consultants",
    titleAr: "الاستشاريون",
    label: "I work as a consultant",
    intro:
      "Whether you are employed by a firm or working for yourself changes everything about the paperwork, and it is worth settling before the first engagement rather than after.",
    whoItsFor: [
      "Management and technical consultants",
      "Independent advisers deciding how to be licensed",
      "Anyone invoicing UAE clients from abroad",
    ],
    path: null,
    steps: [
      { text: "Decide whether you are employed, licensed or freelance here — invoicing without one of the three is the problem", service: "business-setup" },
      { text: "Attest the degree and any professional qualification", service: "attestation" },
      { text: "A site under your own name does more for a sole practitioner than a CV does", service: "web-development" },
    ],
    authorities: [
      { name: "The DED or free zone", decides: "the licence and the activities it covers" },
      { name: "The Federal Tax Authority", decides: "corporate tax and VAT on your fees" },
    ],
    services: ["business-setup", "web-development", "cv-resume", "attestation"],
    jobQuery: "consultant",
  },
  {
    slug: "bankers-finance",
    kind: "profession",
    title: "Banking and financial services",
    titleAr: "الخدمات المالية",
    label: "I work in banking or financial services",
    intro:
      "Several roles here need an individual registration on top of the employer's licence, and which ones depends on what you actually advise on or sell. That is the regulator's list, not the employer's.",
    whoItsFor: [
      "Relationship managers, analysts and risk staff",
      "Anyone advising on or selling financial products",
      "People moving between onshore banks and the financial free zones",
    ],
    path: null,
    steps: [
      { text: "Establish whether your role needs an individual authorisation, and from whom", service: null },
      { text: "Attest your degree and professional qualifications", service: "attestation" },
      { text: "Note on the CV which regulatory regime you have worked under", service: "cv-resume" },
    ],
    authorities: [
      { name: "The Central Bank", decides: "banking and insurance supervision onshore" },
      { name: "SCA", decides: "securities and investment activity" },
      { name: "The DFSA or FSRA", decides: "the same inside DIFC and ADGM, under their own rulebooks" },
    ],
    services: ["attestation", "cv-resume", "legal-translation"],
    jobQuery: "finance",
  },
  {
    slug: "lawyers",
    kind: "profession",
    title: "Lawyers and legal teams",
    titleAr: "المحامون",
    label: "I work in law",
    intro:
      "Jurisdiction, admission and practice area are the first three lines, because none of them transfers automatically. What you may call yourself here is bounded by UAE rules on legal practice.",
    whoItsFor: [
      "In-house counsel moving here",
      "Foreign-qualified lawyers joining a firm",
      "Paralegals and legal administrators",
    ],
    path: null,
    steps: [
      { text: "State your home admission accurately rather than implying a local one", service: "cv-resume" },
      { text: "Attest your degree and your admission documents", service: "attestation" },
      { text: "Check what registration your intended role requires before accepting it", service: null },
    ],
    authorities: [
      { name: "The emirate's legal affairs department", decides: "who may practise and under what title" },
      { name: "The Ministry of Justice", decides: "licensed legal translation, which court filings require" },
    ],
    services: ["attestation", "legal-translation", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "architects",
    kind: "profession",
    title: "Architects",
    titleAr: "المهندسون المعماريون",
    label: "I am an architect",
    intro:
      "The work has to be visible, so the CV stays short and the portfolio argues. What decides what you can sign is registration, and that varies by emirate and by what you want to put your name to.",
    whoItsFor: [
      "Architects moving into the UAE market",
      "Practices registering to work in a new emirate",
      "Anyone who needs to sign off drawings here",
    ],
    path: null,
    steps: [
      { text: "Attest the degree and professional registration from home", service: "attestation" },
      { text: "Confirm what registration your emirate requires for the work you want to sign", service: null },
      { text: "Put the portfolio somewhere permanent and keep the CV to the roles and stages", service: "web-development" },
    ],
    authorities: [
      { name: "Your municipality", decides: "who may submit and sign off drawings locally" },
      { name: "The Society of Engineers", decides: "professional registration and grade" },
    ],
    services: ["attestation", "web-development", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "pharmacy-lab",
    kind: "profession",
    title: "Pharmacists and laboratory staff",
    titleAr: "الصيدلة والمختبرات",
    label: "I work in pharmacy or a laboratory",
    intro:
      "Treated like the rest of healthcare: nothing moves until the licence does, and which authority licenses you depends on the emirate you will work in rather than the one you live in.",
    whoItsFor: [
      "Pharmacists and pharmacy technicians",
      "Medical laboratory scientists and technicians",
      "Anyone part-way through an eligibility or exam process",
    ],
    path: null,
    steps: [
      { text: "Identify the licensing authority for the emirate you are applying to", service: null },
      { text: "Attest the degree, the home registration and the experience letters", service: "attestation" },
      { text: "Translate whatever the authority asks to be translated", service: "legal-translation" },
      { text: "State the licensing stage plainly on the CV", service: "cv-resume" },
    ],
    authorities: [
      { name: "DHA", decides: "licensing in Dubai" },
      { name: "DOH", decides: "licensing in Abu Dhabi" },
      { name: "MOHAP", decides: "licensing in the northern emirates" },
      { name: "The Emirates Drug Establishment", decides: "medicine registration and controlled substances" },
    ],
    services: ["attestation", "legal-translation", "cv-resume", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "security-officers",
    kind: "profession",
    title: "Security",
    titleAr: "الأمن",
    label: "I work in security",
    intro:
      "Your approvals are the page. The licence or clearance you hold, who issued it and whether it is current — a CV in this sector without that reads as an application that has not started.",
    whoItsFor: [
      "Security officers and supervisors",
      "Control room and CCTV operators",
      "Anyone whose clearance has lapsed",
    ],
    path: null,
    steps: [
      { text: "Establish which approval your emirate requires and whether yours is current", service: null },
      { text: "Put the clearance, issuer and expiry at the top of the CV", service: "cv-resume" },
      { text: "Attest certificates for the visa file", service: "attestation" },
    ],
    authorities: [
      { name: "SIRA", decides: "security industry licensing and training in Dubai" },
      { name: "The equivalent authority in your emirate", decides: "the same elsewhere, under its own rules" },
    ],
    services: ["cv-resume", "attestation", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "beauty-wellness",
    kind: "profession",
    title: "Beauty, salons and wellness",
    titleAr: "التجميل والعافية",
    label: "I work in beauty or wellness",
    intro:
      "Where the line falls between a beauty treatment and a medical one decides which authority you answer to — and that line is lower here than people expect, particularly for anything involving a needle or a laser.",
    whoItsFor: [
      "Therapists, stylists and salon staff",
      "Aesthetic practitioners offering clinical treatments",
      "Anyone opening a salon of their own",
    ],
    path: null,
    steps: [
      { text: "Establish whether your treatments are municipality-regulated or health-authority-regulated", service: null },
      { text: "Attest your training certificates", service: "attestation" },
      { text: "If you are opening your own place, the licence comes before the fit-out", service: "business-setup" },
      { text: "Photographs of your own work belong on a site rather than stapled to a CV", service: "web-development" },
    ],
    authorities: [
      { name: "Your municipality", decides: "salon licensing, hygiene and ordinary beauty treatments" },
      { name: "DHA, DOH or MOHAP", decides: "anything classed as a medical or aesthetic procedure" },
    ],
    services: ["business-setup", "web-development", "attestation", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "domestic-workers",
    kind: "profession",
    title: "Domestic workers",
    titleAr: "العمالة المنزلية",
    label: "I work in a private household",
    intro:
      "You are employed under a framework of your own, with a written contract and real protections about wages, hours and rest. A passport may never be held, whatever anyone says is owed.",
    whoItsFor: [
      "Nannies, housemaids, cooks and household drivers",
      "Anyone working for a family without a contract",
      "Workers who want to change employer",
    ],
    path: null,
    steps: [
      { text: "Make sure you are sponsored by the household you work for, under a written contract", service: "visa-processing" },
      { text: "Keep your own copy of the contract and your passport", service: null },
      { text: "If something is wrong, the ministry has a route for it and it is free to use", service: null },
    ],
    authorities: [
      { name: "MOHRE", decides: "domestic worker contracts, permits and complaints" },
      { name: "Tadbeer centres", decides: "the regulated channel through which placements run" },
    ],
    services: ["visa-processing", "attestation", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "aviation",
    kind: "profession",
    title: "Aviation",
    titleAr: "الطيران",
    label: "I work in aviation",
    intro:
      "Licences, ratings and hours are screened mechanically, and validation of a foreign licence is the civil aviation authority's decision rather than the airline's. Cabin crew hiring is a form and an assessment day more than a CV.",
    whoItsFor: [
      "Pilots and flight crew",
      "Cabin crew applying to the UAE carriers",
      "Engineers and ground operations staff",
    ],
    path: null,
    steps: [
      { text: "Check what validation or conversion your licence needs here", service: null },
      { text: "Attest the underlying qualifications", service: "attestation" },
      { text: "For cabin crew, the CV's job is to get you to the assessment day", service: "cv-resume" },
    ],
    authorities: [
      { name: "The GCAA", decides: "licence validation, conversion and ratings" },
      { name: "The airline", decides: "its own assessment and medical requirements" },
    ],
    services: ["attestation", "cv-resume", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "seafarers",
    kind: "profession",
    title: "Seafarers and maritime",
    titleAr: "البحرية",
    label: "I work at sea",
    intro:
      "A maritime CV is read as a document of record rather than a pitch: rank, vessel types, tonnage, routes, and every certificate with its validity. Which authority recognises what depends on the flag as much as on the UAE.",
    whoItsFor: [
      "Deck and engine officers and ratings",
      "Offshore marine crew",
      "Shore-based operations and port staff",
    ],
    path: null,
    steps: [
      { text: "Confirm which certificates the flag state and the UAE each require", service: null },
      { text: "Attest the underlying qualifications where an employer asks", service: "attestation" },
      { text: "Set the CV out as a record: rank, vessels, tonnage, routes, certificates", service: "cv-resume" },
    ],
    authorities: [
      { name: "The Ministry of Energy and Infrastructure", decides: "UAE maritime registration and certification" },
      { name: "The flag state", decides: "what your certificates are valid for at sea" },
    ],
    services: ["attestation", "cv-resume", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "oil-gas",
    kind: "profession",
    title: "Oil, gas and energy",
    titleAr: "النفط والطاقة",
    label: "I work in oil, gas or energy",
    intro:
      "Assets, disciplines, standards and rotations place you; safety certification with its expiry dates is the first filter applied, and onshore and offshore are different lives with the same job title.",
    whoItsFor: [
      "Engineers and technicians in upstream and downstream",
      "Offshore crew on rotation",
      "Contractors joining an operator's project",
    ],
    path: null,
    steps: [
      { text: "List safety certification with expiry dates before anything else", service: "cv-resume" },
      { text: "Attest the degree and professional registration", service: "attestation" },
      { text: "Check whether your discipline needs engineering registration to sign anything", service: null },
    ],
    authorities: [
      { name: "The Society of Engineers", decides: "engineering registration where the role needs it" },
      { name: "The operator and the regulator", decides: "the safety certification accepted on site" },
    ],
    services: ["attestation", "cv-resume", "visa-processing"],
    jobQuery: null,
  },
  {
    slug: "media-creatives",
    kind: "profession",
    title: "Media and production",
    titleAr: "الإعلام والإنتاج",
    label: "I work in media or production",
    intro:
      "Credits, formats and a link do the work. What surprises people arriving is that media activity is licensed here, and filming or publishing commercially needs a permit rather than just a client.",
    whoItsFor: [
      "Producers, editors, journalists and camera crew",
      "Content creators monetising their work here",
      "Anyone setting up a production company",
    ],
    path: null,
    steps: [
      { text: "Establish whether what you do needs a media licence or a permit", service: "business-setup" },
      { text: "Attest the degree where an employer's visa file needs it", service: "attestation" },
      { text: "Put the reel or the clips somewhere permanent and keep the CV short", service: "web-development" },
    ],
    authorities: [
      { name: "The UAE Media Council", decides: "media licensing and permits for commercial production" },
      { name: "The emirate's film or media office", decides: "filming permits locally" },
    ],
    services: ["business-setup", "web-development", "cv-resume", "attestation"],
    jobQuery: null,
  },
  {
    slug: "academics",
    kind: "profession",
    title: "University and academic staff",
    titleAr: "الأكاديميون",
    label: "I work in higher education",
    intro:
      "An academic CV follows different rules from a commercial one — publications, teaching, supervision, funding — and the institution's own accreditation status matters as much to your future as your own record does.",
    whoItsFor: [
      "Lecturers and professors applying to UAE institutions",
      "Researchers and postdoctoral staff",
      "Anyone checking whether a programme is accredited",
    ],
    path: null,
    steps: [
      { text: "Attest your degrees — the chain is longer for doctorates and starts at home", service: "attestation" },
      { text: "Check the institution and the programme are accredited before accepting", service: null },
      { text: "Write the CV to academic conventions, not commercial ones", service: "cv-resume" },
    ],
    authorities: [
      { name: "The Ministry of Higher Education", decides: "institutional and programme accreditation, and equivalency" },
      { name: "The institution", decides: "its own appointment and promotion requirements" },
    ],
    services: ["attestation", "higher-studies", "cv-resume", "legal-translation"],
    jobQuery: null,
  },
  {
    slug: "social-care",
    kind: "profession",
    title: "Psychology and social care",
    titleAr: "الرعاية الاجتماعية",
    label: "I work in psychology or social care",
    intro:
      "Clinical practice is licensed by the health authority and the title you may use is part of what it licenses, which catches practitioners whose home qualification is named differently.",
    whoItsFor: [
      "Psychologists, counsellors and therapists",
      "Social workers and case workers",
      "Anyone whose home title has no exact equivalent here",
    ],
    path: null,
    steps: [
      { text: "Check which title your qualification maps to, and which authority licenses it", service: null },
      { text: "Attest the degree and the home registration", service: "attestation" },
      { text: "Translate what the authority asks for", service: "legal-translation" },
    ],
    authorities: [
      { name: "DHA, DOH or MOHAP", decides: "clinical licensing and the title you may practise under" },
      { name: "The Community Development Authority", decides: "social care licensing in Dubai" },
    ],
    services: ["attestation", "legal-translation", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "veterinarians",
    kind: "profession",
    title: "Veterinary",
    titleAr: "الطب البيطري",
    label: "I work with animals",
    intro:
      "Licensed separately from human healthcare and by a different ministry, which is the single most useful thing to know before starting an application down the wrong route.",
    whoItsFor: [
      "Veterinary surgeons and nurses",
      "Clinic staff moving here",
      "Anyone opening a veterinary practice",
    ],
    path: null,
    steps: [
      { text: "Apply to the ministry that licenses veterinary practice, not to a health authority", service: null },
      { text: "Attest the degree and home registration", service: "attestation" },
      { text: "If you are opening a clinic, the licence and the premises approval come first", service: "business-setup" },
    ],
    authorities: [
      { name: "MOCCAE", decides: "veterinary licensing and practice" },
      { name: "Your municipality", decides: "clinic premises approval" },
    ],
    services: ["attestation", "business-setup", "cv-resume"],
    jobQuery: null,
  },
  {
    slug: "fitness-trainers",
    kind: "profession",
    title: "Fitness and sport",
    titleAr: "اللياقة والرياضة",
    label: "I work in fitness or sport",
    intro:
      "Coaching here is registered, and which body registers you depends on the emirate and the discipline. Clients increasingly check it, which makes it worth doing before you need it.",
    whoItsFor: [
      "Personal trainers and group instructors",
      "Sports coaches and academy staff",
      "Trainers going independent",
    ],
    path: null,
    steps: [
      { text: "Register with the body that covers your discipline in your emirate", service: null },
      { text: "Attest your qualifications where the employer or registrar asks", service: "attestation" },
      { text: "If you train clients privately, you need a licence or a permit to invoice", service: "business-setup" },
    ],
    authorities: [
      { name: "The emirate's sports council", decides: "trainer and coach registration" },
      { name: "The DED or free zone", decides: "the licence if you work for yourself" },
    ],
    services: ["business-setup", "cv-resume", "attestation", "web-development"],
    jobQuery: null,
  },
  {
    slug: "translators",
    kind: "profession",
    title: "Translators and interpreters",
    titleAr: "المترجمون",
    label: "I work as a translator",
    intro:
      "The distinction that matters here is legal translation, which only a translator licensed by the Ministry of Justice may produce. Accuracy is necessary and is not what is being checked at the counter.",
    whoItsFor: [
      "Translators seeking Ministry of Justice licensing",
      "Interpreters working with courts and notaries",
      "Anyone translating commercially without a licence",
    ],
    path: null,
    steps: [
      { text: "Establish what the Ministry of Justice requires for your language pair", service: null },
      { text: "Attest your degree and any translation qualification", service: "attestation" },
      { text: "If you will invoice clients directly, the licence comes before the work", service: "business-setup" },
    ],
    authorities: [
      { name: "The Ministry of Justice", decides: "who may produce a legal translation" },
      { name: "The DED or free zone", decides: "the commercial licence to trade as one" },
    ],
    services: ["legal-translation", "business-setup", "attestation", "web-development"],
    jobQuery: null,
  },
  {
    slug: "tour-guides",
    kind: "profession",
    title: "Tourism and tour guiding",
    titleAr: "السياحة والإرشاد",
    label: "I work in tourism",
    intro:
      "Guiding is licensed and so is selling a trip, and the two are different permissions. Operating without either is the common and expensive mistake in this sector.",
    whoItsFor: [
      "Tour guides and tour operators",
      "Travel consultants and agency staff",
      "Anyone running trips informally",
    ],
    path: null,
    steps: [
      { text: "Establish which permit your activity needs — guiding and selling are separate", service: null },
      { text: "Attest your qualifications where the authority asks", service: "attestation" },
      { text: "If you are operating rather than employed, the licence comes first", service: "business-setup" },
      { text: "A site that carries your licence number is what makes a booking feel safe", service: "web-development" },
    ],
    authorities: [
      { name: "The emirate's tourism department", decides: "guide and tour operator licensing" },
      { name: "The DED or free zone", decides: "the trade licence behind it" },
    ],
    services: ["business-setup", "web-development", "attestation", "cv-resume"],
    jobQuery: null,
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

/**
 * A handful of neighbours to offer at the foot of a page.
 *
 * Capped, and not simply "the others of this kind": there are more than thirty
 * professions, and a row of thirty-two chips is a list nobody reads rather
 * than a way out. Nearest first, where nearest means sharing a service — a
 * designer and a media producer need the same four things, and that is a
 * better guess at "you might also be" than alphabetical order is.
 */
export function relatedTo(audience: Audience, limit = 6): Audience[] {
  const mine = new Set(audience.services);
  const overlap = (other: Audience) => other.services.filter((s) => mine.has(s)).length;

  return AUDIENCES.filter((a) => a.kind === audience.kind && a.slug !== audience.slug)
    .map((a) => ({ a, shared: overlap(a) }))
    .sort((x, y) => y.shared - x.shared)
    .slice(0, limit)
    .map(({ a }) => a);
}
