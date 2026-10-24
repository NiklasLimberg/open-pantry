import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Page } from "#/components/Page/Page.tsx";
import { ShareLinkPanel } from "#/components/ShareLinkPanel/ShareLinkPanel.tsx";
import { StockView } from "#/components/StockView/StockView.tsx";
import { getStock } from "#/domains/inventory/stock.functions.ts";
import { roleCan } from "#/domains/pantry/permissions.ts";
import { listShareLinks } from "#/domains/sharing/share-links.functions.ts";

const authed = getRouteApi("/_authed");

export const Route = createFileRoute("/_authed/pantry")({
  // `added` is the product just added through the Scan sheet; it is cleared after being shown.
  validateSearch: z.object({ added: z.string().optional() }),
  loader: async ({ parentMatchPromise }) => {
    const { loaderData: pantry } = await parentMatchPromise;
    const canShare = !!pantry && roleCan(pantry.role, { shareLink: ["read"] });
    if (import.meta.env.SSR) {
      // The stock list is part of the page the server sends, so its HTML already contains it.
      const [stock, shareLinks] = await Promise.all([
        getStock(),
        canShare ? listShareLinks() : null,
      ]);
      return { initial: { data: stock, updatedAt: Date.now() }, shareLinks };
    }
    // In the browser the query cache supplies the stock; it is saved on the device, so this
    // works without a connection. The share links are optional and only shown to the owner.
    const shareLinks = canShare ? await listShareLinks().catch(() => null) : null;
    return { initial: undefined, shareLinks };
  },
  component: Home,
});

function Home() {
  const { initial, shareLinks } = Route.useLoaderData();
  const pantry = authed.useLoaderData();
  const { added } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <Page title={pantry.name} badge={pantry.role}>
      <StockView
        initial={initial}
        timeZone={pantry.timeZone}
        canEdit={roleCan(pantry.role, { inventory: ["update"] })}
        addedId={added}
        onAddedShown={() => void navigate({ to: "/pantry", search: {}, replace: true })}
      />
      {shareLinks && <ShareLinkPanel links={shareLinks} />}
    </Page>
  );
}
