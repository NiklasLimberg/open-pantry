import { afterEach, describe, expect, it, vi } from "vitest";

import { databaseEnv, serverEnv } from "./env.ts";

const complete = {
  DATABASE_URL: "postgresql://pantry:pantry@localhost:5432/open_pantry",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  OFF_CONTACT: "me@example.com",
};

afterEach(() => vi.unstubAllEnvs());

function stub(values: Record<string, string | undefined>) {
  for (const key of Object.keys(complete)) {
    vi.stubEnv(key, undefined);
  }
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value);
  }
}

describe("serverEnv", () => {
  it("accepts a complete environment and fills the Open Food Facts default", () => {
    stub(complete);
    expect(serverEnv().OFF_BASE_URL).toBe("https://world.openfoodfacts.org");
  });

  it.each(["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "OFF_CONTACT"])(
    "names %s when it is missing",
    (name) => {
      stub({ ...complete, [name]: undefined });
      expect(() => serverEnv()).toThrow(name);
    },
  );

  it("rejects a secret that is too short", () => {
    stub({ ...complete, BETTER_AUTH_SECRET: "short" });
    expect(() => serverEnv()).toThrow("BETTER_AUTH_SECRET");
  });
});

describe("databaseEnv", () => {
  it("needs only the database", () => {
    stub({ DATABASE_URL: complete.DATABASE_URL });
    expect(databaseEnv().DATABASE_URL).toBe(complete.DATABASE_URL);
  });
});
