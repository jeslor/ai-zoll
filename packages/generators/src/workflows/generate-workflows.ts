import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import {
  renderFooter,
  ARCHITECTURE_STYLE_DISPLAY_NAMES,
} from "../shared-fragments";

interface WorkflowDefinition {
  /** Path relative to the generated workspace root. */
  path: string;
  render(blueprint: ProjectBlueprint): string;
}

function renderFeatureDevelopmentWorkflow(blueprint: ProjectBlueprint): string {
  const { project, architecture } = blueprint;
  const architectureDisplayName =
    ARCHITECTURE_STYLE_DISPLAY_NAMES[architecture.style];

  return `# Feature Development Workflow

Steps to follow when adding a new feature to ${project.name}.

1. Confirm the requirement and check PROJECT.md/ARCHITECTURE.md for where it fits.
2. Implement following ${architectureDisplayName}.
3. Add tests per AGENTS.md's testing requirements.
4. Update PROJECT.md if this adds a new feature to the Blueprint.

${renderFooter(blueprint)}`;
}

/**
 * Repeatable development processes an AI agent should follow, unlike
 * skills/ (conditional on the project's domain areas) — these apply to
 * every project regardless of stack/architecture, so this is a fixed list,
 * not a filtered one. A plain array, not a registry (Rule 1 — same
 * discipline as GENERATORS/DOCS_FOLDERS/SKILL_DEFINITIONS). Currently one
 * entry; bug-fix/code-review workflows are deliberate follow-up additions.
 */
const WORKFLOWS: WorkflowDefinition[] = [
  {
    path: "workflows/feature-development.md",
    render: renderFeatureDevelopmentWorkflow,
  },
];

export function generateWorkflows(blueprint: ProjectBlueprint): GeneratedFile[] {
  return WORKFLOWS.map((workflow) => ({
    path: workflow.path,
    content: workflow.render(blueprint),
  }));
}
