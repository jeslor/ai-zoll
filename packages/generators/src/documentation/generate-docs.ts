import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderFooter } from "../shared-fragments";

interface DocsFolder {
  path: string;
  heading: string;
  purpose: string;
}

/**
 * Three empty-in-spec directories (spec §11) scaffolded with a stub README
 * explaining what belongs there — not fabricated deep content. The current
 * Blueprint schema doesn't carry spec §8's richer development-standards
 * fields yet, so there's no data to generate real architecture/development/
 * decision documentation from. Git doesn't track empty directories, so
 * without this stub these folders wouldn't exist in the generated project
 * at all.
 */
const DOCS_FOLDERS: DocsFolder[] = [
  {
    path: "docs/architecture/README.md",
    heading: "Architecture Docs",
    purpose:
      "Deeper architecture documentation goes here — diagrams, sequence flows, module boundaries beyond what's covered in the top-level ARCHITECTURE.md.",
  },
  {
    path: "docs/development/README.md",
    heading: "Development Docs",
    purpose:
      "Development and contributor workflow documentation goes here — local setup, coding conventions, CI/CD notes.",
  },
  {
    path: "docs/decisions/README.md",
    heading: "Decision Records",
    purpose:
      "Architecture Decision Records (ADRs) go here — one file per significant decision, capturing context and rationale.",
  },
];

function renderDocsReadme(
  blueprint: ProjectBlueprint,
  folder: DocsFolder,
): string {
  return `# ${folder.heading}

${folder.purpose}

This directory was scaffolded for ${blueprint.project.name}.

${renderFooter(blueprint)}`;
}

/**
 * Scaffolds docs/architecture/, docs/development/, docs/decisions/ with a
 * stub README each. See the DOCS_FOLDERS comment for why these are
 * scaffolds, not generated deep content.
 */
export function generateDocs(blueprint: ProjectBlueprint): GeneratedFile[] {
  return DOCS_FOLDERS.map((folder) => ({
    path: folder.path,
    content: renderDocsReadme(blueprint, folder),
  }));
}
