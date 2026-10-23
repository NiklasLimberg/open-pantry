# Open Pantry

A simple pantry companion for seeing what is at home, using food in time, and buying what is missing.

The application is scaffolded; product features are not implemented yet.

- [Product design](docs/design.md): concise screen and interaction decisions.
- [Data and rules](docs/data-and-rules.md): quantities, units, dates, matching, and shopping calculations.
- [Technical plan](docs/technical-plan.md): architecture, TanStack DB assessment, offline/sync, integrations, and implementation checks.
- [Interactive screen designs](docs/design/screens.html): responsive preliminary designs with sample data. Open directly in a browser; no installation is needed.
- [Screen guide](docs/design/README.md): interactions, sample assumptions, and prototype boundaries.

The screen prototype is a standalone design artifact, not the application.

## Stack

- [TanStack Start](https://tanstack.com/start) (React, TypeScript) with TanStack Router, served by Nitro (Node).
- VoidZero tooling used directly, so the TanStack setup stays stock: Vite (Rolldown) for dev/build, Vitest for tests, Oxlint and Oxfmt for lint and format.
- Plain CSS: design tokens in `src/styles.css`, CSS Modules per component in `src/components/`, behaviour from [Radix Primitives](https://www.radix-ui.com/primitives).
- Drizzle ORM on PostgreSQL.

## Development

Requires Node 22.18+ and pnpm. Docker is used for the local database.

```bash
pnpm install
cp .env.example .env.local
pnpm db:up        # Postgres on localhost:5432
pnpm dev          # http://localhost:3000
```

| Command                                | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `pnpm check`                           | Format check, lint, and type-check (Oxfmt, Oxlint, tsc)            |
| `pnpm format`                          | Format with Oxfmt                                                  |
| `pnpm test`                            | Vitest                                                             |
| `pnpm build`                           | Production build into `.output/` (`node .output/server/index.mjs`) |
| `pnpm db:generate` / `pnpm db:migrate` | Create and apply Drizzle migrations                                |
