import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout } from "#/components/AuthLayout/AuthLayout.tsx";
import { Button } from "#/components/Button/Button.tsx";
import { Form, FormError, TextField } from "#/components/Form/Form.tsx";
import { authClient } from "#/domains/auth/auth-client.ts";
import { needsSetup } from "#/domains/auth/auth.functions.ts";

// First run only: creates the owner account and their pantry. The server rejects
// sign-ups once any account exists, so this page is not the security boundary.
export const Route = createFileRoute("/setup")({
  beforeLoad: async () => {
    if (!(await needsSetup())) throw redirect({ to: "/sign-in" });
  },
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AuthLayout title="Create the owner account">
      <Form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          const result = await authClient.signUp.email({
            name: String(form.get("name")),
            email: String(form.get("email")),
            password: String(form.get("password")),
          });
          setPending(false);
          if (result.error)
            return setError(result.error.message ?? "Could not create the account.");
          await navigate({ to: "/pantry" });
        }}
      >
        <TextField name="name" label="Name" autoComplete="name" required />
        <TextField name="email" label="Email" type="email" autoComplete="email" required />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          Create account
        </Button>
      </Form>
    </AuthLayout>
  );
}
