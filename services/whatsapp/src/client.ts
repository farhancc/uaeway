import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "baileys";
import type { Db } from "mongodb";
import { pino } from "pino";
import { useMongoAuthState } from "./auth-state.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

/** Caps the backoff. WhatsApp dislikes a client that hammers reconnects. */
const MAX_BACKOFF_MS = 5 * 60_000;

export type ConnectionStatus = "starting" | "connecting" | "open" | "logged-out";

/**
 * One long-lived WhatsApp connection that reconnects itself.
 *
 * Staying connected is the whole point of paying for a host rather than using
 * a scheduled job: a linked device that holds its socket open looks like a
 * phone, while one that appears for ninety seconds a day from a new datacentre
 * IP looks like exactly what it is. Restarts still happen — Render redeploys,
 * platform maintenance — but reconnecting an existing session is ordinary
 * behaviour for a linked device and needs no new QR.
 */
export class WhatsAppClient {
  private socket: WASocket | null = null;
  private status: ConnectionStatus = "starting";
  private attempts = 0;
  private stopped = false;
  private readonly waiters: (() => void)[] = [];

  constructor(private readonly db: Db) {}

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async start(): Promise<void> {
    await this.open();
  }

  stop(): void {
    this.stopped = true;
    this.socket?.end(undefined);
  }

  private async open(): Promise<void> {
    if (this.stopped) return;

    this.status = "connecting";

    const { state, saveCreds, isRegistered } = await useMongoAuthState(this.db);

    if (!isRegistered) {
      // Nothing to connect with. Pairing deliberately does not happen here:
      // on Render the QR would be printed into a deploy log, and on a public
      // repo that log is a live session anyone can claim. See `npm run pair`.
      this.status = "logged-out";
      throw new Error(
        "No WhatsApp session in the database. Run `npm run pair` locally first.",
      );
    }

    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu("Chrome"),
      // Leaves the phone's own notifications alone, and one fewer signal that
      // something is permanently watching the account.
      markOnlineOnConnect: false,
    });

    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        this.status = "open";
        this.attempts = 0;
        console.log("[whatsapp] connected");
        // Release anything blocked in waitUntilReady.
        while (this.waiters.length) this.waiters.pop()?.();
        return;
      }

      if (connection === "close") {
        const code = statusCodeOf(lastDisconnect?.error);

        if (code === DisconnectReason.loggedOut) {
          // The session was revoked from the phone. No amount of reconnecting
          // fixes this; it needs a new QR.
          this.status = "logged-out";
          console.error(
            "[whatsapp] logged out — the session is dead, run `npm run pair` again",
          );
          return;
        }

        // 515 is WhatsApp asking for a fresh socket rather than an error; it
        // always follows a first pairing. Everything else backs off.
        const immediate = code === DisconnectReason.restartRequired;
        void this.reconnect(immediate);
      }
    });
  }

  private async reconnect(immediate: boolean): Promise<void> {
    if (this.stopped) return;

    this.attempts += 1;
    const delay = immediate
      ? 0
      : Math.min(1_000 * 2 ** (this.attempts - 1), MAX_BACKOFF_MS);

    console.warn(`[whatsapp] disconnected — retrying in ${Math.round(delay / 1000)}s`);
    await sleep(delay);

    try {
      await this.open();
    } catch (err) {
      console.error(`[whatsapp] reconnect failed: ${(err as Error).message}`);
      void this.reconnect(false);
    }
  }

  /** Resolves when the socket is open, or rejects once the wait is hopeless. */
  async waitUntilReady(timeoutMs = 60_000): Promise<void> {
    if (this.status === "open") return;
    if (this.status === "logged-out") throw new Error("WhatsApp session is logged out");

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`WhatsApp did not connect within ${timeoutMs}ms`)),
        timeoutMs,
      );
      this.waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async sendText(jid: string, text: string): Promise<void> {
    await this.waitUntilReady();
    if (!this.socket) throw new Error("No WhatsApp socket");
    await this.socket.sendMessage(jid, { text });
  }

  /** Group name to JID, for finding the value WHATSAPP_GROUP_JID needs. */
  async listGroups(): Promise<{ jid: string; subject: string }[]> {
    await this.waitUntilReady();
    if (!this.socket) throw new Error("No WhatsApp socket");

    const groups = await this.socket.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({ jid: g.id, subject: g.subject }));
  }
}

function statusCodeOf(error: unknown): number | undefined {
  // Baileys throws Boom errors; this is the status without taking on @hapi/boom.
  const output = (error as { output?: { statusCode?: number } } | undefined)?.output;
  return output?.statusCode;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { logger };
