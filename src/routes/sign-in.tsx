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

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    if (await needsSetup()) {
      throw redirect({ to: "/setup" });
    }
  },
  component: SignIn,
});

const required = () => ({ error: () => m["form.required"]() });

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, required())
    .pipe(z.email({ error: () => m["form.invalidFormat"]() })),
  password: z.string().min(1, required()),
});
function SignIn() {
  const navigate = useNavigate();
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? m["auth.signIn.failed"]());
      }
    },
    onSuccess: () => navigate({ to: "/pantry" }),
  });
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => submit.mutate(schema.parse(value)),
  });

  return (
    <AuthLayout title={m["auth.signIn.title"]()}>
      <AuthForm
        form={form}
        submitLabel={m["auth.signIn.submit"]()}
        pending={submit.isPending}
        error={submit.error && errorMessage(submit.error, m["auth.signIn.failed"]())}
      >
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
              autoComplete="current-password"
            />
          )}
        </form.Field>
      </AuthForm>
    </AuthLayout>
  );
}
