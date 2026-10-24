/**
 * Reading the environment, kept apart from `config.ts` on purpose.
 *
 * `config` validates everything the *worker* needs the moment it is imported,
 * which is what makes a missing variable fail at startup rather than at 7am.
 * But `pair.ts` is the script you run to discover `WHATSAPP_GROUP_JID` in the
 * first place, and importing `config` would have made it demand the value it
 * exists to give you — so pairing could never run on a fresh checkout.
 *
 * So the helpers and the database settings live here, where a script can ask
 * for the two variables it needs without triggering the full check.
 */

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** A comma-separated variable, or the default list. Blank entries dropped so a
 *  trailing comma cannot turn into an empty Google query. */
export function list(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;

  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

/** All the pairing script needs: somewhere to put the session. */
export function mongoConfig() {
  return { uri: required("MONGODB_URI"), db: required("MONGODB_DB") };
}
