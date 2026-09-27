import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AnswerForm } from "../AnswerForm";

export const dynamic = "force-dynamic";

export default async function NewAnswerPage() {
  await requireAdmin();
  const db = await supabaseServer();

  const { data } = await db
    .from("answers")
    .select("slug, question")
    .eq("active", true)
    .order("question");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Add an answer</h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Goes live as soon as you save — these are written by a person, so they do not go through
        the review queue.
      </p>

      <AnswerForm others={(data ?? []) as { slug: string; question: string }[]} />
    </div>
  );
}
