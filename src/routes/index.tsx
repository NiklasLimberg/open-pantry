import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#/components/Button/Button.tsx";
import { ThemeToggle } from "#/components/ThemeToggle/ThemeToggle.tsx";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main style={{ padding: "var(--space-6)" }}>
      <ThemeToggle />
      <h1>Open Pantry</h1>
      <p>Pantry, rules, and shopping screens come next.</p>
      <Button asChild>
        <Link to="/pantry">Open your pantry</Link>
      </Button>
    </main>
  );
}
