import * as fs from "node:fs";
import * as path from "node:path";

/**
 * go.mod's `require` directive, both forms:
 *
 *   require github.com/gin-gonic/gin v1.9.1
 *
 *   require (
 *       github.com/gin-gonic/gin v1.9.1
 *       github.com/stretchr/testify v1.8.4 // indirect
 *   )
 *
 * The full module path (e.g. "github.com/gin-gonic/gin") is used as the
 * dependency name — unlike npm/PyPI packages, Go modules have no separate
 * short name, so signal tables match on the full path.
 */
export function readGoDependencyNames(repoPath: string): Set<string> {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "go.mod"), "utf-8");
  } catch {
    return new Set();
  }

  const names: string[] = [];

  const blockMatch = /require\s*\(([^)]*)\)/.exec(content);
  if (blockMatch?.[1]) {
    for (const rawLine of blockMatch[1].split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) {
        continue;
      }
      const modulePath = line.split(/\s+/)[0];
      if (modulePath) {
        names.push(modulePath);
      }
    }
  }

  // [ \t]+ rather than \s+ between tokens — \s also matches newlines, which
  // would let this pattern wrongly match the block form's opening
  // "require (" line too (capturing "(" as the module path).
  for (const match of content.matchAll(/^require[ \t]+(\S+)[ \t]+\S+/gm)) {
    if (match[1]) {
      names.push(match[1]);
    }
  }

  return new Set(names);
}
