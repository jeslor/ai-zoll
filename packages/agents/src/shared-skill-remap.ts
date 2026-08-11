import type { GeneratedFile } from "@ai-zoll/shared";

export interface AgentSkillMeta {
  name: string;
  description: string;
}

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Shared by adapters whose skill-file convention is "relocate under
 * <agentDir>/skills/<id>/SKILL.md, prepend name/description frontmatter" —
 * currently Claude and Codex, whose skill conventions turn out to be
 * structurally identical. Cursor's convention differs enough (globs/
 * alwaysApply, .mdc extension, flat filename) that it stays a separate
 * implementation rather than being forced into this one.
 */
export function remapSkillFile(
  file: GeneratedFile,
  agentDir: string,
  frontmatterMap: Record<string, AgentSkillMeta>,
  mapLabel: string,
): GeneratedFile {
  const match = file.path.match(SKILL_PATH_PATTERN);
  if (!match) {
    throw new Error(
      `Unexpected skill file path "${file.path}" — expected "skills/<id>/SKILL.md".`,
    );
  }

  const skillId = match[1] as string;
  const meta = frontmatterMap[skillId];
  if (!meta) {
    throw new Error(
      `No ${mapLabel} frontmatter mapping for skill "${skillId}" — add one to ` +
        `the frontmatter map for this adapter.`,
    );
  }

  return {
    path: `${agentDir}/${file.path}`,
    content: `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n\n${file.content}`,
  };
}
