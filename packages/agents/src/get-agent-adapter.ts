import type { AgentAdapter } from "./agent-adapter";
import { ClaudeAdapter } from "./claude/claude-adapter";
import { CursorAdapter } from "./cursor/cursor-adapter";
import { CodexAdapter } from "./codex/codex-adapter";
import { CopilotAdapter } from "./copilot/copilot-adapter";

/**
 * Every agent named in the Blueprint schema's agent.primary enum now has a
 * real adapter.
 */
export const SUPPORTED_AGENT_IDS = ["claude", "cursor", "codex", "copilot"] as const;

export type SupportedAgentId = (typeof SUPPORTED_AGENT_IDS)[number];

export function getAgentAdapter(agentId: SupportedAgentId): AgentAdapter {
  switch (agentId) {
    case "claude":
      return new ClaudeAdapter();
    case "cursor":
      return new CursorAdapter();
    case "codex":
      return new CodexAdapter();
    case "copilot":
      return new CopilotAdapter();
  }
}
