# Open Pantry data and rules

Draft · 22 October 2026

Detailed behavior for quantities, stock matching, and dates. Start with the [product design](design.md) for screens and everyday flows; see the [technical plan](technical-plan.md) for storage, sync, integrations, and delivery.

## Shared terms

A product describes a food and its confirmed package definition. A batch represents food acquired together with the same date, location, and opened state. Split packages into separate batches when those properties or remaining fractions differ. Inventory cards group compatible batches for display; grouping never merges their dates or update actions.

Group by product identity and confirmed package size, not category or name alone. Search and location filters apply before grouping. The prototype uses sample names and units in place of production product IDs.

## Remaining amounts

### Quarter amounts

A batch has an initial package count and per-package amount, plus a remaining fraction selected from 1, 0.75, 0.5, 0.25, and 0. The UI labels these Full, ¾, ½, ¼, and Empty. A 500 g coffee pack at ½ contributes approximately 250 g or 0.5 pack, depending on the rule unit. Approximate contributions are labeled “about.”

Separate packages with different fractions, opened states, or dates into separate batches. Identical unopened packages can be grouped, such as two full 1 L milk cartons with the same date. Changing one to opened splits it from the group. An unopened spare rule counts only whole unopened packages.

### Choosing the tracking unit

Add and update forms include a Track amount in selector with packs, cartons, bottles, loaves, slices, pieces, grams, and millilitres. Default precedence is the user's saved choice for this product, a supported Open Food Facts suggestion, then packs. Keep the selector editable and show where the suggestion came from. Save confirmed choices by product ID for future additions; an imported refresh must not overwrite them.

Open Food Facts packaging components can supply shape, number of units, and quantity per unit; normalized product quantity supplies mass or volume. Map a supported container shape to carton or bottle only when the relevant retail package is unambiguous. Packaging can include caps and wrappers, so do not simply use the first component. Treat multipack count and contents per package separately. [Packaging schema](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/packagings/packagings.yaml), [product quantity schema](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_base.yaml)

Choosing a label does not establish a conversion. Switching to slices without a slice count asks the user for the full and remaining amounts; switching to grams or millilitres requires a confirmed amount in that dimension. Never relabel an existing quantity without conversion. Container labels can share the internal package-count dimension, but different package sizes remain distinct. Grouping uses product identity and compatible confirmed units and package definitions. Existing batches retain their quantities when a future default is changed.

The prototype prefills units from illustrative product details and remembers the user's saved choice for the current session. A changed batch unit requires re-entering amounts where a conversion is unknown; cross-unit rule conversion remains an implementation task.

### Exact amounts and conversions

Exact mode stores remaining count, mass, or volume. Bread can have 20 slices per loaf and 3 slices remaining; a loaf fraction is only convertible to slices if the user supplies slices per loaf. A barcode's package weight does not imply a slice count. Mass and volume are separate dimensions; no implicit conversion between grams and millilitres. Compatible metric units convert deterministically. “Pack” refers to the confirmed retail package, not a shipping case; multipacks require an explicit count mapping.

With approximate stock, rule results are estimates. Show this rather than implying that a quarter measurement guarantees a strict slice threshold. Exact slice rules offer “Confirm slice count” when the matching stock is only estimated.

## Rule evaluation

First select positive-quantity batches matching every predicate. Exclude discarded, consumed, past Verbrauchsdatum batches, and unreviewed batches past their MHD. Unknown dates count by default but display an “Unknown date” warning; when a rule requires a minimum remaining life, unknown dates cannot satisfy it. Compare dates in the pantry's configured time zone.

Normalize the included quantities into the rule unit using explicit mappings. For integer units, “more than N” means at least N + 1. For continuous units, a strict comparison requires a user-visible increment, such as 100 g; do not add an invisible floating-point epsilon. The editor defaults continuous units to “at least.”

`shortage = max(0, effectiveTarget - matchingAvailableQuantity)`

When a preferred purchase size is known, the list suggests whole packages rounded up to cover the shortage. Otherwise it requests the shortage in the rule unit and asks for the actual package size during purchase confirmation. It must not invent a conversion.

| Rule                                        | Available                         | Result                                                         |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| More than 3 bread slices                    | 3 exact slices                    | Need 1 slice; suggest 1 loaf only if a loaf size is configured |
| At least 2 milk packs                       | 1 unopened pack and ½ opened pack | About 0.5 pack short; suggest buying 1 pack                    |
| At least 1 unopened coffee pack             | ½ opened pack                     | Buy 1 unopened pack                                            |
| At least 500 g rice                         | ¾ of a confirmed 1 kg bag         | About 750 g available; covered                                 |
| At least 2 milk packs with 3 days remaining | 2 packs dated tomorrow            | Buy 2 packs; existing stock appears in Use soon                |

## Dates and reminders

Store date-only values as calendar dates, not midnight UTC timestamps. Dates are optional. Add and edit forms default to Mindesthaltbarkeitsdatum (MHD), with Verbrauchsdatum (zu verbrauchen bis) available in the date-label control. Also allow No printed date, Not entered yet, and Estimated reminder. No printed date and Not entered yet disable the calendar field; neither blocks saving. Retain these states separately from printed dates and estimates in the data model. MHD and Verbrauchsdatum have different meanings in German labeling, so never infer the type from a product category or rename one to the other. [German date-label guidance](https://www.verbraucherzentrale.de/wissen/lebensmittel/gesund-ernaehren/mindesthaltbarkeitsdatum-mhd-ist-nicht-gleich-verbrauchsdatum-13452) An optional user-entered “use within N days after opening” creates an opening-based date; the effective reminder date is the earlier of that date and the printed date. The app does not infer food safety from a barcode. Personal reminder estimates remain distinct from printed dates.

### Suggested dates when adding food

Open Food Facts is a product metadata source, not the source of the date on the package in hand. Its current documented schema includes `conservation_conditions` and `expiration_date` as strings; it does not establish a standard maximum shelf-life duration. A recorded product expiry date must not be copied onto a new batch. [Open Food Facts extended product schema](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_extended.yaml)

Use this precedence: the user's confirmed printed date first; a product-specific personal reminder default second; otherwise leave the date unknown. Personal defaults are optional and keyed by product ID, with the intended location and unopened state recorded. Never reuse another batch's calendar date. A duration measured from production cannot be added to the purchase date: production date and applicable storage conditions are needed to calculate that date. Opening-based durations start when the user records opening, not when the product is added.

A suggested date is prefilled as “Estimated reminder” and shows its source, duration, and starting event. The user can replace it with the printed date or clear it. Store date kind and provenance separately so reminders, detail views, and Use soon retain the estimate label. Estimates do not establish a printed MHD and are not automatically treated as expired stock; show “Review estimate” once the estimate passes. Rules requiring a known remaining life do not count estimates as confirmed shelf life. The prototype uses an opt-in product-name match for session-only demonstration; production defaults use stable product IDs and storage conditions.

If future manufacturer data provides an explicit duration with a defined starting event and storage conditions, offer it for confirmation with attribution. Free-text storage instructions are shown as text until the user confirms any extracted duration; no maximum-life assumption is inferred. Category-level shelf-life data from a separate source would require its own matching and provenance design.

## Rule matching and shopping behavior

A rule matches a category (including descendants), a specific product, or a personal tag. Additional brand, location, unopened-state, and minimum-remaining-life criteria combine with AND. Missing categories can be assigned locally. Preview matching and excluded batches before saving; unavailable conversions show Needs quantity details rather than zero stock.

Paused rules do not generate shopping entries. For identical matchers and units use the strongest target. Different overlapping matchers retain separate entries and an overlap note until reviewed; do not add their deficits blindly. One confirmed purchase may satisfy several rules, so recalculate all rules after saving it.

Shopping entries are derived from rules plus manual additions. Persist manual additions and in-basket state. A check means In basket; only confirmed put-away creates inventory. If need changes while checked, preserve the check and show Need changed. Removing a rule removes its derived shortage but preserves manual entries.

## Reminder preferences

Reminders are opt-in, with one daily digest. Defaults are 2 days ahead at 09:00 in the pantry time zone. Allow changing the lead time, digest time, and time zone, or disabling reminders. Default lock-screen text is generic; product names are optional. Unknown dates do not generate date reminders. Opening-based reminders use the earlier of the opening limit and a confirmed printed date.
