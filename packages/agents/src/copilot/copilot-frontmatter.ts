export interface CopilotInstructionsFrontmatter {
  applyTo: string[];
}

/**
 * Renders the YAML frontmatter every .instructions.md path-specific file
 * needs — a single "applyTo" key holding a comma-separated glob list (no
 * spaces required between entries). Hand-written rather than a YAML library
 * dependency: one scalar field doesn't need one (Rule 3). Source:
 * https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
 */
export function renderCopilotInstructionsFrontmatter(
  frontmatter: CopilotInstructionsFrontmatter,
): string {
  return `---
applyTo: "${frontmatter.applyTo.join(",")}"
---

`;
}
