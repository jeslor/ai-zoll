export interface MdcFrontmatter {
  description: string;
  globs: string[];
  alwaysApply: boolean;
}

/**
 * Renders the YAML frontmatter block every .mdc file needs (description,
 * globs, alwaysApply — see cursor-adapter.ts for why these specific fields).
 * Hand-written rather than a YAML library dependency: three scalar/array
 * fields with no nesting doesn't need one (Rule 3).
 */
export function renderMdcFrontmatter(frontmatter: MdcFrontmatter): string {
  const globsLiteral =
    frontmatter.globs.length === 0
      ? "[]"
      : `[${frontmatter.globs.map((glob) => `"${glob}"`).join(", ")}]`;

  return `---
description: "${frontmatter.description}"
globs: ${globsLiteral}
alwaysApply: ${frontmatter.alwaysApply}
---

`;
}
