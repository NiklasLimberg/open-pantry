import { describe, expect, it } from "vitest";

import { localizedName } from "./languages.ts";

describe("localizedName", () => {
  const names = { de: "Haferflocken", en: "Oats" };

  it("uses the name in the requested language", () => {
    expect(localizedName(names, "de", "Fallback")).toBe("Haferflocken");
  });

  it("falls back to the default name when the language has none", () => {
    expect(localizedName({ de: "Haferflocken" }, "en", "Oats")).toBe("Oats");
    expect(localizedName({}, "de", null)).toBeNull();
  });
});
