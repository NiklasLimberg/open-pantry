import type { AnyFieldApi } from "@tanstack/react-form";
import { Form as RadixForm } from "radix-ui";
import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

import styles from "./Form.module.css";

export function Form({ className, ...props }: ComponentProps<typeof RadixForm.Root>) {
  return (
    <RadixForm.Root className={[styles.form, className].filter(Boolean).join(" ")} {...props} />
  );
}

type TextFieldProps = ComponentProps<"input"> & {
  name: string;
  label: string;
  /** Message shown when the browser's required check fails. */
  missingMessage?: string;
};

export function TextField({ name, label, missingMessage, ...inputProps }: TextFieldProps) {
  return (
    <RadixForm.Field name={name} className={styles.field}>
      <RadixForm.Label className={styles.label}>{label}</RadixForm.Label>
      <RadixForm.Control className={styles.input} {...inputProps} />
      {missingMessage && (
        <RadixForm.Message match="valueMissing" className={styles.message}>
          {missingMessage}
        </RadixForm.Message>
      )}
      <RadixForm.Message match="typeMismatch" className={styles.message}>
        Check the format of this field.
      </RadixForm.Message>
      <RadixForm.Message match="tooShort" className={styles.message}>
        Too short.
      </RadixForm.Message>
    </RadixForm.Field>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className={styles.error}>
      {message}
    </p>
  );
}

type FieldProps = {
  label: string;
  /** Validation errors from TanStack Form: strings or standard-schema issues. */
  errors?: ReadonlyArray<unknown>;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
};

/** Label, control and error text for fields driven by TanStack Form. */
export function Field({ label, errors = [], hint, htmlFor, children }: FieldProps) {
  const messages = errors.map((e) =>
    typeof e === "string" ? e : ((e as { message?: string })?.message ?? "Invalid value."),
  );
  const invalid = messages.length > 0;
  const errorId = `${htmlFor}-error`;
  return (
    <div className={styles.field} data-invalid={invalid || undefined}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {invalid && isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            "aria-invalid": true,
            "aria-describedby": errorId,
          })
        : children}
      {hint && <p className={styles.hint}>{hint}</p>}
      {invalid && (
        <div id={errorId}>
          {messages.map((message) => (
            <p key={message} className={styles.message}>
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={[styles.input, className].filter(Boolean).join(" ")} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={[styles.input, className].filter(Boolean).join(" ")} {...props} />;
}

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
