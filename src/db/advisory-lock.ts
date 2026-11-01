import { sql } from "drizzle-orm";

import { db } from "./index.ts";

/**
 * Runs `work` while holding a Postgres advisory lock, so concurrent callers with the same key take
 * turns, even across processes. The lock lives on its own transaction and is released when `work`
 * finishes or throws; `work` may use `db` normally, those queries are not part of that transaction.
 */
export async function withAdvisoryLock<T>(key: number, work: () => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${key})`);
    return await work();
  });
}
