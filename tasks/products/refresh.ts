import { defineTask } from "nitro/task";

import { refreshStaleProducts } from "#/domains/products/off-cache.ts";

// Scheduled in vite.config.ts. Refreshes the Open Food Facts data of products some pantry holds.
export default defineTask({
  meta: {
    name: "products:refresh",
    description: "Refresh stale Open Food Facts data for products in use",
  },
  async run() {
    return { result: await refreshStaleProducts() };
  },
});
