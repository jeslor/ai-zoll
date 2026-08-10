import type {
  ArchitectureStyle,
  ProjectBlueprint,
} from "@ai-software-zoll/blueprint";
import type { GeneratedFile } from "@ai-software-zoll/shared";
import { renderFooter } from "../shared-fragments";

interface ArchitectureStyleInfo {
  displayName: string;
  explanation: string;
}

/**
 * Only "modular" is spec-verbatim (spec §7's worked example). The other four
 * are standard, widely-recognized one-line descriptions of those patterns,
 * written to match the same style — new content authored here, not
 * transcribed from the spec.
 */
const ARCHITECTURE_STYLE_INFO: Record<ArchitectureStyle, ArchitectureStyleInfo> = {
  modular: {
    displayName: "Modular Architecture",
    explanation:
      "Organizes the application around independent business modules with clear boundaries.",
  },
  layered: {
    displayName: "Layered Architecture",
    explanation:
      "Organizes the application into horizontal layers (e.g. presentation, business logic, data access), where each layer only depends on the layer below it.",
  },
  "clean-architecture": {
    displayName: "Clean Architecture",
    explanation:
      "Organizes the application around use cases at the center, with frameworks, UI, and infrastructure as replaceable outer layers that depend inward, never the reverse.",
  },
  hexagonal: {
    displayName: "Hexagonal Architecture",
    explanation:
      "Organizes the application around a core domain, connected to the outside world (UI, database, APIs) through interchangeable ports and adapters.",
  },
  "domain-driven-design": {
    displayName: "Domain-Driven Design",
    explanation:
      "Organizes the application around the business domain itself, using a shared ubiquitous language and explicit bounded contexts to keep complex domains manageable.",
  },
};

function renderArchitectureMd(blueprint: ProjectBlueprint): string {
  const { architecture, stack } = blueprint;
  const info = ARCHITECTURE_STYLE_INFO[architecture.style];

  return `# Architecture

## ${info.displayName}

${info.explanation}

## Stack Layout

- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.database} (via ${stack.orm})

${renderFooter(blueprint)}`;
}

/**
 * Renders ARCHITECTURE.md: the chosen architecture style, a short
 * explanation of it, and the stack layout. Deliberately doesn't repeat
 * PROJECT.md's features/testing/security fields.
 */
export function generateArchitectureMd(
  blueprint: ProjectBlueprint,
): GeneratedFile[] {
  return [
    {
      path: "ARCHITECTURE.md",
      content: renderArchitectureMd(blueprint),
    },
  ];
}
