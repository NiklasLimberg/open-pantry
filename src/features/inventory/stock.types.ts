import type { dateKinds, trackUnits } from "#/db/schema.ts";

// What the stock functions send to the screens. Types only, so client code can import it freely.

export type StockLocation = { id: string; name: string };

export type StockProduct = {
  id: string;
  barcode: string | null;
  /** The user's own name, else Open Food Facts' default name, else null. */
  name: string | null;
  /**
   * Open Food Facts' name per language, for products still following it. Every language comes
   * with the stock so the screen can switch language offline; show it with `productName`.
   */
  names: Record<string, string>;
  brand: string | null;
  trackUnit: (typeof trackUnits)[number];
  /** The printed date type the user last confirmed for this product; null until they have. */
  printedDateKind: "mhd" | "use_by" | null;
  /** Confirmed package size. Null until the user confirms one. */
  packageAmount: number | null;
  packageUnit: "g" | "ml" | null;
  /** Parsed from the Open Food Facts quantity text; only offered for confirmation. */
  suggestedPackage: { amount: number; unit: "g" | "ml" } | null;
  imageUrl: string | null;
  storageInstructions: string | null;
  /** Set when any shown field came from Open Food Facts. */
  source: "openfoodfacts" | null;
};

export type StockBatch = {
  id: string;
  productId: string;
  locationId: string;
  quarters: number;
  opened: boolean;
  dateKind: (typeof dateKinds)[number];
  date: string | null;
  revision: number;
};

export type StockData = {
  locations: StockLocation[];
  products: StockProduct[];
  batches: StockBatch[];
};

export type BarcodeLookup =
  | {
      status: "found";
      barcode: string;
      name: string | null;
      brand: string | null;
      quantity: string | null;
      suggestedPackage: { amount: number; unit: "g" | "ml" } | null;
      imageUrl: string | null;
      storageInstructions: string | null;
      /** The pantry's own product for this barcode, when it already has one. */
      productId: string | null;
    }
  | { status: "not_found"; barcode: string; productId: string | null }
  /** Open Food Facts could not be reached: continue with manual details and enrich later. */
  | { status: "unavailable"; barcode: string; productId: string | null };

export type UpdateResult =
  | { ok: true; revision: number }
  /** The batch changed on another device since the client last saw it. */
  | { ok: false; reason: "conflict" }
  /** The batch no longer exists in the pantry, for example because it was used up elsewhere. */
  | { ok: false; reason: "gone" };
