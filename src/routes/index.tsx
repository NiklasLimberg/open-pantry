import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/Button/Button.tsx";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main style={{ padding: "var(--space-6)" }}>
      <h1>Open Pantry</h1>
      <p>Scaffold is running. Pantry, rules, and shopping screens come next.</p>
      <Button type="button">Scan</Button>
    </main>
  );
}
