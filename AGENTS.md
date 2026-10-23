# Open Pantry

Pantry companion: TanStack Start (React, TypeScript), Drizzle on PostgreSQL, Better Auth. Specs are in `docs/`; read `data-and-rules.md` before changing quantities, units, dates or matching, and `auth-and-permissions.md` before changing access control.

## Commands

```bash
pnpm db:up && pnpm db:migrate && pnpm dev   # local database, migrations, http://localhost:3000
pnpm check    # oxfmt --check, oxlint (warnings fail), tsc
pnpm test     # Vitest
pnpm build
```

Run `pnpm format`, `pnpm check` and `pnpm test` before committing; CI runs the same.

## Conventions

- Use VoidZero tools standalone (Vite, Vitest, Oxlint, Oxfmt); no Vite+, ESLint, Biome or Prettier. Keep the TanStack Start setup stock.
- Plain CSS: tokens in `src/styles.css`, one CSS Module per component, Radix Primitives for behaviour ([src/components/README.md](src/components/README.md)). No Tailwind.
- Don't hand-edit `src/routeTree.gen.ts` or `src/db/auth-schema.ts` (`pnpm auth:generate`).
- Import with the `#/` alias, including the file extension. Enforce authorization on the server, not only in the UI.
- Commit as `niklas@limberg.dev`. Never commit secrets.

## Database and deployment

- Schema changes: edit `src/db/schema.ts`, run `pnpm db:generate`, commit `drizzle/`. Never use `db:push` or edit a migration already on `main`.
- If another PR merged a migration first, merge `main`, delete yours and regenerate: Drizzle silently skips migrations with an older timestamp. CI checks this (`scripts/check-migrations.ts`) and rejects destructive SQL unless it has a `-- allow-destructive: <reason>` comment.
- Migrations run on the server before each release and are never reversed: add first, remove in a later release.
- `main` is protected. Every merge deploys within about five minutes ([deploy/README.md](deploy/README.md)).
