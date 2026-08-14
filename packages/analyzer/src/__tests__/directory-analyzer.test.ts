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

  it("recognizes standard React/Next.js folders (components, hooks, lib, store)", () => {
    const dir = seed(["components", "hooks", "lib", "store"]);

    expect(analyzeDirectory(dir).signals.value?.sort()).toEqual(["components", "hooks", "lib", "store"]);
  });

  it("recognizes a real-world NestJS domain-per-folder layout via file-naming suffixes, not directory names (found via dogfooding against a real NestJS backend)", () => {
    // Auth/, booking/, conversation/ etc. — folders named by business domain,
    // not by layer, each containing its own *.controller.ts/*.service.ts/
    // *.module.ts. CANDIDATE_DIRECTORY_NAMES alone finds nothing here; this
    // is exactly the gap the file-suffix signal closes.
    const files: Record<string, string> = {
      "src/Auth/Auth.controller.ts": "",
      "src/Auth/Auth.service.ts": "",
      "src/Auth/Auth.module.ts": "",
      "src/Auth/strategy/jwt.strategy.ts": "",
      "src/Auth/guard/jwt.guard.ts": "",
      "src/booking/booking.controller.ts": "",
      "src/booking/dto/create-booking.dto.ts": "",
    };
    const dir = makeFixtureRepo(files);
    tempDirs.push(dir);

    const result = analyzeDirectory(dir);

    expect(result.signals.confidence).toBe("detected");
    expect(result.signals.value?.sort()).toEqual([
      "controller",
      "dto",
      "guard",
      "module",
      "service",
      "strategy",
    ]);
  });

  it("recognizes Feature-Sliced Design layers", () => {
    const dir = seed(["features", "widgets", "shared", "entities"]);

    expect(analyzeDirectory(dir).signals.value?.sort()).toEqual(["entities", "features", "shared", "widgets"]);
  });

  it("recognizes Atomic Design folders", () => {
    const dir = seed(["atoms", "molecules", "organisms", "templates"]);

    expect(analyzeDirectory(dir).signals.value?.sort()).toEqual([
      "atoms",
      "molecules",
      "organisms",
      "templates",
    ]);
  });

  it("recognizes a real-world Next.js frontend layout with no src/ directory (found via dogfooding against a real repo)", () => {
    // Regression test for the exact structure that previously returned
    // "unknown" against a real cloned Next.js app: app/, components/, lib/,
    // store/ at the repo root, no src/ dir at all.
    const files: Record<string, string> = {
      "app/.gitkeep": "",
      "components/.gitkeep": "",
      "lib/.gitkeep": "",
      "store/.gitkeep": "",
      "public/.gitkeep": "",
    };
    const dir = makeFixtureRepo(files);
    tempDirs.push(dir);

    const result = analyzeDirectory(dir);

    // "app" and "public" aren't in the candidate list (routing/static-asset
    // conventions, not architectural ones) — only components/lib/store are.
    expect(result.signals.value?.sort()).toEqual(["components", "lib", "store"]);
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
