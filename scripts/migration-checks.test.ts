import { describe, expect, it } from "vitest";

import { findProblems, type MigrationState } from "./migration-checks.ts";

function state(
  entries: [tag: string, when: number][],
  sql: Record<string, string> = {},
): MigrationState {
  return {
    journal: { entries: entries.map(([tag, when], idx) => ({ idx, when, tag })) },
    sql: Object.fromEntries(entries.map(([tag]) => [tag, sql[tag] ?? `CREATE TABLE "${tag}" ();`])),
  };
}

const main = state([
  ["0000_init", 100],
  ["0001_share_links", 200],
]);

describe("findProblems", () => {
  it("accepts a pull request without migrations", () => {
    expect(findProblems(main, main)).toEqual([]);
  });

  it("accepts a newer additive migration", () => {
    const head = state(
      [
        ["0000_init", 100],
        ["0001_share_links", 200],
        ["0002_stock", 300],
      ],
      {
        "0002_stock":
          'ALTER TABLE "item" ADD COLUMN "note" text;--> statement-breakpoint\nALTER TABLE "item" ADD COLUMN "qty" integer DEFAULT 0 NOT NULL;',
      },
    );
    expect(findProblems(main, head)).toEqual([]);
  });

  it("rejects a migration older than one already on main, which Drizzle would skip", () => {
    const merged = state([
      ["0000_init", 100],
      ["0001_share_links", 200],
      ["0002_stock", 150],
      ["0002_other", 300],
    ]);
    // Both pull requests produced idx 2; after merging main the older one sits in front of a newer one.
    const problems = findProblems(
      state([
        ["0000_init", 100],
        ["0001_share_links", 200],
        ["0002_other", 300],
      ]),
      merged,
    );
    expect(
      problems.some((problem) => problem.includes("0002_stock") && problem.includes("not newer")),
    ).toBe(true);
  });

  it("rejects a new migration that is older than main's newest", () => {
    const head = state([
      ["0000_init", 100],
      ["0001_share_links", 200],
      ["0002_stock", 200],
    ]);
    expect(findProblems(main, head).join("\n")).toContain("0002_stock: timestamp is not newer");
    const older = state([
      ["0000_init", 100],
      ["0001_share_links", 250],
      ["0002_stock", 260],
    ]);
    expect(findProblems(main, older).join("\n")).toContain("already on main was changed");
  });

  it("rejects editing or removing a migration that is already on main", () => {
    const edited = state(
      [
        ["0000_init", 100],
        ["0001_share_links", 200],
      ],
      { "0001_share_links": "SELECT 1;" },
    );
    expect(findProblems(main, edited).join("\n")).toContain(
      "0001_share_links: SQL of a migration already on main was edited",
    );
    expect(findProblems(main, state([["0000_init", 100]])).join("\n")).toContain(
      "changed, moved or removed",
    );
  });

  it("rejects a SQL file the journal does not list", () => {
    const head = state([
      ["0000_init", 100],
      ["0001_share_links", 200],
    ]);
    head.sql["0002_forgotten"] = "SELECT 1;";
    expect(findProblems(main, head).join("\n")).toContain(
      "0002_forgotten.sql is not listed in the journal",
    );
  });

  it.each([
    ['ALTER TABLE "item" DROP COLUMN "note";', "drops"],
    ['ALTER TABLE "item" RENAME COLUMN "a" TO "b";', "renames"],
    ['ALTER TABLE "item" ALTER COLUMN "qty" SET DATA TYPE text;', "changes a column type"],
    ['DELETE FROM "item";', "removes data"],
    ['ALTER TABLE "item" ADD COLUMN "qty" integer NOT NULL;', "NOT NULL column without DEFAULT"],
  ])("flags %s", (statement, reason) => {
    const head = state(
      [
        ["0000_init", 100],
        ["0001_share_links", 200],
        ["0002_risky", 300],
      ],
      { "0002_risky": statement },
    );
    expect(findProblems(main, head).join("\n")).toContain(reason);
  });

  it("allows a risky migration that is marked deliberate", () => {
    const head = state(
      [
        ["0000_init", 100],
        ["0001_share_links", 200],
        ["0002_drop_note", 300],
      ],
      {
        "0002_drop_note":
          '-- allow-destructive: note was unused since release 4\nALTER TABLE "item" DROP COLUMN "note";',
      },
    );
    expect(findProblems(main, head)).toEqual([]);
  });
});
