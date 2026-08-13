import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeDirectory } from "../directory-analyzer";

const KNOWN_ARCHITECTURE_STYLES = [
  "modular",
  "layered",
  "clean-architecture",
  "hexagonal",
  "domain-driven-design",
];

let tempDirs: string[] = [];

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(dirs: string[]): string {
  const files: Record<string, string> = {};
  for (const dir of dirs) {
    files[`src/${dir}/.gitkeep`] = "";
  }
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("analyzeDirectory", () => {
  it("reports the raw directory names found for a DDD-shaped layout", () => {
    const dir = seed(["domain", "application", "infrastructure"]);

    const result = analyzeDirectory(dir);

    expect(result.signals.confidence).toBe("detected");
    expect(result.signals.value?.sort()).toEqual(["application", "domain", "infrastructure"]);
  });

  it("reports the raw directory names found for a hexagonal-shaped layout", () => {
    const dir = seed(["domain", "ports", "adapters"]);

    const result = analyzeDirectory(dir);

    expect(result.signals.value?.sort()).toEqual(["adapters", "domain", "ports"]);
  });

  it("is case-insensitive", () => {
    const dir = seed(["Domain", "Application"]);

    expect(analyzeDirectory(dir).signals.value?.sort()).toEqual(["application", "domain"]);
  });

  it("falls back to the repo root when there's no src/ directory", () => {
    const files: Record<string, string> = { "controllers/.gitkeep": "", "services/.gitkeep": "" };
    const dir = makeFixtureRepo(files);
    tempDirs.push(dir);

    expect(analyzeDirectory(dir).signals.value?.sort()).toEqual(["controllers", "services"]);
  });

  it("returns unknown for a flat repo with none of the candidate directory names", () => {
    const files: Record<string, string> = { "src/utils/.gitkeep": "", "src/index.ts": "" };
    const dir = makeFixtureRepo(files);
    tempDirs.push(dir);

    expect(analyzeDirectory(dir).signals).toEqual({
      value: null,
      confidence: "unknown",
      reason: expect.any(String),
    });
  });

  it("never claims to know the architecture style — only reports directory names", () => {
    // Guards against a future contributor reintroducing the classification
    // this analyzer deliberately omits (docs/decisions/0004).
    const dir = seed(["domain", "application", "infrastructure", "ports", "adapters"]);

    const result = analyzeDirectory(dir);
    const serialized = JSON.stringify(result);

    for (const style of KNOWN_ARCHITECTURE_STYLES) {
      expect(serialized).not.toContain(style);
    }
    expect(Object.keys(result)).toEqual(["signals"]);
  });
});
