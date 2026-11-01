import { productName } from "#/features/inventory/product-name.ts";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";

import { trackUnits } from "#/db/schema.ts";
import { unitLabel, type DateKind } from "#/features/inventory/format.ts";
import type { LookupState } from "#/features/scan/lookup.ts";
import {
  maxPackagesPerPurchase,
  toPurchaseInput,
  type PurchaseInput,
  purchaseDefaults,
} from "#/features/scan/purchase.ts";
import { usePantry } from "#/features/pantry/use-pantry.ts";
import { useRefreshStock } from "#/features/inventory/stock-query.ts";
import { addPurchase } from "#/features/inventory/stock.functions.ts";
import type { StockLocation, StockProduct } from "#/features/inventory/stock.types.ts";

import { m } from "#/paraglide/messages.js";

import { AmountPicker, startAmountOptions } from "#/components/AmountPicker/AmountPicker.tsx";
import { Button } from "#/components/Button/Button.tsx";
import { FormError } from "#/components/Form/FormError.tsx";
import { FormInput } from "#/components/Form/FormInput.tsx";
import { FormRoot } from "#/components/Form/FormRoot.tsx";
import { FormSelect } from "#/components/Form/FormSelect.tsx";
import styles from "./AddPurchase.module.css";
import { TypedDate } from "./TypedDate.tsx";

type Props = {
  barcode: string | null;
  /** The pantry's own product for this barcode, when it already has one. */
  existing: StockProduct | null;
  lookup: LookupState | null;
  locations: StockLocation[];
  /** Called with the product's ID once the server has the purchase. */
  onSaved: (productId: string) => void;
};

const dateKindOptions = (): { value: DateKind; label: string }[] => [
  { value: "mhd", label: m["purchase.dateKind.mhd"]() },
  { value: "use_by", label: m["purchase.dateKind.useBy"]() },
  { value: "none", label: m["global.dateKind.none"]() },
  { value: "unknown", label: m["purchase.dateKind.notEntered"]() },
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
    // Messages are functions: they are read when validation fails, in that request's language.
    count: z
      .number()
      .int()
      .min(1, { error: () => m["purchase.validation.atLeastOne"]() })
      .max(maxPackagesPerPurchase, { error: () => m["purchase.validation.atMostTwenty"]() }),
    locationId: z.string().min(1, { error: () => m["purchase.validation.chooseLocation"]() }),
    dateKind: z.enum(["mhd", "use_by", "none", "unknown"]),
    date: z.string(),
    amount: z.enum(["4", "3", "2", "1"]),
    needsName: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.needsName && !value.name) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: m["purchase.validation.enterName"](),
      });
    }
    if (value.packageAmount && !(Number(value.packageAmount) > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["packageAmount"],
        message: m["purchase.validation.positiveSize"](),
      });
    }
    if ((value.dateKind === "mhd" || value.dateKind === "use_by") && !value.date) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: m["purchase.validation.enterDate"](),
      });
    }
  });

/** Details of a new purchase: the product (when the pantry doesn't know it yet), how many, where, until when. */
export function AddPurchase({ barcode, existing, lookup, locations, onSaved }: Props) {
  const refresh = useRefreshStock();
  const { timeZone } = usePantry();
  const save = useMutation({
    mutationFn: (input: PurchaseInput) => addPurchase({ data: input }),
    onSuccess: async (_, input) => {
      await refresh();
      onSaved(input.productId);
    },
  });
  const [ids] = useState(() => ({
    product: crypto.randomUUID(),
    batches: Array.from({ length: maxPackagesPerPurchase }, () => crypto.randomUUID()),
  }));
  const found = lookup?.status === "found" ? lookup : null;
  const suggestion = found?.suggestedPackage ?? existing?.suggestedPackage ?? null;

  const defaultValues = purchaseDefaults({ barcode, existing, found, locations });

  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      save.mutate(toPurchaseInput({ values: value, barcode, existing, found, ids })),
  });

  return (
    <FormRoot form={form}>
      {existing ? (
        <p className={styles.product}>
          <strong>{productName(existing) ?? barcode}</strong>
          {existing.brand && <span> · {existing.brand}</span>}
        </p>
      ) : (
        <>
          <form.Field name="name">
            {(field) => <FormInput field={field} label={m["global.name"]()} />}
          </form.Field>
          <form.Field name="brand">
            {(field) => <FormInput field={field} label={m["purchase.brand"]()} />}
          </form.Field>
          <div className={styles.sizeRow}>
            <form.Field name="packageAmount">
              {(field) => (
                <FormInput
                  field={field}
                  label={m["purchase.packageSize"]()}
                  hint={suggestion ? m["purchase.sizeHint"]() : undefined}
                  inputMode="decimal"
                />
              )}
            </form.Field>
            <form.Field name="packageUnit">
              {(field) => (
                <FormSelect field={field} label={m["purchase.unit"]()}>
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
                label={m["purchase.trackIn"]()}
                hint={m["purchase.trackHint"]()}
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
          {(field) => (
            <FormInput
              field={field}
              label={m["purchase.howMany"]()}
              type="number"
              min={1}
              max={maxPackagesPerPurchase}
            />
          )}
        </form.Field>
        <form.Field name="locationId">
          {(field) => (
            <FormSelect field={field} label={m["global.location"]()}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>
      </div>

      <form.Field
        name="dateKind"
        listeners={{
          // Whether a date is required depends on this choice, so an earlier "enter a date"
          // error no longer applies; submitting validates the new choice again.
          onChange: () =>
            form.setFieldMeta("date", (meta) => ({
              ...meta,
              errorMap: { ...meta.errorMap, onSubmit: undefined },
            })),
        }}
      >
        {(field) => (
          <FormSelect field={field} label={m["purchase.dateOnPackage"]()}>
            {dateKindOptions().map((option) => (
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
              <TypedDate
                field={field}
                disabled={dateKind === "none" || dateKind === "unknown"}
                timeZone={timeZone}
              />
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="amount">
        {(field) => (
          <AmountPicker
            name="amount"
            legend={m["global.amount.left"]()}
            options={startAmountOptions()}
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <FormError message={save.isError ? m["purchase.saveFailed"]() : null} />
      <Button type="submit" disabled={save.isPending}>
        {m["purchase.submit"]()}
      </Button>
    </FormRoot>
  );
}
