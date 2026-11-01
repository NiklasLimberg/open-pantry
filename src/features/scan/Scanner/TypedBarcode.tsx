import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { normalizeBarcode } from "#/features/products/barcode.ts";
import { m } from "#/paraglide/messages.js";

import { Button } from "#/components/Button/Button.tsx";
import { Field } from "#/components/Form/Field.tsx";
import { FormRoot } from "#/components/Form/FormRoot.tsx";
import { Input } from "#/components/Form/Input.tsx";

type Props = { onBarcode: (barcode: string) => void };

const barcodeSchema = z.object({
  barcode: z.string().refine((value) => normalizeBarcode(value) !== null, {
    error: () => m["scan.invalidBarcode"](),
  }),
});

export function TypedBarcode({ onBarcode }: Props) {
  const form = useForm({
    defaultValues: { barcode: "" },
    validators: { onSubmit: barcodeSchema },
    onSubmit: ({ value }) => {
      const code = normalizeBarcode(value.barcode);
      if (code) {
        onBarcode(code);
      }
    },
  });

  return (
    <FormRoot form={form} compact>
      <form.Field name="barcode">
        {(field) => (
          <Field label={m["scan.orType"]()} htmlFor="barcode" errors={field.state.meta.errors}>
            <Input
              id="barcode"
              inputMode="numeric"
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>
      <Button type="submit" variant="secondary">
        {m["scan.useBarcode"]()}
      </Button>
    </FormRoot>
  );
}
