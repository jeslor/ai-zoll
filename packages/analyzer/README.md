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

- **Monorepo/workspace-aware, one level deep.** `workspace-discovery.ts` finds
  subpackages under `apps/*`/`packages/*` (plus any custom glob roots declared in
  `pnpm-workspace.yaml`/`package.json`'s `workspaces` field) and `FrameworkAnalyzer`,
  `DatabaseAnalyzer`, `TestAnalyzer`, `DependencyAnalyzer`, `DirectoryAnalyzer` are all
  run against the root *and* every discovered subpackage, then merged
  (`merge-findings.ts` — three distinct strategies: categorical fields report
  `unknown` with full detail on genuine disagreement rather than guessing, boolean
  fields use OR/union semantics with per-source coverage always in the reason text,
  array fields are a straight union). `framework.frontend` specifically also takes an
  optional `specializes` map (`FRONTEND_SPECIALIZES` in `framework-analyzer.ts`) so a
  meta-framework in one package and its own base library in another (`nextjs`
  alongside plain `react`, `sveltekit` alongside plain `svelte`) resolve to the
  meta-framework rather than a false "disagreement" — found dogfooding against real
  monorepos (cal.com, SvelteKit's own repo) where a tooling/CLI subpackage only needed
  the base library directly. Deliberately not extended to `backend` — NestJS doesn't
  unconditionally imply Express or Fastify the way a Next.js app always has React;
  that's a real, correctly-reported ambiguity when different packages use different
  adapters (also found dogfooding, against tRPC's and NestJS's own monorepos, both of
  which genuinely ship multiple backend integrations side by side). `PackageAnalyzer`
  (name/description) and
  `GitAnalyzer`'s `projectName` stay root-only — a monorepo's overall identity is
  inherently a root-level concept, not something to infer from a random subpackage.
  Nested workspaces (a subpackage that's itself a monorepo root) aren't walked —
  one level deep only. No real glob/YAML engine — a narrow, hand-written parser for
  `pnpm-workspace.yaml`'s `packages:` key specifically; `!`-prefixed exclusion globs
  are recognized and skipped, never filtered against.
- **Multi-language, dependency-manifest-based.** `FrameworkAnalyzer`/`DatabaseAnalyzer`/
  `TestAnalyzer`/`DependencyAnalyzer` all read `readAllDependencyNames()`
  (`read-dependency-names.ts`), which unions declared dependency names across every
  ecosystem manifest found at a path — package.json (Node), requirements.txt/
  pyproject.toml/Pipfile (Python), pom.xml/build.gradle[.kts] (Java), Cargo.toml
  (Rust), go.mod (Go), Gemfile (Ruby), composer.json (PHP), *.csproj (.NET) — see
  `packages/analyzer/src/ecosystems/`. Frontend-framework detection stays Node/JS-only
  (see `framework-analyzer.ts`'s comment on why). Workspace/monorepo discovery
  (`workspace-discovery.ts`) also understands each ecosystem's own workspace
  convention now, not just `apps/*`/`packages/*` + pnpm/npm-workspaces: Cargo's
  `[workspace] members = [...]` (Rust), uv's `[tool.uv.workspace] members = [...]`
  (Python), `go.work`'s `use` directives (Go), and Maven's `<modules>` (Java) —
  found missing, then fixed, dogfooding (see Phase 7's entries in
  `docs/plan/03-roadmap.md`). Still not understood: Poetry's own (weaker, less
  standardized) monorepo conventions, and nested workspaces more than one level deep.
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

The monorepo/workspace-awareness above was motivated by the same kind of real signal,
not a fixture: this repo's own root previously returned `unknown` for `framework`,
`database`, and `orm` — every real dependency lives in `apps/web`/`apps/api`, not the
root `package.json`. Re-running `analyzeRepository('.')` against this repo's actual
root after the fix correctly reports `frontend: nextjs` (from `apps/web`),
`backend: nestjs`/`database: postgresql`/`orm: prisma` (from `apps/api`), and
`unit testing: true` with coverage attributed across all 11 real packages in this repo
— a direct, concrete resolution of the gap that motivated building this, not just a
fixture-level proof.

A third real-repo pass, this time against a real NestJS backend (dual passport
strategies, Prisma+Postgres, Jest with an e2e script), surfaced two more gaps:
`DirectoryAnalyzer.signals` returned `unknown` even though the repo has a completely
standard, well-organized structure — one folder per business *domain*
(`Auth/`, `booking/`, `conversation/`), not per *layer*, so no directory NAME in the
candidate list ever matched. Fixed by adding a second, complementary signal source:
file-naming *suffixes* (`Name.controller.ts`, `Name.service.ts`, `Name.module.ts`, ...
— the actual NestJS/Angular convention), found via the same bounded, exclusion-aware
walk `TestAnalyzer` already uses. Still a raw fact, not a classification — a file being
named `*.controller.ts` is exactly as deterministic as a directory being named
`controllers/`. Separately, `TestAnalyzer`'s file-pattern check only recognized the
dot-separated convention (`*.spec.ts`) and missed NestJS's own official hyphenated e2e
convention (`*.e2e-spec.ts`) — this specific repo's `test:e2e` script happened to mask
the gap (script-based detection caught it anyway), but a repo relying on file presence
alone would have been missed; fixed to recognize both separators.
