import type { AnyFieldApi } from "@tanstack/react-form";
import type { ComponentProps } from "react";

import { Field } from "./Field.tsx";
import { Input } from "./Input.tsx";

type BoundProps = { field: AnyFieldApi; label: string; hint?: string };

/** A labelled input bound to a TanStack Form field; the field's name is the element's ID. */
export function FormInput({
  field,
  label,
  hint,
  ...input
}: BoundProps & Omit<ComponentProps<"input">, "id" | "name" | "value" | "onChange" | "onBlur">) {
  return (
    <Field label={label} hint={hint} htmlFor={field.name} errors={field.state.meta.errors}>
      <Input
        {...input}
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(
            input.type === "number" ? event.target.valueAsNumber : event.target.value,
          )
        }
      />
    </Field>
  );
}
