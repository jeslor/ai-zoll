import { readDependencyNames as readNodeDependencyNames } from "./read-package-json";
import { readPythonDependencyNames } from "./ecosystems/python";
import { readJavaDependencyNames } from "./ecosystems/java";
import { readRustDependencyNames } from "./ecosystems/rust";
import { readGoDependencyNames } from "./ecosystems/go";
import { readRubyDependencyNames } from "./ecosystems/ruby";
import { readPhpDependencyNames } from "./ecosystems/php";
import { readDotnetDependencyNames } from "./ecosystems/dotnet";

/**
 * Unions declared dependency names across every ecosystem manifest found at
 * `repoPath` — package.json (Node), requirements.txt/pyproject.toml/Pipfile
 * (Python), pom.xml/build.gradle[.kts] (Java), Cargo.toml (Rust), go.mod
 * (Go), Gemfile (Ruby), composer.json (PHP), *.csproj (.NET). A path almost
 * always has exactly one ecosystem's manifest, so this degrades to exactly
 * that one ecosystem's names for every existing (Node-only) repo — the
 * union is what makes a genuinely polyglot single directory (e.g. a Python
 * backend with a `package.json` for frontend build tooling) work without
 * needing to know in advance which ecosystem(s) are present.
 *
 * Cross-ecosystem name collisions are a real but negligible risk: the
 * signal tables this feeds (`FrameworkAnalyzer` etc.) match on
 * specific, curated package names, and two unrelated ecosystems
 * coincidentally sharing an identically-spelled package name that also
 * happens to be a signal-table entry is not a realistic occurrence in
 * practice — a stated simplification, not a hidden one.
 */
export function readAllDependencyNames(repoPath: string): Set<string> {
  return new Set([
    ...readNodeDependencyNames(repoPath),
    ...readPythonDependencyNames(repoPath),
    ...readJavaDependencyNames(repoPath),
    ...readRustDependencyNames(repoPath),
    ...readGoDependencyNames(repoPath),
    ...readRubyDependencyNames(repoPath),
    ...readPhpDependencyNames(repoPath),
    ...readDotnetDependencyNames(repoPath),
  ]);
}
