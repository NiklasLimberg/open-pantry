import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env.local");

export const db = drizzle(url, { schema });

export type Database = typeof db;
/** What `db.transaction` hands its callback; queries run on it like on `db`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
