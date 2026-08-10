import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";

/**
 * AgentAdapter abstraction (spec §21). Only `id` and `generateInstructions`
 * are declared here — Phase 3's initial scope. The full spec interface also
 * has:
 *
 *   generateSkills(blueprint): GeneratedFile[]    (relocates/adapts
 *     packages/generators' canonical skills into this agent's own
 *     convention, e.g. .claude/skills/* for Claude)
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
}
