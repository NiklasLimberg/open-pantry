# Open Pantry product design

Draft · 22 October 2026

See what is at home, use food in time, and buy what is missing. Start with one person's pantry across cupboard, fridge, and freezer.

[Screen prototype](design/screens.html) · [Detailed data and rules](data-and-rules.md) · [Technical plan](technical-plan.md)

## Navigation and appearance

Pantry, Stock rules, and Shopping are the main destinations. Settings holds reminders. A floating Scan button is available throughout. Use bottom navigation on mobile and a sidebar on desktop (from 700 px wide: 222 px, narrowing to 185 px below 1050 px, with Settings at its foot).

Keep the warm neutral surfaces, green actions, and short functional headings. Avoid slogans and decorative headings. Status uses text as well as color. Provide visible keyboard focus, labeled controls, 44-pixel touch targets, and layouts that work at 320 pixels.

## Pantry

Use soon appears first, ordered by date. Its spacious cards separate the date, product details, and remaining amount/update action. Show MHD, Verbrauchsdatum, or Estimated reminder explicitly.

Inventory uses cards, one full-width card per row on mobile. Search by name and filter by location. Group compatible purchases of the same product, while retaining their separate amounts, dates, and opened states.

A milk card can show 2 cartons physically present and approximately 1.5 cartons remaining. Expand Individual cartons to see the half-full opened carton and the unopened spare, each with its own Update action. Ground coffee uses the same grouping. Show the earliest date on the group card; show only matching batches when a filter is applied.

Tap a product name for details. Each batch shows its amount choices in place, with the saved one selected: Full, ¾, ½, ¼, and Used up. Picking a different one reveals an Update button; nothing is saved until it is pressed. Anything below Full marks the batch opened, so there is no separate Opened control here; exact counts are available for slices and other useful units. Used up and Discard support Undo. A physical storage-fullness indicator is not included.

## Product details and units

Details separate product information from purchases at home. Show the image, name, brand, barcode, category, package size, storage instructions, and source when available. Missing product information stays visibly unavailable. Each purchase retains its own update action.

Track amount in offers packs, cartons, bottles, loaves, slices, pieces, grams, and millilitres. Prefill the saved product preference first, otherwise a supported Open Food Facts suggestion, otherwise packs. Allow corrections and remember them for future additions.

A unit choice does not imply a conversion. If slices per loaf are unknown, ask for the count. Never infer slices from weight or convert grams to millilitres without an explicit mapping. Show quarter-based totals as approximate.

## Stock rules

Rules describe what enough means: more than 3 bread slices, at least 2 milk cartons, or 1 unopened spare coffee pack. Each shows available stock, target, and shortage.

Match a category, product, or personal tag. Optional brand, location, unopened-state, and remaining-life criteria narrow the match. Preview included and excluded stock before saving. Support editing, pausing, and deleting rules. If a conversion is missing, show Needs quantity details.

## Shopping

Build the shopping list from active rules and allow manual additions. Show what to buy, how much is at home, the target, and the responsible rule. Flag overlapping rules rather than blindly adding their shortages.

Checking an item means In basket. Put purchases away confirms the actual product, quantity, location, and date before adding stock. Recalculate the list after saving. Keep checked items understandable when the required amount changes.

## Scanning and adding

Scan opens the camera after the user requests it. Resolve the barcode to product details, then offer Add a purchase or Update existing. Updating requires choosing a batch; a barcode cannot identify which carton is in hand.

Confirm the unit, starting amount (Full by default; anything below Full marks the package opened), optional date, and location before saving. The flow opens in a dialog over the current page. Allow manual barcode and product entry when the camera is denied, lookup fails, or a product is unknown. Keep camera frames on the device.

## Dates and reminders

Dates are optional. Default to MHD, while supporting Verbrauchsdatum, No printed date, Not entered yet, and Estimated reminder. Keep those states distinct. Past MHD items ask for review; past Verbrauchsdatum items show Do not use and do not count as available stock.

Open Food Facts supplies product information, not a reliable date for the particular package at home. Use the confirmed printed date first. A saved personal reminder duration can suggest a clearly labeled estimate; otherwise leave the date unknown. Estimates never masquerade as printed dates.

Reminders are opt-in, with a daily digest defaulting to 2 days ahead at 09:00 in the pantry time zone. Let the user change or disable it. Request notification permission after an explicit action. In-app Use soon remains useful when notifications are unavailable. While edits await sync, explain that external reminders use the last synced pantry.

## Offline and recovery

While a page is open, the last loaded inventory stays on screen if the connection drops; starting the app offline is not supported yet. Adding and updating stock needs a connection, and a failed save keeps the form. Scanning decodes on the device. Unknown barcodes allow manual details, with enrichment later. Sign-in and new online lookups require a connection.

Show a status line only when something needs attention: Offline, a refresh that takes longer than about half a second, or a failed refresh with Try again. Nothing is shown when the pantry is up to date. Keep unsaved forms on failure. Conflicting device edits ask for a corrected amount. Empty pantry, no search matches, and no configured rules each offer the relevant next action.

## Release scope

Shared households, recipes, nutrition analysis, automatic expiry recognition, ordering, and Open Food Facts contributions are outside the first release. Implementation steps and verification belong in the [technical plan](technical-plan.md).
