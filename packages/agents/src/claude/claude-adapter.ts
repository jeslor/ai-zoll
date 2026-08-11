import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { renderAgentInstructions } from "@ai-software-zoll/generators";
import type { AgentAdapter } from "../agent-adapter";
import { generateClaudeSkills } from "./generate-claude-skills";

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
}
