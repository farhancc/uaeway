/**
 * The FAQ content this site launched with.
 *
 * It used to live in lib/services.ts. It moved here when the answer bank became
 * the single source for what we tell people: the database now serves both the
 * chatbot and the service page FAQ blocks, and this file is only the seed that
 * fills it the first time. Edit answers in /admin/answers, not here.
 */

export interface SeedFaq {
  q: string;
  a: string;
}

export const SEED_FAQS: { slug: string; faqs: SeedFaq[] }[] = [
  {
    "slug": "legal-translation",
    "faqs": [
      {
        "q": "Why was my translation rejected?",
        "a": "Almost always because it was not produced by a translator licensed by the UAE Ministry of Justice, or because the name spelling did not match the passport. Both are things we check before delivery."
      },
      {
        "q": "Do you translate the whole document or only part of it?",
        "a": "Certified translations must cover the complete document, including stamps and seals. Partial translations get rejected."
      },
      {
        "q": "Do I need attestation as well as translation?",
        "a": "Often yes — they are separate steps. Attestation proves the original is genuine; translation makes it readable to the authority. We can tell you which your case needs before you pay anyone for either."
      }
    ]
  },
  {
    "slug": "attestation",
    "faqs": [
      {
        "q": "Can you attest a photocopy?",
        "a": "No. Attestation is performed on the original document. Anyone offering to attest a copy is not doing real attestation."
      },
      {
        "q": "How much does attestation cost?",
        "a": "Government fees differ by country and document type and are revised periodically, so a provider quotes per case rather than publishing a figure that would soon be wrong. We will get you that quote before you commit."
      },
      {
        "q": "My degree is from India. Does that change anything?",
        "a": "Yes. Each country has its own route — for example some require state-level authentication before the national foreign ministry. We map the chain for your country and point you at a provider who runs it."
      }
    ]
  },
  {
    "slug": "visa-processing",
    "faqs": [
      {
        "q": "What does a UAE visa cost?",
        "a": "Government fees depend on visa type, emirate, duration and whether the application is inside or outside the country, and they are revised from time to time. We quote per case and always show government fees separately from our own fee. Always confirm current official fees with ICP or the relevant authority."
      },
      {
        "q": "Can you guarantee approval?",
        "a": "No, and nobody honestly can — approval is the authority's decision. What we can do is make sure the file does not fail on paperwork before it gets there."
      },
      {
        "q": "My visa application was rejected. Can you help?",
        "a": "Usually yes. We look at the rejection reason, work out the underlying document problem, and advise whether to reapply or take a different route."
      }
    ]
  },
  {
    "slug": "notary",
    "faqs": [
      {
        "q": "Does a power of attorney need to be in Arabic?",
        "a": "UAE notaries work in Arabic, so instruments are normally notarised bilingually with a certified Arabic translation. We line both parts up so they are not done out of order."
      },
      {
        "q": "Can I notarise a document if I am outside the UAE?",
        "a": "There is usually a route through the UAE embassy in your country, or via a power of attorney granted to someone here. Which one applies depends on the document."
      }
    ]
  },
  {
    "slug": "business-setup",
    "faqs": [
      {
        "q": "Mainland or free zone?",
        "a": "It depends on who your customers are. Free zones suit businesses trading internationally or serving other companies; mainland is generally needed to trade freely inside the UAE market and to bid for certain contracts. We work it out from your actual activity rather than defaulting to whichever is cheapest to sell."
      },
      {
        "q": "How much does it cost to set up a company?",
        "a": "Licence and registration fees vary widely by jurisdiction, activity, visa quota and office requirement, and they change between licensing periods. We quote against a specific structure instead of advertising a headline figure that few applicants actually qualify for."
      },
      {
        "q": "Can I own 100% of the company?",
        "a": "In free zones, yes. On the mainland, full foreign ownership is available for a large list of activities, but not all of them — it depends on your specific activity code."
      }
    ]
  },
  {
    "slug": "higher-studies",
    "faqs": [
      {
        "q": "What is certificate equivalency and do I need it?",
        "a": "It is official recognition that a qualification earned outside the UAE is equivalent to the UAE standard. It is commonly required for university admission and for some professional roles. We confirm whether your case needs it."
      },
      {
        "q": "Can you guarantee admission?",
        "a": "No. The aim is an application that is as strong and complete as it can be; the decision is the university's."
      }
    ]
  },
  {
    "slug": "cv-resume",
    "faqs": [
      {
        "q": "Should I put my photo, age and marital status on a UAE CV?",
        "a": "A photo is common and generally expected in this market. Age, marital status and nationality are often asked for too — we will tell you what helps for your target roles and what is better left off."
      },
      {
        "q": "Do you write the CV from scratch?",
        "a": "We rewrite rather than invent. Everything on the finished CV has to be true and something you can defend in an interview."
      }
    ]
  },
  {
    "slug": "web-development",
    "faqs": [
      {
        "q": "Do I own the site afterwards?",
        "a": "Yes — the domain, the hosting account and the code are yours. We do not hold your site hostage."
      },
      {
        "q": "Will it rank on Google?",
        "a": "Nobody can promise that, and anyone who does is guessing. What you get is a site with no technical reason not to rank — fast, properly structured, with the metadata and schema in place. Where it lands after that depends on your competition and the content you keep adding."
      }
    ]
  }
];
