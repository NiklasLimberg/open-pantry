import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db } from "#/db/index.ts";

import { InvalidRequestError } from "#/features/pantry/invalid-request.ts";
import { requirePermission } from "#/features/pantry/pantry-access.ts";
import { pantryMiddleware } from "#/features/pantry/pantry.functions.ts";
import { normalizeBarcode } from "#/features/products/barcode.ts";
import { getOffProduct } from "#/features/products/off-cache.ts";
import { localizedName } from "#/features/products/languages.ts";
import { parsePackageSize } from "#/features/products/quantity.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import { applyBatchUpdate, savePurchase } from "./stock.mutations.ts";
import {
  findProductIdByBarcode,
  readBatches,
  readLocations,
  readProducts,
} from "./stock.queries.ts";
import { addPurchaseInput, updateBatchInput } from "./stock.schemas.ts";
import type { BarcodeLookup, StockData, UpdateResult } from "./stock.types.ts";

// Every handler resolves the pantry from the session (pantryMiddleware), checks the role, and
// filters by that pantry ID; IDs sent by the client are never trusted to select a pantry.

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

/** Resolves a scanned or typed barcode. Never fails because Open Food Facts is down. */
export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(z.object({ barcode: z.string().max(32) }))
  .handler(async ({ data, context: { access } }): Promise<BarcodeLookup> => {
    requirePermission(access, { inventory: ["create"] });
    const barcode = normalizeBarcode(data.barcode);
    if (!barcode) {
      throw new InvalidRequestError(m["error.invalidBarcode"]());
    }
    const productId = await findProductIdByBarcode(db, access.pantryId, barcode);
    const off = await getOffProduct(barcode);
    if (!off) {
      return { status: "unavailable", barcode, productId };
    }
    if (off.status === "not_found") {
      return { status: "not_found", barcode, productId };
    }
    return {
      status: "found",
      barcode,
      name: localizedName(off.names, getLocale(), off.name),
      brand: off.brand,
      quantity: off.quantity,
      suggestedPackage: parsePackageSize(off.quantity),
      imageUrl: off.imageUrl,
      storageInstructions: off.storageInstructions,
      productId,
    };
  });

/**
 * Adds one or more packages. Safe to replay: the client generates every ID, so repeating a
 * request after a lost response inserts nothing twice.
 */
export const addPurchase = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(addPurchaseInput)
  .handler(async ({ data, context: { access } }) => {
    requirePermission(access, { inventory: ["create"] });
    return await savePurchase(db, access.pantryId, data);
  });

/**
 * Absolute update against the revision the client last saw. A stale revision is a conflict the
 * user resolves; counts are never overwritten silently (docs/technical-plan.md).
 */
export const updateBatch = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(updateBatchInput)
  .handler(async ({ data, context: { access } }): Promise<UpdateResult> => {
    requirePermission(access, { inventory: data.discard ? ["delete"] : ["update"] });
    return await applyBatchUpdate(db, access.pantryId, data);
  });
