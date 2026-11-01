import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Database, Transaction } from "#/db/index.ts";
import { batch, location, product } from "#/db/schema.ts";

import { InvalidRequestError } from "#/features/pantry/invalid-request.ts";
import { normalizeBarcode } from "#/features/products/barcode.ts";

import { findProductIdByBarcode } from "./stock.queries.ts";
import type { AddPurchaseInput, NewProductInput, UpdateBatchInput } from "./stock.schemas.ts";
import type { UpdateResult } from "./stock.types.ts";

// Server-only writes for the stock functions. Callers have already checked the role.

/**
 * The ID of the product a purchase belongs to: the one the client named when the pantry has it,
 * otherwise a new one created from `newProduct`. The product for a barcode is unique per pantry,
 * so one created meanwhile by another request or device is used instead.
 */
async function resolveProductId(
  tx: Transaction,
  pantryId: string,
  requestedId: string,
  newProduct: NewProductInput | undefined,
) {
  const [existing] = await tx
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.pantryId, pantryId), eq(product.id, requestedId)));
  if (existing) {
    return existing.id;
  }

  if (!newProduct) {
    throw new InvalidRequestError("Unknown product.");
  }
  if (newProduct.id !== requestedId) {
    throw new InvalidRequestError("Product details don't match.");
  }
  const barcode = newProduct.barcode === null ? null : normalizeBarcode(newProduct.barcode);
  if (newProduct.barcode !== null && !barcode) {
    throw new InvalidRequestError("That is not a valid barcode.");
  }
  if (!barcode && !newProduct.name) {
    throw new InvalidRequestError("A product without a barcode needs a name.");
  }

  const sameBarcode = barcode ? await findProductIdByBarcode(tx, pantryId, barcode) : null;
  if (sameBarcode) {
    return sameBarcode;
  }

  const inserted = await tx
    .insert(product)
    .values({ ...newProduct, barcode, pantryId })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (inserted.length > 0) {
    return newProduct.id;
  }

  // A concurrent request created this barcode between the check and the insert.
  const raced = barcode ? await findProductIdByBarcode(tx, pantryId, barcode) : null;
  if (!raced) {
    throw new InvalidRequestError("Could not create the product.");
  }
  return raced;
}

/** Inserts the batches (and the product, if new). Repeating the same request inserts nothing twice. */
export async function savePurchase(executor: Database, pantryId: string, data: AddPurchaseInput) {
  const locationIds = [...new Set(data.batches.map((b) => b.locationId))];
  const known = await executor
    .select({ id: location.id })
    .from(location)
    .where(and(eq(location.pantryId, pantryId), inArray(location.id, locationIds)));
  if (known.length !== locationIds.length) {
    throw new InvalidRequestError("Unknown location.");
  }

  return executor.transaction(async (tx) => {
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
    // Remember what the user said this package prints, to preselect it on the next purchase.
    const printedDateKind = data.batches
      .map((b) => b.dateKind)
      .find((kind): kind is "mhd" | "use_by" => kind === "mhd" || kind === "use_by");
    if (printedDateKind) {
      await tx
        .update(product)
        .set({ printedDateKind })
        .where(and(eq(product.id, productId), eq(product.pantryId, pantryId)));
    }
    return { productId };
  });
}

/** Absolute update against the revision the client last saw; see `updateBatch`. */
export async function applyBatchUpdate(
  executor: Pick<Database, "update" | "select">,
  pantryId: string,
  data: UpdateBatchInput,
): Promise<UpdateResult> {
  const [updated] = await executor
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
        eq(batch.pantryId, pantryId),
        eq(batch.revision, data.baseRevision),
        isNull(batch.discardedAt),
      ),
    )
    .returning({ revision: batch.revision });
  if (updated) {
    return { ok: true, revision: updated.revision };
  }

  const [current] = await executor
    .select({ discardedAt: batch.discardedAt })
    .from(batch)
    .where(and(eq(batch.id, data.id), eq(batch.pantryId, pantryId)));
  return { ok: false, reason: !current || current.discardedAt ? "gone" : "conflict" };
}
