/**
 * The part of a flow that belongs to one service.
 *
 * Pure, and out here rather than in the builder, because "which boxes are this
 * service's conversation?" is a question about the graph rather than about
 * drawing it — the same question the improver will ask when it reports which
 * service people abandon on.
 */

import type { FlowDoc, FlowNode } from "./schema";

/**
 * The boxes that make up one service's conversation.
 *
 * Forty-two boxes is past the point where "show me what happens for visa
 * processing" can be answered by looking. So: start from the boxes that belong
 * to the service, follow every arrow forward to wherever they lead, and add one
 * hop backwards so you can also see how people arrive.
 *
 * Two limits, both learned by trying it without them. Backwards stops at one
 * hop, because everything upstream is eventually the whole flow. And forward
 * stops at another service's boxes: they are *shown*, so the link between
 * services is visible, but not walked through — otherwise asking for
 * attestation, which links to a visa answer, returns the entire visa
 * qualification and most of the graph with it.
 */
/**
 * The service a box belongs to, if it names one.
 *
 * Three node kinds carry a service and the rest are plumbing — a branch or an
 * end belongs to whichever conversation reached it, which is a question about
 * paths rather than about the box.
 */
function serviceOf(node: FlowNode): string | null {
  return node.kind === "say" || node.kind === "handoff"
    ? node.serviceSlug
    : node.kind === "qualify"
      ? node.serviceId
      : null;
}

/**
 * Every service that actually has boxes in this flow.
 *
 * The builder opens on one service rather than on all 1,588 boxes, and this is
 * how it picks one worth opening: a service listed in `lib/services.ts` but not
 * yet written about would otherwise open an empty canvas on a flow that is not
 * empty at all.
 */
export function servicesInFlow(doc: FlowDoc): Set<string> {
  const found = new Set<string>();
  for (const node of doc.nodes) {
    const service = serviceOf(node);
    if (service) found.add(service);
  }
  return found;
}

export function subgraphFor(doc: FlowDoc, serviceId: string): Set<string> {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const seeds = doc.nodes.filter((n) => serviceOf(n) === serviceId).map((n) => n.id);
  const visible = new Set<string>(seeds);

  const queue = [...seeds];
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const edge of doc.edges) {
      if (edge.from !== id || visible.has(edge.to)) continue;
      visible.add(edge.to);

      // Shown, but the walk stops here: this box is where another service's
      // conversation begins, and that conversation is its own view.
      const target = byId.get(edge.to);
      const owner = target ? serviceOf(target) : null;
      if (owner === null || owner === serviceId) queue.push(edge.to);
    }
  }

  // One hop back, so the arrows that lead in are visible with their labels.
  for (const edge of doc.edges) {
    if (seeds.includes(edge.to)) visible.add(edge.from);
  }

  // Always, even when nothing leads from it here: it is where every
  // conversation begins, and a flow drawn without it reads as unreachable.
  const start = doc.nodes.find((n) => n.kind === "start");
  if (start) visible.add(start.id);

  return visible;
}
