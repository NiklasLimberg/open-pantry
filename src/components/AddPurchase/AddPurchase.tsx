import { productName } from "#/domains/inventory/product-name.ts";
import { useForm, type AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { trackUnits } from "#/db/schema.ts";
import { todayIn, unitLabel, type DateKind } from "#/domains/inventory/format.ts";
import type { LookupState } from "#/domains/inventory/lookup.ts";
import { parseTypedDate } from "#/domains/inventory/parse-date.ts";
import { toPurchaseInput, type PurchaseValues } from "#/domains/inventory/purchase.ts";
import { useRefreshStock } from "#/domains/inventory/stock-query.ts";
import {
  addPurchase,
  type StockLocation,
  type StockProduct,
} from "#/domains/inventory/stock.functions.ts";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import { AmountPicker, startAmountOptions } from "../AmountPicker/AmountPicker.tsx";
import { Button } from "../Button/Button.tsx";
import { Field, FormError, FormInput, FormSelect, Input } from "../Form/Form.tsx";
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

const dateKindOptions = (): Array<{ value: DateKind; label: string }> => [
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
      .max(20, { error: () => m["purchase.validation.atMostTwenty"]() }),
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
  const [error, setError] = useState<string | null>(null);
  const [ids] = useState(() => ({
    product: crypto.randomUUID(),
    batches: Array.from({ length: 20 }, () => crypto.randomUUID()),
  }));
  const found = lookup?.status === "found" ? lookup : null;
  const suggestion = found?.suggestedPackage ?? existing?.suggestedPackage ?? null;

  const defaultValues: PurchaseValues & { needsName: boolean } = {
    name: (existing && productName(existing)) ?? found?.name ?? "",
    brand: existing?.brand ?? found?.brand ?? "",
    trackUnit: existing?.trackUnit ?? "pack",
    packageAmount: String(existing?.packageAmount ?? suggestion?.amount ?? ""),
    packageUnit: existing?.packageUnit ?? suggestion?.unit ?? "g",
    count: 1,
    locationId: locations[0]?.id ?? "",
    // What this product printed last time; MHD for one the pantry has not seen.
    dateKind: existing?.printedDateKind ?? "mhd",
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
        setError(m["purchase.saveFailed"]());
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
              max={20}
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

      <form.Field name="dateKind">
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
              <TypedDate field={field} disabled={dateKind === "none" || dateKind === "unknown"} />
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

      <FormError message={error} />
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            {m["purchase.submit"]()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

/** Shown back to the user so a typed shortcut is confirmed before it is saved. */
const dateFormat = () =>
  new Intl.DateTimeFormat(getLocale() === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The printed date, typed the way it reads on the package (2803, 28.03.27, 03.27) and echoed back
 * as a full date. The field's value stays a calendar date, so the stored shape is unchanged.
 */
function TypedDate({ field, disabled }: { field: AnyFieldApi; disabled: boolean }) {
  const [text, setText] = useState("");
  const [today] = useState(() => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone));
  const parsed = parseTypedDate(text, today);
  const echo = parsed
    ? `${dateFormat().format(new Date(`${parsed.iso}T00:00:00Z`))}${parsed.monthOnly ? ` ${m["purchase.endOfMonth"]()}` : ""}`
    : text.trim()
      ? m["purchase.dateInvalid"]()
      : m["purchase.dateExample"]();

  return (
    <Field
      label={m["global.date"]()}
      hint={disabled ? undefined : echo}
      htmlFor={field.name}
      errors={field.state.meta.errors}
    >
      <Input
        id={field.name}
        value={disabled ? "" : text}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder={m["purchase.datePlaceholder"]()}
        onBlur={field.handleBlur}
        onChange={(event) => {
          setText(event.target.value);
          field.handleChange(parseTypedDate(event.target.value, today)?.iso ?? "");
        }}
      />
    </Field>
  );
}
