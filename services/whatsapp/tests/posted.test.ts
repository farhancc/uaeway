import { describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import type { BoardJob } from "../src/board.js";
import { PostedLog } from "../src/posted.js";

/**
 * Not sending the same job twice.
 *
 * The worker posts every hour from a pool that changes slowly, so this log is
 * the only thing standing between the group and the same five listings sixteen
 * times a day.
 *
 * Mongo is replaced with an in-memory stand-in rather than a running server, so
 * what these tests pin is the behaviour the worker depends on: which listings
 * come back, and that marking is additive.
 */

function fakeDb() {
  const docs = new Map<string, { _id: string; postedAt: Date }>();
  const indexes: Record<string, unknown>[] = [];

  const db = {
    collection: () => ({
      createIndex: async (keys: unknown, opts: Record<string, unknown>) => {
        indexes.push({ keys, ...opts });
        return "ok";
      },
      find: (filter: { _id: { $in: string[] } }) => ({
        toArray: async () =>
          filter._id.$in.filter((id) => docs.has(id)).map((id) => ({ _id: id })),
      }),
      bulkWrite: async (ops: { updateOne: { filter: { _id: string }; update: { $set: { postedAt: Date } } } }[]) => {
        for (const op of ops) {
          docs.set(op.updateOne.filter._id, {
            _id: op.updateOne.filter._id,
            postedAt: op.updateOne.update.$set.postedAt,
          });
        }
        return { ok: 1 };
      },
    }),
  } as unknown as Db;

  return { db, docs, indexes };
}

const job = (slug: string): BoardJob => ({
  slug,
  title: slug,
  company: null,
  emirate: null,
  category: null,
  summary: null,
  salaryText: null,
  postedAt: null,
  url: `https://example.test/${slug}`,
});

describe("the posted log", () => {
  it("returns everything on a cold log", async () => {
    const { db } = fakeDb();
    const log = new PostedLog(db);

    const out = await log.unposted([job("a"), job("b")]);
    expect(out.map((j) => j.slug)).toEqual(["a", "b"]);
  });

  it("holds back only what was sent, keeping the rest in order", async () => {
    const { db } = fakeDb();
    const log = new PostedLog(db);

    await log.markPosted(["b"]);
    const out = await log.unposted([job("a"), job("b"), job("c")]);

    expect(out.map((j) => j.slug)).toEqual(["a", "c"]);
  });

  it("holds back everything once everything has been sent", async () => {
    const { db } = fakeDb();
    const log = new PostedLog(db);

    await log.markPosted(["a", "b"]);
    expect(await log.unposted([job("a"), job("b")])).toEqual([]);
  });

  it("adds to the log rather than replacing it", async () => {
    // Each hour marks only its own batch; an overwrite would let the earlier
    // ones come round again.
    const { db, docs } = fakeDb();
    const log = new PostedLog(db);

    await log.markPosted(["a"]);
    await log.markPosted(["b"]);

    expect([...docs.keys()].sort()).toEqual(["a", "b"]);
  });

  it("marking the same slug twice is harmless", async () => {
    const { db, docs } = fakeDb();
    const log = new PostedLog(db);

    await log.markPosted(["a"]);
    await log.markPosted(["a"]);

    expect(docs.size).toBe(1);
  });

  it("does nothing, and asks nothing, for an empty list", async () => {
    const { db, docs } = fakeDb();
    const log = new PostedLog(db);

    expect(await log.unposted([])).toEqual([]);
    await log.markPosted([]);
    expect(docs.size).toBe(0);
  });

  it("expires entries well after the site stops showing a listing", async () => {
    // The site deletes listings after 60 days. If this window were shorter
    // than that, a listing still on the board could come round again.
    const { db, indexes } = fakeDb();
    await new PostedLog(db).init();

    const ttl = indexes[0]?.expireAfterSeconds as number;
    expect(ttl / 86_400).toBeGreaterThan(60);
  });
});
