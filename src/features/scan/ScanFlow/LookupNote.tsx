import type { LookupState } from "#/features/scan/lookup.ts";
import { m } from "#/paraglide/messages.js";

import styles from "./ScanFlow.module.css";

export function LookupNote({ barcode, lookup }: { barcode: string; lookup: LookupState | null }) {
  if (!lookup) {
    return null;
  }
  if (lookup.status === "found") {
    return (
      <p className={styles.note}>
        {m["scan.found.prefix"]()}{" "}
        <a
          href={`https://world.openfoodfacts.org/product/${barcode}`}
          target="_blank"
          rel="noreferrer"
        >
          {m["global.openFoodFacts"]()}
        </a>
        {m["scan.found.suffix"]()}
      </p>
    );
  }
  return (
    <output className={styles.note}>
      {lookup.status === "not_found" ? m["scan.notFound"]() : m["scan.unavailable"]()}
    </output>
  );
}
