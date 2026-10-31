import { localizedName } from "#/domains/products/languages.ts";
import { getLocale } from "#/paraglide/runtime.js";

import type { StockProduct } from "./stock.functions.ts";

/** The product's name in the current language; read at render time so a switch needs no fetch. */
export const productName = (product: Pick<StockProduct, "name" | "names">) =>
  localizedName(product.names, getLocale(), product.name);
