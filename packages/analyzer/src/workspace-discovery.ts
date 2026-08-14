import * as fs from "node:fs";
import * as path from "node:path";
import { readPackageJson } from "./read-package-json";
import { findTomlSectionBody, extractTomlArrayValue } from "./ecosystems/toml-section-keys";

export interface WorkspacePackage {
  /** Absolute path. */
  path: string;
  /** e.g. "apps/web" — used for reason-text attribution when merging findings. */
  relativePath: string;
}

const DEFAULT_GLOB_ROOTS = ["apps", "packages"];

/**
 * Every manifest filename this package's analyzers already know how to
 * read (see `read-dependency-names.ts`) — a directory counts as a
 * discoverable "package" if it has any one of these, not just
 * `package.json`. Without this, a Python `uv` workspace member (which has
 * `pyproject.toml`, never `package.json`) would be found by the workspace
 * declaration readers below and then immediately rejected here, silently
 * undoing the whole point of reading that declaration.
 */
const FIXED_MANIFEST_FILENAMES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
];

/** .NET has no fixed manifest filename (see `ecosystems/dotnet.ts`) — a directory counts if it contains any `*.csproj` file. */
function hasRecognizedManifest(dirPath: string): boolean {
  for (const filename of FIXED_MANIFEST_FILENAMES) {
    if (fs.existsSync(path.join(dirPath, filename))) {
      return true;
    }
  }
  try {
    return fs.readdirSync(dirPath).some((entry) => entry.endsWith(".csproj"));
  } catch {
    return false;
  }
}

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

/** A discovered workspace declaration entry is either a glob root (scan every child directory) or a direct package path (this exact directory is one package) — Cargo/uv's `members` list can mix both in the same array, so each entry is classified independently. */
interface WorkspaceEntries {
  globRoots: string[];
  directPackagePaths: string[];
}

function classifyMemberEntries(entries: string[]): WorkspaceEntries {
  const globRoots: string[] = [];
  const directPackagePaths: string[] = [];
  for (const entry of entries) {
    const globRoot = extractGlobRoot(entry);
    if (globRoot) {
      globRoots.push(globRoot);
    } else {
      directPackagePaths.push(entry.replace(/^\.\//, "").replace(/\/+$/, ""));
    }
  }
  return { globRoots, directPackagePaths };
}

/** Cargo's `[workspace] members = ["crate-a", "crates/*"]` — real Rust monorepos commonly mix literal crate names and glob roots in the same array. */
function readCargoWorkspaceMembers(repoPath: string): WorkspaceEntries {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "Cargo.toml"), "utf-8");
  } catch {
    return { globRoots: [], directPackagePaths: [] };
  }
  const body = findTomlSectionBody(content, "workspace");
  if (body === null) {
    return { globRoots: [], directPackagePaths: [] };
  }
  return classifyMemberEntries(extractTomlArrayValue(body, "members"));
}

/** uv's `[tool.uv.workspace] members = ["backend", "shared/*"]` — the modern, increasingly standard Python monorepo convention. Poetry has no comparably standard multi-package workspace declaration, so it isn't read here. */
function readUvWorkspaceMembers(repoPath: string): WorkspaceEntries {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "pyproject.toml"), "utf-8");
  } catch {
    return { globRoots: [], directPackagePaths: [] };
  }
  const body = findTomlSectionBody(content, "tool.uv.workspace");
  if (body === null) {
    return { globRoots: [], directPackagePaths: [] };
  }
  return classifyMemberEntries(extractTomlArrayValue(body, "members"));
}

/**
 * go.work's `use` directive, both forms — same block/single-line duality as
 * go.mod's `require` (see `ecosystems/go.ts`). Always direct relative
 * paths, never globs; the go.work spec has no glob concept.
 */
function readGoWorkspaceMembers(repoPath: string): string[] {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "go.work"), "utf-8");
  } catch {
    return [];
  }

  const paths: string[] = [];
  const blockMatch = /use\s*\(([^)]*)\)/.exec(content);
  if (blockMatch?.[1]) {
    for (const rawLine of blockMatch[1].split("\n")) {
      const line = rawLine.trim();
      if (line && !line.startsWith("//")) {
        paths.push(line);
      }
    }
  }
  for (const match of content.matchAll(/^use[ \t]+(\S+)/gm)) {
    if (match[1]) {
      paths.push(match[1]);
    }
  }

  return paths.map((p) => p.replace(/^\.\//, "").replace(/\/+$/, ""));
}

/** Maven's `<modules><module>account</module>...</modules>` reactor declaration — always direct relative paths, never globs. */
function readMavenModules(repoPath: string): string[] {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "pom.xml"), "utf-8");
  } catch {
    return [];
  }
  const modulesBlockMatch = /<modules>([\s\S]*?)<\/modules>/.exec(content);
  if (!modulesBlockMatch?.[1]) {
    return [];
  }
  return [...modulesBlockMatch[1].matchAll(/<module>([^<]+)<\/module>/g)]
    .map((match) => match[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

/**
 * Additional glob roots and direct package paths beyond the apps/packages
 * defaults, declared via any recognized workspace-declaration convention:
 * package.json's "workspaces" field or pnpm-workspace.yaml (npm/yarn/pnpm),
 * Cargo.toml's [workspace] (Rust), pyproject.toml's [tool.uv.workspace]
 * (Python/uv), go.work (Go), or pom.xml's <modules> (Maven). These only
 * ever ADD candidates for the discovery below — never filter it. Each
 * reader silently returns nothing on a parse failure or missing file; the
 * default apps/*, packages/* walk still runs regardless.
 */
function readDeclaredWorkspaceEntries(repoPath: string): WorkspaceEntries {
  const globRoots: string[] = [];
  const directPackagePaths: string[] = [];

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
      globRoots.push(root);
    }
  }

  try {
    const content = fs.readFileSync(path.join(repoPath, "pnpm-workspace.yaml"), "utf-8");
    for (const glob of extractPnpmPackagesList(content)) {
      const root = extractGlobRoot(glob);
      if (root) {
        globRoots.push(root);
      }
    }
  } catch {
    // no pnpm-workspace.yaml, or unreadable — directory walk with defaults still applies
  }

  for (const entries of [readCargoWorkspaceMembers(repoPath), readUvWorkspaceMembers(repoPath)]) {
    globRoots.push(...entries.globRoots);
    directPackagePaths.push(...entries.directPackagePaths);
  }
  directPackagePaths.push(...readGoWorkspaceMembers(repoPath), ...readMavenModules(repoPath));

  return { globRoots, directPackagePaths };
}

/**
 * One level deep only (no nested-workspace support) — directory-walk of
 * apps/* and packages/* (the actual discovery mechanism, matching what
 * git-analyzer.ts already did) plus any additional glob roots and direct
 * package paths declared via a recognized workspace-declaration convention
 * (see `readDeclaredWorkspaceEntries`). A directory only counts as a
 * package if it has a manifest from any ecosystem this analyzer package
 * recognizes (`hasRecognizedManifest`) — not `package.json` specifically,
 * so a Python/Rust/Go/Java subpackage declared via its own ecosystem's
 * workspace convention is actually discoverable, not silently rejected
 * after being found. Deduplicated by resolved absolute path (a root could
 * be declared in more than one place).
 */
export function discoverWorkspacePackages(repoPath: string): WorkspacePackage[] {
  const declared = readDeclaredWorkspaceEntries(repoPath);
  const globRoots = new Set([...DEFAULT_GLOB_ROOTS, ...declared.globRoots]);

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
      if (!hasRecognizedManifest(packagePath)) {
        continue;
      }
      discovered.set(packagePath, { path: packagePath, relativePath: path.join(root, entry.name) });
    }
  }

  for (const relativePath of declared.directPackagePaths) {
    const packagePath = path.join(repoPath, relativePath);
    if (!hasRecognizedManifest(packagePath)) {
      continue;
    }
    discovered.set(packagePath, { path: packagePath, relativePath });
  }

  return [...discovered.values()];
}
