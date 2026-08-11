import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { generateSkills } from "@ai-zoll/generators";
import { renderMdcFrontmatter } from "./mdc-frontmatter";

interface CursorSkillMeta {
  description: string;
  globs: string[];
}

/**
 * Cursor's "Auto Attached" rules (loaded only when matching files are open,
 * via globs) are conceptually Cursor's version of a contextual skill — a
 * closer match to spec §20's "skills" idea than Claude's description-
 * triggered model. One entry per skill id that actually exists in
 * packages/generators today. Globs are standard Jest/Vitest test-file
 * naming, not Blueprint-derived.
 */
export const CURSOR_SKILL_FRONTMATTER: Record<string, CursorSkillMeta> = {
  testing: {
    description:
      "Use when writing or modifying tests, or adding new functionality that requires test coverage.",
    globs: ["**/*.test.*", "**/*.spec.*"],
  },
};

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Transforms one canonical skill file into Cursor's convention: relocates
 * it to .cursor/rules/<id>.mdc and prepends frontmatter (alwaysApply:
 * false — loaded contextually, not globally). Throws rather than silently
 * emitting a frontmatter-less (and therefore ignored — see cursor-adapter.ts)
 * rule file if packages/generators ever adds a skill id this map doesn't
 * know about yet.
 */
export function remapSkillFileForCursor(file: GeneratedFile): GeneratedFile {
  const match = file.path.match(SKILL_PATH_PATTERN);
  if (!match) {
    throw new Error(
      `Unexpected skill file path "${file.path}" — expected "skills/<id>/SKILL.md".`,
    );
  }

  const skillId = match[1] as string;
  const meta = CURSOR_SKILL_FRONTMATTER[skillId];
  if (!meta) {
    throw new Error(
      `No Cursor frontmatter mapping for skill "${skillId}" — add one to ` +
        `CURSOR_SKILL_FRONTMATTER in generate-cursor-skills.ts.`,
    );
  }

  const frontmatter = renderMdcFrontmatter({
    description: meta.description,
    globs: meta.globs,
    alwaysApply: false,
  });

  return {
    path: `.cursor/rules/${skillId}.mdc`,
    content: `${frontmatter}${file.content}`,
  };
}

export function generateCursorSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForCursor);
}
