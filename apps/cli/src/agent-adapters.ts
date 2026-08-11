import type { AgentAdapter } from "@ai-zoll/agents";
import { ClaudeAdapter, CursorAdapter, CodexAdapter } from "@ai-zoll/agents";

/**
 * Only the agents with a real adapter are offered — the Blueprint schema's
 * agent.primary enum also allows "copilot", but there's no CopilotAdapter
 * yet, so offering it here would produce a dead-end (agent-agnostic output
 * only, no agent-specific files) without explaining why.
 */
export const SUPPORTED_AGENT_IDS = ["claude", "cursor", "codex"] as const;

export type SupportedAgentId = (typeof SUPPORTED_AGENT_IDS)[number];

export function getAgentAdapter(agentId: SupportedAgentId): AgentAdapter {
  switch (agentId) {
    case "claude":
      return new ClaudeAdapter();
    case "cursor":
      return new CursorAdapter();
    case "codex":
      return new CodexAdapter();
  }
}
