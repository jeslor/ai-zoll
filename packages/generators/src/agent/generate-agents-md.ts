import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import {
  renderFooter,
  ARCHITECTURE_STYLE_DISPLAY_NAMES,
  renderTestingRequirements,
} from "../shared-fragments";

/**
 * Renders the shared instructions body used by both the generic AGENTS.md
 * (heading "AGENTS.md") and agent-specific files like Claude's CLAUDE.md
 * (heading "CLAUDE.md") — the substantive content is identical across
 * agents; only the heading (and therefore the file's own name) differs, so
 * only that is parameterized rather than duplicating the whole function.
 */
export function renderAgentInstructions(
  blueprint: ProjectBlueprint,
  heading: string,
): string {
  const { project, architecture, stack, testing, security } = blueprint;
  const architectureDisplayName =
    ARCHITECTURE_STYLE_DISPLAY_NAMES[architecture.style];

  return `# ${heading}

Instructions for AI coding agents working in this project.

## Project

${project.name} — ${project.description}

See PROJECT.md for the full project overview.

## Architecture

This project follows ${architectureDisplayName}. See ARCHITECTURE.md for details.

## Stack

- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.database} (via ${stack.orm})

Do not introduce a different framework or library for any of these roles without
updating the Blueprint first.

## Testing requirements

${renderTestingRequirements(testing)}

## Security requirements

- Authentication: ${security.authentication}
- Authorization: ${security.authorization}

Follow these mechanisms consistently; do not introduce an alternative
authentication/authorization approach without updating the Blueprint first.

${renderFooter(blueprint)}`;
}

/**
 * Renders AGENTS.md: agent-agnostic instructions for AI coding agents
 * working in this project. Unlike PROJECT.md/README.md/ARCHITECTURE.md
 * (which describe what the project is), this is prescriptive — what an
 * agent must do, derived from the same Blueprint fields but phrased as
 * directives rather than a data table.
 */
export function generateAgentsMd(blueprint: ProjectBlueprint): GeneratedFile[] {
  return [
    {
      path: "AGENTS.md",
      content: renderAgentInstructions(blueprint, "AGENTS.md"),
    },
  ];
}
