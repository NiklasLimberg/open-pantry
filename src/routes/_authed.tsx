import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";

import { AppShell } from "#/layout/AppShell/AppShell.tsx";
import { LocaleBoundary } from "#/features/i18n/LocaleBoundary/LocaleBoundary.tsx";
import { PantryCache } from "#/layout/PantryCache/PantryCache.tsx";
import { ScanFab } from "#/features/scan/ScanFab/ScanFab.tsx";
import { getSession } from "#/features/auth/auth.functions.ts";
import { getVerifiedSession, setVerifiedSession } from "#/features/auth/verified-session.ts";
import { isNetworkFailure } from "#/features/offline/network-failure.ts";
import { loadPantry, savePantry } from "#/features/offline/persister.ts";
import { getCurrentPantry } from "#/features/pantry/pantry.functions.ts";
import { roleCan } from "#/features/pantry/permissions.ts";

type Pantry = Awaited<ReturnType<typeof getCurrentPantry>>;

// Navigation guard only; every server function checks the session and role itself.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const verified = getVerifiedSession();
    if (!import.meta.env.SSR && verified) {
      return { session: verified };
    }
    try {
      const session = await getSession();
      if (!session) {
        throw redirect({ to: "/sign-in" });
      }
      if (!import.meta.env.SSR) {
        setVerifiedSession(session);
      }
      return { session };
    } catch (error) {
      // Offline: stay on the signed-in screens, which show what is cached. Anything that needs
      // the server reports its own error.
      if (isNetworkFailure(error)) {
        return { session: null };
      }
      throw error;
    }
  },
  loader: async (): Promise<Pantry> => {
    try {
      const pantry = await getCurrentPantry();
      if (!import.meta.env.SSR) {
        void savePantry(pantry);
      }
      return pantry;
    } catch (error) {
      // Offline: use the pantry details saved on this device, if any.
      const saved = isNetworkFailure(error) ? await loadPantry<Pantry>() : undefined;
      if (saved) {
        return saved;
      }
      throw error;
    }
  },
  // The pantry's name and the user's role don't change while the app is open.
  staleTime: Infinity,
  component: AuthedLayout,
});

/** Shared by every signed-in page: the query cache, main navigation and the Scan button. */
function AuthedLayout() {
  const pantry = Route.useLoaderData();
  const navigate = useNavigate();
  const canAdd = roleCan(pantry.role, { inventory: ["create"] });

  return (
    <PantryCache key={pantry.id} userId={pantry.user.id} pantryId={pantry.id} prefetch={canAdd}>
      <LocaleBoundary>
        <AppShell>
          <Outlet />
        </AppShell>
        {canAdd && (
          // After adding, show the list with the new item scrolled into view.
          <ScanFab onAdded={(added) => void navigate({ to: "/pantry", search: { added } })} />
        )}
      </LocaleBoundary>
    </PantryCache>
  );
}
