# Open Pantry authentication and permissions

23 October 2026 · Better Auth, roles, and share links are implemented; Authelia sign-in is not

Which auth library to use and how pantry permissions work. Builds on the authentication section of the [technical plan](technical-plan.md): Authelia as a future OIDC provider, internal user IDs, server-side authorization on every read and mutation.

## Requirements

1. Runs inside the TanStack Start server; user data stays in our own database.
2. Works without an external identity provider at first (provisioned owner, no public sign-up), and later signs in through Authelia via OIDC with PKCE.
3. Links external identities by issuer and subject to a stable internal user, not by email.
4. Supports several people per pantry with roles, checked on the server for every operation, including replayed offline writes.
5. Free, open source, maintained, with a Drizzle/Postgres adapter.

## Alternatives considered

- **Auth.js:** no official Start adapter and no roles; now largely in maintenance.
- **Lucia:** deprecated; it is now a guide for writing session code yourself.
- **OpenAuth:** a separate issuer service, still 0.x, not a client for Authelia.
- **Clerk, WorkOS:** hosted; user data would leave our server.
- **Supabase Auth:** brings in the Supabase platform for one feature.
- **Authelia, Keycloak, Zitadel, Authentik:** identity providers, not app session libraries; Authelia is planned as a provider behind Better Auth.

## Decision: Better Auth

Better Auth runs in the Start server, stores users and sessions in our Postgres through Drizzle, sets a Secure, HttpOnly session cookie, and can add Authelia later through `generic-oauth` without changing user IDs. Its `organization` and `access` plugins provide the pantry and permission model below.

Implemented ([src/domains/auth/auth.ts](../src/domains/auth/auth.ts)):

- Email + password. Only the first account can sign up (`/setup`); it becomes the owner and gets a pantry. Later sign-ups are rejected on the server with 403.
- `organization` plugin with our own statements and roles; a pantry is an organization with a `timeZone` field.
- The active pantry is the first membership; sessions do not store one yet.
- Generated tables live in `src/db/auth-schema.ts` (`pnpm auth:generate`, then `pnpm db:generate`).

Later: `generic-oauth` with Authelia (discovery URL, confidential client, PKCE S256, exact callback; the first-account rule must then allow invited or linked identities). Invitation emails for additional members. Optional `passkey` plugin.

Identity and sessions:

- Users have stable internal IDs; external identities are linked by issuer and subject, only while signed in, never merged by email. Switching to Authelia must not create a second pantry.
- Previously loaded data may stay readable offline, but that grants no server access. When a session expires, keep queued changes, pause upload, ask to sign in, and resume only for the same user.
- Sign-out clears private local data only after unsynced changes are handled. App logout and identity-provider logout are separate.

Risks: Better Auth releases often and plugin APIs have changed between minors; the version is pinned. Organization tables are Better Auth's schema; our tables reference them by ID.

## Permission model

Defined once in [src/domains/pantry/permissions.ts](../src/domains/pantry/permissions.ts) and shared by server and client.

### Concepts

- **Pantry = Better Auth organization.** Every pantry-owned row carries `pantry_id` referencing `organization.id`.
- **Member** links a user to a pantry with one role.
- **Share link** grants anonymous, read-only access to one pantry.

### Roles

| Role     | For                                             | Can                                                                                            |
| -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `owner`  | You                                             | Everything: pantry contents, members, share links, deleting the pantry                         |
| `editor` | Someone who helps keep the pantry up to date    | Read and change inventory, rules, and shopping; not members, share links, or the pantry itself |
| `viewer` | Read-only member; also every share-link visitor | Read inventory, rules, and shopping                                                            |

Resources and actions: `inventory`, `rule` (`read`, `create`, `update`, `delete`); `shopping` (`read`, `add`, `check`, `confirm-purchase`); `shareLink` (`read`, `create`, `revoke`); plus Better Auth's `organization`, `member`, `invitation`, `team`, `ac`.

### Share links

An owner creates a link at `/share/<token>`. The token is 32 random bytes; only its SHA-256 hash is stored, so the link is shown once. Links can be revoked and may carry an expiry. Visitors get the `viewer` role regardless of who created the link, need no account, and the page is marked `noindex`. Revoked, expired, or unknown tokens show "Link unavailable".

### Enforcement

- **Server functions are the boundary.** `pantryMiddleware` loads the session and the member's role; a share-link function resolves access from the token instead. Every handler calls `requirePermission(access, { … })`, which throws a 403. Queries always filter by the verified pantry ID.
- **Client checks are cosmetic.** Pages use `roleCan` to hide controls (for example the share-link panel for non-owners).
- **No offline writes.** There is no outbox to replay, so every write is authorized when it is made.
- **Local storage scoping (later).** Nothing private is stored in the browser yet: the Query cache is in memory per signed-in visit. A persisted cache or service worker would be keyed by user and pantry and cleared on sign-out.

### Tests

- Done: role matrix unit test ([permissions.test.ts](../src/domains/pantry/permissions.test.ts)).
- Verified manually: second sign-up rejected; share link works signed-out and stops working after revoke; a viewer gets 403 from `listShareLinks`.
- To add with pantry features: each role × each server function; a user cannot reach another pantry by changing IDs; a removed member's queued writes are rejected on replay.
