import { input, select, checkbox } from "@inquirer/prompts";
import {
  ARCHITECTURE_STYLE_DISPLAY_NAMES,
  ARCHITECTURE_STYLE_EXPLANATIONS,
} from "@ai-zoll/generators";
import type {
  ArchitectureStyle,
  ProjectType,
} from "@ai-zoll/blueprint";
import type { BlueprintInput } from "@ai-zoll/ai";
import { runInit } from "../run-init";
import { SUPPORTED_AGENT_IDS } from "../agent-adapters";
import type { SupportedAgentId } from "../agent-adapters";

const PROJECT_TYPES: ProjectType[] = [
  "saas",
  "web-application",
  "api",
  "mobile-backend",
  "ecommerce",
  "internal-tool",
  "ai-application",
  "cli",
  "other",
];

const ARCHITECTURE_STYLES: ArchitectureStyle[] = [
  "modular",
  "layered",
  "clean-architecture",
  "hexagonal",
  "domain-driven-design",
];

function toKebabCase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-project"
  );
}

async function promptForBlueprintInput(): Promise<BlueprintInput> {
  const name = await input({ message: "Project name:" });
  const description = await input({ message: "What are you building?" });

  const type = (await select({
    message: "Project type:",
    choices: PROJECT_TYPES.map((value) => ({ name: value, value })),
    default: "saas",
  })) as ProjectType;

  const architectureStyle = (await select({
    message: "Architecture style:",
    choices: ARCHITECTURE_STYLES.map((value) => ({
      name: ARCHITECTURE_STYLE_DISPLAY_NAMES[value],
      value,
      description: ARCHITECTURE_STYLE_EXPLANATIONS[value],
    })),
    default: "modular",
  })) as ArchitectureStyle;

  const frontend = await select({
    message: "Frontend:",
    choices: ["nextjs", "react", "vue", "angular", "none"],
    default: "nextjs",
  });
  const backend = await select({
    message: "Backend:",
    choices: ["nestjs", "express", "fastify", "django", "fastapi", "none"],
    default: "nestjs",
  });
  const database = await select({
    message: "Database:",
    choices: ["postgresql", "mysql", "mongodb", "sqlite", "redis", "other"],
    default: "postgresql",
  });
  const orm = await select({
    message: "ORM:",
    choices: ["prisma", "drizzle", "typeorm", "sqlalchemy", "none"],
    default: "prisma",
  });

  const testingTypes = await checkbox({
    message: "Which testing types do you want?",
    choices: [
      { name: "Unit", value: "unit", checked: true },
      { name: "Integration", value: "integration", checked: true },
      { name: "E2E", value: "e2e", checked: false },
    ],
  });

  const authentication = await input({
    message: "Authentication mechanism (or 'none'):",
    default: "jwt",
  });
  const authorization = await input({
    message: "Authorization mechanism (or 'none'):",
    default: "rbac",
  });

  return {
    project: { name, description, type },
    architecture: { style: architectureStyle },
    stack: { frontend, backend, database, orm },
    features: [],
    testing: {
      unit: testingTypes.includes("unit"),
      integration: testingTypes.includes("integration"),
      e2e: testingTypes.includes("e2e"),
    },
    security: { authentication, authorization },
    agent: { primary: "claude" }, // overwritten below once the agent is chosen
  };
}

export async function runInitCommand(): Promise<void> {
  const blueprintInput = await promptForBlueprintInput();

  const agentId = (await select({
    message: "Primary AI coding agent:",
    choices: SUPPORTED_AGENT_IDS.map((value) => ({ name: value, value })),
    default: "claude",
  })) as SupportedAgentId;
  blueprintInput.agent = { primary: agentId };

  const outputDir = await input({
    message: "Where should the project be created?",
    default: toKebabCase(blueprintInput.project.name),
  });

  const result = await runInit({ input: blueprintInput, agentId, outputDir });

  console.log(
    `\nGenerated ${result.files.length} files in ${result.outputDir}/\n`,
  );
  for (const file of result.files) {
    console.log(`  ${file.path}`);
  }
}
