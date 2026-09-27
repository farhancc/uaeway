import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import type { Answer } from "@/lib/chat/answers";
import { supabaseServer } from "@/lib/supabase/server";
import { AnswerForm } from "../AnswerForm";

export const dynamic = "force-dynamic";

export default async function EditAnswerPage({ params }: PageProps<"/admin/answers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = await supabaseServer();

  const [answer, others] = await Promise.all([
    db.from("answers").select("*").eq("id", id).maybeSingle(),
    db.from("answers").select("slug, question, service_slug").neq("id", id).eq("active", true).order("question"),
  ]);

  if (!answer.data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Edit answer</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Changes show in the chatbot and on the service page immediately.
      </p>

      <AnswerForm
        answer={answer.data as Answer & { active: boolean }}
        others={(others.data ?? []) as { slug: string; question: string; service_slug: string | null }[]}
      />
    </div>
  );
}
