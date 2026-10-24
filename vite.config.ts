import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Every 30 minutes: up to 20 stale products, spaced to stay below the Open Food Facts quota.
    nitro({
      experimental: { tasks: true },
      tasks: {
        "products:refresh": {
          handler: fileURLToPath(new URL("./tasks/products/refresh.ts", import.meta.url)),
        },
      },
      scheduledTasks: { "*/30 * * * *": ["products:refresh"] },
    }),
    tanstackStart(),
    viteReact(),
    // Service worker for offline starts (src/sw.ts). Start writes the client build to
    // .output/public; there is no index.html to inject into, so the app registers it itself.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      outDir: fileURLToPath(new URL("./.output/public", import.meta.url)),
      injectRegister: false,
      manifest: {
        name: "Open Pantry",
        short_name: "Pantry",
        start_url: "/pantry",
        display: "standalone",
        background_color: "#f7f6f0",
        theme_color: "#294f3b",
      },
      // Includes the barcode reader's wasm file (about 1 MB), so scanning works offline even when
      // the app was installed while online and never scanned before. Its name carries a content
      // hash, so it is downloaded again only when the reader changes.
      injectManifest: { globPatterns: ["assets/**/*.{js,css,woff2,wasm}"] },
    }),
  ],
});

export default config;
