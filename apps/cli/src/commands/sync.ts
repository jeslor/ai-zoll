import { SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { runSync } from "../run-sync";
import { printApplyResult } from "../print-apply-result";

function isSupportedAgentId(value: string): value is SupportedAgentId {
  return (SUPPORTED_AGENT_IDS as readonly string[]).includes(value);
}

/**
 * Thin, non-interactive wrapper — unlike `init`, this is meant to be fast
 * and scriptable: `ai-zoll sync` (re-sync current agent) or
 * `ai-zoll sync <agent>` (switch + sync), no prompts.
 */
export async function runSyncCommand(agentArg: string | undefined): Promise<void> {
  if (agentArg !== undefined && !isSupportedAgentId(agentArg)) {
    throw new Error(
      `Unknown agent "${agentArg}" — supported agents: ${SUPPORTED_AGENT_IDS.join(", ")}.`,
    );
  }

  const result = await runSync({ projectDir: process.cwd(), agentId: agentArg });

  console.log(`Synced for agent "${result.agentId}":`);
  printApplyResult(result);
}
