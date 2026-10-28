import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  getProductSyncStatus,
  startProductSync,
} from "#/domains/products/product-sync.functions.ts";

import { Button } from "../Button/Button.tsx";
import { Card } from "../Card/Card.tsx";
import { FormError } from "../Form/Form.tsx";
import styles from "./ProductSyncPanel.module.css";

const queryKey = ["product-sync"];

function formatTime(date: Date | string) {
  return new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

/** Owner-only: when the Open Food Facts refresh last ran, with a manual trigger and progress. */
export function ProductSyncPanel() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getProductSyncStatus);
  const start = useServerFn(startProductSync);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchStatus(),
    refetchInterval: (query) => (query.state.data?.run?.status === "running" ? 2_000 : false),
  });
  const run = data?.run;
  const freshness = data?.freshness;
  const running = run?.status === "running";

  async function sync(all: boolean) {
    setError(null);
    setStarting(true);
    try {
      await start({ data: { all } });
      await queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the sync.");
    } finally {
      setStarting(false);
    }
  }

  const fresh = freshness ? freshness.held - freshness.missing - freshness.stale : 0;
  const bands = freshness
    ? [
        { key: "fresh", label: "fresh", count: fresh },
        { key: "due", label: "due", count: freshness.stale },
        { key: "never", label: "never fetched", count: freshness.missing },
      ]
    : [];

  return (
    <Card
      title="Product data"
      actions={
        <Button
          type="button"
          variant="secondary"
          disabled={running || starting}
          onClick={() => void sync(true)}
        >
          {running ? "Refreshing…" : "Refresh all"}
        </Button>
      }
    >
      <p className={styles.hint}>
        From Open Food Facts. Entries that are due refresh by themselves every 30 minutes, 20 at a
        time. Refresh all re-checks every product, about 5 seconds each.
      </p>
      <FormError message={error} />
      {freshness && freshness.held > 0 ? (
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
            <p className={styles.detail}>Oldest data from {formatTime(freshness.oldest)}.</p>
          )}
        </>
      ) : (
        <p className={styles.detail}>No products with a barcode yet.</p>
      )}
      <div className={styles.run}>
        {!run && <p>Hasn't run yet.</p>}
        {run && running && (
          <>
            <p>
              {run.total > 0
                ? `${run.full ? "Refreshing everything" : "Refreshing"} · ${run.processed} of ${run.total}`
                : "Looking for products to refresh…"}
            </p>
            <progress
              className={styles.progress}
              value={run.processed}
              max={Math.max(run.total, 1)}
              aria-label="Refresh progress"
            />
          </>
        )}
        {run && !running && run.finishedAt && (
          <p>
            {run.status === "failed" ? "Last run failed" : "Last run"} {formatTime(run.finishedAt)}
            {run.status === "succeeded" && ` · ${run.processed} of ${run.total} checked`}
            {run.status === "failed" && run.error ? ` · ${run.error}` : ""}
          </p>
        )}
      </div>
    </Card>
  );
}
