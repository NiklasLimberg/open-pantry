import type { trackUnits } from "#/db/schema.ts";

import type { DateKind } from "./format.ts";
import type { addPurchase, BarcodeLookup, StockProduct } from "./stock.functions.ts";

/** What a new package can start at, in quarters: anything but Used up. */
export type StartAmount = "4" | "3" | "2" | "1";

export type PurchaseValues = {
  name: string;
  brand: string;
  trackUnit: (typeof trackUnits)[number];
  /** Package size as typed; empty when unknown. */
  packageAmount: string;
  packageUnit: "g" | "ml";
  count: number;
  locationId: string;
  dateKind: DateKind;
  date: string;
  amount: StartAmount;
};

type PurchaseInput = Parameters<typeof addPurchase>[0]["data"];

type Source = {
  values: PurchaseValues;
  barcode: string | null;
  /** The pantry's own product for this barcode, when it already has one. */
  existing: StockProduct | null;
  /** Open Food Facts' answer for this barcode, when it had one. */
  found: Extract<BarcodeLookup, { status: "found" }> | null;
  /** Generated once per form, so submitting again after a failure cannot duplicate the purchase. */
  ids: { product: string; batches: string[] };
};

/** The request for a filled-in purchase form. */
export function toPurchaseInput({ values, barcode, existing, found, ids }: Source): PurchaseInput {
  const productId = existing?.id ?? ids.product;
  const hasDate = values.dateKind === "mhd" || values.dateKind === "use_by";
  const size = Number(values.packageAmount);
  // While the user accepted Open Food Facts' name and brand unchanged, send none: the product
  // then keeps following that data, so later refreshes of it still reach this product.
  const fromOff =
    found !== null && values.name === (found.name ?? "") && values.brand === (found.brand ?? "");

  return {
    productId,
    newProduct: existing
      ? undefined
      : {
          id: productId,
          barcode,
          name: fromOff ? null : values.name || null,
          brand: fromOff ? null : values.brand || null,
          trackUnit: values.trackUnit,
          packageAmount: size > 0 ? Math.round(size) : null,
          packageUnit: size > 0 ? values.packageUnit : null,
        },
    batches: ids.batches.slice(0, values.count).map((id) => ({
      id,
      locationId: values.locationId,
      quarters: Number(values.amount),
      // Below Full means it has been opened (the server enforces the same rule).
      opened: values.amount !== "4",
      dateKind: values.dateKind,
      date: hasDate ? values.date : null,
    })),
  };
}
