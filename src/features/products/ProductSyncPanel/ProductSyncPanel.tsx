import { m } from "#/paraglide/messages.js";
import { errorMessage } from "#/features/offline/network-failure.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getProductSyncStatus,
  startProductSync,
} from "#/features/products/product-sync.functions.ts";

import { Button } from "#/components/Button/Button.tsx";
import { Card } from "#/components/Card/Card.tsx";
import { Hint } from "#/components/Hint/Hint.tsx";
import { FormError } from "#/components/Form/FormError.tsx";
import { FreshnessSummary } from "./FreshnessSummary.tsx";
import { RunStatus } from "./RunStatus.tsx";

const queryKey = ["product-sync"];

/** Owner-only: when the Open Food Facts refresh last ran, with a manual trigger and progress. */
export function ProductSyncPanel() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getProductSyncStatus);
  const start = useServerFn(startProductSync);
  const sync = useMutation({
    mutationFn: (all: boolean) => start({ data: { all } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchStatus(),
    refetchInterval: (query) => (query.state.data?.run?.status === "running" ? 2_000 : false),
  });
  const run = data?.run;
  const freshness = data?.freshness;
  const running = run?.status === "running";

  return (
    <Card
      title={m["productData.title"]()}
      actions={
        <Button
          type="button"
          variant="secondary"
          disabled={running || sync.isPending}
          onClick={() => sync.mutate(true)}
        >
          {running ? m["global.refreshing"]() : m["productData.refreshAll"]()}
        </Button>
      }
    >
      <Hint spaced>{m["productData.hint"]()}</Hint>
      <FormError message={sync.error && errorMessage(sync.error, m["productData.startFailed"]())} />
      <FreshnessSummary freshness={freshness} />
      <RunStatus run={run} />
    </Card>
  );
}
