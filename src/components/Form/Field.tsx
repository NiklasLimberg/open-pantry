import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import { Hint } from "../Hint/Hint.tsx";
import styles from "./Form.module.css";

type FieldProps = {
  label: string;
  /** Validation errors from TanStack Form: strings or standard-schema issues. */
  errors?: readonly unknown[];
  hint?: string;
  htmlFor: string;
  children: ReactNode;
};

export function Field({ label, errors = [], hint, htmlFor, children }: FieldProps) {
  const messages = errors.map((e) =>
    typeof e === "string" ? e : ((e as { message?: string })?.message ?? m["form.invalidValue"]()),
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
      {hint && <Hint small>{hint}</Hint>}
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
