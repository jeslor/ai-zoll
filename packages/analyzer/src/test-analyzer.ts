import * as fs from "node:fs";
import * as path from "node:path";
import type { Finding } from "./finding";
import { readDependencyNames, readPackageJson } from "./read-package-json";
import { isExcludedPath } from "./exclusion";

export interface TestAnalyzerResult {
  unit: Finding<boolean>;
  integration: Finding<boolean>;
  e2e: Finding<boolean>;
}

const UNIT_TEST_DEPS = ["vitest", "jest", "mocha", "ava"];
const E2E_TEST_DEPS = ["playwright", "@playwright/test", "cypress"];

const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__"]);
const TEST_FILE_PATTERN = /\.(test|spec)\.[^.]+$/;
const MAX_WALK_DEPTH = 4;

/** The classic npm-init default — present, but not evidence tests actually exist. */
function isPlaceholderTestScript(script: string): boolean {
  return /no test specified/i.test(script);
}

function hasRealScript(pkg: Record<string, unknown> | null, scriptKey: string): boolean {
  if (!pkg) {
    return false;
  }
  const scripts = typeof pkg.scripts === "object" && pkg.scripts !== null ? (pkg.scripts as Record<string, unknown>) : {};
  const script = scripts[scriptKey];
  if (typeof script !== "string") {
    return false;
  }
  const trimmed = script.trim();
  return trimmed.length > 0 && !isPlaceholderTestScript(trimmed);
}

/**
 * Bounded, exclusion-aware walk from the repo root looking for a test
 * dir/file naming convention. Depth-limited (not a full recursive crawl) —
 * consistent with this v1's repo-root-only scope elsewhere in this package.
 */
function hasTestFilesOrDirs(repoPath: string): boolean {
  function walk(dir: string, relativeDir: string, depth: number): boolean {
    if (depth > MAX_WALK_DEPTH) {
      return false;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      const entryRelPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (isExcludedPath(entryRelPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        if (TEST_DIR_NAMES.has(entry.name)) {
          return true;
        }
        if (walk(path.join(dir, entry.name), entryRelPath, depth + 1)) {
          return true;
        }
      } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
        return true;
      }
    }
    return false;
  }

  return walk(repoPath, "", 0);
}

function findUnit(
  dependencyNames: Set<string>,
  pkg: Record<string, unknown> | null,
  filesFound: boolean,
): Finding<boolean> | null {
  for (const dep of UNIT_TEST_DEPS) {
    if (dependencyNames.has(dep)) {
      return { value: true, confidence: "detected", reason: `found "${dep}" in dependencies` };
    }
  }
  if (hasRealScript(pkg, "test")) {
    return {
      value: true,
      confidence: "likely",
      reason: '"scripts.test" is set and isn\'t the npm-init placeholder, but no known test runner dependency was found (may be a built-in like node:test/bun:test, or a custom runner)',
    };
  }
  if (filesFound) {
    return { value: true, confidence: "likely", reason: "found test files or a test/tests/__tests__ directory" };
  }
  return null;
}

function findIntegration(
  dependencyNames: Set<string>,
  pkg: Record<string, unknown> | null,
): Finding<boolean> | null {
  if (dependencyNames.has("supertest")) {
    return {
      value: true,
      confidence: "likely",
      reason: 'found "supertest" in dependencies (often used for integration-style API tests, though the signal is ambiguous)',
    };
  }
  if (hasRealScript(pkg, "test:integration") || hasRealScript(pkg, "test:int")) {
    return { value: true, confidence: "likely", reason: "found a test:integration script" };
  }
  return null;
}

function findE2e(dependencyNames: Set<string>, pkg: Record<string, unknown> | null): Finding<boolean> | null {
  for (const dep of E2E_TEST_DEPS) {
    if (dependencyNames.has(dep)) {
      return { value: true, confidence: "detected", reason: `found "${dep}" in dependencies` };
    }
  }
  if (hasRealScript(pkg, "test:e2e") || hasRealScript(pkg, "e2e")) {
    return { value: true, confidence: "likely", reason: "found a test:e2e script" };
  }
  return null;
}

/**
 * Checks three independent signal classes — devDependencies, scripts.test
 * (skipping the npm-init placeholder), and a bounded directory walk — before
 * concluding a confident "no tests at all". Finding evidence for one
 * category (e.g. unit) says nothing about the others: only when ALL THREE
 * signal classes come back completely empty do all three fields report a
 * confident `false`; if some evidence was found but not for a specific
 * field, that field is "unknown", not a false negative. Repo-root-only —
 * bun:test/node:test (built-ins with no devDependency entry) are a known
 * v1 false-negative class unless caught by the file-naming fallback.
 */
export function analyzeTests(repoPath: string): TestAnalyzerResult {
  const pkg = readPackageJson(repoPath);
  const dependencyNames = readDependencyNames(repoPath);
  const filesFound = hasTestFilesOrDirs(repoPath);

  const unit = findUnit(dependencyNames, pkg, filesFound);
  const integration = findIntegration(dependencyNames, pkg);
  const e2e = findE2e(dependencyNames, pkg);

  if (unit === null && integration === null && e2e === null) {
    const negative: Finding<boolean> = {
      value: false,
      confidence: "detected",
      reason: "checked dependencies, scripts.test, and test files/directories — found no signal of any kind",
    };
    return { unit: negative, integration: negative, e2e: negative };
  }

  const unknownField = (reason: string): Finding<boolean> => ({ value: null, confidence: "unknown", reason });
  return {
    unit: unit ?? unknownField("no unit-testing signal found, though other testing signals exist"),
    integration:
      integration ?? unknownField("no integration-testing signal found, though other testing signals exist"),
    e2e: e2e ?? unknownField("no e2e-testing signal found, though other testing signals exist"),
  };
}
