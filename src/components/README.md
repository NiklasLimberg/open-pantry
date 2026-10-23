# Components

One folder per component: `Name/Name.tsx` plus `Name/Name.module.css`.

- Build interactive behaviour on [Radix Primitives](https://www.radix-ui.com/primitives) (`radix-ui` package) and style them with CSS Modules; no utility CSS framework.
- Use the design tokens from `src/styles.css` (`var(--color-green)`, `var(--space-4)`, …) instead of literal values.
- Style Radix state through its data attributes, e.g. `.item[data-state="checked"]`.
