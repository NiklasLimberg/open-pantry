# Open Pantry

Pantry companion: TanStack Start (React, TypeScript), Drizzle on PostgreSQL, Better Auth. Specs are in `docs/`; read `data-and-rules.md` before changing quantities, units, dates or matching, and `auth-and-permissions.md` before changing access control.

## Commands

```bash
pnpm db:up && pnpm db:migrate && pnpm dev   # local database, migrations, http://localhost:3000
pnpm check    # compiles messages, then oxfmt --check, oxlint (warnings fail), tsc
pnpm test     # compiles messages, then Vitest
pnpm i18n:compile  # messages/*.json -> src/paraglide (dev and build do this themselves)
pnpm build
```

Run `pnpm format`, `pnpm check` and `pnpm test` before committing; CI runs the same.

## Conventions

- Use VoidZero tools standalone (Vite, Vitest, Oxlint, Oxfmt); no Vite+, ESLint, Biome or Prettier. Keep the TanStack Start setup stock.
- Plain CSS: tokens in `src/styles.css`, one CSS Module per component, Radix Primitives for behaviour ([src/components/README.md](src/components/README.md)). No Tailwind.
- Don't hand-edit `src/routeTree.gen.ts`, `src/db/auth-schema.ts` (`pnpm auth:generate`) or `src/paraglide/` (compiled from `messages/`, git-ignored).
- Import with the `#/` alias, including the file extension. Enforce authorization on the server, not only in the UI.
- Commit as `niklas@limberg.dev`. Never commit secrets.

## Translations

Paraglide JS, English (`messages/en.json`, the base) and German (`messages/de.json`). No user-facing string lives in code, wordmarks aside.

- Messages are nested by feature or component (`stock`, `purchase`, `scan`, …); anything used in more than one place sits in the root `global` object (nouns, units, amounts, date kinds, shared buttons). Keep both files in the same shape, with the same `{variables}`.
- Call them as `m["stock.empty"]()` (`import { m } from "#/paraglide/messages.js"`). The key is the JSON path; a wrong key or argument fails `tsc`. Names within a group are camelCase.
- Read messages when rendering or calling, never in module-level constants: the server resolves the language per request, so a constant freezes whichever language came first. Use functions (`() => m["…"]()`), zod's `error: () => …`, and `Intl` formatters created with `getLocale()` at call time.
- Plurals are separate `one` / `other` messages picked in code (`unitLabel`); the plural syntax in Paraglide's docs doesn't compile with the message-format plugin we use.
- Messages keep their whitespace, but build sentences from whole messages plus variables rather than gluing fragments.
- The language comes from the `PARAGLIDE_LOCALE` cookie, then the browser, then English; there are no language URLs (`src/server.ts` wraps requests in `paraglideMiddleware`). The Settings language card sets it with `setLocale`.
- Open Food Facts product names are stored per app language (`off_product.names`) and shipped with the stock, so `productName()` switches language offline. A new language needs its code in `project.inlang/settings.json` and a `messages/<code>.json`.
- Not translated: names the user or Open Food Facts typed (products, brands, locations), and server messages for invalid requests.

## Database and deployment

- Schema changes: edit `src/db/schema.ts`, run `pnpm db:generate`, commit `drizzle/`. Never use `db:push` or edit a migration already on `main`.
- If another PR merged a migration first, merge `main`, delete yours and regenerate: Drizzle silently skips migrations with an older timestamp. CI checks this (`scripts/check-migrations.ts`) and rejects destructive SQL unless it has a `-- allow-destructive: <reason>` comment.
- Migrations run on the server before each release and are never reversed: add first, remove in a later release.
- `main` is protected. Every merge deploys within about five minutes ([deploy/README.md](deploy/README.md)).
