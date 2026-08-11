import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";

/** Result of checking whether an adapter can generate for a given Blueprint. */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * AgentAdapter abstraction (spec §21) — now fully declared: `id`,
 * `generateInstructions`, `generateSkills`, `generateRules`, `validate`.
 */
export interface AgentAdapter {
  /** Stable, lowercase identifier, e.g. "claude". */
  id: string;
  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[];
  /**
   * Relocates/adapts packages/generators' canonical, agent-agnostic skills
   * into this agent's own convention (e.g. .claude/skills/* for Claude).
   * May return zero files if the underlying canonical generator did.
   */
  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[];
  /**
   * Agent-specific rule files, distinct from generateInstructions (always-
   * loaded) and generateSkills (contextually loaded). May legitimately
   * return zero files — see each adapter's implementation for why.
   */
  generateRules(blueprint: ProjectBlueprint): GeneratedFile[];
  /**
   * Checks whether this adapter can generate for the given Blueprint
   * without error — currently: whether every skill packages/generators
   * would produce has a frontmatter mapping in this adapter.
   */
  validate(blueprint: ProjectBlueprint): ValidationResult;
}
