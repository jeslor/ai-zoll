import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { readDependencyNames, readPackageJson } from "../read-package-json";

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

describe("readPackageJson", () => {
  it("parses a valid package.json", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "acme" }) });
    expect(readPackageJson(dir)).toEqual({ name: "acme" });
  });

  it("returns null when the file doesn't exist", () => {
    expect(readPackageJson(seed({}))).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    expect(readPackageJson(seed({ "package.json": "{ nope" }))).toBeNull();
  });
});

describe("readDependencyNames", () => {
  it("merges dependencies and devDependencies", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        dependencies: { react: "^18.0.0" },
        devDependencies: { vitest: "^4.0.0" },
      }),
    });

    expect(readDependencyNames(dir)).toEqual(new Set(["react", "vitest"]));
  });

  it("returns an empty set when there's no package.json", () => {
    expect(readDependencyNames(seed({}))).toEqual(new Set());
  });
});
