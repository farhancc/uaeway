import { headers } from "next/headers";
import { streamChat, generateJSON, type Turn } from "@/lib/ai/gemini";
import { modelAvailable } from "@/lib/ai/pool";
import { planReply } from "@/lib/chat/plan";
import { flowEnabled, runFlowTurn, type FlowTurn } from "@/lib/chat/flow/serve";
import { openingSuggestions, typingHints } from "@/lib/chat/flow/run";
import { loadLiveFlow } from "@/lib/chat/flow/store";
import { renderContext, retrieve } from "@/lib/chat/retrieve";
import { pageContextFrom } from "@/lib/chat/page-context";
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
  MAX_AI_TURNS,
  saveFlowState,
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
  // The flow's shape of this is the same shape: an opaque id the widget hands
  // back on the next turn, and the keyword groups it matches while you type.
  // Only the meaning of the id changed — a node instead of an answer slug —
  // and the widget never looks inside it.
  const live = flowEnabled() ? await loadLiveFlow() : null;
  if (live) {
    return Response.json({
      chips: openingSuggestions(live.flow).map((s) => ({ slug: s.nodeId, question: s.label })),
      triggers: typingHints(live.flow).map((h) => ({
        slug: h.nodeId,
        question: h.label,
        groups: h.groups,
        phrases: h.phrases,
        any: [],
      })),
    });
  }

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

/**
 * A model reply, streamed, with the two things that must not be duplicated.
 *
 * An empty reply has two causes and they are not the same: the model ran and
 * said nothing, or no key could reach a model at all. Only the first is charged
 * to the conversation's budget, because an outage must not cap every visitor
 * who talks through it and leave the chat degraded long after the keys return.
 *
 * And the prompt forbids figures the context does not support, so this checks
 * rather than trusting the instruction — on fees, being confidently wrong is
 * the expensive failure.
 *
 * Shared by the answer bank's planner and the flow's `model` node, which is the
 * point: two copies of this would drift, and the drift would be an outage
 * handled correctly on one path and not the other.
 */
async function streamModelReply(
  send: (event: string, data: unknown) => void,
  past: Turn[],
  asked: string,
  context: string,
  viaSuggestion: boolean,
): Promise<{ reply: string; source: ReplySource; answered: boolean }> {
  let reply = "";

  for await (const chunk of streamChat([...past, { role: "user", text: withContext(asked, context) }], {
    system: SYSTEM_PROMPT,
    temperature: 0.4,
    maxOutputTokens: 600,
  })) {
    reply += chunk;
    send("token", { text: chunk });
  }

  if (!reply) {
    const reachable = modelAvailable();
    const source: ReplySource = reachable ? "model" : "unavailable";
    reply = viaSuggestion ? RETIRED_ANSWER_REPLY : reachable ? FALLBACK_REPLY : UNAVAILABLE_REPLY;
    send("token", { text: reply });

    if (!reachable) {
      // Tells the widget to offer the callback form, as a capped conversation
      // does. Canned answers still work; anything they do not cover needs a
      // person now.
      send("handoff", { reason: "unavailable", contact: null, serviceSlug: null });
      console.warn("[chat] answered without a model — no key is usable");
    }
    return { reply, source, answered: false };
  }

  const unsupported = findUnsupportedAmounts(reply, context);
  if (unsupported.length > 0) {
    console.warn(`[chat] unsupported amounts in reply: ${unsupported.join(", ")}`);
    send("caution", { text: FEE_CAUTION });
  }

  return { reply, source: "model", answered: true };
}

/** However the service chose to reach someone. Phone first: it is what the
 *  sales team actually uses. */
function contactFrom(
  qualified: { fields: Record<string, string> } | null,
): string | null {
  return qualified?.fields.phone ?? qualified?.fields.email ?? null;
}

/**
 * One flow turn, rendered as the events the widget already speaks.
 *
 * Translation, not decision: `runTurn` has already chosen what happens, and
 * every effect it produced maps onto an existing SSE event. That correspondence
 * is what let the conversation move to a graph without the browser learning a
 * new vocabulary — a `say` is a token, a choice is a choice, a handoff is a
 * handoff.
 *
 * The one thing decided here rather than in the walk is money. A `model` node
 * is the only effect that can cost anything, so the per-conversation budget is
 * checked at the moment of spending it rather than being threaded through a
 * pure function.
 */
async function serveFlowTurn(args: {
  send: (event: string, data: unknown) => void;
  turn: FlowTurn;
  session: Session;
  past: Turn[];
  asked: string;
  message: string;
}): Promise<{ reply: string; source: ReplySource; flowNodeId: string | null; handedOff: boolean }> {
  const { send, turn, session, past, asked, message } = args;
  const { step } = turn;

  let reply = "";
  let source: ReplySource = "canned";
  let flowNodeId: string | null = null;

  /** Appends to the reply and streams the new part, so several nodes speaking
   *  in one turn read as one message rather than arriving as fragments. */
  const say = (text: string) => {
    const chunk = reply ? `\n\n${text}` : text;
    reply += chunk;
    send("token", { text: chunk });
  };

  let qualified: { nodeId: string; serviceId: string; fields: Record<string, string> } | null = null;
  /** Whether the callback form has already been opened this turn. One is help;
   *  two is a bug the visitor sees. */
  let handedOff = false;
  /**
   * False once a model call produced nothing.
   *
   * It changes what happens next rather than only what is said: there is no
   * point asking someone for their country again immediately after failing to
   * answer their question, so this is what turns the turn into a handoff.
   */
  let modelAnswered = true;
  // Held back until the reply is complete. The walk emits them in graph order,
  // but a suggestion row appearing above an answer that is still arriving reads
  // as the bot changing the subject before it has finished speaking.
  const deferred: (() => void)[] = [];

  for (const effect of step.effects) {
    switch (effect.kind) {
      case "say":
        say(effect.text);
        flowNodeId = effect.nodeId;
        break;

      case "ask":
        // The flow wants to carry on asking, but the model just failed to
        // answer what they asked us. Pressing on with the form would be the
        // rudest possible moment to do it.
        if (!modelAnswered) break;
        say(effect.text);
        flowNodeId = effect.nodeId;
        break;

      case "handoff":
        say(effect.text);
        flowNodeId = effect.nodeId;
        handedOff = true;
        send("handoff", {
          reason: effect.reason,
          // A completed qualification has already collected and normalised a
          // contact; `findContact` re-reading the raw message would put the
          // unnormalised spelling in the form instead.
          contact: contactFrom(qualified) ?? findContact(message),
          serviceSlug: effect.serviceSlug ?? qualified?.serviceId ?? null,
        });
        break;

      case "choices":
        // `answer_slug` carries a node id here. The widget treats it as opaque
        // and hands it back untouched, so the wire format did not have to
        // change when the thing behind the id did.
        deferred.push(() =>
          send("choices", {
            choices: effect.choices.map((c) => ({ label: c.label, answer_slug: c.nodeId })),
          }),
        );
        break;

      case "chips":
        deferred.push(() =>
          send("chips", { chips: effect.chips.map((c) => ({ slug: c.nodeId, question: c.label })) }),
        );
        break;

      case "topic":
        send("topic", { serviceSlug: effect.serviceSlug });
        break;

      case "qualified":
        qualified = effect;
        break;

      case "model": {
        flowNodeId = effect.nodeId;

        if (session.aiTurns >= MAX_AI_TURNS) {
          // Past the budget the flow still answers everything it has a box for,
          // so a capped conversation stays useful and costs nothing.
          source = "capped";
          say(CAPPED_REPLY);
          handedOff = true;
          send("handoff", { reason: "budget", contact: null, serviceSlug: null });
          break;
        }

        // Run in place rather than after the loop, so a question answered
        // mid-qualification is followed by the question we were asking — in
        // that order, which is the order it makes sense in.
        if (reply) send("token", { text: "\n\n" });

        const recent = past.slice(-2).map((t) => t.text).join(" ");
        const snippets = await retrieve(`${recent} ${message}`.trim());
        const context = [effect.guidance, renderContext(snippets)].filter(Boolean).join("\n\n");
        const answer = await streamModelReply(send, past, asked, context, false);

        reply = reply ? `${reply}\n\n${answer.reply}` : answer.reply;
        source = answer.source;
        modelAnswered = answer.answered;
        break;
      }
    }
  }

  if (qualified && !handedOff) {
    // Deliberately not `captureLead` straight from here. `lib/leads/schema.ts`
    // makes consent a `z.literal(true)` because under the PDPL we need a
    // recorded moment of agreement to be contacted — and answering "what is
    // your number" is not that moment, it is an answer to a question.
    //
    // So a completed qualification opens the callback form with everything
    // already filled in and one box left to tick. The visitor spends a tap, and
    // the agreement on the lead is theirs rather than something we inferred.
    handedOff = true;
    send("handoff", {
      reason: "qualified",
      contact: contactFrom(qualified) ?? findContact(message),
      serviceSlug: qualified.serviceId,
    });
  }

  // The last rung of the ladder: the flow had no answer, the model had no
  // answer, so a person takes it. The form asks for a name and a number and
  // creates the lead — which is the only thing left that helps them.
  if (!modelAnswered && !handedOff) {
    handedOff = true;
    send("handoff", {
      reason: "contact",
      contact: findContact(message),
      serviceSlug: qualified?.serviceId ?? null,
    });
  }

  if (!step.matched && reply === "") {
    // The flow had nothing for this and no fallback edge to take. An authoring
    // fault rather than a visitor's, so they get the same reply they always did
    // rather than silence, and `lint.ts` reports it to whoever can fix it.
    say(FALLBACK_REPLY);
    console.warn(`[flow] v${turn.version} had no answer and no fallback for: ${asked}`);
  }

  for (const emit of deferred) emit();

  await saveFlowState(session.id, turn.versionId, step.state);
  return { reply, source, flowNodeId, handedOff };
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

  // The flow answers the turn outright when it is serving, including deciding
  // that nothing matched. Falling back to the bank per turn would mean two
  // engines disagreeing about one conversation, which is worse than either.
  const flowTurn = await runFlowTurn(
    session,
    { message, targetNodeId: answerSlug },
    pageContextFrom(pagePath),
  );
  const plan = flowTurn ? null : await planReply(message, answerSlug, session, past);

  // A tapped chip is recorded as the question it stands for, so the transcript
  // reads as a conversation rather than a list of slugs. The widget already
  // sends the chip's label as the message, so there is nothing to look up.
  const asked =
    plan?.kind === "canned" && plan.viaChip ? plan.answer.question : message || "(no question)";
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
      /** The flow node that produced the reply, for the nightly improver. */
      let flowNodeId: string | null = null;
      /** Whether the callback form has already been opened this turn. */
      let handedOff = false;

      try {
        if (flowTurn) {
          ({ reply, source, flowNodeId, handedOff } = await serveFlowTurn({
            send,
            turn: flowTurn,
            session,
            past,
            asked,
            message,
          }));
        } else if (plan?.kind === "canned") {
          source = "canned";
          reply = plan.answer.answer_md;
          send("token", { text: reply });
          // Choices before follow-ups: this answer could not be given without
          // knowing which case applies, so picking one is the next step rather
          // than a suggestion of something else to ask.
          const choices = (plan.answer.choices ?? []).filter((c) => c.label && c.answer_slug);
          if (choices.length > 0) send("choices", { choices });
          chips = await nextChips({ answered: plan.answer, text: asked, used });
        } else if (plan?.kind === "retired") {
          source = "canned";
          reply = RETIRED_ANSWER_REPLY;
          send("token", { text: reply });
          chips = await nextChips({ text: "", used });
        } else if (plan?.kind === "capped") {
          source = "capped";
          reply = CAPPED_REPLY;
          send("token", { text: reply });
          send("handoff", { reason: "budget", contact: null, serviceSlug: null });
          chips = await nextChips({ text: asked, used });
        } else if (plan) {
          ({ reply, source } = await streamModelReply(
            send,
            past,
            asked,
            plan.context,
            Boolean(answerSlug),
          ));

          // The reply only helps pick follow-ups when it is a real answer. A
          // fallback message is our words, not the topic, and matching on it
          // suggests questions about enquiry forms.
          chips = await nextChips({
            text: source === "model" && reply ? `${asked} ${reply}` : asked,
            used,
          });
        }

        // Suggestions and topic are effects on the flow path, already sent by
        // the walk — only the bank needs them assembled here.
        let topic: string | null = null;
        if (plan) {
          if (chips.length > 0) send("chips", { chips });

          // What the conversation is about, so the callback form in the widget
          // opens on the right service instead of making the visitor find it.
          topic =
            plan.kind === "canned"
              ? plan.answer.service_slug
              : (matchServices(`${asked} ${reply}`, 1)[0]?.slug ?? null);
          if (topic) send("topic", { serviceSlug: topic });
        } else {
          topic = matchServices(`${asked} ${reply}`, 1)[0]?.slug ?? null;
        }

        await appendMessage(
          sessionId,
          "model",
          reply,
          source,
          plan?.kind === "canned" ? plan.answer.slug : null,
          flowNodeId,
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
        } else if (contactShaped && !handedOff) {
          // They gave us a way to reach them and nothing came of it — either the
          // model could not run, or it ran and found no agreement to be
          // contacted. Both are the same thing to the visitor: they have said
          // what they want and are waiting. So open the callback form with what
          // they typed already in it, and let them tick the box themselves.
          //
          // This is the one turn where losing someone costs an actual customer,
          // and it used to be the turn most likely to end in silence.
          //
          // Skipped when the flow already opened the form: a completed
          // qualification ends on a phone number, so this would fire every time
          // and open it twice.
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
