import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { generateSkills } from "@ai-software-zoll/generators";

interface ClaudeSkillMeta {
  name: string;
  description: string;
}

/**
 * Claude Code discovers skills via YAML frontmatter (name/description) at
 * the top of SKILL.md — packages/generators' canonical skills have none
 * (frontmatter is a Claude-specific convention; the generic layer must stay
 * agent-agnostic, Rule 8). This map supplies it, one entry per skill id that
 * actually exists in packages/generators today.
 */
const CLAUDE_SKILL_FRONTMATTER: Record<string, ClaudeSkillMeta> = {
  testing: {
    name: "testing",
    description:
      "Use when writing or modifying tests, or adding new functionality that requires test coverage.",
  },
};

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Transforms one canonical skill file into Claude Code's convention:
 * relocates it under .claude/ and prepends frontmatter. Throws rather than
 * silently emitting a frontmatter-less (and therefore undiscoverable) skill
 * file if packages/generators ever adds a skill id this map doesn't know
 * about yet.
 */
export function remapSkillFileForClaude(file: GeneratedFile): GeneratedFile {
  const match = file.path.match(SKILL_PATH_PATTERN);
  if (!match) {
    throw new Error(
      `Unexpected skill file path "${file.path}" — expected "skills/<id>/SKILL.md".`,
    );
  }

  const skillId = match[1] as string;
  const meta = CLAUDE_SKILL_FRONTMATTER[skillId];
  if (!meta) {
    throw new Error(
      `No Claude frontmatter mapping for skill "${skillId}" — add one to ` +
        `CLAUDE_SKILL_FRONTMATTER in generate-claude-skills.ts.`,
    );
  }

  return {
    path: `.claude/${file.path}`,
    content: `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n\n${file.content}`,
  };
}

export function generateClaudeSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForClaude);
}
