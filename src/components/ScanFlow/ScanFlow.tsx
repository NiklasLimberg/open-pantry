import { m } from "#/paraglide/messages.js";
import { useState } from "react";

import { resolveBarcode, type LookupState } from "#/domains/inventory/lookup.ts";
import { useStockQuery } from "#/domains/inventory/stock-query.ts";

import { AddPurchase } from "../AddPurchase/AddPurchase.tsx";
import { Button } from "../Button/Button.tsx";
import { Scanner } from "../Scanner/Scanner.tsx";
import styles from "./ScanFlow.module.css";

/** A scanned barcode and what is known about it; null when the pantry already has the product. */
type Scanned = { barcode: string; lookup: LookupState | null };

/** Scan (or type) a barcode, then enter the purchase. */
export function ScanFlow({ onAdded }: { onAdded: (productId: string) => void }) {
  const { data } = useStockQuery();
  const products = data?.products ?? [];
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [resolving, setResolving] = useState(false);

  async function onBarcode(barcode: string) {
    setResolving(true);
    // A product this pantry already knows needs no network: use the copy on the device.
    const known = products.some((product) => product.barcode === barcode);
    const lookup = known ? null : await resolveBarcode(barcode);
    setResolving(false);
    setScanned({ barcode, lookup });
  }

  if (!scanned) {
    return (
      <div>
        <Scanner autoStart onBarcode={(barcode) => void onBarcode(barcode)} />
        {resolving && <output className={styles.note}>{m["scan.lookingUp"]()}</output>}
      </div>
    );
  }

  const { barcode, lookup } = scanned;
  const existing = products.find((product) => product.barcode === barcode) ?? null;
  return (
    <div>
      <h3 className={styles.heading}>
        {existing ? m["scan.addPurchase"]() : m["scan.newProduct"]()}
      </h3>
      <LookupNote barcode={barcode} lookup={lookup} />
      <p className={styles.note}>{m["scan.barcode"]({ barcode })}</p>
      <AddPurchase
        barcode={barcode}
        existing={existing}
        lookup={lookup}
        locations={data?.locations ?? []}
        onSaved={onAdded}
      />
      <Button
        type="button"
        variant="secondary"
        className={styles.secondary}
        onClick={() => setScanned(null)}
      >
        {m["scan.different"]()}
      </Button>
    </div>
  );
}

function LookupNote({ barcode, lookup }: { barcode: string; lookup: LookupState | null }) {
  if (!lookup) return null;
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
