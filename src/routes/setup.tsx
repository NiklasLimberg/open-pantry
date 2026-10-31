import { m } from "#/paraglide/messages.js";
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
    <AuthLayout title={m["auth.setup.title"]()}>
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
          if (result.error) return setError(result.error.message ?? m["auth.setup.failed"]());
          await navigate({ to: "/pantry" });
        }}
      >
        <TextField name="name" label={m["global.name"]()} autoComplete="name" required />
        <TextField
          name="email"
          label={m["global.email"]()}
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          name="password"
          label={m["global.password"]()}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          {m["auth.setup.submit"]()}
        </Button>
      </Form>
    </AuthLayout>
  );
}
