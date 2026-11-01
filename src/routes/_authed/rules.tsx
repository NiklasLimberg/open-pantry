import { m } from "#/paraglide/messages.js";
import { createFileRoute } from "@tanstack/react-router";

import { Page } from "#/layout/Page/Page.tsx";

export const Route = createFileRoute("/_authed/rules")({
  component: () => <Page title={m["global.stockRules"]()} />,
});
