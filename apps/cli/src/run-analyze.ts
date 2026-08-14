import * as fs from "node:fs";
import * as path from "node:path";
import type { BlueprintInput } from "@ai-zoll/ai";
import { generateWorkspace, assertNoDuplicatePaths } from "@ai-zoll/generators";
import { getAgentAdapter } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { analyzeDirectory } from "@ai-zoll/analyzer";
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
  /**
   * Pre-rendered CONVENTIONS.md content (see `generate-conventions-md.ts`),
   * already computed by the caller from the same `RepositoryInsights` it
   * used for its own console report — one AI call serves both, `runAnalyze`
   * itself never calls `interpretRepository`. Omitted/null when `--ai`
   * wasn't used or produced nothing worth writing.
   */
  conventionsMdContent?: string | null;
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
  const { projectDir, input, agentId, useAI = false, conventionsMdContent } = options;

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

  // CONVENTIONS.md is written through the same merge-aware pipeline as
  // everything else (so a pre-existing, hand-written CONVENTIONS.md is
  // protected by the exact same Rule 10 guarantee), but deliberately
  // excluded from `generatedPaths` below — see the comment there.
  const rawFiles = conventionsMdContent ? [...files, { path: "CONVENTIONS.md", content: conventionsMdContent }] : files;

  // Nothing to reconcile as stale on a first-time apply — every file is
  // either brand new or merged with whatever (if anything) already exists.
  const applyResult = applyGeneratedFiles(projectDir, rawFiles, []);

  // Snapshots the real, pre-existing directory structure being adopted —
  // the baseline `ai-zoll check` diffs future scans against to report
  // newly-appeared conventions. Computed against the same projectDir the
  // files above were just merged into; harmless either way since generated
  // files (docs/, skills/) never match a DirectoryAnalyzer candidate name.
  const directorySignals = analyzeDirectory(projectDir).signals.value ?? [];

  writeProjectState(projectDir, {
    blueprint,
    // CONVENTIONS.md is deliberately NOT included here: `sync` is
    // permanently AI-free and can never regenerate AI-derived content, so
    // tracking it as "generated" would make a future sync (which produces
    // a files list without CONVENTIONS.md, since it has no insights to
    // render) treat it as stale and delete it. Leaving it untracked means
    // it simply becomes an ordinary project file after this one write —
    // exactly the intended, safe behavior.
    generatedPaths: files.map((file) => file.path),
    directorySignals,
  });

  return { projectDir, agentId, ...applyResult };
}
