import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { trackUnits } from "#/db/schema.ts";
import { unitLabel, type DateKind } from "#/domains/inventory/format.ts";
import type { LookupState } from "#/domains/inventory/lookup.ts";
import { toPurchaseInput, type PurchaseValues } from "#/domains/inventory/purchase.ts";
import { useRefreshStock } from "#/domains/inventory/stock-query.ts";
import {
  addPurchase,
  type StockLocation,
  type StockProduct,
} from "#/domains/inventory/stock.functions.ts";

import { AmountPicker, startAmountOptions } from "../AmountPicker/AmountPicker.tsx";
import { Button } from "../Button/Button.tsx";
import { FormError, FormInput, FormSelect } from "../Form/Form.tsx";
import styles from "./AddPurchase.module.css";

type Props = {
  barcode: string | null;
  /** The pantry's own product for this barcode, when it already has one. */
  existing: StockProduct | null;
  lookup: LookupState | null;
  locations: StockLocation[];
  /** Called with the product's ID once the server has the purchase. */
  onSaved: (productId: string) => void;
};

const dateKindOptions: Array<{ value: DateKind; label: string }> = [
  { value: "mhd", label: "MHD (best before)" },
  { value: "use_by", label: "Verbrauchsdatum (use by)" },
  { value: "none", label: "No printed date" },
  { value: "unknown", label: "Not entered yet" },
];

/**
 * What one package is called. Grams and millilitres are not offered here: they are the package
 * size's unit above, and the card shows the amount left in that unit once a size is entered.
 */
const packageUnits = trackUnits.filter((unit) => unit !== "gram" && unit !== "millilitre");

const schema = z
  .object({
    name: z.string().trim().max(200),
    brand: z.string().trim().max(200),
    trackUnit: z.enum(trackUnits),
    packageAmount: z.string().trim(),
    packageUnit: z.enum(["g", "ml"]),
    count: z.number().int().min(1, "Add at least one.").max(20, "Add up to 20 at a time."),
    locationId: z.string().min(1, "Choose where it is kept."),
    dateKind: z.enum(["mhd", "use_by", "none", "unknown"]),
    date: z.string(),
    amount: z.enum(["4", "3", "2", "1"]),
    needsName: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.needsName && !value.name) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Enter a name for this product." });
    }
    if (value.packageAmount && !(Number(value.packageAmount) > 0)) {
      ctx.addIssue({ code: "custom", path: ["packageAmount"], message: "Enter a positive size." });
    }
    if ((value.dateKind === "mhd" || value.dateKind === "use_by") && !value.date) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Enter the printed date, or choose No printed date.",
      });
    }
  });

/** Details of a new purchase: the product (when the pantry doesn't know it yet), how many, where, until when. */
export function AddPurchase({ barcode, existing, lookup, locations, onSaved }: Props) {
  const refresh = useRefreshStock();
  const [error, setError] = useState<string | null>(null);
  const [ids] = useState(() => ({
    product: crypto.randomUUID(),
    batches: Array.from({ length: 20 }, () => crypto.randomUUID()),
  }));
  const found = lookup?.status === "found" ? lookup : null;
  const suggestion = found?.suggestedPackage ?? existing?.suggestedPackage ?? null;

  const defaultValues: PurchaseValues & { needsName: boolean } = {
    name: existing?.name ?? found?.name ?? "",
    brand: existing?.brand ?? found?.brand ?? "",
    trackUnit: existing?.trackUnit ?? "pack",
    packageAmount: String(existing?.packageAmount ?? suggestion?.amount ?? ""),
    packageUnit: existing?.packageUnit ?? suggestion?.unit ?? "g",
    count: 1,
    locationId: locations[0]?.id ?? "",
    dateKind: "mhd",
    date: "",
    amount: "4",
    needsName: !existing && !barcode,
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null);
      const input = toPurchaseInput({ values: value, barcode, existing, found, ids });
      try {
        await addPurchase({ data: input });
        await refresh();
        onSaved(input.productId);
      } catch {
        setError("Couldn't save. Check your connection and try again; nothing was added.");
      }
    },
  });

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {existing ? (
        <p className={styles.product}>
          <strong>{existing.name ?? barcode}</strong>
          {existing.brand && <span> · {existing.brand}</span>}
        </p>
      ) : (
        <>
          <form.Field name="name">{(field) => <FormInput field={field} label="Name" />}</form.Field>
          <form.Field name="brand">
            {(field) => <FormInput field={field} label="Brand (optional)" />}
          </form.Field>
          <div className={styles.sizeRow}>
            <form.Field name="packageAmount">
              {(field) => (
                <FormInput
                  field={field}
                  label="Package size (optional)"
                  hint={
                    suggestion ? "From Open Food Facts. Check it against the package." : undefined
                  }
                  inputMode="decimal"
                />
              )}
            </form.Field>
            <form.Field name="packageUnit">
              {(field) => (
                <FormSelect field={field} label="Unit">
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </FormSelect>
              )}
            </form.Field>
          </div>
          <form.Field name="trackUnit">
            {(field) => (
              <FormSelect
                field={field}
                label="Track amount in"
                hint="What you call one package. Its size, if entered, is shown next to what is left."
              >
                {packageUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit, 2)}
                  </option>
                ))}
              </FormSelect>
            )}
          </form.Field>
        </>
      )}

      <div className={styles.row}>
        <form.Field name="count">
          {(field) => <FormInput field={field} label="How many" type="number" min={1} max={20} />}
        </form.Field>
        <form.Field name="locationId">
          {(field) => (
            <FormSelect field={field} label="Location">
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>
      </div>

      <form.Field name="dateKind">
        {(field) => (
          <FormSelect field={field} label="Date on the package">
            {dateKindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.dateKind}>
        {(dateKind) => (
          <form.Field name="date">
            {(field) => (
              <FormInput
                field={field}
                label="Date"
                type="date"
                disabled={dateKind === "none" || dateKind === "unknown"}
              />
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="amount">
        {(field) => (
          <AmountPicker
            name="amount"
            legend="Amount left"
            options={startAmountOptions}
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <FormError message={error} />
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            Add to pantry
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
