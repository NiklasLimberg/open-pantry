import { lookupBarcode } from "#/features/inventory/stock.functions.ts";
import type { BarcodeLookup } from "#/features/inventory/stock.types.ts";

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
  if (!navigator.onLine) {
    return offline;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookupBarcode({ data: { barcode } }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), lookupTimeoutMs);
      }),
    ]);
  } catch {
    return offline;
  } finally {
    clearTimeout(timer);
  }
}
