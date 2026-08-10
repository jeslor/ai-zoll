import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { renderFooter } from "../shared-fragments";

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function renderFeatures(features: ProjectBlueprint["features"]): string {
  if (features.length === 0) {
    return "No features defined yet.";
  }

  return features
    .map((feature) => `- **${feature.name}** — ${feature.description}`)
    .join("\n");
}

function renderProjectMd(blueprint: ProjectBlueprint): string {
  const { project, architecture, stack, features, testing, security, agent } =
    blueprint;

  return `# ${project.name}

${project.description}

**Type:** ${project.type}
**Architecture:** ${architecture.style}

## Stack

- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.database}
- ORM: ${stack.orm}

## Features

${renderFeatures(features)}

## Testing

- Unit: ${yesNo(testing.unit)}
- Integration: ${yesNo(testing.integration)}
- E2E: ${yesNo(testing.e2e)}

## Security

- Authentication: ${security.authentication}
- Authorization: ${security.authorization}

## AI Agent

Primary agent: ${agent.primary}

${renderFooter(blueprint)}`;
}

/**
 * Renders PROJECT.md: a direct, readable rendering of every Blueprint field.
 * Pure and deterministic — same Blueprint in, same file out (see
 * docs/decisions/0004-deterministic-vs-ai-boundary.md).
 */
export function generateProjectMd(blueprint: ProjectBlueprint): GeneratedFile[] {
  return [
    {
      path: "PROJECT.md",
      content: renderProjectMd(blueprint),
    },
  ];
}
