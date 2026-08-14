import * as fs from "node:fs";
import * as path from "node:path";
import { readPackageJson } from "./read-package-json";

export interface WorkspacePackage {
  /** Absolute path. */
  path: string;
  /** e.g. "apps/web" — used for reason-text attribution when merging findings. */
  relativePath: string;
}

const DEFAULT_GLOB_ROOTS = ["apps", "packages"];

/**
 * Only handles the common "<name>/*" shape — skips exclusion globs (a
 * leading "!"), nested/bracket patterns, and anything else too complex for
 * a narrow v1 parser. Returns null for anything it doesn't recognize,
 * rather than guessing.
 */
function extractGlobRoot(glob: unknown): string | null {
  if (typeof glob !== "string") {
    return null;
  }
  const trimmed = glob.trim();
  if (trimmed.startsWith("!")) {
    return null;
  }
  const match = trimmed.match(/^([^*!]+)\/\*$/);
  return match?.[1] ? match[1].replace(/\/+$/, "") : null;
}

/**
 * Narrow parser for pnpm-workspace.yaml's "packages:" key only — not a
 * general YAML parser, matching this codebase's existing precedent
 * (database-analyzer.ts's Prisma block parser, git-analyzer.ts's INI
 * parser). Handles block style (`packages:\n  - "apps/*"`) and flow style
 * (`packages: ["apps/*", "packages/*"]`), strips "#" comments. Every other
 * top-level key (catalog:, overrides:, onlyBuiltDependencies:, etc.) is
 * ignored by design, not a gap.
 */
function extractPnpmPackagesList(yamlContent: string): string[] {
  const stripComment = (line: string) => line.replace(/#.*$/, "");
  const stripQuotes = (value: string) => value.replace(/^["']|["']$/g, "");

  const flowMatch = yamlContent.match(/^\s*packages\s*:\s*\[(.*)\]\s*$/m);
  if (flowMatch?.[1]) {
    return flowMatch[1]
      .split(",")
      .map((entry) => stripQuotes(stripComment(entry).trim()))
      .filter(Boolean);
  }

  const blockMatch = yamlContent.match(/^\s*packages\s*:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m);
  if (!blockMatch?.[1]) {
    return [];
  }

  return blockMatch[1]
    .split("\n")
    .map((line) => stripComment(line).match(/^[ \t]*-[ \t]*(.+)$/)?.[1]?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .map(stripQuotes);
}

/**
 * Additional glob roots beyond the apps/packages defaults, declared via
 * package.json's "workspaces" field (npm/yarn — array or {packages: [...]}
 * shape) or pnpm-workspace.yaml's "packages:" list. These only ever ADD
 * candidate roots for the directory walk below — never filter it. Silently
 * returns [] on any parse failure; the default apps/*, packages/* walk
 * still runs regardless (see discoverWorkspacePackages).
 */
function readDeclaredGlobRoots(repoPath: string): string[] {
  const roots: string[] = [];

  const pkg = readPackageJson(repoPath);
  const workspaces = pkg?.workspaces;
  const workspaceGlobs = Array.isArray(workspaces)
    ? workspaces
    : typeof workspaces === "object" &&
        workspaces !== null &&
        Array.isArray((workspaces as { packages?: unknown }).packages)
      ? (workspaces as { packages: unknown[] }).packages
      : [];
  for (const glob of workspaceGlobs) {
    const root = extractGlobRoot(glob);
    if (root) {
      roots.push(root);
    }
  }

  try {
    const content = fs.readFileSync(path.join(repoPath, "pnpm-workspace.yaml"), "utf-8");
    for (const glob of extractPnpmPackagesList(content)) {
      const root = extractGlobRoot(glob);
      if (root) {
        roots.push(root);
      }
    }
  } catch {
    // no pnpm-workspace.yaml, or unreadable — directory walk with defaults still applies
  }

  return roots;
}

/**
 * One level deep only (no nested-workspace support) — directory-walk of
 * apps/* and packages/* (the actual discovery mechanism, matching what
 * git-analyzer.ts already did) plus any additional glob roots declared in
 * package.json/pnpm-workspace.yaml. A directory only counts as a package if
 * it has its own package.json. Deduplicated by resolved absolute path (a
 * root could be declared in both workspaces and pnpm-workspace.yaml).
 */
export function discoverWorkspacePackages(repoPath: string): WorkspacePackage[] {
  const globRoots = new Set([...DEFAULT_GLOB_ROOTS, ...readDeclaredGlobRoots(repoPath)]);

  const discovered = new Map<string, WorkspacePackage>();
  for (const root of globRoots) {
    const rootPath = path.join(repoPath, root);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(rootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const packagePath = path.join(rootPath, entry.name);
      if (!fs.existsSync(path.join(packagePath, "package.json"))) {
        continue;
      }
      discovered.set(packagePath, { path: packagePath, relativePath: path.join(root, entry.name) });
    }
  }

  return [...discovered.values()];
}
