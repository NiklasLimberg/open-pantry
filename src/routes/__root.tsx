import { useEffect } from "react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, ScriptOnce, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { getLocale } from "#/paraglide/runtime.js";
import { registerServiceWorker } from "#/domains/offline/register-sw.ts";
import { themeScript } from "#/domains/theme/theme.ts";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Open Pantry",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // The manifest and service worker are only built for production (vite.config.ts).
      ...(import.meta.env.PROD ? [{ rel: "manifest", href: "/manifest.webmanifest" }] : []),
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(registerServiceWorker, []);
  return (
    // themeScript sets data-theme before hydration, so React must not flag the mismatch.
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <ScriptOnce>{themeScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            // Floating trigger parked just above the Scan button (bottom-right). Draggable; dev only.
            triggerMode: "floating",
            triggerCoords: { x: 100, y: 74 },
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
