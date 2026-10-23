import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Production migration runner. Bundled into .output/migrate by vite.migrate.config.ts
// so the image needs no drizzle-kit; development keeps using `pnpm db:migrate`.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = drizzle(url);
try {
  await migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" });
  console.log("Migrations applied.");
} finally {
  await db.$client.end();
}
