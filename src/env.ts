import { z } from "zod";

// Server only; never import it from client code. The values are read when called, not when the
// module loads, so importing it does not require every variable (the migration runner and the
// tests need only the database). `server.ts` calls `serverEnv()` at startup so a missing or
// malformed value stops the app there, with a message naming it.

const database = z.object({ DATABASE_URL: z.url() });

const server = database.extend({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  OFF_BASE_URL: z.url().default("https://world.openfoodfacts.org"),
  /** Open Food Facts asks API users to identify themselves in the User-Agent. */
  OFF_CONTACT: z.email(),
});

export const databaseEnv = () => database.parse(process.env);
export const serverEnv = () => server.parse(process.env);
