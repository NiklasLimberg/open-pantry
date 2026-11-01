import { z } from "zod";

import { serverEnv } from "#/env.ts";
import { locales } from "#/paraglide/runtime.js";

// Server-only client for the Open Food Facts product API. The public API is limited to 15 product
// reads per minute per IP and bans abusers, so every request in this process goes through one
// queue with fixed spacing, duplicate lookups share a single request, and throttling responses
// pause the queue. Never call it from search-as-you-type or from the browser.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

/** 15 reads/min is the limit; 5 s spacing keeps us at 12 and leaves room for the manual lookups. */
const minSpacingMs = 5_000;
const timeoutMs = 8_000;
const defaultBackoffMs = 60_000;
/**
 * Lookups waiting for their turn. At 5 s each, a longer line outlasts the app's 10 s wait for an
 * answer, so further lookups are told "unavailable" at once instead of piling up.
 */
const maxWaiting = 5;

// No `fields` filter: names in other languages are separate keys (product_name_de, …), and listing
// every language Open Food Facts has (~190) makes the URL longer than the API's proxy accepts (it answers 502). The full
// product is about 12 kB compressed, and the queue below keeps requests to a dozen a minute.

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
    // The per-language names (product_name_de, …) are read by key below.
    .catchall(z.unknown())
    .optional(),
});

type OffProductData = {
  name: string | null;
  /** Name per language, two-letter code → text; only languages with a name. */
  names: Record<string, string>;
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

/** `product_name_<code>` for the app's languages (messages/*.json); others are dropped. */
function localizedNames(product: Record<string, unknown>) {
  const names: Record<string, string> = {};
  for (const code of locales) {
    const value = product[`product_name_${code}`];
    const name = typeof value === "string" ? clean(value) : null;
    if (name) {
      names[code] = name;
    }
  }
  return names;
}

function mapOffResponse(body: unknown): OffResult {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: "unavailable" };
  }
  if (parsed.data.status !== 1 || !parsed.data.product) {
    return { kind: "not_found" };
  }
  const p = parsed.data.product;
  // The 400 px picture is shown large on the card; the 200 px one is the fallback.
  const imageUrl = clean(p.image_front_url) ?? clean(p.image_front_small_url);
  return {
    kind: "found",
    product: {
      name: clean(p.product_name),
      names: localizedNames(p),
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
  if (Date.now() < pausedUntil) {
    return { kind: "unavailable" };
  }
  const wait = lastRequestAt + minSpacingMs - Date.now();
  if (wait > 0) {
    await sleep(wait);
  }
  lastRequestAt = Date.now();

  const { OFF_BASE_URL, OFF_CONTACT } = serverEnv();
  try {
    const url = `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": `OpenPantry/0.1 (${OFF_CONTACT})`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) {
      return { kind: "not_found" };
    }
    if (response.status === 429 || response.status === 503) {
      const retryAfter = Number(response.headers.get("retry-after"));
      pausedUntil = Date.now() + (retryAfter > 0 ? retryAfter * 1000 : defaultBackoffMs);
      return { kind: "unavailable" };
    }
    if (!response.ok) {
      return { kind: "unavailable" };
    }
    return mapOffResponse(await response.json());
  } catch (error) {
    // Offline and timeouts are expected; the log tells them apart from a broken request.
    console.warn(`Open Food Facts lookup for ${barcode} failed`, error);
    return { kind: "unavailable" };
  }
}

async function drain() {
  if (draining) {
    return;
  }
  draining = true;
  try {
    while (waiting.length > 0) {
      const next = waiting.findIndex((job) => !job.background);
      const [job] = waiting.splice(next === -1 ? 0 : next, 1);
      job.start();
      // Jobs run one at a time, spaced out by `request`.
      // oxlint-disable-next-line no-await-in-loop
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
    if (!background) {
      existing.background = false;
    }
    return existing.result;
  }
  if (waiting.length >= maxWaiting) {
    return Promise.resolve({ kind: "unavailable" });
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
