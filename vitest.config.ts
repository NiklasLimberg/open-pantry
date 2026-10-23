import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't boot the Start/Nitro dev servers.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
});
