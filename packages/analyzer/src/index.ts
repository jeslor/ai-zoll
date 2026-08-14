export type { Confidence, Finding } from "./finding";
export { isExcludedPath } from "./exclusion";

export { analyzePackage } from "./package-analyzer";
export type { PackageAnalyzerResult } from "./package-analyzer";

export { analyzeFramework, FRONTEND_SPECIALIZES } from "./framework-analyzer";
export type { FrameworkAnalyzerResult } from "./framework-analyzer";

export { analyzeDatabase } from "./database-analyzer";
export type { DatabaseAnalyzerResult } from "./database-analyzer";

export { analyzeTests } from "./test-analyzer";
export type { TestAnalyzerResult } from "./test-analyzer";

export { analyzeGit } from "./git-analyzer";
export type { GitAnalyzerResult } from "./git-analyzer";

export { analyzeDependencies } from "./dependency-analyzer";
export type { DependencyAnalyzerResult } from "./dependency-analyzer";

export { analyzeDirectory } from "./directory-analyzer";
export type { DirectoryAnalyzerResult } from "./directory-analyzer";

export { analyzeImportBoundaries } from "./import-boundary-analyzer";
export type { ImportBoundaryViolation } from "./import-boundary-analyzer";

export { analyzeRepository } from "./analyze-repository";
export type { RepositoryAnalysis } from "./analyze-repository";

export { discoverWorkspacePackages } from "./workspace-discovery";
export type { WorkspacePackage } from "./workspace-discovery";

export { mergeArray, mergeBoolean, mergeCategorical } from "./merge-findings";
export type { AttributedFinding } from "./merge-findings";
