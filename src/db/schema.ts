import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

/**
 * Public Open Food Facts metadata, cached by barcode and shared by every pantry. Kept apart from
 * pantry-owned rows so a refresh never touches quantities, dates or user edits. Product data is
 * © Open Food Facts contributors, ODbL; show the source wherever it is displayed.
 */
export const offProduct = pgTable("off_product", {
  barcode: text("barcode").primaryKey(),
  /** `not_found` is cached too, so unknown barcodes don't hit the API on every scan. */
  status: text("status", { enum: ["found", "not_found"] }).notNull(),
  name: text("name"),
  brand: text("brand"),
  /** Free text as printed ("400 g e"); parsed only when unambiguous, otherwise confirmed by the user. */
  quantity: text("quantity"),
  categories: text("categories")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  imageUrl: text("image_url"),
  storageInstructions: text("storage_instructions"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

/** Where food is kept, e.g. Cupboard, Fridge, Freezer. */
export const location = pgTable(
  "location",
  {
    id: text("id").primaryKey(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("location_pantry_name_idx").on(table.pantryId, table.name)],
);

export const trackUnits = [
  "pack",
  "carton",
  "bottle",
  "loaf",
  "slice",
  "piece",
  "gram",
  "millilitre",
] as const;

/**
 * A food in one pantry. `name` and `brand` are the user's own values; while null the Open Food
 * Facts values for `barcode` are shown, so a refresh improves them but never overwrites an edit.
 */
export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    barcode: text("barcode"),
    name: text("name"),
    brand: text("brand"),
    /** Confirmed size of one retail package, in `packageUnit`. Never inferred from a trackUnit. */
    packageAmount: integer("package_amount"),
    packageUnit: text("package_unit", { enum: ["g", "ml"] }),
    trackUnit: text("track_unit", { enum: trackUnits }).notNull().default("pack"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_pantry_barcode_idx")
      .on(table.pantryId, table.barcode)
      .where(sql`${table.barcode} is not null`),
    index("product_barcode_idx").on(table.barcode),
    check(
      "product_package_check",
      sql`(${table.packageAmount} is null) = (${table.packageUnit} is null)`,
    ),
  ],
);

export const dateKinds = ["mhd", "use_by", "estimate", "none", "unknown"] as const;

/** One package: food acquired together with the same date, location and opened state. */
export const batch = pgTable(
  "batch",
  {
    id: text("id").primaryKey(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      // No action (checked at the end of the statement), so deleting a pantry can remove its
      // locations and batches together; `restrict` would fail depending on the order.
      .references(() => location.id),
    /** Remaining amount in quarters: 4 = Full, 3 = ¾, 2 = ½, 1 = ¼, 0 = Empty. */
    quarters: smallint("quarters").notNull().default(4),
    opened: boolean("opened").notNull().default(false),
    dateKind: text("date_kind", { enum: dateKinds }).notNull().default("unknown"),
    /** Calendar date, not a timestamp. Only set for mhd, use_by and estimate. */
    date: date("date", { mode: "string" }),
    /** Bumped on every change; absolute updates against a stale revision are rejected. */
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    discardedAt: timestamp("discarded_at", { withTimezone: true }),
  },
  (table) => [
    index("batch_pantry_id_idx").on(table.pantryId),
    index("batch_product_id_idx").on(table.productId),
    check("batch_quarters_check", sql`${table.quarters} between 0 and 4`),
    check(
      "batch_date_check",
      sql`(${table.dateKind} in ('mhd', 'use_by', 'estimate')) = (${table.date} is not null)`,
    ),
  ],
);
