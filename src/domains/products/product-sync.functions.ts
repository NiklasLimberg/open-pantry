import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "#/domains/pantry/pantry-access.ts";
import { pantryMiddleware } from "#/domains/pantry/pantry.functions.ts";

import { getOffFreshness, refreshTaskName, runProductRefresh } from "./off-cache.ts";
import { getTaskRun } from "./task-run.ts";

export const getProductSyncStatus = createServerFn({ method: "GET" })
  .middleware([pantryMiddleware])
  .handler(async ({ context: { access } }) => {
    requirePermission(access, { productSync: ["read"] });
    return { run: await getTaskRun(refreshTaskName), freshness: await getOffFreshness() };
  });

/**
 * Starts a refresh (stale barcodes only, or all with `all`) and returns once it has started: a run
 * takes minutes because Open Food Facts is queried at 5 s spacing. The page follows progress through getProductSyncStatus.
 */
export const startProductSync = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(z.object({ all: z.boolean().default(false) }))
  .handler(async ({ data, context: { access } }) => {
    requirePermission(access, { productSync: ["run"] });
    // Awaiting the start surfaces database errors to the page; the run itself continues after.
    const run = await runProductRefresh({ all: data.all });
    run?.finished.catch((error) => console.error("Product sync failed", error));
    return { started: run !== null };
  });
