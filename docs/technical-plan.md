# Open Pantry technical plan

Draft · 22 October 2026 · Implementation has not started

Architecture, integration constraints, and implementation checks. The [product design](design.md) describes the interface; [data and rules](data-and-rules.md) defines quantities, matching, and dates. TanStack Start is selected; TanStack DB is the preferred client data candidate pending the trial below. Hosting, authentication, server database, and the final persistence adapter remain open.

## TanStack DB assessment

**Preferred candidate, subject to an offline proof of concept.** TanStack DB fits the reactive read model: collections for products, batches, rules, and shopping state can feed grouped cards and date lists. Live queries support joins and aggregates, and mutations can update the local view optimistically. Keep unit/date rules in shared functions; use collection changes to trigger their recomputation rather than translating every business rule into a query. [Overview](https://tanstack.com/db/latest/docs/overview)

It complements TanStack Start. Start remains responsible for routes, authenticated server functions, product lookup, and the backend boundary. TanStack DB does not replace the authoritative server database, authorization, conflict policy, scheduler, or service-worker shell cache.

### Persistence and sync options

| Option                                        | Fit and limitation                                                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query Collections over Start endpoints        | Candidate for server reads and writes without a separate sync service. Does not alone establish offline reload or durable pending writes.                                                                                         |
| IndexedDB Collections                         | Useful for browser-owned drafts or local-only data. They persist rows and notify other tabs; cross-device sync and offline app startup are separate setup. Do not assume they are a persistence wrapper around Query Collections. |
| SQLite persistence around a synced collection | Candidate durable inventory cache. The documented browser wrapper uses OPFS and can wrap Query Collections. Confirm target-browser support and multi-tab behavior before adopting it.                                             |
| Offline transactions                          | Candidate durable pending-write outbox and replay. Separate from row persistence; backend mutations still require idempotency and revisions.                                                                                      |
| RxDB or PowerSync integration                 | Alternative if managed replication becomes necessary. Evaluate against the simpler endpoint-based approach before introducing another sync system.                                                                                |

Sources: [IndexedDB Collections](https://tanstack.com/db/latest/docs/collections/indexed-db-collection), [SQLite persistence](https://github.com/TanStack/db/blob/main/docs/guides/sqlite-persistence.md), [offline transactions](https://github.com/TanStack/db/blob/main/docs/guides/offline-transactions.md), [collection integrations](https://tanstack.com/db/latest/docs/overview).

### Proposed first trial

Test TanStack DB Query Collections backed by Start endpoints, with eager browser SQLite row persistence and the offline-transactions outbox. Load the small authorized pantry as a complete snapshot; avoid on-demand subsets for the initial offline implementation. Use one owner and existing endpoint writes, without adding a separate replication service yet. This is an architectural recommendation, not an installed or validated stack.

The offline executor documents that optimistic changes occur before the outbox write. Await executor initialization, verify offline mode is enabled, and establish the correct durable acknowledgement signal. Its final settled state may wait for connectivity. Do not assume row-cache writes and outbox writes are one atomic transaction. Specify recovery when either fails and retain a visible pending/error state. Server retries must use the same idempotency key. [Offline transaction lifecycle](https://github.com/TanStack/db/blob/main/docs/guides/offline-transactions.md)

Accept the combination only after proving:

1. Quarter updates refresh group totals, rule availability, and shopping results together.
2. Offline creation and edits survive a complete browser restart, including their pending intent.
3. Reconnect sends one logical purchase despite retries or a tab taking over processing.
4. Revision conflicts remain available for explicit review rather than silently replacing counts.
5. Two tabs, failed storage writes, schema upgrades, and sign-out preserve account isolation and explain failures.
6. Cached routes load without a network-dependent loader on iOS Safari/Home Screen and Android Chrome.

If the adapter combination fails these checks, retain the product's partial-offline contract and compare a dedicated sync adapter against a smaller custom IndexedDB implementation. Pin versions after the trial; do not carry two competing inventory stores into implementation.

## Authentication and future Authelia integration

Recommendation: use Better Auth with TanStack Start for application sessions and a generic OpenID Connect provider for future Authelia sign-in. Better Auth documents both integrations. If Authelia is not available initially, start with a provisioned owner account and local password sign-in, with public registration disabled. The initial login method is not yet selected. [Start integration](https://better-auth.com/docs/integrations/tanstack), [generic OAuth and OIDC](https://better-auth.com/docs/plugins/generic-oauth)

Authelia later acts as the identity provider. Register Open Pantry as a confidential OIDC client, use Authorization Code with PKCE S256, and configure discovery, client credentials, and an exact callback URL. The Start server completes the exchange and establishes the app session. Keep client secrets and provider tokens on the server; use a Secure, HttpOnly session cookie in the browser. Request only identity scopes needed by the app. [Authelia OIDC integration](https://www.authelia.com/integration/openid-connect/introduction/)

Give users stable internal IDs and link external identities by issuer and subject. Pantry ownership references the internal user ID. To move an existing owner to Authelia, explicitly link the new identity while authenticated; do not silently merge accounts by email. A provider change must not create a second empty pantry or move data between owners.

Every read, mutation, outbox replay, and push-subscription operation validates the current session and pantry access on the server. Route guards are navigation conveniences, not the authorization boundary. Query keys, collection IDs, browser persistence, and outboxes are scoped to the user and pantry. Never let an old account's pending writes replay under a new account.

Previously loaded local data can remain available offline on that device; this does not grant server access or refresh a login. If the session expires, retain pending changes, pause upload, request sign-in, then resume only for the same owner. Treat authentication failures as paused work rather than discarding queued edits. Sign-out clears private local state only after unresolved changes are handled. Distinguish application logout from identity-provider logout when implementing the OIDC flow.

## Application architecture

Use TanStack Start with React and TypeScript. TanStack Router defines `/pantry`, `/rules`, `/shopping`, and `/settings`; `/products/$productId` opens product details; `/scan` is an overlay-capable route that can also load directly. Start supplies the server boundary for validated mutations, authentication, product lookup, and push subscription registration. It supports server functions and server routes; local offline behavior is a separate application responsibility. [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview)

Proposed modules are `inventory`, `rules`, `shopping`, `products`, `sync`, and `reminders`. Keep unit conversion, date comparisons, matching, and shortage calculation as pure TypeScript functions shared by client and server. Evaluate TanStack DB as the reactive client data layer, with a durable row store and a durable pending-mutation outbox. The adapter combination is provisional; in-memory optimistic state alone does not satisfy offline durability.

A relational server database stores authoritative records, operation deduplication keys, subscriptions, and reminder delivery state. Choose the database provider, authentication library, and hosting adapter during scaffolding; hosting must support scheduled jobs or an external scheduler. The default product assumption is one owner with authenticated devices, not a public anonymous pantry.

### Partial offline contract

After a successful online load, a service worker caches a versioned shell and required route assets. The selected browser persistence layer contains the user's authorized inventory, rules, local product metadata, and manual shopping entries; the durable outbox retains pending mutations. Avoid making server loaders a requirement for rendering cached routes. Service workers provide request interception and cache access, but caching policy must be implemented explicitly. [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

| Action                                                                  | Offline behavior                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| View previously loaded pantry, rules, shopping                          | Works from local records; show last sync time                                            |
| Update quarters, consume, add a batch, edit rules                       | Persist recoverable mutation intent before reporting a durable save; recalculate locally |
| Scan a cached product                                                   | Decode on device and use cached metadata                                                 |
| Scan an unknown product                                                 | Save custom details and queue enrichment                                                 |
| First visit, login, new product lookup, permission-dependent enrollment | Requires connection; explain the requirement                                             |
| Receive reminder while disconnected                                     | Delivery is delayed; in-app date warnings still calculate locally                        |

“Saved on this device,” “Syncing,” “Up to date,” and “Needs review” distinguish durable local changes from server acknowledgement. Do not claim Saved on this device until the selected persistence/outbox durability boundary has succeeded. Verify recovery across their separate stores; an optimistic UI update is not proof of a durable save. Storage failure offers retry without clearing the form. Browser storage eviction can remove unsynced records; request persistent storage when supported and retain the server copy for recovery. On sign-out, warn about unsynced changes before clearing private local records; prevent one account from seeing another account's cache.

Replay queued operations on app startup, focus, reconnect, and manual retry, with bounded backoff. Background Sync is an optional enhancement, never a correctness dependency. Each operation has an idempotency key so retries cannot create duplicate purchases. A new purchase always has a unique batch ID.

Use revision checks for absolute quarter updates and edits. An operation against a stale revision becomes a visible conflict with current and pending values; do not silently overwrite a second device or use last-write-wins for stock counts. The user selects the correct amount or submits an explicit corrected count. Deletions use tombstones until clients have reconciled. Sync is server-authorized per pantry, including every operation and subscription.

### Open Food Facts

The server looks up a scanned barcode through the product API and requests only relevant fields: name, brand, category tags, quantity, image references, and available storage instructions. Optional detail fields include ingredients and label information. It identifies the app with a custom User-Agent, validates responses, caches results by barcode, coalesces duplicate requests, and applies shared upstream throttling. Respect the current documented per-IP quotas, timeout and back off on throttling or service errors, and avoid search-as-you-type requests. [Open Food Facts API guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/)

Store provenance and fetch time; permit a refresh without overwriting local edits. Unknown quantity strings need confirmation. Product metadata is community-maintained and may be incomplete. Display “Product data: Open Food Facts” with a source link, and observe database ODbL and product-image attribution/share-alike terms. Keep user inventory separate; review redistribution obligations before exporting a combined public product database. [Open Food Facts reuse guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/#before-you-start)

### Barcode decoding

Use browser camera access over HTTPS and feature-detect `BarcodeDetector` and supported formats. The native API has limited availability, so bundle a client-side fallback decoder with the offline shell and validate EAN-13, EAN-8, UPC-A, and UPC-E on target devices. Select the decoder and pin its version during implementation after device testing. Always retain typed barcode and manual product entry. [BarcodeDetector compatibility](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)

## Domain records

| Record                 | Essential fields and meaning                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pantry                 | ID, owner, time zone                                                                                                                                                                                                                                         |
| Location               | ID, pantry ID, name                                                                                                                                                                                                                                          |
| Product                | ID, optional barcode, name, brand, category IDs, tags, package quantity and unit, explicit count mappings, metadata source and fetched time, user overrides                                                                                                  |
| Batch                  | ID, pantry ID, product ID, package count, remaining mode and quantity or fraction, location, opened state and date, optional printed date and type, date-entry status, optional estimate date and provenance, optional opening limit, review state, revision |
| ProductReminderDefault | Product ID, owner, duration, start event, storage conditions, user-confirmed source                                                                                                                                                                          |
| StockRule              | ID, pantry ID, matcher predicates, comparator, threshold, unit, optional purchase size, enabled state, revision                                                                                                                                              |
| ShoppingEntry          | Derived rule references and shortage; persist only manual additions and in-basket state using stable IDs                                                                                                                                                     |
| StockOperation         | Unique operation ID, device ID, batch ID, operation type, payload, base revision, created time, acknowledgement state                                                                                                                                        |
| PushSubscription       | Pantry and device association, endpoint and keys, permission state, reminder preferences, delivery deduplication records                                                                                                                                     |

Inventory, rules, and reminders remain private. Imported public product metadata is stored separately from pantry quantities and dates.

## Notification delivery

Settings offers an opt-in daily digest, defaulting to 09:00 in the pantry time zone and 2 days before the effective date. The user can change the lead time, time, time zone, or disable reminders. Request browser permission only after “Enable notifications.” Display permission-denied and unsupported states with usable in-app reminders. On supported Apple mobile platforms, explain any Home Screen installation requirement before asking for permission. WebKit documents Home Screen web-app push support from iOS and iPadOS 16.4. [WebKit push support](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)

A scheduled server job evaluates the latest synced batches and sends Web Push to registered subscriptions. Push reception uses a service worker; the app does not have to be open. Delivery can be delayed by connectivity or operating-system policy. Local edits waiting to sync cannot update the server's reminder decisions, so show “Reminders use your last synced pantry” while pending. Do not promise device-local scheduled notifications from a closed offline web app. [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

Deduplicate by pantry, batch, effective date, lead window, and local digest date; group qualifying items into one digest. Revalidate stock before sending, remove expired subscriptions, and avoid sending catch-up digests for every missed day. Consumed batches cancel future candidates. Clicking a notification opens the relevant Use soon list and refreshes stale data. Default lock-screen wording can be generic, with product names an opt-in detail.

## Delivery sequence and acceptance

1. **Inventory foundation:** scaffold TanStack Start, identity, local database and sync boundary. Add manual products, purchase batches, quarter and exact updates, locations, and date ordering. Confirm batches with the same barcode retain distinct dates; ½ of 500 g contributes about 250 g; exact bread slices stay exact.
2. **Rules and shopping:** implement matcher previews, conversions, shortage calculations, overlap warnings, and purchase confirmation. Verify 3 slices under “more than 3” yields a shortage; an opened coffee pack does not satisfy a spare rule; shopping checks do not create inventory.
3. **Scanning and offline:** add camera decoding, Open Food Facts caching and attribution, shell caching and durable outbox. On supported mobile browsers, test permission denial, unknown barcode offline, offline reload, reconnect retries, duplicate detection, storage failure, and a two-device revision conflict.
4. **Reminders:** add settings, subscriptions, scheduler and deduplication. Test date boundaries and daylight-saving changes in Europe/Berlin, consumption before sending, denied permission, expired subscriptions, stale offline changes, and delayed delivery.

Before calling the application ready, verify keyboard and screen-reader flows, contrast, 320-pixel layouts, and the full scan-to-purchase-to-shopping loop on current iOS Safari/Home Screen and Android Chrome. Actual camera, offline reload, sync recovery, and push delivery require implementation and device testing; the preliminary prototype only validates screen structure and selected local interactions.

## Decisions to revisit during implementation

Defaults are one owner, quarter-based remaining amounts, optional exact counts, local-first edits, and opt-in daily reminders. Revisit shared households, preferred pack sizes across brands, dark appearance, hosting and authentication when scaffolding. These choices do not block review of the proposed screens.

## Open Food Facts field observations

Live product records checked on 22 October 2026 illustrate the distinction:

| Product record                                                                                                                                             | `expiration_date` | `conservation_conditions`                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| [Nutella 3017620422003](https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=product_name,expiration_date,conservation_conditions)     | `12-2024`         | French instructions to store dry, away from heat, and not refrigerate; no duration |
| [Whole Milk 5099874079781](https://world.openfoodfacts.org/api/v2/product/5099874079781.json?fields=product_name,expiration_date,conservation_conditions)  | Absent            | Absent                                                                             |
| [Lactel milk 3428272950057](https://world.openfoodfacts.org/api/v2/product/3428272950057.json?fields=product_name,expiration_date,conservation_conditions) | `05/11/2017`      | Absent                                                                             |

These are examples, not a coverage estimate. The observed expiry values are old calendar dates, not reusable shelf-life durations. Storage text is useful for product details; if another record contains an explicit duration and storage conditions, offer a user-confirmed opening or production rule tied to the stated starting event.
