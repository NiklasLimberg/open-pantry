import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { Button } from "#/components/Button/Button.tsx";
import { Card } from "#/components/Card/Card.tsx";
import { LanguageSetting } from "#/features/i18n/LanguageSetting/LanguageSetting.tsx";
import { ProductSyncPanel } from "#/features/products/ProductSyncPanel/ProductSyncPanel.tsx";
import { Page } from "#/layout/Page/Page.tsx";
import { authClient } from "#/features/auth/auth-client.ts";
import { endSession } from "#/features/auth/end-session.ts";
import { m } from "#/paraglide/messages.js";
import { roleCan } from "#/features/pantry/permissions.ts";

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
            await endSession();
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
