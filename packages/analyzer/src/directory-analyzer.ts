import * as fs from "node:fs";
import * as path from "node:path";
import type { Finding } from "./finding";
import { isExcludedPath } from "./exclusion";

export interface DirectoryAnalyzerResult {
  /**
   * Which known architecture-convention directory names or file-naming
   * suffixes exist in the repo — raw structural facts only. Deliberately
   * NOT a architecture.style classification: docs/decisions/
   * 0004-deterministic-vs-ai-boundary.md explicitly puts "directory
   * detection" on the deterministic side and "architecture reasoning" on
   * the AI-assisted side. Reporting "this repo has domain/, application/,
   * infrastructure/ directories" is a fact; deciding that means
   * "domain-driven-design" is reasoning about what the fact implies — this
   * analyzer stops at the fact. architecture.style stays the user's direct
   * choice in the CLI wizard (spec §7), or a future optional --ai layer's
   * job to interpret this signal set — never a deterministic guess.
   */
  signals: Finding<string[]>;
}

/**
 * Not exhaustive, not weighted, not prioritized — just the candidate set of
 * directory names this analyzer knows how to recognize as potentially
 * architecture-relevant. Whether their presence means anything is out of
 * scope here on purpose. Deliberately excludes purely generic/utility
 * folders (utils, types, config, assets, styles, public, api) — they exist
 * in nearly every project regardless of architectural approach, so they
 * don't discriminate between conventions and would just be noise here.
 *
 * Researched and expanded beyond the original backend/DDD-only list after
 * dogfooding against a real Next.js frontend repo returned zero signal for
 * a project that actually had a clear, well-known structure (app/,
 * components/, lib/, store/, Hooks/) this list simply didn't know about.
 * Sources for the additions:
 * - Domain-Driven Design / Clean / Hexagonal (original set, backend-leaning)
 * - "Repository pattern" (repositories) — common alongside controllers/services
 * - Standard React/Next.js convention (components, hooks, lib, store,
 *   context, providers, layouts, views, pages) — nextjs.org/docs/app/
 *   getting-started/project-structure and multiple 2026 community guides
 * - Feature-Sliced Design (features, widgets, shared, processes; entities
 *   already covered) — feature-sliced.design, a formalized, popular
 *   frontend methodology with its own named layers
 * - Atomic Design (atoms, molecules, organisms, templates) —
 *   atomicdesign.bradfrost.com, a widely-used component-organization
 *   methodology
 */
const CANDIDATE_DIRECTORY_NAMES = [
  // Domain-Driven Design / Clean Architecture / Hexagonal
  "domain",
  "application",
  "infrastructure",
  "ports",
  "adapters",
  "use-cases",
  "usecases",
  "entities",
  "modules",
  "controllers",
  "services",
  "models",
  "repositories",
  "middleware",
  "middlewares",
  "routes",
  // Standard React / Next.js
  "components",
  "hooks",
  "lib",
  "store",
  "stores",
  "context",
  "providers",
  "layouts",
  "views",
  "pages",
  // Feature-Sliced Design
  "features",
  "widgets",
  "shared",
  "processes",
  // Atomic Design
  "atoms",
  "molecules",
  "organisms",
  "templates",
];

/**
 * File-naming suffixes (NestJS/Angular-style: Name.controller.ts,
 * Name.service.ts, ...) — added after dogfooding against a real NestJS
 * backend whose top-level folders are named by *business domain*
 * (Auth/, booking/, conversation/), not by *layer*, so
 * CANDIDATE_DIRECTORY_NAMES found nothing even though this is one of the
 * most canonical real-world NestJS structures: one folder per domain, each
 * containing its own *.controller.ts/*.service.ts/*.module.ts. A file
 * being named "*.controller.ts" is exactly as much a deterministic fact as
 * a directory being named "controllers/" — still detection, not reasoning
 * about what it implies.
 */
const CANDIDATE_FILE_SUFFIXES = [
  "controller",
  "service",
  "module",
  "repository",
  "entity",
  "guard",
  "strategy",
  "resolver",
  "middleware",
  "dto",
];

const FILE_SUFFIX_PATTERN = new RegExp(`\\.(${CANDIDATE_FILE_SUFFIXES.join("|")})\\.[jt]sx?$`, "i");
const MAX_WALK_DEPTH = 3;

function listSubdirectoryNames(dir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name.toLowerCase());
}

/**
 * Bounded, exclusion-aware walk (matches TestAnalyzer's file-walk pattern)
 * looking for file-naming-suffix signals. Depth-limited, not a full
 * recursive crawl — consistent with this analyzer's stated one-level-ish
 * scope elsewhere.
 */
function findFileSuffixSignals(scanDir: string): Set<string> {
  const found = new Set<string>();

  function walk(dir: string, relativeDir: string, depth: number): void {
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
        walk(path.join(dir, entry.name), entryRelPath, depth + 1);
      } else if (entry.isFile()) {
        const match = entry.name.match(FILE_SUFFIX_PATTERN);
        if (match?.[1]) {
          found.add(match[1].toLowerCase());
        }
      }
    }
  }

  walk(scanDir, "", 0);
  return found;
}

/** Repo-root only — checks src/ if it exists, else the repo root itself. */
export function analyzeDirectory(repoPath: string): DirectoryAnalyzerResult {
  const srcPath = path.join(repoPath, "src");
  const scanDir = fs.existsSync(srcPath) ? srcPath : repoPath;

  const subdirectoryNames = new Set(listSubdirectoryNames(scanDir));
  const directoryMatches = CANDIDATE_DIRECTORY_NAMES.filter((name) => subdirectoryNames.has(name));
  const fileSuffixMatches = findFileSuffixSignals(scanDir);

  const matched = [...new Set([...directoryMatches, ...fileSuffixMatches])];

  if (matched.length === 0) {
    return {
      signals: {
        value: null,
        confidence: "unknown",
        reason: "no known architecture-convention directory names or file-naming suffixes found",
      },
    };
  }

  return {
    signals: {
      value: matched,
      // "detected", not "likely" — the directory/file's existence is a
      // plain fact, not an inference. What it implies is out of scope here.
      confidence: "detected",
      reason: `found: ${matched.join(", ")}`,
    },
  };
}
