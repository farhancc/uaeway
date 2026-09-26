import { requireAdmin } from "@/lib/admin/auth";
import { ComposeForm } from "./ComposeForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Write a post</h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Saved as a draft. It appears in the review queue and goes live when someone publishes it
        there — the same route an AI draft takes.
      </p>

      <ComposeForm />
    </div>
  );
}
