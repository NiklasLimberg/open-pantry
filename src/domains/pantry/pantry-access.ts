import { m } from "#/paraglide/messages.js";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { member, organization } from "#/db/schema.ts";

import { isPantryRole, roleCan, type PantryRole, type Permissions } from "./permissions.ts";

// Server-only. Every server function that touches pantry data resolves a PantryAccess
// first and checks it with requirePermission; route guards are only navigation.

export type PantryAccess = {
  pantryId: string;
  pantryName: string;
  /** IANA zone used to compare calendar dates. */
  timeZone: string;
  role: PantryRole;
  /** null for share-link visitors. */
  userId: string | null;
};

export class ForbiddenError extends Error {
  constructor(message = m["error.noAccess"]()) {
    super(message);
    setResponseStatus(403);
    this.name = "ForbiddenError";
  }
}

export async function getMemberAccess(userId: string, pantryId: string): Promise<PantryAccess> {
  const [row] = await db
    .select({ role: member.role, pantryName: organization.name, timeZone: organization.timeZone })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, userId), eq(member.organizationId, pantryId)));
  if (!row || !isPantryRole(row.role)) throw new ForbiddenError();
  return { pantryId, pantryName: row.pantryName, timeZone: row.timeZone, role: row.role, userId };
}

export async function getFirstPantryId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ pantryId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(member.createdAt)
    .limit(1);
  return row?.pantryId ?? null;
}

export function requirePermission(access: PantryAccess, permissions: Permissions): void {
  if (!roleCan(access.role, permissions)) throw new ForbiddenError();
}
