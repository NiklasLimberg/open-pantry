import { drizzle } from "drizzle-orm/node-postgres";

import { databaseEnv } from "#/env.ts";
import * as schema from "./schema.ts";

export const db = drizzle(databaseEnv().DATABASE_URL, { schema });

export type Database = typeof db;
/** What `db.transaction` hands its callback; queries run on it like on `db`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
