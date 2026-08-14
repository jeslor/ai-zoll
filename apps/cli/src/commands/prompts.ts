import { input, select, checkbox } from "@inquirer/prompts";
import {
  ARCHITECTURE_STYLE_DISPLAY_NAMES,
  ARCHITECTURE_STYLE_EXPLANATIONS,
} from "@ai-zoll/generators";
import type { ArchitectureStyle, ProjectType } from "@ai-zoll/blueprint";
import { SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";

/**
 * Individually-callable Blueprint-field prompts, extracted from `init`'s
 * original monolithic wizard so `analyze` can call only the ones needed for
 * fields analysis couldn't confidently determine — `init` composes all of
 * them unconditionally (unchanged behavior), `analyze` picks a subset.
 */

export const PROJECT_TYPES: ProjectType[] = [
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

export const ARCHITECTURE_STYLES: ArchitectureStyle[] = [
  "modular",
  "layered",
  "clean-architecture",
  "hexagonal",
  "domain-driven-design",
];

export async function promptProjectName(defaultValue?: string): Promise<string> {
  return input({ message: "Project name:", default: defaultValue });
}

export async function promptProjectDescription(defaultValue?: string): Promise<string> {
  return input({ message: "What are you building?", default: defaultValue });
}

export async function promptProjectType(defaultValue?: ProjectType): Promise<ProjectType> {
  return (await select({
    message: "Project type:",
    choices: PROJECT_TYPES.map((value) => ({ name: value, value })),
    default: defaultValue ?? "saas",
  })) as ProjectType;
}

export async function promptArchitectureStyle(defaultValue?: ArchitectureStyle): Promise<ArchitectureStyle> {
  return (await select({
    message: "Architecture style:",
    choices: ARCHITECTURE_STYLES.map((value) => ({
      name: ARCHITECTURE_STYLE_DISPLAY_NAMES[value],
      value,
      description: ARCHITECTURE_STYLE_EXPLANATIONS[value],
    })),
    default: defaultValue ?? "modular",
  })) as ArchitectureStyle;
}

const FRONTEND_CHOICES: string[] = ["nextjs", "react", "vue", "angular", "none"];
const BACKEND_CHOICES: string[] = ["nestjs", "express", "fastify", "django", "fastapi", "none"];
// "none" was missing here (unlike frontend/backend/orm) — a real frontend-only
// project with no database at all was forced into a dishonest "other" (found
// via dogfooding against a real Next.js frontend repo with no backend/DB).
const DATABASE_CHOICES: string[] = ["postgresql", "mysql", "mongodb", "sqlite", "redis", "other", "none"];
const ORM_CHOICES: string[] = ["prisma", "drizzle", "typeorm", "sqlalchemy", "none"];

export async function promptFrontend(defaultValue?: string): Promise<string> {
  return select({
    message: "Frontend:",
    choices: FRONTEND_CHOICES,
    default: defaultValue ?? "nextjs",
  });
}

export async function promptBackend(defaultValue?: string): Promise<string> {
  return select({
    message: "Backend:",
    choices: BACKEND_CHOICES,
    default: defaultValue ?? "nestjs",
  });
}

export async function promptDatabase(defaultValue?: string): Promise<string> {
  return select({
    message: "Database:",
    choices: DATABASE_CHOICES,
    default: defaultValue ?? "postgresql",
  });
}

export async function promptOrm(defaultValue?: string): Promise<string> {
  return select({
    message: "ORM:",
    choices: ORM_CHOICES,
    default: defaultValue ?? "prisma",
  });
}

export interface TestingTypes {
  unit: boolean;
  integration: boolean;
  e2e: boolean;
}

export async function promptTestingTypes(defaults?: Partial<TestingTypes>): Promise<TestingTypes> {
  const testingTypes = await checkbox({
    message: "Which testing types do you want?",
    choices: [
      { name: "Unit", value: "unit", checked: defaults?.unit ?? true },
      { name: "Integration", value: "integration", checked: defaults?.integration ?? true },
      { name: "E2E", value: "e2e", checked: defaults?.e2e ?? false },
    ],
  });
  return {
    unit: testingTypes.includes("unit"),
    integration: testingTypes.includes("integration"),
    e2e: testingTypes.includes("e2e"),
  };
}

export async function promptAuthentication(defaultValue?: string): Promise<string> {
  return input({ message: "Authentication mechanism (or 'none'):", default: defaultValue ?? "jwt" });
}

export async function promptAuthorization(defaultValue?: string): Promise<string> {
  return input({ message: "Authorization mechanism (or 'none'):", default: defaultValue ?? "rbac" });
}

export async function promptAgent(defaultValue?: SupportedAgentId): Promise<SupportedAgentId> {
  return (await select({
    message: "Primary AI coding agent:",
    choices: SUPPORTED_AGENT_IDS.map((value) => ({ name: value, value })),
    default: defaultValue ?? "claude",
  })) as SupportedAgentId;
}
