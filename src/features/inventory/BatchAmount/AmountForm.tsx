import { useForm } from "@tanstack/react-form";

import type { updateBatch } from "#/features/inventory/stock.functions.ts";
import type { StockBatch } from "#/features/inventory/stock.types.ts";
import { m } from "#/paraglide/messages.js";

import {
  AmountPicker,
  amountOptions,
  type Amount,
} from "#/components/AmountPicker/AmountPicker.tsx";
import { Button } from "#/components/Button/Button.tsx";
import { Hint } from "#/components/Hint/Hint.tsx";
import { FormError } from "#/components/Form/FormError.tsx";
import { FormRoot } from "#/components/Form/FormRoot.tsx";
import styles from "./BatchAmount.module.css";

export type UpdateInput = Parameters<typeof updateBatch>[0]["data"];

type FormProps = {
  batch: StockBatch;
  error: string | null;
  pending: boolean;
  onUpdate: (data: UpdateInput) => void;
};

export function AmountForm({ batch, error, pending, onUpdate }: FormProps) {
  const form = useForm({
    defaultValues: {
      amount: (batch.quarters === 0 ? "used" : String(batch.quarters)) as Amount,
    },
    onSubmit: ({ value }) =>
      onUpdate(
        value.amount === "used"
          ? { id: batch.id, baseRevision: batch.revision, discard: true }
          : {
              id: batch.id,
              baseRevision: batch.revision,
              quarters: Number(value.amount),
              // Less than Full means it has been opened; choosing Full leaves the flag alone.
              ...(value.amount !== "4" && { opened: true }),
            },
      ),
  });

  return (
    <FormRoot form={form} compact>
      <form.Field name="amount">
        {(field) => (
          <AmountPicker
            name={`amount-${batch.id}`}
            legend={m["global.amount.left"]()}
            legendHidden
            options={amountOptions()}
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) => (amount === "used" ? <Hint>{m["batch.usedUpHint"]()}</Hint> : null)}
      </form.Subscribe>

      <FormError message={error} />
      <form.Subscribe selector={(state) => state.isDefaultValue}>
        {(unchanged) =>
          unchanged ? null : (
            <div className={styles.actions}>
              <Button type="submit" disabled={pending}>
                {pending ? m["global.updating"]() : m["global.update"]()}
              </Button>
            </div>
          )
        }
      </form.Subscribe>
    </FormRoot>
  );
}
