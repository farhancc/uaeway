import { headers } from "next/headers";
import { streamChat, generateJSON, type Turn } from "@/lib/ai/gemini";
import {
  buildSystemPrompt,
  EXTRACTION_PROMPT,
  FALLBACK_REPLY,
  FEE_CAUTION,
  findUnsupportedAmounts,
} from "@/lib/chat/prompt";
import { renderContext, retrieve } from "@/lib/chat/retrieve";
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
} from "@/lib/chat/session";
import { captureLead } from "@/lib/leads/capture";
import { looksContactable } from "@/lib/leads/schema";
import { serviceSlugs } from "@/lib/services";

/** Streamed over SSE, so the visitor sees the answer forming. */
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || h.get("x-real-ip") || "0.0.0.0").trim();
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
 * pay for an extraction call on every turn. Returns the service they asked
 * about, or null if nothing was captured.
 */
async function maybeCaptureLead(
  turns: Turn[],
  sessionId: string,
  pagePath: string | null,
): Promise<string | null> {
  const transcript = turns.map((t) => `${t.role === "user" ? "Visitor" : "Assistant"}: ${t.text}`).join("\n");

  const extracted = await generateJSON<Extraction>(
    EXTRACTION_PROMPT.replace("SERVICE_SLUGS", serviceSlugs().join(", ")) + transcript,
  );

  if (!extracted?.hasContact || !extracted.consented || !extracted.contact) return null;
  if (!looksContactable(extracted.contact)) return null;

  const slug = extracted.serviceSlug && serviceSlugs().includes(extracted.serviceSlug)
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
  let body: { sessionId?: string; message?: string; pagePath?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return Response.json({ error: "message is required" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: "message too long" }, { status: 413 });
  }

  const ipHash = hashIp(await clientIp());
  const pagePath = body.pagePath?.slice(0, 300) ?? null;

  let session;
  try {
    session = body.sessionId ? await loadSession(body.sessionId, ipHash) : null;
    if (!session) {
      const ua = (await headers()).get("user-agent");
      session = await startSession(ipHash, ua?.slice(0, 300) ?? null, pagePath);
    }
  } catch (err) {
    if (err instanceof RateLimited) {
      return Response.json({ error: "Too many conversations. Try again later." }, { status: 429 });
    }
    console.error(`[chat] session error: ${(err as Error).message}`);
    return Response.json({ error: "chat unavailable" }, { status: 503 });
  }

  if (session.turnCount >= MAX_TURNS) {
    return Response.json(
      { error: "This conversation has reached its limit. Please message us on WhatsApp." },
      { status: 429 },
    );
  }

  const past = await history(session.id);
  await appendMessage(session.id, "user", message);

  // Retrieve against the question plus a little history, so follow-ups like
  // "how much is that?" still find the right page.
  const recent = past.slice(-2).map((t) => t.text).join(" ");
  const snippets = await retrieve(`${recent} ${message}`.trim());
  const context = renderContext(snippets);

  const turns: Turn[] = [...past, { role: "user", text: message }];
  const sessionId = session.id;
  const turnCount = session.turnCount;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      send("meta", { sessionId });

      let reply = "";
      try {
        for await (const chunk of streamChat(turns, {
          system: buildSystemPrompt(context),
          temperature: 0.4,
          maxOutputTokens: 600,
        })) {
          reply += chunk;
          send("token", { text: chunk });
        }

        if (!reply) {
          reply = FALLBACK_REPLY;
          send("token", { text: reply });
        } else {
          // The prompt forbids unsupported figures; this catches it when the
          // model does it anyway, rather than trusting the instruction.
          const unsupported = findUnsupportedAmounts(reply, context);
          if (unsupported.length > 0) {
            console.warn(`[chat] unsupported amounts in reply: ${unsupported.join(", ")}`);
            send("caution", { text: FEE_CAUTION });
          }
        }

        await appendMessage(sessionId, "model", reply);
        await countTurn(sessionId, turnCount);

        // Only worth an extraction call when the visitor said something that
        // could be a phone number or an email.
        if (/\d{8,}|@/.test(message)) {
          const captured = await maybeCaptureLead(
            [...turns, { role: "model", text: reply }],
            sessionId,
            pagePath,
          );
          if (captured) send("lead", { serviceSlug: captured });
        }
      } catch (err) {
        console.error(`[chat] stream failed: ${(err as Error).message}`);
        send("token", { text: reply ? "" : FALLBACK_REPLY });
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
