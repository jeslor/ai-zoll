import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { generateProjectMd } from "./project/generate-project-md";
import { generateReadmeMd } from "./project/generate-readme-md";
import { generateArchitectureMd } from "./documentation/generate-architecture-md";
import { generateDocs } from "./documentation/generate-docs";
import { generateAgentsMd } from "./agent/generate-agents-md";
import { generateSkills } from "./skills/generate-skills";
import { generateWorkflows } from "./workflows/generate-workflows";

/**
 * Every generator that contributes to the generated workspace. A plain
 * array, not a registry — add a new generator here as it's built (Rule 1:
 * no plugin abstraction for generators that don't exist yet). Some
 * generators (generateSkills) may contribute zero files for a given
 * Blueprint — that's expected, not an error.
 */
const GENERATORS: Array<(blueprint: ProjectBlueprint) => GeneratedFile[]> = [
  generateProjectMd,
  generateReadmeMd,
  generateArchitectureMd,
  generateDocs,
  generateAgentsMd,
  generateSkills,
  generateWorkflows,
];

/**
 * Throws if any two files share the same path. This is the aggregator's
 * actual job: a well-formed workspace can't have two generators writing to
 * the same file.
 */
export function assertNoDuplicatePaths(files: GeneratedFile[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const file of files) {
    if (seen.has(file.path)) {
      duplicates.add(file.path);
    }
    seen.add(file.path);
  }

  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate generated file path(s): ${[...duplicates].join(", ")}`,
    );
  }
}

/**
 * Combines every generator's output into the full generated workspace.
 * Deterministic: same Blueprint in, same GeneratedFile[] out, in a fixed
 * generator order.
 */
export function generateWorkspace(blueprint: ProjectBlueprint): GeneratedFile[] {
  const files = GENERATORS.flatMap((generate) => generate(blueprint));
  assertNoDuplicatePaths(files);
  return files;
}
