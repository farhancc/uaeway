"use client";

import { useState } from "react";
import { SERVICES } from "@/lib/services";

/**
 * Leaving your details inside the chat.
 *
 * The assistant used to have one way to turn a conversation into a lead: ask
 * for a number in prose, then run a second model call over the transcript to
 * decide whether a number was given and whether the visitor agreed to be
 * contacted. That costs tokens on the turn that matters most, misses people who
 * would have typed their number into a box but not into a sentence, and infers
 * consent rather than recording it — the weakest form of the thing the PDPL
 * actually asks us to hold.
 *
 * A ticked box and a submitted form is better on all three counts, and free.
 */
export function LeadCapture({
  sessionId,
  serviceSlug,
  prompt,
  onCaptured,
}: {
  sessionId: string | null;
  /** What the conversation has been about, so the picker starts in the right place. */
  serviceSlug: string | null;
  /**
   * Set when the server decided this visitor should be asked now — they typed
   * something that reaches them, or the conversation has run out of assistant.
   * `contact` is what they typed, so they are not made to type it again.
   *
   * A new object each time means asking twice in one conversation opens the
   * form again after they closed it, which is the intent: they said it twice.
   */
  prompt: { contact: string | null } | null;
  onCaptured: () => void;
}) {
  const [opened, setOpened] = useState(false);
  /** The prompt "Not now" was pressed on, so it does not reopen on every render. */
  const [declined, setDeclined] = useState<typeof prompt>(null);

  // Derived rather than synced into state by an effect. A prompt opens the
  // form; "Not now" closes that one prompt and no other, so a visitor who
  // gives their number a second time is asked a second time — they have said
  // it twice, and ignoring them then would be worse than asking again.
  const open = opened || (prompt !== null && prompt !== declined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="rounded-md border border-brass bg-brass/10 px-3 py-2 text-xs font-medium text-brass-deep transition-colors hover:bg-brass/20"
      >
        Have someone call you back
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);

        void (async () => {
          try {
            const res = await fetch("/api/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                serviceSlug: form.get("serviceSlug"),
                name: String(form.get("name") ?? "").trim() || undefined,
                contact: String(form.get("contact") ?? "").trim(),
                need: String(form.get("need") ?? "").trim() || undefined,
                origin: "chat",
                chatSessionId: sessionId ?? undefined,
                pagePath: window.location.pathname,
                hp_ref: form.get("hp_ref"),
                consent: true,
              }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(data.error ?? "That did not go through.");
            setOpened(false);
            onCaptured();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        })();
      }}
      className="space-y-2 rounded-md border border-brass/40 bg-brass/5 p-3"
    >
      <p className="text-xs font-medium text-brass-deep">
        {prompt?.contact
          ? "Is this the best way to reach you? Tick below and someone will come back to you."
          : "Tell us where to reach you and someone will come back to you."}
      </p>

      <div>
        <label htmlFor="lead-name" className="sr-only">
          Your name
        </label>
        <input
          id="lead-name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          className="w-full rounded-md border border-rule bg-field px-2.5 py-1.5 text-xs"
        />
      </div>

      <div>
        <label htmlFor="lead-contact" className="sr-only">
          Phone number or email
        </label>
        <input
          id="lead-contact"
          name="contact"
          required
          autoComplete="tel"
          // Keyed so a later prompt with a different number replaces a stale
          // default rather than being ignored by the uncontrolled input.
          key={prompt?.contact ?? "blank"}
          defaultValue={prompt?.contact ?? ""}
          placeholder="Phone number or email"
          className="w-full rounded-md border border-rule bg-field px-2.5 py-1.5 text-xs"
        />
      </div>

      <div>
        <label htmlFor="lead-service" className="sr-only">
          What you need help with
        </label>
        <select
          id="lead-service"
          name="serviceSlug"
          defaultValue={serviceSlug ?? SERVICES[0].slug}
          className="w-full rounded-md border border-rule bg-field px-2.5 py-1.5 text-xs"
        >
          {SERVICES.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.shortName}
            </option>
          ))}
        </select>
      </div>

      {/* Same honeypot the service-page form uses, and named so autofill does
          not trip it on a real person's behalf. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="lead-hp">Leave this empty</label>
        <input
          id="lead-hp"
          name="hp_ref"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </div>

      <label className="flex items-start gap-2 text-[0.6875rem] leading-relaxed text-ink-soft">
        <input type="checkbox" required className="mt-0.5" />
        <span>
          Our team can contact me by phone or email about this. We will not pass your details to
          anyone else.
        </span>
      </label>

      {error && <p className="text-[0.6875rem] text-seal">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpened(false);
            setDeclined(prompt);
          }}
          className="rounded-md px-2 py-1.5 text-xs text-ink-faint hover:text-ink"
        >
          Not now
        </button>
      </div>
    </form>
  );
}
