import type { trackUnits } from "#/db/schema.ts";

// Pure display helpers shared by the inventory views. No browser or server APIs.

export type TrackUnit = (typeof trackUnits)[number];

const unitNames: Record<TrackUnit, [one: string, many: string]> = {
  pack: ["pack", "packs"],
  carton: ["carton", "cartons"],
  bottle: ["bottle", "bottles"],
  loaf: ["loaf", "loaves"],
  slice: ["slice", "slices"],
  piece: ["piece", "pieces"],
  gram: ["g", "g"],
  millilitre: ["ml", "ml"],
};

export function unitLabel(unit: TrackUnit, count: number): string {
  const [one, many] = unitNames[unit];
  return count === 1 ? one : many;
}

export const quarterLabels = ["Empty", "¼", "½", "¾", "Full"] as const;

/** Remaining amount in whole packages: 4 quarters = 1 pack. */
export function packagesLeft(quarters: number[]): number {
  return quarters.reduce((sum, q) => sum + q, 0) / 4;
}

/** "2", "about 1.5": exact only when every package is full or empty. */
export function formatPackagesLeft(quarters: number[]): string {
  const total = packagesLeft(quarters);
  const exact = quarters.every((q) => q === 0 || q === 4);
  return `${exact ? "" : "about "}${Number.isInteger(total) ? total : total.toFixed(2).replace(/0$/, "")}`;
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

const trimNumber = (value: number) => String(Number(value.toFixed(2)));

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
    size && (count === 1 ? size : `${size} each`),
  ]
    .filter(Boolean)
    .join(" · ");

  const exact = quarters.every((q) => q === 0 || q === 4);
  const about = exact ? "" : "about ";
  const total = packagesLeft(quarters);

  if (containerUnits.has(trackUnit)) {
    // With a confirmed size the same amount is also given in grams or millilitres.
    const measured =
      packageAmount && packageUnit
        ? ` · ${about}${Math.round(total * packageAmount)} ${packageUnit}`
        : "";
    return {
      packages,
      left: `${about}${trimNumber(total)} ${unitLabel(trackUnit, total === 1 ? 1 : 2)} left${measured}`,
      needsDetails: null,
    };
  }
  const wanted = trackUnit === "gram" ? "g" : trackUnit === "millilitre" ? "ml" : null;
  if (wanted && packageAmount && packageUnit === wanted) {
    return {
      packages,
      left: `${about}${Math.round(total * packageAmount)} ${wanted} left`,
      needsDetails: null,
    };
  }
  return {
    packages,
    left: null,
    needsDetails: wanted
      ? `Needs a package size in ${wanted} to show ${wanted} left`
      : `Needs the number of ${unitLabel(trackUnit, 2)} per pack`,
  };
}

export type DateKind = "mhd" | "use_by" | "estimate" | "none" | "unknown";

const dateKindLabels: Record<DateKind, string> = {
  mhd: "MHD",
  use_by: "Verbrauchsdatum",
  estimate: "Estimated reminder",
  none: "No printed date",
  unknown: "Date not entered",
};

export type DateInfo = { text: string; warning: string | null };

/** `today` is a calendar date (YYYY-MM-DD) in the pantry's time zone. */
export function describeDate(kind: DateKind, date: string | null, today: string): DateInfo {
  const label = dateKindLabels[kind];
  if (!date) return { text: label, warning: kind === "unknown" ? "Unknown date" : null };
  const text = `${label} ${date}`;
  if (date >= today) return { text, warning: null };
  if (kind === "use_by") return { text, warning: "Do not use" };
  if (kind === "estimate") return { text, warning: "Review estimate" };
  return { text, warning: "Past MHD: review" };
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
