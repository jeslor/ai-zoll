import { analyzePackage } from "./package-analyzer";
import type { PackageAnalyzerResult } from "./package-analyzer";
import { analyzeFramework } from "./framework-analyzer";
import type { FrameworkAnalyzerResult } from "./framework-analyzer";
import { analyzeDatabase } from "./database-analyzer";
import type { DatabaseAnalyzerResult } from "./database-analyzer";
import { analyzeTests } from "./test-analyzer";
import type { TestAnalyzerResult } from "./test-analyzer";

export interface RepositoryAnalysis {
  package: PackageAnalyzerResult;
  framework: FrameworkAnalyzerResult;
  database: DatabaseAnalyzerResult;
  testing: TestAnalyzerResult;
}

/**
 * Runs every registered analyzer — no subsetting, per
 * .claude/skills/add-repo-analyzer/SKILL.md ("don't hardcode a subset if the
 * orchestrator is supposed to run 'all analyzers'"). GitAnalyzer/
 * DependencyAnalyzer/DirectoryAnalyzer extend this same shape in a later step.
 */
export function analyzeRepository(repoPath: string): RepositoryAnalysis {
  return {
    package: analyzePackage(repoPath),
    framework: analyzeFramework(repoPath),
    database: analyzeDatabase(repoPath),
    testing: analyzeTests(repoPath),
  };
}
