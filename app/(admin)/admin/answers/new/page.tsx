import { requireAdmin } from "@/lib/admin/auth";
import { answerOptions } from "@/lib/chat/answers";
import { AnswerForm } from "../AnswerForm";

export const dynamic = "force-dynamic";

export default async function NewAnswerPage() {
  await requireAdmin();
  const others = await answerOptions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Add an answer</h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Goes live as soon as you save — these are written by a person, so they do not go through
        the review queue.
      </p>

      <AnswerForm others={others} />
    </div>
  );
}
