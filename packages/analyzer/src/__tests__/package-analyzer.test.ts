import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzePackage } from "../package-analyzer";

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

describe("analyzePackage", () => {
  it("detects name and description from a normal package.json", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-api",
        description: "Acme's core API service",
      }),
    });

    const result = analyzePackage(dir);

    expect(result.name).toEqual({
      value: "acme-api",
      confidence: "detected",
      reason: expect.stringContaining("name"),
    });
    expect(result.description.value).toBe("Acme's core API service");
    expect(result.description.confidence).toBe("detected");
  });

  it("reports monorepo-root package.json at 'likely', not 'detected'", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-monorepo",
        private: true,
        workspaces: ["apps/*", "packages/*"],
        devDependencies: { turbo: "^2.0.0", typescript: "^5.4.0" },
      }),
    });

    const result = analyzePackage(dir);

    expect(result.name.value).toBe("acme-monorepo");
    expect(result.name.confidence).toBe("likely");
    expect(result.name.reason).toContain("monorepo root");
  });

  it("also recognizes a pnpm monorepo root (pnpm-workspace.yaml, no 'workspaces' field in package.json)", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-pnpm-monorepo",
        private: true,
        devDependencies: { typescript: "^5.4.0" },
      }),
      "pnpm-workspace.yaml": "packages:\n  - \"apps/*\"\n  - \"packages/*\"\n",
    });

    const result = analyzePackage(dir);

    expect(result.name.confidence).toBe("likely");
    expect(result.name.reason).toContain("monorepo root");
  });

  it("returns unknown when package.json doesn't exist", () => {
    const dir = seed({});

    const result = analyzePackage(dir);

    expect(result.name).toEqual({
      value: null,
      confidence: "unknown",
      reason: expect.any(String),
    });
    expect(result.description.confidence).toBe("unknown");
  });

  it("returns unknown (not a crash) on invalid JSON", () => {
    const dir = seed({ "package.json": "{ not valid json" });

    const result = analyzePackage(dir);

    expect(result.name.confidence).toBe("unknown");
  });

  it("returns unknown when name/description are missing or empty", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "", description: "   " }) });

    const result = analyzePackage(dir);

    expect(result.name.confidence).toBe("unknown");
    expect(result.description.confidence).toBe("unknown");
  });

  it("returns unknown when name/description are the wrong type", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: 123, description: null }) });

    const result = analyzePackage(dir);

    expect(result.name.confidence).toBe("unknown");
    expect(result.description.confidence).toBe("unknown");
  });

  it("gives a distinct reason for a missing field vs. a missing file (found via dogfooding — package.json existing and having a name was previously misreported as 'no package.json found' for the unrelated missing description field)", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "acme-billing-service" }) });

    const result = analyzePackage(dir);

    expect(result.name.confidence).toBe("detected");
    expect(result.description.confidence).toBe("unknown");
    expect(result.description.reason).not.toContain("no package.json found");
    expect(result.description.reason).toContain("package.json exists");
  });
});
