import { analyzePackage } from "./package-analyzer";
import type { PackageAnalyzerResult } from "./package-analyzer";
import { analyzeFramework } from "./framework-analyzer";
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

export interface RepositoryAnalysis {
  package: PackageAnalyzerResult;
  framework: FrameworkAnalyzerResult;
  database: DatabaseAnalyzerResult;
  testing: TestAnalyzerResult;
  git: GitAnalyzerResult;
  dependency: DependencyAnalyzerResult;
  directory: DirectoryAnalyzerResult;
}

/**
 * Runs every registered analyzer — no subsetting, per
 * .claude/skills/add-repo-analyzer/SKILL.md ("don't hardcode a subset if the
 * orchestrator is supposed to run 'all analyzers'").
 */
export function analyzeRepository(repoPath: string): RepositoryAnalysis {
  return {
    package: analyzePackage(repoPath),
    framework: analyzeFramework(repoPath),
    database: analyzeDatabase(repoPath),
    testing: analyzeTests(repoPath),
    git: analyzeGit(repoPath),
    dependency: analyzeDependencies(repoPath),
    directory: analyzeDirectory(repoPath),
  };
}
