import * as fs from "node:fs";
import * as path from "node:path";
import type { BlueprintInput } from "@ai-zoll/ai";
import { generateWorkspace, assertNoDuplicatePaths } from "@ai-zoll/generators";
import { getAgentAdapter } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { selectAIProvider } from "./select-ai-provider";
import { applyGeneratedFiles } from "./apply-generated-files";
import type { ApplyResult } from "./apply-generated-files";
import { writeProjectState } from "./project-state";

export interface RunAnalyzeOptions {
  projectDir: string;
  /** Already fully resolved by the interactive command layer — see commands/analyze.ts. */
  input: BlueprintInput;
  agentId: SupportedAgentId;
  useAI?: boolean;
}

export interface RunAnalyzeResult extends ApplyResult {
  projectDir: string;
  agentId: SupportedAgentId;
}

function assertNotAlreadyInitialized(projectDir: string): void {
  const statePath = path.join(projectDir, ".ai-zoll", "state.json");
  if (fs.existsSync(statePath)) {
    throw new Error(
      `"${projectDir}" is already an ai-zoll project — use "ai-zoll sync" instead of "analyze".`,
    );
  }
}

/**
 * Adopts an existing project: validates the (already-resolved) Blueprint,
 * generates the same canonical + agent-specific files `init` produces, and
 * applies them via the same merge-aware writer `sync` uses — a pre-existing,
 * hand-written file (a real README.md, real application source) has no
 * managed-region markers, so it's left completely untouched and reported
 * back, never overwritten (Rule 10). No AI by default, matching `init`.
 */
export async function runAnalyze(options: RunAnalyzeOptions): Promise<RunAnalyzeResult> {
  const { projectDir, input, agentId, useAI = false } = options;

  assertNotAlreadyInitialized(projectDir);

  const provider = selectAIProvider(useAI);
  const blueprint = await provider.generateBlueprint(input);

  const adapter = getAgentAdapter(agentId);
  const validation = adapter.validate(blueprint);
  if (!validation.valid) {
    throw new Error(
      `Blueprint is not valid for agent "${agentId}":\n` +
        validation.issues.map((issue) => `  - ${issue}`).join("\n"),
    );
  }

  const files = [
    ...generateWorkspace(blueprint),
    ...adapter.generateInstructions(blueprint),
    ...adapter.generateSkills(blueprint),
    ...adapter.generateRules(blueprint),
  ];
  assertNoDuplicatePaths(files);

  // Nothing to reconcile as stale on a first-time apply — every file is
  // either brand new or merged with whatever (if anything) already exists.
  const applyResult = applyGeneratedFiles(projectDir, files, []);

  writeProjectState(projectDir, { blueprint, generatedPaths: files.map((file) => file.path) });

  return { projectDir, agentId, ...applyResult };
}
