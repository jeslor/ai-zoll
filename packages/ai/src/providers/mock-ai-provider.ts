import {
  CURRENT_BLUEPRINT_VERSION,
  safeParseBlueprint,
  BlueprintValidationError,
  type ProjectBlueprint,
} from "@ai-software-zoll/blueprint";
import type { AIProvider, BlueprintInput } from "../provider";

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
}
