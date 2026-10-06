/**
 * Fills the answer bank from the FAQs and paths already written in code.
 *
 * Run once against an empty answer bank:  npm run seed:answers
 *
 * Idempotent and non-destructive: existing slugs are skipped, so re-running it
 * never overwrites an answer someone has since edited in the admin.
 */

import { randomUUID } from "crypto";

import { getService } from "../lib/services";
import { PATHS } from "../lib/paths";
import { SEED_FAQS } from "./seed-data/faqs";
import { slugify } from "../lib/slug";
import { answersCollection } from "../lib/mongo/chat-db";

/** Services whose questions are worth offering before anyone has typed. */
const OPENER_SERVICES = new Set(["attestation", "legal-translation", "visa-processing"]);

const NOISE = new Set([
  "a", "an", "the", "is", "are", "do", "does", "did", "can", "could", "will",
  "would", "should", "i", "my", "me", "we", "our", "you", "your", "it", "to",
  "for", "of", "in", "on", "at", "and", "or", "if", "how", "what", "when",
  "where", "why", "who", "which", "much", "many", "need", "get", "have", "has",
  "with", "from", "about", "that", "this", "be", "am", "change", "anything",
]);

/**
 * Starting vocabulary for matching a typed question.
 *
 * Adjacent content-word pairs, because a single word scores below the matcher's
 * floor on its own — one generic word must never be enough to serve a canned
 * answer. Refine these in the admin once you see what people actually type.
 */
function deriveKeywords(question: string): string[] {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NOISE.has(w));

  const pairs: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`);
  }

  return [...new Set(pairs)].slice(0, 6);
}

interface Row {
  slug: string;
  question: string;
  answer_md: string;
  service_slug: string | null;
  keywords: string[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
}

function fromServiceFaqs(): Row[] {
  const rows: Row[] = [];

  for (const service of SEED_FAQS) {
    const slugs = service.faqs.map(
      (faq) => `${service.slug}-${slugify(faq.q).slice(0, 40).replace(/-+$/, "")}`,
    );

    service.faqs.forEach((faq, i) => {
      rows.push({
        slug: slugs[i],
        question: faq.q,
        answer_md: faq.a,
        service_slug: service.slug,
        keywords: deriveKeywords(faq.q),
        // The other questions about this service: what someone asking this
        // would plausibly want next.
        follow_up_slugs: slugs.filter((_, j) => j !== i),
        is_opener: i === 0 && OPENER_SERVICES.has(service.slug),
        show_on_page: true,
        position: i,
      });
    });
  }

  return rows;
}

/** Each applicant path becomes one answer: the question people actually arrive
 *  with, and the sequence as the reply. These are the most useful openers. */
function fromPaths(): Row[] {
  return PATHS.map((path, i) => {
    const steps = path.steps
      .map((step, n) => {
        // Who actually does it, drawn from the service rather than assumed.
        // This used to say "we handle this" for every step with a service
        // attached — including attestation, legal translation, notarisation and
        // visa filing, which are regulated activities this site does not
        // perform. Saying otherwise in a chat reply is the one claim the whole
        // site is built to avoid.
        const service = step.service ? getService(step.service) : undefined;
        const tail = !service
          ? " — your employer handles this part."
          : service.delivery === "in-house"
            ? ` — we do this ourselves: [/services/${service.slug}](/services/${service.slug})`
            : ` — we can help with this: [/services/${service.slug}](/services/${service.slug})`;
        return `${n + 1}. ${step.text}${tail}`;
      })
      .join("\n");

    return {
      slug: `path-${path.id}`,
      question: `${path.label} — what do I need to do?`,
      answer_md: `${path.intro}\n\n${steps}`,
      service_slug: path.steps.find((s) => s.service)?.service ?? null,
      keywords: deriveKeywords(path.label),
      follow_up_slugs: PATHS.filter((p) => p.id !== path.id).map((p) => `path-${p.id}`),
      is_opener: true,
      // These belong in the chat, not on a service page.
      show_on_page: false,
      position: i,
    };
  });
}

async function main() {
  const rows = [...fromPaths(), ...fromServiceFaqs()];
  console.log(`Prepared ${rows.length} answers.`);

  const answers = await answersCollection();
  const held = new Set(await answers.distinct("slug"));
  const fresh = rows.filter((r) => !held.has(r.slug));

  if (fresh.length === 0) {
    console.log("Nothing new — every answer is already in the bank.");
    return;
  }

  const now = new Date();
  const { insertedCount } = await answers.insertMany(
    fresh.map((row) => ({
      _id: randomUUID(),
      ...row,
      // The seed only sets what it knows about; the rest are the defaults the
      // table used to supply.
      trigger_groups: [],
      any_keywords: [],
      choices: [],
      active: true,
      created_at: now,
      updated_at: now,
    })),
  );

  console.log(`Inserted ${insertedCount} answers (${held.size} left untouched).`);
  console.log(`Openers: ${fresh.filter((r) => r.is_opener).length}`);
}


// The driver holds the process open once it has a pool.
main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
