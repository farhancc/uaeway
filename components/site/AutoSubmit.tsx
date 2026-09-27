"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Makes the filter form apply itself, and keeps the URL it produces clean.
 *
 * The form stays a plain GET form and the page stays a server component —
 * every combination is still a real URL, and filtering still works with
 * JavaScript disabled. This removes the second step for everyone else.
 *
 * It also intercepts the submit. A native GET submit serialises every field,
 * so ticking one box produced
 *
 *   ?q=&sort=newest&emirate=Dubai&salaryMin=&salaryMax=&experience=&company=…
 *
 * which is unshareable, and gives search engines a different URL for every
 * combination of empty values that renders the same page. Empty fields and
 * defaults are dropped, so the URL holds only what was actually chosen.
 *
 * The submit button is hidden from here rather than from the markup, so a
 * visitor without JavaScript keeps the button that is their only way to
 * filter. Nothing is taken away by a script failing to load.
 */
export function AutoSubmit({
  buttonId,
  defaults = {},
}: {
  buttonId: string;
  /** Values that mean "not filtered", and so do not belong in the URL. */
  defaults?: Record<string, string>;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const button = document.getElementById(buttonId);
    if (button) button.hidden = true;

    let timer: ReturnType<typeof setTimeout> | undefined;

    function apply() {
      if (!form) return;
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        const text = String(value).trim();
        if (!text || text === defaults[key]) continue;
        params.append(key, text);
      }
      const query = params.toString();
      router.push(query ? `${window.location.pathname}?${query}` : window.location.pathname);
    }

    function isTyped(target: EventTarget | null): boolean {
      return (
        target instanceof HTMLInputElement &&
        (target.type === "text" || target.type === "number" || target.type === "search")
      );
    }

    // Checkboxes and selects are a decision the moment they change. Typing is
    // not, so text and number inputs wait until you have stopped — applying
    // per keystroke would reload the page under the cursor.
    function onChange(event: Event) {
      if (isTyped(event.target)) return;
      clearTimeout(timer);
      apply();
    }

    function onInput(event: Event) {
      if (!isTyped(event.target)) return;
      clearTimeout(timer);
      timer = setTimeout(apply, 500);
    }

    function onSubmit(event: SubmitEvent) {
      event.preventDefault();
      clearTimeout(timer);
      apply();
    }

    form.addEventListener("change", onChange);
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit);

    return () => {
      clearTimeout(timer);
      form.removeEventListener("change", onChange);
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit);
      if (button) button.hidden = false;
    };
  }, [buttonId, defaults, router]);

  return <span ref={anchor} hidden />;
}
