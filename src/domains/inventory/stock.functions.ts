import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, type Database, type Transaction } from "#/db/index.ts";
import { batch, dateKinds, location, offProduct, product, trackUnits } from "#/db/schema.ts";

import { requirePermission, type PantryAccess } from "#/domains/pantry/pantry-access.ts";
import { roleCan } from "#/domains/pantry/permissions.ts";
import { pantryMiddleware } from "#/domains/pantry/pantry.functions.ts";
import { normalizeBarcode } from "#/domains/products/barcode.ts";
import { getOffProduct } from "#/domains/products/off-cache.ts";
import { parsePackageSize } from "#/domains/products/quantity.ts";

// Every handler resolves the pantry from the session (pantryMiddleware), checks the role, and
// filters by that pantry ID; IDs sent by the client are never trusted to select a pantry.

const defaultLocations = ["Cupboard", "Fridge", "Freezer"];

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  // Date rolls 2025-02-31 over to March, so the date must survive a round trip unchanged.
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "Not a calendar date.");

const batchInput = z
  .object({
    id: z.uuid(),
    locationId: z.string().min(1),
    quarters: z.number().int().min(0).max(4),
    opened: z.boolean(),
    dateKind: z.enum(dateKinds),
    date: calendarDate.nullable(),
  })
  .refine(
    (b) =>
      (b.dateKind === "mhd" || b.dateKind === "use_by" || b.dateKind === "estimate") ===
      (b.date !== null),
    {
      message: "A date is required for printed dates and estimates, and only for those.",
    },
  );

const newProductInput = z
  .object({
    id: z.uuid(),
    barcode: z.string().nullable(),
    name: z.string().trim().min(1).max(200).nullable(),
    brand: z.string().trim().max(200).nullable(),
    trackUnit: z.enum(trackUnits),
    packageAmount: z.number().int().positive().nullable(),
    packageUnit: z.enum(["g", "ml"]).nullable(),
  })
  .refine((p) => (p.packageAmount === null) === (p.packageUnit === null), {
    message: "A package size needs both an amount and a unit.",
  });

export type StockLocation = { id: string; name: string };

export type StockProduct = {
  id: string;
  barcode: string | null;
  /** The name to show: the user's own, else Open Food Facts', else null. */
  name: string | null;
  brand: string | null;
  trackUnit: (typeof trackUnits)[number];
  /** Confirmed package size. Null until the user confirms one. */
  packageAmount: number | null;
  packageUnit: "g" | "ml" | null;
  /** Parsed from the Open Food Facts quantity text; only offered for confirmation. */
  suggestedPackage: { amount: number; unit: "g" | "ml" } | null;
  imageUrl: string | null;
  storageInstructions: string | null;
  /** Set when any shown field came from Open Food Facts. */
  source: "openfoodfacts" | null;
};

export type StockBatch = {
  id: string;
  productId: string;
  locationId: string;
  quarters: number;
  opened: boolean;
  dateKind: (typeof dateKinds)[number];
  date: string | null;
  revision: number;
};

async function ensureLocations(pantryId: string) {
  await db
    .insert(location)
    .values(
      defaultLocations.map((name, sortOrder) => ({
        id: crypto.randomUUID(),
        pantryId,
        name,
        sortOrder,
      })),
    )
    .onConflictDoNothing();
}

async function readLocations(access: PantryAccess): Promise<StockLocation[]> {
  const read = () =>
    db
      .select({ id: location.id, name: location.name })
      .from(location)
      .where(eq(location.pantryId, access.pantryId))
      .orderBy(asc(location.sortOrder), asc(location.name));
  const rows = await read();
  // Only editors create the defaults; a viewer of a brand-new pantry just sees none.
  if (rows.length > 0 || !roleCan(access.role, { inventory: ["create"] })) return rows;
  await ensureLocations(access.pantryId);
  return read();
}

async function readProducts(access: PantryAccess): Promise<StockProduct[]> {
  const rows = await db
    .select({ product, off: offProduct })
    .from(product)
    .leftJoin(offProduct, eq(offProduct.barcode, product.barcode))
    .where(eq(product.pantryId, access.pantryId));
  return rows.map(({ product: p, off }) => {
    const found = off?.status === "found" ? off : null;
    const name = p.name ?? found?.name ?? null;
    const brand = p.brand ?? found?.brand ?? null;
    return {
      id: p.id,
      barcode: p.barcode,
      name,
      brand,
      trackUnit: p.trackUnit,
      packageAmount: p.packageAmount,
      packageUnit: p.packageUnit,
      suggestedPackage: parsePackageSize(found?.quantity),
      imageUrl: found?.imageUrl ?? null,
      storageInstructions: found?.storageInstructions ?? null,
      source:
        (p.name === null && found?.name) || (p.brand === null && found?.brand)
          ? "openfoodfacts"
          : null,
    };
  });
}

async function readBatches(access: PantryAccess): Promise<StockBatch[]> {
  return db
    .select({
      id: batch.id,
      productId: batch.productId,
      locationId: batch.locationId,
      quarters: batch.quarters,
      opened: batch.opened,
      dateKind: batch.dateKind,
      date: batch.date,
      revision: batch.revision,
    })
    .from(batch)
    .where(and(eq(batch.pantryId, access.pantryId), isNull(batch.discardedAt)));
}

export type StockData = {
  locations: StockLocation[];
  products: StockProduct[];
  batches: StockBatch[];
};

/** The whole pantry in one request; it is small enough to load at once. */
export const getStock = createServerFn({ method: "GET" })
  .middleware([pantryMiddleware])
  .handler(async ({ context: { access } }): Promise<StockData> => {
    requirePermission(access, { inventory: ["read"] });
    const [locations, products, batches] = await Promise.all([
      readLocations(access),
      readProducts(access),
      readBatches(access),
    ]);
    return { locations, products, batches };
  });

export type BarcodeLookup =
  | {
      status: "found";
      barcode: string;
      name: string | null;
      brand: string | null;
      quantity: string | null;
      suggestedPackage: { amount: number; unit: "g" | "ml" } | null;
      imageUrl: string | null;
      storageInstructions: string | null;
      /** The pantry's own product for this barcode, when it already has one. */
      productId: string | null;
    }
  | { status: "not_found"; barcode: string; productId: string | null }
  /** Open Food Facts could not be reached: continue with manual details and enrich later. */
  | { status: "unavailable"; barcode: string; productId: string | null };

/** Resolves a scanned or typed barcode. Never fails because Open Food Facts is down. */
export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(z.object({ barcode: z.string().max(32) }))
  .handler(async ({ data, context: { access } }): Promise<BarcodeLookup> => {
    requirePermission(access, { inventory: ["create"] });
    const barcode = normalizeBarcode(data.barcode);
    if (!barcode) throw new Error("That is not a valid EAN or UPC barcode.");
    const productId = await findProductIdByBarcode(db, access.pantryId, barcode);
    const off = await getOffProduct(barcode);
    if (!off) return { status: "unavailable", barcode, productId };
    if (off.status === "not_found") return { status: "not_found", barcode, productId };
    return {
      status: "found",
      barcode,
      name: off.name,
      brand: off.brand,
      quantity: off.quantity,
      suggestedPackage: parsePackageSize(off.quantity),
      imageUrl: off.imageUrl,
      storageInstructions: off.storageInstructions,
      productId,
    };
  });

async function findProductIdByBarcode(
  executor: Pick<Database, "select">,
  pantryId: string,
  barcode: string,
) {
  const [row] = await executor
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.pantryId, pantryId), eq(product.barcode, barcode)));
  return row?.id ?? null;
}

/**
 * The ID of the product a purchase belongs to: the one the client named when the pantry has it,
 * otherwise a new one created from `newProduct`. The product for a barcode is unique per pantry,
 * so one created meanwhile by another request or device is used instead.
 */
async function resolveProductId(
  tx: Transaction,
  pantryId: string,
  requestedId: string,
  newProduct: z.infer<typeof newProductInput> | undefined,
) {
  const [existing] = await tx
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.pantryId, pantryId), eq(product.id, requestedId)));
  if (existing) return existing.id;

  if (!newProduct || newProduct.id !== requestedId) throw new Error("Unknown product.");
  const barcode = newProduct.barcode === null ? null : normalizeBarcode(newProduct.barcode);
  if (newProduct.barcode !== null && !barcode) throw new Error("That is not a valid barcode.");
  if (!barcode && !newProduct.name) throw new Error("A product without a barcode needs a name.");

  const sameBarcode = barcode ? await findProductIdByBarcode(tx, pantryId, barcode) : null;
  if (sameBarcode) return sameBarcode;

  const inserted = await tx
    .insert(product)
    .values({ ...newProduct, barcode, pantryId })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (inserted.length > 0) return newProduct.id;

  // A concurrent request created this barcode between the check and the insert.
  const raced = barcode ? await findProductIdByBarcode(tx, pantryId, barcode) : null;
  if (!raced) throw new Error("Unknown product.");
  return raced;
}

/**
 * Adds one or more packages. Safe to replay: the client generates every ID, so repeating a
 * request after a lost response inserts nothing twice.
 */
export const addPurchase = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(
    z.object({
      productId: z.string().min(1),
      /** Sent when the pantry may not have this product yet. */
      newProduct: newProductInput.optional(),
      batches: z.array(batchInput).min(1).max(50),
    }),
  )
  .handler(async ({ data, context: { access } }) => {
    requirePermission(access, { inventory: ["create"] });
    const { pantryId } = access;

    const locationIds = [...new Set(data.batches.map((b) => b.locationId))];
    const known = await db
      .select({ id: location.id })
      .from(location)
      .where(and(eq(location.pantryId, pantryId), inArray(location.id, locationIds)));
    if (known.length !== locationIds.length) throw new Error("Unknown location.");

    return db.transaction(async (tx) => {
      const productId = await resolveProductId(tx, pantryId, data.productId, data.newProduct);
      await tx
        .insert(batch)
        .values(
          // A batch below Full is opened, whatever the client sent.
          data.batches.map((b) => ({
            ...b,
            opened: b.opened || b.quarters < 4,
            pantryId,
            productId,
          })),
        )
        .onConflictDoNothing({ target: batch.id });
      return { productId };
    });
  });

export type UpdateResult = { ok: true; revision: number } | { ok: false; reason: "conflict" };

/**
 * Absolute update against the revision the client last saw. A stale revision is a conflict the
 * user resolves; counts are never overwritten silently (docs/technical-plan.md).
 */
export const updateBatch = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      baseRevision: z.number().int().positive(),
      quarters: z.number().int().min(0).max(4).optional(),
      opened: z.boolean().optional(),
      discard: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context: { access } }): Promise<UpdateResult> => {
    requirePermission(access, { inventory: data.discard ? ["delete"] : ["update"] });
    const [updated] = await db
      .update(batch)
      .set({
        ...(data.quarters !== undefined && { quarters: data.quarters }),
        ...(data.opened !== undefined && { opened: data.opened }),
        // Below Full means opened; a client that forgets to say so doesn't un-open it.
        ...(data.quarters !== undefined && data.quarters < 4 && { opened: true }),
        ...(data.discard && { discardedAt: new Date() }),
        revision: data.baseRevision + 1,
      })
      .where(
        and(
          eq(batch.id, data.id),
          eq(batch.pantryId, access.pantryId),
          eq(batch.revision, data.baseRevision),
          isNull(batch.discardedAt),
        ),
      )
      .returning({ revision: batch.revision });
    return updated ? { ok: true, revision: updated.revision } : { ok: false, reason: "conflict" };
  });
