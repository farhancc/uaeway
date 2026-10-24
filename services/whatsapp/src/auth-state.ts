import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import type { Collection, Db } from "mongodb";

/**
 * Baileys ships `useMultiFileAuthState`, which keeps the session as a folder of
 * JSON files. Render's free tier has no persistent disk, so that folder would
 * be gone on every deploy and restart and the QR would have to be scanned
 * again each time. This is the same contract backed by Mongo instead.
 *
 * The values are not plain JSON — creds and Signal keys are full of Buffers and
 * Uint8Arrays — so everything goes through `BufferJSON`, which is the pair of
 * reviver/replacer Baileys uses for exactly this.
 */

type AuthDoc = { _id: string; value: string };

export async function useMongoAuthState(db: Db): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  isRegistered: boolean;
}> {
  const col: Collection<AuthDoc> = db.collection<AuthDoc>("whatsapp_auth");

  const read = async <T>(id: string): Promise<T | null> => {
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return JSON.parse(doc.value, BufferJSON.reviver) as T;
  };

  const write = async (id: string, value: unknown): Promise<void> => {
    // $set rather than a replacement document: the driver rejects an explicit
    // _id in a replacement, and the filter already carries it on an upsert.
    await col.updateOne(
      { _id: id },
      { $set: { value: JSON.stringify(value, BufferJSON.replacer) } },
      { upsert: true },
    );
  };

  const remove = async (id: string): Promise<void> => {
    await col.deleteOne({ _id: id });
  };

  const existing = await read<AuthenticationCreds>("creds");
  const creds = existing ?? initAuthCreds();

  return {
    /** False on a cold database, which is how the caller knows to expect a QR. */
    isRegistered: existing !== null,
    saveCreds: () => write("creds", creds),
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const out: { [id: string]: SignalDataTypeMap[T] } = {};

          await Promise.all(
            ids.map(async (id) => {
              const stored = await read<unknown>(`${type}-${id}`);
              if (!stored) return;

              // The one type Baileys wants rehydrated into a protobuf message
              // rather than the plain object it was stored as. The cast is
              // unavoidable: T is still generic here, so the compiler cannot
              // see that this branch only runs for app-state-sync-key.
              out[id] = (
                type === "app-state-sync-key"
                  ? proto.Message.AppStateSyncKeyData.fromObject(
                      stored as { [k: string]: unknown },
                    )
                  : stored
              ) as SignalDataTypeMap[T];
            }),
          );

          return out;
        },

        set: async (data) => {
          const writes: Promise<void>[] = [];

          for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
            const entries = data[type];
            if (!entries) continue;

            for (const [id, value] of Object.entries(entries)) {
              const key = `${type}-${id}`;
              // A null value is Baileys deleting the key, not storing null.
              writes.push(value ? write(key, value) : remove(key));
            }
          }

          await Promise.all(writes);
        },
      },
    },
  };
}

/** Used by the pairing script when a session is being replaced rather than created. */
export async function clearAuthState(db: Db): Promise<number> {
  const result = await db.collection("whatsapp_auth").deleteMany({});
  return result.deletedCount;
}
