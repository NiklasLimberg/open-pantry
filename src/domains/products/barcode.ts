// Pure and shared by client and server: the scanner and the typed-barcode field validate with the
// same rules, so an offline scan is accepted or rejected exactly as it will be on the server.

export const barcodeFormats = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

/** Digits only; spaces and dashes from copy-pasted or typed codes are dropped. */
export function cleanBarcode(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/** GS1 check digit over all digits but the last, weights 3,1,3,1… counted from the right. */
function hasValidCheckDigit(digits: string): boolean {
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += Number(digits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/** UPC-E is a zero-suppressed UPC-A; expand it so the same check applies. */
function expandUpcE(code: string): string {
  const [system, d1, d2, d3, d4, d5, d6, check] = code;
  const last = Number(d6);
  const body =
    last <= 2
      ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
      : last === 3
        ? `${d1}${d2}${d3}00000${d4}${d5}`
        : last === 4
          ? `${d1}${d2}${d3}${d4}00000${d5}`
          : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${system}${body}${check}`;
}

/** Returns the canonical code (UPC-A is stored as EAN-13 with a leading zero) or null. */
export function normalizeBarcode(input: string): string | null {
  const code = cleanBarcode(input);
  if (!/^\d+$/.test(code)) return null;
  if (code.length === 13 || code.length === 8) {
    return hasValidCheckDigit(code) ? code : null;
  }
  if (code.length === 12) {
    return hasValidCheckDigit(code) ? `0${code}` : null;
  }
  return null;
}

/** UPC-E codes are 8 digits starting with 0 or 1, which collide with EAN-8 by length. */
export function normalizeScannedBarcode(raw: string, format?: string): string | null {
  if (format === "upc_e") {
    const code = cleanBarcode(raw);
    if (!/^[01]\d{7}$/.test(code)) return null;
    const expanded = expandUpcE(code);
    return hasValidCheckDigit(expanded) ? `0${expanded}` : null;
  }
  return normalizeBarcode(raw);
}
