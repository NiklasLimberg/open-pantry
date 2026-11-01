import type { AnyFormApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { Button } from "#/components/Button/Button.tsx";
import { FormError } from "#/components/Form/FormError.tsx";
import { FormRoot } from "#/components/Form/FormRoot.tsx";

type AuthFormProps = {
  form: AnyFormApi;
  children: ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string | null;
};

/** The form of the sign-in and setup pages: fields, an error line and a submit button. */
export function AuthForm({ form, children, submitLabel, pending, error }: AuthFormProps) {
  return (
    <FormRoot form={form}>
      {children}
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </FormRoot>
  );
}
