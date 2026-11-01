import { describe, expect, it } from "vitest";

import { toPurchaseInput, type PurchaseValues } from "./purchase.ts";

const values: PurchaseValues = {
  name: "Oat drink",
  brand: "Oatly",
  trackUnit: "carton",
  packageAmount: "1000",
  packageUnit: "ml",
  count: 2,
  locationId: "l1",
  dateKind: "mhd",
  date: "2027-01-31",
  amount: "4",
};
const ids = { product: "p-new", batches: ["b1", "b2", "b3"] };
const found = {
  status: "found",
  barcode: "7394376616228",
  name: "Oat drink",
  brand: "Oatly",
  quantity: "1 l",
  suggestedPackage: { amount: 1000, unit: "ml" },
  imageUrl: null,
  storageInstructions: null,
  productId: null,
} as const;

describe("toPurchaseInput", () => {
  it("creates the product and one batch per package", () => {
    const input = toPurchaseInput({ values, barcode: "123", existing: null, found: null, ids });
    expect(input.productId).toBe("p-new");
    expect(input.newProduct).toMatchObject({
      id: "p-new",
      barcode: "123",
      name: "Oat drink",
      packageAmount: 1000,
      packageUnit: "ml",
    });
    expect(input.batches.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(input.batches[0]).toMatchObject({ quarters: 4, opened: false, date: "2027-01-31" });
  });

  it("keeps following Open Food Facts while its name and brand are left unchanged", () => {
    const input = toPurchaseInput({ values, barcode: "123", existing: null, found, ids });
    expect(input.newProduct).toMatchObject({ name: null, brand: null });
    const edited = { ...values, name: "My oat drink" };
    const own = toPurchaseInput({ values: edited, barcode: "123", existing: null, found, ids });
    expect(own.newProduct).toMatchObject({ name: "My oat drink", brand: "Oatly" });
  });

  it("marks a package below Full as opened and drops the date when none is printed", () => {
    const input = toPurchaseInput({
      values: { ...values, amount: "2", dateKind: "none" },
      barcode: null,
      existing: null,
      found: null,
      ids,
    });
    expect(input.batches[0]).toMatchObject({ quarters: 2, opened: true, date: null });
  });

  it("leaves out the package size when none is entered, and the product when it exists", () => {
    const blank = toPurchaseInput({
      values: { ...values, packageAmount: "" },
      barcode: "123",
      existing: null,
      found: null,
      ids,
    });
    expect(blank.newProduct).toMatchObject({ packageAmount: null, packageUnit: null });
    const existing = { id: "p-old" } as Parameters<typeof toPurchaseInput>[0]["existing"];
    const again = toPurchaseInput({ values, barcode: "123", existing, found: null, ids });
    expect(again.productId).toBe("p-old");
    expect(again.newProduct).toBeUndefined();
  });
});
