import * as fs from "node:fs";
import * as path from "node:path";
import { extractTomlSectionKeys } from "./toml-section-keys";

function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Strips a requirements.txt-style version specifier/extras/inline comment,
 * leaving just the package name. Returns null for blank lines,
 * comment-only lines, and flag lines (`-r other.txt`, `-e git+...`,
 * `--index-url ...`) — none of those are a real dependency name.
 */
function extractRequirementName(line: string): string | null {
  const withoutComment = (line.split("#")[0] ?? "").trim();
  if (!withoutComment || withoutComment.startsWith("-")) {
    return null;
  }
  const match = /^([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(withoutComment);
  return match?.[1] ?? null;
}

function readRequirementsTxt(repoPath: string): string[] {
  const content = readFileOrNull(path.join(repoPath, "requirements.txt"));
  if (!content) {
    return [];
  }
  return content
    .split("\n")
    .map(extractRequirementName)
    .filter((name): name is string => name !== null);
}

/**
 * Finds the content of PEP 621's `[project] dependencies = [...]` array,
 * correctly skipping over `[`/`]` characters that appear *inside* a quoted
 * dependency spec — real specs routinely have their own brackets (extras
 * syntax, e.g. `"fastapi[standard]>=0.100"`), which a naive
 * "match up to the first `]`" regex truncates on, silently losing every
 * dependency after the first bracketed one. Found dogfooding against a
 * real FastAPI project whose very first dependency was
 * `"fastapi[standard]>=0.141.1,<1.0.0"` — the truncated regex captured
 * only `"fastapi[standard` and missed the entire array. Tracks bracket
 * depth and string-quoting by hand rather than reaching for a real TOML
 * parser, matching this module's existing precedent.
 */
function extractDependenciesArrayContent(content: string): string | null {
  const startMatch = /dependencies\s*=\s*\[/.exec(content);
  if (!startMatch) {
    return null;
  }
  const start = startMatch.index + startMatch[0].length;

  let depth = 1;
  let inString = false;
  let stringChar = "";
  for (let i = start; i < content.length; i++) {
    const char = content.charAt(i);
    if (inString) {
      if (char === stringChar && content[i - 1] !== "\\") {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
    } else if (char === "[") {
      depth++;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        return content.slice(start, i);
      }
    }
  }
  return null;
}

function readPyprojectToml(repoPath: string): string[] {
  const content = readFileOrNull(path.join(repoPath, "pyproject.toml"));
  if (!content) {
    return [];
  }

  const names: string[] = [];

  const arrayContent = extractDependenciesArrayContent(content);
  if (arrayContent) {
    const entries = arrayContent.match(/"([^"]+)"|'([^']+)'/g) ?? [];
    for (const entry of entries) {
      const raw = entry.slice(1, -1);
      const name = extractRequirementName(raw);
      if (name) {
        names.push(name);
      }
    }
  }

  // Poetry's table style — "python" is the interpreter constraint, not a
  // real dependency, so it's filtered out explicitly rather than treated
  // as a (harmless but meaningless) package name.
  for (const section of [
    "tool.poetry.dependencies",
    "tool.poetry.dev-dependencies",
    "tool.poetry.group.dev.dependencies",
  ]) {
    for (const key of extractTomlSectionKeys(content, section)) {
      if (key !== "python") {
        names.push(key);
      }
    }
  }

  return names;
}

function readPipfile(repoPath: string): string[] {
  const content = readFileOrNull(path.join(repoPath, "Pipfile"));
  if (!content) {
    return [];
  }
  return [...extractTomlSectionKeys(content, "packages"), ...extractTomlSectionKeys(content, "dev-packages")];
}

/**
 * Unions every Python manifest found at repoPath — requirements.txt,
 * pyproject.toml (both PEP 621's `[project.dependencies]` array and
 * Poetry's `[tool.poetry.dependencies]` table styles), and Pipfile. A repo
 * commonly has at most one of these, but nothing stops a migration-in-
 * progress repo from having two; unioning is the same "don't guess, combine
 * what's real" choice `workspace-discovery.ts` already makes for
 * `pnpm-workspace.yaml` + `package.json`'s `workspaces` field.
 */
export function readPythonDependencyNames(repoPath: string): Set<string> {
  return new Set([...readRequirementsTxt(repoPath), ...readPyprojectToml(repoPath), ...readPipfile(repoPath)]);
}
