import { describe, expect, it } from "vitest";

import { parseTypedDate } from "./parse-date.ts";

const today = "2026-10-28";
const iso = (text: string) => parseTypedDate(text, today)?.iso ?? null;

describe("parseTypedDate", () => {
  it("takes a day and month as the next time it comes round", () => {
    expect(iso("2803")).toBe("2027-03-28");
    expect(iso("28.12")).toBe("2026-12-28");
    expect(iso("28.10")).toBe("2026-10-28");
    expect(iso("27.10")).toBe("2027-10-27");
  });

  it("takes exact dates with two- or four-digit years", () => {
    expect(iso("28.03.27")).toBe("2027-03-28");
    expect(iso("28/03/2027")).toBe("2027-03-28");
    expect(iso("28032027")).toBe("2027-03-28");
    expect(iso("280327")).toBe("2027-03-28");
    expect(iso("2027-03-28")).toBe("2027-03-28");
  });

  it("treats a month and year as the last day of that month", () => {
    expect(parseTypedDate("03.27", today)).toEqual({ iso: "2027-03-31", monthOnly: true });
    expect(iso("02/2028")).toBe("2028-02-29");
    expect(iso("02.2027")).toBe("2027-02-28");
  });

  it("rejects what cannot be a date", () => {
    expect(iso("")).toBeNull();
    expect(iso("3103.27")).toBeNull();
    expect(iso("31.02.27")).toBeNull();
    expect(iso("3102")).toBeNull();
    expect(iso("0327")).toBeNull();
    expect(iso("13.2027")).toBeNull();
    expect(iso("abc")).toBeNull();
    expect(iso("12345")).toBeNull();
  });
});
