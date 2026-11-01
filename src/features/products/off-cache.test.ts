import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "#/test/database.ts";

import type { OffResult } from "./open-food-facts.ts";

type Fetch = (barcode: string, options?: { background?: boolean }) => Promise<OffResult>;

const fetchOffProduct = vi.fn<Fetch>();
const isThrottled = vi.fn<() => boolean>();
vi.mock("./open-food-facts.ts", () => ({
  fetchOffProduct: (...args: Parameters<Fetch>) => fetchOffProduct(...args),
  isThrottled: () => isThrottled(),
}));

// Runs against a database of its own (see src/test/database.ts).
const database = await createTestDatabase();
vi.stubEnv("DATABASE_URL", database.url);
const { db } = await import("#/db/index.ts");
const { offProduct, organization, product } = await import("#/db/schema.ts");
const cache = await import("./off-cache.ts");
const { getTaskRun } = await import("./task-run.ts");

const DAY = 24 * 60 * 60 * 1000;
const startedAt = Date.now();
const ago = (ms: number) => new Date(startedAt - ms);

const found: OffResult = {
  kind: "found",
  product: {
    name: "Nutella",
    names: { de: "Nutella DE" },
    brand: "Ferrero",
    quantity: "400 g",
    categories: ["en:spreads"],
    imageUrl: null,
    storageInstructions: null,
  },
};

async function hold(barcode: string | null, pantryId = "home") {
  await db.insert(product).values({ id: crypto.randomUUID(), pantryId, barcode });
}

async function cached(barcode: string, status: "found" | "not_found", fetchedAt: Date) {
  await db.insert(offProduct).values({ barcode, status, fetchedAt });
}

beforeEach(async () => {
  await db.delete(product);
  await db.delete(offProduct);
  await db
    .insert(organization)
    .values(["home", "cabin"].map((id) => ({ id, name: id, slug: id, createdAt: new Date() })))
    .onConflictDoNothing();
  fetchOffProduct.mockReset();
  isThrottled.mockReset().mockReturnValue(false);
});

afterAll(async () => {
  await db.$client.end();
  await database.drop();
});

/** Held barcodes: A has no cache row, B..E are cached at different ages, the rest do not count. */
async function seedMixedAges() {
  await Promise.all(["A", "B", "C", "D", "E"].map((barcode) => hold(barcode)));
  await hold(null);
  await cached("B", "found", ago(8 * DAY)); // older than a week: stale
  await cached("C", "found", ago(6 * DAY)); // fresh
  await cached("D", "not_found", ago(2 * DAY)); // older than a day: stale
  await cached("E", "not_found", ago(12 * 60 * 60 * 1000)); // fresh
  await cached("G", "found", ago(30 * DAY)); // cached, but nobody holds it
}

/** Runs the refresh like the schedule does, and returns what it fetched, in order. */
async function refresh(options?: { all?: boolean }) {
  const run = await cache.runProductRefresh(options);
  const result = await run?.finished;
  return { result, fetched: fetchOffProduct.mock.calls.map(([barcode]) => barcode) };
}

describe("which barcodes the refresh fetches", () => {
  beforeEach(() => {
    fetchOffProduct.mockResolvedValue(found);
  });

  it("takes held barcodes that are missing or past their age, never-fetched first, then oldest", async () => {
    await seedMixedAges();
    expect((await refresh()).fetched).toEqual(["A", "B", "D"]);
  });

  it("fetches a barcode once, however many pantries hold it", async () => {
    await hold("A", "home");
    await hold("A", "cabin");
    expect((await refresh()).fetched).toEqual(["A"]);
  });

  it("fetches at most 20 per scheduled run", async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => hold(`bulk${String(i).padStart(2, "0")}`)),
    );
    const { result, fetched } = await refresh();

    expect(fetched).toHaveLength(20);
    expect(result).toEqual({ due: 20, refreshed: 20 });
  });

  it("with `all` fetches every held barcode, fresh ones too", async () => {
    await seedMixedAges();
    expect((await refresh({ all: true })).fetched).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("does not start a second run while one is in progress", async () => {
    await hold("A");
    let release!: () => void;
    fetchOffProduct.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve(found))),
    );

    const first = await cache.runProductRefresh();
    expect(await cache.runProductRefresh()).toBeNull();
    await vi.waitFor(() => expect(fetchOffProduct).toHaveBeenCalled());
    release();
    await first?.finished;
  });
});

describe("getOffFreshness", () => {
  it("counts only what some pantry holds", async () => {
    await seedMixedAges();
    expect(await cache.getOffFreshness()).toEqual({
      held: 5,
      missing: 1,
      stale: 2,
      oldest: ago(8 * DAY),
      newest: ago(12 * 60 * 60 * 1000),
    });
  });

  it("reports an empty pantry", async () => {
    expect(await cache.getOffFreshness()).toEqual({
      held: 0,
      missing: 0,
      stale: 0,
      oldest: null,
      newest: null,
    });
  });
});

describe("getOffProduct", () => {
  it("answers from the cache while the row is fresh", async () => {
    await cached("F", "found", new Date());
    const row = await cache.getOffProduct("F");

    expect(row?.status).toBe("found");
    expect(fetchOffProduct).not.toHaveBeenCalled();
  });

  it("fetches and stores when nothing is cached", async () => {
    fetchOffProduct.mockResolvedValue(found);
    const row = await cache.getOffProduct("N");

    expect(row).toMatchObject({ status: "found", name: "Nutella", names: { de: "Nutella DE" } });
    const [stored] = await db.select().from(offProduct).where(eq(offProduct.barcode, "N"));
    expect(stored).toMatchObject({ brand: "Ferrero", quantity: "400 g" });
  });

  it("caches an unknown barcode as not found, without product details", async () => {
    fetchOffProduct.mockResolvedValue({ kind: "not_found" });
    const row = await cache.getOffProduct("U");

    expect(row).toMatchObject({ status: "not_found", name: null, names: {}, categories: [] });
  });

  it("replaces a stale row with the fresh answer", async () => {
    await cached("S", "found", ago(30 * DAY));
    fetchOffProduct.mockResolvedValue({ kind: "not_found" });

    expect((await cache.getOffProduct("S"))?.status).toBe("not_found");
    const rows = await db.select().from(offProduct).where(eq(offProduct.barcode, "S"));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("not_found");
  });

  it("falls back to the stale row when Open Food Facts cannot be reached", async () => {
    await cached("S", "found", ago(30 * DAY));
    fetchOffProduct.mockResolvedValue({ kind: "unavailable" });

    expect((await cache.getOffProduct("S"))?.status).toBe("found");
  });

  it("returns nothing, and stores nothing, when it cannot be reached and nothing is cached", async () => {
    fetchOffProduct.mockResolvedValue({ kind: "unavailable" });

    expect(await cache.getOffProduct("X")).toBeNull();
    expect(await db.select().from(offProduct)).toHaveLength(0);
  });
});

describe("a refresh run", () => {
  const barcodes = ["b1", "b2", "b3", "b4", "b5", "b6"];

  beforeEach(async () => {
    await Promise.all(barcodes.map((barcode) => hold(barcode)));
  });

  it("fetches every due barcode as background work and records its progress", async () => {
    fetchOffProduct.mockResolvedValue(found);
    const { result } = await refresh();

    expect(result).toEqual({ due: 6, refreshed: 6 });
    expect(fetchOffProduct).toHaveBeenCalledWith("b1", { background: true });
    expect(await getTaskRun(cache.refreshTaskName)).toMatchObject({
      status: "succeeded",
      processed: 6,
      total: 6,
    });
  });

  it("stops after three failures in a row", async () => {
    fetchOffProduct.mockResolvedValue({ kind: "unavailable" });
    const { result } = await refresh();

    expect(result).toEqual({ due: 6, refreshed: 0 });
    expect(fetchOffProduct).toHaveBeenCalledTimes(3);
  });

  it("keeps going when failures are interrupted by a success", async () => {
    fetchOffProduct
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce(found)
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce(found);
    const { result } = await refresh();

    expect(result).toEqual({ due: 6, refreshed: 2 });
    expect(fetchOffProduct).toHaveBeenCalledTimes(6);
  });

  it("stops at once when the API is throttling", async () => {
    fetchOffProduct.mockResolvedValue({ kind: "unavailable" });
    isThrottled.mockReturnValue(true);
    await refresh();

    expect(fetchOffProduct).toHaveBeenCalledTimes(1);
  });
});
