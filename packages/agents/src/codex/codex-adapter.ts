import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import type { AgentAdapter } from "../agent-adapter";
import { generateCodexSkills } from "./generate-codex-skills";

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
}
