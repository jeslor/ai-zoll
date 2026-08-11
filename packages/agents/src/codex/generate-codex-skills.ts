import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { generateSkills } from "@ai-zoll/generators";
import type { AgentSkillMeta } from "../shared-skill-remap";
import { remapSkillFile } from "../shared-skill-remap";

/**
 * Codex CLI's skill convention is structurally identical to Claude's:
 * .codex/skills/<name>/SKILL.md, one level deep, YAML frontmatter with name
 * and description. Source:
 * https://www.agensi.io/learn/where-are-codex-cli-skills-stored
 */
export const CODEX_SKILL_FRONTMATTER: Record<string, AgentSkillMeta> = {
  testing: {
    name: "testing",
    description:
      "Use when writing or modifying tests, or adding new functionality that requires test coverage.",
  },
};

export function remapSkillFileForCodex(file: GeneratedFile): GeneratedFile {
  return remapSkillFile(file, ".codex", CODEX_SKILL_FRONTMATTER, "Codex");
}

export function generateCodexSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForCodex);
}
