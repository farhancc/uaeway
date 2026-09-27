"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnswerChoice } from "@/lib/chat/answers";
import { triggersMatch } from "@/lib/chat/answers";
import { tokenize } from "@/lib/text";
import type { Chip } from "@/lib/chat/chips";
import { LeadCapture } from "./LeadCapture";
import { SITE } from "@/lib/site";

/**
 * The site assistant.
 *
 * Suggested questions are the point, not decoration: tapping one is an exact
 * lookup by slug on the server — no matching, no model call — so a whole
 * conversation can run without costing anything. They appear before the first
 * message and after every reply.
 */

interface Message {
  role: "user" | "model";
  text: string;
  /** Shown under a reply when the server flagged an unsupported figure. */
  caution?: string;
}

interface Trigger {
  slug: string;
  question: string;
  groups: string[][];
}

const GREETING =
  "Ask me anything about working, living or setting up a business in the UAE — or about the paperwork behind it.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  /** Offered when an answer could not be given without knowing which case. */
  const [choices, setChoices] = useState<AnswerChoice[]>([]);
  /** The author's exact triggers, matched in the browser as the visitor types. */
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  /** What the conversation is about, for the callback form's service picker. */
  const [topic, setTopic] = useState<string | null>(null);
  /** Mirrors the ref so the callback form re-renders once a session exists. */
  const [sessionKnown, setSessionKnown] = useState<string | null>(null);

  /**
   * The answer the half-typed question already matches.
   *
   * Checked on every keystroke rather than on send: the point of an exact
   * trigger is that the author knows what this question is, so there is no
   * reason to make someone finish typing it. The same check runs again on the
   * server when they do send, so tapping the hint and pressing enter give the
   * same answer.
   */
  const hint = useMemo(() => {
    if (busy || triggers.length === 0) return null;
    const words = tokenize(input);
    if (words.length === 0) return null;
    return triggers.find((t) => triggersMatch(t.groups, words)) ?? null;
  }, [input, triggers, busy]);

  const sessionId = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (text: string, answerSlug?: string) => {
      const question = text.trim();
      if ((!question && !answerSlug) || busy) return;

      setError(null);
      setBusy(true);
      setChoices([]);
      // Clear the chips immediately: leaving them up while a reply streams
      // invites a second tap that would be answered out of order.
      setChips([]);
      setMessages((prev) => [
        ...prev,
        { role: "user", text: question },
        { role: "model", text: "" },
      ]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: question,
            answerSlug,
            sessionId: sessionId.current,
            pagePath: window.location.pathname,
          }),
        });

        if (!res.ok || !res.body) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "The assistant is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const event = frame.match(/^event: (.+)$/m)?.[1];
            const raw = frame.match(/^data: (.+)$/m)?.[1];
            if (!event || !raw) continue;

            const data = JSON.parse(raw);
            if (event === "meta") {
              sessionId.current = data.sessionId;
              setSessionKnown(data.sessionId);
            } else if (event === "token") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  text: next[next.length - 1].text + data.text,
                };
                return next;
              });
            } else if (event === "caution") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], caution: data.text };
                return next;
              });
            } else if (event === "choices") {
              setChoices(data.choices);
            } else if (event === "chips") {
              setChips(data.chips);
            } else if (event === "topic") {
              setTopic(data.serviceSlug);
            } else if (event === "lead") {
              setLeadCaptured(true);
            }
          }
        }
      } catch (err) {
        setError((err as Error).message);
        setMessages((prev) => (prev.at(-1)?.text === "" ? prev.slice(0, -1) : prev));
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  // The opening suggestions, fetched once the panel is first opened so a
  // visitor who never opens it costs nothing.
  useEffect(() => {
    if (!open || chips.length > 0 || messages.length > 0) return;
    let cancelled = false;

    fetch("/api/chat")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.chips) setChips(data.chips);
        if (data.triggers) setTriggers(data.triggers);
      })
      .catch(() => {
        // No suggestions is a fine state; typing still works.
      });

    return () => {
      cancelled = true;
    };
  }, [open, chips.length, messages.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      inputRef.current?.focus();
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, chips]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full bg-deep py-3 pl-4 pr-5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-[1.03]"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
          <path d="M12 3C7.03 3 3 6.58 3 11c0 2.2 1 4.18 2.63 5.6L5 21l4.2-2.2c.89.24 1.83.37 2.8.37 4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
        </svg>
        Ask a question
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Site assistant"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[min(34rem,85vh)] flex-col overflow-hidden rounded-xl bg-paper shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:right-4 sm:w-[24rem]"
    >
      {/* The bar a messaging app puts at the top: dark, with who you are
          talking to and whether they are there. */}
      <div className="flex items-center gap-3 bg-deep px-3 py-2.5 text-white">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold"
        >
          UV
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{SITE.name}</span>
          <span className="block text-xs text-white/70">
            {busy ? "typing…" : "Usually replies instantly"}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="rounded-full px-2 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div ref={scroller} className="doodles flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="bubble-in max-w-[85%]">
            <p className="text-sm leading-relaxed text-ink">{GREETING}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "bubble-out max-w-[85%] whitespace-pre-wrap text-left text-sm leading-relaxed text-ink"
                  : "bubble-in max-w-[88%] whitespace-pre-wrap text-sm leading-relaxed text-ink"
              }
            >
              {m.text || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
            {m.caution && (
              <p className="mt-1.5 max-w-[92%] border-l-2 border-seal pl-2 text-xs leading-relaxed text-ink-faint">
                {m.caution}
              </p>
            )}
          </div>
        ))}

        {/* The choices an answer offered. Ahead of the suggestions and styled
            as the thing to do next, because the answer above is incomplete
            until one of them is picked. */}
        {choices.length > 0 && !busy && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {choices.map((choice) => (
              <button
                key={choice.answer_slug}
                type="button"
                onClick={() => void send(choice.label, choice.answer_slug)}
                className="rounded-md border border-brass bg-brass/10 px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-brass-deep transition-colors hover:bg-brass/20"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {chips.length > 0 && !busy && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {chips.map((chip) => (
              <button
                key={chip.slug}
                type="button"
                onClick={() => void send(chip.question, chip.slug)}
                className="rounded-md border border-rule bg-paper px-2.5 py-1.5 text-left text-xs leading-snug text-ink-soft transition-colors hover:border-brass hover:text-brass-deep"
              >
                {chip.question}
              </button>
            ))}
          </div>
        )}

        {/* The way out of the conversation and into the sales pipeline. Shown
            once there is something to talk about, and on every reply after
            that — the canned answers carry no call to action of their own, so
            without this the cheapest path through the chat was also the one
            that never asked for the business. */}
        {messages.length > 0 && !busy && !leadCaptured && (
          <div className="pt-1">
            <LeadCapture
              sessionId={sessionKnown}
              serviceSlug={topic}
              onCaptured={() => setLeadCaptured(true)}
            />
          </div>
        )}

        {leadCaptured && (
          <p className="rounded-md border border-brass/40 bg-brass/5 px-3 py-2 text-xs leading-relaxed text-brass-deep">
            Thanks — our team has your details and will get back to you.
          </p>
        )}

        {error && <p className="text-xs leading-relaxed text-seal">{error}</p>}
      </div>

      {/* Shown the moment the words are all there, above the box being typed
          in. Tapping answers now; pressing enter reaches the same answer by the
          same rules on the server. */}
      {hint && (
        <button
          type="button"
          onClick={() => {
            setInput("");
            void send(hint.question, hint.slug);
          }}
          className="flex w-full items-center gap-2 border-t border-brass/40 bg-brass/10 px-3 py-2.5 text-left text-xs leading-snug text-brass-deep transition-colors hover:bg-brass/20"
        >
          <span className="text-ink-faint">We can answer that:</span>
          <span className="font-medium">{hint.question}</span>
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 bg-paper px-2 py-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-full bg-field px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal/40"
        />
        {/* A round send button, and dark ink on it rather than white: bright
            green reads at 1.98 against white and 8.8 against this ink. */}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bright text-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
