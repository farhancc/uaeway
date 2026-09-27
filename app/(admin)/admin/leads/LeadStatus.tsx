"use client";

import { useTransition } from "react";
import { setLeadStatus } from "../actions";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

export function LeadStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      aria-label="Lead status"
      onChange={(e) => {
        const next = e.target.value;
        start(async () => setLeadStatus(id, next));
      }}
      className="rounded-md border border-rule bg-paper px-2 py-1 text-xs text-ink"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
