import type { Finding, RepositoryAnalysis } from "@ai-zoll/analyzer";

const unknownString: Finding<string> = { value: null, confidence: "unknown", reason: "test fixture" };
const unknownBoolean: Finding<boolean> = { value: null, confidence: "unknown", reason: "test fixture" };
const unknownArray: Finding<string[]> = { value: null, confidence: "unknown", reason: "test fixture" };

/** All-unknown, so this fixture stays valid regardless of what a test's mock response asserts about it — it's the AI request's input, never its output. */
export const minimalRepositoryAnalysis: RepositoryAnalysis = {
  package: { name: unknownString, description: unknownString },
  framework: { frontend: unknownString, backend: unknownString },
  database: { database: unknownString, orm: unknownString },
  testing: { unit: unknownBoolean, integration: unknownBoolean, e2e: unknownBoolean },
  git: { projectName: unknownString, hasMonorepoLayout: unknownBoolean },
  dependency: { authentication: unknownString, authorization: unknownString },
  directory: { signals: unknownArray },
};
