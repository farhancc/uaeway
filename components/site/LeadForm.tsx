"use client";

import { useState } from "react";
import type { Service } from "@/lib/services";

/**
 * The intake form on a service page. Fields come from the service definition,
 * so adding a question to a service is a one-line change in lib/services.ts.
 *
 * The consent checkbox is not pre-ticked and the form will not submit without
 * it: under the PDPL we need a real moment of agreement to be contacted, and a
 * pre-ticked box is not one.
 */
export function LeadForm({ service }: { service: Service }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setError(null);

    // Everything the service asked for beyond name/contact goes into `need`,
    // so sales reads one description instead of a field dump.
    const extras = service.intake
      .filter((f) => !["name", "phone", "email"].includes(f.name))
      .map((f) => {
        const value = form.get(f.name);
        return value ? `${f.label}: ${value}` : null;
      })
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: service.slug,
          name: form.get("name") || undefined,
          contact: form.get("phone"),
          email: form.get("email") || undefined,
          need: extras || undefined,
          origin: "form",
          pagePath: window.location.pathname,
          website: form.get("website"),
          consent: form.get("consent") === "on",
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Something went wrong.");
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-[2px] border border-go/40 bg-go/5 p-5">
        <p className="sign text-go-dark">Got it.</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Someone from the team will message you on WhatsApp. If it is urgent, message us first —
          that reaches us fastest.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[2px] border border-rule bg-field p-5">
      <h2 className="sign text-lg text-ink">Tell us what you need</h2>
      <p className="mt-1 text-sm text-ink-soft">
        No obligation. We will tell you if you do not need us.
      </p>

      <div className="mt-4 space-y-3">
        {service.intake.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-ink">
              {field.label}
              {!field.required && <span className="ml-1 text-ink-faint">(optional)</span>}
            </label>

            {field.type === "textarea" ? (
              <textarea
                id={field.name}
                name={field.name}
                required={field.required}
                rows={3}
                className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm text-ink"
              />
            ) : field.type === "select" ? (
              <select
                id={field.name}
                name={field.name}
                required={field.required}
                defaultValue=""
                className="mt-1 w-full rounded-[2px] border border-rule bg-field px-3 py-2 text-sm text-ink"
              >
                <option value="" disabled>
                  Choose one
                </option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                autoComplete={
                  field.type === "tel" ? "tel" : field.type === "email" ? "email" : "off"
                }
                className="mt-1 w-full rounded-[2px] border border-rule px-3 py-2 text-sm text-ink"
              />
            )}
          </div>
        ))}

        {/* Honeypot. Hidden from people, irresistible to bots. */}
        <div aria-hidden="true" className="absolute left-[-9999px]">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="flex items-start gap-2 pt-1 text-sm leading-relaxed text-ink-soft">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            Our team can contact me on WhatsApp or email about this enquiry. We will not pass your
            details to anyone else.
          </span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-seal">{error}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-4 w-full rounded-[2px] bg-go px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-go-dark disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
