import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { databaseEnv } from "#/env.ts";

// Tests that need a database of their own (empty, or counting every row) create one per test file
// next to the configured one, migrate it, and drop it afterwards. The app's `db` binds to
// DATABASE_URL when its module loads, so point that variable at `url` first and import the code
// under test afterwards:
//
//   const database = await createTestDatabase();
//   vi.stubEnv("DATABASE_URL", database.url);
//   const { db } = await import("#/db/index.ts");
//   afterAll(async () => { await db.$client.end(); await database.drop(); });

function withDatabase(url: string, name: string) {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.href;
}

export async function createTestDatabase() {
  const base = databaseEnv().DATABASE_URL;
  const name = `open_pantry_test_${crypto.randomUUID().replaceAll("-", "")}`;

  const admin = new Client({ connectionString: withDatabase(base, "postgres") });
  await admin.connect();
  try {
    await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }

  const url = withDatabase(base, name);
  const db = drizzle(url);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await db.$client.end();
  }

  return {
    url,
    /** Close the app's connections to the database first, or this waits for them. */
    async drop() {
      const client = new Client({ connectionString: withDatabase(base, "postgres") });
      await client.connect();
      try {
        await client.query(`drop database if exists "${name}" with (force)`);
      } finally {
        await client.end();
      }
    },
  };
}
