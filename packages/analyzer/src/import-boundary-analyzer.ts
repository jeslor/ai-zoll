import * as fs from "node:fs";
import * as path from "node:path";
import { isExcludedPath } from "./exclusion";

export interface ImportBoundaryViolation {
  /** Relative to the scan directory (src/ if it exists, else the repo root) — same convention DirectoryAnalyzer uses. */
  file: string;
  importedFile: string;
  fromLayer: string;
  toLayer: string;
}

/**
 * Inner (business-logic) vs. outer (framework/infrastructure-touching)
 * layer names — a subset of DirectoryAnalyzer's own
 * `CANDIDATE_DIRECTORY_NAMES` vocabulary, split by which side of the
 * "Dependency Rule" they sit on (shared across Clean Architecture,
 * Hexagonal, DDD, and traditional layered descriptions: dependencies point
 * inward, never outward). Deliberately a small, conservative subset — only
 * names unambiguous enough that miscategorizing them would be a real
 * mistake, not every name in that longer list (e.g. "components"/"hooks"
 * are frontend-convention names with no clear inner/outer reading, so
 * they're absent from both sets here).
 */
const INNER_LAYERS = new Set(["domain", "entities", "use-cases", "usecases", "application", "ports"]);
const OUTER_LAYERS = new Set([
  "controllers",
  "adapters",
  "infrastructure",
  "repositories",
  "middleware",
  "middlewares",
  "routes",
]);

/**
 * Architecture styles sharing the Dependency Rule. "modular" is
 * deliberately excluded — its own boundary concept (feature isolation, not
 * inner/outer layering) is a genuinely different rule shape, not a smaller
 * version of this one, and isn't attempted here.
 */
const APPLICABLE_STYLES = new Set(["layered", "clean-architecture", "hexagonal", "domain-driven-design"]);

const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const FROM_IMPORT_PATTERN = /\bfrom\s+["'](\.[^"']+)["']/g;
const REQUIRE_PATTERN = /\brequire\(\s*["'](\.[^"']+)["']\s*\)/g;
const SIDE_EFFECT_IMPORT_PATTERN = /^\s*import\s+["'](\.[^"']+)["']/gm;
const MAX_WALK_DEPTH = 8;

function listTopLevelDirs(dir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function findSourceFiles(dir: string, relativeDir: string, depth: number, out: string[]): void {
  if (depth > MAX_WALK_DEPTH) {
    return;
  }
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryRelPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (isExcludedPath(entryRelPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      findSourceFiles(path.join(dir, entry.name), entryRelPath, depth + 1, out);
    } else if (entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name)) {
      out.push(entryRelPath);
    }
  }
}

/** Every relative-import specifier (`./`/`../`) found in `content`, across ES `from "..."`, side-effect `import "..."`, and CommonJS `require("...")` forms — bare package imports ("react", "@nestjs/core") are never relative, so they're already excluded by the leading-dot requirement, not filtered separately. */
function extractRelativeImports(content: string): string[] {
  const imports: string[] = [];
  for (const pattern of [FROM_IMPORT_PATTERN, REQUIRE_PATTERN, SIDE_EFFECT_IMPORT_PATTERN]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      if (match[1]) {
        imports.push(match[1]);
      }
    }
  }
  return imports;
}

/** The first path segment (scanning from the root) that names a known layer, or null if the path isn't under any recognized layer. */
function layerOf(relativePath: string, layers: Set<string>): string | null {
  for (const segment of relativePath.split("/")) {
    if (layers.has(segment)) {
      return segment;
    }
  }
  return null;
}

/**
 * Checks the one architecture rule shared across layered/clean/hexagonal/
 * DDD styles — the Dependency Rule: inner (business-logic) code must never
 * import outer (framework/infrastructure-touching) code. Node/TypeScript
 * only — import syntax is far too varied across the other 6 ecosystems
 * `packages/analyzer` now supports to attempt a shared parser here; a
 * stated v1 scope limit, not an oversight. A narrow, hand-written regex
 * extractor, not a real AST parser, matching this package's existing
 * precedent elsewhere.
 *
 * Returns `[]` immediately, without walking anything, in two cases that
 * both mean "nothing to check", not "clean pass": the declared style
 * doesn't use this rule (`modular`), or the repo doesn't actually have
 * both an inner-layer and an outer-layer directory to compare.
 */
export function analyzeImportBoundaries(repoPath: string, architectureStyle: string): ImportBoundaryViolation[] {
  if (!APPLICABLE_STYLES.has(architectureStyle)) {
    return [];
  }

  const srcPath = path.join(repoPath, "src");
  const scanDir = fs.existsSync(srcPath) ? srcPath : repoPath;

  const topLevelDirs = listTopLevelDirs(scanDir);
  const innerDirs = topLevelDirs.filter((dir) => INNER_LAYERS.has(dir));
  const hasOuterLayer = topLevelDirs.some((dir) => OUTER_LAYERS.has(dir));
  if (innerDirs.length === 0 || !hasOuterLayer) {
    return [];
  }

  const sourceFiles: string[] = [];
  for (const dir of innerDirs) {
    findSourceFiles(path.join(scanDir, dir), dir, 0, sourceFiles);
  }

  const violations: ImportBoundaryViolation[] = [];
  for (const relFile of sourceFiles) {
    const fromLayer = layerOf(relFile, INNER_LAYERS);
    if (!fromLayer) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(path.join(scanDir, relFile), "utf-8");
    } catch {
      continue;
    }

    for (const spec of extractRelativeImports(content)) {
      const resolvedAbs = path.resolve(path.dirname(path.join(scanDir, relFile)), spec);
      const resolvedRel = path.relative(scanDir, resolvedAbs).split(path.sep).join("/");
      const toLayer = layerOf(resolvedRel, OUTER_LAYERS);
      if (toLayer) {
        violations.push({ file: relFile, importedFile: resolvedRel, fromLayer, toLayer });
      }
    }
  }

  return violations;
}
