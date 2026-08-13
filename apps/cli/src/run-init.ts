import * as fs from "node:fs";
import * as path from "node:path";
import type { BlueprintInput } from "@ai-zoll/ai";
import { generateWorkspace, assertNoDuplicatePaths } from "@ai-zoll/generators";
import type { GeneratedFile } from "@ai-zoll/shared";
import { getAgentAdapter } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { selectAIProvider } from "./select-ai-provider";
import { registerWithApi } from "./register-with-api";
import { mergeManagedContent } from "./managed-content";
import { writeProjectState } from "./project-state";

export interface RunInitOptions {
  input: BlueprintInput;
  agentId: SupportedAgentId;
  outputDir: string;
  /** Opt into the real, LLM-backed AIProvider. Defaults to false (MockAIProvider). */
  useAI?: boolean;
}

export interface RunInitResult {
  outputDir: string;
  files: GeneratedFile[];
  /** Set when AI_ZOLL_API_URL is configured and registration succeeded. */
  projectId: string | null;
}

/**
 * Refuses to write into a directory that already has content — checked
 * before anything is written, matching the non-destructive spirit of Rule
 * 10 (which is specifically about existing-project mode, but the same care
 * applies generally: never silently overwrite files without warning).
 */
function assertOutputDirIsSafeToWriteTo(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  const entries = fs.readdirSync(outputDir);
  if (entries.length > 0) {
    throw new Error(
      `Output directory "${outputDir}" already exists and is not empty. ` +
        `Choose an empty or new directory to avoid overwriting existing files.`,
    );
  }
}

/**
 * The pure orchestration core of `ai-zoll init`: structured answers
 * -> validated Blueprint -> canonical workspace + agent-specific files ->
 * written to disk. No prompt-library dependency, so this is testable
 * without a TTY — see commands/init.ts for the interactive wrapper.
 */
export async function runInit(options: RunInitOptions): Promise<RunInitResult> {
  const { input, agentId, outputDir, useAI = false } = options;

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

  const canonicalFiles = generateWorkspace(blueprint);
  const agentFiles = [
    ...adapter.generateInstructions(blueprint),
    ...adapter.generateSkills(blueprint),
    ...adapter.generateRules(blueprint),
  ];
  const rawFiles = [...canonicalFiles, ...agentFiles];
  assertNoDuplicatePaths(rawFiles);

  assertOutputDirIsSafeToWriteTo(outputDir);

  // Every file starts wrapped in managed-region markers (a brand new file has
  // no prior content, so this is always the "created" merge outcome) — so a
  // project already has the markers `sync` looks for from its very first
  // generation, not retrofitted later.
  const files: GeneratedFile[] = rawFiles.map((file) => ({
    path: file.path,
    content: mergeManagedContent(undefined, file.content).content,
  }));

  for (const file of files) {
    const fullPath = path.join(outputDir, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content);
  }

  writeProjectState(outputDir, {
    blueprint,
    generatedPaths: files.map((file) => file.path),
  });

  const projectId = await registerWithApi(blueprint);

  return { outputDir, files, projectId };
}
