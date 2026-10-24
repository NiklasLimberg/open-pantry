import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { Button } from "#/components/Button/Button.tsx";
import { Card } from "#/components/Card/Card.tsx";
import { Page } from "#/components/Page/Page.tsx";
import { authClient } from "#/domains/auth/auth-client.ts";
import { resetVerifiedSession } from "#/domains/auth/verified-session.ts";
import { clearLocalData } from "#/domains/offline/persister.ts";

const authed = getRouteApi("/_authed");

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
});

function Settings() {
  const pantry = authed.useLoaderData();

  return (
    <Page title="Settings">
      <Card title="Account">
        <p>Signed in as {pantry.user.email}.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await authClient.signOut();
            resetVerifiedSession();
            // Remove what this device saved for the account (cached pantry and pages), then
            // reload so nothing from this visit stays in memory for the next sign-in.
            await clearLocalData();
            window.location.assign("/sign-in");
          }}
        >
          Sign out
        </Button>
      </Card>
    </Page>
  );
}
