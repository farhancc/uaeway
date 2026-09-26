"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The site assistant. Opens from the floating button and answers from published
 * site content only; the server refuses to invent fees and flags it when the
 * model does it anyway.
 */

interface Message {
  role: "user" | "model";
  text: string;
  /** Shown under a reply when the server flagged an unsupported figure. */
  caution?: string;
}

const GREETING =
  "Ask me anything about working, living or setting up a business in the UAE — or about the paperwork behind it.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const sessionId = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      setError(null);
      setBusy(true);
      setMessages((prev) => [...prev, { role: "user", text: question }, { role: "model", text: "" }]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: question,
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
            } else if (event === "lead") {
              setLeadCaptured(true);
            }
          }
        }
      } catch (err) {
        setError((err as Error).message);
        // Drop the empty reply bubble so the error is not shown twice.
        setMessages((prev) => (prev.at(-1)?.text === "" ? prev.slice(0, -1) : prev));
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

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
  }, [messages]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-[2px] bg-ink px-5 py-3 text-sm font-medium text-paper shadow-lg transition-colors hover:bg-go"
      >
        Ask a question
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Site assistant"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[min(34rem,85vh)] flex-col rounded-[2px] border border-rule bg-paper shadow-2xl sm:inset-x-auto sm:right-4 sm:w-[24rem]"
    >
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <p className="sign text-base text-ink">Ask UAE Gateway</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="rounded-[2px] px-2 py-1 text-ink-faint hover:bg-paper hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-ink-soft">{GREETING}</p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                m.role === "user"
                  ? "inline-block max-w-[85%] rounded-[2px] bg-ink px-3 py-2 text-left text-sm text-paper"
                  : "max-w-[92%] whitespace-pre-wrap text-sm leading-relaxed text-ink-soft"
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

        {leadCaptured && (
          <p className="rounded-[2px] border border-go/40 bg-go/5 px-3 py-2 text-xs leading-relaxed text-go-dark">
            Thanks — our team has your details and will message you on WhatsApp.
          </p>
        )}

        {error && <p className="text-xs leading-relaxed text-seal">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-rule px-3 py-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question"
          maxLength={1000}
          className="flex-1 rounded-[2px] border border-rule bg-field px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-[2px] bg-go px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-go-dark disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
