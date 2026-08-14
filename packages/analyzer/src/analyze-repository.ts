import { analyzePackage } from "./package-analyzer";
import type { PackageAnalyzerResult } from "./package-analyzer";
import { analyzeFramework, FRONTEND_SPECIALIZES } from "./framework-analyzer";
import type { FrameworkAnalyzerResult } from "./framework-analyzer";
import { analyzeDatabase } from "./database-analyzer";
import type { DatabaseAnalyzerResult } from "./database-analyzer";
import { analyzeTests } from "./test-analyzer";
import type { TestAnalyzerResult } from "./test-analyzer";
import { analyzeGit } from "./git-analyzer";
import type { GitAnalyzerResult } from "./git-analyzer";
import { analyzeDependencies } from "./dependency-analyzer";
import type { DependencyAnalyzerResult } from "./dependency-analyzer";
import { analyzeDirectory } from "./directory-analyzer";
import type { DirectoryAnalyzerResult } from "./directory-analyzer";
import { discoverWorkspacePackages } from "./workspace-discovery";
import { mergeArray, mergeBoolean, mergeCategorical } from "./merge-findings";
import type { AttributedFinding } from "./merge-findings";
import type { Finding } from "./finding";

export interface RepositoryAnalysis {
  package: PackageAnalyzerResult;
  framework: FrameworkAnalyzerResult;
  database: DatabaseAnalyzerResult;
  testing: TestAnalyzerResult;
  git: GitAnalyzerResult;
  dependency: DependencyAnalyzerResult;
  directory: DirectoryAnalyzerResult;
}

interface Location {
  path: string;
  relativePath: string;
}

function attribute<T>(locations: Location[], findings: Finding<T>[]): AttributedFinding<T>[] {
  // biome-ignore lint/style/noNonNullAssertion: findings is built by mapping over locations, so the arrays are always parallel
  return findings.map((finding, i) => ({ source: locations[i]!.relativePath, finding }));
}

/**
 * Runs every registered analyzer — no subsetting, per
 * .claude/skills/add-repo-analyzer/SKILL.md ("don't hardcode a subset if the
 * orchestrator is supposed to run 'all analyzers'"). `PackageAnalyzer` and
 * `GitAnalyzer` stay root-only (name/description/git-remote are inherently
 * root-level concepts). The other five analyzers each already accept an
 * arbitrary path — they're unchanged; this function runs them against the
 * repo root plus every discovered workspace package, then merges the
 * per-location findings with the matching strategy (see merge-findings.ts).
 * A single-package repo (no workspace packages discovered) degrades to
 * exactly one location, and every merge function passes that finding
 * through completely unchanged — this is what keeps every pre-existing,
 * non-monorepo analyzer test passing without modification.
 */
export function analyzeRepository(repoPath: string): RepositoryAnalysis {
  const locations: Location[] = [
    { path: repoPath, relativePath: "root" },
    ...discoverWorkspacePackages(repoPath).map((pkg) => ({ path: pkg.path, relativePath: pkg.relativePath })),
  ];

  const frameworkResults = locations.map((loc) => analyzeFramework(loc.path));
  const databaseResults = locations.map((loc) => analyzeDatabase(loc.path));
  const testingResults = locations.map((loc) => analyzeTests(loc.path));
  const dependencyResults = locations.map((loc) => analyzeDependencies(loc.path));
  const directoryResults = locations.map((loc) => analyzeDirectory(loc.path));

  return {
    package: analyzePackage(repoPath),
    git: analyzeGit(repoPath),
    framework: {
      // Only frontend gets `specializes` — no equivalent unconditional
      // meta/base relationship exists for backend (NestJS runs on either
      // Express or Fastify depending on which adapter package is used;
      // it doesn't unconditionally imply one, unlike a Next.js app always
      // having react). See merge-findings.ts's docblock.
      frontend: mergeCategorical(
        attribute(locations, frameworkResults.map((r) => r.frontend)),
        FRONTEND_SPECIALIZES,
      ),
      backend: mergeCategorical(attribute(locations, frameworkResults.map((r) => r.backend))),
    },
    database: {
      database: mergeCategorical(attribute(locations, databaseResults.map((r) => r.database))),
      orm: mergeCategorical(attribute(locations, databaseResults.map((r) => r.orm))),
    },
    testing: {
      unit: mergeBoolean(attribute(locations, testingResults.map((r) => r.unit))),
      integration: mergeBoolean(attribute(locations, testingResults.map((r) => r.integration))),
      e2e: mergeBoolean(attribute(locations, testingResults.map((r) => r.e2e))),
    },
    dependency: {
      authentication: mergeCategorical(attribute(locations, dependencyResults.map((r) => r.authentication))),
      authorization: mergeCategorical(attribute(locations, dependencyResults.map((r) => r.authorization))),
    },
    directory: {
      signals: mergeArray(attribute(locations, directoryResults.map((r) => r.signals))),
    },
  };
}
