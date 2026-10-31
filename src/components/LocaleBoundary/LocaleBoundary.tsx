import { Fragment, useSyncExternalStore, type ReactNode } from "react";

import { subscribeLocale } from "#/domains/i18n/locale.ts";
import { getLocale } from "#/paraglide/runtime.js";

/**
 * Messages are read while rendering, so a language switch must render everything below again.
 * Keying by language remounts it (state inside is lost, which is fine for a language switch);
 * anything above keeps its state, such as the query cache that holds the stock.
 */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return <Fragment key={locale}>{children}</Fragment>;
}
