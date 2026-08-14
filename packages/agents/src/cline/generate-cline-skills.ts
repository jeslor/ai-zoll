import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { generateSkills } from "@ai-zoll/generators";

/**
 * Cline's skill ids known to this adapter — no per-skill metadata to store
 * (Cline's convention is plain markdown, no frontmatter requirement), so
 * this is a membership set for `validateSkillCoverage`, not a real map the
 * way Claude/Codex/Cursor/Copilot's frontmatter maps are.
 */
export const CLINE_SKILL_IDS: Record<string, true> = {
  testing: true,
};

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Relocates `skills/<id>/SKILL.md` to `.clinerules/<id>.md` — no
 * frontmatter prepended, unlike every other adapter's skill convention.
 * Uses the directory form of `.clinerules` consistently (never the
 * single-file form Cline also supports), so it can coexist with
 * `generateInstructions`' `.clinerules/project.md` without the two
 * fighting over the same path: Cline's own docs describe `.clinerules` as
 * "a file OR a directory of merged files", mutually exclusive on the
 * filesystem — committing to the directory form everywhere sidesteps that
 * conflict rather than trying to use both forms at once.
 */
export function remapSkillFileForCline(file: GeneratedFile): GeneratedFile {
  const match = file.path.match(SKILL_PATH_PATTERN);
  if (!match) {
    throw new Error(
      `Unexpected skill file path "${file.path}" — expected "skills/<id>/SKILL.md".`,
    );
  }

  const skillId = match[1] as string;
  if (!(skillId in CLINE_SKILL_IDS)) {
    throw new Error(
      `No Cline mapping for skill "${skillId}" — add one to CLINE_SKILL_IDS in generate-cline-skills.ts.`,
    );
  }

  return { path: `.clinerules/${skillId}.md`, content: file.content };
}

export function generateClineSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return generateSkills(blueprint).map(remapSkillFileForCline);
}
