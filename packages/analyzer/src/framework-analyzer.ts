import type { Finding } from "./finding";
import { readAllDependencyNames } from "./read-dependency-names";

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
 * Frontend framework detection stays Node/JS-only — "frontend framework" as
 * a Blueprint concept doesn't have a real equivalent in the other
 * ecosystems `readAllDependencyNames` now covers (Python/Java/Rust/Go/
 * Ruby/PHP/.NET are backend/systems ecosystems; forcing an entry for e.g. a
 * Python templating engine would be a guess, not a fact).
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

/**
 * The same "always has" relationships documented on FRONTEND_SIGNALS above,
 * reshaped for cross-package merging (see merge-findings.ts's
 * `specializes` parameter): a monorepo where one package depends on "next"
 * and another depends only on "react" isn't reporting conflicting facts —
 * every Next.js app has react too. Astro is deliberately not here, per the
 * same comment above: it commonly but doesn't unconditionally imply
 * react/vue, so treating it as a guaranteed specialization would be a
 * guess, not a fact.
 */
export const FRONTEND_SPECIALIZES: Record<string, string> = {
  nextjs: "react",
  remix: "react",
  nuxt: "vue",
  sveltekit: "svelte",
};

/**
 * One block per ecosystem, each internally most-specific-first where that
 * matters (e.g. FastAPI before the more generic ASGI libraries it's built
 * on). Cross-ecosystem ordering is irrelevant in practice — two different
 * ecosystems' manifests essentially never coexist ambiguously at the same
 * path — so each language's block is simply appended after the existing
 * Node/JS entries, not interleaved with them.
 */
const BACKEND_SIGNALS: Array<[dependency: string, value: string]> = [
  // Node/JS
  ["@nestjs/core", "nestjs"],
  ["express", "express"],
  ["fastify", "fastify"],
  ["koa", "koa"],
  ["@hapi/hapi", "hapi"],
  ["hono", "hono"],
  // Python (requirements.txt / pyproject.toml / Pipfile)
  ["fastapi", "fastapi"],
  ["django", "django"],
  ["flask", "flask"],
  ["tornado", "tornado"],
  ["sanic", "sanic"],
  ["aiohttp", "aiohttp"],
  // Java (pom.xml artifactId / build.gradle[.kts] dependency artifact).
  // Both starter names map to the same value: "-webmvc" is Spring Boot 4's
  // renamed successor to "-web" (found dogfooding against a real Spring
  // Boot 4 app, spring-petclinic, whose build.gradle only had the new name
  // — the old name alone would have missed it entirely).
  ["spring-boot-starter-web", "spring-boot"],
  ["spring-boot-starter-webmvc", "spring-boot"],
  ["spring-webmvc", "spring"],
  ["quarkus-resteasy-reactive", "quarkus"],
  ["quarkus-resteasy", "quarkus"],
  ["micronaut-http-server-netty", "micronaut"],
  // Rust (Cargo.toml)
  ["axum", "axum"],
  ["actix-web", "actix-web"],
  ["rocket", "rocket"],
  ["warp", "warp"],
  // Go (go.mod — full module path, no separate short name)
  ["github.com/gin-gonic/gin", "gin"],
  ["github.com/labstack/echo/v4", "echo"],
  ["github.com/gofiber/fiber/v2", "fiber"],
  ["github.com/go-chi/chi/v5", "chi"],
  // Ruby (Gemfile)
  ["rails", "rails"],
  ["sinatra", "sinatra"],
  ["hanami", "hanami"],
  // PHP (composer.json)
  ["laravel/framework", "laravel"],
  ["symfony/framework-bundle", "symfony"],
  ["slim/slim", "slim"],
  // .NET (*.csproj — Sdk attribute injected as a pseudo-dependency by
  // ecosystems/dotnet.ts, since a real ASP.NET Core web project usually has
  // no explicit PackageReference for the framework itself)
  ["Microsoft.NET.Sdk.Web", "aspnet"],
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
 * Repo-root manifests only — no monorepo/workspace awareness (see
 * packages/analyzer/README.md). "unknown" means "no recognized signal at
 * root", not "definitely no such framework" — a subpackage may use one this
 * v1 doesn't see, or the project may use a framework not yet in the list
 * above. `readAllDependencyNames` unions every ecosystem manifest found at
 * this path (package.json, requirements.txt/pyproject.toml, pom.xml/
 * build.gradle, Cargo.toml, go.mod, Gemfile, composer.json, *.csproj) — see
 * read-dependency-names.ts.
 */
export function analyzeFramework(repoPath: string): FrameworkAnalyzerResult {
  const dependencyNames = readAllDependencyNames(repoPath);

  return {
    frontend: matchSignal(dependencyNames, FRONTEND_SIGNALS),
    backend: matchSignal(dependencyNames, BACKEND_SIGNALS),
  };
}
