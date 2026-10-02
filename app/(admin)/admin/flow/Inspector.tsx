"use client";

import type { EdgeCondition, FlowDoc, FlowEdge, FlowNode, Intent } from "@/lib/chat/flow/schema";

/**
 * Editing whatever is selected on the canvas.
 *
 * Deliberately a plain form rather than anything clever. The canvas answers
 * "what shape is this conversation"; the answers people actually read are
 * edited here, in a box big enough to write a paragraph in.
 */

const input =
  "mt-1 w-full rounded-md border border-rule bg-white px-2 py-1.5 text-sm text-ink";
const label = "block text-xs font-medium uppercase tracking-wide text-ink-faint";

export interface Selection {
  kind: "node" | "edge";
  id: string;
}

export function Inspector({
  doc,
  selection,
  services,
  onChange,
  onDelete,
}: {
  doc: FlowDoc;
  selection: Selection | null;
  services: { slug: string; name: string }[];
  onChange: (doc: FlowDoc) => void;
  onDelete: () => void;
}) {
  if (!selection) {
    return (
      <p className="p-4 text-sm text-ink-faint">
        Select a box or an arrow to edit it. Drag from the dot on a box&rsquo;s right edge to
        another box to draw a new arrow.
      </p>
    );
  }

  const patchNode = (patch: Partial<FlowNode>) =>
    onChange({
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === selection.id ? ({ ...n, ...patch } as FlowNode) : n)),
    });

  const patchEdge = (patch: Partial<FlowEdge>) =>
    onChange({
      ...doc,
      edges: doc.edges.map((e) => (e.id === selection.id ? { ...e, ...patch } : e)),
    });

  const patchIntent = (id: string, patch: Partial<Intent>) =>
    onChange({
      ...doc,
      intents: doc.intents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });

  const node = selection.kind === "node" ? doc.nodes.find((n) => n.id === selection.id) : null;
  const edge = selection.kind === "edge" ? doc.edges.find((e) => e.id === selection.id) : null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="sign text-sm text-ink">{node ? `${node.kind} box` : "arrow"}</h2>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-700 underline hover:no-underline"
        >
          Delete
        </button>
      </div>
      <p className="font-mono text-[11px] text-ink-faint">{selection.id}</p>

      {node && <NodeFields node={node} services={services} onPatch={patchNode} doc={doc} />}
      {edge && (
        <EdgeFields doc={doc} edge={edge} onPatch={patchEdge} onPatchIntent={patchIntent} />
      )}
    </div>
  );
}

function NodeFields({
  node,
  doc,
  services,
  onPatch,
}: {
  node: FlowNode;
  doc: FlowDoc;
  services: { slug: string; name: string }[];
  onPatch: (patch: Partial<FlowNode>) => void;
}) {
  switch (node.kind) {
    case "say":
      return (
        <>
          <div>
            <label className={label} htmlFor="text">
              What it says
            </label>
            <textarea
              id="text"
              rows={9}
              className={input}
              value={node.text}
              onChange={(e) => onPatch({ text: e.target.value } as Partial<FlowNode>)}
            />
            <p className="mt-1 text-xs text-ink-faint">
              Markdown. <code>{"{{slot}}"}</code> is replaced with whatever the conversation
              collected under that name.
            </p>
          </div>
          <ServicePicker
            value={node.serviceSlug}
            services={services}
            onChange={(v) => onPatch({ serviceSlug: v } as Partial<FlowNode>)}
          />
          <div>
            <label className={label} htmlFor="faq">
              Question it answers
            </label>
            <input
              id="faq"
              className={input}
              value={node.faqQuestion ?? ""}
              placeholder="Leave empty to use the intent's name"
              onChange={(e) =>
                onPatch({ faqQuestion: e.target.value || null } as Partial<FlowNode>)
              }
            />
            <p className="mt-1 text-xs text-ink-faint">
              The label on a suggestion chip, and the heading on the service page&rsquo;s FAQ.
              Write it the way a visitor would ask it.
            </p>
          </div>
        </>
      );

    case "ask":
      return (
        <>
          <div>
            <label className={label} htmlFor="text">
              What it asks
            </label>
            <textarea
              id="text"
              rows={3}
              className={input}
              value={node.text}
              onChange={(e) => onPatch({ text: e.target.value } as Partial<FlowNode>)}
            />
          </div>
          <div>
            <label className={label} htmlFor="slot">
              Stores the answer as
            </label>
            <select
              id="slot"
              className={input}
              value={node.slot}
              onChange={(e) => onPatch({ slot: e.target.value } as Partial<FlowNode>)}
            >
              {doc.slots.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key} — {s.label}
                </option>
              ))}
            </select>
          </div>
        </>
      );

    case "qualify":
      return (
        <div>
          <label className={label} htmlFor="serviceId">
            Qualifies for
          </label>
          <select
            id="serviceId"
            className={input}
            value={node.serviceId}
            onChange={(e) => onPatch({ serviceId: e.target.value } as Partial<FlowNode>)}
          >
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            One box, however many questions. It asks for each missing required field of this
            service in turn and moves on when nothing required is left. Edit the fields and their
            order in the service, not here — that is what stops a six-field service becoming six
            boxes.
          </p>
        </div>
      );

    case "model":
      return (
        <div>
          <label className={label} htmlFor="guidance">
            Extra guidance
          </label>
          <textarea
            id="guidance"
            rows={4}
            className={input}
            value={node.guidance}
            onChange={(e) => onPatch({ guidance: e.target.value } as Partial<FlowNode>)}
          />
          <p className="mt-1 text-xs text-ink-faint">
            The only box that costs money. Published content is retrieved and handed to the model
            either way; this narrows it to the topic this branch is about.
          </p>
        </div>
      );

    case "handoff":
      return (
        <>
          <div>
            <label className={label} htmlFor="text">
              What it says
            </label>
            <textarea
              id="text"
              rows={3}
              className={input}
              value={node.text}
              onChange={(e) => onPatch({ text: e.target.value } as Partial<FlowNode>)}
            />
          </div>
          <div>
            <label className={label} htmlFor="reason">
              Reason
            </label>
            <select
              id="reason"
              className={input}
              value={node.reason}
              onChange={(e) => onPatch({ reason: e.target.value } as Partial<FlowNode>)}
            >
              {["qualified", "requested", "budget", "unavailable", "contact"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <ServicePicker
            value={node.serviceSlug}
            services={services}
            onChange={(v) => onPatch({ serviceSlug: v } as Partial<FlowNode>)}
          />
        </>
      );

    default:
      return (
        <p className="text-sm text-ink-faint">
          {node.kind === "start"
            ? "Where every conversation begins. The arrows leaving it are the opening suggestions, and they are also how someone changes the subject from anywhere."
            : node.kind === "branch"
              ? "Routes without saying anything. Its arrows are checked in order and the first that holds wins."
              : "The conversation stops here."}
        </p>
      );
  }
}

function ServicePicker({
  value,
  services,
  onChange,
}: {
  value: string | null;
  services: { slug: string; name: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <label className={label} htmlFor="service">
        Service
      </label>
      <select
        id="service"
        className={input}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">None</option>
        {services.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-ink-faint">
        Opens the callback form on the right service instead of making the visitor find it.
      </p>
    </div>
  );
}

function EdgeFields({
  doc,
  edge,
  onPatch,
  onPatchIntent,
}: {
  doc: FlowDoc;
  edge: FlowEdge;
  onPatch: (patch: Partial<FlowEdge>) => void;
  onPatchIntent: (id: string, patch: Partial<Intent>) => void;
}) {
  const setKind = (kind: EdgeCondition["kind"]) => {
    const when: EdgeCondition =
      kind === "intent"
        ? { kind, intentId: doc.intents[0]?.id ?? "" }
        : kind === "choice"
          ? { kind, label: "Yes" }
          : kind === "slot"
            ? { kind, slot: doc.slots[0]?.key ?? "", op: "exists", value: "" }
            : { kind };
    onPatch({ when });
  };

  // Narrowed into locals: `edge.when` inside a callback is not narrowed by a
  // check outside it, and the condition members share no fields.
  const when = edge.when;
  const intent = when.kind === "intent" ? doc.intents.find((i) => i.id === when.intentId) : null;

  return (
    <>
      <div>
        <label className={label} htmlFor="kind">
          Taken when
        </label>
        <select
          id="kind"
          className={input}
          value={when.kind}
          onChange={(e) => setKind(e.target.value as EdgeCondition["kind"])}
        >
          <option value="intent">they ask about something</option>
          <option value="choice">they tap a button</option>
          <option value="slot">something we collected matches</option>
          <option value="always">always — step straight on</option>
          <option value="fallback">nothing else matched</option>
        </select>
      </div>

      {when.kind === "intent" && (
        <div>
          <label className={label} htmlFor="intentId">
            Topic
          </label>
          <select
            id="intentId"
            className={input}
            value={when.intentId}
            onChange={(e) => onPatch({ when: { kind: "intent", intentId: e.target.value } })}
          >
            {doc.intents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {intent && (
        <div className="space-y-3 rounded-md border border-rule bg-paper p-3">
          <p className="text-xs text-ink-faint">
            Editing <strong className="text-ink">{intent.name}</strong> changes every arrow that
            uses it.
          </p>
          <div>
            <label className={label} htmlFor="intentName">
              Name
            </label>
            <input
              id="intentName"
              className={input}
              value={intent.name}
              onChange={(e) => onPatchIntent(intent.id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="phrases">
              Ways people ask it
            </label>
            <textarea
              id="phrases"
              rows={5}
              className={input}
              value={intent.phrases.join("\n")}
              onChange={(e) =>
                onPatchIntent(intent.id, {
                  phrases: e.target.value.split("\n").map((p) => p.trim()).filter(Boolean),
                })
              }
            />
            <p className="mt-1 text-xs text-ink-faint">One per line.</p>
          </div>
          <div>
            <label className={label} htmlFor="hints">
              Exact keywords
            </label>
            <textarea
              id="hints"
              rows={4}
              className={input}
              value={intent.hintKeywords.map((g) => g.join(", ")).join("\n")}
              onChange={(e) =>
                onPatchIntent(intent.id, {
                  hintKeywords: e.target.value
                    .split("\n")
                    .map((line) => line.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean))
                    .filter((g) => g.length > 0),
                })
              }
            />
            <p className="mt-1 text-xs text-ink-faint">
              One group per line, words separated by commas. Every word of a line must be present.
              These are also what the widget matches as the visitor types.
            </p>
          </div>
        </div>
      )}

      {when.kind === "choice" && (
        <div>
          <label className={label} htmlFor="choiceLabel">
            Button label
          </label>
          <input
            id="choiceLabel"
            className={input}
            value={when.label}
            onChange={(e) => onPatch({ when: { kind: "choice", label: e.target.value } })}
          />
        </div>
      )}

      {when.kind === "slot" && (
        <SlotCondition when={when} onPatch={onPatch} />
      )}

      <div>
        <label className={label} htmlFor="position">
          Order
        </label>
        <input
          id="position"
          type="number"
          className={input}
          value={edge.position}
          onChange={(e) => onPatch({ position: Number(e.target.value) || 0 })}
        />
        <p className="mt-1 text-xs text-ink-faint">
          Lower goes first. Arrows out of one box are checked in this order, and buttons are
          offered in it — so moving a box on the canvas never changes what the conversation does.
        </p>
      </div>
    </>
  );
}

/** Its own component so the condition is narrowed for every handler inside it,
 *  rather than re-asserted at each `onChange`. */
function SlotCondition({
  when,
  onPatch,
}: {
  when: Extract<EdgeCondition, { kind: "slot" }>;
  onPatch: (patch: Partial<FlowEdge>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className={label} htmlFor="slotKey">
          Field
        </label>
        <input
          id="slotKey"
          className={input}
          value={when.slot}
          onChange={(e) => onPatch({ when: { ...when, slot: e.target.value } })}
        />
      </div>
      <div>
        <label className={label} htmlFor="op">
          Is
        </label>
        <select
          id="op"
          className={input}
          value={when.op}
          onChange={(e) => onPatch({ when: { ...when, op: e.target.value as typeof when.op } })}
        >
          <option value="eq">equal to</option>
          <option value="neq">not equal to</option>
          <option value="exists">answered</option>
          <option value="missing">unanswered</option>
        </select>
      </div>
      <div>
        <label className={label} htmlFor="slotValue">
          Value
        </label>
        <input
          id="slotValue"
          className={input}
          value={when.value}
          onChange={(e) => onPatch({ when: { ...when, value: e.target.value } })}
        />
      </div>
    </div>
  );
}
