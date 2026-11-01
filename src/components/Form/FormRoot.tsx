import type { AnyFormApi } from "@tanstack/react-form";
import type { ComponentProps } from "react";

import { cx } from "../cx.ts";
import styles from "./Form.module.css";

/** A plain form that submits through a TanStack Form instance. */
export function FormRoot({
  form,
  compact,
  className,
  ...props
}: {
  form: AnyFormApi;
  /** Tighter spacing between the fields. */
  compact?: boolean;
} & Omit<ComponentProps<"form">, "onSubmit">) {
  return (
    <form
      noValidate
      className={cx(styles.form, compact && styles.compact, className)}
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    />
  );
}
