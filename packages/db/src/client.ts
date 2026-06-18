import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

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

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
});
