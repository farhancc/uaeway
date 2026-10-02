/**
 * Publishing, with the vectors the published flow will need.
 *
 * Separate from `./store.ts` so storage stays storage: this is the one place
 * that knows publishing has a cost beyond a write, and the one place that
 * decides what happens when that cost cannot be paid.
 *
 * Embedding first, then publishing, is the order that matters. A flow that goes
 * live before its phrases are embedded matches on keywords for as long as the
 * embedding takes — which is the moment an author is watching to see whether
 * their change worked.
 */

import { embedFlow } from "./vectors";
import { publishDraft, type FlowVersionSummary } from "./store";
import type { FlowDoc } from "./schema";

export interface Published {
  version: FlowVersionSummary;
  /** How many of the flow's phrases have vectors. Short of `total` means the
   *  rest match on their keywords until someone publishes again. */
  embedded: number;
  total: number;
}

export async function publishFlow(doc: FlowDoc, note: string | null): Promise<Published> {
  // Never fatal. An embedding outage must not stop someone shipping a fix to
  // what the chatbot says — the flow still works, it just matches the way it
  // did before phase two.
  const { total, embedded } = await embedFlow(doc);
  if (embedded < total) {
    console.warn(`[flow] published with ${embedded}/${total} phrases embedded`);
  }

  return { version: await publishDraft(note), embedded, total };
}
