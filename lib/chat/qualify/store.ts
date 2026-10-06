/**
 * Where qualification schemas are kept.
 *
 * Cached in process on the same 60s TTL as the flow and the answer bank, for
 * the same reason: every turn of every conversation reads a definition, so a
 * round trip per turn would cost more than the qualification itself. An edit in
 * the Service Builder shows up within a minute without a deploy.
 *
 * Every read here is tenant-scoped through `scoped()`. This module is the only
 * place service definitions are read, which is what makes that one line enough.
 */

import { randomUUID } from "crypto";
import { isChatDbConfigured, serviceDefinitionsCollection } from "../../mongo/chat-db";
import { currentTenant, scoped } from "../../tenant";
import { serviceDefinition, type ServiceDefinition } from "./schema";

const TTL_MS = 60_000;

let cache: { at: number; byService: Map<string, ServiceDefinition> } | null = null;

export function clearDefinitionCache(): void {
  cache = null;
}

/**
 * Every active definition, keyed by service.
 *
 * A document that no longer parses is skipped with a warning rather than
 * throwing: one bad definition should cost that service its qualification, not
 * take the whole chat down.
 */
export async function loadDefinitions(): Promise<Map<string, ServiceDefinition>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.byService;
  if (!isChatDbConfigured()) return new Map();

  try {
    const docs = await (await serviceDefinitionsCollection())
      .find(scoped({ active: true }))
      .toArray();

    const byService = new Map<string, ServiceDefinition>();
    for (const doc of docs) {
      const parsed = serviceDefinition.safeParse({
        serviceId: doc.service_id,
        name: doc.name,
        assignTo: doc.assign_to,
        active: doc.active,
        fields: doc.fields,
      });
      if (parsed.success) byService.set(doc.service_id, parsed.data);
      else console.warn(`[qualify] ${doc.service_id} does not parse: ${parsed.error.message}`);
    }

    cache = { at: Date.now(), byService };
    return byService;
  } catch (err) {
    console.warn(`[qualify] could not load definitions: ${(err as Error).message}`);
    return cache?.byService ?? new Map();
  }
}

export async function getDefinition(serviceId: string): Promise<ServiceDefinition | null> {
  return (await loadDefinitions()).get(serviceId) ?? null;
}

/** Retired services included: the admin lists them so they can be brought back. */
export async function listDefinitions(): Promise<ServiceDefinition[]> {
  const docs = await (await serviceDefinitionsCollection()).find(scoped({})).toArray();

  return docs.flatMap((doc) => {
    const parsed = serviceDefinition.safeParse({
      serviceId: doc.service_id,
      name: doc.name,
      assignTo: doc.assign_to,
      active: doc.active,
      fields: doc.fields,
    });
    return parsed.success ? [parsed.data] : [];
  });
}

/** Upsert by service, so the seed script and the Service Builder are the same
 *  write and re-running the seed never duplicates a definition. */
export async function saveDefinition(input: unknown): Promise<ServiceDefinition> {
  const def = serviceDefinition.parse(input);
  const now = new Date();

  await (await serviceDefinitionsCollection()).updateOne(
    scoped({ service_id: def.serviceId }),
    {
      $set: {
        name: def.name,
        assign_to: def.assignTo,
        active: def.active,
        fields: def.fields,
        updated_at: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        tenant_id: currentTenant(),
        service_id: def.serviceId,
        created_at: now,
      },
    },
    { upsert: true },
  );

  clearDefinitionCache();
  return def;
}
