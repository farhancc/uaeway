/**
 * Fills the answer bank out to a target size per service.
 *
 *   npm run generate:answers            # every service, to TARGET
 *   npm run generate:answers attestation visa-processing
 *
 * Everything written here lands inactive. The bank feeds two published
 * surfaces — the chatbot, and the FAQ block on each service page with its
 * FAQPage markup — so a generated answer that is wrong about a fee or a
 * procedure is wrong under the company's own name, in Google, on a regulated
 * subject. Nothing reaches either surface until a person flips it on in
 * /admin/answers.
 *
 * Resumable and non-destructive: it counts what a service already has and
 * generates only the shortfall, so a run that dies at service five picks up
 * where it stopped and an answer someone has since edited is never touched.
 */

import { randomUUID } from "crypto";

import { generateJSON as claudeJSON } from "../lib/ai/claude";
import { generateJSON as geminiJSON } from "../lib/ai/gemini";
import { answersCollection, type AnswerDoc } from "../lib/mongo/chat-db";
import { findUnsupportedAmounts } from "../lib/chat/prompt";
import { SERVICES, type Service } from "../lib/services";
import { SITE } from "../lib/site";
import { slugify } from "../lib/slug";
import { tokenize } from "../lib/text";

/** Answers each service should end up with. */
const TARGET = 200;

/**
 * Claude writes these when it can.
 *
 * Not a preference between vendors: the chat model is pinned to a lite variant
 * that does no thinking, which is right for two sentences from supplied context
 * on every turn and wrong for composing a couple of hundred distinct questions
 * about a regulated service. When there is no Anthropic key the job still runs
 * on Gemini rather than refusing — the output is reviewed either way.
 */
const USING_CLAUDE = Boolean(process.env.ANTHROPIC_API_KEY);

/** The shape both providers are asked for. Claude gets it as a tool schema;
 *  Gemini has no forced tool call, so it is spelled out in the prompt. */
const SHAPE = `Reply with JSON only, in exactly this shape:
{"answers":[{"question":"...","answer_md":"...","keywords":["...","..."]}]}
keywords: 3 to 6 short lowercase phrases a visitor might type.`;

async function write(prompt: string, system: string): Promise<{ answers: Generated[] } | null> {
  if (USING_CLAUDE) {
    return claudeJSON<{ answers: Generated[] }>(prompt, {
      system,
      temperature: 0.7,
      maxOutputTokens: 8000,
      properties: {
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "As a visitor would type it." },
              answer_md: { type: "string", description: "2-4 plain sentences." },
              keywords: { type: "array", items: { type: "string" } },
            },
            required: ["question", "answer_md", "keywords"],
          },
        },
      },
      required: ["answers"],
    });
  }

  return geminiJSON<{ answers: Generated[] }>(`${prompt}\n\n${SHAPE}`, {
    // Not the pinned chat model: this is composition, not a two-line reply
    // from context, and it runs once rather than on every turn.
    // The same lite model the chat uses. The larger flash models answer 503 on
    // this account's tier — measured across 3.5, 3.6, 3.7 and 3.8 — so they are
    // not an option here whatever their prose is like. GENERATE_MODEL overrides
    // it if that changes.
    model: process.env.GENERATE_MODEL || "gemini-3.1-flash-lite",
    system,
    temperature: 0.8,
    // Generous, because the thinking models draw from the same budget as the
    // answer: too tight and the whole batch comes back as no text at all.
    maxOutputTokens: 24000,
  });
}
/** Per model call. Small enough that one bad batch is cheap to lose, large
 *  enough that the grounding is not re-sent for every single question. */
const BATCH = 20;

/**
 * What the model is allowed to know about this service.
 *
 * Everything comes from lib/services.ts, which is the file a human edits when
 * the business changes. Nothing is invented here, and the rules below say so
 * in the terms the guardrails check afterwards.
 */
function grounding(service: Service): string {
  return [
    `SERVICE: ${service.name} (${service.shortName}) — /services/${service.slug}`,
    `TAGLINE: ${service.tagline}`,
    `SUMMARY: ${service.summary}`,
    `WHO IT IS FOR:\n${service.whoItsFor.map((w) => `- ${w}`).join("\n")}`,
    `OUR PROCESS:\n${service.process.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
    `DOCUMENTS THE CLIENT PROVIDES:\n${service.documents.map((d) => `- ${d}`).join("\n")}`,
    `TURNAROUND: ${service.turnaround}`,
    `VOCABULARY: ${service.keywords.join(", ")}`,
    service.delivery === "in-house"
      ? "DELIVERY: we do this ourselves, in-house."
      : "DELIVERY: a licensed provider does the regulated work. We work out what is needed and introduce the client to them, then stay their point of contact.",
    service.priceFrom
      ? `PRICE: from AED ${service.priceFrom.amountAed} ${service.priceFrom.unit}.`
      : "PRICE: not published. There is no agreed price for this service yet.",
  ].join("\n\n");
}

const RULES = `You are writing the answer bank for ${SITE.name}, an independent UAE jobs and
guidance site based in ${SITE.area}. These answers are published: they are what the site's
assistant says, and they appear as the FAQ on the service page with FAQPage markup. People act
on them to move countries, take jobs and file government applications.

Write only what the SERVICE BLOCK supports. The hard rules:

1. NEVER state a fee, price, government charge, salary threshold or any amount of money. Not a
   figure, not a range, not "around". If the question asks what something costs, the answer is
   that it depends on the case, that we quote per case, and that government fees should be
   confirmed with the relevant authority.
2. NEVER invent a timeline in days, weeks or months. Where turnaround matters, use what the
   TURNAROUND line says and nothing more precise.
3. NEVER promise an outcome, approval, or that anything is guaranteed.
4. If DELIVERY says a licensed provider does the work, never write "we do", "we handle",
   "we process", "we issue" or "we submit" about the regulated work itself. We work out what is
   needed, introduce the client, and follow it up.
5. Do not name specific government portals, ministries, forms or authorities unless the SERVICE
   BLOCK names them.
6. For anything a government authority decides, say plainly that the authority's own current
   guidance is what counts.

Style: answer in 2 to 4 sentences of plain British English. No greeting, no sign-off, no bullet
lists, no headings. Write the way a knowledgeable colleague replies in a chat. The question must
read the way a real visitor would type it, in the first person where that is natural.

Cover the full range of what someone actually asks: eligibility, what documents are needed,
what goes wrong and why, what happens next, how a case differs by country or situation, what we
do versus what the client does, and what to do when something has been rejected.`;

interface Generated {
  question: string;
  answer_md: string;
  keywords: string[];
}

/** Two questions are the same question if their content words are. */
function questionKey(question: string): string {
  return [...new Set(tokenize(question))].sort().join(" ");
}

/** First-person claims about regulated work we only refer. */
const CLAIMS_DELIVERY =
  /\bwe\s+(?:do|handle|process|issue|submit|perform|carry out|complete|provide|attest|translate|notarise|notarize|file|apply)\b/i;

/**
 * Everything that has to be true before an answer is stored.
 *
 * The prompt already forbids all of this. That is not the same as it not
 * happening — `findUnsupportedAmounts` exists in the chat route for exactly
 * this reason — and here the output is written to a database rather than shown
 * to one visitor, so a rule that only lives in a prompt gets checked again.
 */
function reject(row: Generated, service: Service, context: string): string | null {
  if (!row.question?.trim()) return "no question";
  if (!row.answer_md?.trim()) return "no answer";
  if (row.question.length > 200) return "question too long";
  if (row.answer_md.length > 1200) return "answer too long";

  const amounts = findUnsupportedAmounts(row.answer_md, context);
  if (amounts.length > 0) return `invented an amount (${amounts.join(", ")})`;

  if (service.delivery === "referred" && CLAIMS_DELIVERY.test(row.answer_md)) {
    return `claims we do the work ourselves (${row.answer_md.match(CLAIMS_DELIVERY)?.[0]})`;
  }
  if (/\bguarantee|\bguaranteed\b/i.test(row.answer_md)) return "promises an outcome";
  return null;
}

async function generateFor(service: Service, shortfall: number): Promise<Generated[]> {
  const context = grounding(service);
  const kept: Generated[] = [];
  const seen = new Set<string>();
  let rejected = 0;

  while (kept.length < shortfall) {
    const want = Math.min(BATCH, shortfall - kept.length);
    // The model is told what it has already written so batch nine does not
    // rediscover batch one. Only the questions — sending the answers back would
    // cost more than the batch itself.
    const avoid = kept.slice(-80).map((r) => `- ${r.question}`).join("\n");

    const out = await write(
      `SERVICE BLOCK\n\n${context}\n\n` +
        (avoid ? `ALREADY WRITTEN — do not repeat these or ask them differently:\n${avoid}\n\n` : "") +
        `Write ${want} more question-and-answer pairs for this service.`,
      RULES,
    );

    if (!out?.answers?.length) {
      console.log(`    model returned nothing — stopping ${service.slug} at ${kept.length}`);
      break;
    }

    let added = 0;
    for (const row of out.answers) {
      const why = reject(row, service, context);
      if (why) {
        rejected++;
        console.log(`    dropped: ${why} — "${row.question?.slice(0, 60)}"`);
        continue;
      }
      const key = questionKey(row.question);
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push({ ...row, keywords: (row.keywords ?? []).map((k) => k.toLowerCase()).slice(0, 6) });
      added++;
      if (kept.length >= shortfall) break;
    }

    console.log(`    +${added}  (${kept.length}/${shortfall})`);
    // A batch that adds nothing twice over means the model has run out of
    // distinct questions for this service. Pushing on just burns tokens.
    if (added === 0) {
      console.log(`    no new questions — stopping ${service.slug} at ${kept.length}`);
      break;
    }
  }

  if (rejected > 0) console.log(`    ${rejected} dropped by the guardrails`);
  return kept;
}

async function main() {
  const args = process.argv.slice(2);
  // --limit N caps what one run adds per service, for a sample worth reading
  // before committing to the whole bank.
  const at = args.indexOf("--limit");
  const limit = at === -1 ? Infinity : Number(args[at + 1]);
  const only = args.filter((a, i) => a !== "--limit" && i !== at + 1);

  const services = only.length > 0 ? SERVICES.filter((s) => only.includes(s.slug)) : SERVICES;
  if (services.length === 0) throw new Error(`no such service: ${only.join(", ")}`);

  console.log(`Writing with ${USING_CLAUDE ? "Claude" : "Gemini"}.`);

  const answers = await answersCollection();
  let written = 0;

  for (const service of services) {
    const held = await answers
      .find({ service_slug: service.slug }, { projection: { slug: 1, question: 1 } })
      .toArray();
    const shortfall = Math.min(TARGET - held.length, limit);

    console.log(`\n${service.shortName} — has ${held.length}, needs ${Math.max(0, shortfall)}`);
    if (shortfall <= 0) continue;

    const taken = new Set(held.map((h) => h.slug));
    const asked = new Set(held.map((h) => questionKey(h.question)));

    const rows = (await generateFor(service, shortfall)).filter((r) => !asked.has(questionKey(r.question)));
    if (rows.length === 0) continue;

    const now = new Date();
    const docs: AnswerDoc[] = [];
    for (const [i, row] of rows.entries()) {
      // Same counter the rest of the app uses, against slugs this run has
      // already claimed as well as the ones already stored.
      let slug = `${service.slug}-${slugify(row.question)}`.slice(0, 90);
      if (taken.has(slug)) {
        let n = 2;
        while (taken.has(`${slug}-${n}`)) n++;
        slug = `${slug}-${n}`;
      }
      taken.add(slug);

      docs.push({
        _id: randomUUID(),
        slug,
        question: row.question.trim(),
        answer_md: row.answer_md.trim(),
        service_slug: service.slug,
        keywords: row.keywords,
        trigger_groups: [],
        any_keywords: [],
        choices: [],
        follow_up_slugs: [],
        is_opener: false,
        // Two hundred entries would drown a service page and its FAQPage
        // markup. These are the assistant's to draw on; a person promotes the
        // few that belong on the page.
        show_on_page: false,
        // Nothing reaches a visitor until someone has read it.
        active: false,
        position: held.length + i,
        created_at: now,
        updated_at: now,
      });
    }

    await answers.insertMany(docs);
    written += docs.length;
    console.log(`  stored ${docs.length} (inactive)`);
  }

  console.log(`\nWrote ${written} answers, all inactive.`);
  console.log("Review them in /admin/answers and switch on the ones you want served.");
}

// The driver holds the process open once it has a pool.
main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
