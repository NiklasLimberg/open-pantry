import { and, asc, eq, isNull } from "drizzle-orm";

import { db, type Database } from "#/db/index.ts";
import { batch, location, offProduct, product } from "#/db/schema.ts";

import { roleCan } from "#/features/pantry/permissions.ts";
import type { PantryAccess } from "#/features/pantry/pantry-access.ts";
import { parsePackageSize } from "#/features/products/quantity.ts";

import type { StockBatch, StockLocation, StockProduct } from "./stock.types.ts";

// Server-only reads for the stock functions. Every query filters by the pantry ID of `access`.

const defaultLocations = ["Cupboard", "Fridge", "Freezer"];

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

export async function readLocations(access: PantryAccess): Promise<StockLocation[]> {
  const read = () =>
    db
      .select({ id: location.id, name: location.name })
      .from(location)
      .where(eq(location.pantryId, access.pantryId))
      .orderBy(asc(location.sortOrder), asc(location.name));
  const rows = await read();
  // Only editors create the defaults; a viewer of a brand-new pantry just sees none.
  if (rows.length > 0 || !roleCan(access.role, { inventory: ["create"] })) {
    return rows;
  }
  await ensureLocations(access.pantryId);
  return read();
}

type ProductRow = typeof product.$inferSelect;
type OffRow = typeof offProduct.$inferSelect;

/** The pantry's product with Open Food Facts' data filling whatever the user left empty. */
function toStockProduct(p: ProductRow, off: OffRow | null): StockProduct {
  const found = off?.status === "found" ? off : null;
  const name = p.name ?? found?.name ?? null;
  const brand = p.brand ?? found?.brand ?? null;
  return {
    id: p.id,
    barcode: p.barcode,
    name,
    names: p.name === null ? (found?.names ?? {}) : {},
    brand,
    trackUnit: p.trackUnit,
    printedDateKind: p.printedDateKind,
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
}

export async function readProducts(access: PantryAccess): Promise<StockProduct[]> {
  const rows = await db
    .select({ product, off: offProduct })
    .from(product)
    .leftJoin(offProduct, eq(offProduct.barcode, product.barcode))
    .where(eq(product.pantryId, access.pantryId));
  return rows.map(({ product: p, off }) => toStockProduct(p, off));
}

export async function readBatches(access: PantryAccess): Promise<StockBatch[]> {
  return await db
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

export async function findProductIdByBarcode(
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
