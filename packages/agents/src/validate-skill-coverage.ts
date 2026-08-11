import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import { generateSkills } from "@ai-software-zoll/generators";
import type { ValidationResult } from "./agent-adapter";

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

/**
 * Checks whether every skill this Blueprint would trigger (via
 * packages/generators' generateSkills) has an entry in the given
 * frontmatter map — i.e., whether this adapter's generateSkills would
 * succeed without throwing. Shared across all three adapters: the presence
 * check itself is agent-agnostic even though each adapter's map carries
 * different extra fields for rendering (e.g. Cursor's globs).
 */
export function validateSkillCoverage(
  blueprint: ProjectBlueprint,
  frontmatterMap: Record<string, unknown>,
): ValidationResult {
  const issues: string[] = [];

  for (const file of generateSkills(blueprint)) {
    const skillId = file.path.match(SKILL_PATH_PATTERN)?.[1];
    if (!skillId || !(skillId in frontmatterMap)) {
      issues.push(
        `No frontmatter mapping for skill "${skillId ?? file.path}".`,
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
