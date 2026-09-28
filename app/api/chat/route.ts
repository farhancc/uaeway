import { headers } from "next/headers";
import { streamChat, generateJSON, type Turn } from "@/lib/ai/gemini";
import { modelAvailable } from "@/lib/ai/pool";
import { planReply } from "@/lib/chat/plan";
import { loadAnswers } from "@/lib/chat/answers";
import { nextChips, openerChips, type Chip } from "@/lib/chat/chips";
import {
  CAPPED_REPLY,
  EXTRACTION_PROMPT,
  FALLBACK_REPLY,
  FEE_CAUTION,
  findUnsupportedAmounts,
  RETIRED_ANSWER_REPLY,
  SYSTEM_PROMPT,
  UNAVAILABLE_REPLY,
  withContext,
} from "@/lib/chat/prompt";
import {
  appendMessage,
  countTurn,
  hashIp,
  history,
  loadSession,
  MAX_MESSAGE_CHARS,
  MAX_TURNS,
  RateLimited,
  startSession,
  usedAnswerSlugs,
  type ReplySource,
  type Session,
} from "@/lib/chat/session";
import { captureLead } from "@/lib/leads/capture";
import { findContact, looksContactable } from "@/lib/leads/schema";
import { matchServices, serviceSlugs } from "@/lib/services";

/** Streamed over SSE, so the visitor sees the answer forming. */
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || h.get("x-real-ip") || "0.0.0.0").trim();
}

/**
 * What the widget needs before the visitor has said anything: the opening
 * suggestions, and the exact triggers.
 *
 * The triggers go to the browser so the check can run as someone types, with no
 * request per keystroke. They are the author's own keywords, not secrets, and
 * the same rules run again on the server when the message is actually sent —
 * a hint that appears while typing and then fails to happen on send would be
 * worse than no hint at all.
 */
export async function GET() {
  const answers = await loadAnswers();
  return Response.json({
    chips: await openerChips(),
    triggers: answers
      .filter((a) => (a.trigger_groups ?? []).length > 0 || (a.any_keywords ?? []).length > 0)
      .map((a) => ({
        slug: a.slug,
        question: a.question,
        groups: a.trigger_groups ?? [],
        any: a.any_keywords ?? [],
      })),
  });
}

interface Extraction {
  hasContact: boolean;
  contact: string | null;
  name: string | null;
  consented: boolean;
  serviceSlug: string | null;
  need: string | null;
}

/**
 * Captures a lead only when the visitor gave a contact AND agreed to be
 * contacted. Gated on the message plausibly containing a contact so we do not
 * pay for an extraction call on every turn, and given only the recent turns
 * rather than the whole transcript.
 *
 * Deliberately not subject to the model budget: a lead is worth far more than
 * the tokens it costs, so this runs even in a capped conversation.
 */
async function maybeCaptureLead(
  turns: Turn[],
  sessionId: string,
  pagePath: string | null,
): Promise<string | null> {
  const transcript = turns
    .slice(-4)
    .map((t) => `${t.role === "user" ? "Visitor" : "Assistant"}: ${t.text}`)
    .join("\n");

  const extracted = await generateJSON<Extraction>(
    EXTRACTION_PROMPT.replace("SERVICE_SLUGS", serviceSlugs().join(", ")) + transcript,
  );

  if (!extracted?.hasContact || !extracted.consented || !extracted.contact) return null;
  if (!looksContactable(extracted.contact)) return null;

  const slug =
    extracted.serviceSlug && serviceSlugs().includes(extracted.serviceSlug)
      ? extracted.serviceSlug
      : null;
  if (!slug) return null;

  try {
    await captureLead({
      serviceSlug: slug,
      name: extracted.name ?? undefined,
      contact: extracted.contact,
      need: extracted.need ?? undefined,
      origin: "chat",
      chatSessionId: sessionId,
      pagePath: pagePath ?? undefined,
      consent: true,
    });
    return slug;
  } catch (err) {
    console.error(`[chat] lead capture failed: ${(err as Error).message}`);
    return null;
  }
}

export async function POST(request: Request) {
  let body: { sessionId?: string; message?: string; answerSlug?: string; pagePath?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const answerSlug = typeof body.answerSlug === "string" ? body.answerSlug : undefined;
  const message = (body.message ?? "").trim();
  if (!message && !answerSlug) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: "message too long" }, { status: 413 });
  }

  const ipHash = hashIp(await clientIp());
  const pagePath = body.pagePath?.slice(0, 300) ?? null;

  let session: Session;
  try {
    const existing = body.sessionId ? await loadSession(body.sessionId, ipHash) : null;
    session =
      existing ??
      (await startSession(ipHash, (await headers()).get("user-agent")?.slice(0, 300) ?? null, pagePath));
  } catch (err) {
    if (err instanceof RateLimited) {
      return Response.json({ error: "Too many conversations. Try again later." }, { status: 429 });
    }
    console.error(`[chat] session error: ${(err as Error).message}`);
    return Response.json({ error: "chat unavailable" }, { status: 503 });
  }

  if (session.turnCount >= MAX_TURNS) {
    return Response.json(
      { error: "This conversation has reached its limit. Leave your details on any service page and our team will come back to you." },
      { status: 429 },
    );
  }

  const past = await history(session.id);
  const plan = await planReply(message, answerSlug, session, past);

  // A tapped chip is recorded as the question it stands for, so the transcript
  // reads as a conversation rather than a list of slugs.
  const asked =
    plan.kind === "canned" && plan.viaChip ? plan.answer.question : message || "(no question)";
  await appendMessage(session.id, "user", asked);

  const used = await usedAnswerSlugs(session.id);
  const sessionId = session.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      send("meta", { sessionId });

      let reply = "";
      let source: ReplySource = "model";
      let chips: Chip[] = [];

      try {
        if (plan.kind === "canned") {
          source = "canned";
          reply = plan.answer.answer_md;
          send("token", { text: reply });
          // Choices before follow-ups: this answer could not be given without
          // knowing which case applies, so picking one is the next step rather
          // than a suggestion of something else to ask.
          const choices = (plan.answer.choices ?? []).filter((c) => c.label && c.answer_slug);
          if (choices.length > 0) send("choices", { choices });
          chips = await nextChips({ answered: plan.answer, text: asked, used });
        } else if (plan.kind === "retired") {
          source = "canned";
          reply = RETIRED_ANSWER_REPLY;
          send("token", { text: reply });
          chips = await nextChips({ text: "", used });
        } else if (plan.kind === "capped") {
          source = "capped";
          reply = CAPPED_REPLY;
          send("token", { text: reply });
          send("handoff", { reason: "budget", contact: null, serviceSlug: null });
          chips = await nextChips({ text: asked, used });
        } else {
          for await (const chunk of streamChat(
            [...past, { role: "user", text: withContext(asked, plan.context) }],
            { system: SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 600 },
          )) {
            reply += chunk;
            send("token", { text: chunk });
          }

          if (!reply) {
            // The model gave us nothing. Which of the two silences this is
            // decides both what we say and whether the conversation is charged
            // for it — see modelAvailable().
            const reachable = modelAvailable();
            source = reachable ? "model" : "unavailable";
            reply = answerSlug
              ? RETIRED_ANSWER_REPLY
              : reachable
                ? FALLBACK_REPLY
                : UNAVAILABLE_REPLY;
            send("token", { text: reply });

            if (!reachable) {
              // Tells the widget to offer the callback form, as a capped
              // conversation does. The bank still answers, but anything it does
              // not cover now needs a person.
              send("handoff", { reason: "unavailable", contact: null, serviceSlug: null });
              console.warn("[chat] answered from the bank only — no model key is usable");
            }
          } else {
            // The prompt forbids unsupported figures; this catches it when the
            // model does it anyway, rather than trusting the instruction.
            const unsupported = findUnsupportedAmounts(reply, plan.context);
            if (unsupported.length > 0) {
              console.warn(`[chat] unsupported amounts in reply: ${unsupported.join(", ")}`);
              send("caution", { text: FEE_CAUTION });
            }
          }

          // The reply only helps pick follow-ups when it is a real answer. A
          // fallback message is our words, not the topic, and matching on it
          // suggests questions about enquiry forms.
          chips = await nextChips({
            text: source === "model" && reply ? `${asked} ${reply}` : asked,
            used,
          });
        }

        if (chips.length > 0) send("chips", { chips });

        // What the conversation is about, so the callback form in the widget
        // opens on the right service instead of making the visitor find it.
        const topic =
          plan.kind === "canned"
            ? plan.answer.service_slug
            : (matchServices(`${asked} ${reply}`, 1)[0]?.slug ?? null);
        if (topic) send("topic", { serviceSlug: topic });

        await appendMessage(
          sessionId,
          "model",
          reply,
          source,
          plan.kind === "canned" ? plan.answer.slug : null,
        );
        // "unavailable" is not charged: a conversation must not spend its
        // eight model replies on calls that never reached a model, or an outage
        // caps every visitor who talks through it and the chat stays degraded
        // long after the keys come back.
        await countTurn(sessionId, source === "model");

        // Only worth an extraction call when the visitor typed something that
        // could be a phone number or an email.
        const contactShaped = /\d{8,}|@/.test(message);
        const captured =
          contactShaped && matchServices(`${message} ${reply}`, 1).length > 0
            ? await maybeCaptureLead(
                [...past, { role: "user", text: asked }, { role: "model", text: reply }],
                sessionId,
                pagePath,
              )
            : null;

        if (captured) {
          send("lead", { serviceSlug: captured });
        } else if (contactShaped) {
          // They gave us a way to reach them and nothing came of it — either the
          // model could not run, or it ran and found no agreement to be
          // contacted. Both are the same thing to the visitor: they have said
          // what they want and are waiting. So open the callback form with what
          // they typed already in it, and let them tick the box themselves.
          //
          // This is the one turn where losing someone costs an actual customer,
          // and it used to be the turn most likely to end in silence.
          send("handoff", {
            reason: "contact",
            contact: findContact(message),
            serviceSlug: topic,
          });
        }
      } catch (err) {
        console.error(`[chat] stream failed: ${(err as Error).message}`);
        if (!reply) send("token", { text: FALLBACK_REPLY });
      } finally {
        send("done", {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
