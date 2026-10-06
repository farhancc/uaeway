import { requireAdmin } from "@/lib/admin/auth";
import { flowDoc, type FlowDoc } from "@/lib/chat/flow/schema";
import { listVersions, loadDraft } from "@/lib/chat/flow/store";
import { SERVICES } from "@/lib/services";
import { FlowEditor } from "./FlowEditor";

export const metadata = { title: "Flow" };

/**
 * The conversation, as boxes and arrows.
 *
 * Shows the draft, never the live version: publishing is a separate, deliberate
 * act, so nothing typed here reaches a visitor until someone says so.
 */

/** What a brand-new install opens on. Small enough to read in one look, and
 *  already valid — including the fallback, which is the one thing a flow is
 *  useless without. */
const STARTER: FlowDoc = flowDoc.parse({
  nodes: [
    { kind: "start", id: "start", position: { x: 0, y: 120 } },
    { kind: "model", id: "fallback", position: { x: 360, y: 120 }, guidance: "" },
  ],
  edges: [{ id: "e-fallback", from: "start", to: "fallback", when: { kind: "fallback" }, position: 999 }],
  intents: [],
  slots: [],
});

export default async function FlowPage() {
  await requireAdmin();

  const [draft, versions] = await Promise.all([loadDraft(), listVersions()]);

  return (
    <FlowEditor
      initial={draft?.flow.doc ?? STARTER}
      versions={versions.map((v) => ({
        id: v.id,
        version: v.version,
        note: v.note,
        // Serialised here rather than in the client: a Date crossing the
        // boundary arrives as a string anyway, and saying so keeps the prop
        // type honest.
        publishedAt: v.publishedAt?.toISOString() ?? null,
        live: v.live,
      }))}
      services={SERVICES.map((s) => ({ slug: s.slug, name: s.shortName }))}
    />
  );
}
