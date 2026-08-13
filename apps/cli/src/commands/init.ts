import { input } from "@inquirer/prompts";
import type { BlueprintInput } from "@ai-zoll/ai";
import { runInit } from "../run-init";
import {
  promptAgent,
  promptArchitectureStyle,
  promptAuthentication,
  promptAuthorization,
  promptBackend,
  promptDatabase,
  promptFrontend,
  promptOrm,
  promptProjectDescription,
  promptProjectName,
  promptProjectType,
  promptTestingTypes,
} from "./prompts";

function toKebabCase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-project"
  );
}

async function promptForBlueprintInput(): Promise<BlueprintInput> {
  const name = await promptProjectName();
  const description = await promptProjectDescription();
  const type = await promptProjectType();
  const architectureStyle = await promptArchitectureStyle();

  const frontend = await promptFrontend();
  const backend = await promptBackend();
  const database = await promptDatabase();
  const orm = await promptOrm();

  const testing = await promptTestingTypes();

  const authentication = await promptAuthentication();
  const authorization = await promptAuthorization();

  return {
    project: { name, description, type },
    architecture: { style: architectureStyle },
    stack: { frontend, backend, database, orm },
    features: [],
    testing,
    security: { authentication, authorization },
    agent: { primary: "claude" }, // overwritten below once the agent is chosen
  };
}

export interface RunInitCommandOptions {
  useAI: boolean;
}

export async function runInitCommand(options: RunInitCommandOptions): Promise<void> {
  const blueprintInput = await promptForBlueprintInput();

  const agentId = await promptAgent();
  blueprintInput.agent = { primary: agentId };

  const outputDir = await input({
    message: "Where should the project be created?",
    default: toKebabCase(blueprintInput.project.name),
  });

  const result = await runInit({
    input: blueprintInput,
    agentId,
    outputDir,
    useAI: options.useAI,
  });

  console.log(
    `\nGenerated ${result.files.length} files in ${result.outputDir}/\n`,
  );
  for (const file of result.files) {
    console.log(`  ${file.path}`);
  }
}
