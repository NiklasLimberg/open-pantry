import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";

import { stockQueryOptions } from "#/domains/inventory/stock-query.ts";
import { CACHE_MAX_AGE, CACHE_VERSION, createStockPersister } from "#/domains/offline/persister.ts";

type Props = {
  userId: string;
  pantryId: string;
  /** Fetch the stock right away, for pages that don't show it but open the Scan dialog. */
  prefetch: boolean;
  children: ReactNode;
};

/**
 * The query cache for one signed-in visit, saved to IndexedDB per user and pantry and removed on
 * sign-out. A failing fetch retries twice (1 s, 2 s) and then gives up, which the screens report.
 * Mount it with a `key` of the pantry: the cache and its storage are fixed for its lifetime.
 */
export function PantryCache({ userId, pantryId, prefetch, children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => 1000 * 2 ** attempt,
            // Saved queries are restored into the cache; it must keep them as long as they live.
            gcTime: CACHE_MAX_AGE,
          },
        },
      }),
  );
  const [persister] = useState(() => createStockPersister(userId, pantryId));

  useEffect(() => {
    if (prefetch) void queryClient.prefetchQuery(stockQueryOptions(pantryId));
  }, [prefetch, queryClient, pantryId]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] === "stock" && query.state.status === "success",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
