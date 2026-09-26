import { requireAdmin } from "@/lib/admin/auth";
import { JobForm } from "./JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Add a job</h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        For a vacancy an employer sent you directly. Saved as a draft and published from the
        review queue, the same as a listing the nightly ingest found.
      </p>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-seal">
        Do not add a listing that asks the candidate to pay anything.
      </p>

      <JobForm />
    </div>
  );
}
