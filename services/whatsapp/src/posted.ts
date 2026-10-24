import type { Collection, Db } from "mongodb";
import type { BoardJob } from "./board.js";

/**
 * Which listings have already gone to the group.
 *
 * The worker posts every hour from a pool of approved listings that changes
 * slowly, so without this it would send the same five jobs sixteen times a
 * day. The site cannot answer "what have you already posted" — it does not
 * post, and holding the state of a channel it has no part in would be the
 * wrong place for it — so the worker keeps its own record.
 *
 * Mongo, in the same database as the WhatsApp session, because that is already
 * the one piece of durable storage this worker has.
 */

const COLLECTION = "whatsapp_posted";

/**
 * Long enough that a listing can never come round again while it is still on
 * the site: the site deletes listings after 60 days (`JOB_RETENTION_DAYS`) and
 * stops showing them sooner. Three times that leaves no room for an argument,
 * and still keeps the collection from growing for ever.
 */
const TTL_DAYS = 180;

interface PostedDoc {
  _id: string;
  postedAt: Date;
}

export class PostedLog {
  private readonly col: Collection<PostedDoc>;

  constructor(db: Db) {
    this.col = db.collection<PostedDoc>(COLLECTION);
  }

  /** Creates the expiry index. Safe to call on every start. */
  async init(): Promise<void> {
    await this.col.createIndex(
      { postedAt: 1 },
      { expireAfterSeconds: TTL_DAYS * 86_400, name: "postedAt_ttl" },
    );
  }

  /** The jobs from this pool that have not been sent, newest first as given. */
  async unposted(jobs: BoardJob[]): Promise<BoardJob[]> {
    if (jobs.length === 0) return [];

    const slugs = jobs.map((j) => j.slug);
    const already = await this.col.find({ _id: { $in: slugs } }, { projection: { _id: 1 } }).toArray();
    const seen = new Set(already.map((d) => d._id));

    return jobs.filter((j) => !seen.has(j.slug));
  }

  /**
   * Records what was sent.
   *
   * Called *after* the message goes out, not before. If the process dies in
   * between, a listing can be posted twice — which is a far smaller harm than
   * marking first and discovering that a send failed, because that loses the
   * listing silently and for good.
   */
  async markPosted(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;

    const postedAt = new Date();
    await this.col.bulkWrite(
      slugs.map((slug) => ({
        updateOne: {
          filter: { _id: slug },
          update: { $set: { postedAt } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
}
