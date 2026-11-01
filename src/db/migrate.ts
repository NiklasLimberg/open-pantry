import { databaseEnv } from "#/env.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Production migration runner. Bundled into .output/migrate by vite.migrate.config.ts
// so the image needs no drizzle-kit; development keeps using `pnpm db:migrate`.
const db = drizzle(databaseEnv().DATABASE_URL);
try {
  await migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" });
  console.log("Migrations applied.");
} finally {
  await db.$client.end();
}
