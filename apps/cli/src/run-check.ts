import type { Finding } from "@ai-zoll/analyzer";
import { analyzeRepository } from "@ai-zoll/analyzer";
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
 * Deliberately out of scope for this first slice (Rule 1): import-boundary
 * violations and "undocumented directory" detection, both named in spec
 * §27's example report. Those need real static import-graph analysis and a
 * documented-vs-actual directory baseline respectively — genuinely
 * different mechanisms from this field-comparison approach, not smaller
 * versions of it. See docs/plan/03-roadmap.md Phase 11 for the follow-up.
 */
export function runCheck(projectDir: string): RunCheckResult {
  const state = readProjectState(projectDir);
  const analysis = analyzeRepository(projectDir);
  const { blueprint } = state;

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

  return { projectDir, drift };
}
