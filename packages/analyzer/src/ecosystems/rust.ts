import * as fs from "node:fs";
import * as path from "node:path";
import { extractTomlSectionKeys } from "./toml-section-keys";

/**
 * Cargo.toml's `[dependencies]`/`[dev-dependencies]`/`[build-dependencies]`
 * tables — each entry is either `name = "version"` or
 * `name = { version = "...", features = [...] }`, both of which
 * `extractTomlSectionKeys` handles (it only needs the `key =` prefix, not
 * what follows it).
 */
export function readRustDependencyNames(repoPath: string): Set<string> {
  let content: string;
  try {
    content = fs.readFileSync(path.join(repoPath, "Cargo.toml"), "utf-8");
  } catch {
    return new Set();
  }

  return new Set([
    ...extractTomlSectionKeys(content, "dependencies"),
    ...extractTomlSectionKeys(content, "dev-dependencies"),
    ...extractTomlSectionKeys(content, "build-dependencies"),
  ]);
}
