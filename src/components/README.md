# Components

One folder per component: `Name/Name.tsx` plus `Name/Name.module.css`.

- Build interactive behaviour on [Radix Primitives](https://www.radix-ui.com/primitives) (one `@radix-ui/react-*` package per primitive, imported as a namespace: `import * as Dialog from "@radix-ui/react-dialog"`; not the `radix-ui` umbrella, which makes the build read every primitive) and style them with CSS Modules; no utility CSS framework.
- Use the design tokens from `src/styles.css` (`var(--color-green)`, `var(--space-4)`, …) instead of literal values.
- Style Radix state through its data attributes, e.g. `.item[data-state="checked"]`.
- Icons come from [Lucide](https://lucide.dev/icons) (`lucide-react`). Import each icon by name, size it with `size`, let it inherit `currentColor`, and mark decorative icons `aria-hidden`; the control around it carries the label.
