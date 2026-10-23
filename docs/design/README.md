# Preliminary screen designs

Open [screens.html](screens.html) directly in a browser. The file is self-contained and makes no network requests.

The designs cover Pantry, Stock rules, Shopping, scan and batch sheets, and reminder settings. Try the navigation, pantry search and location filters, quarter controls, exact slice updates, rule threshold edits, in-basket checks, and simulated purchase confirmation. Settings contains reminder preferences and offline preview controls. Storage-space fullness is omitted; quarter controls describe remaining food amounts.

Sample data is fixed to 21 October 2026. Changes last only for the current page session; reload to reset. The scanner is explicitly a simulation and uses a sample milk product. Product lookup, camera access, permissions, notifications, local persistence, and synchronization are specified in [the technical plan](../technical-plan.md), not implemented in this prototype. The offline toggle previews messaging only.

Visual direction: warm neutral backgrounds, deep green actions, short functional headings, readable inventory rows, date warnings with text labels, and a labeled floating scan button. Mobile layouts use bottom navigation; desktop layouts use a sidebar.

The current revision removes storage-space fullness and decorative headings, and gives Use soon items separate date, product, and amount/action areas. The script passes a JavaScript syntax check. Visual browser review of this revision is pending because local-file inspection was blocked by browser policy.

Tap a product name in Pantry or Use soon to open its details, view separate batches, and save an optional reminder estimate. Add the same named product to see the estimated date default; the preview uses its fixed sample date as the starting date. Product metadata is illustrative and shelf-life defaults are personal, not supplied by Open Food Facts.

Printed dates distinguish MHD and Verbrauchsdatum. Dates are optional, with separate No printed date and Not entered yet states; estimates keep their own label.

Inventory keeps three component alternatives using the same sample batches: Detailed rows, Amount cards, and Compact list. Use Compare styles / Rows / Cards / Compact above inventory to switch; search and location filters apply to every style. Product details and batch updates work in each option. These are design alternatives, not a committed application setting.

Cards are now the default and occupy one full-width column on mobile. Matching milk purchases appear in one product card: 2 cartons physically present, approximately 1.5 cartons left. Expand Individual cartons to update each one separately; the example starts expanded. Grouping is applied after search and location filters.

Ground coffee also demonstrates grouping: one half-full opened pack and one full unopened spare, each with its own MHD. The unopened pack satisfies the spare-coffee stock rule.

Add and update forms now offer Track amount in. Sample product information prefills cartons for milk and slices for bread. Changes are remembered per product for the session. Switching between package tracking and content units requires explicitly entered quantities; no mass-to-volume or slice conversion is inferred.
