import { afterAll, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "#/test/database.ts";

vi.mock("@tanstack/react-start/server", () => ({
  setResponseStatus: () => {},
  getRequest: () => new Request("http://localhost:3000"),
  getRequestHeaders: () => new Headers(),
}));

// Runs against an empty database of its own (see src/test/database.ts): the gate looks at every
// account and pantry, so it cannot share one with other tests.
const database = await createTestDatabase();
vi.stubEnv("DATABASE_URL", database.url);
vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
vi.stubEnv("OFF_CONTACT", "me@example.com");
const { db } = await import("#/db/index.ts");
const { member, organization, user } = await import("#/db/schema.ts");
const { auth } = await import("./auth.ts");

afterAll(async () => {
  await db.$client.end();
  await database.drop();
});

const signUp = (name: string) =>
  auth.api.signUpEmail({
    body: { name, email: `${name}@example.com`, password: "correct horse battery" },
  });

describe("sign-up", () => {
  it("lets two sign-ups at the same moment through the gate, but keeps only one account", async () => {
    const results = await Promise.allSettled([signUp("ann"), signUp("bob")]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await db.select().from(user)).toHaveLength(1);
    expect(await db.select().from(organization)).toHaveLength(1);
    const members = await db.select().from(member);
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("owner");
  });

  it("refuses everyone after the first account", async () => {
    await expect(signUp("late")).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect(await db.select().from(user)).toHaveLength(1);
  });
});
