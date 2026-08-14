import { safeParseBlueprint } from "@ai-zoll/blueprint";
import { getAgentAdapter, SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { assertNoDuplicatePaths, generateWorkspace } from "@ai-zoll/generators";
import type { GeneratedFile } from "@ai-zoll/shared";
import { analyzeDirectory } from "@ai-zoll/analyzer";
import { applyGeneratedFiles } from "./apply-generated-files";
import type { ApplyResult } from "./apply-generated-files";
import { readProjectState, writeProjectState } from "./project-state";

export interface RunSyncOptions {
  projectDir: string;
  /** Omitted = re-sync with whatever agent is currently stored. */
  agentId?: SupportedAgentId;
}

export interface RunSyncResult extends ApplyResult {
  projectDir: string;
  agentId: SupportedAgentId;
}

/**
 * Regenerates an already-initialized project's files — either re-syncing
 * with its current agent (agentId omitted) or switching to a different one.
 * Zero AI involved: the Blueprint is already validated and stored, this is
 * pure generateWorkspace + AgentAdapter re-rendering, with hand-written
 * content below each file's managed-region markers preserved verbatim (see
 * apply-generated-files.ts, shared with runAnalyze).
 */
export async function runSync(options: RunSyncOptions): Promise<RunSyncResult> {
  const { projectDir } = options;
  const state = readProjectState(projectDir);

  const requestedAgentId = options.agentId ?? state.blueprint.agent.primary;
  if (!SUPPORTED_AGENT_IDS.includes(requestedAgentId as SupportedAgentId)) {
    throw new Error(
      `Agent "${requestedAgentId}" has no adapter yet — supported agents: ${SUPPORTED_AGENT_IDS.join(", ")}.`,
    );
  }
  const agentId = requestedAgentId as SupportedAgentId;

  const candidateBlueprint = { ...state.blueprint, agent: { primary: agentId } };
  const blueprintResult = safeParseBlueprint(candidateBlueprint);
  if (!blueprintResult.success) {
    throw new Error(
      `Blueprint is no longer valid after switching to agent "${agentId}": ` +
        blueprintResult.issues.map((issue) => `${issue.path || "(root)"}: ${issue.message}`).join("; "),
    );
  }
  const newBlueprint = blueprintResult.data;

  const adapter = getAgentAdapter(agentId);
  const validation = adapter.validate(newBlueprint);
  if (!validation.valid) {
    throw new Error(
      `Blueprint is not valid for agent "${agentId}":\n` +
        validation.issues.map((issue) => `  - ${issue}`).join("\n"),
    );
  }

  const newFiles: GeneratedFile[] = [
    ...generateWorkspace(newBlueprint),
    ...adapter.generateInstructions(newBlueprint),
    ...adapter.generateSkills(newBlueprint),
    ...adapter.generateRules(newBlueprint),
  ];
  assertNoDuplicatePaths(newFiles);

  const applyResult = applyGeneratedFiles(projectDir, newFiles, state.generatedPaths);

  // Refreshed on every sync, not preserved from the original analyze/init —
  // drift is meant to be relative to "the last time ai-zoll looked", the
  // same way a diff is relative to your last commit, not repo genesis.
  const directorySignals = analyzeDirectory(projectDir).signals.value ?? [];

  // Preserved-orphan and unrecognized files drop out of tracking entirely —
  // they're now just ordinary files in the user's project, not something
  // ai-zoll manages going forward.
  writeProjectState(projectDir, {
    blueprint: newBlueprint,
    generatedPaths: newFiles.map((file) => file.path),
    directorySignals,
  });

  return { projectDir, agentId, ...applyResult };
}
