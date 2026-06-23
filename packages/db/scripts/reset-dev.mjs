import pg from "pg";

const { Client } = pg;

const connectionString = process.env.POSTGRES_URL?.replace(":6543", ":5432");

if (!connectionString) {
  throw new Error("Missing POSTGRES_URL.");
}

const url = new URL(connectionString);
const databaseName = url.pathname.slice(1);
const environmentName = [
  process.env.VERCEL_ENV,
  process.env.NODE_ENV,
  process.env.RASTRO_ENV,
]
  .filter(Boolean)
  .join(" ");
const targetDescription = `${url.hostname}/${databaseName} ${environmentName}`;

if (/prod|production/i.test(targetDescription)) {
  throw new Error(
    `Refusing to reset a production-like database target: ${url.hostname}/${databaseName}.`,
  );
}

if (!["development", "dev", "test", ""].includes(process.env.NODE_ENV ?? "")) {
  throw new Error(
    `Refusing to reset when NODE_ENV=${process.env.NODE_ENV}. Use a development env file.`,
  );
}

if (!databaseName || !/^rastro([_-](dev|test|local))?$/.test(databaseName)) {
  throw new Error(
    `Refusing to reset unexpected database "${databaseName}". Expected rastro, rastro_dev, rastro-test, or rastro_local.`,
  );
}

const client = new Client({ connectionString });

try {
  console.log(
    `Resetting development database schema at ${url.hostname}:${url.port || "5432"}/${databaseName}.`,
  );
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await client.query("CREATE SCHEMA public");
  await client.query("GRANT ALL ON SCHEMA public TO public");
  console.log("Development database schema reset complete.");
} finally {
  await client.end();
}
