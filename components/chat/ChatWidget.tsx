"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnswerChoice } from "@/lib/chat/answers";
import { triggersMatch } from "@/lib/chat/answers";
import { charsVisible } from "@/lib/chat/typing";
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
  /** Full screen. Kept here rather than in a route so nothing is lost — the
   *  conversation, the buffer and the session all carry straight over. */
  const [expanded, setExpanded] = useState(false);
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

  /**
   * Text that has arrived but has not been shown yet.
   *
   * The two kinds of reply arrive completely differently — a stored answer is
   * one block the instant the server reads it, a model answer trickles in over
   * a second or two — and without this they read as two different assistants.
   * Everything now goes through the same buffer and is revealed at the same
   * pace, so a visitor cannot tell which kind of answer they are getting, which
   * is the point: the stored ones are the good ones.
   */
  const pending = useRef("");
  const revealing = useRef(false);
  const streamDone = useRef(true);
  const revealFrame = useRef<number | null>(null);

  /** Appends to the visible text of the reply being written. */
  const appendVisible = useCallback((text: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, text: last.text + text };
      return next;
    });
  }, []);

  const reveal = useCallback(() => {
    if (revealing.current) return;
    revealing.current = true;

    const startedAt = performance.now();
    let shown = 0;

    const tick = () => {
      if (pending.current.length === 0) {
        revealing.current = false;
        // Only now is the reply actually finished, whatever the network did.
        if (streamDone.current) setBusy(false);
        return;
      }

      // How much *should* be visible by now, from the clock — not from how
      // many frames happened to fire. A frame delayed by throttling then takes
      // a proportionally bigger bite, so the reply lands in about REVEAL_MS
      // whether the tab is focused or not. Per-frame deltas were measured
      // stretching a one-second reveal to five in an unfocused tab.
      const queued = shown + pending.current.length;
      const want = charsVisible(performance.now() - startedAt, queued);
      const size = Math.max(1, want - shown);

      appendVisible(pending.current.slice(0, size));
      pending.current = pending.current.slice(size);
      shown += size;
      revealFrame.current = requestAnimationFrame(tick);
    };

    revealFrame.current = requestAnimationFrame(tick);
  }, [appendVisible]);

  /** Anyone who has asked not to see motion gets the whole reply at once. */
  const instant = useRef(false);
  useEffect(() => {
    instant.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(
    () => () => {
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    },
    [],
  );
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (text: string, answerSlug?: string) => {
      const question = text.trim();
      if ((!question && !answerSlug) || busy) return;

      setError(null);
      setBusy(true);
      setChoices([]);
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
      pending.current = "";
      revealing.current = false;
      streamDone.current = false;
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
              if (instant.current) appendVisible(data.text);
              else {
                pending.current += data.text;
                reveal();
              }
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
        pending.current = "";
        setMessages((prev) => (prev.at(-1)?.text === "" ? prev.slice(0, -1) : prev));
        streamDone.current = true;
        setBusy(false);
      } finally {
        streamDone.current = true;
        // The network is done; the reply is not until the buffer has drained.
        // Whoever finishes last turns off the indicator.
        if (!revealing.current && pending.current.length === 0) setBusy(false);
      }
    },
    [busy, appendVisible, reveal],
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
  }, [messages, chips, expanded]);

  // Escape steps back one level rather than dumping you out of the
  // conversation: full screen first, then the panel.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setExpanded((wasExpanded) => {
        if (!wasExpanded) setOpen(false);
        return false;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full border border-brass bg-ink py-3 pl-4 pr-5 text-sm font-medium text-paper shadow-lg transition-opacity hover:opacity-90"
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
      className={
        expanded
          ? "chat-skin fixed inset-0 z-50 flex flex-col bg-[var(--chat-ground)]"
          : "chat-skin fixed inset-x-3 bottom-3 z-40 flex max-h-[min(34rem,85vh)] flex-col overflow-hidden rounded-xl bg-[var(--chat-ground)] shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:right-4 sm:w-[24rem]"
      }
    >
      {/* The bar a messaging app puts at the top: dark, with who you are
          talking to and whether they are there. */}
      <div className={`flex items-center gap-3 bg-[var(--chat-bar)] px-3 py-2.5 text-white ${expanded ? "[&>*:first-child]:ml-auto [&>*:last-child]:mr-auto" : ""}`}>
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
          onClick={() => setExpanded((was) => !was)}
          aria-label={expanded ? "Leave full screen" : "Open full screen"}
          aria-pressed={expanded}
          className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
            {expanded ? (
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
            ) : (
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            )}
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setOpen(false);
          }}
          aria-label="Close assistant"
          className="rounded-full px-2 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div
        ref={scroller}
        className={`chat-field flex-1 space-y-2 overflow-y-auto px-3 py-3 ${
          expanded ? "[&>*]:mx-auto [&>*]:w-full [&>*]:max-w-2xl" : ""
        }`}
      >
        {messages.length === 0 && (
          <div className="chat-in max-w-[85%]">
            <p className="text-sm leading-relaxed">{GREETING}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "chat-out max-w-[85%] whitespace-pre-wrap text-left text-sm leading-relaxed"
                  : "chat-in max-w-[88%] whitespace-pre-wrap text-sm leading-relaxed"
              }
            >
              {m.text ||
                (busy && i === messages.length - 1 ? (
                  <span className="chat-typing" role="status" aria-label="Typing">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  ""
                ))}
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
        className={`flex items-end gap-2 bg-[var(--chat-ground)] px-2 py-2 ${expanded ? "mx-auto w-full max-w-2xl" : ""}`}
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
          className="min-w-0 flex-1 rounded-full bg-[var(--chat-in)] px-4 py-2.5 text-sm text-[var(--chat-ink)] shadow-sm placeholder:text-[var(--chat-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--chat-bar)]/30"
        />
        {/* A round send button, and dark ink on it rather than white: bright
            green reads at 1.98 against white and 8.8 against this ink. */}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--chat-send)] text-[var(--chat-ink)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
