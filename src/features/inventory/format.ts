import type { trackUnits } from "#/db/schema.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

// Pure display helpers shared by the inventory views. No browser or server APIs.

export type TrackUnit = (typeof trackUnits)[number];

// Read when called, never at module load: the language is only known per request.
const unitNames: Record<TrackUnit, [one: () => string, many: () => string]> = {
  pack: [() => m["global.unit.pack.one"](), () => m["global.unit.pack.other"]()],
  carton: [() => m["global.unit.carton.one"](), () => m["global.unit.carton.other"]()],
  bottle: [() => m["global.unit.bottle.one"](), () => m["global.unit.bottle.other"]()],
  loaf: [() => m["global.unit.loaf.one"](), () => m["global.unit.loaf.other"]()],
  slice: [() => m["global.unit.slice.one"](), () => m["global.unit.slice.other"]()],
  piece: [() => m["global.unit.piece.one"](), () => m["global.unit.piece.other"]()],
  gram: [() => m["global.unit.gram.one"](), () => m["global.unit.gram.other"]()],
  millilitre: [() => m["global.unit.millilitre.one"](), () => m["global.unit.millilitre.other"]()],
};

export function unitLabel(unit: TrackUnit, count: number): string {
  const [one, many] = unitNames[unit];
  return count === 1 ? one() : many();
}

/** Locale for `Intl` and `toLocale…String`: English dates read day first, as in 28 Mar 2027. */
export const dateLocale = () => (getLocale() === "de" ? "de-DE" : "en-GB");

/** A number in the current language's notation, at most two decimals: "1.5" or "1,5". */
const formatNumber = (value: number) =>
  new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value);

/** The package unit that matches a tracking unit measured in grams or millilitres. */
const measuredUnits: Partial<Record<TrackUnit, "g" | "ml">> = { gram: "g", millilitre: "ml" };

/** Remaining amount in whole packages: 4 quarters = 1 pack. */
function packagesLeft(quarters: number[]): number {
  return quarters.reduce((sum, q) => sum + q, 0) / 4;
}

const containerUnits: ReadonlySet<TrackUnit> = new Set(["pack", "carton", "bottle", "loaf"]);

/** What one package is called: its own name for containers, otherwise "pack". */
export function packageNoun(unit: TrackUnit): TrackUnit {
  return containerUnits.has(unit) ? unit : "pack";
}

export type StockSummary = {
  /** What is physically there: "2 packs · 100 g each". */
  packages: string;
  /** What is left in the tracked unit, or null when that needs details we don't have. */
  left: string | null;
  /** Shown instead of `left`, e.g. when grams are tracked but no package size is confirmed. */
  needsDetails: string | null;
};

export type SummaryInput = {
  trackUnit: TrackUnit;
  /** Confirmed size of one package, never inferred from the tracking unit. */
  packageAmount: number | null;
  packageUnit: "g" | "ml" | null;
  /** Remaining quarters of each package: 4 = Full ... 0 = Empty. */
  quarters: number[];
};

/**
 * One consistent description of a product's stock. The tracking unit only decides how the
 * remaining amount is expressed; it is never used to name the packages themselves
 * (docs/data-and-rules.md): grams and millilitres need a confirmed size in that dimension, and
 * slices and pieces need a per-package count we don't store yet.
 */
export function summarizeStock({
  trackUnit,
  packageAmount,
  packageUnit,
  quarters,
}: SummaryInput): StockSummary {
  const count = quarters.length;
  const noun = packageNoun(trackUnit);
  const size = packageAmount && packageUnit ? `${packageAmount} ${packageUnit}` : null;
  const packages = [
    `${count} ${unitLabel(noun, count)}`,
    size && (count === 1 ? size : m["stock.each"]({ size })),
  ]
    .filter(Boolean)
    .join(" · ");

  const exact = quarters.every((q) => q === 0 || q === 4);
  const about = exact ? "" : m["stock.about"]();
  const total = packagesLeft(quarters);

  if (containerUnits.has(trackUnit)) {
    // With a confirmed size the same amount is also given in grams or millilitres.
    const measured =
      packageAmount && packageUnit
        ? ` · ${about}${Math.round(total * packageAmount)} ${packageUnit}`
        : "";
    return {
      packages,
      left: `${m["stock.left"]({ about, amount: formatNumber(total), unit: unitLabel(trackUnit, total === 1 ? 1 : 2) })}${measured}`,
      needsDetails: null,
    };
  }
  const wanted = measuredUnits[trackUnit] ?? null;
  if (wanted && packageAmount && packageUnit === wanted) {
    return {
      packages,
      left: m["stock.left"]({
        about,
        amount: String(Math.round(total * packageAmount)),
        unit: wanted,
      }),
      needsDetails: null,
    };
  }
  return {
    packages,
    left: null,
    needsDetails: wanted
      ? m["stock.needsSize"]({ unit: wanted })
      : m["stock.needsCount"]({ units: unitLabel(trackUnit, 2) }),
  };
}

export type DateKind = "mhd" | "use_by" | "estimate" | "none" | "unknown";

const dateKindLabels: Record<DateKind, () => string> = {
  mhd: () => m["global.dateKind.mhd"](),
  use_by: () => m["global.dateKind.useBy"](),
  estimate: () => m["global.dateKind.estimate"](),
  none: () => m["global.dateKind.none"](),
  unknown: () => m["global.dateKind.unknown"](),
};

export type DateInfo = { text: string; warning: string | null };

/** `today` is a calendar date (YYYY-MM-DD) in the pantry's time zone. */
export function describeDate(kind: DateKind, date: string | null, today: string): DateInfo {
  const label = dateKindLabels[kind]();
  if (!date) {
    return { text: label, warning: kind === "unknown" ? m["global.dateWarning.unknown"]() : null };
  }
  const text = `${label} ${date}`;
  if (date >= today) {
    return { text, warning: null };
  }
  if (kind === "use_by") {
    return { text, warning: m["global.dateWarning.doNotUse"]() };
  }
  if (kind === "estimate") {
    return { text, warning: m["global.dateWarning.reviewEstimate"]() };
  }
  return { text, warning: m["global.dateWarning.pastMhd"]() };
}

/** Sort key for "use soon" ordering: dated first by date, undated last. */
export function dateSortKey(date: string | null): string {
  return date ?? "9999-12-31";
}

/** Calendar date of an instant in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
