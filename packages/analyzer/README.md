# @ai-zoll/analyzer

Deterministic repository analyzers for the existing-project workflow.
See `docs/PRODUCT_SPEC.md` §13-17 and `docs/plan/03-roadmap.md` Phase 7.

**Status:** all seven analyzers from spec §14's named list are built — `PackageAnalyzer`,
`FrameworkAnalyzer`, `DatabaseAnalyzer`, `TestAnalyzer`, `GitAnalyzer`,
`DependencyAnalyzer`, `DirectoryAnalyzer`, combined by `analyzeRepository()`. Consumed
by the real `ai-zoll analyze` CLI command (`apps/cli/src/commands/analyze.ts` +
`run-analyze.ts`) — existing-project support is usable end-to-end on the deterministic
path today. See `.claude/skills/add-repo-analyzer/SKILL.md` before adding another
analyzer.

**`DirectoryAnalyzer` does not classify `architecture.style`.** `docs/decisions/
0004-deterministic-vs-ai-boundary.md` explicitly puts "directory detection" on the
deterministic side and "architecture reasoning" on the AI-assisted side — deciding that
`domain/`+`application/`+`infrastructure/` directories *mean* "domain-driven-design" is
reasoning about what a fact implies, not the fact itself. This analyzer reports which
known convention directory names exist (`signals: Finding<string[]>`) and stops there;
`architecture.style` remains the user's direct choice in the CLI wizard, or a future
optional `--ai` layer's job to interpret this signal set.

## v1 scope, stated explicitly

- **Repo-root only — no monorepo/workspace awareness.** No analyzer scans
  `apps/*/package.json` or a `pnpm-workspace.yaml`'s member packages; `PackageAnalyzer`
  and `FrameworkAnalyzer` only ever read the repo root's own `package.json`, and
  `DatabaseAnalyzer` only checks `prisma/schema.prisma` at the root. An `unknown` or
  `false` finding means "absent at root," not "absent in the project" — a subpackage
  may have a real signal this v1 doesn't see (this project's own root is a live example:
  `apps/web`/`apps/api`/`apps/cli` each have their own real dependencies the root
  `package.json` doesn't list).
- **Node/TypeScript ecosystem only.** No Python/Rust/Go/Ruby/Java detection.
- Every finding carries a three-tier `Confidence` (`detected`/`likely`/`unknown`), not
  a numeric score — a numeric confidence would imply precision this tool can't actually
  justify.
- Secret-exclusion (`isExcludedPath`) is enforced wherever an analyzer walks the
  filesystem — see `docs/plan/05-security-and-privacy.md`.

## Dogfooded against a real repo, not just fixtures

`FrameworkAnalyzer` and `DirectoryAnalyzer` were run against a real, unmodified external
Next.js/React repository (not a fixture written to make a specific test pass), which
surfaced real gaps fixtures alone hadn't: `DirectoryAnalyzer`'s candidate list was
originally tuned for backend/DDD-shaped repos only and returned `unknown` for an
actual, clearly-structured frontend project (`app/`, `components/`, `lib/`, `store/`).
It's since been expanded (researched, not guessed) to also recognize standard
React/Next.js folders, Feature-Sliced Design layers, and Atomic Design folders —
still never classifying `architecture.style` itself, per the ADR 0004 boundary above.
`FrameworkAnalyzer` gained Nuxt/SvelteKit/Remix/Astro/Svelte (frontend) and
Koa/Hapi/Hono (backend), each ordered correctly relative to the base framework they
transitively depend on (e.g. Nuxt before plain Vue). `PackageAnalyzer` also had a
misleading `unknown` reason fixed — a missing `description` field was reported as "no
package.json found," even when the file clearly existed (proven by `name` being found
from that same file).
