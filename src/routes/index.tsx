import { createFileRoute } from "@tanstack/react-router";

import { Landing } from "#/components/Landing/Landing.tsx";
import { getSession, needsSetup } from "#/domains/auth/auth.functions.ts";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [session, setup] = await Promise.all([getSession(), needsSetup()]);
    return { cta: session ? "pantry" : setup ? "setup" : "sign-in" } as const;
  },
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "See what is at home, use food in time, and buy what is missing. A pantry companion for cupboard, fridge, and freezer.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { cta } = Route.useLoaderData();
  return <Landing cta={cta} />;
}
