import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { and, eq } from "drizzle-orm";

import { auth } from "#/domains/auth/auth.ts";
import { db } from "#/db/index.ts";
import {
  batch,
  location,
  member,
  offProduct,
  product,
  user,
  type trackUnits,
} from "#/db/schema.ts";
import type { DateKind } from "#/domains/inventory/format.ts";
import { refreshOffProduct, type OffRow } from "#/domains/products/off-cache.ts";
import { parsePackageSize } from "#/domains/products/quantity.ts";

// Local development only: creates a demo account whose pantry is well stocked, or restocks it
// if it exists. Run with `pnpm db:seed`. Dates are relative to today so Use soon shows something.

const DEMO = { name: "Demo Cook", email: "demo@open-pantry.test", password: "open-pantry-demo" };

if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to seed a database that is not on localhost.");
}

type Unit = (typeof trackUnits)[number];
type Stock = {
  /** Remaining quarters; below 4 means opened. */
  q?: number;
  /** Days from today; negative is past. Omit for no date. */
  in?: number;
  kind?: DateKind;
  /** Identical packages. */
  n?: number;
};
type Item = {
  /** A real Open Food Facts barcode: name, brand and package size then come from OFF. */
  code?: string;
  /** Loose items without a barcode (fresh produce, leftovers) carry their own details. */
  name?: string;
  size?: [number, "g" | "ml"];
  unit?: Unit;
  at: "Cupboard" | "Fridge" | "Freezer";
  stock: Stock[];
};

const pantry: Item[] = [
  // Cupboard
  {
    code: "8076800195057",
    at: "Cupboard",
    stock: [
      { n: 2, in: 420 },
      { q: 2, in: 300 },
    ],
  }, // Barilla Spaghetti
  { code: "4056489095736", at: "Cupboard", stock: [{ in: 520 }] }, // Golden Sun basmati
  { code: "4000540000108", at: "Cupboard", stock: [{ q: 3, in: 210 }] }, // Kölln oat flakes
  { code: "4000406002758", at: "Cupboard", stock: [{ n: 2, in: 260 }] }, // Diamant flour
  { code: "4006544205006", at: "Cupboard", stock: [{ q: 2, kind: "none" }] }, // Südzucker sugar
  { code: "8005110630408", at: "Cupboard", stock: [{ n: 4, in: 610 }] }, // Mutti passata
  { code: "20166083", at: "Cupboard", stock: [{ n: 3, in: 540 }] }, // Freshona chickpeas
  { code: "8000070020580", at: "Cupboard", stock: [{ in: 190 }, { q: 2, in: 120 }] }, // Lavazza Oro
  { code: "80053835", unit: "bottle", at: "Cupboard", stock: [{ q: 3, in: 330 }] }, // Monini olive oil
  { code: "4023300492135", at: "Cupboard", stock: [{ q: 2, kind: "none" }] }, // Langnese honey
  { code: "4056489424918", at: "Cupboard", stock: [{ q: 1, in: 90 }] }, // McEnnedy peanut butter
  { code: "4008391040052", at: "Cupboard", stock: [{ q: 3, in: 150 }] }, // Seitenbacher muesli
  { code: "5055953902531", at: "Cupboard", stock: [{ n: 2, in: 380 }] }, // Twinings Earl Grey
  { code: "3046920022651", at: "Cupboard", stock: [{ n: 2, in: 200 }] }, // Lindt 70%
  { code: "8715035110304", unit: "bottle", at: "Cupboard", stock: [{ q: 3, in: 400 }] }, // Kikkoman soy sauce
  { code: "3017620422003", at: "Cupboard", stock: [{ q: 2, in: 240 }] }, // Nutella
  { code: "3039820510250", at: "Cupboard", stock: [{ in: 450 }] }, // Vivien Paille lentils
  {
    name: "Sourdough bread",
    unit: "loaf",
    at: "Cupboard",
    stock: [{ q: 3, in: 2, kind: "estimate" }],
  },
  // Fridge
  {
    code: "4008452027602",
    unit: "carton",
    at: "Fridge",
    stock: [
      { n: 2, in: 6 },
      { q: 2, in: 3 },
    ],
  }, // Weihenstephan milk
  { code: "4001954161010", at: "Fridge", stock: [{ q: 3, in: 26 }] }, // Kerrygold butter
  {
    code: "5201054015872",
    at: "Fridge",
    stock: [
      { n: 2, in: 7 },
      { q: 1, in: 2 },
    ],
  }, // Fage Total
  { code: "20034658", at: "Fridge", stock: [{ in: 3, kind: "use_by" }] }, // Räucherlachs
  { code: "4009491022016", unit: "carton", at: "Fridge", stock: [{ q: 3, in: 8 }] }, // Valensina orange juice
  { code: "5000184321071", at: "Fridge", stock: [{ q: 2, in: 60 }] }, // Hellmann's mayonnaise
  { code: "8715700016504", unit: "bottle", at: "Fridge", stock: [{ q: 3, in: 130 }] }, // Heinz ketchup
  { code: "20757809", at: "Fridge", stock: [{ q: 2, in: 4, kind: "use_by" }] }, // Vemondo hummus
  { code: "20575342", at: "Fridge", stock: [{ q: 2, in: -2 }] }, // Milbona cheddar slices, past its MHD
  { name: "Eggs", unit: "pack", at: "Fridge", stock: [{ q: 3, in: 12 }] },
  { name: "Carrots", size: [1000, "g"], at: "Fridge", stock: [{ in: 10, kind: "estimate" }] },
  { name: "Apples", unit: "piece", at: "Fridge", stock: [{ n: 6, kind: "none" }] },
  // Freezer
  { code: "4250241203524", at: "Freezer", stock: [{ q: 3, in: 200 }] }, // Iglo Fischstäbchen
  { code: "4250241204750", at: "Freezer", stock: [{ n: 2, in: 310 }] }, // Iglo Gartenerbsen
  { code: "4001724035268", at: "Freezer", stock: [{ n: 2, in: 160 }] }, // Dr. Oetker pizza
  { code: "8711327374256", at: "Freezer", stock: [{ q: 2, in: 250 }] }, // Ben & Jerry's
  { name: "Leftover chili", at: "Freezer", stock: [{ kind: "unknown" }] },
];

const dumpPath = process.env.OFF_DUMP ?? ".data/off/en.openfoodfacts.org.products.csv.gz";

/**
 * Rows of the Open Food Facts CSV export for the given barcodes, so seeding needs no API calls.
 * Download the dump into the git-ignored .data/off/ (see docs/testing-on-a-phone.md or the OFF
 * data page); without it each barcode is fetched through the app's rate-limited client instead.
 */
async function readDump(codes: Set<string>) {
  const found = new Map<string, OffRow>();
  if (!existsSync(dumpPath)) return found;
  const lines = createInterface({ input: createReadStream(dumpPath).pipe(createGunzip()) });
  let columns: Record<string, number> | undefined;
  for await (const line of lines) {
    const cells = line.split("\t");
    if (!columns) {
      columns = Object.fromEntries(cells.map((name, index) => [name, index]));
      continue;
    }
    const cols = columns;
    const code = cells[cols.code];
    if (!codes.has(code)) continue;
    const text = (name: string) => cells[cols[name]]?.trim() || null;
    const image = text("image_url");
    found.set(code, {
      barcode: code,
      status: "found",
      name: text("product_name"),
      names: {},
      brand: text("brands"),
      quantity: text("quantity"),
      categories: (text("categories_tags")?.split(",") ?? []).slice(0, 20),
      imageUrl: image?.startsWith("https://images.openfoodfacts.org/") ? image : null,
      storageInstructions: null,
      fetchedAt: new Date(),
    });
    if (found.size === codes.size) break;
  }
  return found;
}

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, DEMO.email));
let userId = existing[0]?.id;
if (!userId) {
  try {
    userId = (await auth.api.signUpEmail({ body: DEMO })).user.id;
  } catch (error) {
    throw new Error(
      "Could not create the demo account. Sign-up is closed once any account exists; " +
        "reset the database (docker compose down -v) to seed a fresh one.",
      { cause: error },
    );
  }
}

const [membership] = await db.select().from(member).where(eq(member.userId, userId));
if (!membership) throw new Error("The demo account has no pantry.");
const pantryId = membership.organizationId;

const codes = new Set(pantry.flatMap((item) => (item.code ? [item.code] : [])));
const offRows = await readDump(codes);
for (const code of codes) {
  if (!offRows.has(code)) {
    console.log(`${code} is not in the dump; fetching it from Open Food Facts.`);
    const row = await refreshOffProduct(code);
    if (row?.status !== "found") throw new Error(`Open Food Facts has no product ${code}.`);
    offRows.set(code, row);
  }
}
for (const row of offRows.values()) {
  await db
    .insert(offProduct)
    .values(row)
    .onConflictDoUpdate({ target: offProduct.barcode, set: row });
}

await db.transaction(async (tx) => {
  // Products cascade to their batches.
  await tx.delete(product).where(eq(product.pantryId, pantryId));
  const sortOrder = { Cupboard: 0, Fridge: 1, Freezer: 2 };
  for (const name of Object.keys(sortOrder) as (keyof typeof sortOrder)[]) {
    await tx
      .insert(location)
      .values({ id: crypto.randomUUID(), pantryId, name, sortOrder: sortOrder[name] })
      .onConflictDoNothing();
  }
  const locations = await tx.select().from(location).where(eq(location.pantryId, pantryId));
  const locationId = (name: string) => {
    const row = locations.find((l) => l.name === name);
    if (!row) throw new Error(`Missing location ${name}`);
    return row.id;
  };

  for (const item of pantry) {
    const dated = item.stock.find((s) => s.in !== undefined);
    const printed = dated?.kind === "mhd" || dated?.kind === "use_by" ? dated.kind : null;
    const off = item.code ? offRows.get(item.code) : undefined;
    // The barcode's package size counts as confirmed only where OFF's text is unambiguous.
    const size = off
      ? parsePackageSize(off.quantity)
      : item.size && { amount: item.size[0], unit: item.size[1] };
    const productId = crypto.randomUUID();
    // Name and brand stay null for OFF products, so they keep following Open Food Facts.
    await tx.insert(product).values({
      id: productId,
      pantryId,
      barcode: item.code ?? null,
      name: off ? null : (item.name ?? null),
      brand: null,
      trackUnit: item.unit ?? "pack",
      packageAmount: size?.amount ?? null,
      packageUnit: size?.unit ?? null,
      printedDateKind: printed,
    });
    for (const s of item.stock) {
      const quarters = s.q ?? 4;
      const kind: DateKind = s.kind ?? (s.in === undefined ? "unknown" : "mhd");
      const hasDate = kind === "mhd" || kind === "use_by" || kind === "estimate";
      await tx.insert(batch).values(
        Array.from({ length: s.n ?? 1 }, () => ({
          id: crypto.randomUUID(),
          pantryId,
          productId,
          locationId: locationId(item.at),
          quarters,
          opened: quarters < 4,
          dateKind: kind,
          date: hasDate ? day(s.in ?? 0) : null,
        })),
      );
    }
  }
});

const count = await db.$count(batch, and(eq(batch.pantryId, pantryId)));
console.log(
  `Seeded ${pantry.length} products (${codes.size} from Open Food Facts), ${count} batches.`,
);
console.log(`Sign in at /sign-in with ${DEMO.email} / ${DEMO.password}`);
await db.$client.end();
process.exit(0);
