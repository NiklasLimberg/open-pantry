import { afterEach, describe, expect, it } from "vitest";

import { overwriteGetLocale } from "#/paraglide/runtime.js";

import { describeDate, summarizeStock, todayIn, unitLabel } from "./format.ts";

describe("describeDate", () => {
  const today = "2026-10-23";

  it("keeps the date kinds distinct", () => {
    expect(describeDate("mhd", "2026-11-01", today).text).toBe("MHD 2026-11-01");
    expect(describeDate("use_by", "2026-11-01", today).text).toBe("Verbrauchsdatum 2026-11-01");
  });

  it("flags a past Verbrauchsdatum as unusable and a past MHD as review", () => {
    expect(describeDate("use_by", "2026-10-22", today).warning).toBe("Do not use");
    expect(describeDate("mhd", "2026-10-22", today).warning).toBe("Past MHD: review");
    expect(describeDate("estimate", "2026-10-22", today).warning).toBe("Review estimate");
  });

  it("warns about unknown dates but not about missing printed dates", () => {
    expect(describeDate("unknown", null, today).warning).toBe("Unknown date");
    expect(describeDate("none", null, today).warning).toBeNull();
  });

  it("treats today as still valid", () => {
    expect(describeDate("use_by", today, today).warning).toBeNull();
  });
});

describe("todayIn", () => {
  it("uses the calendar date in the given zone", () => {
    const instant = new Date("2026-10-23T22:30:00Z");
    expect(todayIn("Europe/Berlin", instant)).toBe("2026-10-24");
    expect(todayIn("UTC", instant)).toBe("2026-10-23");
  });
});

describe("unitLabel", () => {
  it("pluralises", () => {
    expect(unitLabel("loaf", 2)).toBe("loaves");
    expect(unitLabel("carton", 1)).toBe("carton");
  });
});

describe("summarizeStock", () => {
  const milka = { packageAmount: 100, packageUnit: "g" as const };

  it("names packages as packs and shows the size when grams are tracked", () => {
    expect(summarizeStock({ trackUnit: "gram", ...milka, quarters: [4] })).toEqual({
      packages: "1 pack · 100 g",
      left: "100 g left",
      needsDetails: null,
    });
  });

  it("gives packs and the amount in grams together when a size is known", () => {
    expect(summarizeStock({ trackUnit: "pack", ...milka, quarters: [4] }).left).toBe(
      "1 pack left · 100 g",
    );
  });

  it("converts partial packages to an approximate amount", () => {
    expect(summarizeStock({ trackUnit: "gram", ...milka, quarters: [4, 2] }).left).toBe(
      "about 150 g left",
    );
  });

  it("states the size of each pack when there are several", () => {
    expect(summarizeStock({ trackUnit: "pack", ...milka, quarters: [4, 4] }).packages).toBe(
      "2 packs · 100 g each",
    );
  });

  it("counts container units in their own name", () => {
    expect(
      summarizeStock({
        trackUnit: "carton",
        packageAmount: 1000,
        packageUnit: "ml",
        quarters: [4, 2],
      }),
    ).toEqual({
      packages: "2 cartons · 1000 ml each",
      left: "about 1.5 cartons left · about 1500 ml",
      needsDetails: null,
    });
    expect(
      summarizeStock({ trackUnit: "carton", packageAmount: null, packageUnit: null, quarters: [4] })
        .left,
    ).toBe("1 carton left");
  });

  it("asks for a size instead of inventing a conversion", () => {
    const summary = summarizeStock({
      trackUnit: "gram",
      packageAmount: null,
      packageUnit: null,
      quarters: [4],
    });
    expect(summary.left).toBeNull();
    expect(summary.needsDetails).toMatch(/package size in g/);
  });

  it("does not mix grams and millilitres", () => {
    const summary = summarizeStock({
      trackUnit: "gram",
      packageAmount: 500,
      packageUnit: "ml",
      quarters: [4],
    });
    expect(summary.left).toBeNull();
  });

  it("needs a count per pack for slices", () => {
    const summary = summarizeStock({ trackUnit: "slice", ...milka, quarters: [4] });
    expect(summary.packages).toBe("1 pack · 100 g");
    expect(summary.needsDetails).toMatch(/slices per pack/);
  });
});

describe("in German", () => {
  afterEach(() => overwriteGetLocale(() => "en"));

  it("uses German words and decimal commas", () => {
    overwriteGetLocale(() => "de");
    expect(unitLabel("loaf", 2)).toBe("Laibe");
    expect(describeDate("use_by", "2026-10-22", "2026-10-23").warning).toBe("Nicht verwenden");
    expect(
      summarizeStock({ trackUnit: "pack", packageAmount: 100, packageUnit: "g", quarters: [4, 2] })
        .left,
    ).toBe("ca. 1,5 Packungen übrig · ca. 150 g");
  });
});
