/** Joins class names, skipping the ones that are off: `cx(styles.button, primary && styles.primary)`. */
export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
