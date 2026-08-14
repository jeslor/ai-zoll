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
 * Resolves a disagreement that isn't really a disagreement: one source
 * found a meta-framework (e.g. "nextjs") and another found exactly the
 * base framework it always bundles (e.g. "react") — both facts are true
 * simultaneously, not conflicting ones. Returns null (defer to the normal
 * "unknown, disagreement" path) unless *every* distinct value present is
 * explained by a single meta/base pair — two different meta-frameworks
 * (e.g. "nextjs" and "nuxt"), or a base value the winning meta doesn't
 * imply, are still real disagreements.
 */
function resolveSpecialization<T>(
  withValue: AttributedFinding<T>[],
  specializes: Record<string, string>,
): Finding<T> | null {
  const distinctValues = [...new Set(withValue.map((a) => String(a.finding.value)))];
  const metaValues = distinctValues.filter((v) => v in specializes);
  if (metaValues.length !== 1) {
    return null;
  }
  // biome-ignore lint/style/noNonNullAssertion: metaValues.length === 1 just confirmed above
  const meta = metaValues[0]!;
  // biome-ignore lint/style/noNonNullAssertion: meta passed the `v in specializes` filter above
  const impliedBase = specializes[meta]!;
  const unexplained = distinctValues.filter((v) => v !== meta && v !== impliedBase);
  if (unexplained.length > 0) {
    return null;
  }

  const metaSources = withValue.filter((a) => String(a.finding.value) === meta);
  const baseSources = withValue.filter((a) => String(a.finding.value) === impliedBase);
  const winner = best(metaSources);
  const corroboration = baseSources.map((a) => a.source).join(", ");
  return {
    value: winner.finding.value,
    confidence: winner.finding.confidence,
    reason: `${winner.finding.reason} (implies "${impliedBase}"; corroborated in ${corroboration}, which uses the base framework directly)`,
  };
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
 *
 * `specializes` is optional and purely additive (omitted by every call site
 * except `framework.frontend` — see `analyze-repository.ts`): a map from a
 * more-specific value to the less-specific base value it unconditionally
 * implies (`{ nextjs: "react" }`). Found necessary by dogfooding against
 * real monorepos (cal.com, SvelteKit's own repo) where some packages
 * depend on a meta-framework and others only on its base library — without
 * this, that's misreported as a disagreement instead of corroboration.
 * Deliberately narrow: only a true, unconditional "always implies"
 * relationship belongs here, never a common-but-optional pairing.
 */
export function mergeCategorical<T>(
  attributed: AttributedFinding<T>[],
  specializes?: Record<string, string>,
): Finding<T> {
  if (attributed.length === 1) {
    // biome-ignore lint/style/noNonNullAssertion: length === 1 just checked
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
    if (specializes) {
      const resolved = resolveSpecialization(withValue, specializes);
      if (resolved) {
        return resolved;
      }
    }
    const detail = withValue.map((a) => `${a.source}: ${String(a.finding.value)}`).join("; ");
    return {
      value: null,
      confidence: "unknown",
      reason: `multiple different values found across the repo (${detail}) — couldn't confidently pick one`,
    };
  }

  if (withValue.length === 1) {
    // biome-ignore lint/style/noNonNullAssertion: length === 1 just checked
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
    // biome-ignore lint/style/noNonNullAssertion: length === 1 just checked
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
    // biome-ignore lint/style/noNonNullAssertion: length === 1 just checked
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
