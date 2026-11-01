import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { m } from "#/paraglide/messages.js";
import { createTestDatabase } from "#/test/database.ts";

vi.mock("@tanstack/react-start/server", () => ({ setResponseStatus: () => {} }));

// Runs against a database of its own (see src/test/database.ts).
const database = await createTestDatabase();
vi.stubEnv("DATABASE_URL", database.url);
const { db } = await import("#/db/index.ts");
const { member, organization, user } = await import("#/db/schema.ts");
const { getFirstPantryId, getMemberAccess, requirePermission } = await import("./pantry-access.ts");

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute));

beforeAll(async () => {
  await db.insert(user).values(
    ["owner", "editor", "viewer", "stranger"].map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
    })),
  );
  await db.insert(organization).values([
    { id: "home", name: "Home", slug: "home", createdAt: at(0), timeZone: "Europe/Berlin" },
    { id: "cabin", name: "Cabin", slug: "cabin", createdAt: at(0), timeZone: "America/Denver" },
  ]);
  await db.insert(member).values([
    { id: "m1", organizationId: "home", userId: "owner", role: "owner", createdAt: at(1) },
    { id: "m2", organizationId: "home", userId: "editor", role: "editor", createdAt: at(2) },
    { id: "m3", organizationId: "home", userId: "viewer", role: "viewer", createdAt: at(3) },
    // Joined the cabin first, the home later: the first pantry is the cabin.
    { id: "m4", organizationId: "cabin", userId: "stranger", role: "editor", createdAt: at(1) },
    { id: "m5", organizationId: "home", userId: "stranger", role: "nonsense", createdAt: at(2) },
  ]);
});

afterAll(async () => {
  await db.$client.end();
  await database.drop();
});

describe("getMemberAccess", () => {
  it("resolves the member's role and the pantry's details", async () => {
    expect(await getMemberAccess("editor", "home")).toEqual({
      pantryId: "home",
      pantryName: "Home",
      timeZone: "Europe/Berlin",
      role: "editor",
      userId: "editor",
    });
  });

  it("refuses someone who is not a member of that pantry", async () => {
    await expect(getMemberAccess("owner", "cabin")).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("refuses an unknown user", async () => {
    await expect(getMemberAccess("nobody", "home")).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("refuses a role it does not know", async () => {
    await expect(getMemberAccess("stranger", "home")).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });
});

describe("getFirstPantryId", () => {
  it("returns the pantry the user joined first", async () => {
    expect(await getFirstPantryId("stranger")).toBe("cabin");
  });

  it("returns null for a user without a pantry", async () => {
    expect(await getFirstPantryId("nobody")).toBeNull();
  });
});

describe("requirePermission", () => {
  const access = (userId: string) => getMemberAccess(userId, "home");
  const denied = m["error.noAccess"]();

  it("lets an editor change the inventory but not run the product sync", async () => {
    const editor = await access("editor");
    expect(() => requirePermission(editor, { inventory: ["create", "update"] })).not.toThrow();
    expect(() => requirePermission(editor, { productSync: ["run"] })).toThrow(denied);
  });

  it("lets a viewer read but not change", async () => {
    const viewer = await access("viewer");
    expect(() => requirePermission(viewer, { inventory: ["read"] })).not.toThrow();
    expect(() => requirePermission(viewer, { inventory: ["create"] })).toThrow(denied);
    expect(() => requirePermission(viewer, { inventory: ["delete"] })).toThrow(denied);
  });

  it("lets the owner run the product sync", async () => {
    const owner = await access("owner");
    expect(() => requirePermission(owner, { productSync: ["read", "run"] })).not.toThrow();
  });

  it("answers with the access-denied error", async () => {
    const viewer = await access("viewer");
    expect(() => requirePermission(viewer, { inventory: ["create"] })).toThrow(
      expect.objectContaining({ name: "ForbiddenError" }),
    );
  });
});
