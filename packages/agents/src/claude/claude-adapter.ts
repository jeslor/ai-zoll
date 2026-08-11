import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderAgentInstructions } from "@ai-zoll/generators";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";
import {
  generateClaudeSkills,
  CLAUDE_SKILL_FRONTMATTER,
} from "./generate-claude-skills";
import { validateSkillCoverage } from "../validate-skill-coverage";

/**
 * Claude Code specifically discovers CLAUDE.md at the workspace root (not
 * the agent-agnostic AGENTS.md) — this is the one genuinely agent-specific
 * detail generateInstructions needs to get right. The substantive content
 * is shared with the generic AGENTS.md generator via
 * renderAgentInstructions, just under a different heading.
 */
export class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude";

  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[] {
    return [
      {
        path: "CLAUDE.md",
        content: renderAgentInstructions(blueprint, "CLAUDE.md"),
      },
    ];
  }

  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
    return generateClaudeSkills(blueprint);
  }

  /**
   * Claude Code does have a real, distinct .claude/rules/ mechanism (glob-
   * scoped .md files, loaded deterministically when a matching file is
   * touched — complementary to CLAUDE.md's always-loaded content and
   * Skills' description-triggered content). Returns [] because nothing in
   * the current Blueprint is genuinely pattern-scoped convention data — the
   * only candidate content (stack/testing/security directives) is already
   * correctly always-relevant, which is why it lives in CLAUDE.md, not a
   * glob rule. Source: https://claudefa.st/blog/guide/mechanics/rules-directory
   */
  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  validate(blueprint: ProjectBlueprint): ValidationResult {
    return validateSkillCoverage(blueprint, CLAUDE_SKILL_FRONTMATTER);
  }
}
