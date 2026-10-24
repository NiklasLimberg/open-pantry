import { lookupBarcode, type BarcodeLookup } from "./stock.functions.ts";

const lookupTimeoutMs = 10_000;

/** What is known about a scanned barcode; "offline" when the lookup could not be attempted or finish. */
export type LookupState = BarcodeLookup | { status: "offline"; barcode: string; productId: null };

/**
 * Asks Open Food Facts (through the server) about a barcode. Never rejects: with no connection,
 * a failure, or no answer within ten seconds the result is "offline", and the caller carries on
 * with details typed by the user.
 */
export async function resolveBarcode(barcode: string): Promise<LookupState> {
  const offline = { status: "offline", barcode, productId: null } as const;
  if (!navigator.onLine) return offline;
  try {
    return await Promise.race([
      lookupBarcode({ data: { barcode } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), lookupTimeoutMs),
      ),
    ]);
  } catch {
    return offline;
  }
}
