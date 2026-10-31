import { describe, expect, it } from "vitest";

import { mapOffResponse } from "./open-food-facts.ts";

describe("mapOffResponse", () => {
  it("maps a found product", () => {
    const result = mapOffResponse({
      status: 1,
      product: {
        product_name: " Nutella ",
        brands: "Nutella, Ferrero",
        quantity: "400 g e",
        categories_tags: ["en:spreads"],
        image_front_url: "https://images.openfoodfacts.org/images/products/1.400.jpg",
        image_front_small_url: "https://images.openfoodfacts.org/images/products/1.200.jpg",
        conservation_conditions: "",
        product_name_de: " Nutella (DE) ",
        product_name_en: "",
        product_name_fr: "Nutella FR",
        product_name_fr_imported: "ignored",
      },
    });
    expect(result).toEqual({
      kind: "found",
      product: {
        name: "Nutella",
        names: { de: "Nutella (DE)" },
        brand: "Nutella, Ferrero",
        quantity: "400 g e",
        categories: ["en:spreads"],
        imageUrl: "https://images.openfoodfacts.org/images/products/1.400.jpg",
        storageInstructions: null,
      },
    });
  });

  it("falls back to the small image when there is no larger one", () => {
    const result = mapOffResponse({
      status: 1,
      product: {
        product_name: "X",
        image_front_small_url: "https://images.openfoodfacts.org/images/products/1.200.jpg",
      },
    });
    expect(result.kind === "found" && result.product.imageUrl).toBe(
      "https://images.openfoodfacts.org/images/products/1.200.jpg",
    );
  });

  it("treats status 0 as not found", () => {
    expect(mapOffResponse({ status: 0, status_verbose: "product not found" })).toEqual({
      kind: "not_found",
    });
  });

  it("drops images from other hosts", () => {
    const result = mapOffResponse({
      status: 1,
      product: { product_name: "X", image_front_small_url: "https://evil.example/x.jpg" },
    });
    expect(result.kind === "found" && result.product.imageUrl).toBeNull();
  });

  it("reports unexpected bodies as unavailable instead of not found", () => {
    expect(mapOffResponse("<html>")).toEqual({ kind: "unavailable" });
    expect(mapOffResponse({ product: {} })).toEqual({ kind: "unavailable" });
  });
});
