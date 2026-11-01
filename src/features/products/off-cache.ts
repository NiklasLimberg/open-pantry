import { and, asc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { offProduct, product } from "#/db/schema.ts";

import { trackTaskRun } from "./task-run.ts";
import { fetchOffProduct, isThrottled } from "./open-food-facts.ts";

// Server-only. Open Food Facts data is cached by barcode in `off_product`; pantry rows only
// reference it, so a refresh can never change quantities, dates or the user's own edits.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Found products change slowly; unknown ones may be added by contributors any day. */
const foundMaxAgeMs = 7 * DAY_MS;
const notFoundMaxAgeMs = 1 * DAY_MS;

/** Cutoffs before which a cached row of each kind counts as stale. */
function staleBefore(now: Date) {
  return {
    found: new Date(now.getTime() - foundMaxAgeMs),
    notFound: new Date(now.getTime() - notFoundMaxAgeMs),
  };
}

/** SQL for "cached, but older than its status allows"; false for barcodes not cached at all. */
function isStaleSql(now: Date) {
  const before = staleBefore(now);
  return (
    or(
      and(eq(offProduct.status, "found"), lt(offProduct.fetchedAt, before.found)),
      and(eq(offProduct.status, "not_found"), lt(offProduct.fetchedAt, before.notFound)),
    ) ?? sql`false`
  );
}

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
  if (cached && isFresh(cached)) {
    return cached;
  }
  return (await refreshOffProduct(barcode)) ?? cached ?? null;
}

/** Fetches and stores one barcode. Returns null when the API was unavailable (nothing stored). */
export async function refreshOffProduct(
  barcode: string,
  options: { background?: boolean } = {},
): Promise<OffRow | null> {
  const result = await fetchOffProduct(barcode, options);
  if (result.kind === "unavailable") {
    return null;
  }
  const values =
    result.kind === "found"
      ? { status: "found" as const, ...result.product }
      : {
          status: "not_found" as const,
          name: null,
          names: {},
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
async function findStaleBarcodes(
  limit: number,
  { now = new Date(), all = false }: { now?: Date; all?: boolean } = {},
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ barcode: product.barcode, fetchedAt: offProduct.fetchedAt })
    .from(product)
    .leftJoin(offProduct, eq(offProduct.barcode, product.barcode))
    .where(
      and(
        isNotNull(product.barcode),
        all ? undefined : or(isNull(offProduct.barcode), isStaleSql(now)),
      ),
    )
    .orderBy(sql`${offProduct.fetchedAt} asc nulls first`, asc(product.barcode))
    .limit(limit);
  return rows.flatMap((row) => (row.barcode ? [row.barcode] : []));
}

/** Consecutive failures after which the API is assumed down and the run ends. */
const maxConsecutiveFailures = 3;

/**
 * Refreshes up to `limit` stale barcodes (every held barcode with `all`). A barcode that fails on its own (bad response, timeout)
 * is skipped so it cannot block the others; the run ends when the API is throttling or several
 * requests in a row fail.
 */
async function refreshStaleProducts(
  limit = 20,
  onProgress?: (processed: number, total: number) => Promise<void>,
  { all = false }: { all?: boolean } = {},
) {
  const barcodes = await findStaleBarcodes(limit, { all });
  await onProgress?.(0, barcodes.length);
  let refreshed = 0;
  let failures = 0;
  let processed = 0;
  for (const barcode of barcodes) {
    // One barcode at a time: the API allows about a dozen requests a minute.
    // oxlint-disable-next-line no-await-in-loop
    const stored = await refreshOffProduct(barcode, { background: true });
    processed++;
    // oxlint-disable-next-line no-await-in-loop
    await onProgress?.(processed, barcodes.length);
    if (stored) {
      refreshed++;
      failures = 0;
      continue;
    }
    failures++;
    if (isThrottled() || failures >= maxConsecutiveFailures) {
      break;
    }
  }
  return { due: barcodes.length, refreshed };
}

export const refreshTaskName = "products:refresh";

/** At 5 s spacing a full refresh of this many barcodes takes about 40 minutes. */
const fullRefreshLimit = 500;

/**
 * The scheduled task and the manual trigger both go through here. `all` ignores freshness and
 * refreshes every held barcode. Resolves once the run has started, with `finished`, a promise for its result;
 * null when a run is already in progress.
 */
export function runProductRefresh({ all = false }: { all?: boolean } = {}) {
  return trackTaskRun(refreshTaskName, { full: all }, (progress) =>
    refreshStaleProducts(all ? fullRefreshLimit : 20, progress, { all }),
  );
}

/** How old the cached data is for the barcodes some pantry holds. */
export async function getOffFreshness(now = new Date()) {
  const [row] = await db
    .select({
      held: sql<number>`count(distinct ${product.barcode})::int`,
      missing: sql<number>`count(distinct ${product.barcode}) filter (where ${offProduct.barcode} is null)::int`,
      stale: sql<number>`count(distinct ${product.barcode}) filter (where ${isStaleSql(now)})::int`,
      oldest: sql<Date | null>`min(${offProduct.fetchedAt})`,
      newest: sql<Date | null>`max(${offProduct.fetchedAt})`,
    })
    .from(product)
    .leftJoin(offProduct, eq(offProduct.barcode, product.barcode))
    .where(isNotNull(product.barcode));
  return {
    held: row?.held ?? 0,
    missing: row?.missing ?? 0,
    stale: row?.stale ?? 0,
    oldest: row?.oldest ? new Date(row.oldest) : null,
    newest: row?.newest ? new Date(row.newest) : null,
  };
}
