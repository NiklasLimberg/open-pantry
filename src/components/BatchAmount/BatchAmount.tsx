import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { useRefreshStock } from "#/domains/inventory/stock-query.ts";
import { updateBatch, type StockBatch } from "#/domains/inventory/stock.functions.ts";

import { AmountPicker, type Amount } from "../AmountPicker/AmountPicker.tsx";
import { Button } from "../Button/Button.tsx";
import { FormError } from "../Form/Form.tsx";
import styles from "./BatchAmount.module.css";

/**
 * The amount left in one batch, shown in its row with the saved value selected. Choosing something
 * else reveals an Update button; nothing is saved until it is pressed. It is a plain form: it
 * waits for the server, shows a saving state, and keeps the choice and an error if saving fails.
 * "Used up" is the only way to empty a batch, so it also removes the batch from the pantry. There is
 * no separate Opened field: any amount below Full means the package has been opened.
 */
export function BatchAmount({ batch }: { batch: StockBatch }) {
  const [error, setError] = useState<string | null>(null);
  // Keyed by revision: once the saved batch changes, in this tab or after a conflict with another
  // device, the form starts again from the new values.
  return <AmountForm key={batch.revision} batch={batch} error={error} onError={setError} />;
}

type FormProps = {
  batch: StockBatch;
  error: string | null;
  onError: (message: string | null) => void;
};

function AmountForm({ batch, error, onError }: FormProps) {
  const refresh = useRefreshStock();
  const form = useForm({
    defaultValues: {
      amount: (batch.quarters === 0 ? "used" : String(batch.quarters)) as Amount,
    },
    onSubmit: async ({ value }) => {
      onError(null);
      try {
        const result = await updateBatch({
          data:
            value.amount === "used"
              ? { id: batch.id, baseRevision: batch.revision, discard: true }
              : {
                  id: batch.id,
                  baseRevision: batch.revision,
                  quarters: Number(value.amount),
                  // Less than Full means it has been opened; choosing Full leaves the flag alone.
                  ...(value.amount !== "4" && { opened: true }),
                },
        });
        await refresh();
        if (!result.ok) {
          onError(
            "This changed on another device. The current amount is shown; check it and update again.",
          );
        }
      } catch {
        onError("Couldn't save. Check your connection and try again; nothing was changed.");
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
      <form.Field name="amount">
        {(field) => (
          <AmountPicker
            name={`amount-${batch.id}`}
            legend="Amount left"
            legendHidden
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) =>
          amount === "used" ? (
            <p className={styles.hint}>Used up removes this package from your pantry.</p>
          ) : null
        }
      </form.Subscribe>

      <FormError message={error} />
      <form.Subscribe selector={(state) => [state.isDefaultValue, state.isSubmitting] as const}>
        {([unchanged, isSubmitting]) =>
          unchanged ? null : (
            <div className={styles.actions}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update"}
              </Button>
            </div>
          )
        }
      </form.Subscribe>
    </form>
  );
}
