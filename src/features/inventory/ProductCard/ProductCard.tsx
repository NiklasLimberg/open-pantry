import { m } from "#/paraglide/messages.js";
import { productName } from "#/features/inventory/product-name.ts";
import {
  describeDate,
  packageNoun,
  summarizeStock,
  unitLabel,
} from "#/features/inventory/format.ts";
import type { StockGroup } from "#/features/inventory/group-stock.ts";
import type { StockLocation } from "#/features/inventory/stock.types.ts";

import { BatchAmount } from "#/features/inventory/BatchAmount/BatchAmount.tsx";
import { Card } from "#/components/Card/Card.tsx";
import styles from "./ProductCard.module.css";

type Props = {
  group: StockGroup;
  locations: StockLocation[];
  /** Calendar date in the pantry's time zone, for flagging dates that have passed. */
  today: string;
  canEdit: boolean;
  /** Highlights the card, e.g. for the product that was just added. */
  highlighted?: boolean;
};

/** One product: what is there and for how long, with each purchase's amount updated on its own. */
export function ProductCard({ group, locations, today, canEdit, highlighted }: Props) {
  const { product, batches, earliest } = group;
  const stock = summarizeStock({
    trackUnit: product.trackUnit,
    packageAmount: product.packageAmount,
    packageUnit: product.packageUnit,
    quarters: batches.map((batch) => batch.quarters),
  });
  const first = describeDate(batches[0].dateKind, batches[0].date, today);
  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "";

  return (
    <Card id={`product-${product.id}`} className={highlighted ? styles.justAdded : undefined}>
      <div className={styles.summary}>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            // CORS mode: Open Food Facts allows it, and it keeps the service worker's cached
            // copy a normal response instead of an opaque one that counts as ~7 MB of quota.
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className={styles.image}
          />
        )}
        <div>
          <h3 className={styles.name}>{productName(product) ?? m["stock.unnamed"]()}</h3>
          {product.brand && <p className={styles.meta}>{product.brand}</p>}
          <p className={styles.meta}>{stock.packages}</p>
          <p className={stock.left ? styles.left : styles.meta}>
            {stock.left ?? stock.needsDetails}
          </p>
          {earliest && (
            <p className={first.warning ? styles.warning : styles.meta}>
              {first.text}
              {first.warning && ` · ${first.warning}`}
            </p>
          )}
        </div>
      </div>
      <details>
        <summary>
          {m["stock.individual"]({ units: unitLabel(packageNoun(product.trackUnit), 2) })}
        </summary>
        <ul className={styles.batches}>
          {batches.map((batch) => {
            const info = describeDate(batch.dateKind, batch.date, today);
            return (
              <li key={batch.id} className={styles.batch}>
                <p className={styles.meta}>
                  {locationName(batch.locationId)} ·{" "}
                  {batch.opened ? m["global.opened"]() : m["global.unopened"]()} · {info.text}
                  {info.warning && <strong className={styles.warning}> · {info.warning}</strong>}
                </p>
                {canEdit && <BatchAmount batch={batch} />}
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}
