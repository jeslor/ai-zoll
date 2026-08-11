import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { generateSkills } from "@ai-software-zoll/generators";
import type { AgentSkillMeta } from "../shared-skill-remap";
import { remapSkillFile } from "../shared-skill-remap";

/**
 * Claude Code discovers skills via YAML frontmatter (name/description) at
 * the top of SKILL.md — packages/generators' canonical skills have none
 * (frontmatter is a Claude-specific convention; the generic layer must stay
 * agent-agnostic, Rule 8). This map supplies it, one entry per skill id that
 * actually exists in packages/generators today.
 */
export const CLAUDE_SKILL_FRONTMATTER: Record<string, AgentSkillMeta> = {
  testing: {
    name: "testing",
    description:
      "Use when writing or modifying tests, or adding new functionality that requires test coverage.",
  },
};

/**
 * Transforms one canonical skill file into Claude Code's convention:
 * relocates it under .claude/ and prepends frontmatter. Throws rather than
 * silently emitting a frontmatter-less (and therefore undiscoverable) skill
 * file if packages/generators ever adds a skill id this map doesn't know
 * about yet.
 */
export function remapSkillFileForClaude(file: GeneratedFile): GeneratedFile {
  return remapSkillFile(file, ".claude", CLAUDE_SKILL_FRONTMATTER, "Claude");
}

export function generateClaudeSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForClaude);
}
