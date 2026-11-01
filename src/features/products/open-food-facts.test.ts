import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOffProduct } from "./open-food-facts.ts";

// The client reads its settings when it makes a request, and spaces requests 5 s apart, so these
// tests run on fake timers with a stubbed `fetch`.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("DATABASE_URL", "postgresql://pantry:pantry@localhost:5432/open_pantry");
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("OFF_CONTACT", "me@example.com");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

let barcodeCounter = 0;

/** Looks up a barcode whose answer is `answer` (a body, a Response, or a network error). */
async function lookup(answer: unknown) {
  vi.stubGlobal("fetch", () =>
    answer instanceof Error
      ? Promise.reject(answer)
      : Promise.resolve(answer instanceof Response ? answer : Response.json(answer)),
  );
  const result = fetchOffProduct(`40063813${String(barcodeCounter++).padStart(5, "0")}`);
  await vi.runAllTimersAsync();
  return result;
}

describe("fetchOffProduct: reading the answer", () => {
  it("maps a found product", async () => {
    const result = await lookup({
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

  it("falls back to the small image when there is no larger one", async () => {
    const result = await lookup({
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

  it("drops images from other hosts", async () => {
    const result = await lookup({
      status: 1,
      product: { product_name: "X", image_front_small_url: "https://evil.example/x.jpg" },
    });
    expect(result.kind === "found" && result.product.imageUrl).toBeNull();
  });

  it("treats status 0 and a 404 as not found", async () => {
    expect(await lookup({ status: 0, status_verbose: "product not found" })).toEqual({
      kind: "not_found",
    });
    expect(await lookup(new Response("{}", { status: 404 }))).toEqual({ kind: "not_found" });
  });

  it("reports unexpected bodies, server errors and a lost connection as unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lookup("<html>")).toEqual({ kind: "unavailable" });
    expect(await lookup({ product: {} })).toEqual({ kind: "unavailable" });
    expect(await lookup(new Response("oops", { status: 500 }))).toEqual({ kind: "unavailable" });
    expect(await lookup(new TypeError("Failed to fetch"))).toEqual({ kind: "unavailable" });
  });
});

describe("fetchOffProduct: the queue", () => {
  it("turns lookups away once too many are waiting", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("{}", { status: 404 })));

    // The first starts at once, the next five wait, the seventh is refused without waiting.
    const lookups = Array.from({ length: 7 }, (_, i) => fetchOffProduct(`50063813339${i}`));
    await expect(lookups[6]).resolves.toEqual({ kind: "unavailable" });

    await vi.runAllTimersAsync();
    const results = await Promise.all(lookups.slice(0, 6));
    expect(results.every((result) => result.kind === "not_found")).toBe(true);
  });

  it("shares one request between lookups of the same barcode", async () => {
    const fetchSpy = vi.fn<() => Promise<Response>>(() =>
      Promise.resolve(Response.json({ status: 0 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const [a, b] = [fetchOffProduct("60063813339"), fetchOffProduct("60063813339")];
    await vi.runAllTimersAsync();

    expect(await a).toEqual(await b);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
