import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderAgentInstructions } from "@ai-zoll/generators";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";
import {
  generateCopilotSkills,
  COPILOT_SKILL_FRONTMATTER,
} from "./generate-copilot-skills";
import { validateSkillCoverage } from "../validate-skill-coverage";

/**
 * GitHub Copilot discovers a single repo-wide file at exactly
 * .github/copilot-instructions.md (not the agent-agnostic AGENTS.md, and
 * not a path Copilot recognizes on its own) — this is the one genuinely
 * agent-specific detail generateInstructions needs to get right, the same
 * pattern as Claude's CLAUDE.md. The substantive content is shared with
 * the generic AGENTS.md generator via renderAgentInstructions, just under
 * a different heading. Source: https://docs.github.com/copilot/
 * customizing-copilot/adding-custom-instructions-for-github-copilot
 */
export class CopilotAdapter implements AgentAdapter {
  readonly id = "copilot";

  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[] {
    return [
      {
        path: ".github/copilot-instructions.md",
        content: renderAgentInstructions(blueprint, "GitHub Copilot Instructions"),
      },
    ];
  }

  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
    return generateCopilotSkills(blueprint);
  }

  /**
   * Copilot's path-specific .github/instructions/*.instructions.md files
   * ARE its "rules" mechanism — already fully used by generateSkills
   * (applyTo-scoped per-skill instructions). There's no third category of
   * content left to generate without inventing it, same reasoning as
   * Cursor's .mdc files.
   */
  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  validate(blueprint: ProjectBlueprint): ValidationResult {
    return validateSkillCoverage(blueprint, COPILOT_SKILL_FRONTMATTER);
  }
}
