import {
  CURRENT_BLUEPRINT_VERSION,
  safeParseBlueprint,
  BlueprintValidationError,
  type ProjectBlueprint,
} from "@ai-zoll/blueprint";
import type { RepositoryAnalysis } from "@ai-zoll/analyzer";
import type { AIProvider, BlueprintInput } from "../provider";
import type { RepositoryInsights } from "../insights";

/**
 * Deterministic, non-AI implementation of AIProvider. Stamps the current
 * Blueprint version onto the given input and validates the result — proving
 * the Project -> Blueprint pipeline works with zero external LLM dependency
 * (spec §37 Phase 1). This validate-or-throw shape is the same one a real,
 * LLM-backed provider will reuse in Phase 4.
 */
export class MockAIProvider implements AIProvider {
  async generateBlueprint(input: BlueprintInput): Promise<ProjectBlueprint> {
    const candidate = {
      ...input,
      version: CURRENT_BLUEPRINT_VERSION,
    };

    const result = safeParseBlueprint(candidate);

    if (!result.success) {
      throw new BlueprintValidationError(result.issues);
    }

    return result.data;
  }

  /**
   * No interpretation performed — Mock never calls a real LLM, matching
   * generateBlueprint's zero-AI guarantee. Exists purely for interface
   * conformance and to keep this path testable without a key; the CLI
   * never actually calls interpretRepository on a Mock instance, since
   * `ai-zoll analyze --ai` only invokes it when `--ai` selected the real
   * provider (see apps/cli/src/commands/analyze.ts).
   */
  async interpretRepository(_analysis: RepositoryAnalysis): Promise<RepositoryInsights> {
    return {
      businessDomains: [],
      modules: [],
      architecturalPatterns: [],
      conventions: [],
      importantDependencies: [],
      testingPatterns: [],
      securityPatterns: [],
      undocumentedConventions: [],
      inconsistencies: [],
      missingDocumentation: [],
    };
  }
}
