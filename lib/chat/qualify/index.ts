/**
 * The qualification engine, as the runtime sees it.
 *
 * Satisfies the `Qualifier` interface `lib/chat/flow/run.ts` declares: the walk
 * asks "what next, and is this answer any good?", and everything about services
 * and databases stays on this side of that line.
 */

import { loadDefinitions } from "./store";
import { acceptValue, collected, nextRequired } from "./engine";
import type { Qualifier } from "../flow/run";

export { acceptValue, collected, isQualified, missingRequired, nextRequired, qualification } from "./engine";
export { clearDefinitionCache, getDefinition, listDefinitions, loadDefinitions, saveDefinition } from "./store";
export type { FieldType, Known, QualificationField, ServiceDefinition } from "./schema";
export { qualificationField, serviceDefinition } from "./schema";

/**
 * Built once per turn from the cached definitions, so the three calls the walk
 * makes cannot see three different versions of a schema mid-conversation.
 *
 * A service with no definition qualifies nobody: `next` returns null and the
 * node steps through. That is the safe direction — the alternative is asking
 * questions against a schema we do not have.
 */
export async function loadQualifier(): Promise<Qualifier> {
  const definitions = await loadDefinitions();

  return {
    accept(serviceId, slot, raw) {
      const field = definitions.get(serviceId)?.fields.find((f) => f.key === slot);
      // No field means the question came from somewhere else — an `ask` node
      // sharing a slot name. Nothing to validate against, so take it as given.
      return field ? acceptValue(field, raw) : { value: raw.trim() };
    },

    next(serviceId, known) {
      const def = definitions.get(serviceId);
      if (!def) return null;

      const field = nextRequired(def, known);
      return field
        ? { slot: field.key, question: field.question, options: field.options }
        : null;
    },

    collected(serviceId, known) {
      const def = definitions.get(serviceId);
      return def ? collected(def, known) : {};
    },
  };
}
