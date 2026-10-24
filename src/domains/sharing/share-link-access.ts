import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { organization, shareLink } from "#/db/schema.ts";
import { ForbiddenError, type PantryAccess } from "#/domains/pantry/pantry-access.ts";

// Server-only.

/** Share links always grant the viewer role, whatever the creator's role. */
export async function getShareLinkAccess(token: string): Promise<PantryAccess> {
  const [row] = await db
    .select({
      pantryId: shareLink.pantryId,
      pantryName: organization.name,
      timeZone: organization.timeZone,
    })
    .from(shareLink)
    .innerJoin(organization, eq(organization.id, shareLink.pantryId))
    .where(
      and(
        eq(shareLink.tokenHash, hashShareToken(token)),
        isNull(shareLink.revokedAt),
        or(isNull(shareLink.expiresAt), gt(shareLink.expiresAt, new Date())),
      ),
    );
  if (!row) throw new ForbiddenError("This link is invalid or has been revoked.");
  return { ...row, role: "viewer", userId: null };
}

export function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
