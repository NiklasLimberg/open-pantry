import { and, asc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { offProduct, product } from "#/db/schema.ts";

import { fetchOffProduct, isThrottled } from "#/domains/products/open-food-facts.ts";

// Server-only. Open Food Facts data is cached by barcode in `off_product`; pantry rows only
// reference it, so a refresh can never change quantities, dates or the user's own edits.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Found products change slowly; unknown ones may be added by contributors any day. */
const foundMaxAgeMs = 7 * DAY_MS;
const notFoundMaxAgeMs = 1 * DAY_MS;

export type OffRow = typeof offProduct.$inferSelect;

function isFresh(row: OffRow, now = Date.now()) {
  const maxAge = row.status === "found" ? foundMaxAgeMs : notFoundMaxAgeMs;
  return now - row.fetchedAt.getTime() < maxAge;
}

/**
 * Cached row for the barcode, fetched first when missing or stale. Returns the stale row (or
 * null) when Open Food Facts cannot be reached, so callers can fall back to manual entry.
 */
export async function getOffProduct(barcode: string): Promise<OffRow | null> {
  const [cached] = await db.select().from(offProduct).where(eq(offProduct.barcode, barcode));
  if (cached && isFresh(cached)) return cached;
  return (await refreshOffProduct(barcode)) ?? cached ?? null;
}

/** Fetches and stores one barcode. Returns null when the API was unavailable (nothing stored). */
export async function refreshOffProduct(
  barcode: string,
  options: { background?: boolean } = {},
): Promise<OffRow | null> {
  const result = await fetchOffProduct(barcode, options);
  if (result.kind === "unavailable") return null;
  const values =
    result.kind === "found"
      ? { status: "found" as const, ...result.product }
      : {
          status: "not_found" as const,
          name: null,
          brand: null,
          quantity: null,
          categories: [],
          imageUrl: null,
          storageInstructions: null,
        };
  const row = { barcode, ...values, fetchedAt: new Date() };
  await db
    .insert(offProduct)
    .values(row)
    .onConflictDoUpdate({ target: offProduct.barcode, set: row });
  return row;
}

/**
 * Barcodes some pantry holds whose cached data is missing or stale, oldest first. Barcodes nobody
 * holds are never refreshed, which keeps the load far below the API quota.
 */
export async function findStaleBarcodes(limit: number, now = new Date()): Promise<string[]> {
  const foundBefore = new Date(now.getTime() - foundMaxAgeMs);
  const notFoundBefore = new Date(now.getTime() - notFoundMaxAgeMs);
  const rows = await db
    .selectDistinct({ barcode: product.barcode, fetchedAt: offProduct.fetchedAt })
    .from(product)
    .leftJoin(offProduct, eq(offProduct.barcode, product.barcode))
    .where(
      and(
        isNotNull(product.barcode),
        or(
          isNull(offProduct.barcode),
          and(eq(offProduct.status, "found"), lt(offProduct.fetchedAt, foundBefore)),
          and(eq(offProduct.status, "not_found"), lt(offProduct.fetchedAt, notFoundBefore)),
        ),
      ),
    )
    .orderBy(sql`${offProduct.fetchedAt} asc nulls first`, asc(product.barcode))
    .limit(limit);
  return rows.flatMap((row) => (row.barcode ? [row.barcode] : []));
}

/** Consecutive failures after which the API is assumed down and the run ends. */
const maxConsecutiveFailures = 3;

/**
 * Refreshes up to `limit` stale barcodes. A barcode that fails on its own (bad response, timeout)
 * is skipped so it cannot block the others; the run ends when the API is throttling or several
 * requests in a row fail.
 */
export async function refreshStaleProducts(limit = 20) {
  const barcodes = await findStaleBarcodes(limit);
  let refreshed = 0;
  let failures = 0;
  for (const barcode of barcodes) {
    if (await refreshOffProduct(barcode, { background: true })) {
      refreshed++;
      failures = 0;
      continue;
    }
    failures++;
    if (isThrottled() || failures >= maxConsecutiveFailures) break;
  }
  return { due: barcodes.length, refreshed };
}
