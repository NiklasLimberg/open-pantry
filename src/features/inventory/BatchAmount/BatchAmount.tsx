import { useMutation } from "@tanstack/react-query";

import { useRefreshStock } from "#/features/inventory/stock-query.ts";
import { updateBatch } from "#/features/inventory/stock.functions.ts";
import type { StockBatch, UpdateResult } from "#/features/inventory/stock.types.ts";
import { m } from "#/paraglide/messages.js";

import { AmountForm, type UpdateInput } from "./AmountForm.tsx";

function saveError(failed: boolean, result: UpdateResult | undefined) {
  if (failed) {
    return m["batch.saveFailed"]();
  }
  if (result?.ok !== false) {
    return null;
  }
  return result.reason === "gone" ? m["batch.gone"]() : m["batch.conflict"]();
}

/**
 * The amount left in one batch, shown in its row with the saved value selected. Choosing something
 * else reveals an Update button; nothing is saved until it is pressed. It is a plain form: it
 * waits for the server, shows a saving state, and keeps the choice and an error if saving fails.
 * "Used up" is the only way to empty a batch, so it also removes the batch from the pantry. There is
 * no separate Opened field: any amount below Full means the package has been opened.
 */
export function BatchAmount({ batch }: { batch: StockBatch }) {
  const refresh = useRefreshStock();
  const update = useMutation({
    mutationFn: (data: UpdateInput) => updateBatch({ data }),
    onSuccess: refresh,
  });
  // Lives here rather than in the form: the form is keyed by revision and starts over once the
  // refresh brings a new one, which would drop the conflict message.
  const error = saveError(update.isError, update.data);

  // Keyed by revision: once the saved batch changes, in this tab or after a conflict with another
  // device, the form starts again from the new values.
  return (
    <AmountForm
      key={batch.revision}
      batch={batch}
      error={error}
      pending={update.isPending}
      onUpdate={update.mutate}
    />
  );
}
