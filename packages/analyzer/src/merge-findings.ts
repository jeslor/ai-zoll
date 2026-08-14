import type { Confidence, Finding } from "./finding";

export interface AttributedFinding<T> {
  /** "root" or a relative path like "apps/web" — surfaced in reason text so nothing is silently lost. */
  source: string;
  finding: Finding<T>;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { detected: 2, likely: 1, unknown: 0 };

function best<T>(findings: AttributedFinding<T>[]): AttributedFinding<T> {
  return findings.reduce((a, b) =>
    CONFIDENCE_RANK[a.finding.confidence] >= CONFIDENCE_RANK[b.finding.confidence] ? a : b,
  );
}

/**
 * Categorical single-value fields (framework.frontend/backend,
 * database.database/orm, dependency.authentication/authorization) —
 * "agree or report ambiguity" semantics. Every function in this module
 * starts with the same exact-passthrough guarantee: when only one location
 * was ever checked (no workspace packages discovered), return that finding
 * completely unchanged — this is what keeps every existing single-package
 * repo's output byte-for-byte identical to before workspace-awareness
 * existed.
 *
 * Sources with confidence "unknown" are excluded from voting entirely — a
 * frameworkless library subpackage (e.g. this repo's own packages/blueprint)
 * is a non-vote, not a disagreement. Never majority-votes: any disagreement
 * among the sources that *did* find something reports "unknown", always
 * enumerating every contributing source's value in the reason text — that
 * text is the only place this information reaches a user before analyze.ts
 * falls back to a blind prompt, so it's load-bearing, not cosmetic.
 */
export function mergeCategorical<T>(attributed: AttributedFinding<T>[]): Finding<T> {
  if (attributed.length === 1) {
    return attributed[0]!.finding;
  }

  const withValue = attributed.filter((a) => a.finding.confidence !== "unknown" && a.finding.value !== null);
  if (withValue.length === 0) {
    return {
      value: null,
      confidence: "unknown",
      reason: `no signal found in the repo root or any of ${attributed.length - 1} workspace package(s) checked`,
    };
  }

  const uniqueValues = new Set(withValue.map((a) => JSON.stringify(a.finding.value)));
  if (uniqueValues.size > 1) {
    const detail = withValue.map((a) => `${a.source}: ${String(a.finding.value)}`).join("; ");
    return {
      value: null,
      confidence: "unknown",
      reason: `multiple different values found across the repo (${detail}) — couldn't confidently pick one`,
    };
  }

  if (withValue.length === 1) {
    return withValue[0]!.finding;
  }

  const winner = best(withValue);
  const otherSources = withValue.filter((a) => a !== winner).map((a) => a.source);
  const corroboration = otherSources.length > 0 ? ` (corroborated in ${otherSources.join(", ")})` : ` (${winner.source})`;
  return {
    value: winner.finding.value,
    confidence: winner.finding.confidence,
    reason: `${winner.finding.reason}${corroboration}`,
  };
}

/**
 * Boolean fields (testing.unit/integration/e2e) — true if found true
 * *anywhere* (OR/union). The reason text always enumerates per-source
 * coverage, never just the source of the "true" — silently citing only the
 * positive source would misrepresent "has tests somewhere" as "has tests",
 * a real information loss. "false" only when every non-unknown source
 * confidently reports false.
 */
export function mergeBoolean(attributed: AttributedFinding<boolean>[]): Finding<boolean> {
  if (attributed.length === 1) {
    return attributed[0]!.finding;
  }

  const known = attributed.filter((a) => a.finding.confidence !== "unknown");
  if (known.length === 0) {
    return {
      value: null,
      confidence: "unknown",
      reason: `no signal found in the repo root or any of ${attributed.length - 1} workspace package(s) checked`,
    };
  }

  const trueSources = known.filter((a) => a.finding.value === true);
  const coverage = known.map((a) => `${a.source}: ${a.finding.value ? "yes" : "no"}`).join("; ");

  if (trueSources.length > 0) {
    const winner = best(trueSources);
    return {
      value: true,
      confidence: winner.finding.confidence,
      reason: `found in at least one location (${coverage})`,
    };
  }

  return { value: false, confidence: "detected", reason: `no signal found anywhere checked (${coverage})` };
}

/**
 * Array fields (directory.signals) — straight union, deduplicated and
 * sorted. No conflict concept at all: different subpackages having
 * different directory conventions is expected in a real monorepo (an API
 * package with controllers/services, a web package with components/hooks),
 * not ambiguous.
 */
export function mergeArray(attributed: AttributedFinding<string[]>[]): Finding<string[]> {
  if (attributed.length === 1) {
    return attributed[0]!.finding;
  }

  const withValue = attributed.filter(
    (a): a is AttributedFinding<string[]> & { finding: { value: string[] } } =>
      a.finding.value !== null && a.finding.value.length > 0,
  );
  if (withValue.length === 0) {
    return {
      value: null,
      confidence: "unknown",
      reason: "no known architecture-convention directory names found anywhere in the repo",
    };
  }

  const union = new Set<string>();
  for (const a of withValue) {
    for (const name of a.finding.value) {
      union.add(name);
    }
  }
  const perSource = withValue.map((a) => `${a.source}: ${a.finding.value.join(", ")}`).join("; ");
  return { value: [...union].sort(), confidence: "detected", reason: `found across the repo (${perSource})` };
}
