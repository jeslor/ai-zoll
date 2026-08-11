import * as fs from "node:fs";
import * as path from "node:path";
import { MockAIProvider } from "@ai-software-zoll/ai";
import type { BlueprintInput } from "@ai-software-zoll/ai";
import { generateWorkspace, assertNoDuplicatePaths } from "@ai-software-zoll/generators";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { getAgentAdapter } from "./agent-adapters";
import type { SupportedAgentId } from "./agent-adapters";

export interface RunInitOptions {
  input: BlueprintInput;
  agentId: SupportedAgentId;
  outputDir: string;
}

export interface RunInitResult {
  outputDir: string;
  files: GeneratedFile[];
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
 * The pure orchestration core of `ai-software-zoll init`: structured answers
 * -> validated Blueprint -> canonical workspace + agent-specific files ->
 * written to disk. No prompt-library dependency, so this is testable
 * without a TTY — see commands/init.ts for the interactive wrapper.
 */
export async function runInit(options: RunInitOptions): Promise<RunInitResult> {
  const { input, agentId, outputDir } = options;

  const provider = new MockAIProvider();
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
  const files = [...canonicalFiles, ...agentFiles];
  assertNoDuplicatePaths(files);

  assertOutputDirIsSafeToWriteTo(outputDir);

  for (const file of files) {
    const fullPath = path.join(outputDir, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content);
  }

  return { outputDir, files };
}
