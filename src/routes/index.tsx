import { m } from "#/paraglide/messages.js";
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
