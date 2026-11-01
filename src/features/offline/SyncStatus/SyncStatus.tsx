import { m } from "#/paraglide/messages.js";
import { dateLocale } from "#/features/inventory/format.ts";
import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "#/components/Button/Button.tsx";
import styles from "./SyncStatus.module.css";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** True once `active` has lasted `ms`, so a request that finishes quickly never shows a banner. */
function useAfterDelay(active: boolean, ms: number) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, ms]);
  return active && elapsed;
}

type Props = {
  query: Pick<UseQueryResult, "isFetching" | "isError" | "dataUpdatedAt" | "refetch">;
};

/**
 * Shown only when something needs attention: offline, a refresh that is taking a while, or one
 * that failed. When the pantry is fine there is nothing to say, so it renders nothing.
 */
export function SyncStatus({ query }: Props) {
  const online = useOnline();
  const slowRefresh = useAfterDelay(query.isFetching, 600);

  if (!online) {
    return <output className={styles.status}>{m["sync.offline"]()}</output>;
  }
  if (query.isError && !query.isFetching) {
    const since = query.dataUpdatedAt
      ? ` ${m["sync.since"]({ time: new Date(query.dataUpdatedAt).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" }) })}`
      : "";
    return (
      <div role="alert" className={`${styles.status} ${styles.error}`}>
        <strong>{m["sync.failedTitle"]()}</strong>
        <span>{m["sync.failedBody"]({ since })}</span>
        <Button type="button" variant="secondary" onClick={() => void query.refetch()}>
          {m["global.tryAgain"]()}
        </Button>
      </div>
    );
  }
  if (slowRefresh) {
    return <output className={styles.status}>{m["global.refreshing"]()}</output>;
  }
  return null;
}
