import type { Finding } from "./finding";
import { readDependencyNames } from "./read-package-json";

export interface FrameworkAnalyzerResult {
  frontend: Finding<string>;
  backend: Finding<string>;
}

const UNKNOWN: Finding<string> = {
  value: null,
  confidence: "unknown",
  reason: "no known framework dependency found at the repo root",
};

/**
 * Order matters: each meta-framework transitively/directly depends on its
 * base framework too (a Next.js app always has "react" in dependencies), so
 * the first match in "most specific first" order is the correct one, not an
 * arbitrary pick. Adding a new entry means reasoning about where it sits
 * relative to the existing ones, not just appending.
 *
 * Deliberately NOT covered in v1 (a documented scope cut, not an oversight):
 * Remix, SvelteKit, Nuxt, Astro on the frontend; Koa, Hapi, Hono on the
 * backend.
 */
const FRONTEND_SIGNALS: Array<[dependency: string, value: string]> = [
  ["next", "nextjs"],
  ["react", "react"],
  ["vue", "vue"],
  ["@angular/core", "angular"],
];

const BACKEND_SIGNALS: Array<[dependency: string, value: string]> = [
  ["@nestjs/core", "nestjs"],
  ["express", "express"],
  ["fastify", "fastify"],
];

function matchSignal(
  dependencyNames: Set<string>,
  signals: Array<[dependency: string, value: string]>,
): Finding<string> {
  for (const [dependency, value] of signals) {
    if (dependencyNames.has(dependency)) {
      return { value, confidence: "detected", reason: `found "${dependency}" in dependencies` };
    }
  }
  return UNKNOWN;
}

/**
 * Repo-root package.json only — no monorepo/workspace awareness (see
 * packages/analyzer/README.md). "unknown" means "no recognized signal at
 * root", not "definitely no such framework" — a subpackage may use one this
 * v1 doesn't see, or the project may use a framework not yet in the list
 * above.
 */
export function analyzeFramework(repoPath: string): FrameworkAnalyzerResult {
  const dependencyNames = readDependencyNames(repoPath);

  return {
    frontend: matchSignal(dependencyNames, FRONTEND_SIGNALS),
    backend: matchSignal(dependencyNames, BACKEND_SIGNALS),
  };
}
