import { defineTask } from "nitro/task";

import { runProductRefresh } from "../../src/features/products/off-cache.ts";

// Scheduled in vite.config.ts. Refreshes the Open Food Facts data of products some pantry holds.
export default defineTask({
  meta: {
    name: "products:refresh",
    description: "Refresh stale Open Food Facts data for products in use",
  },
  async run() {
    const run = await runProductRefresh();
    return { result: (await run?.finished) ?? null };
  },
});
