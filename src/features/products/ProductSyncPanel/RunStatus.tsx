import { m } from "#/paraglide/messages.js";
import type { getProductSyncStatus } from "#/features/products/product-sync.functions.ts";

import { formatTime } from "./format-time.ts";
import styles from "./ProductSyncPanel.module.css";

type Run = Awaited<ReturnType<typeof getProductSyncStatus>>["run"];

/** The last refresh run: progress while it is running, otherwise how it ended. */
export function RunStatus({ run }: { run: Run | undefined }) {
  const running = run?.status === "running";
  return (
    <div className={styles.run}>
      {!run && <p>{m["productData.neverRun"]()}</p>}
      {run && running && (
        <>
          <p>
            {run.total > 0
              ? m["productData.progress"]({
                  label: run.full
                    ? m["productData.refreshingAll"]()
                    : m["productData.refreshingSome"](),
                  processed: run.processed,
                  total: run.total,
                })
              : m["productData.looking"]()}
          </p>
          <progress
            className={styles.progress}
            value={run.processed}
            max={Math.max(run.total, 1)}
            aria-label={m["productData.progressLabel"]()}
          />
        </>
      )}
      {run && !running && run.finishedAt && (
        <p>
          {run.status === "failed" ? m["productData.lastFailed"]() : m["productData.last"]()}{" "}
          {formatTime(run.finishedAt)}
          {run.status === "succeeded" &&
            ` · ${m["productData.checked"]({ processed: run.processed, total: run.total })}`}
          {run.status === "failed" && run.error ? ` · ${run.error}` : ""}
        </p>
      )}
    </div>
  );
}
