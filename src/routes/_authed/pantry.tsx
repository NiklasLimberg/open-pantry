import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Page } from "#/layout/Page/Page.tsx";
import { StockView } from "#/features/inventory/StockView/StockView.tsx";
import { getStock } from "#/features/inventory/stock.functions.ts";
import { roleCan } from "#/features/pantry/permissions.ts";

const authed = getRouteApi("/_authed");

export const Route = createFileRoute("/_authed/pantry")({
  // `added` is the product just added through the Scan sheet; it is cleared after being shown.
  validateSearch: z.object({ added: z.string().optional() }),
  loader: async () => {
    // The stock list is part of the page the server sends, so its HTML already contains it. In
    // the browser the query cache supplies it; it is saved on the device, so that works without
    // a connection.
    if (!import.meta.env.SSR) {
      return { initial: undefined };
    }
    return { initial: { data: await getStock(), updatedAt: Date.now() } };
  },
  component: Home,
});

function Home() {
  const { initial } = Route.useLoaderData();
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
    </Page>
  );
}
