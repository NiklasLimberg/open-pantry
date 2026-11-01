import { m } from "#/paraglide/messages.js";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { AuthLayout } from "#/features/auth/AuthLayout/AuthLayout.tsx";
import { AuthForm } from "#/features/auth/AuthForm/AuthForm.tsx";
import { FormInput } from "#/components/Form/FormInput.tsx";
import { authClient } from "#/features/auth/auth-client.ts";
import { needsSetup } from "#/features/auth/auth.functions.ts";
import { errorMessage } from "#/features/offline/network-failure.ts";

// First run only: creates the owner account and their pantry. The server rejects
// sign-ups once any account exists, so this page is not the security boundary.
export const Route = createFileRoute("/setup")({
  beforeLoad: async () => {
    if (!(await needsSetup())) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: Setup,
});

const required = () => ({ error: () => m["form.required"]() });

const schema = z.object({
  name: z.string().trim().min(1, required()),
  email: z
    .string()
    .trim()
    .min(1, required())
    .pipe(z.email({ error: () => m["form.invalidFormat"]() })),
  password: z.string().min(8, { error: () => m["form.tooShort"]() }),
});
function Setup() {
  const navigate = useNavigate();
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? m["auth.setup.failed"]());
      }
    },
    onSuccess: () => navigate({ to: "/pantry" }),
  });
  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => submit.mutate(schema.parse(value)),
  });

  return (
    <AuthLayout title={m["auth.setup.title"]()}>
      <AuthForm
        form={form}
        submitLabel={m["auth.setup.submit"]()}
        pending={submit.isPending}
        error={submit.error && errorMessage(submit.error, m["auth.setup.failed"]())}
      >
        <form.Field name="name">
          {(field) => <FormInput field={field} label={m["global.name"]()} autoComplete="name" />}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <FormInput
              field={field}
              label={m["global.email"]()}
              type="email"
              autoComplete="email"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FormInput
              field={field}
              label={m["global.password"]()}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.Field>
      </AuthForm>
    </AuthLayout>
  );
}
