import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The layers, from the bottom: shared UI (`components`), features, the app layout, routes.
// A layer may import from the ones below it and from its own folder, never from above.

const importPattern = /(?:from|import)\s*\(?\s*["'](#\/[^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function importsOf(dir: string) {
  return sourceFiles(dir).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(importPattern)].map((match) => ({
      file,
      target: match[1],
    })),
  );
}

function forbid(dir: string, ...layers: string[]) {
  return importsOf(dir).filter(({ target }) =>
    layers.some((layer) => target.startsWith(`#/${layer}/`)),
  );
}

describe("layers", () => {
  it("shared UI does not depend on features, layout or routes", () => {
    expect(forbid("src/components", "features", "layout", "routes")).toEqual([]);
  });

  it("features do not depend on the app layout or routes", () => {
    expect(forbid("src/features", "layout", "routes")).toEqual([]);
  });

  it("the layout does not depend on routes", () => {
    expect(forbid("src/layout", "routes")).toEqual([]);
  });
});
