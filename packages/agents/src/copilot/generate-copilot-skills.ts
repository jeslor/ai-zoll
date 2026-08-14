import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { generateSkills } from "@ai-zoll/generators";
import { renderCopilotInstructionsFrontmatter } from "./copilot-frontmatter";

interface CopilotSkillMeta {
  applyTo: string[];
}

/**
 * Path-specific custom instructions (.github/instructions/<id>.instructions.md,
 * "applyTo" glob frontmatter) are Copilot's closest analog to a contextual
 * skill — loaded only when matching files are open, the same idea as
 * Cursor's "Auto Attached" rules. One entry per skill id that actually
 * exists in packages/generators today. Globs are standard Jest/Vitest
 * test-file naming, not Blueprint-derived. Source:
 * https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
 */
export const COPILOT_SKILL_FRONTMATTER: Record<string, CopilotSkillMeta> = {
  testing: {
    applyTo: ["**/*.test.*", "**/*.spec.*"],
  },
};

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Transforms one canonical skill file into Copilot's convention: relocates
 * it to .github/instructions/<id>.instructions.md and prepends "applyTo"
 * frontmatter. Throws rather than silently emitting a frontmatter-less
 * (and therefore ignored) instructions file if packages/generators ever
 * adds a skill id this map doesn't know about yet.
 */
export function remapSkillFileForCopilot(file: GeneratedFile): GeneratedFile {
  const match = file.path.match(SKILL_PATH_PATTERN);
  if (!match) {
    throw new Error(
      `Unexpected skill file path "${file.path}" — expected "skills/<id>/SKILL.md".`,
    );
  }

  const skillId = match[1] as string;
  const meta = COPILOT_SKILL_FRONTMATTER[skillId];
  if (!meta) {
    throw new Error(
      `No Copilot frontmatter mapping for skill "${skillId}" — add one to ` +
        `COPILOT_SKILL_FRONTMATTER in generate-copilot-skills.ts.`,
    );
  }

  const frontmatter = renderCopilotInstructionsFrontmatter({ applyTo: meta.applyTo });

  return {
    path: `.github/instructions/${skillId}.instructions.md`,
    content: `${frontmatter}${file.content}`,
  };
}

export function generateCopilotSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForCopilot);
}
