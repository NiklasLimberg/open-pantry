import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "#/components/Button/Button.tsx";
import { Card } from "#/components/Card/Card.tsx";
import { Page } from "#/components/Page/Page.tsx";
import { ShareLinkPanel } from "#/components/ShareLinkPanel/ShareLinkPanel.tsx";
import { authClient } from "#/domains/auth/auth-client.ts";
import { roleCan } from "#/domains/pantry/permissions.ts";
import { getCurrentPantry } from "#/domains/pantry/pantry.functions.ts";
import { listShareLinks } from "#/domains/sharing/share-links.functions.ts";

export const Route = createFileRoute("/_authed/pantry")({
  loader: async () => {
    const pantry = await getCurrentPantry();
    const shareLinks = roleCan(pantry.role, { shareLink: ["read"] })
      ? await listShareLinks()
      : null;
    return { pantry, shareLinks };
  },
  component: Home,
});

function Home() {
  const { pantry, shareLinks } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <Page
      title={pantry.name}
      badge={pantry.role}
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await authClient.signOut();
            await navigate({ to: "/sign-in" });
          }}
        >
          Sign out
        </Button>
      }
    >
      <Card title="Pantry">
        <p>Signed in as {pantry.user.email}. Pantry, rules, and shopping screens come next.</p>
      </Card>
      {shareLinks && <ShareLinkPanel links={shareLinks} />}
    </Page>
  );
}
