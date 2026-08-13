/**
 * A three-tier enum, not a numeric score — a numeric confidence (e.g. 0.87)
 * implies precision this tool can't actually justify. Matches the "never
 * pretend certainty" rule in .claude/skills/add-repo-analyzer/SKILL.md.
 */
export type Confidence = "detected" | "likely" | "unknown";

export interface Finding<T> {
  /** null when confidence is "unknown" — there's nothing to report. */
  value: T | null;
  confidence: Confidence;
  /** Short justification, e.g. `found "next" in dependencies`. */
  reason: string;
}
