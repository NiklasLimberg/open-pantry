import { describe, expect, it } from "vitest";

import { groupStock } from "./group-stock.ts";
import type { StockBatch, StockProduct } from "./stock.types.ts";

const product = (id: string, name: string, barcode: string | null = null): StockProduct => ({
  id,
  barcode,
  name,
  names: {},
  brand: null,
  trackUnit: "pack",
  printedDateKind: null,
  packageAmount: null,
  packageUnit: null,
  suggestedPackage: null,
  imageUrl: null,
  storageInstructions: null,
  source: null,
});

const batch = (
  id: string,
  productId: string,
  date: string | null,
  locationId = "l1",
): StockBatch => ({
  id,
  productId,
  locationId,
  quarters: 4,
  opened: false,
  dateKind: date ? "mhd" : "unknown",
  date,
  revision: 1,
});

const products = [product("rice", "Rice", "4001"), product("milk", "Milk"), product("tea", "Tea")];
const batches = [
  batch("b1", "rice", "2027-01-01"),
  batch("b2", "milk", "2026-05-01", "l2"),
  batch("b3", "rice", "2026-09-01"),
  batch("b4", "tea", null),
];
const none = { search: "", locationId: "" };

describe("groupStock", () => {
  it("orders products by their earliest date, undated last, and batches within each", () => {
    const groups = groupStock(batches, products, none);
    expect(groups.map((g) => g.product.id)).toEqual(["milk", "rice", "tea"]);
    expect(groups[1].batches.map((b) => b.id)).toEqual(["b3", "b1"]);
    expect(groups[1].earliest).toBe("2026-09-01");
    expect(groups[2].earliest).toBeNull();
  });

  it("filters by name or barcode, ignoring case and spacing", () => {
    expect(groupStock(batches, products, { ...none, search: " MIL " })).toHaveLength(1);
    expect(groupStock(batches, products, { ...none, search: "4001" })[0].product.id).toBe("rice");
  });

  it("filters by location and leaves out other locations' batches", () => {
    const groups = groupStock(batches, products, { ...none, locationId: "l1" });
    expect(groups.map((g) => g.product.id)).toEqual(["rice", "tea"]);
  });

  it("skips batches whose product is unknown", () => {
    expect(groupStock([batch("x", "gone", null)], products, none)).toEqual([]);
  });
});
