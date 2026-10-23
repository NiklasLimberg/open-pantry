import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization, user } from "./auth-schema.ts";

// Better Auth tables are generated into auth-schema.ts (`pnpm auth:generate`); don't edit that file.
// A pantry is a Better Auth organization, so pantry-owned tables reference organization.id.
export * from "./auth-schema.ts";

/** Read-only link to a pantry for people without an account. Only a hash of the token is stored. */
export const shareLink = pgTable(
  "share_link",
  {
    id: text("id").primaryKey(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("share_link_pantry_id_idx").on(table.pantryId)],
);
