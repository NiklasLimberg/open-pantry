import { and, eq, lt, ne, or } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { taskRun } from "#/db/schema.ts";

// Server-only. Records the latest run of a background task so the UI can show when it last ran
// and how far a running one has got.

/** A run that has not reported progress for this long is assumed lost (for example a restart). */
const staleRunMs = 10 * 60 * 1000;

export type TaskRun = typeof taskRun.$inferSelect;

export async function getTaskRun(name: string): Promise<TaskRun | null> {
  const [row] = await db.select().from(taskRun).where(eq(taskRun.name, name));
  return row ?? null;
}

/**
 * Records a run of `work` with its progress. Resolves once the run is claimed (a database error
 * rejects here), with a promise for the finished work. Resolves null without running when the same
 * task is already running, so the schedule and a manual trigger never overlap.
 */
export async function trackTaskRun<T>(
  name: string,
  options: { full?: boolean },
  work: (progress: (processed: number, total: number) => Promise<void>) => Promise<T>,
): Promise<{ finished: Promise<T> } | null> {
  const startedAt = new Date();
  const values = {
    name,
    status: "running" as const,
    startedAt,
    updatedAt: startedAt,
    finishedAt: null,
    full: options.full ?? false,
    total: 0,
    processed: 0,
    error: null,
  };
  const claimed = await db
    .insert(taskRun)
    .values(values)
    .onConflictDoUpdate({
      target: taskRun.name,
      set: values,
      setWhere: or(
        ne(taskRun.status, "running"),
        lt(taskRun.updatedAt, new Date(startedAt.getTime() - staleRunMs)),
      ),
    })
    .returning({ name: taskRun.name });
  if (claimed.length === 0) {
    return null;
  }

  const mine = and(eq(taskRun.name, name), eq(taskRun.startedAt, startedAt));
  const finished = (async () => {
    try {
      const result = await work(async (processed, total) => {
        await db.update(taskRun).set({ processed, total, updatedAt: new Date() }).where(mine);
      });
      await db.update(taskRun).set({ status: "succeeded", finishedAt: new Date() }).where(mine);
      return result;
    } catch (error) {
      await db
        .update(taskRun)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        })
        .where(mine);
      throw error;
    }
  })();
  return { finished };
}
