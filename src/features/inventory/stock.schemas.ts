import { z } from "zod";

import { dateKinds, trackUnits } from "#/db/schema.ts";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  // Date rolls 2025-02-31 over to March, so the date must survive a round trip unchanged.
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "Not a calendar date.");

const batchInput = z
  .object({
    id: z.uuid(),
    locationId: z.string().min(1),
    quarters: z.number().int().min(0).max(4),
    opened: z.boolean(),
    dateKind: z.enum(dateKinds),
    date: calendarDate.nullable(),
  })
  .refine(
    (b) =>
      (b.dateKind === "mhd" || b.dateKind === "use_by" || b.dateKind === "estimate") ===
      (b.date !== null),
    {
      message: "A date is required for printed dates and estimates, and only for those.",
    },
  );

const newProductInput = z
  .object({
    id: z.uuid(),
    barcode: z.string().nullable(),
    name: z.string().trim().min(1).max(200).nullable(),
    brand: z.string().trim().max(200).nullable(),
    trackUnit: z.enum(trackUnits),
    packageAmount: z.number().int().positive().nullable(),
    packageUnit: z.enum(["g", "ml"]).nullable(),
  })
  .refine((p) => (p.packageAmount === null) === (p.packageUnit === null), {
    message: "A package size needs both an amount and a unit.",
  });

export const addPurchaseInput = z.object({
  productId: z.string().min(1),
  /** Sent when the pantry may not have this product yet. */
  newProduct: newProductInput.optional(),
  batches: z.array(batchInput).min(1).max(50),
});

export const updateBatchInput = z.object({
  id: z.string().min(1),
  baseRevision: z.number().int().positive(),
  quarters: z.number().int().min(0).max(4).optional(),
  opened: z.boolean().optional(),
  discard: z.boolean().optional(),
});

export type NewProductInput = z.infer<typeof newProductInput>;
export type AddPurchaseInput = z.infer<typeof addPurchaseInput>;
export type UpdateBatchInput = z.infer<typeof updateBatchInput>;
