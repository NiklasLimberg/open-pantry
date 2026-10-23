import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "#/domains/auth/auth.functions.ts";

// Navigation guard only; every server function checks the session and role itself.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/sign-in" });
    return { session };
  },
  component: Outlet,
});
