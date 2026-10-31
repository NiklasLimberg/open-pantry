import { m } from "#/paraglide/messages.js";
import { createFileRoute } from "@tanstack/react-router";

import { Card } from "#/components/Card/Card.tsx";
import { Page } from "#/components/Page/Page.tsx";
import { getSharedPantry } from "#/domains/sharing/share-links.functions.ts";

export const Route = createFileRoute("/share/$token")({
  loader: ({ params }) => getSharedPantry({ data: { token: params.token } }),
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SharedPantry,
  errorComponent: () => (
    <Page title={m["share.unavailableTitle"]()}>
      <Card>
        <p>{m["share.unavailableBody"]()}</p>
      </Card>
    </Page>
  ),
});

function SharedPantry() {
  const pantry = Route.useLoaderData();
  return (
    <Page title={pantry.name} badge={m["share.viewOnly"]()}>
      <Card title={m["global.pantry"]()}>
        <p>{m["share.placeholder"]()}</p>
      </Card>
    </Page>
  );
}
