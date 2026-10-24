import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

import { Client } from "pg";

import { findProblems, type Journal, type MigrationState } from "./migration-checks.ts";

const folder = process.env.MIGRATIONS_FOLDER ?? "drizzle";

function readHead(): MigrationState {
  const journal: Journal = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, "utf8"));
  const sql: Record<string, string> = {};
  for (const file of readdirSync(folder).filter((name) => name.endsWith(".sql"))) {
    sql[file.replace(/\.sql$/, "")] = readFileSync(`${folder}/${file}`, "utf8");
  }
  return { journal, sql };
}

function readBase(ref: string): MigrationState {
  const show = (path: string) =>
    execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8" });
  const journal: Journal = JSON.parse(show("drizzle/meta/_journal.json"));
  const sql = Object.fromEntries(
    journal.entries.map(({ tag }) => [tag, show(`drizzle/${tag}.sql`)]),
  );
  return { journal, sql };
}

const mode = process.argv[2] ?? "history";

if (mode === "history") {
  // Compares the pull request (merged onto main by CI) with main.
  const ref = process.env.MIGRATIONS_BASE ?? "origin/main";
  const problems = findProblems(readBase(ref), readHead());
  for (const problem of problems) console.error(`::error::${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`Migration history is consistent with ${ref}.`);
} else if (mode === "applied") {
  // After migrating, every journal entry must be recorded; a skipped migration leaves a gap.
  const expected = readHead().journal.entries.length;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(
    "select count(*)::int as count from drizzle.__drizzle_migrations",
  );
  await client.end();
  if (rows[0].count !== expected) {
    console.error(
      `::error::${rows[0].count} of ${expected} migrations were applied; some were skipped`,
    );
    process.exit(1);
  }
  console.log(`All ${expected} migrations applied.`);
} else {
  console.error(`Unknown mode "${mode}"; use "history" or "applied".`);
  process.exit(2);
}
