import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";
import {
  generateCodexSkills,
  CODEX_SKILL_FRONTMATTER,
} from "./generate-codex-skills";
import { validateSkillCoverage } from "../validate-skill-coverage";

/**
 * Codex reads AGENTS.md directly — OpenAI originated the AGENTS.md format
 * specifically for Codex (later transferred to the Linux Foundation's
 * Agentic AI Foundation for neutral, cross-vendor stewardship). Codex walks
 * from the git root down to the cwd, concatenating every AGENTS.md it finds
 * along the way. This means the canonical AGENTS.md that
 * packages/generators' generateAgentsMd already produces *is* Codex's real
 * instructions file, unmodified — unlike Claude/Cursor, Codex needs no
 * adapted/renamed file at all. Source:
 * https://developers.openai.com/codex/guides/agents-md
 */
export class CodexAdapter implements AgentAdapter {
  readonly id = "codex";

  generateInstructions(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
    return generateCodexSkills(blueprint);
  }

  /**
   * Codex has no separate rules concept at all — OpenAI's own guidance
   * explicitly recommends keeping required guidance in AGENTS.md or
   * checked-in docs rather than a distinct rules mechanism. Source:
   * https://www.codegateway.dev/en/blog/openai-codex-cli-complete-guide-2026
   */
  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  validate(blueprint: ProjectBlueprint): ValidationResult {
    return validateSkillCoverage(blueprint, CODEX_SKILL_FRONTMATTER);
  }
}
