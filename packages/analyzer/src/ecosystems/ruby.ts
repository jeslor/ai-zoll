import * as fs from "node:fs";
import * as path from "node:path";

/** Matches every `gem "name", ...` / `gem 'name'` call, regardless of `group do...end` block nesting — the gem declaration itself doesn't change shape based on indentation. */
const GEM_PATTERN = /\bgem\s+["']([^"']+)["']/g;

export function readRubyDependencyNames(repoPath: string): Set<string> {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "Gemfile"), "utf-8");
  } catch {
    return new Set();
  }

  const names = [...content.matchAll(GEM_PATTERN)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
  return new Set(names);
}
