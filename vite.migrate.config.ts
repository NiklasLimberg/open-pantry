import { defineConfig } from "vite";

// Bundles the migration runner with drizzle-orm and pg into one file for the production image.
export default defineConfig({
  build: {
    ssr: "src/db/migrate.ts",
    outDir: ".output/migrate",
    emptyOutDir: true,
    target: "node22",
    rollupOptions: { external: ["pg-native"] },
  },
  ssr: { noExternal: true },
});
