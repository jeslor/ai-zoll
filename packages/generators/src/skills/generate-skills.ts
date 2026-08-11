import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderFooter, renderTestingRequirements } from "../shared-fragments";

/**
 * A skill that may or may not apply to a given project. Unlike every other
 * generator, skills are conditionally generated (spec §20: "generated from
 * actual project requirements... don't generate 50 generic skills") — a
 * Blueprint can legitimately produce zero skill files.
 */
export interface SkillDefinition {
  /** "testing" -> skills/testing/SKILL.md */
  id: string;
  shouldInclude(blueprint: ProjectBlueprint): boolean;
  render(blueprint: ProjectBlueprint): string;
}

function renderTestingSkill(blueprint: ProjectBlueprint): string {
  const { project, testing } = blueprint;
  const requirements = renderTestingRequirements(testing);

  return `# Testing

## When to use this skill

Use this skill when writing or modifying tests for ${project.name}, or when adding
new functionality that requires test coverage.

## Project-specific conventions

${requirements}

## Relevant files

No test suite exists yet for this project — this section will point to the actual
test files once they're created.

## Required patterns

Follow whichever test runner and conventions are established for this project once a
test suite exists; keep new tests consistent with it.

## Things to avoid

- Do not skip a test type required above.
- Do not disable or delete a failing test to unblock a build — fix the underlying
  issue instead.

## Testing expectations

${requirements}

${renderFooter(blueprint)}`;
}

/**
 * Every skill Zoll knows how to generate. A plain array, not a registry
 * (Rule 1 — same discipline as GENERATORS/DOCS_FOLDERS). Currently one
 * entry; authentication/database/api-development are deliberate follow-up
 * additions, not built yet.
 */
const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "testing",
    shouldInclude: (blueprint) =>
      blueprint.testing.unit ||
      blueprint.testing.integration ||
      blueprint.testing.e2e,
    render: renderTestingSkill,
  },
];

/**
 * The actual filter-then-render mechanism, taking an explicit list of
 * definitions so it's testable independent of which real skills exist.
 * generateSkills is a thin wrapper calling this with SKILL_DEFINITIONS.
 */
export function buildSkillFiles(
  blueprint: ProjectBlueprint,
  definitions: SkillDefinition[],
): GeneratedFile[] {
  return definitions
    .filter((skill) => skill.shouldInclude(blueprint))
    .map((skill) => ({
      path: `skills/${skill.id}/SKILL.md`,
      content: skill.render(blueprint),
    }));
}

/**
 * Generates only the skills relevant to this Blueprint — may return an
 * empty array. This is a first-class, tested outcome, not an edge case:
 * a project with no testing configured gets no testing skill.
 */
export function generateSkills(blueprint: ProjectBlueprint): GeneratedFile[] {
  return buildSkillFiles(blueprint, SKILL_DEFINITIONS);
}
