import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { Button } from "#/components/Button/Button.tsx";
import { Card } from "#/components/Card/Card.tsx";
import { LanguageSetting } from "#/components/LanguageSetting/LanguageSetting.tsx";
import { ProductSyncPanel } from "#/components/ProductSyncPanel/ProductSyncPanel.tsx";
import { Page } from "#/components/Page/Page.tsx";
import { authClient } from "#/domains/auth/auth-client.ts";
import { resetVerifiedSession } from "#/domains/auth/verified-session.ts";
import { clearLocalData } from "#/domains/offline/persister.ts";
import { m } from "#/paraglide/messages.js";
import { roleCan } from "#/domains/pantry/permissions.ts";

const authed = getRouteApi("/_authed");

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
});

function Settings() {
  const pantry = authed.useLoaderData();

  return (
    <Page title={m["settings.title"]()}>
      <Card title={m["settings.account"]()}>
        <p>{m["settings.signedIn"]({ email: pantry.user.email })}</p>
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
          {m["settings.signOut"]()}
        </Button>
      </Card>
      <LanguageSetting />
      {roleCan(pantry.role, { productSync: ["read"] }) && <ProductSyncPanel />}
    </Page>
  );
}
