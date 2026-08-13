# 03 — Roadmap & Phase Status

> Condensed from `docs/PRODUCT_SPEC.md` §37 (Development Phases) and §48 (Immediate
> Development Order). **This is the living plan file — update it as phases start/finish.**

Rule 1 applies to this whole document: do not start a phase before the previous one is
done, and do not jump straight to the dashboard (Phase 6) before the Blueprint engine
and generator (Phases 1-2) exist.

## Status legend

`not started` · `in progress` · `done`

## Phase 0 — Product Foundation — **in progress**

Monorepo, TypeScript, pnpm, Turborepo, web app, API, CLI, shared packages, PostgreSQL,
Prisma, basic CI. No complex UI yet.

- [x] Documented monorepo skeleton created (this bootstrap pass — folders + placeholder
      `package.json` per package, no framework deps, no business logic)
- [x] Real `apps/web` Next.js app scaffolded (`apps/web`, App Router, TypeScript,
      hand-written like every other package — no `create-next-app`). Next.js
      16.3.0 / React 19.2.8, `pnpm build`/`dev`/`start` via the real `next` CLI
      (there's no hand-rolled alternative to a bundler-based framework the way
      `apps/api`/`apps/cli` avoid `@nestjs/cli`), `typecheck` via plain `tsc
      --noEmit`, `lint` left as the same "pending Phase 0" placeholder used by
      the other two apps. One placeholder route (`src/app/page.tsx`) — no
      dashboard screens yet, that's Phase 6. Real `vitest` + Testing Library
      smoke test (`src/app/__tests__/page.test.tsx`), matching the "real vitest
      tests" bar the `apps/cli` scaffold set. Disabled Next 16's new
      `agentRules` auto-generated `AGENTS.md`/`CLAUDE.md` (`next.config.ts`) —
      this repo generates those files as a product feature, letting Next
      silently regenerate its own generic copies on every `next dev` would be
      actively confusing here. Verified for real: `next build` succeeds,
      `next dev` serves the page, curled it and confirmed the rendered `<h1>`
      matches `page.tsx`, and confirmed no `AGENTS.md`/`CLAUDE.md` reappear
      after a fresh `next dev` run.
- [x] Real `apps/api` NestJS app scaffolded, with its first real vertical slice:
      `POST/GET /projects`, `GET /projects/:id`, `POST/GET /projects/:id/blueprint`
      (hand-written, no `@nestjs/cli` — plain `tsc` build matching every other
      package). Blueprint writes are re-validated server-side via the canonical
      `safeParseBlueprint` from `@ai-zoll/blueprint` (Rule 9/ADR 0002),
      not a redefined DTO — every request body is Zod-validated (a small
      hand-written `ZodValidationPipe`, no `class-validator`). Every write creates
      an append-only `BlueprintVersion` row (spec §26) and upserts the
      `ProjectBlueprint` "current" pointer. `/analysis`, `/cli/auth`,
      `/cli/projects/:id/download` remain explicitly deferred (their own
      future units — need `packages/analyzer`'s actual analyzer logic and/or
      a real auth strategy, neither of which exist yet). Tested with
      service-level unit tests (fake Prisma) plus an in-memory HTTP e2e suite
      (`@nestjs/testing` + `supertest`, fake Prisma, no real DB needed for
      `pnpm test`) — 18 tests total, all offline. Verified for real: ran
      `prisma migrate dev` against a live Neon Postgres database and exercised
      every endpoint (including the 400/404 error paths) with real HTTP requests,
      confirming genuine round-trips through Postgres.
- [x] `POST /projects/:id/generate` + `GET /projects/:id/generated-files` —
      the last piece of the vertical slice above, split out once it needed
      its own package dependencies. Given a project's current (already
      Zod-validated on write) Blueprint and an `agentId`, re-validates the
      stored Blueprint (Rule 9 applies to any value flowing into
      `generateWorkspace`, not just fresh LLM output), runs the same
      `generateWorkspace` (`@ai-zoll/generators`) + `AgentAdapter`
      (`@ai-zoll/agents`) pipeline `apps/cli`'s `runInit` uses locally, and
      persists the result as `GeneratedArtifact` rows — replacing (not
      accumulating on top of) whatever the project generated last time, and
      upserting the project's `Agent.primary`. `getAgentAdapter`/
      `SUPPORTED_AGENT_IDS` moved from being CLI-local
      (`apps/cli/src/agent-adapters.ts`) to `@ai-zoll/agents` in the process,
      since both the CLI and the API now need the same "pick an adapter by
      id" logic — `apps/cli` updated to import it from there instead, no
      behavior change (all CLI tests still pass). One bug caught by the e2e
      suite before it shipped: `@UsePipes` at the method level applies to
      *every* handler parameter, not just `@Body()` — it was validating
      `@Param("projectId")` (a plain string) against the object-shaped
      request schema and failing every request. Fixed by scoping
      `ZodValidationPipe` to the `@Body()` parameter directly. Tested with
      service-level unit tests (fake Prisma) + e2e HTTP tests (7 new cases
      covering both endpoints' success/400/404 paths) — 30 tests total in
      `apps/api` now, still all offline for `pnpm test`. Verified for real:
      ran the built server against the live Neon database, created a real
      project + blueprint, called `/generate` for `claude` (11 real files
      written, content spot-checked), called it again for `cursor` and
      confirmed the artifacts were fully replaced (no `CLAUDE.md` left over,
      no duplicate rows), exercised the 400/404 paths with real requests, and
      cleaned up the test rows afterward.
- [x] Real `apps/cli` scaffolded — see "Phase 5 — CLI" below for the `init` command
      itself; this checklist item is just the app scaffolding (real `tsc` build,
      executable `dist/index.js` with shebang, real `vitest` tests).
- [x] PostgreSQL + Prisma wired up (`prisma/schema.prisma`) — all 6 minimal-model
      tables (`User, Project, ProjectBlueprint, BlueprintVersion, Agent,
      GeneratedArtifact`; `Organization`/`Repository`/`DriftReport` etc. still
      explicitly deferred per spec §31). Prisma 7 removed `datasource.url` from
      the schema file — connection setup now lives in `apps/api/prisma.config.ts`
      (CLI/Migrate) and a `@prisma/adapter-pg` driver adapter in `PrismaService`
      (runtime), both reading `DATABASE_URL` from `apps/api/.env`. See
      `prisma/README.md` for the monorepo-specific resolution notes (why
      `prisma`/`@prisma/client` are also listed in the repo root's
      `package.json`, and why the client generates into `apps/api/generated/`
      instead of `node_modules/@prisma/client`).
- [ ] CI actually runs meaningful typecheck/lint/test (currently placeholder-safe)

## Phase 1 — Blueprint Engine — **done**

`ProjectBlueprint`, `BlueprintSchema`, `BlueprintValidator`, `BlueprintVersion` in
`packages/blueprint`. Build `Project → Blueprint` using a mock AI provider first — the
system must work with zero external LLM dependency.

- [x] `ProjectBlueprintSchema` (Zod) + inferred types + `safeParseBlueprint`/
      `parseBlueprint` validation, with unit tests and fixtures covering the spec §4
      example, a minimal blueprint, and invalid-input cases (`packages/blueprint`)
- [x] Mock `AIProvider` implementing `generateBlueprint` (`packages/ai`) —
      `MockAIProvider` assembles a `BlueprintInput` into a validated `ProjectBlueprint`
      deterministically, no external LLM involved
- [x] `Project → Blueprint` wiring exercised end-to-end using the mock provider —
      proven at the package level via unit tests and a compiled-`dist` spot-check;
      CLI/API-level end-to-end wiring happens when `apps/cli`/`apps/api` are built
      (Phase 0 apps / Phase 5)

## Phase 2 — Deterministic Generator — **done**

`Blueprint → Template Engine → Workspace` in `packages/generators` +
`packages/templates`. Generates `README.md`, `PROJECT.md`, `ARCHITECTURE.md`,
`AGENTS.md`, `docs/`, `skills/`, `workflows/`. Fully deterministic — same Blueprint in,
same files out (golden-tested, see `06-testing-strategy.md`).

- [x] Generator core: `GeneratedFile` type (`packages/shared`) shared with the future
      `packages/agents` adapters; golden-test pattern via Vitest's
      `toMatchFileSnapshot()` established
- [x] `generateProjectMd` — `PROJECT.md` generator (`packages/generators`), golden
      tests for a full and a minimal Blueprint
- [x] `generateReadmeMd` — `README.md` generator: lean "front door" (name,
      description, stack summary, documentation index) that deliberately doesn't
      repeat `PROJECT.md`'s detailed fields; shares a `renderFooter` helper with
      `generateProjectMd` (`packages/generators/src/shared-fragments.ts`)
- [x] `generateArchitectureMd` — `ARCHITECTURE.md` generator
      (`packages/generators/src/documentation/`, the first content in that category):
      architecture style heading + explanation (spec §7) + stack layout. Blueprint
      test fixtures promoted to `packages/generators/src/__fixtures__/`, shared across
      all generator categories.
- [x] `generateWorkspace()` aggregator (`packages/generators/src/generate-workspace.ts`)
      — combines every generator's output into the full file list, with
      `assertNoDuplicatePaths` as a real safety check, not a formality. Now combines
      all 7 generators (`generateProjectMd`, `generateReadmeMd`,
      `generateArchitectureMd`, `generateDocs`, `generateAgentsMd`, `generateSkills`,
      `generateWorkflows`); for `fullBlueprint` that's 9 files (`PROJECT.md`,
      `README.md`, `ARCHITECTURE.md`, `docs/architecture/README.md`,
      `docs/development/README.md`, `docs/decisions/README.md`, `AGENTS.md`,
      `skills/testing/SKILL.md`, `workflows/feature-development.md`); for
      `minimalBlueprint` that's 8 (no `skills/` — no testing configured). This is the
      single source of truth for the current file count; individual generator bullets
      below don't repeat it.
- [x] `generateDocs` — `docs/` generator (`packages/generators/src/documentation/`):
      scaffolds `docs/architecture/`, `docs/development/`, `docs/decisions/` with a
      stub `README.md` each, not fabricated deep content — the current Blueprint
      schema doesn't carry spec §8's richer development-standards fields yet, so
      there's no data to generate real content from.
- [x] `generateAgentsMd` — `AGENTS.md` generator (`packages/generators/src/agent/`,
      the first content in that category — agent-agnostic instructions file, not to
      be confused with `packages/agents`' per-agent adapters, Phase 3). Prescriptive,
      not descriptive: stack/testing/security phrased as directives, not a repeated
      data table. Shares `ARCHITECTURE_STYLE_DISPLAY_NAMES` with
      `generateArchitectureMd` (`packages/generators/src/shared-fragments.ts`).
- [x] `generateSkills` — `skills/` generator (`packages/generators/src/skills/`, a
      new category not in the original 3-category assumption). Product-generated
      skills for end users' projects (spec §20 — distinct from this repo's own
      `.claude/skills/`), **conditionally generated**: `SkillDefinition.shouldInclude`
      decides per-Blueprint whether each skill applies, so `generateSkills` can
      legitimately return `[]` (proven for `minimalBlueprint`). Currently covers only
      `testing` (1 of 3 planned: `authentication`, `database`, `api-development` are
      deliberate follow-ups). `payments`/`deployment` from spec's example list are
      intentionally not planned — nothing in the current Blueprint schema maps to
      them without fragile text-matching heuristics. Shares `renderTestingRequirements`
      with `generateAgentsMd` (`packages/generators/src/shared-fragments.ts`).
- [x] `generateWorkflows` — `workflows/` generator (`packages/generators/src/workflows/`,
      a new category). Development process guides for an AI agent to follow (e.g.
      "adding a feature") — distinct from `AGENTS.md` (project-wide directives) and
      `skills/` (domain-area knowledge). Fixed set, not conditional (every project
      needs a feature-development process, unlike auth/database/testing skills) — same
      always-generate array pattern as `generate-docs.ts`. Currently covers only
      `feature-development` (1 planned; bug-fix/code-review are deliberate
      follow-ups). Reuses `ARCHITECTURE_STYLE_DISPLAY_NAMES`/`renderFooter`, no new
      promotion needed.
- [x] `packages/templates` — deliberately stays empty. Every reusable fragment found
      so far (footer, architecture display names, testing requirements) was small
      enough to live in `packages/generators/src/shared-fragments.ts` once a second
      consumer appeared; a separate template package was never actually needed. Not a
      gap — revisit only if a future generator needs genuinely large/complex template
      content this pattern doesn't fit.

**Every originally-listed Phase 2 checklist item is done**: generator core,
`PROJECT.md`, `README.md`, `ARCHITECTURE.md`, aggregator, `docs/`, `AGENTS.md`,
`skills/`, `workflows/`. The `main`/`phase-2/project-md-generator` branch divergence
flagged earlier is resolved — both are merged together here.

## Phase 3 — Agent Adapters — **done**

Implement one adapter first (recommend `ClaudeAdapter`, since this repo is developed
with Claude Code), then Cursor, then Codex. Do not implement all three at once.

- [x] `AgentAdapter` interface (`packages/agents/src/agent-adapter.ts`) — spec §21's
      full interface: `id`, `generateInstructions`, `generateSkills`,
      `generateRules`, `validate` (plus the `ValidationResult` type it returns).
- [x] `ClaudeAdapter.generateInstructions` (`packages/agents/src/claude/`) — produces
      `CLAUDE.md`, the file Claude Code actually discovers at the workspace root
      (not the agent-agnostic `AGENTS.md`). Reuses
      `renderAgentInstructions(blueprint, heading)` — extracted from
      `generate-agents-md.ts` (heading parameterized so `CLAUDE.md` doesn't
      literally open with the text "# AGENTS.md"; `AGENTS.md`'s own output verified
      unchanged) — so the substantive content stays DRY across the generic and
      Claude-specific instruction files.
- [x] `ClaudeAdapter.generateSkills` (`packages/agents/src/claude/generate-claude-skills.ts`)
      — calls `packages/generators`' `generateSkills` (same 0-N conditional behavior
      flows through automatically) and transforms each result: relocates
      `skills/<id>/SKILL.md` → `.claude/skills/<id>/SKILL.md` and prepends
      Claude Code's actual discovery frontmatter (`name`/`description`), which the
      canonical generator correctly doesn't include (frontmatter is Claude-specific,
      Rule 8). The frontmatter-description map is local to `packages/agents`, not
      added to `packages/generators`' `SkillDefinition` — keeps the generic layer
      agent-agnostic. Throws loudly (not silently) if a future skill id has no
      frontmatter mapping yet, rather than emitting an undiscoverable skill file.
- [x] `CursorAdapter.generateInstructions`/`.generateSkills`
      (`packages/agents/src/cursor/`) — researched Cursor's actual current (2026)
      convention rather than guessing: `.cursor/rules/*.mdc`, YAML frontmatter
      (`description`/`globs`/`alwaysApply`), **`.mdc` extension load-bearing** (a
      plain `.md` file there is silently ignored by Cursor's rules system). Sources:
      [Cursor Docs — Rules](https://cursor.com/docs/rules),
      [Cursor Rules Best Practices (Morph)](https://www.morphllm.com/cursor-rules-best-practices).
      `generateInstructions` → one always-applied `.cursor/rules/project.mdc`
      (reuses `renderAgentInstructions`, same as Claude); `generateSkills` → one
      `.mdc` per canonical skill, `alwaysApply: false`, scoped via `globs`
      (Cursor's "Auto Attached" rules are its closest analog to a contextual skill).
      Same local frontmatter-map + throw-on-unmapped-id pattern as `ClaudeAdapter`.
      Splitting `generateInstructions` into multiple concern-scoped files (Cursor's
      own best-practice recommendation) is a deliberate future enhancement, not done
      here.
- [x] `CodexAdapter.generateInstructions`/`.generateSkills` (`packages/agents/src/codex/`)
      — researched Codex's actual convention: Codex reads `AGENTS.md` directly
      (OpenAI originated the format for Codex, later transferred to the Linux
      Foundation's Agentic AI Foundation for cross-vendor stewardship), concatenating
      every `AGENTS.md` from the git root down to the cwd. **`generateInstructions`
      deliberately returns `[]`** — the canonical `AGENTS.md` `generateAgentsMd`
      already produces *is* Codex's real instructions file, unmodified; unlike
      Claude/Cursor, no adapted file is needed. This is a genuine finding validating
      spec Principle 2 (agent-agnostic), not a stub — covered by a dedicated test.
      `generateSkills` → `.codex/skills/<id>/SKILL.md`, structurally identical to
      Claude's convention (`name`/`description` frontmatter, one level deep).
      Sources: [Custom instructions with AGENTS.md — OpenAI Codex docs](https://developers.openai.com/codex/guides/agents-md),
      [Where Are Codex CLI Skills Stored?](https://www.agensi.io/learn/where-are-codex-cli-skills-stored).
      **Refactor:** extracted `packages/agents/src/shared-skill-remap.ts`
      (`remapSkillFile`) once Claude's and Codex's skill-remap logic turned out
      structurally identical — `generate-claude-skills.ts` now delegates to it too
      (verified via unchanged tests/golden files). Cursor's version stays separate;
      its frontmatter shape genuinely differs.

- [x] `generateRules` for all three adapters — researched each agent's actual "rules"
      concept rather than guessing, and all three return `[]`, each for a different,
      sourced reason: **Claude** has a real `.claude/rules/` mechanism (glob-scoped
      `.md`, added early 2026) but nothing in the current Blueprint is genuinely
      pattern-scoped convention data — the only candidate content is already
      correctly always-relevant, which is why it lives in `CLAUDE.md` instead
      ([source](https://claudefa.st/blog/guide/mechanics/rules-directory)).
      **Cursor**'s "rules" *are* the `.mdc` files, already fully used by
      `generateInstructions`+`generateSkills` — nothing left to add without
      inventing content. **Codex** has no separate rules concept at all — OpenAI's
      own guidance recommends `AGENTS.md`/checked-in docs instead
      ([source](https://www.codegateway.dev/en/blog/openai-codex-cli-complete-guide-2026)).
- [x] `validate` for all three adapters — shared `validateSkillCoverage`
      (`packages/agents/src/validate-skill-coverage.ts`), checking whether every
      skill a Blueprint triggers (via `packages/generators`' `generateSkills`) has a
      frontmatter entry in *this* adapter's map — i.e., whether `generateSkills`
      would succeed without throwing, exposed as a non-throwing predicate. The check
      itself is agent-agnostic (just "is this key present"), so it's shared across
      all three despite each adapter's map carrying different extra rendering fields
      (e.g. Cursor's `globs`). Proven to actually catch drift: calling it with an
      empty frontmatter map against a real Blueprint correctly reports
      `valid: false` with a specific issue.

All three initial adapters (`ClaudeAdapter`/`CursorAdapter`/`CodexAdapter`) now
implement the complete spec §21 `AgentAdapter` interface.

## Phase 4 — AI Blueprint Generation — **done**

Connected a real `AIProvider`: `ClaudeAIProvider` (`packages/ai/src/providers/
claude-ai-provider.ts`), built on the official `@anthropic-ai/sdk` and Claude's
Structured Outputs (`messages.parse()` + `output_config.format`, schema reused
directly from `ProjectBlueprintSchema.omit({ version: true })` — no hand-duplicated
JSON Schema).

- Per ADR 0004, the model only does real interpretive work on `features` and light
  polish on `project.description` — every other field (`project.name`/`type`,
  `architecture`, `stack`, `testing`, `security`, `agent`) is the user's explicit
  selection and is enforced from the original input in **code**
  (`ClaudeAIProvider.mergeCandidate`), not merely requested via the system prompt.
- Every candidate — first attempt and one bounded repair attempt — is validated
  through the same `safeParseBlueprint`/`BlueprintValidationError` pipeline
  `MockAIProvider` already established (Rule 9: never let an LLM response bypass
  schema validation). On a validation failure, one repair request is sent containing
  the invalid candidate and the exact issues; if that also fails,
  `BlueprintValidationError` is thrown with the latest issues. Two Claude calls max.
- Model: `claude-opus-4-8`, `thinking: {type: "adaptive"}`,
  `output_config.effort: "medium"` (deliberately below the `high` default — spec §34
  AI Cost Control, since this is a small structured-extraction-plus-light-reasoning
  task).
- No API-key handling code in the package — `new Anthropic()` resolves
  `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN`/an `ant auth login` profile on its own.
- Fully offline test suite (`packages/ai/src/__tests__/claude-ai-provider.test.ts`,
  11 tests total in the package): the Anthropic client is injected via the
  constructor and tests use a minimal fake (`{ messages: { parse: vi.fn() } }`) — no
  real network calls, no `ANTHROPIC_API_KEY` needed to run `pnpm test`.
- Wired into the CLI: `apps/cli/src/select-ai-provider.ts` picks `ClaudeAIProvider`
  when `ANTHROPIC_API_KEY` is set, else falls back to `MockAIProvider` with a stderr
  notice — `run-init.ts` no longer hardcodes `MockAIProvider`.
- `analyzeRepository`/`generateProjectContext` remain out of scope (Phase 7/8 — no
  `RepositoryProfile`/`RepositoryAnalysis`/`ProjectContext` shape exists yet).
- No live API call was made as part of verification (offline tests only, by choice);
  a real `ANTHROPIC_API_KEY`-backed run is worth trying manually.

## Phase 5 — CLI — **in progress**

> **Scope pivot (this session):** the product direction narrowed to a fully
> self-contained CLI — `apps/web`/`apps/api` are out of active scope, and the
> CLI now defaults to **zero AI/LLM calls, ever** (see the `--ai` note below).
> This supersedes the "CLI must be usable with zero dashboard involvement"
> framing below with something stronger: the CLI has no dashboard/API
> dependency to begin with. `apps/web`/`apps/api`'s existing code is left
> in place, not deleted, but isn't being actively built on right now.

`npx ai-zoll init` (interactive), then `init <project-id>` (downloads a
dashboard-created blueprint). CLI must be usable with zero dashboard involvement.

- [x] `init` (interactive, no project-id) — **this is spec §41's MVP milestone,
      concretely realized**: `@inquirer/prompts` wizard (`apps/cli/src/commands/
      init.ts`) collects a structured `BlueprintInput` (project/architecture/stack/
      testing/security, plus which of the three real agents —
      `claude`/`cursor`/`codex`; `copilot` isn't offered since there's no
      `CopilotAdapter` yet) → `selectAIProvider(useAI).generateBlueprint`
      (`MockAIProvider` by default — see the `--ai` opt-in item below — see
      Phase 4) → `adapter.validate` (first real caller of the Phase 3 `validate`
      work) →
      `generateWorkspace` + the chosen `AgentAdapter`'s `generateInstructions`/
      `generateSkills`/`generateRules`, merged and `assertNoDuplicatePaths`-checked
      → written to a new local directory. Refuses to write into a non-empty
      directory. The orchestration core (`run-init.ts`) is a plain, prompt-library-
      free async function — fully unit-tested (temp-directory writes, non-empty-dir
      refusal, invalid-input rejection) without needing a TTY. Verified for real:
      generated actual multi-file project directories on disk for all three agents
      and read the output back.
- [x] `init` now also registers with `apps/api` when configured — spec §48 step 10
      ("new-project workflow"), closing the gap between the two now-real pieces.
      `apps/cli/src/register-with-api.ts`: when `AI_ZOLL_API_URL` is set,
      `POST /projects` then `POST /projects/:id/blueprint` with the already-
      validated blueprint, using native `fetch` (no new dependency). Deliberately
      **no auth** — those endpoints are unauthenticated by design
      (`Project.userId` is nullable for exactly this reason); `login`/token
      handling stays a separate future unit for whenever `init <project-id>`
      needs a real user identity. Env-var-gated and silent when unset (unlike
      the AI provider choice, this is an opt-in extra, not a capability worth
      announcing every run); when set, a one-line stderr notice either way.
      Never fails `init` itself — any API failure (network error, non-2xx) is
      caught and swallowed, local file generation is unaffected either way.
      `RunInitResult` gained `projectId: string | null`. Tested fully offline
      (mocked `fetch`) plus a real round-trip: ran the compiled CLI against a
      locally-running `apps/api` backed by the live Neon database, confirmed
      the created `Project`/`ProjectBlueprint` rows are real and retrievable via
      `GET`, and that local files still write normally regardless.
- [x] `--ai` becomes a strict, explicit opt-in for the real `ClaudeAIProvider`
      (`apps/cli/src/select-ai-provider.ts`) — no more auto-detecting
      `ANTHROPIC_API_KEY` and silently switching providers. `MockAIProvider`
      (deterministic, zero network calls) is the only default now, regardless
      of whether a key is present in the shell; a discoverability notice is
      printed when a key is set but unused. `--ai` with no key throws a clear
      error rather than silently degrading to Mock. Threaded through
      `RunInitOptions.useAI` → `commands/init.ts` → `index.ts`'s `process.argv`
      parsing (no arg-parser library, matching repo convention).
- [x] `sync [agent]` — regenerates an already-initialized project's files,
      either re-syncing with the current agent or switching to a different
      one, entirely offline (zero AI). Three new modules in `apps/cli/src/`:
      `managed-content.ts` (wraps every generated file's content in
      `<!-- ai-zoll:managed:start/end -->` markers; hand-written content below
      the markers is preserved verbatim across every future regeneration —
      pure string functions, no fs), `project-state.ts` (persists
      `.ai-zoll/state.json` — the Blueprint plus the last-generated path
      list — committed to git, re-validated via `safeParseBlueprint` on every
      read since a human can hand-edit it), and `run-sync.ts` (the
      orchestration: reconciles orphaned files *before* writing new ones,
      deleting only files with no real custom content and leaving anything
      else — including symlinks and files whose markers are missing/malformed
      — untouched and reported back rather than guessed at). `getAgentAdapter`/
      `SUPPORTED_AGENT_IDS` reused from `@ai-zoll/agents` (already promoted
      there for the `apps/api` `/generate` work). `init` now writes every file
      pre-wrapped and a `state.json` from its first run, so a project has what
      `sync` needs from day one. 53 tests in `apps/cli` (up from 17), covering
      the merge algorithm's edge cases (missing vs. malformed markers, custom
      zones containing marker-like text, multiple marker occurrences),
      `state.json` failure modes (missing/corrupt/version-mismatched), and
      `run-sync` end-to-end (same-agent no-op resync, custom content surviving
      a resync, full agent switch with `AGENTS.md` proven agent-invariant,
      an outgoing file with real custom content preserved not deleted, a
      symlinked path left untouched, a directory occupying a wanted path
      preserved-with-warning instead of crashing). Verified for real: built
      the CLI, ran `init` into a scratch directory for Claude, hand-appended a
      note below `CLAUDE.md`'s marker, ran `sync cursor`, confirmed `CLAUDE.md`
      survived with the note intact, `.claude/` was removed, `.cursor/rules/*`
      was created, `AGENTS.md` was untouched, and `state.json` reflected the
      new agent — plus a same-agent `sync` and an unsupported-agent error path.
- [ ] `init <project-id>` (downloads a dashboard-created blueprint) — needs
      `apps/web` and an auth strategy first
- [ ] `analyze`, `login` — later Phase 5/7 commands (`sync` is now done, see above)

## Phase 6 — Dashboard — **not started**

New Project / Existing Project flows, Project Overview, Blueprint Editor, Agent
Selection, Generated Workspace Preview. Consumes the same blueprint APIs as the CLI —
built only after Phases 1-2 exist, not before.

## Phase 7 — Existing Project Analysis — **in progress**

`npx ai-zoll analyze`. Deterministic analyzers first (see
`packages/analyzer`), then AI interpretation on top (opt-in via the same `--ai` flag
`init` uses — real, not required; improves output, never a hard dependency). Never
modifies application source code at this stage.

- [x] `packages/analyzer` first slice — `PackageAnalyzer`, `FrameworkAnalyzer`,
      `DatabaseAnalyzer`, `TestAnalyzer`, combined by `analyzeRepository()`, following
      `.claude/skills/add-repo-analyzer/SKILL.md`'s established convention (three-tier
      `Confidence` — `detected`/`likely`/`unknown`, not a numeric score; secret
      exclusion via `isExcludedPath`; structured findings only, no prose). Each maps
      directly to an existing `ProjectBlueprint` field — `project.name/description`,
      `stack.frontend/backend`, `stack.database/orm`, `testing.unit/integration/e2e` —
      no schema changes needed. Repo-root only for v1 — no monorepo/workspace
      awareness (documented once in `packages/analyzer/README.md`, not repeated per
      analyzer); Node/TypeScript ecosystem only.
      `DatabaseAnalyzer`'s Prisma detection scopes its regex to the `datasource { ... }`
      block specifically (a schema's `generator` block also has its own unrelated
      `provider` field) and skips `//`-commented lines within it, so a commented-out
      alternate provider left for reference isn't false-matched.
      `TestAnalyzer` checks three independent signal classes (devDependencies,
      `scripts.test` excluding the npm-init placeholder, and a bounded/exclusion-aware
      file walk) before reporting a confident "no tests at all" — evidence for one
      test type never implies a false negative for another. 39 tests, all fixture-based
      (drawn from a design review against realistic Node/TS project shapes — monorepo
      roots, mid-ORM-migration repos, the npm-init placeholder trap). Verified for
      real: ran `analyzeRepository()` against this monorepo's own root, which caught a
      genuine gap during development (pnpm's `pnpm-workspace.yaml` wasn't recognized as
      a monorepo-root signal, only npm/yarn's `workspaces` field was) — fixed and
      re-verified against this repo's own root, which is itself a live demonstration of
      the stated root-only limitation (this repo's actual frontend/backend frameworks
      live in `apps/web`/`apps/api`, not the root `package.json`, so they correctly
      report `unknown`).
- [x] `packages/analyzer` second slice — `GitAnalyzer`, `DependencyAnalyzer`,
      `DirectoryAnalyzer`, extending `analyzeRepository()` to all seven analyzers from
      spec §14's named list. Only the `analyze` CLI command itself remains — the next
      step, not built yet. A design review against `docs/decisions/
      0004-deterministic-vs-ai-boundary.md` changed the original sketch materially:
      the ADR explicitly assigns "directory detection" to the deterministic side and
      "architecture reasoning" to the AI-assisted side, so `DirectoryAnalyzer` does
      **not** classify `architecture.style` from folder names (the original plan) —
      it reports which known convention directory names exist as raw facts
      (`signals: Finding<string[]>`) and stops there, guarded by a test that fails if
      the result ever contains an architecture-style value. `architecture.style`
      remains the user's direct choice in the CLI wizard (spec §7), or a future
      optional `--ai` layer's job — the concrete first instance of "AI improves
      output, never required" from this session's product-direction discussion.
      `GitAnalyzer` reads `.git/config` directly by exact path (same targeted-read
      pattern `DatabaseAnalyzer` already uses for `prisma/schema.prisma`, not the
      traversal-only `isExcludedPath` gate) for a host-agnostic remote-URL-derived
      `project.name` fallback, plus an independent directory-structure-based monorepo
      signal deliberately not reconciled with `PackageAnalyzer`'s own (different)
      monorepo signal — combining multiple analyzers' findings into one answer is a
      later "assemble Blueprint from analysis" stage's job. `DependencyAnalyzer` maps
      a narrow, reviewed list of authentication/authorization packages to
      `security.authentication/authorization`, always `likely` (never `detected` —
      inferring a mechanism from a dependency list is inherently indirect), checking
      strategy-specific `passport-*` packages before the less-informative bare
      `passport`. 24 new tests (63 total in `packages/analyzer` now). Verified for
      real: re-ran `analyzeRepository('.')` against this repo's own root — correctly
      derived `project.name` "ai-zoll" from the real git remote, correctly detected
      the real `apps/*`/`packages/*` monorepo layout, and correctly reported
      `unknown` for dependency/directory signals (root `package.json` has no
      auth-related deps, root has no `src/domain` etc. — the same honest root-only
      limitation as the first slice, working as designed).

## Phase 8 — Existing Project AI Layer — **not started**

Generate `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `skills/`,
agent-specific config around an existing repo. Preserve existing source. Idempotent —
running twice must not duplicate files.

## Phase 9 — Sync — **not started**

`npx ai-zoll sync`. Compare local Blueprint, remote Blueprint, local AI
context; show a diff before applying anything.

## Phase 10 — Organizations — **not started**

Only after individual (single-developer) workflows are validated. Organizations,
Teams, Shared Standards, Project Templates, Roles.

## Phase 11 — Drift Detection — **not started**

`npx ai-zoll check`. Compare expected architecture vs. actual repository
state; report violations (import boundary breaks, undocumented directories, testing
convention mismatches).

## Immediate development order (spec §48)

1. Monorepo foundation → 2. Blueprint schema → 3. Blueprint validation → 4. Template
engine → 5. Generated workspace → 6. First agent adapter → 7. Mock AI provider →
8. Real AI provider → 9. CLI → 10. New-project workflow → 11. Dashboard →
12. Existing-project analyzer → 13. Existing-project AI layer → 14. Additional agent
adapters → 15. Blueprint versioning → 16. Sync → 17. Organization mode →
18. Drift detection.

**Next up:** Phases 1-4 are done; step 10 ("New-project workflow") is now also
done — `apps/cli init` and `apps/api`'s Projects/Blueprint endpoints are wired
together end-to-end (unauthenticated). The next unstarted step in spec §48's order
is step 11, `apps/web` (Dashboard) — the Next.js app is now scaffolded (Phase 0)
but has none of Phase 6's actual screens yet (New Project, Existing Project,
Project Overview, Blueprint Editor, Agent Selection, Generated Workspace
Preview). Of those, New Project / Blueprint Editor / Agent Selection /
Project Overview / Generated Workspace Preview all now have real `apps/api`
endpoints to consume (`/projects`, `/projects/:id/blueprint`,
`/projects/:id/generate`, `/projects/:id/generated-files`); only Existing
Project remains blocked, on `/analysis` (needs `packages/analyzer`'s actual
analyzer logic, Phase 7, not started). Auth
(`login`/`POST /cli/auth`, real `Project.userId` values, `init <project-id>`) is
still an open decision, deferred until the dashboard or CLI genuinely needs it.
