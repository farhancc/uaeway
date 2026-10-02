"use client";

import { useCallback, useRef, useState } from "react";
import {
  EdgeLabelRenderer,
  getSmoothStepPath,
  useStore,
  type EdgeProps,
} from "@xyflow/react";

/**
 * An arrow that stops rather than crossing the canvas.
 *
 * Drawn in full, a graph this shape becomes a knot: forty arrows leave one box,
 * every one of them travels the width of the diagram, and by the middle nothing
 * can be followed. So a long arrow is not drawn. It leaves its box as a short
 * stub tagged with the number of the box it lands on, and reappears at that box
 * as a stub tagged with the number it came from, carrying the question that
 * takes you along it.
 *
 * This is how large schematics have always handled it — a wire that would cross
 * the sheet is terminated with a tag, and the matching tag appears at the
 * destination. You trade seeing the line for being able to read it.
 *
 * Short arrows are still drawn through, because a line between neighbours is
 * worth more than a pair of tags and cannot get lost.
 */

/** Past this far apart, a line would be travelling far enough to cross things.
 *  The migration lays boxes out 360px apart, so neighbours stay connected. */
const DIRECT_REACH_X = 380;
const DIRECT_REACH_Y = 220;

/** How far a stub runs before its tag. */
const SPUR = 24;
/** Vertical gap between the stubs sharing one box's edge. */
const LANE = 20;

export interface ConnectorEdgeData {
  /** What the arrow is taken on, e.g. "◆ attestation". */
  text: string;
  colour: string;
  /** Position among the arrows leaving the source, and entering the target. */
  outLane: number;
  outOf: number;
  inLane: number;
  inOf: number;
  sourceId: string;
  targetId: string;
  sourceNumber: number;
  targetNumber: number;
  /** Selects a box and brings it into view. A tag is only useful if following
   *  it does not mean hunting for the number by hand. */
  onJump: (nodeId: string) => void;
  onSelect: () => void;
  dimmed: boolean;
  labelOffset: { x: number; y: number };
  tagOffset: { x: number; y: number };
  onMoveLabel: (id: string, dx: number, dy: number, which: "label" | "tag") => void;
  [key: string]: unknown;
}

/** Stubs sharing an edge of a box are spread around the handle rather than
 *  stacked on it. */
function spread(lane: number, of: number): number {
  return (lane - (of - 1) / 2) * LANE;
}

export function ConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const edge = data as unknown as ConnectorEdgeData;
  const zoom = useStore((s) => s.transform[2]);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);

  /**
   * How far this tag has been dragged, before anyone else is told.
   *
   * Local on purpose. Writing the offset into the document on every frame
   * rebuilt every arrow sixty times a second, and with a topic filter on it
   * also rebuilt the visible set — which replaced this very component mid-drag
   * and left the pointer captured by something that no longer existed. That is
   * why dragging a label only worked with the whole flow showing.
   *
   * The document learns the whole movement once, on release.
   */
  const nudging = useRef<{ which: "label" | "tag"; x: number; y: number } | null>(null);
  const [nudge, setNudge] = useState<{ which: "label" | "tag"; x: number; y: number } | null>(null);

  /**
   * A tag is both draggable and clickable, so a press has to be read as one or
   * the other. Under a few pixels of travel it was a click — which is the slop
   * a hand resting on a trackpad needs.
   */
  const CLICK_SLOP = 4;

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, moved: 0 };
  }, []);

  const onPointerMove = useCallback(
    (which: "label" | "tag") => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;

      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        moved: drag.current.moved + Math.abs(dx) + Math.abs(dy),
      };

      // Screen pixels into canvas units, or a label would drift faster than the
      // cursor at any zoom but 100%.
      const from = nudging.current?.which === which ? nudging.current : { x: 0, y: 0 };
      nudging.current = { which, x: from.x + dx / zoom, y: from.y + dy / zoom };
      setNudge(nudging.current);
    },
    [zoom],
  );

  const release = useCallback(
    (onClick: () => void) => (event: React.PointerEvent<HTMLDivElement>) => {
      const travelled = drag.current?.moved ?? 0;
      const moved = nudging.current;
      drag.current = null;
      nudging.current = null;
      setNudge(null);

      if (moved) edge.onMoveLabel(id, moved.x, moved.y, moved.which);
      if (travelled < CLICK_SLOP) {
        event.stopPropagation();
        onClick();
      }
    },
    [edge, id],
  );

  const shift = (which: "label" | "tag") =>
    nudge?.which === which ? nudge : { x: 0, y: 0 };

  const opacity = edge.dimmed ? 0.18 : 1;
  const near =
    Math.abs(targetX - sourceX) < DIRECT_REACH_X && Math.abs(targetY - sourceY) < DIRECT_REACH_Y;

  const label = (
    x: number,
    y: number,
    body: React.ReactNode,
    anchor: string,
    onClick: () => void,
    hint: string,
    which: "label" | "tag",
  ) => (
    <div
      className="nodrag nopan absolute flex cursor-move items-center gap-1 rounded border bg-white px-1 py-0.5 text-[10px] font-semibold leading-tight shadow-sm"
      style={{
        // Already positioned by the caller: the line is drawn to meet it, so
        // the offset must not be applied twice.
        transform: `${anchor} translate(${x}px, ${y}px)`,
        color: edge.colour,
        borderColor: edge.colour,
        opacity,
        pointerEvents: edge.dimmed ? "none" : "all",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove(which)}
      onPointerUp={release(onClick)}
      title={hint}
    >
      {body}
    </div>
  );

  const badge = (n: number) => (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold tabular-nums text-white"
      style={{ backgroundColor: edge.colour }}
    >
      {n}
    </span>
  );

  if (near) {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
      offset: 12 + (edge.outLane % 5) * 14,
    });

    const atX = labelX + edge.labelOffset.x + shift("label").x;
    const atY = labelY + edge.labelOffset.y + shift("label").y;
    const moved = edge.labelOffset.x !== 0 || edge.labelOffset.y !== 0;

    return (
      <>
        <path d={path} className="react-flow__edge-path" style={{ ...style, opacity }} fill="none" markerEnd={markerEnd} />
        {/* A leader back to the line, so a label dragged clear of a crowded
            corner still says which arrow it belongs to. */}
        {moved && (
          <path
            d={`M ${labelX},${labelY} L ${atX},${atY}`}
            fill="none"
            stroke={edge.colour}
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{ opacity: opacity * 0.7 }}
          />
        )}
        <EdgeLabelRenderer>
          {label(
            atX,
            atY,
            <span>{edge.text}</span>,
            "translate(-50%, -50%)",
            edge.onSelect,
            "Click to edit this arrow · drag to move the label",
            "label",
          )}
        </EdgeLabelRenderer>
      </>
    );
  }

  // Where each tag actually sits, offset included. The stubs are then drawn to
  // meet them, so dragging a tag extends its line rather than leaving it
  // floating next to one that stopped where the tag used to be.
  const tagX = sourceX + SPUR + 18 + edge.tagOffset.x + shift("tag").x;
  const tagY = sourceY + spread(edge.outLane, edge.outOf) + edge.tagOffset.y + shift("tag").y;

  const labX = targetX - SPUR - 18 + edge.labelOffset.x + shift("label").x;
  const labY = targetY + spread(edge.inLane, edge.inOf) + edge.labelOffset.y + shift("label").y;

  // Out of the handle, across to the tag's row, then along to the tag.
  const outPath = `M ${sourceX},${sourceY} L ${sourceX + SPUR},${sourceY} L ${sourceX + SPUR},${tagY} L ${tagX},${tagY}`;
  // From the label, back to the handle's column, then into the handle.
  const inPath = `M ${labX},${labY} L ${targetX - SPUR},${labY} L ${targetX - SPUR},${targetY} L ${targetX},${targetY}`;

  return (
    <>
      <path d={outPath} className="react-flow__edge-path" style={{ ...style, opacity }} fill="none" />
      <path d={inPath} className="react-flow__edge-path" style={{ ...style, opacity }} fill="none" markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {/* Leaving: where this goes. */}
        {label(
          tagX,
          tagY,
          <>
            <span className="opacity-60">to</span>
            {badge(edge.targetNumber)}
          </>,
          "translate(0, -50%)",
          () => edge.onJump(edge.targetId),
          `Click to jump to box ${edge.targetNumber} · drag to move the tag`,
          "tag",
        )}
        {/* Arriving: where it came from, and what takes you along it. */}
        {label(
          labX,
          labY,
          <>
            {badge(edge.sourceNumber)}
            <span>{edge.text}</span>
          </>,
          "translate(-100%, -50%)",
          () => edge.onJump(edge.sourceId),
          `Click to jump back to box ${edge.sourceNumber} · drag to move the label`,
          "label",
        )}
      </EdgeLabelRenderer>
    </>
  );
}
