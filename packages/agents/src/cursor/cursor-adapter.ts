import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderAgentInstructions } from "@ai-zoll/generators";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";
import {
  generateCursorSkills,
  CURSOR_SKILL_FRONTMATTER,
} from "./generate-cursor-skills";
import { renderMdcFrontmatter } from "./mdc-frontmatter";
import { validateSkillCoverage } from "../validate-skill-coverage";

/**
 * Cursor's current (2026) convention is .cursor/rules/*.mdc — YAML
 * frontmatter (description/globs/alwaysApply) plus a markdown body. The
 * .mdc extension is load-bearing: a plain .md file in .cursor/rules/ is
 * silently ignored by Cursor's rules system. Source: https://cursor.com/docs/rules
 *
 * One comprehensive, always-applied project.mdc for now (not split into
 * multiple concern-scoped files, which is Cursor's own best-practice
 * recommendation for token efficiency but a bigger unit than proving the
 * adapter pattern for a second agent).
 */
export class CursorAdapter implements AgentAdapter {
  readonly id = "cursor";

  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[] {
    const frontmatter = renderMdcFrontmatter({
      description: `Project context: architecture, stack, testing and security conventions for ${blueprint.project.name}`,
      globs: [],
      alwaysApply: true,
    });

    return [
      {
        path: ".cursor/rules/project.mdc",
        content: `${frontmatter}${renderAgentInstructions(blueprint, "Project Instructions")}`,
      },
    ];
  }

  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
    return generateCursorSkills(blueprint);
  }

  /**
   * Cursor's "rules" ARE the .mdc files — already fully used by
   * generateInstructions (always-applied project.mdc) and generateSkills
   * (glob-scoped per-skill .mdc). There's no third category of content left
   * to generate without inventing it, so this returns [].
   */
  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  validate(blueprint: ProjectBlueprint): ValidationResult {
    return validateSkillCoverage(blueprint, CURSOR_SKILL_FRONTMATTER);
  }
}
