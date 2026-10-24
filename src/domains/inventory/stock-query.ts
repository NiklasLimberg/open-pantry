import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { getStock, type StockData } from "#/domains/inventory/stock.functions.ts";

// The pantry is one query. Screens show the cached copy straight away, refetch behind it when it
// is older than staleTime, and report a failed refetch instead of hiding it. Writes are plain
// forms: they wait for the server, then call useRefreshStock so every screen shows the result.

const authed = getRouteApi("/_authed");

export const stockQueryOptions = (pantryId: string) =>
  queryOptions({
    queryKey: ["stock", pantryId],
    queryFn: () => getStock(),
    staleTime: 30_000,
  });

export type InitialStock = { data: StockData; updatedAt: number };

/**
 * The pantry's stock. A route that loaded it already passes it as `initial`, so the server's HTML
 * contains the list and no request is needed until it goes stale.
 */
export function useStockQuery(initial?: InitialStock) {
  const { id } = authed.useLoaderData();
  return useQuery({
    ...stockQueryOptions(id),
    ...(initial && { initialData: initial.data, initialDataUpdatedAt: initial.updatedAt }),
  });
}

/** Marks the stock stale and resolves once the fresh copy has arrived. */
export function useRefreshStock() {
  const queryClient = useQueryClient();
  const { id } = authed.useLoaderData();
  return () => queryClient.invalidateQueries({ queryKey: stockQueryOptions(id).queryKey });
}
