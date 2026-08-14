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
 * base framework too (a Next.js app always has "react" in dependencies, a
 * Nuxt app always has "vue", a SvelteKit app always has "svelte", a Remix
 * app always has "react"), so the first match in "most specific first"
 * order is the correct one, not an arbitrary pick. Adding a new entry means
 * reasoning about where it sits relative to the existing ones, not just
 * appending. Astro doesn't strictly require react/vue but commonly
 * integrates with either, so it's still checked before them defensively.
 *
 * Still out of scope: Django/FastAPI (spec's example stack values for them
 * are real, but they're Python — no `package.json` signal exists to detect
 * from at all; this analyzer is npm-dependency-based only, per this v1's
 * Node/TypeScript-ecosystem scope).
 */
const FRONTEND_SIGNALS: Array<[dependency: string, value: string]> = [
  ["next", "nextjs"],
  ["@remix-run/react", "remix"],
  ["nuxt", "nuxt"],
  ["@sveltejs/kit", "sveltekit"],
  ["astro", "astro"],
  ["react", "react"],
  ["vue", "vue"],
  ["svelte", "svelte"],
  ["@angular/core", "angular"],
];

const BACKEND_SIGNALS: Array<[dependency: string, value: string]> = [
  ["@nestjs/core", "nestjs"],
  ["express", "express"],
  ["fastify", "fastify"],
  ["koa", "koa"],
  ["@hapi/hapi", "hapi"],
  ["hono", "hono"],
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
