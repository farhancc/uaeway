import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deleting old listings by hand.
 *
 * The weekly prune already expires listings at 45 days and deletes them at 60,
 * but only ones that are no longer live — a housekeeping job should not be able
 * to remove a listing a visitor is reading. This is the deliberate version of
 * the same act: an admin choosing to clear everything past an age, live or not.
 *
 * It runs through the signed-in admin's client rather than the service role, so
 * `is_admin()` is checked again at the database. See the comment at the top of
 * `admin/actions.ts`; migration 0013 is what makes a delete possible that way.
 */

/** The only ages offered. A free-form number would be an arbitrary-delete
 *  endpoint, and nobody needs "older than 3 days". */
export const PURGE_WINDOWS = [30, 60] as const;
export type PurgeWindow = (typeof PURGE_WINDOWS)[number];

export function isPurgeWindow(value: number): value is PurgeWindow {
  return (PURGE_WINDOWS as readonly number[]).includes(value);
}

/**
 * Measured from when we took the listing in, not the date the source claimed.
 *
 * The same reasoning as `JOB_RETENTION_DAYS`: some feeds backdate their
 * postings, and one bad date should not make a listing eligible for deletion
 * the day it arrives.
 */
function cutoff(days: PurgeWindow): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** How many listings a purge would remove. Shown before anything is deleted,
 *  because the count is the only warning that means anything. */
export async function countOldJobs(
  db: SupabaseClient,
  days: PurgeWindow,
): Promise<number> {
  const { count, error } = await db
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .lt("created_at", cutoff(days));

  if (error) throw new Error(`could not count old listings: ${error.message}`);
  return count ?? 0;
}

/**
 * Deletes every listing older than the window. Returns how many went.
 *
 * Throws rather than reporting success if it removes nothing while rows
 * matched. A missing RLS delete policy does not error — Postgres simply
 * filters the rows out and the delete reports zero, which would look exactly
 * like "nothing was old enough". That silence is the failure worth catching,
 * since the fix is applying migration 0013.
 */
export async function purgeOldJobs(
  db: SupabaseClient,
  days: PurgeWindow,
): Promise<number> {
  const expected = await countOldJobs(db, days);
  if (expected === 0) return 0;

  const { data, error } = await db
    .from("jobs")
    .delete()
    .lt("created_at", cutoff(days))
    .select("id");

  if (error) throw new Error(`purge failed: ${error.message}`);

  const deleted = data?.length ?? 0;
  if (deleted === 0) {
    throw new Error(
      `${expected} listings matched but none were deleted — the admin delete policy is ` +
        `missing. Apply supabase/migrations/0013_admin_purge_jobs.sql.`,
    );
  }

  console.log(`[purge] admin deleted ${deleted} listings older than ${days} days`);
  return deleted;
}
