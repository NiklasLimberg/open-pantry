import { m } from "#/paraglide/messages.js";
import { useState } from "react";

import { resolveBarcode, type LookupState } from "#/features/scan/lookup.ts";
import { useStockQuery } from "#/features/inventory/stock-query.ts";

import { AddPurchase } from "#/features/scan/AddPurchase/AddPurchase.tsx";
import { Button } from "#/components/Button/Button.tsx";
import { Scanner } from "#/features/scan/Scanner/Scanner.tsx";
import { LookupNote } from "./LookupNote.tsx";
import styles from "./ScanFlow.module.css";

/** A scanned barcode and what is known about it; null when the pantry already has the product. */
type Scanned = { barcode: string; lookup: LookupState | null };

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
