import { localizedName } from "#/features/products/languages.ts";
import { getLocale } from "#/paraglide/runtime.js";

import type { StockProduct } from "./stock.types.ts";

/** The product's name in the current language; read at render time so a switch needs no fetch. */
export const productName = (product: Pick<StockProduct, "name" | "names">) =>
  localizedName(product.names, getLocale(), product.name);
