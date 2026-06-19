#!/usr/bin/env bash
set -euo pipefail

email_pattern="${1:-qa+mobile-%@example.com}"

pnpm -F @acme/nextjs with-env node - "$email_pattern" <<'NODE'
const pattern = process.argv[2];

if (
  !pattern.startsWith("qa+mobile-") &&
  process.env.RASTRO_ALLOW_NON_QA_AUTH_CLEANUP !== "1"
) {
  console.error(
    "Refusing to delete auth members outside the qa+mobile- email pattern. Set RASTRO_ALLOW_NON_QA_AUTH_CLEANUP=1 to override.",
  );
  process.exit(2);
}

async function main() {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    const result = await pool.query(
      'delete from "user" where email like $1',
      [pattern],
    );
    console.log(
      `Deleted ${result.rowCount} QA auth member(s) matching ${pattern}.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
