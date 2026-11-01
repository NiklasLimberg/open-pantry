import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "#/test/database.ts";

// Runs against a database of its own (see src/test/database.ts).
const database = await createTestDatabase();
vi.stubEnv("DATABASE_URL", database.url);
const { db } = await import("#/db/index.ts");
const { taskRun } = await import("#/db/schema.ts");
const { getTaskRun, trackTaskRun } = await import("./task-run.ts");

afterAll(async () => {
  await db.$client.end();
  await database.drop();
});

/** A piece of work that finishes when `release` is called. */
function gate<T>(result: T) {
  let release!: () => void;
  const open = new Promise<void>((resolve) => (release = resolve));
  return { release, work: () => open.then(() => result) };
}

describe("trackTaskRun", () => {
  it("records a run with its progress and its result", async () => {
    const run = await trackTaskRun("records", { full: true }, async (progress) => {
      await progress(1, 4);
      await progress(4, 4);
      return "done";
    });

    expect(await run?.finished).toBe("done");
    expect(await getTaskRun("records")).toMatchObject({
      status: "succeeded",
      full: true,
      processed: 4,
      total: 4,
      error: null,
    });
    expect((await getTaskRun("records"))?.finishedAt).toBeInstanceOf(Date);
  });

  it("does not start a second run while one is in progress", async () => {
    const first = gate("first");
    const running = await trackTaskRun("overlap", {}, first.work);
    const second = vi.fn<() => Promise<string>>(() => Promise.resolve("second"));

    expect(await trackTaskRun("overlap", {}, second)).toBeNull();
    expect(second).not.toHaveBeenCalled();

    first.release();
    await running?.finished;
    const again = await trackTaskRun("overlap", {}, second);
    expect(await again?.finished).toBe("second");
  });

  it("tracks different tasks independently", async () => {
    const a = gate("a");
    const running = await trackTaskRun("task-a", {}, a.work);
    const other = await trackTaskRun("task-b", {}, () => Promise.resolve("b"));

    expect(await other?.finished).toBe("b");
    a.release();
    await running?.finished;
  });

  it("records a failure and passes the error on", async () => {
    const run = await trackTaskRun("fails", {}, () => Promise.reject(new Error("upstream down")));

    await expect(run?.finished).rejects.toThrow("upstream down");
    expect(await getTaskRun("fails")).toMatchObject({
      status: "failed",
      error: "upstream down",
    });
    // A failed run does not block the next one.
    expect(await trackTaskRun("fails", {}, () => Promise.resolve(1))).not.toBeNull();
  });

  it("takes over a run that stopped reporting, without the old run overwriting the new one", async () => {
    const lost = gate("lost");
    const first = await trackTaskRun("stale", {}, lost.work);
    // No progress for longer than the allowed time, for example after a restart.
    await db
      .update(taskRun)
      .set({ updatedAt: new Date(Date.now() - 11 * 60 * 1000) })
      .where(eq(taskRun.name, "stale"));

    // Runs are told apart by their start time, so make sure the new one starts later.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const next = gate("next");
    const second = await trackTaskRun("stale", { full: true }, next.work);
    expect(second).not.toBeNull();

    lost.release();
    await first?.finished;
    // The lost run finishing late leaves the row of the run that replaced it alone.
    expect(await getTaskRun("stale")).toMatchObject({ status: "running", full: true });

    next.release();
    await second?.finished;
    expect(await getTaskRun("stale")).toMatchObject({ status: "succeeded" });
  });

  it("does not take over a run that is still reporting", async () => {
    const slow = gate("slow");
    const running = await trackTaskRun("slow", {}, async (progress) => {
      await progress(1, 2);
      return slow.work();
    });

    expect(await trackTaskRun("slow", {}, () => Promise.resolve("x"))).toBeNull();
    slow.release();
    await running?.finished;
  });
});
