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
        <Scanner onBarcode={(barcode) => void onBarcode(barcode)} />
        {resolving && <output className={styles.note}>Looking up product…</output>}
      </div>
    );
  }

  const { barcode, lookup } = scanned;
  const existing = products.find((product) => product.barcode === barcode) ?? null;
  return (
    <div>
      <h3 className={styles.heading}>{existing ? "Add a purchase" : "New product"}</h3>
      <LookupNote barcode={barcode} lookup={lookup} />
      <p className={styles.note}>Barcode {barcode}</p>
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
        Scan a different product
      </Button>
    </div>
  );
}

function LookupNote({ barcode, lookup }: { barcode: string; lookup: LookupState | null }) {
  if (!lookup) return null;
  if (lookup.status === "found") {
    return (
      <p className={styles.note}>
        Product data:{" "}
        <a
          href={`https://world.openfoodfacts.org/product/${barcode}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>
        . Check it against the package.
      </p>
    );
  }
  return (
    <output className={styles.note}>
      {lookup.status === "not_found"
        ? "Open Food Facts doesn't know this barcode. Enter the details yourself."
        : "Product details couldn't be loaded. You can enter the name yourself; saving needs a connection, and details are filled in later."}
    </output>
  );
}
