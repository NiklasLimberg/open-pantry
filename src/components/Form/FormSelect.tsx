import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { Field } from "./Field.tsx";
import { Select } from "./Select.tsx";

type BoundProps = { field: AnyFieldApi; label: string; hint?: string };

/** A labelled select bound to a TanStack Form field; pass the options as children. */
export function FormSelect({ field, label, hint, children }: BoundProps & { children: ReactNode }) {
  return (
    <Field label={label} hint={hint} htmlFor={field.name} errors={field.state.meta.errors}>
      <Select
        id={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
      >
        {children}
      </Select>
    </Field>
  );
}
