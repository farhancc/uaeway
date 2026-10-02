"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { lintFlow, type Finding } from "@/lib/chat/flow/lint";
import { subgraphFor } from "@/lib/chat/flow/subgraph";
import { arrange } from "@/lib/chat/flow/layout";
import type { EdgeCondition, FlowDoc, FlowNode, NodeKind } from "@/lib/chat/flow/schema";
import { publishCurrentDraft, revertToVersion, saveFlowDraft } from "./actions";
import { Inspector, type Selection } from "./Inspector";
import { ConnectorEdge } from "./ConnectorEdge";

/**
 * The conversation, as boxes and arrows.
 *
 * It is an editor over `FlowDoc` and nothing else: every drag, every new arrow
 * and every keystroke in the panel produces a document that `flowDoc.parse()`
 * would accept, and saving is just posting it. That is why there is no separate
 * canvas format to keep in step with the runtime — the picture *is* the graph
 * the chatbot walks.
 *
 * Linting runs on every change rather than on save, because the findings are
 * most useful while you still remember what you were doing.
 */

interface Version {
  id: string;
  version: number;
  note: string | null;
  publishedAt: string | null;
  live: boolean;
}

/** Each kind gets its own colour and its own shape of label, so the graph can
 *  be read at zoom levels where none of the text is legible. */
const STYLES: Record<NodeKind, { ring: string; chip: string; tint: string; dot: string }> = {
  start: { ring: "border-emerald-600", chip: "bg-emerald-600", tint: "bg-emerald-50", dot: "#059669" },
  say: { ring: "border-ink", chip: "bg-ink", tint: "bg-white", dot: "#0f172a" },
  ask: { ring: "border-amber-600", chip: "bg-amber-600", tint: "bg-amber-50", dot: "#d97706" },
  qualify: { ring: "border-indigo-600", chip: "bg-indigo-600", tint: "bg-indigo-50", dot: "#4f46e5" },
  branch: { ring: "border-slate-500", chip: "bg-slate-500", tint: "bg-slate-50", dot: "#64748b" },
  model: { ring: "border-violet-600", chip: "bg-violet-600", tint: "bg-violet-50", dot: "#7c3aed" },
  handoff: { ring: "border-rose-600", chip: "bg-rose-600", tint: "bg-rose-50", dot: "#e11d48" },
  end: { ring: "border-slate-400", chip: "bg-slate-400", tint: "bg-slate-50", dot: "#94a3b8" },
};

/**
 * Colours for telling one arrow from the next.
 *
 * Colour carries *identity*, not category, and that is a deliberate swap. Forty
 * of the ninety-five arrows leave the start box alone; painting them all one
 * colour because they are all "a topic" made a single teal smear. What a reader
 * needs there is to tell arrow from arrow, so the palette rotates within each
 * bundle — every arrow leaving a box differs from its siblings, and reuse only
 * happens between boxes far enough apart not to be confused.
 *
 * Chosen for contrast against each other and against a paper background, and
 * spaced around the wheel rather than run through it, so neighbours in the
 * rotation are never neighbours in hue.
 */
const EDGE_PALETTE = [
  "#0f766e", // teal
  "#b45309", // amber
  "#4338ca", // indigo
  "#be123c", // rose
  "#15803d", // green
  "#7c2d92", // purple
  "#0369a1", // sky
  "#a16207", // ochre
  "#9f1239", // crimson
  "#166534", // forest
  "#5b21b6", // violet
  "#c2410c", // orange
];

/** The safety net rather than the path, so it is grey whatever lane it is in
 *  and recedes behind everything deliberate. */
const FALLBACK_STROKE = "#94a3b8";

/**
 * What kind of arrow this is, said in the label.
 *
 * Because colour is identity now, the kind has to be readable without it — and
 * had to be anyway, for anyone who cannot tell teal from forest.
 */
function edgeLabel(when: EdgeCondition, topicName: (id: string) => string): string {
  switch (when.kind) {
    case "intent":
      return `◆ ${topicName(when.intentId)}`;
    case "choice":
      return `▸ ${when.label}`;
    case "slot":
      return `⇢ ${when.slot} ${when.op}${when.value ? ` ${when.value}` : ""}`;
    case "always":
      return "→ straight on";
    case "fallback":
      return "⤵ nothing else matched";
  }
}

/** One line of what the box does/** One line of what the box does, for reading the canvas without opening
 *  anything. */
function preview(node: FlowNode): string {
  switch (node.kind) {
    case "say":
    case "ask":
    case "handoff":
      return node.text;
    case "qualify":
      return `Ask for everything ${node.serviceId} needs`;
    case "model":
      return node.guidance || "Answer from published content";
    case "start":
      return "Every conversation begins here";
    case "branch":
      return "Route on what we already know";
    case "end":
      return "Stop";
  }
}

function FlowBox({ data, selected }: NodeProps) {
  const { node, number } = data as { node: FlowNode; number: number };
  const style = STYLES[node.kind];

  return (
    <div
      className={`w-60 rounded-md border-2 ${style.ring} ${style.tint} ${
        selected ? "ring-2 ring-offset-2 ring-ink" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-ink" />
      <div className="flex items-center gap-2 px-2 pt-2">
        {/* The number every arrowhead pointing here shows. */}
        <span className="rounded-full border-2 border-current px-1.5 text-[11px] font-bold tabular-nums text-ink">
          {number}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${style.chip}`}>
          {node.kind}
        </span>
        {node.kind === "say" && node.serviceSlug && (
          <span className="truncate text-[10px] text-ink-faint">{node.serviceSlug}</span>
        )}
      </div>
      <p className="line-clamp-3 px-2 pb-2 pt-1 text-xs leading-snug text-ink">{preview(node)}</p>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-ink" />
    </div>
  );
}

const nodeTypes = { flowBox: FlowBox };
const edgeTypes = { connector: ConnectorEdge };

/** Defaults that make a new box immediately valid, so adding one never breaks
 *  the document you are in the middle of editing. */
function blankNode(kind: NodeKind, id: string, serviceId: string): FlowNode {
  const position = { x: 40, y: 40 };
  switch (kind) {
    case "say":
      return { kind, id, position, text: "New answer.", serviceSlug: null, faqQuestion: null };
    case "ask":
      return { kind, id, position, text: "What would you like to know?", slot: "" };
    case "qualify":
      return { kind, id, position, serviceId };
    case "model":
      return { kind, id, position, guidance: "" };
    case "handoff":
      return { kind, id, position, text: "Shall we have someone call you?", reason: "requested", serviceSlug: null };
    default:
      return { kind: kind === "branch" ? "branch" : "end", id, position };
  }
}

interface EditorProps {
  initial: FlowDoc;
  versions: Version[];
  services: { slug: string; name: string }[];
}

/** The provider is what lets the editor move the viewport — which is what makes
 *  a connector tag something you can click rather than something you read and
 *  then go hunting for. */
export function FlowEditor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}

function Editor({ initial, versions, services }: EditorProps) {
  const { setCenter, getZoom, fitView } = useReactFlow();
  const [doc, setDoc] = useState<FlowDoc>(initial);
  const [selection, setSelection] = useState<Selection | null>(null);
  /** The service whose conversation is being looked at, or null for all of it. */
  const [topic, setTopic] = useState<string | null>(null);

  const dragging = useRef(false);

  /**
   * Where the boxes are while a drag is happening.
   *
   * Held here rather than written into the document on every frame, and that is
   * the whole fix for the stutter: a new `doc` per frame meant re-linting the
   * graph, renumbering the boxes and rebuilding the data for all forty-two
   * boxes and ninety-five arrows — sixty times a second, to move one box.
   *
   * The document learns the new position once, when the drag ends. React Flow
   * repositions the arrows itself in the meantime, which is what it is for.
   */
  const dragged = useRef<Record<string, { x: number; y: number }>>({});
  /** The same positions, in state, because rendering may not read a ref. */
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});

  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const findings = useMemo<Finding[]>(() => {
    try {
      return lintFlow(doc);
    } catch (err) {
      return [{ severity: "error", message: (err as Error).message }];
    }
  }, [doc]);

  // The document as it was, kept in a ref so `edit` can snapshot it without
  // depending on the current render.
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const history = useRef<FlowDoc[]>([]);
  const lastSnapshot = useRef(0);
  const [canUndo, setCanUndo] = useState(false);

  /**
   * Snapshots before a change, coalescing rapid ones.
   *
   * Without the window, typing a sentence into the inspector would be forty
   * undo steps and dragging a label would be a hundred — an undo stack you
   * cannot get out of is worse than none. With it, a burst of editing is one
   * step, which is what people mean by "undo that".
   */
  const snapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastSnapshot.current < 600) return;
    lastSnapshot.current = now;
    history.current.push(docRef.current);
    if (history.current.length > 60) history.current.shift();
    setCanUndo(true);
  }, []);

  const edit = useCallback(
    (next: FlowDoc) => {
      snapshot();
      setDoc(next);
      setDirty(true);
    },
    [snapshot],
  );

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    setDoc(previous);
    setDirty(true);
    setSelection(null);
    setCanUndo(history.current.length > 0);
  }, []);

  /** Selects a box and brings it into view — what a connector tag does when you
   *  click it, and what the search box does. */
  const jumpTo = useCallback(
    (nodeId: string) => {
      const node = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setSelection({ kind: "node", id: nodeId });
      // Offset to the box's middle rather than its corner.
      setCenter(node.position.x + 120, node.position.y + 50, { zoom: getZoom(), duration: 400 });
    },
    [setCenter, getZoom],
  );

  // Safe to key on the whole document now: dragging a box or a label no longer
  // replaces it on every frame, which is what used to make this recompute —
  // and a new Set here replaced every edge component mid-drag, which is why
  // dragging a label only worked with no topic filter on.
  const visible = useMemo(() => (topic ? subgraphFor(doc, topic) : null), [doc, topic]);

  /** Dragging a label nudges it and nothing else — the arrow itself does not
   *  move, because where it starts and ends is the graph rather than a choice. */
  const moveLabel = useCallback(
    (id: string, dx: number, dy: number, which: "label" | "tag") => {
      const key = which === "tag" ? "tagOffset" : "labelOffset";
      setDoc((current) => ({
        ...current,
        edges: current.edges.map((e) =>
          e.id === id ? { ...e, [key]: { x: e[key].x + dx, y: e[key].y + dy } } : e,
        ),
      }));
      setDirty(true);
    },
    [],
  );

  /**
   * A number per box, in the order they were created.
   *
   * A display aid, never an identity — nothing is stored against it and the ids
   * stay what they were. Creation order rather than position, because numbers
   * that reshuffle every time you drag a box are worse than no numbers; the
   * cost is that deleting a box renumbers the ones after it.
   */
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    doc.nodes.forEach((node, i) => map.set(node.id, i + 1));
    return map;
  }, [doc.nodes]);

  /**
   * The props each box gets, built once per document rather than once per
   * frame.
   *
   * Identity is the point: React Flow skips a node whose `data` is the same
   * object it had last time, so a stable map here is the difference between
   * re-rendering one box during a drag and re-rendering all of them.
   */
  const nodeData = useMemo(
    () =>
      new Map(
        doc.nodes.map((node) => [node.id, { node, number: numbers.get(node.id) ?? 0 }] as const),
      ),
    [doc.nodes, numbers],
  );

  const rfNodes = useMemo(
    () =>
      doc.nodes
        .filter((node) => !visible || visible.has(node.id))
        .map((node) => ({
          id: node.id,
          type: "flowBox",
          position: dragPositions[node.id] ?? node.position,
          data: nodeData.get(node.id)!,
          selected: selection?.kind === "node" && selection.id === node.id,
        })),
    // `dragPositions` is what brings a drag's frames in; the rest only change
    // when the document does.
    [doc.nodes, selection, visible, nodeData, dragPositions],
  );

  const rfEdges = useMemo(() => {
    // Arrows in and out of the selected box are drawn heavier, so "what leads
    // here and where does it go" is answerable by clicking rather than by
    // tracing.
    const focus = selection?.kind === "node" ? selection.id : null;
    const topicName = (id: string) => doc.intents.find((i) => i.id === id)?.name ?? "topic";

    // Position within the bundle leaving each box. Taken in the author's own
    // edge order so a lane is stable across renders — a line that changes
    // colour when you drag something is worse than one you cannot follow.
    // Where each arrow sits among those leaving its box, and among those
    // arriving at the box it lands on. Both are needed: stubs are spread around
    // a handle, and a handle has two sides.
    const out = new Map<string, number>();
    const into = new Map<string, number>();
    const outOf = new Map<string, number>();
    const inOf = new Map<string, number>();

    const drawn = doc.edges.filter((e) => !visible || (visible.has(e.from) && visible.has(e.to)));
    for (const edge of drawn) {
      outOf.set(edge.from, (outOf.get(edge.from) ?? 0) + 1);
      inOf.set(edge.to, (inOf.get(edge.to) ?? 0) + 1);
    }

    const takenOut = new Map<string, number>();
    const takenIn = new Map<string, number>();
    // Author order, so a lane is stable across renders: a line that changes
    // colour or jumps lane when you drag something is worse than one you
    // cannot follow.
    for (const edge of [...drawn].sort((a, b) => a.position - b.position)) {
      const o = takenOut.get(edge.from) ?? 0;
      out.set(edge.id, o);
      takenOut.set(edge.from, o + 1);

      const i = takenIn.get(edge.to) ?? 0;
      into.set(edge.id, i);
      takenIn.set(edge.to, i + 1);
    }

    return drawn.map((edge) => {
      const when = edge.when;
      const lane = out.get(edge.id) ?? 0;
      const stroke =
        when.kind === "fallback" ? FALLBACK_STROKE : EDGE_PALETTE[lane % EDGE_PALETTE.length];

      const near = focus !== null && (edge.from === focus || edge.to === focus);
      const selected = selection?.kind === "edge" && selection.id === edge.id;

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "connector" as const,
        data: {
          text: edgeLabel(when, topicName),
          colour: stroke,
          outLane: lane,
          outOf: outOf.get(edge.from) ?? 1,
          inLane: into.get(edge.id) ?? 0,
          inOf: inOf.get(edge.to) ?? 1,
          sourceId: edge.from,
          targetId: edge.to,
          sourceNumber: numbers.get(edge.from) ?? 0,
          targetNumber: numbers.get(edge.to) ?? 0,
          onJump: jumpTo,
          onSelect: () => setSelection({ kind: "edge", id: edge.id }),
          dimmed: focus !== null && !near,
          labelOffset: edge.labelOffset,
          tagOffset: edge.tagOffset,
          onMoveLabel: moveLabel,
        },
        style: {
          stroke,
          strokeWidth: selected ? 3 : near ? 2.5 : 1.5,
          strokeDasharray: when.kind === "fallback" ? "6 4" : undefined,
          // Everything unrelated to the selected box recedes rather than
          // disappearing: the shape of the whole flow is still worth seeing.
          opacity: focus !== null && !near ? 0.2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: stroke },
        selected,
      };
    });
  }, [doc.edges, doc.intents, selection, visible, numbers, moveLabel, jumpTo]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      let moved = false;
      let ending = false;

      for (const change of changes) {
        if (change.type !== "position" || !change.position) continue;

        // One snapshot per drag, taken as it starts: the alternative is a
        // history entry per animation frame.
        if (change.dragging === true && !dragging.current) {
          dragging.current = true;
          snapshot();
        }
        if (change.dragging === false) ending = true;

        dragged.current[change.id] = change.position;
        moved = true;
      }

      if (!moved) return;

      if (ending) {
        const settled = dragged.current;
        dragged.current = {};
        dragging.current = false;

        setDoc((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            settled[node.id] ? { ...node, position: settled[node.id] } : node,
          ),
        }));
        setDirty(true);
      }

      // Re-render with the new positions. Nothing derived from the document
      // recomputes, because the document has not changed.
      setDragPositions(ending ? {} : { ...dragged.current });
    },
    [snapshot],
  );

  /** A new arrow starts as `always` — the one condition that is never wrong,
   *  only incomplete. You then say what it means in the panel. */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = `e-${crypto.randomUUID().slice(0, 8)}`;
      const outgoing = doc.edges.filter((e) => e.from === connection.source);
      edit({
        ...doc,
        edges: [
          ...doc.edges,
          {
            id,
            from: connection.source,
            to: connection.target,
            when: { kind: "always" },
            position: Math.max(0, ...outgoing.map((e) => e.position)) + 1,
            labelOffset: { x: 0, y: 0 },
            tagOffset: { x: 0, y: 0 },
          },
        ],
      });
      setSelection({ kind: "edge", id });
    },
    [doc, edit],
  );

  const addNode = (kind: NodeKind) => {
    const id = `n-${crypto.randomUUID().slice(0, 8)}`;
    // Offset from whatever is already there, so a new box never lands exactly
    // on top of one you cannot then find.
    const x = Math.max(0, ...doc.nodes.map((n) => n.position.x)) + 320;
    const node = { ...blankNode(kind, id, services[0]?.slug ?? ""), position: { x, y: 80 } };
    edit({ ...doc, nodes: [...doc.nodes, node] });
    // A new box belongs to no service yet, so leaving a topic filter on would
    // drop it somewhere you cannot see.
    setTopic(null);
    setSelection({ kind: "node", id });
  };

  const remove = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "edge") {
      edit({ ...doc, edges: doc.edges.filter((e) => e.id !== selection.id) });
    } else {
      const node = doc.nodes.find((n) => n.id === selection.id);
      // The start node is the one thing a flow cannot be without, and deleting
      // it makes every other box unreachable at once.
      if (node?.kind === "start") {
        setStatus("The start box cannot be deleted.");
        return;
      }
      edit({
        ...doc,
        nodes: doc.nodes.filter((n) => n.id !== selection.id),
        // Arrows into or out of a deleted box would point at nothing, and the
        // document would not parse.
        edges: doc.edges.filter((e) => e.from !== selection.id && e.to !== selection.id),
      });
    }
    setSelection(null);
  }, [doc, edit, selection]);

  const save = useCallback(
    () =>
      start(async () => {
        setStatus(null);
        try {
          await saveFlowDraft(JSON.stringify(doc));
          setDirty(false);
          setStatus("Draft saved.");
        } catch (err) {
          setStatus((err as Error).message);
        }
      }),
    [doc],
  );

  /**
   * The shortcuts a diagram editor is expected to have.
   *
   * Ignored while a field has focus, or Backspace in the answer textarea would
   * delete the box you are writing in — which is the kind of thing you only
   * find by doing it.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const chord = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") setSelection(null);
      else if ((event.key === "Delete" || event.key === "Backspace") && selection) {
        event.preventDefault();
        remove();
      } else if (chord && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (chord && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, remove, undo, save]);

  /** An unsaved draft is a morning's work. The browser's own prompt is the only
   *  one that fires on a closed tab. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const publish = () =>
    start(async () => {
      setStatus(null);
      try {
        const result = await publishCurrentDraft(JSON.stringify(doc), note);
        if ("findings" in result) {
          setStatus("Fix the errors below first.");
          return;
        }
        setDirty(false);
        setNote("");
        setStatus(
          result.embedded < result.total
            ? `Published v${result.version}, but only ${result.embedded}/${result.total} phrases could be embedded — the rest match on keywords until you publish again.`
            : `Published v${result.version}. It is answering visitors now.`,
        );
      } catch (err) {
        setStatus((err as Error).message);
      }
    });

  const errors = findings.filter((f) => f.severity === "error");

  return (
    <div className="flex h-[calc(100vh-3.25rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-field px-4 py-2">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Add</span>
        {(["say", "ask", "qualify", "branch", "model", "handoff", "end"] as NodeKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => addNode(kind)}
            className={`rounded px-2 py-1 text-xs font-medium text-white ${STYLES[kind].chip}`}
          >
            {kind}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            edit(arrange(doc));
            window.requestAnimationFrame(() => fitView({ duration: 400 }));
            setStatus("Tidied — every box is now in the column of its distance from the start.");
          }}
          className="rounded border border-rule px-2 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink"
          title="Lay the boxes out by how far they are from the start"
        >
          Tidy
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded border border-rule px-2 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"
          title="Undo (⌘Z)"
        >
          Undo
        </button>

        {/* Forty-two boxes is past the point where finding one means scrolling. */}
        <input
          list="flow-boxes"
          placeholder="Find a box…"
          className="ml-2 w-44 rounded-md border border-rule px-2 py-1 text-xs"
          onChange={(event) => {
            const match = /^#(\d+)/.exec(event.target.value);
            const node = match ? doc.nodes[Number(match[1]) - 1] : undefined;
            if (node) {
              jumpTo(node.id);
              event.target.value = "";
            }
          }}
        />
        <datalist id="flow-boxes">
          {doc.nodes.map((node, i) => (
            <option key={node.id} value={`#${i + 1} ${node.kind}: ${preview(node).slice(0, 60)}`} />
          ))}
        </datalist>

        <label htmlFor="topic" className="ml-4 text-xs uppercase tracking-wide text-ink-faint">
          Showing
        </label>
        <select
          id="topic"
          value={topic ?? ""}
          onChange={(e) => {
            setTopic(e.target.value || null);
            setSelection(null);
          }}
          className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-ink"
        >
          <option value="">the whole flow</option>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
        {visible && (
          <span className="text-xs text-ink-faint">
            {visible.size} of {doc.nodes.length} boxes
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {status && <span className="text-xs text-ink-soft">{status}</span>}
          {dirty && <span className="text-xs text-amber-700">Unsaved</span>}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded border border-ink px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
          >
            Save draft
          </button>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed?"
            className="w-44 rounded-md border border-rule px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={publish}
            disabled={pending || errors.length > 0}
            className="rounded bg-ink px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            title={errors.length > 0 ? "Fix the errors first" : undefined}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            key={topic ?? "all"}
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            // No `onEdgesChange`: arrows are selected and deleted through the
            // document, so there is no canvas-owned edge state to write back.
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelection({ kind: "node", id: n.id })}
            onEdgeClick={(_, e) => setSelection({ kind: "edge", id: e.id })}
            onPaneClick={() => setSelection(null)}
            fitView
            proOptions={{ hideAttribution: false }}
          >
            <Background />
            <Controls />
            <MiniMap
              pannable
              zoomable
              // The same colours as the boxes, so the minimap reads as a map of
              // this flow rather than as grey rectangles.
              nodeColor={(n) => STYLES[((n.data as { node: FlowNode }).node.kind)].dot}
              nodeStrokeWidth={0}
            />

            <Panel position="top-left">
              <div className="rounded-md border border-rule bg-white/95 px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Reading the arrows
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-ink-soft">
                  <li>
                    <span className="font-semibold text-ink">◆</span> they ask about a topic
                  </li>
                  <li>
                    <span className="font-semibold text-ink">▸</span> they tap a button
                  </li>
                  <li>
                    <span className="font-semibold text-ink">⇢</span> something we collected
                  </li>
                  <li>
                    <span className="font-semibold text-ink">→</span> straight on
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="22" height="8" aria-hidden className="shrink-0">
                      <line x1="0" y1="4" x2="22" y2="4" stroke={FALLBACK_STROKE} strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                    nothing else matched
                  </li>
                </ul>
                <p className="mt-2 max-w-44 border-t border-rule pt-1.5 text-[10px] leading-snug text-ink-faint">
                  A long arrow is not drawn across the canvas. It leaves as{" "}
                  <span className="font-semibold text-ink">to ⑦</span> and arrives at box 7 as{" "}
                  <span className="font-semibold text-ink">③ the question</span> — follow the
                  numbers, not the line.
                </p>
                <p className="mt-1.5 max-w-44 text-[10px] leading-snug text-ink-faint">
                  Neighbouring boxes stay joined. Drag any label to move it. Click a box to fade
                  everything unrelated.
                </p>
              </div>
            </Panel>

          </ReactFlow>
        </div>

        <aside className="w-96 shrink-0 overflow-y-auto border-l border-rule bg-field">
          <Inspector
            doc={doc}
            selection={selection}
            services={services}
            onChange={edit}
            onDelete={remove}
          />

          {findings.length > 0 && (
            <section className="border-t border-rule p-4">
              <h2 className="sign text-sm text-ink">
                {errors.length > 0 ? `${errors.length} to fix` : "Worth a look"}
              </h2>
              <ul className="mt-2 space-y-2">
                {findings.map((f, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => f.nodeId && setSelection({ kind: "node", id: f.nodeId })}
                      className={`text-left text-xs leading-snug ${
                        f.severity === "error" ? "text-red-700" : "text-ink-soft"
                      } ${f.nodeId ? "underline decoration-dotted hover:no-underline" : ""}`}
                    >
                      {f.message}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-rule p-4">
            <h2 className="sign text-sm text-ink">Published</h2>
            <ul className="mt-2 space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-ink">v{v.version}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-faint">{v.note ?? "—"}</span>
                  {v.live ? (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                      live
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => start(() => revertToVersion(v.id).then(() => setStatus(`Reverted to v${v.version}.`)))}
                      className="text-ink-soft underline hover:no-underline"
                    >
                      make live
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Publishing never edits a published version — it writes a new one and points at it.
              Going back is the same single write, which is what makes it safe.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
