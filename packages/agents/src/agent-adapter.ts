import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";

/**
 * AgentAdapter abstraction (spec §21). Only `id`, `generateInstructions`, and
 * `generateSkills` are declared here so far. The full spec interface also
 * has:
 *
 *   generateRules(blueprint): GeneratedFile[]      (meaning is agent-specific
 *     and not yet defined for any agent — needs its own scoping pass)
 *   validate(blueprint): ValidationResult           (needs a ValidationResult
 *     shape that doesn't exist yet)
 *
 * Those aren't declared yet because designing them now would mean guessing
 * at capabilities no adapter implements (Rule 1). Add them to this interface
 * when their respective unit starts.
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
}
