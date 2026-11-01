import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "#/test/database.ts";

import type { AddPurchaseInput, NewProductInput } from "./stock.schemas.ts";

vi.mock("@tanstack/react-start/server", () => ({ setResponseStatus: () => {} }));

// Runs against a database of its own (see src/test/database.ts).
const database = await createTestDatabase();
vi.stubEnv("DATABASE_URL", database.url);
const { db } = await import("#/db/index.ts");
const { batch, location, organization, product } = await import("#/db/schema.ts");
const { applyBatchUpdate, savePurchase } = await import("./stock.mutations.ts");

const run = crypto.randomUUID();
const pantryId = `test-${run}`;
const otherPantryId = `test-other-${run}`;
const locationId = `loc-${run}`;
const otherLocationId = `loc-other-${run}`;
const barcode = "4006381333931";

const uuid = () => crypto.randomUUID();

const newProduct = (overrides: Partial<NewProductInput> = {}): NewProductInput => ({
  id: uuid(),
  barcode,
  name: null,
  brand: null,
  trackUnit: "pack",
  packageAmount: null,
  packageUnit: null,
  ...overrides,
});

const purchase = (productOverrides: Partial<NewProductInput> = {}): AddPurchaseInput => {
  const created = newProduct(productOverrides);
  return {
    productId: created.id,
    newProduct: created,
    batches: [
      {
        id: uuid(),
        locationId,
        quarters: 4,
        opened: false,
        dateKind: "mhd",
        date: "2027-01-31",
      },
    ],
  };
};

beforeAll(async () => {
  await db.insert(organization).values(
    [pantryId, otherPantryId].map((id) => ({
      id,
      name: id,
      slug: id,
      createdAt: new Date(),
    })),
  );
  await db.insert(location).values([
    { id: locationId, pantryId, name: "Cupboard" },
    { id: otherLocationId, pantryId: otherPantryId, name: "Cupboard" },
  ]);
});

afterAll(async () => {
  await db.$client.end();
  await database.drop();
});

describe("savePurchase: which product a purchase belongs to", () => {
  const buy = (productId: string, input?: NewProductInput) =>
    savePurchase(db, pantryId, {
      productId,
      newProduct: input,
      batches: [
        { id: uuid(), locationId, quarters: 4, opened: false, dateKind: "none", date: null },
      ],
    });

  it("creates the product the client described", async () => {
    const input = newProduct({ barcode: null, name: "Bread" });
    expect(await buy(input.id, input)).toEqual({ productId: input.id });
    const [row] = await db.select().from(product).where(eq(product.id, input.id));
    expect(row).toMatchObject({ pantryId, name: "Bread", barcode: null });
  });

  it("uses the pantry's existing product when the client names one", async () => {
    const input = newProduct({ barcode: null, name: "Rice" });
    await buy(input.id, input);
    expect(await buy(input.id)).toEqual({ productId: input.id });
  });

  it("uses the product another device created for the same barcode", async () => {
    const first = newProduct();
    await buy(first.id, first);
    const second = newProduct();
    expect(await buy(second.id, second)).toEqual({ productId: first.id });
  });

  it("rejects what it cannot create", async () => {
    const id = uuid();
    await expect(buy(id)).rejects.toThrow("Unknown product.");
    await expect(buy(id, newProduct())).rejects.toThrow("don't match");
    const unnamed = newProduct({ barcode: null });
    await expect(buy(unnamed.id, unnamed)).rejects.toThrow("needs a name");
    const invalid = newProduct({ barcode: "123" });
    await expect(buy(invalid.id, invalid)).rejects.toThrow("not a valid barcode");
  });

  it("does not see another pantry's product", async () => {
    const id = uuid();
    await db.insert(product).values({ id, pantryId: otherPantryId, name: "Theirs" });
    await expect(buy(id)).rejects.toThrow("Unknown product.");
  });
});

describe("savePurchase", () => {
  it("is safe to replay", async () => {
    const input = purchase({ barcode: null, name: "Pasta" });
    await savePurchase(db, pantryId, input);
    await savePurchase(db, pantryId, input);
    const rows = await db.select().from(batch).where(eq(batch.productId, input.productId));
    expect(rows).toHaveLength(1);
  });

  it("marks a package below Full as opened and remembers the printed date type", async () => {
    const input = purchase({ barcode: null, name: "Milk" });
    input.batches[0] = { ...input.batches[0], quarters: 2, dateKind: "use_by" };
    await savePurchase(db, pantryId, input);
    const [row] = await db.select().from(batch).where(eq(batch.id, input.batches[0].id));
    expect(row.opened).toBe(true);
    const [saved] = await db.select().from(product).where(eq(product.id, input.productId));
    expect(saved.printedDateKind).toBe("use_by");
  });

  it("rejects a location from another pantry and saves nothing", async () => {
    const input = purchase({ barcode: null, name: "Tea" });
    input.batches[0] = { ...input.batches[0], locationId: otherLocationId };
    await expect(savePurchase(db, pantryId, input)).rejects.toThrow("Unknown location.");
    const rows = await db.select().from(product).where(eq(product.id, input.productId));
    expect(rows).toHaveLength(0);
  });
});

describe("applyBatchUpdate", () => {
  async function insertBatch() {
    const input = purchase({ barcode: null, name: "Flour" });
    await savePurchase(db, pantryId, input);
    return input.batches[0].id;
  }

  it("updates against the current revision and bumps it", async () => {
    const id = await insertBatch();
    expect(await applyBatchUpdate(db, pantryId, { id, baseRevision: 1, quarters: 2 })).toEqual({
      ok: true,
      revision: 2,
    });
    const [row] = await db.select().from(batch).where(eq(batch.id, id));
    expect(row).toMatchObject({ quarters: 2, opened: true, revision: 2 });
  });

  it("reports a stale revision as a conflict", async () => {
    const id = await insertBatch();
    await applyBatchUpdate(db, pantryId, { id, baseRevision: 1, quarters: 3 });
    expect(await applyBatchUpdate(db, pantryId, { id, baseRevision: 1, quarters: 1 })).toEqual({
      ok: false,
      reason: "conflict",
    });
  });

  it("reports a discarded or foreign batch as gone", async () => {
    const id = await insertBatch();
    await applyBatchUpdate(db, pantryId, { id, baseRevision: 1, discard: true });
    expect(await applyBatchUpdate(db, pantryId, { id, baseRevision: 2, quarters: 1 })).toEqual({
      ok: false,
      reason: "gone",
    });
    const foreign = await insertBatch();
    expect(
      await applyBatchUpdate(db, otherPantryId, { id: foreign, baseRevision: 1, quarters: 1 }),
    ).toEqual({ ok: false, reason: "gone" });
  });
});
