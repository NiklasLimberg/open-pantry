import { Form as RadixForm } from "radix-ui";
import type { ComponentProps } from "react";

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
