import { dateSortKey } from "./format.ts";
import type { StockBatch, StockProduct } from "./stock.functions.ts";

export type StockGroup = {
  product: StockProduct;
  /** Earliest date first; undated last. */
  batches: StockBatch[];
  /** Date of the first batch to expire, or null when none has one. */
  earliest: string | null;
};

type Filters = { search: string; locationId: string };

/**
 * Batches grouped by product for the pantry list: only those matching the search text (name,
 * brand or barcode) and location, products with the earliest date first.
 */
export function groupStock(
  batches: StockBatch[],
  products: StockProduct[],
  { search, locationId }: Filters,
): StockGroup[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const term = search.trim().toLowerCase();
  const groups = new Map<string, StockGroup>();

  for (const batch of batches) {
    const product = byId.get(batch.productId);
    if (!product || (locationId && batch.locationId !== locationId)) continue;
    const label = `${product.name ?? ""} ${product.brand ?? ""} ${product.barcode ?? ""}`;
    if (term && !label.toLowerCase().includes(term)) continue;
    const group = groups.get(product.id) ?? { product, batches: [], earliest: null };
    group.batches.push(batch);
    groups.set(product.id, group);
  }

  const byDate = (a: StockBatch, b: StockBatch) =>
    dateSortKey(a.date).localeCompare(dateSortKey(b.date));
  for (const group of groups.values()) {
    group.batches.sort(byDate);
    group.earliest = group.batches[0].date;
  }
  return [...groups.values()].sort((a, b) =>
    dateSortKey(a.earliest).localeCompare(dateSortKey(b.earliest)),
  );
}
