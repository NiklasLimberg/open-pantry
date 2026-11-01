import { describe, expect, it } from "vitest";

import { parsePackageSize } from "./quantity.ts";

describe("parsePackageSize", () => {
  it.each([
    ["500 g", { amount: 500, unit: "g" }],
    ["400 g e", { amount: 400, unit: "g" }],
    ["1,5 L", { amount: 1500, unit: "ml" }],
    ["0.75 kg", { amount: 750, unit: "g" }],
    ["25cl", { amount: 250, unit: "ml" }],
  ])("parses %s", (text, expected) => {
    expect(parsePackageSize(text)).toEqual(expected);
  });

  it.each(["6 x 100 g", "12 slices", "approx 3 pieces", "", "g", "10 oz"])(
    "leaves %j for the user to confirm",
    (text) => {
      expect(parsePackageSize(text)).toBeNull();
    },
  );

  it("returns null when missing", () => {
    expect(parsePackageSize(null)).toBeNull();
  });
});
