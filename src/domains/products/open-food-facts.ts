import { z } from "zod";

// Server-only client for the Open Food Facts product API. The public API is limited to 15 product
// reads per minute per IP and bans abusers, so every request in this process goes through one
// queue with fixed spacing, duplicate lookups share a single request, and throttling responses
// pause the queue. Never call it from search-as-you-type or from the browser.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

const baseUrl = process.env.OFF_BASE_URL ?? "https://world.openfoodfacts.org";
const contact = process.env.OFF_CONTACT ?? "niklas@limberg.dev";
const userAgent = `OpenPantry/0.1 (${contact})`;

/** 15 reads/min is the limit; 5 s spacing keeps us at 12 and leaves room for the manual lookups. */
const minSpacingMs = 5_000;
const timeoutMs = 8_000;
const defaultBackoffMs = 60_000;

const fields = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "categories_tags",
  "image_front_url",
  "image_front_small_url",
  "conservation_conditions",
].join(",");

const responseSchema = z.object({
  status: z.number(),
  product: z
    .object({
      product_name: z.string().optional(),
      brands: z.string().optional(),
      quantity: z.string().optional(),
      categories_tags: z.array(z.string()).optional(),
      image_front_url: z.string().optional(),
      image_front_small_url: z.string().optional(),
      conservation_conditions: z.string().optional(),
    })
    .optional(),
});

export type OffProductData = {
  name: string | null;
  brand: string | null;
  quantity: string | null;
  categories: string[];
  imageUrl: string | null;
  storageInstructions: string | null;
};

export type OffResult =
  | { kind: "found"; product: OffProductData }
  | { kind: "not_found" }
  /** Offline, timeout, throttled or upstream error: try again later, don't cache. */
  | { kind: "unavailable" };

const clean = (value: string | undefined) => value?.trim() || null;

export function mapOffResponse(body: unknown): OffResult {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return { kind: "unavailable" };
  if (parsed.data.status !== 1 || !parsed.data.product) return { kind: "not_found" };
  const p = parsed.data.product;
  // The 400 px picture is shown large on the card; the 200 px one is the fallback.
  const imageUrl = clean(p.image_front_url) ?? clean(p.image_front_small_url);
  return {
    kind: "found",
    product: {
      name: clean(p.product_name),
      brand: clean(p.brands),
      quantity: clean(p.quantity),
      categories: (p.categories_tags ?? []).slice(0, 20),
      // Only accept images served by Open Food Facts itself.
      imageUrl: imageUrl?.startsWith("https://images.openfoodfacts.org/") ? imageUrl : null,
      storageInstructions: clean(p.conservation_conditions),
    },
  };
}

let lastRequestAt = 0;
let pausedUntil = 0;

/** True while a throttling response has paused the queue. */
export const isThrottled = () => Date.now() < pausedUntil;

type Job = {
  barcode: string;
  /** Background jobs (the scheduled refresh) run only when no interactive job is waiting. */
  background: boolean;
  result: Promise<OffResult>;
  start: () => void;
};

const waiting: Job[] = [];
const jobs = new Map<string, Job>();
let draining = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(barcode: string): Promise<OffResult> {
  if (Date.now() < pausedUntil) return { kind: "unavailable" };
  const wait = lastRequestAt + minSpacingMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  try {
    const url = `${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { kind: "not_found" };
    if (response.status === 429 || response.status === 503) {
      const retryAfter = Number(response.headers.get("retry-after"));
      pausedUntil = Date.now() + (retryAfter > 0 ? retryAfter * 1000 : defaultBackoffMs);
      return { kind: "unavailable" };
    }
    if (!response.ok) return { kind: "unavailable" };
    return mapOffResponse(await response.json());
  } catch {
    return { kind: "unavailable" };
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (waiting.length > 0) {
      const next = waiting.findIndex((job) => !job.background);
      const [job] = waiting.splice(next === -1 ? 0 : next, 1);
      job.start();
      await job.result;
    }
  } finally {
    draining = false;
  }
}

/**
 * Looks up one barcode. Concurrent calls for the same barcode share one upstream request.
 * Interactive lookups go before queued background ones, so a scan never waits for the refresh.
 */
export function fetchOffProduct(
  barcode: string,
  { background = false }: { background?: boolean } = {},
): Promise<OffResult> {
  const existing = jobs.get(barcode);
  if (existing) {
    if (!background) existing.background = false;
    return existing.result;
  }
  let start!: () => void;
  const started = new Promise<void>((resolve) => (start = resolve));
  const job: Job = {
    barcode,
    background,
    start,
    result: started.then(() => request(barcode)),
  };
  jobs.set(barcode, job);
  void job.result.finally(() => jobs.delete(barcode));
  waiting.push(job);
  void drain();
  return job.result;
}
