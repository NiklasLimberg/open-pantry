import { m } from "#/paraglide/messages.js";
import { createFileRoute } from "@tanstack/react-router";

import { Landing } from "#/features/landing/Landing/Landing.tsx";
import { getSession, needsSetup } from "#/features/auth/auth.functions.ts";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [session, setup] = await Promise.all([getSession(), needsSetup()]);
    if (session) {
      return { cta: "pantry" } as const;
    }
    return { cta: setup ? "setup" : "sign-in" } as const;
  },
  head: () => ({
    meta: [
      {
        name: "description",
        content: m["meta.description"](),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { cta } = Route.useLoaderData();
  return <Landing cta={cta} />;
}
