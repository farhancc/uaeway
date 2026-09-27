"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Explains why someone landed back here, so a failed sign-in is actionable
 *  rather than a dead end. */
function Notice() {
  const params = useSearchParams();

  const message =
    params.get("setup") === "1"
      ? "Supabase is not configured yet. Add the project keys to .env.local, run the migration, then add yourself to the admins table."
      : params.get("denied") === "1"
        ? "That account is signed in but is not an admin. Add it to the admins table."
        : null;

  if (!message) return null;

  return (
    <p className="field mt-4 px-3 py-2 text-sm leading-relaxed text-ink-soft">{message}</p>
  );
}

function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (authError) {
      setError("Those details did not work.");
      setBusy(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="field mt-6 space-y-3 p-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-seal">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="sign text-xl text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-soft">Admin access only.</p>

      {/* useSearchParams needs a boundary for this page to prerender. */}
      <Suspense fallback={null}>
        <Notice />
      </Suspense>

      <SignInForm />
    </div>
  );
}
