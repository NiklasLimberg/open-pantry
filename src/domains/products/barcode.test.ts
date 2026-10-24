import { describe, expect, it } from "vitest";

import { normalizeBarcode, normalizeScannedBarcode } from "./barcode.ts";

describe("normalizeBarcode", () => {
  it("accepts a valid EAN-13", () => {
    expect(normalizeBarcode("3017620422003")).toBe("3017620422003");
  });

  it("ignores spaces and dashes", () => {
    expect(normalizeBarcode("3017 6204-22003")).toBe("3017620422003");
  });

  it("stores UPC-A as EAN-13 with a leading zero", () => {
    expect(normalizeBarcode("036000291452")).toBe("0036000291452");
  });

  it("accepts a valid EAN-8", () => {
    expect(normalizeBarcode("96385074")).toBe("96385074");
  });

  it("rejects a wrong check digit", () => {
    expect(normalizeBarcode("3017620422004")).toBeNull();
  });

  it("rejects non-digits and other lengths", () => {
    expect(normalizeBarcode("30176204220A3")).toBeNull();
    expect(normalizeBarcode("12345")).toBeNull();
    expect(normalizeBarcode("")).toBeNull();
  });
});

describe("normalizeScannedBarcode", () => {
  it("expands UPC-E to the same EAN-13 as the full UPC-A", () => {
    expect(normalizeScannedBarcode("01234565", "upc_e")).toBe("0012345000065");
  });

  it("rejects UPC-E with a wrong check digit", () => {
    expect(normalizeScannedBarcode("01234566", "upc_e")).toBeNull();
  });

  it("passes other formats through normalizeBarcode", () => {
    expect(normalizeScannedBarcode("3017620422003", "ean_13")).toBe("3017620422003");
  });
});
