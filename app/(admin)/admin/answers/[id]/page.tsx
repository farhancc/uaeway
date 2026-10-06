import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { answerById, answerOptions } from "@/lib/chat/answers";
import { AnswerForm } from "../AnswerForm";

export const dynamic = "force-dynamic";

export default async function EditAnswerPage({ params }: PageProps<"/admin/answers/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const [answer, others] = await Promise.all([answerById(id), answerOptions(id)]);

  if (!answer) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Edit answer</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Changes show in the chatbot and on the service page immediately.
      </p>

      <AnswerForm answer={answer} others={others} />
    </div>
  );
}
