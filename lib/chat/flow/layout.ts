/**
 * Arranging the boxes so the diagram can be read.
 *
 * What to optimise here was not obvious, and guessing it wrong made things
 * worse. Measured on the real flow: of ninety-five arrows, **forty-one leave
 * the start box**, and no arrangement can shorten those — everything is
 * reachable from the start, and the start can only be next to so much. They are
 * always going to be connector tags.
 *
 * So the thing worth shortening is the other fifty-four: the follow-ups and
 * choices *within* a service, which are the arrows that carry the shape of a
 * conversation. Laying boxes out by their distance from the start — the obvious
 * thing, and the first thing tried — scattered each service across the diagram
 * and took those from 23 long to 33. Keeping a service's boxes together is what
 * actually helps.
 *
 * Hence: one block per service, the start box on its own, and the boxes that
 * belong to no service at the end. Wide blocks wrap rather than growing a
 * column taller than the screen.
 *
 * Pure, and out here rather than in the builder, so the rule can be measured
 * without a canvas.
 */

import type { FlowDoc, FlowNode } from "./schema";

/** Matched to the box the builder draws, plus room for the connector tags. */
const COLUMN = 340;
const ROW = 150;

/**
 * How tall a block may get before it wraps into another column.
 *
 * A block taller than the screen is a block you scroll rather than read, and
 * the first attempt produced a column 4,800px tall.
 */
const MAX_ROWS = 7;

export function arrange(doc: FlowDoc): FlowDoc {
  const start = doc.nodes.find((n) => n.kind === "start");
  if (!start) return doc;

  const serviceOf = (node: FlowNode): string =>
    node.kind === "say" || node.kind === "handoff"
      ? (node.serviceSlug ?? "")
      : node.kind === "qualify"
        ? node.serviceId
        : "";

  const outgoing = new Map<string, string[]>();
  for (const edge of doc.edges) {
    const list = outgoing.get(edge.from);
    if (list) list.push(edge.to);
    else outgoing.set(edge.from, [edge.to]);
  }

  const blocks = new Map<string, string[]>();
  for (const node of doc.nodes) {
    if (node.kind === "start") continue;
    const key = serviceOf(node);
    const list = blocks.get(key);
    if (list) list.push(node.id);
    else blocks.set(key, [node.id]);
  }

  /**
   * Within a block, walk the chains.
   *
   * An answer that leads to a question that leads to a handoff should be three
   * boxes in a row, because then those two arrows are one row apart and get
   * drawn rather than tagged. Sorting by anything else — position, name —
   * leaves them scattered through the column.
   */
  const chained = (ids: string[]): string[] => {
    const members = new Set(ids);
    const seen = new Set<string>();
    const out: string[] = [];

    const walk = (id: string) => {
      if (seen.has(id) || !members.has(id)) return;
      seen.add(id);
      out.push(id);
      for (const to of outgoing.get(id) ?? []) walk(to);
    };

    // Start from the boxes nothing else in the block leads to: those are where
    // this service's conversations begin.
    const entered = new Set(
      ids.flatMap((id) => (outgoing.get(id) ?? []).filter((to) => members.has(to))),
    );
    for (const id of ids) if (!entered.has(id)) walk(id);
    for (const id of ids) walk(id);
    return out;
  };

  const placed = new Map<string, { x: number; y: number }>();
  let column = 0;

  // The start box alone, centred, so the arrows leaving it all begin in one
  // recognisable place.
  placed.set(start.id, { x: 0, y: 0 });
  column = 1;

  // Named services first in a stable order, then whatever belongs to none.
  const order = [...blocks.keys()].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  for (const key of order) {
    const ids = chained(blocks.get(key)!);
    const columns = Math.ceil(ids.length / MAX_ROWS) || 1;
    const rows = Math.ceil(ids.length / columns);

    ids.forEach((id, i) => {
      const sub = Math.floor(i / rows);
      const row = i % rows;
      // Centred on the start box's axis, so a short block does not read as
      // things that happen early.
      placed.set(id, { x: (column + sub) * COLUMN, y: (row - (rows - 1) / 2) * ROW });
    });

    column += columns;
  }

  return {
    ...doc,
    nodes: doc.nodes.map((node) => ({
      ...node,
      position: placed.get(node.id) ?? node.position,
    })),
  };
}
