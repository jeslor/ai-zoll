import { ProjectBlueprintSchema } from "../schemas/blueprint.schema";
import type { ProjectBlueprint } from "../types";
import { BlueprintValidationError } from "./errors";
import type { BlueprintValidationIssue } from "./errors";

export type BlueprintValidationResult =
  | { success: true; data: ProjectBlueprint }
  | { success: false; issues: BlueprintValidationIssue[] };

/**
 * Validates an unknown value against the current Blueprint schema without
 * throwing. This is the shape Phase 4's "validate the AI response, retry or
 * repair on failure" flow (spec §33/§34, Rule 9) branches on.
 */
export function safeParseBlueprint(input: unknown): BlueprintValidationResult {
  const result = ProjectBlueprintSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues: BlueprintValidationIssue[] = result.error.issues.map(
    (issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }),
  );

  return { success: false, issues };
}

/**
 * Convenience wrapper for callers that want to fail fast (e.g. loading a
 * local blueprint.json from disk) rather than branch on a result object.
 */
export function parseBlueprint(input: unknown): ProjectBlueprint {
  const result = safeParseBlueprint(input);

  if (!result.success) {
    throw new BlueprintValidationError(result.issues);
  }

  return result.data;
}
