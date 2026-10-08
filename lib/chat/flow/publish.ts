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
 *
 * **The subject packs are embedded here too, and they are most of the work.**
 * The main document is the nine doors and the eight merged packs; behind those
 * doors sit several hundred more entries in their own documents, and a pack
 * published without vectors matches on its authors' keyword groups alone. That
 * is a silent degradation rather than a failure — the pack still answers, just
 * worse, and only for the visitors who reach it — so it would not show up
 * anywhere except in the quality of the replies.
 */

import { embedFlow } from "./vectors";
import { draftId, loadSubjectDocs, publishDraft, type FlowVersionSummary } from "./store";
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
  let total = 0;
  let embedded = 0;

  // The packs first, because they are the larger half and because a partial
  // embedding should favour the content nobody has vectors for yet. The store
  // is content-addressed, so a re-publish of unchanged wording costs nothing.
  // Found rather than passed in: this is about to publish "the draft", so the
  // caller should not have to know its id to get its packs embedded.
  const id = await draftId();
  const packs = id ? await loadSubjectDocs(id) : [];
  for (const pack of [...packs.map((p) => p.doc), doc]) {
    const counted = await embedFlow(pack);
    total += counted.total;
    embedded += counted.embedded;
  }

  if (embedded < total) {
    console.warn(`[flow] published with ${embedded}/${total} phrases embedded`);
  }

  return { version: await publishDraft(note), embedded, total };
}
