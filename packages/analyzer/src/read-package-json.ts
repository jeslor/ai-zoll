import * as fs from "node:fs";
import * as path from "node:path";

/** Returns null on a missing file, invalid JSON, or a non-object root — callers degrade to "unknown" rather than throw. */
export function readPackageJson(repoPath: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(repoPath, "package.json");

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  return raw as Record<string, unknown>;
}

export function readDependencyNames(repoPath: string): Set<string> {
  const pkg = readPackageJson(repoPath);
  if (!pkg) {
    return new Set();
  }

  const deps = typeof pkg.dependencies === "object" && pkg.dependencies !== null ? pkg.dependencies : {};
  const devDeps =
    typeof pkg.devDependencies === "object" && pkg.devDependencies !== null ? pkg.devDependencies : {};

  return new Set([...Object.keys(deps), ...Object.keys(devDeps)]);
}
