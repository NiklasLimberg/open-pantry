import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index.ts";
import { shareLink } from "#/db/schema.ts";

import { requirePermission } from "#/domains/pantry/pantry-access.ts";
import { pantryMiddleware } from "#/domains/pantry/pantry.functions.ts";

import { createShareToken, getShareLinkAccess, hashShareToken } from "./share-link-access.ts";

export const listShareLinks = createServerFn({ method: "GET" })
  .middleware([pantryMiddleware])
  .handler(async ({ context: { access } }) => {
    requirePermission(access, { shareLink: ["read"] });
    return db
      .select({
        id: shareLink.id,
        label: shareLink.label,
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
      })
      .from(shareLink)
      .where(and(eq(shareLink.pantryId, access.pantryId), isNull(shareLink.revokedAt)))
      .orderBy(desc(shareLink.createdAt));
  });

/** Returns the token once; only its hash is stored, so it can't be shown again later. */
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(z.object({ label: z.string().trim().max(80).optional() }))
  .handler(async ({ data, context: { access, session } }) => {
    requirePermission(access, { shareLink: ["create"] });
    const token = createShareToken();
    await db.insert(shareLink).values({
      id: crypto.randomUUID(),
      pantryId: access.pantryId,
      tokenHash: hashShareToken(token),
      label: data.label || null,
      createdBy: session.user.id,
    });
    return { token };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([pantryMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { access } }) => {
    requirePermission(access, { shareLink: ["revoke"] });
    await db
      .update(shareLink)
      .set({ revokedAt: new Date() })
      .where(and(eq(shareLink.id, data.id), eq(shareLink.pantryId, access.pantryId)));
  });

/** Public: what a share-link visitor may see. */
export const getSharedPantry = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const access = await getShareLinkAccess(data.token);
    requirePermission(access, { inventory: ["read"] });
    return { name: access.pantryName, role: access.role };
  });
