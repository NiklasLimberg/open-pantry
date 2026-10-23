import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout } from "#/components/AuthLayout/AuthLayout.tsx";
import { Button } from "#/components/Button/Button.tsx";
import { Form, FormError, TextField } from "#/components/Form/Form.tsx";
import { authClient } from "#/domains/auth/auth-client.ts";
import { needsSetup } from "#/domains/auth/auth.functions.ts";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    if (await needsSetup()) throw redirect({ to: "/setup" });
  },
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AuthLayout title="Sign in">
      <Form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          const result = await authClient.signIn.email({
            email: String(form.get("email")),
            password: String(form.get("password")),
          });
          setPending(false);
          if (result.error) return setError(result.error.message ?? "Sign-in failed.");
          await navigate({ to: "/pantry" });
        }}
      >
        <TextField name="email" label="Email" type="email" autoComplete="email" required />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          Sign in
        </Button>
      </Form>
    </AuthLayout>
  );
}
