import { createFileRoute } from "@tanstack/react-router";

import { Card } from "#/components/Card/Card.tsx";
import { Page } from "#/components/Page/Page.tsx";
import { getSharedPantry } from "#/domains/sharing/share-links.functions.ts";

export const Route = createFileRoute("/share/$token")({
  loader: ({ params }) => getSharedPantry({ data: { token: params.token } }),
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SharedPantry,
  errorComponent: () => (
    <Page title="Link unavailable">
      <Card>
        <p>This link is invalid or has been revoked.</p>
      </Card>
    </Page>
  ),
});

function SharedPantry() {
  const pantry = Route.useLoaderData();
  return (
    <Page title={pantry.name} badge="View only">
      <Card title="Pantry">
        <p>The read-only pantry view will appear here.</p>
      </Card>
    </Page>
  );
}
