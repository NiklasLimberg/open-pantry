import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't boot the Start/Nitro dev servers.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: {
    // The database tests use the local Docker database unless CI points them elsewhere.
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://pantry:pantry@localhost:5432/open_pantry",
    },
  },
});
