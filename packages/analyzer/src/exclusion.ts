/**
 * Patterns from docs/plan/05-security-and-privacy.md's "Never upload" list —
 * analyzers must never read the *contents* of these, even for local-only
 * analysis (defense in depth, not just a network-transmission gate).
 * node_modules/.git are excluded for traversal safety/performance, not secrecy.
 */
const EXCLUDED_SEGMENT_PATTERNS: RegExp[] = [
  /^node_modules$/,
  /^\.git$/,
  /^\.env(\..*)?$/,
  /\.pem$/,
  /\.key$/,
  /^id_rsa$/,
  /^credentials\.json$/,
];

/**
 * This gate is for *open-ended traversal* only (e.g. TestAnalyzer's directory
 * walk) — it does not forbid a targeted, known-safe read of one specific
 * file whose path happens to contain an excluded segment. `.git` is excluded
 * here so a walk doesn't wander into its internal object store, but
 * `.git/config` itself contains remote URLs, not secrets — GitAnalyzer reads
 * it directly by exact path, the same way DatabaseAnalyzer reads
 * `prisma/schema.prisma` directly, neither going through this function.
 *
 * Checks a path relative to the repo root (may contain multiple segments,
 * e.g. "apps/api/.env.local") — excluded if *any* segment matches.
 */
export function isExcludedPath(relativePath: string): boolean {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  return segments.some((segment) =>
    EXCLUDED_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)),
  );
}
