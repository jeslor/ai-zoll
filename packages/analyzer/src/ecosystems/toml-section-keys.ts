/**
 * Narrow, hand-written TOML section-body finder — not a real TOML parser
 * (same precedent as this codebase's existing Prisma-schema and
 * pnpm-workspace.yaml regex extractors, neither of which use a general
 * parsing library either). Finds a `[section.header]` block and returns
 * everything within it, up to the next `[` header or end of file. Shared by
 * `extractTomlSectionKeys` (dependency tables) and
 * `workspace-discovery.ts`'s `members = [...]` array readers (Cargo/uv
 * workspaces) — both need "the body of this one section", just extracting
 * a different shape from it afterward.
 */
export function findTomlSectionBody(content: string, sectionHeader: string): string | null {
  const escaped = sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(`^\\[${escaped}\\]\\s*$`, "m");
  const match = sectionRegex.exec(content);
  if (!match) {
    return null;
  }

  const startIdx = match.index + match[0].length;
  const rest = content.slice(startIdx);
  const nextHeaderMatch = /^\[/m.exec(rest);
  return nextHeaderMatch ? rest.slice(0, nextHeaderMatch.index) : rest;
}

/**
 * Every top-level `key = ...` identifier within a `[section.header]` block —
 * good enough for extracting dependency names from Cargo.toml's
 * `[dependencies]`, pyproject.toml's `[tool.poetry.dependencies]`, and
 * Pipfile's `[packages]` — all simple `key = value` or `key = { ... }`
 * tables. Doesn't handle inline arrays-of-tables (`[[section]]`) or a key
 * spanning multiple lines — an acceptable, stated v1 limitation, not a
 * silent one.
 */
export function extractTomlSectionKeys(content: string, sectionHeader: string): string[] {
  const body = findTomlSectionBody(content, sectionHeader);
  if (body === null) {
    return [];
  }

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

/**
 * A `key = ["a", "b"]` array-of-strings value within a section body (e.g.
 * Cargo/uv's `members = [...]`). Safe to use a simple non-greedy-negation
 * regex here (unlike Python's PEP 621 `dependencies` array, which needs
 * real bracket-depth tracking — see `ecosystems/python.ts`) because
 * workspace member entries are plain relative paths/globs, never containing
 * their own `[`/`]` characters the way Python's extras syntax does.
 */
export function extractTomlArrayValue(sectionBody: string, key: string): string[] {
  const pattern = new RegExp(`\\b${key}\\s*=\\s*\\[([^\\]]*)\\]`);
  const match = pattern.exec(sectionBody);
  if (!match?.[1]) {
    return [];
  }
  const entries = match[1].match(/"([^"]+)"|'([^']+)'/g) ?? [];
  return entries.map((entry) => entry.slice(1, -1));
}
