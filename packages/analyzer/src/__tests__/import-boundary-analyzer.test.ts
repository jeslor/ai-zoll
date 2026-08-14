import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeImportBoundaries } from "../import-boundary-analyzer";

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

describe("analyzeImportBoundaries", () => {
  it("detects a domain file importing from infrastructure (a real Dependency Rule violation)", () => {
    const dir = seed({
      "src/domain/user.ts": 'import { db } from "../infrastructure/db";\nexport class User {}',
      "src/infrastructure/db.ts": "export const db = {};",
    });

    const violations = analyzeImportBoundaries(dir, "clean-architecture");

    expect(violations).toEqual([
      { file: "domain/user.ts", importedFile: "infrastructure/db", fromLayer: "domain", toLayer: "infrastructure" },
    ]);
  });

  it("does not flag the allowed direction — infrastructure importing from domain", () => {
    const dir = seed({
      "src/domain/user.ts": "export class User {}",
      "src/infrastructure/db.ts": 'import { User } from "../domain/user";\nexport const db = {};',
    });

    expect(analyzeImportBoundaries(dir, "clean-architecture")).toEqual([]);
  });

  it("returns [] for architecture styles that don't use the Dependency Rule (modular)", () => {
    const dir = seed({
      "src/domain/user.ts": 'import { db } from "../infrastructure/db";\nexport class User {}',
      "src/infrastructure/db.ts": "export const db = {};",
    });

    expect(analyzeImportBoundaries(dir, "modular")).toEqual([]);
  });

  it("returns [] when the repo has no inner-layer directory at all", () => {
    const dir = seed({
      "src/infrastructure/db.ts": "export const db = {};",
      "src/utils/helpers.ts": "export function helper() {}",
    });

    expect(analyzeImportBoundaries(dir, "layered")).toEqual([]);
  });

  it("returns [] when the repo has no outer-layer directory at all", () => {
    const dir = seed({
      "src/domain/user.ts": "export class User {}",
    });

    expect(analyzeImportBoundaries(dir, "layered")).toEqual([]);
  });

  it("detects violations via CommonJS require() and side-effect imports too", () => {
    const dir = seed({
      "src/domain/a.ts": 'const { db } = require("../infrastructure/db");',
      "src/domain/b.ts": 'import "../infrastructure/side-effect";',
      "src/infrastructure/db.ts": "module.exports = { db: {} };",
      "src/infrastructure/side-effect.ts": "console.log('loaded');",
    });

    const violations = analyzeImportBoundaries(dir, "hexagonal");

    expect(violations.map((v) => v.file).sort()).toEqual(["domain/a.ts", "domain/b.ts"]);
  });

  it("ignores bare package imports (external dependencies), never false-positiving on them", () => {
    const dir = seed({
      "src/domain/user.ts": 'import { z } from "zod";\nexport class User {}',
      "src/infrastructure/db.ts": "export const db = {};",
    });

    expect(analyzeImportBoundaries(dir, "domain-driven-design")).toEqual([]);
  });

  it("scans src/ when it exists, else the repo root", () => {
    const dir = seed({
      "domain/user.ts": 'import { db } from "../infrastructure/db";\nexport class User {}',
      "infrastructure/db.ts": "export const db = {};",
    });

    const violations = analyzeImportBoundaries(dir, "layered");

    expect(violations).toEqual([
      { file: "domain/user.ts", importedFile: "infrastructure/db", fromLayer: "domain", toLayer: "infrastructure" },
    ]);
  });

  it("reports multiple violations across different inner-layer directories", () => {
    const dir = seed({
      "src/domain/user.ts": 'import { db } from "../infrastructure/db";\nexport class User {}',
      "src/application/user-service.ts": 'import { repo } from "../repositories/user-repo";',
      "src/infrastructure/db.ts": "export const db = {};",
      "src/repositories/user-repo.ts": "export const repo = {};",
    });

    const violations = analyzeImportBoundaries(dir, "layered");

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.fromLayer).sort()).toEqual(["application", "domain"]);
  });
});
