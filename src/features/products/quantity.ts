// Open Food Facts `quantity` is free text typed by contributors ("400 g e", "1,5 L", "6 x 100 g").
// Only unambiguous single-package amounts are parsed; everything else must be confirmed by the user
// (docs/data-and-rules.md: never invent a conversion, treat multipack count and contents separately).

export type PackageSize = { amount: number; unit: "g" | "ml" };

const factors: Record<string, [PackageSize["unit"], number]> = {
  g: ["g", 1],
  gr: ["g", 1],
  kg: ["g", 1000],
  mg: ["g", 0.001],
  ml: ["ml", 1],
  cl: ["ml", 10],
  dl: ["ml", 100],
  l: ["ml", 1000],
  lt: ["ml", 1000],
};

/** Returns the size of one package, or null for multipacks, counts and anything unclear. */
export function parsePackageSize(text: string | null | undefined): PackageSize | null {
  if (!text) {
    return null;
  }
  // "400 g e": the trailing "e" is the EU estimated-quantity sign, not part of the amount.
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)\s*e?\s*$/.exec(text);
  if (!match) {
    return null;
  }
  const factor = factors[match[2].toLowerCase()];
  if (!factor) {
    return null;
  }
  const amount = Math.round(Number(match[1].replace(",", ".")) * factor[1]);
  return amount > 0 ? { amount, unit: factor[0] } : null;
}
