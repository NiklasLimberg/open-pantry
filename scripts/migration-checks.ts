type JournalEntry = { idx: number; when: number; tag: string };
export type Journal = { entries: JournalEntry[] };

export type MigrationState = {
  journal: Journal;
  /** SQL text of every .sql file in drizzle/, by tag. */
  sql: Record<string, string>;
};

// Drizzle runs a migration only when its `when` is newer than the newest one already applied,
// so an out-of-order or edited migration is skipped silently. These checks make that loud.
// `base` is main; `head` is the pull request merged onto it.
export function findProblems(base: MigrationState, head: MigrationState): string[] {
  const problems: string[] = [];
  const baseEntries = base.journal.entries;
  const headEntries = head.journal.entries;

  headEntries.forEach((entry, position) => {
    if (entry.idx !== position) {
      problems.push(`${entry.tag}: idx ${entry.idx} should be ${position}`);
    }
    if (!(entry.tag in head.sql)) {
      problems.push(`${entry.tag}: listed in the journal but has no .sql file`);
    }
    const previous = headEntries[position - 1];
    if (previous && entry.when <= previous.when) {
      problems.push(`${entry.tag}: timestamp is not newer than ${previous.tag}`);
    }
  });
  const listed = new Set(headEntries.map((entry) => entry.tag));
  for (const tag of Object.keys(head.sql)) {
    if (!listed.has(tag)) {
      problems.push(`${tag}.sql is not listed in the journal and would never run`);
    }
  }

  // Migrations already on main may be running in production: they must stay byte-for-byte as they are.
  baseEntries.forEach((entry, position) => {
    const current = headEntries[position];
    if (!current || current.tag !== entry.tag || current.when !== entry.when) {
      problems.push(`${entry.tag}: a migration already on main was changed, moved or removed`);
    } else if (head.sql[entry.tag] !== base.sql[entry.tag]) {
      problems.push(`${entry.tag}: SQL of a migration already on main was edited`);
    }
  });

  const newest = Math.max(0, ...baseEntries.map((entry) => entry.when));
  const added = headEntries.filter(
    (entry) => !baseEntries.some((known) => known.tag === entry.tag),
  );
  for (const entry of added) {
    if (entry.when <= newest) {
      problems.push(
        `${entry.tag}: timestamp is older than a migration already on main, so Drizzle would skip it. ` +
          `Merge main into your branch, delete this migration and run pnpm db:generate again`,
      );
    }
    problems.push(...findRiskyStatements(entry.tag, head.sql[entry.tag] ?? ""));
  }
  return problems;
}

const risky: [RegExp, string][] = [
  [
    /\bDROP\s+(TABLE|COLUMN|SCHEMA|TYPE|INDEX|CONSTRAINT)\b/i,
    "drops something the previous release may still use",
  ],
  [/\bRENAME\b/i, "renames something the previous release may still use"],
  [/\bALTER\s+COLUMN\b[^;]*\b(SET\s+DATA\s+)?TYPE\b/i, "changes a column type"],
  [/\b(TRUNCATE|DELETE\s+FROM)\b/i, "removes data"],
];

// Migrations must work with the previous release still running and with data already in the tables.
// Deliberate exceptions carry a `-- allow-destructive: <reason>` comment in the SQL file.
function findRiskyStatements(tag: string, sql: string): string[] {
  if (/--\s*allow-destructive\b/i.test(sql)) {
    return [];
  }
  const problems: string[] = [];
  for (const statement of sql.split("--> statement-breakpoint")) {
    for (const [pattern, why] of risky) {
      if (pattern.test(statement)) {
        problems.push(`${tag}: ${firstLine(statement)} ${why}`);
      }
    }
    if (
      /\bADD\s+COLUMN\b/i.test(statement) &&
      /\bNOT\s+NULL\b/i.test(statement) &&
      !/\bDEFAULT\b/i.test(statement)
    ) {
      problems.push(
        `${tag}: ${firstLine(statement)} adds a NOT NULL column without DEFAULT, which fails once the table has rows`,
      );
    }
  }
  if (problems.length > 0) {
    problems.push(
      `${tag}: if this is intended, add a "-- allow-destructive: <reason>" comment to the SQL file`,
    );
  }
  return problems;
}

function firstLine(statement: string): string {
  const line =
    statement
      .trim()
      .split("\n")
      .find((text) => !text.startsWith("--")) ?? "";
  return `"${line.slice(0, 80)}"`;
}
