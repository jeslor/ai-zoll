import * as fs from "node:fs";
import * as path from "node:path";

/**
 * composer.json is structurally identical to package.json (a real JSON
 * object with `require`/`require-dev` keys) — same read/parse shape as
 * `read-package-json.ts`, just a different filename and key names.
 * "php" itself and "ext-*" platform-requirement entries (e.g. "ext-pdo")
 * aren't real packages, so they're filtered out rather than left in as
 * noise no signal table would ever match anyway.
 */
export function readPhpDependencyNames(repoPath: string): Set<string> {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(repoPath, "composer.json"), "utf-8"));
  } catch {
    return new Set();
  }
  if (typeof raw !== "object" || raw === null) {
    return new Set();
  }
  const pkg = raw as Record<string, unknown>;

  const require = typeof pkg.require === "object" && pkg.require !== null ? pkg.require : {};
  const requireDev = typeof pkg["require-dev"] === "object" && pkg["require-dev"] !== null ? pkg["require-dev"] : {};

  const names = [...Object.keys(require), ...Object.keys(requireDev)].filter(
    (name) => name !== "php" && !name.startsWith("ext-"),
  );
  return new Set(names);
}
