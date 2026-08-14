import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderAgentInstructions } from "@ai-zoll/generators";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";
import { generateClineSkills, CLINE_SKILL_IDS } from "./generate-cline-skills";
import { validateSkillCoverage } from "../validate-skill-coverage";

/**
 * Cline discovers project instructions at `.clinerules` — either a single
 * file, or a directory of markdown files that get merged together (the
 * form this adapter uses consistently, see `generate-cline-skills.ts`).
 * Plain markdown, no frontmatter requirement. Cline's own guidance
 * recommends keeping the combined content under ~150 lines. Source:
 * researched in `docs/decisions/0003-agent-adapter-pattern.md`'s "Future
 * adapter candidates" section before this adapter was built.
 */
export class ClineAdapter implements AgentAdapter {
  readonly id = "cline";

  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[] {
    return [
      {
        path: ".clinerules/project.md",
        content: renderAgentInstructions(blueprint, "Cline Instructions"),
      },
    ];
  }

  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
    return generateClineSkills(blueprint);
  }

  /**
   * `.clinerules/` — used by both `generateInstructions` and
   * `generateSkills` above — already fully covers Cline's "rules" concept;
   * nothing left to add without inventing content, same reasoning as
   * Cursor/Copilot.
   */
  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  validate(blueprint: ProjectBlueprint): ValidationResult {
    return validateSkillCoverage(blueprint, CLINE_SKILL_IDS);
  }
}
