/** The name in the given language when Open Food Facts has one, else its default name. */
export function localizedName(
  names: Record<string, string>,
  locale: string,
  fallback: string | null,
): string | null {
  return names[locale] ?? fallback;
}
