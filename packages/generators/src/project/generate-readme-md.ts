import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { renderFooter } from "../shared-fragments";

function renderReadmeMd(blueprint: ProjectBlueprint): string {
  const { project, stack, agent } = blueprint;

  return `# ${project.name}

${project.description}

Built with ${stack.frontend} (frontend), ${stack.backend} (backend), and
${stack.database} via ${stack.orm}.

## Documentation

- [PROJECT.md](PROJECT.md) — project overview and features
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture
- [AGENTS.md](AGENTS.md) — instructions for AI coding agents
- [docs/](docs/) — additional documentation

## AI-Assisted Development

This project is set up for AI-assisted development with **${agent.primary}** as the
primary coding agent. See AGENTS.md and skills/ for project-specific context.

${renderFooter(blueprint)}`;
}

/**
 * Renders README.md: the front door for the generated workspace — name,
 * one-line description, stack summary, and a documentation index. Deliberately
 * lean; PROJECT.md is the exhaustive field-by-field reference, so this
 * doesn't repeat the features list, testing flags, or security config.
 */
export function generateReadmeMd(blueprint: ProjectBlueprint): GeneratedFile[] {
  return [
    {
      path: "README.md",
      content: renderReadmeMd(blueprint),
    },
  ];
}
