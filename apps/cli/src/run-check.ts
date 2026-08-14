import type { Finding, ImportBoundaryViolation } from "@ai-zoll/analyzer";
import { analyzeRepository, analyzeImportBoundaries } from "@ai-zoll/analyzer";
import { readProjectState } from "./project-state";

export interface DriftEntry {
  /** Dot-path into the Blueprint, e.g. "stack.frontend" — stable, greppable. */
  field: string;
  label: string;
  /** Stringified for uniform display — booleans and strings both land here. */
  expected: string;
  actual: string;
  /** Never "unknown" — an unknown finding is skipped entirely, not reported as drift. */
  confidence: "detected" | "likely";
}

export interface RunCheckResult {
  projectDir: string;
  drift: DriftEntry[];
  /**
   * Directory-convention names found now that weren't in the last recorded
   * snapshot (spec §27's "undocumented directories" example) — a genuinely
   * different kind of finding from `drift` (a set newly containing more
   * things, not a single expected value not matching an actual one), so it
   * isn't forced into `DriftEntry`'s shape. Always empty for a project
   * whose `state.json` predates this feature (no baseline recorded yet) —
   * never treated as "every current signal is new".
   */
  newDirectoryConventions: string[];
  /**
   * The Dependency Rule (inner business-logic code must never import outer
   * framework/infrastructure code), checked when `blueprint.architecture.style`
   * is one of the styles that uses it — see `analyzeImportBoundaries`.
   * Always `[]` for "modular" (a different rule shape) or when the repo
   * doesn't have both an inner- and outer-layer directory to compare.
   */
  importBoundaryViolations: ImportBoundaryViolation[];
}

function compare<T>(
  field: string,
  label: string,
  expected: T,
  finding: Finding<T>,
): DriftEntry | null {
  if (finding.confidence === "unknown" || finding.value === expected) {
    return null;
  }
  return {
    field,
    label,
    expected: String(expected),
    actual: String(finding.value),
    confidence: finding.confidence,
  };
}

/**
 * Compares the stored Blueprint (spec §27's "expected architecture")
 * against a fresh `analyzeRepository()` scan (its "actual repository")
 * for every field the deterministic analyzers can independently observe —
 * stack, testing, and security. An "unknown" finding is never treated as
 * drift (no evidence either way, not evidence of a mismatch), matching how
 * `analyze`/`sync` already treat analyzer confidence elsewhere. Requires an
 * already-`ai-zoll`-initialized project, same precondition as `sync`.
 *
 * Also reports newly-appeared directory conventions since the last
 * recorded baseline (see `newDirectoryConventions` on `RunCheckResult`) and
 * import-boundary violations of the Dependency Rule (see
 * `importBoundaryViolations`), when the declared architecture style uses
 * that rule.
 */
export function runCheck(projectDir: string): RunCheckResult {
  const state = readProjectState(projectDir);
  const analysis = analyzeRepository(projectDir);
  const { blueprint } = state;

  const previousSignals = new Set(state.directorySignals ?? []);
  const currentSignals = analysis.directory.signals.value ?? [];
  const newDirectoryConventions =
    state.directorySignals === undefined
      ? []
      : currentSignals.filter((signal) => !previousSignals.has(signal));

  const importBoundaryViolations = analyzeImportBoundaries(projectDir, blueprint.architecture.style);

  const drift = [
    compare("stack.frontend", "Frontend", blueprint.stack.frontend, analysis.framework.frontend),
    compare("stack.backend", "Backend", blueprint.stack.backend, analysis.framework.backend),
    compare("stack.database", "Database", blueprint.stack.database, analysis.database.database),
    compare("stack.orm", "ORM", blueprint.stack.orm, analysis.database.orm),
    compare("testing.unit", "Unit testing", blueprint.testing.unit, analysis.testing.unit),
    compare(
      "testing.integration",
      "Integration testing",
      blueprint.testing.integration,
      analysis.testing.integration,
    ),
    compare("testing.e2e", "E2E testing", blueprint.testing.e2e, analysis.testing.e2e),
    compare(
      "security.authentication",
      "Authentication",
      blueprint.security.authentication,
      analysis.dependency.authentication,
    ),
    compare(
      "security.authorization",
      "Authorization",
      blueprint.security.authorization,
      analysis.dependency.authorization,
    ),
  ].filter((entry): entry is DriftEntry => entry !== null);

  return { projectDir, drift, newDirectoryConventions, importBoundaryViolations };
}
