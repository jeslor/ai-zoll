import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readPhpDependencyNames } from "../php";

let tempDirs: string[] = [];
beforeEach(() => {
  tempDirs = [];
});
afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("readPhpDependencyNames", () => {
  it("extracts require/require-dev keys, excluding php and ext-* platform entries", () => {
    const dir = seed({
      "composer.json": JSON.stringify({
        require: { php: "^8.1", "ext-pdo": "*", "laravel/framework": "^10.0" },
        "require-dev": { "phpunit/phpunit": "^10.0" },
      }),
    });

    const names = readPhpDependencyNames(dir);

    expect(names).toEqual(new Set(["laravel/framework", "phpunit/phpunit"]));
  });

  it("returns an empty set when no composer.json exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readPhpDependencyNames(dir)).toEqual(new Set());
  });

  it("returns an empty set for malformed JSON rather than throwing", () => {
    const dir = seed({ "composer.json": "{ not valid json" });
    expect(readPhpDependencyNames(dir)).toEqual(new Set());
  });
});
