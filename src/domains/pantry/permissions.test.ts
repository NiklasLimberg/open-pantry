import { describe, expect, it } from "vitest";
import { roleCan } from "./permissions";

describe("roleCan", () => {
  it("lets every role read the pantry", () => {
    for (const role of ["owner", "editor", "viewer"]) {
      expect(roleCan(role, { inventory: ["read"], rule: ["read"], shopping: ["read"] })).toBe(true);
    }
  });

  it("lets owners and editors change contents, but not viewers", () => {
    const change = { inventory: ["update"], shopping: ["confirm-purchase"] } satisfies Parameters<
      typeof roleCan
    >[1];
    expect(roleCan("owner", change)).toBe(true);
    expect(roleCan("editor", change)).toBe(true);
    expect(roleCan("viewer", change)).toBe(false);
  });

  it("reserves members and pantry deletion for owners", () => {
    for (const permissions of [{ member: ["create"] }, { organization: ["delete"] }] as const) {
      expect(roleCan("owner", permissions)).toBe(true);
      expect(roleCan("editor", permissions)).toBe(false);
      expect(roleCan("viewer", permissions)).toBe(false);
    }
  });

  it("denies unknown roles", () => {
    expect(roleCan("member", { inventory: ["read"] })).toBe(false);
  });
});
