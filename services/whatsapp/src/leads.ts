import type { Collection, Db } from "mongodb";
import { config } from "./config.js";

/**
 * New leads, forwarded to a phone over WhatsApp.
 *
 * The site already alerts on Telegram and email the moment a lead lands. It
 * cannot do the same over WhatsApp: that needs a socket which outlives a
 * serverless invocation, so the only client able to send is this worker, on a
 * laptop that is not always on. So it pulls rather than being pushed to, and a
 * lead that arrives while the laptop is off is forwarded when it next starts.
 *
 * The site's own alerts are unaffected and remain the reliable channel. This
 * is the convenient one.
 */

const COLLECTION = "whatsapp_leads_sent";

/** Long enough that a lead cannot come round again; short enough that the
 *  collection does not grow for ever. */
const TTL_DAYS = 180;

export interface Lead {
  id: string;
  createdAt: string;
  /** Ready-made text, built by the site so every channel describes a lead the
   *  same way. */
  summary: string;
}

export async function fetchRecentLeads(): Promise<Lead[]> {
  const res = await fetch(config.leadsUrl, {
    headers: { Authorization: `Bearer ${config.cronSecret}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`leads endpoint returned HTTP ${res.status}`);

  const data = (await res.json()) as { leads?: Lead[] };
  return data.leads ?? [];
}

interface SentDoc {
  _id: string;
  sentAt: Date;
}

export class LeadLog {
  private readonly col: Collection<SentDoc>;

  constructor(db: Db) {
    this.col = db.collection<SentDoc>(COLLECTION);
  }

  async init(): Promise<void> {
    await this.col.createIndex(
      { sentAt: 1 },
      { expireAfterSeconds: TTL_DAYS * 86_400, name: "sentAt_ttl" },
    );
  }

  async isEmpty(): Promise<boolean> {
    return (await this.col.countDocuments({}, { limit: 1 })) === 0;
  }

  async unsent(leads: Lead[]): Promise<Lead[]> {
    if (leads.length === 0) return [];
    const ids = leads.map((l) => l.id);
    const already = await this.col
      .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
      .toArray();
    const seen = new Set(already.map((d) => d._id));
    return leads.filter((l) => !seen.has(l.id));
  }

  /** Called after a send, never before: a failed send must be retried, not
   *  silently dropped. */
  async markSent(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const sentAt = new Date();
    await this.col.bulkWrite(
      ids.map((id) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sentAt } }, upsert: true },
      })),
      { ordered: false },
    );
  }
}

/** A phone number as a WhatsApp JID. A group is `…@g.us`; a person is this. */
export function personJid(number: string): string {
  return `${number.replace(/\D/g, "")}@s.whatsapp.net`;
}
