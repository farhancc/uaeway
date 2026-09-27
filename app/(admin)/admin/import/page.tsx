import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="sign text-xl text-ink">Import</h1>
      <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
        Paste a list of jobs or posts and they go straight into the{" "}
        <Link href="/admin" className="text-brass-deep underline underline-offset-2">
          review queue
        </Link>
        . For work that already exists somewhere — a spreadsheet, a list you keep by hand, output
        from another tool — so it does not have to be retyped a form at a time.
      </p>

      <ImportForm />
    </div>
  );
}
