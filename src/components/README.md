# Components

Shared UI only: components that know nothing about a feature (`Button`, `Card`, `Form/*`, `Hint`, `AmountPicker`). Feature components live in `src/features/<name>/`, the app frame in `src/layout/`.

These rules apply to components in `src/features/` and `src/layout/` too.

- One component per file (`react/no-multi-comp`).
- One folder per public component: `Name/Name.tsx` plus `Name/Name.module.css`. Parts that only make sense inside it, such as `AmountForm` in `BatchAmount/`, are sibling files that share its stylesheet and are not imported from outside the folder.
- A family of components that are used independently but share one look and one stylesheet may share a folder, one file per component, as in `Form/`. Name the folder after the family.

- Build interactive behaviour on [Radix Primitives](https://www.radix-ui.com/primitives) (one `@radix-ui/react-*` package per primitive, imported as a namespace: `import * as Dialog from "@radix-ui/react-dialog"`; not the `radix-ui` umbrella, which makes the build read every primitive) and style them with CSS Modules; no utility CSS framework.
- Use the design tokens from `src/styles.css` (`var(--color-green)`, `var(--space-4)`, …) instead of literal values.
- Style Radix state through its data attributes, e.g. `.item[data-state="checked"]`.
- Icons come from [Lucide](https://lucide.dev/icons) (`lucide-react`). Import each icon by name, size it with `size`, let it inherit `currentColor`, and mark decorative icons `aria-hidden`; the control around it carries the label.
