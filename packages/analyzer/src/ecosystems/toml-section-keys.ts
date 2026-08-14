/**
 * Narrow, hand-written TOML section-key extractor — not a real TOML parser
 * (same precedent as this codebase's existing Prisma-schema and
 * pnpm-workspace.yaml regex extractors, neither of which use a general
 * parsing library either). Finds a `[section.header]` block and returns
 * every top-level `key = ...` identifier within it, up to the next `[`
 * header or end of file. Good enough for extracting dependency names from
 * Cargo.toml's `[dependencies]`, pyproject.toml's `[tool.poetry.dependencies]`,
 * and Pipfile's `[packages]` — all of which are simple `key = value` or
 * `key = { ... }` tables. Doesn't handle inline arrays-of-tables
 * (`[[section]]`) or a key spanning multiple lines — an acceptable, stated
 * v1 limitation, not a silent one.
 */
export function extractTomlSectionKeys(content: string, sectionHeader: string): string[] {
  const escaped = sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(`^\\[${escaped}\\]\\s*$`, "m");
  const match = sectionRegex.exec(content);
  if (!match) {
    return [];
  }

  const startIdx = match.index + match[0].length;
  const rest = content.slice(startIdx);
  const nextHeaderMatch = /^\[/m.exec(rest);
  const body = nextHeaderMatch ? rest.slice(0, nextHeaderMatch.index) : rest;

  const keys: string[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const keyMatch = /^["']?([A-Za-z0-9_.-]+)["']?\s*=/.exec(line);
    if (keyMatch?.[1]) {
      keys.push(keyMatch[1]);
    }
  }
  return keys;
}
