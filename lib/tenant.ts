/**
 * Which tenant this process serves.
 *
 * One tenant runs today. The value of naming it now is that every row written
 * from here on carries a `tenant_id`, and every read goes through a scoping
 * helper — so the day there is a second customer, the work is adding tenant
 * resolution here rather than adding a column to a live database and auditing
 * every query that forgot it.
 *
 * That is the expensive half of multi-tenancy, and it is the half you cannot do
 * cheaply later.
 */

/** The tenant every read and write is scoped to. */
export function currentTenant(): string {
  return process.env.TENANT_ID || "uaevia";
}

/**
 * A filter scoped to the current tenant.
 *
 * Used instead of writing `{ tenant_id: ... }` by hand, so "did this query
 * scope by tenant?" has one answer per call site rather than one per developer.
 * Mongo has no row-level security to catch a query that forgets — this helper
 * is the only line, which is why it exists.
 */
export function scoped<T extends Record<string, unknown>>(filter: T): T & { tenant_id: string } {
  return { ...filter, tenant_id: currentTenant() };
}
