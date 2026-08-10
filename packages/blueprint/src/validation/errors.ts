/**
 * A single validation problem, decoupled from Zod's internal issue format so
 * downstream consumers (API error responses, the future AI "validate then
 * repair" loop from spec §33/§34) don't couple themselves to a specific
 * validation library.
 */
export interface BlueprintValidationIssue {
  path: string;
  message: string;
}

export class BlueprintValidationError extends Error {
  readonly issues: BlueprintValidationIssue[];

  constructor(issues: BlueprintValidationIssue[]) {
    super(
      `Invalid ProjectBlueprint: ${issues
        .map((issue) => `${issue.path || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
    this.name = "BlueprintValidationError";
    this.issues = issues;
  }
}
