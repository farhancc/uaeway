/**
 * What is wrong with a flow.
 *
 * The line between this and `./schema.ts` is deliberate. The schema is what
 * *cannot be stored*: an edge pointing at a node that does not exist is
 * corruption, and no draft should ever hold it. This is what *should not be
 * published*: an unreachable node is a mistake, but it is a mistake you want to
 * be able to save halfway through fixing.
 *
 * So errors block a publish and warnings do not, and a draft with either still
 * saves. Pure, and no Node builtins, so the builder can run it as you drag and
 * tell you before you reach for publish.
 */

import { indexFlow, type FlowDoc, type FlowIndex } from "./schema";
import { SERVICE_SLOT } from "../page-context";

export interface Finding {
  severity: "error" | "warning";
  /** What the canvas should select when someone clicks the finding. */
  nodeId?: string;
  intentId?: string;
  message: string;
}

/** Every node the conversation can actually get to. */
function reachable(flow: FlowIndex): Set<string> {
  const seen = new Set<string>([flow.start.id]);
  const queue = [flow.start.id];

  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const edge of flow.out.get(id) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push(edge.to);
    }
  }
  return seen;
}

export function lintFlow(doc: FlowDoc): Finding[] {
  const flow = indexFlow(doc);
  const findings: Finding[] = [];
  const live = reachable(flow);

  for (const node of doc.nodes) {
    const out = flow.out.get(node.id) ?? [];

    if (!live.has(node.id)) {
      findings.push({
        severity: "warning",
        nodeId: node.id,
        message: "Nothing leads here, so no visitor can reach it.",
      });
    }

    // A `say` with no outgoing edge is fine — suggestions top up from the start
    // node, which is what stops an answer being a dead end. These two are not.
    if (node.kind === "branch" && out.length === 0) {
      findings.push({
        severity: "error",
        nodeId: node.id,
        message: "A branch with no outgoing edges cannot route anywhere.",
      });
    }
    if (node.kind === "ask" && out.length === 0) {
      findings.push({
        severity: "error",
        nodeId: node.id,
        message: "This asks a question and then has nowhere to go with the answer.",
      });
    }

    // Two edges on one intent is genuinely ambiguous: the runtime takes the
    // lower `position`, which is an accident of the canvas rather than a choice.
    const byIntent = new Map<string, number>();
    const byLabel = new Map<string, number>();
    for (const edge of out) {
      if (edge.when.kind === "intent") {
        byIntent.set(edge.when.intentId, (byIntent.get(edge.when.intentId) ?? 0) + 1);
      }
      if (edge.when.kind === "choice") {
        const label = edge.when.label.toLowerCase();
        byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
      }
    }
    for (const [intentId, count] of byIntent) {
      if (count > 1) {
        findings.push({
          severity: "error",
          nodeId: node.id,
          intentId,
          message: `Two edges leave this node on "${flow.intent.get(intentId)?.name ?? intentId}".`,
        });
      }
    }
    for (const [label, count] of byLabel) {
      if (count > 1) {
        findings.push({
          severity: "error",
          nodeId: node.id,
          message: `Two buttons on this node are both labelled "${label}".`,
        });
      }
    }

    if (node.kind === "ask") {
      const slot = flow.slot.get(node.slot);
      if (slot?.kind === "enum" && slot.options.length === 0) {
        findings.push({
          severity: "error",
          nodeId: node.id,
          message: `Slot "${node.slot}" offers a choice but has no options.`,
        });
      }
    }
  }

  // Without a fallback on the start node, a question nothing matches gets no
  // reply at all. This is the single most consequential thing to get wrong, and
  // the one an author is least likely to notice — every question they try
  // themselves is one they wrote an intent for.
  const globalFallback = (flow.out.get(flow.start.id) ?? []).some((e) => e.when.kind === "fallback");
  if (!globalFallback) {
    findings.push({
      severity: "error",
      nodeId: flow.start.id,
      message: "No fallback leaves the start node, so an unrecognised question gets no answer.",
    });
  }

  const usedIntents = new Set(
    doc.edges.flatMap((e) => (e.when.kind === "intent" ? [e.when.intentId] : [])),
  );
  for (const intent of doc.intents) {
    if (!usedIntents.has(intent.id)) {
      findings.push({
        severity: "warning",
        intentId: intent.id,
        message: `"${intent.name}" is not wired to any edge, so matching it does nothing.`,
      });
    }
    if (intent.phrases.length === 0 && intent.hintKeywords.length === 0) {
      findings.push({
        severity: "error",
        intentId: intent.id,
        message: `"${intent.name}" has no phrases and no keywords, so it can never match.`,
      });
    }
  }

  // `SERVICE_SLOT` is written by the runtime from the page the widget is on,
  // not by any box, so reporting it as unwritten sends an author looking for a
  // question that does not exist.
  const written = new Set([
    SERVICE_SLOT,
    ...doc.nodes.flatMap((n) => (n.kind === "ask" ? [n.slot] : [])),
  ]);
  const read = new Set(doc.edges.flatMap((e) => (e.when.kind === "slot" ? [e.when.slot] : [])));
  // A qualify node writes whatever its service definition declares, and those
  // keys are not in the graph. So with one present this drops to a warning: we
  // cannot prove the slot is never written without reading the database, and
  // blocking a publish on something we cannot check is how a linter gets
  // switched off.
  const qualifies = doc.nodes.some((n) => n.kind === "qualify");
  for (const slot of read) {
    if (written.has(slot)) continue;
    findings.push(
      qualifies
        ? {
            severity: "warning",
            message: `An edge branches on "${slot}" — check a qualification field writes it.`,
          }
        : {
            severity: "error",
            message: `An edge branches on "${slot}", but nothing ever asks for it.`,
          },
    );
  }

  return findings;
}

/** Publishing is blocked by errors only. Warnings are for the author to judge. */
export function publishable(findings: Finding[]): boolean {
  return !findings.some((f) => f.severity === "error");
}
