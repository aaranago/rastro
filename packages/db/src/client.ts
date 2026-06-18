import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("Missing POSTGRES_URL");
}

const globalForPg = globalThis as typeof globalThis & {
  rastroPgPool?: Pool;
};

export const pool = globalForPg.rastroPgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForPg.rastroPgPool = pool;
}

export const db: Database = drizzle(pool, {
  schema,
  casing: "snake_case",
});
