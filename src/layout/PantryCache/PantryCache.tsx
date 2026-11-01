import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";

import { getSession } from "#/features/auth/auth.functions.ts";
import { endSession } from "#/features/auth/end-session.ts";
import { stockQueryOptions } from "#/features/inventory/stock-query.ts";
import {
  CACHE_MAX_AGE,
  CACHE_VERSION,
  createStockPersister,
} from "#/features/offline/persister.ts";

type Props = {
  userId: string;
  pantryId: string;
  /** Fetch the stock right away, for pages that don't show it but open the Scan dialog. */
  prefetch: boolean;
  children: ReactNode;
};

let checking = false;

/**
 * After any failed call, asks the server whether the session is still valid and leaves the
 * signed-in screens if it is not. A network error leaves things as they are: offline is not
 * signed out.
 */
async function endSessionIfGone() {
  if (checking) {
    return;
  }
  checking = true;
  try {
    if (!(await getSession())) {
      await endSession();
    }
  } catch {
    // Unreachable server: keep what is on screen.
  } finally {
    checking = false;
  }
}

/**
 * The query cache for one signed-in visit, saved to IndexedDB per user and pantry and removed on
 * sign-out. A failing fetch retries twice (1 s, 2 s) and then gives up, which the screens report.
 * Mount it with a `key` of the pantry: the cache and its storage are fixed for its lifetime.
 */
export function PantryCache({ userId, pantryId, prefetch, children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: () => void endSessionIfGone() }),
        mutationCache: new MutationCache({ onError: () => void endSessionIfGone() }),
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
    if (prefetch) {
      void queryClient.prefetchQuery(stockQueryOptions(pantryId));
    }
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
