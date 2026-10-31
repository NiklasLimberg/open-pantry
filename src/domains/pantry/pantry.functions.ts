import { m } from "#/paraglide/messages.js";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/domains/auth/auth.ts";

import { getFirstPantryId, getMemberAccess } from "./pantry-access.ts";

/** Requires a signed-in user and resolves their role in the active pantry. */
export const pantryMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error(m["error.notSignedIn"]());
  // Sessions don't store an active pantry yet (one pantry per user), so use the first membership.
  const pantryId =
    session.session.activeOrganizationId ?? (await getFirstPantryId(session.user.id));
  if (!pantryId) throw new Error(m["error.noPantry"]());
  const access = await getMemberAccess(session.user.id, pantryId);
  return next({ context: { session, access } });
});

export const getCurrentPantry = createServerFn({ method: "GET" })
  .middleware([pantryMiddleware])
  .handler(({ context }) => ({
    id: context.access.pantryId,
    name: context.access.pantryName,
    timeZone: context.access.timeZone,
    role: context.access.role,
    user: {
      id: context.session.user.id,
      name: context.session.user.name,
      email: context.session.user.email,
    },
  }));
