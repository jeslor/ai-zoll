import { SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { runSync } from "../run-sync";

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
  if (result.created.length > 0) {
    console.log(`  Created:`);
    for (const p of result.created) console.log(`    + ${p}`);
  }
  if (result.updated.length > 0) {
    console.log(`  Updated:`);
    for (const p of result.updated) console.log(`    ~ ${p}`);
  }
  if (result.deleted.length > 0) {
    console.log(`  Deleted:`);
    for (const p of result.deleted) console.log(`    - ${p}`);
  }
  if (result.preserved.length > 0) {
    console.log(`  Preserved (left untouched):`);
    for (const p of result.preserved) console.log(`    ! ${p.path} — ${p.reason}`);
  }
}
