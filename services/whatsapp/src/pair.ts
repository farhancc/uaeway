import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "baileys";
import { MongoClient } from "mongodb";
import { pino } from "pino";
import qrcode from "qrcode-terminal";
import { clearAuthState, useMongoAuthState } from "./auth-state.js";
import { mongoConfig } from "./env.js";

/**
 * Run this on your own machine, once, before the first deploy.
 *
 *   npm run pair             link the account, then list the groups
 *   npm run pair -- --reset  throw away the stored session and link again
 *
 * It exists separately from the service for one reason: pairing means putting
 * a QR code on a screen, and on Render that screen is the deploy log. On a
 * public repository those logs are world-readable, so anyone watching could
 * scan the code and take the session. Linking happens in your terminal; only
 * the resulting credentials travel to Mongo.
 *
 * Re-run it any time to look up a group JID — once a session exists it skips
 * straight to the listing.
 */

const logger = pino({ level: process.env.LOG_LEVEL ?? "silent" });

async function main(): Promise<void> {
  const { uri, db: dbName } = mongoConfig();
  const mongo = new MongoClient(uri);
  await mongo.connect();
  const db = mongo.db(dbName);

  if (process.argv.includes("--reset")) {
    const removed = await clearAuthState(db);
    console.log(`Cleared ${removed} stored auth record(s). A new QR will follow.\n`);
  }

  const { groups, stop } = await linkAndListGroups(db);

  console.log("\nGroups this account is in:\n");
  if (groups.length === 0) {
    console.log("  (none — add the account to the group, then run this again)");
  }
  for (const { subject, jid } of groups) {
    console.log(`  ${subject}\n    ${jid}\n`);
  }
  console.log("Copy the JID of the group you want into WHATSAPP_GROUP_JID.\n");

  // The socket goes first. A linked device keeps receiving while this runs,
  // and decrypting an incoming message writes Signal keys through to Mongo —
  // so closing the database with the socket still open ends the script on a
  // "client was closed" error mid-write. Harmless to the session it just
  // stored, but it looks like a failed pairing, which is worse.
  stop();
  await mongo.close();
  process.exit(0);
}

interface Linked {
  groups: { jid: string; subject: string }[];
  /** Closes the socket this opened. The caller cannot do it; the socket is
   *  created inside a retry that may replace it. */
  stop: () => void;
}

function linkAndListGroups(db: Parameters<typeof useMongoAuthState>[0]): Promise<Linked> {
  return new Promise((resolve, reject) => {
    let shownQr = false;

    const attempt = async (): Promise<void> => {
      const { state, saveCreds, isRegistered } = await useMongoAuthState(db);
      const { version } = await fetchLatestBaileysVersion();

      if (!isRegistered && !shownQr) {
        console.log("No session stored yet — a QR code will appear below.");
        console.log("On your phone: WhatsApp > Settings > Linked devices > Link a device\n");
      }

      const socket = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: false,
      });

      socket.ev.on("creds.update", saveCreds);

      socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          shownQr = true;
          qrcode.generate(qr, { small: true });
          console.log("Scan the code above. It refreshes every 20 seconds.\n");
        }

        if (connection === "open") {
          console.log("Linked.");
          void socket
            .groupFetchAllParticipating()
            .then((all) =>
              Object.values(all).map((g) => ({ jid: g.id, subject: g.subject })),
            )
            .then((groups) => resolve({ groups, stop: () => socket.end(undefined) }))
            .catch(reject);
          return;
        }

        if (connection === "close") {
          const code = (lastDisconnect?.error as { output?: { statusCode?: number } })
            ?.output?.statusCode;

          // 515 is not a failure: WhatsApp always asks for a fresh socket
          // immediately after a successful first pairing.
          if (code === DisconnectReason.restartRequired) {
            void attempt().catch(reject);
            return;
          }

          if (code === DisconnectReason.loggedOut) {
            reject(
              new Error("Logged out. Run with --reset to clear the session and relink."),
            );
            return;
          }

          reject(new Error(`Connection closed (status ${code ?? "unknown"})`));
        }
      });
    };

    attempt().catch(reject);
  });
}

main().catch((err) => {
  console.error(`\nPairing failed: ${(err as Error).message}`);
  process.exit(1);
});
