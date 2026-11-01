import { m } from "#/paraglide/messages.js";
import type { getProductSyncStatus } from "#/features/products/product-sync.functions.ts";

import { formatTime } from "./format-time.ts";
import styles from "./ProductSyncPanel.module.css";

type Freshness = Awaited<ReturnType<typeof getProductSyncStatus>>["freshness"];

/** How much of the cached Open Food Facts data is fresh, due for a refresh, or missing. */
export function FreshnessSummary({ freshness }: { freshness: Freshness | undefined }) {
  if (!freshness || freshness.held === 0) {
    return <p className={styles.detail}>{m["productData.none"]()}</p>;
  }
  const fresh = freshness.held - freshness.missing - freshness.stale;
  const bands = [
    { key: "fresh", label: m["productData.fresh"](), count: fresh },
    { key: "due", label: m["productData.due"](), count: freshness.stale },
    { key: "never", label: m["productData.never"](), count: freshness.missing },
  ] as const;

  return (
    <>
      {/* The legend below carries the same numbers as text. */}
      <div className={styles.bar} aria-hidden="true">
        {bands.map((band) => (
          <span
            key={band.key}
            className={styles[band.key]}
            style={{ flexGrow: band.count }}
            hidden={band.count === 0}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {bands.map((band) => (
          <li key={band.key}>
            <span className={`${styles.dot} ${styles[band.key]}`} />
            {band.count} {band.label}
          </li>
        ))}
      </ul>
      {freshness.oldest && (
        <p className={styles.detail}>
          {m["productData.oldest"]({ time: formatTime(freshness.oldest) })}
        </p>
      )}
    </>
  );
}
