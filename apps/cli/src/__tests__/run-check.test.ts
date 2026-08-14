import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import { runCheck } from "../run-check";
import { writeProjectState } from "../project-state";

const baseBlueprint: ProjectBlueprint = {
  version: "1.0",
  project: {
    name: "Drift Test Project",
    description: "A project used to exercise ai-zoll check.",
    type: "saas",
  },
  architecture: { style: "modular" },
  stack: {
    frontend: "nextjs",
    backend: "nestjs",
    database: "postgresql",
    orm: "prisma",
  },
  features: [],
  testing: { unit: false, integration: false, e2e: false },
  security: { authentication: "jwt", authorization: "rbac" },
  agent: { primary: "claude" },
};

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-check-test-"));
  tempDirs.push(dir);
  return dir;
}

function initProject(
  projectDir: string,
  blueprint: ProjectBlueprint,
  directorySignals: string[] = [],
): void {
  writeProjectState(projectDir, { blueprint, generatedPaths: [], directorySignals });
}

function writePackageJson(projectDir: string, dependencies: Record<string, string>): void {
  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify({ name: "fixture", version: "1.0.0", dependencies }, null, 2),
  );
}

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("runCheck", () => {
  it("throws when the project has never been ai-zoll-initialized", () => {
    const projectDir = makeTempDir();
    expect(() => runCheck(projectDir)).toThrow(/run "ai-zoll init" first/);
  });

  it("reports no drift when the repository still matches the stored Blueprint", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint);
    writePackageJson(projectDir, { next: "^16.0.0", "@nestjs/core": "^11.0.0" });

    const result = runCheck(projectDir);

    expect(result.projectDir).toBe(projectDir);
    expect(result.drift).toEqual([]);
  });

  it("reports drift when a detected framework no longer matches the Blueprint", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint);
    // Blueprint says nextjs; the repo now has no next.js dependency at all,
    // but does have express — a real, detected mismatch.
    writePackageJson(projectDir, { express: "^5.0.0" });

    const result = runCheck(projectDir);

    // No frontend dependency present at all -> FrameworkAnalyzer reports
    // "unknown" for frontend, which is never treated as drift.
    const frontendDrift = result.drift.find((d) => d.field === "stack.frontend");
    expect(frontendDrift).toBeUndefined();

    const backendDrift = result.drift.find((d) => d.field === "stack.backend");
    expect(backendDrift).toEqual({
      field: "stack.backend",
      label: "Backend",
      expected: "nestjs",
      actual: "express",
      confidence: "detected",
    });
  });

  it("never reports drift for a field the analyzer has no signal for (unknown stays silent)", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint);
    // No package.json at all -> every framework/database finding is "unknown".
    const result = runCheck(projectDir);

    expect(result.drift.find((d) => d.field === "stack.frontend")).toBeUndefined();
    expect(result.drift.find((d) => d.field === "stack.backend")).toBeUndefined();
    expect(result.drift.find((d) => d.field === "stack.database")).toBeUndefined();
    expect(result.drift.find((d) => d.field === "stack.orm")).toBeUndefined();
  });

  it("detects a testing-convention mismatch (boolean field)", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, { ...baseBlueprint, testing: { unit: false, integration: false, e2e: false } });
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "fixture",
          version: "1.0.0",
          dependencies: { next: "^16.0.0", "@nestjs/core": "^11.0.0" },
          devDependencies: { vitest: "^4.0.0" },
          scripts: { test: "vitest run" },
        },
        null,
        2,
      ),
    );

    const result = runCheck(projectDir);

    const unitDrift = result.drift.find((d) => d.field === "testing.unit");
    expect(unitDrift).toEqual({
      field: "testing.unit",
      label: "Unit testing",
      expected: "false",
      actual: "true",
      confidence: "detected",
    });
  });

  it("reports multiple drift entries together when several fields disagree", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint);
    writePackageJson(projectDir, { express: "^5.0.0", "passport-jwt": "^4.0.0" });

    const result = runCheck(projectDir);

    const fields = result.drift.map((d) => d.field).sort();
    expect(fields).toContain("stack.backend");
    expect(fields).toContain("security.authentication");
  });

  it("reports newly-appeared directory conventions since the last recorded baseline", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint, ["controllers"]);
    fs.mkdirSync(path.join(projectDir, "services"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "services", ".gitkeep"), "");
    fs.mkdirSync(path.join(projectDir, "controllers"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "controllers", ".gitkeep"), "");

    const result = runCheck(projectDir);

    // "controllers" was already in the baseline -> not new. "services" wasn't -> new.
    expect(result.newDirectoryConventions).toEqual(["services"]);
  });

  it("reports no new directory conventions when the current signals are a subset of the baseline", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, baseBlueprint, ["controllers", "services"]);
    fs.mkdirSync(path.join(projectDir, "controllers"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "controllers", ".gitkeep"), "");

    const result = runCheck(projectDir);

    expect(result.newDirectoryConventions).toEqual([]);
  });

  it("never reports new directory conventions for a project whose state.json predates this feature", () => {
    const projectDir = makeTempDir();
    // Hand-written, no directorySignals field at all — simulates a
    // pre-existing project adopted before this feature shipped.
    fs.mkdirSync(path.join(projectDir, ".ai-zoll"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, ".ai-zoll", "state.json"),
      JSON.stringify({ blueprint: baseBlueprint, generatedPaths: [] }, null, 2),
    );
    fs.mkdirSync(path.join(projectDir, "controllers"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "controllers", ".gitkeep"), "");

    const result = runCheck(projectDir);

    // Without this guard, "controllers" would be misreported as "new" just
    // because no baseline was ever recorded — not because it's actually new.
    expect(result.newDirectoryConventions).toEqual([]);
  });

  it("reports an import-boundary violation for a layered architecture style", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, { ...baseBlueprint, architecture: { style: "layered" } });
    fs.mkdirSync(path.join(projectDir, "src", "domain"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src", "infrastructure"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "src", "domain", "user.ts"),
      'import { db } from "../infrastructure/db";\nexport class User {}',
    );
    fs.writeFileSync(path.join(projectDir, "src", "infrastructure", "db.ts"), "export const db = {};");

    const result = runCheck(projectDir);

    expect(result.importBoundaryViolations).toEqual([
      { file: "domain/user.ts", importedFile: "infrastructure/db", fromLayer: "domain", toLayer: "infrastructure" },
    ]);
  });

  it("never checks import boundaries for the modular architecture style", () => {
    const projectDir = makeTempDir();
    initProject(projectDir, { ...baseBlueprint, architecture: { style: "modular" } });
    fs.mkdirSync(path.join(projectDir, "src", "domain"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src", "infrastructure"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "src", "domain", "user.ts"),
      'import { db } from "../infrastructure/db";\nexport class User {}',
    );
    fs.writeFileSync(path.join(projectDir, "src", "infrastructure", "db.ts"), "export const db = {};");

    const result = runCheck(projectDir);

    expect(result.importBoundaryViolations).toEqual([]);
  });
});
