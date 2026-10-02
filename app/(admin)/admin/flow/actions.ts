"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { lintFlow, publishable, type Finding } from "@/lib/chat/flow/lint";
import { flowDoc } from "@/lib/chat/flow/schema";
import { loadDraft, saveDraft, setLiveVersion } from "@/lib/chat/flow/store";
import { applyPatch } from "@/lib/chat/flow/patch";
import { decideProposal, getProposal } from "@/lib/chat/flow/proposals";
import { publishFlow } from "@/lib/chat/flow/publish";

/**
 * The builder's side of the flow.
 *
 * Every action starts with `requireAdmin()`, as the rest of the admin does —
 * these change what the chatbot says to the public, which is a larger blast
 * radius than most of what is behind this login.
 */

export interface SaveResult {
  findings: Finding[];
  canPublish: boolean;
}

/**
 * Saves the draft and reports what is wrong with it.
 *
 * Saving is deliberately allowed while the flow is broken. A half-wired node is
 * a normal state to be in halfway through a change, and an editor that refuses
 * to save until everything is correct is an editor people keep in a second
 * window instead.
 */
export async function saveFlowDraft(json: string): Promise<SaveResult> {
  await requireAdmin();

  const doc = flowDoc.parse(JSON.parse(json));
  await saveDraft(doc);

  const findings = lintFlow(doc);
  revalidatePath("/admin/flow");
  return { findings, canPublish: publishable(findings) };
}

/**
 * Publishes what is on screen.
 *
 * Errors block it, because this is where a broken graph starts answering
 * visitors. Returns the findings instead of throwing, so the editor can point
 * at the nodes rather than showing a stack trace.
 */
export async function publishCurrentDraft(
  json: string,
  note: string,
): Promise<{ version: number; embedded: number; total: number } | { findings: Finding[] }> {
  await requireAdmin();

  const doc = flowDoc.parse(JSON.parse(json));
  const findings = lintFlow(doc);
  if (!publishable(findings)) return { findings };

  // Saved first, so what is published is exactly what is on screen rather than
  // whatever the last autosave happened to catch.
  await saveDraft(doc);
  const published = await publishFlow(doc, note.trim() || null);

  revalidatePath("/admin/flow");
  return {
    version: published.version.version,
    embedded: published.embedded,
    total: published.total,
  };
}

/** Reverting is the same write as publishing: move the pointer. That is what
 *  makes it safe enough to do without ceremony. */
export async function revertToVersion(versionId: string): Promise<void> {
  await requireAdmin();
  await setLiveVersion(versionId);
  revalidatePath("/admin/flow");
}

/* ── Proposals ────────────────────────────────────────────────────────────── */

/**
 * Applies a suggestion to the draft.
 *
 * To the draft, never to what is live: approving here says "this is worth
 * trying", and publishing is still a separate, deliberate act. The lint runs
 * afterwards so an author sees immediately if the change left the flow in a
 * state that cannot ship.
 */
export async function approveProposal(id: string): Promise<SaveResult> {
  await requireAdmin();

  const proposal = await getProposal(id);
  if (!proposal) throw new Error("that suggestion is no longer there");
  if (!proposal.patch) throw new Error("this one is a gap to write, not a change to apply");

  const draft = await loadDraft();
  if (!draft) throw new Error("there is no flow to change");

  const updated = applyPatch(draft.flow.doc, proposal.patch);
  await saveDraft(updated);
  await decideProposal(id, "applied");

  const findings = lintFlow(updated);
  revalidatePath("/admin/flow");
  revalidatePath("/admin/flow/proposals");
  return { findings, canPublish: publishable(findings) };
}

/** Recorded, because a rejection is what stops the same suggestion arriving
 *  again tomorrow night. */
export async function rejectProposal(id: string): Promise<void> {
  await requireAdmin();
  await decideProposal(id, "rejected");
  revalidatePath("/admin/flow/proposals");
}
