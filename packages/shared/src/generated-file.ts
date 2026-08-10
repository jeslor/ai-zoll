/**
 * A single file produced by a generator (packages/generators) or an
 * AgentAdapter (packages/agents). Both are independent, parallel consumers
 * of the Blueprint (see docs/plan/00-overview.md's architecture diagram),
 * so this shared shape lives here rather than being owned/duplicated by
 * either one.
 */
export interface GeneratedFile {
  /** Path relative to the generated workspace root, e.g. "PROJECT.md". */
  path: string;
  content: string;
}
