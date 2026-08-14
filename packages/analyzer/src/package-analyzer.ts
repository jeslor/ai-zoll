import * as fs from "node:fs";
import * as path from "node:path";
import type { Confidence, Finding } from "./finding";

export interface PackageAnalyzerResult {
  name: Finding<string>;
  description: Finding<string>;
}

const UNKNOWN_NO_FILE: Finding<string> = {
  value: null,
  confidence: "unknown",
  reason: "no package.json found at the repo root, or it isn't valid JSON",
};

/** Distinct from UNKNOWN_NO_FILE — the file exists and parsed fine, this one field just isn't set. */
function unknownField(fieldName: string): Finding<string> {
  return {
    value: null,
    confidence: "unknown",
    reason: `package.json exists but has no usable "${fieldName}" field`,
  };
}

/**
 * Reads the repo root's package.json only — no monorepo/workspace awareness
 * (see packages/analyzer/README.md). "unknown" here means "absent at root",
 * not "absent in the project": a subpackage's package.json may well have a
 * real name/description this v1 doesn't see.
 */
export function analyzePackage(repoPath: string): PackageAnalyzerResult {
  const packageJsonPath = path.join(repoPath, "package.json");

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  } catch {
    return { name: UNKNOWN_NO_FILE, description: UNKNOWN_NO_FILE };
  }

  if (typeof raw !== "object" || raw === null) {
    return { name: UNKNOWN_NO_FILE, description: UNKNOWN_NO_FILE };
  }
  const pkg = raw as Record<string, unknown>;

  // A monorepo root's own name/description often describes the tooling
  // wrapper, not the project itself (e.g. "root", "@acme/monorepo") — the
  // real identity may live in a subpackage this v1 doesn't scan. Checks both
  // npm/yarn's "workspaces" field and pnpm's separate pnpm-workspace.yaml
  // (pnpm doesn't use the package.json field at all).
  const hasPnpmWorkspaceFile = fs.existsSync(path.join(repoPath, "pnpm-workspace.yaml"));
  const isMonorepoRoot = pkg.private === true && ("workspaces" in pkg || hasPnpmWorkspaceFile);
  const confidence: Confidence = isMonorepoRoot ? "likely" : "detected";
  const monorepoReason = isMonorepoRoot
    ? " (monorepo root package.json — the real project identity may live in a subpackage)"
    : "";

  const name =
    typeof pkg.name === "string" && pkg.name.trim().length > 0
      ? {
          value: pkg.name,
          confidence,
          reason: `found "name" in package.json${monorepoReason}`,
        }
      : unknownField("name");

  const description =
    typeof pkg.description === "string" && pkg.description.trim().length > 0
      ? {
          value: pkg.description,
          confidence,
          reason: `found "description" in package.json${monorepoReason}`,
        }
      : unknownField("description");

  return { name, description };
}
