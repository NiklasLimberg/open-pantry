import { Link } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";

import { Button } from "#/components/Button/Button.tsx";

/** Where the main call to action leads, depending on the visitor. */
export type LandingCta = "pantry" | "setup" | "sign-in";

const ctaLinks = {
  pantry: { to: "/pantry", label: () => m["landing.cta.pantry"]() },
  setup: { to: "/setup", label: () => m["landing.cta.setup"]() },
  "sign-in": { to: "/sign-in", label: () => m["landing.cta.signIn"]() },
} as const;

export function CtaButton({ cta, className }: { cta: LandingCta; className?: string }) {
  const { to, label } = ctaLinks[cta];
  return (
    <Button asChild className={className}>
      <Link to={to}>{label()}</Link>
    </Button>
  );
}
