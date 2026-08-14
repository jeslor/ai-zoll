# 03 — Roadmap & Phase Status

> Condensed from `docs/PRODUCT_SPEC.md` §37 (Development Phases) and §48 (Immediate
> Development Order). **This is the living plan file — update it as phases start/finish.**

Rule 1 applies to this whole document: do not start a phase before the previous one is
done, and do not jump straight to the dashboard (Phase 6) before the Blueprint engine
and generator (Phases 1-2) exist.

> **Product pivot: CLI-only.** `apps/web` (Dashboard) and `apps/api` (REST API +
> Postgres) were built, tested, verified against a live database — and then
> **deliberately removed**. AI Zoll is now a fully self-contained CLI: no server, no
> database, no dashboard. The Phase 0 / Phase 6 entries below are kept as an honest
> historical record of what was built and why (useful context, not something to erase),
> but they no longer describe current or planned work. Phases 9 ("Sync" in its original
> remote-Blueprint-diff sense), 10 (Organizations), and 11 (Drift Detection) all
> presupposed the dashboard/API and are now out of scope entirely, not just deferred —
> see each phase's status line below. The CLI's own `sync` command (Phase 5) already
> covers the "keep context in sync" need this pivot actually cares about, without any
> of that infrastructure.

## Status legend

`not started` · `in progress` · `done`

## Phase 0 — Product Foundation — **done**

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
- [x] CI actually runs meaningful build/typecheck/lint/test — turned out to already be
      mostly true (`.github/workflows/ci.yml` has run `typecheck`/`lint`/`test` via
      `turbo` since the very first bootstrap commit; an earlier session mistakenly
      reported this as still pending after a truncated file read, corrected here).
      What was genuinely missing: an explicit `Build` step (previously `build` only
      ran implicitly as a `^build` dependency of `typecheck`/`test` in `turbo.json`,
      never verified directly as its own CI step — added). `turbo.json`'s `test` task
      also declared a `coverage/**` output nothing has ever produced (no package runs
      vitest with `--coverage`) — removed the stale declaration rather than bolt on
      an unrequested coverage-reporting pipeline. Verified for real: ran the exact
      `pnpm install --frozen-lockfile` → `pnpm run build` → `pnpm run typecheck` →
      `pnpm run lint` → `pnpm run test` sequence CI runs, locally, with no
      `DATABASE_URL` set (matching a clean CI environment — `apps/api`'s tests use a
      fake/mocked Prisma, no live database needed) — all green, 275 tests passing
      across every package.

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
- [x] `CopilotAdapter.generateInstructions`/`.generateSkills` (`packages/agents/src/
      copilot/`) — researched GitHub Copilot's actual (2026) convention: a
      repo-wide `.github/copilot-instructions.md` plus path-specific
      `.github/instructions/*.instructions.md` files carrying `applyTo` glob
      frontmatter (comma-separated globs, e.g. `applyTo: "**/*.ts,**/*.tsx"`).
      Source: [Adding custom instructions for GitHub Copilot](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot).
      `generateInstructions` → one `.github/copilot-instructions.md` (reuses
      `renderAgentInstructions`, same as Claude/Cursor). `generateSkills` → one
      `.instructions.md` per canonical skill under `.github/instructions/`, via a
      new `copilot-frontmatter.ts` (hand-written `applyTo` YAML, no library
      dependency, same precedent as `mdc-frontmatter.ts`) and
      `generate-copilot-skills.ts` (`COPILOT_SKILL_FRONTMATTER` map + throw-on-
      unmapped-id, same pattern as Claude/Cursor/Codex). Wired into
      `SUPPORTED_AGENT_IDS`/`getAgentAdapter` — `apps/cli`'s `promptAgent` needed
      zero changes since it derives its choices from `SUPPORTED_AGENT_IDS`
      directly. Verified for real: ran `runInit` end-to-end targeting
      `agentId: "copilot"` and inspected the actual on-disk
      `.github/copilot-instructions.md` and `.github/instructions/
      testing.instructions.md` output.

- [x] `generateRules` for all four adapters — researched each agent's actual "rules"
      concept rather than guessing, and all four return `[]`, each for a different,
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
      **Copilot**'s path-specific `.instructions.md` files are already its full
      "rules" mechanism, fully used by `generateSkills` — same reasoning as Cursor.
- [x] `validate` for all four adapters — shared `validateSkillCoverage`
      (`packages/agents/src/validate-skill-coverage.ts`), checking whether every
      skill a Blueprint triggers (via `packages/generators`' `generateSkills`) has a
      frontmatter entry in *this* adapter's map — i.e., whether `generateSkills`
      would succeed without throwing, exposed as a non-throwing predicate. The check
      itself is agent-agnostic (just "is this key present"), so it's shared across
      all four despite each adapter's map carrying different extra rendering fields
      (e.g. Cursor's `globs`, Copilot's `applyTo`). Proven to actually catch drift:
      calling it with an empty frontmatter map against a real Blueprint correctly
      reports `valid: false` with a specific issue.
- [x] **Future adapter candidates researched and documented, not built** — spec §21
      requires the adapter pattern to scale to agents beyond the initial four
      without touching the Blueprint or generator core; see
      `docs/decisions/0003-agent-adapter-pattern.md`'s "Future adapter candidates"
      section for the full 2026 landscape survey (Cline, Zed, and why several
      once-obvious candidates — Gemini CLI, Amazon Q, Windsurf — are no longer
      live targets). Deliberately scoped down to research + documentation only
      this session, not implementation (Rule 1) — each real candidate adapter is
      its own future task.

All four adapters (`ClaudeAdapter`/`CursorAdapter`/`CodexAdapter`/`CopilotAdapter`)
now implement the complete spec §21 `AgentAdapter` interface.

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
- Wired into the CLI via `apps/cli/src/select-ai-provider.ts` — `run-init.ts` no
  longer hardcodes `MockAIProvider`. **Superseded by the Phase 5 `--ai` opt-in item
  below**: this originally auto-selected `ClaudeAIProvider` whenever
  `ANTHROPIC_API_KEY` was present in the shell; that auto-detection was later
  replaced with a strict, explicit `--ai` flag (see Phase 5) — `selectAIProvider`
  now takes a `useAI: boolean` parameter instead of reading the env var itself.
- `analyzeRepository`/`generateProjectContext` remain out of scope (Phase 7/8 — no
  `RepositoryProfile`/`RepositoryAnalysis`/`ProjectContext` shape exists yet).
- No live API call was made as part of verification (offline tests only, by choice);
  a real `ANTHROPIC_API_KEY`-backed run is worth trying manually.

## Phase 5 — CLI — **in progress**

> **Scope pivot (this session):** the product direction narrowed to a fully
> self-contained CLI, and the CLI now defaults to **zero AI/LLM calls, ever**
> (see the `--ai` note below). This supersedes the "CLI must be usable with zero
> dashboard involvement" framing below with something stronger: the CLI has no
> dashboard/API dependency to begin with. `apps/web`/`apps/api`/`prisma/` were
> initially left in place as the pivot was decided, then fully removed later in
> the same session once the CLI-only direction was confirmed — see Phase 6's
> entry and `register-with-api.ts`'s removal note below.

`npx ai-zoll init` (interactive), then `init <project-id>` (downloads a
dashboard-created blueprint). CLI must be usable with zero dashboard involvement.

- [x] `init` (interactive, no project-id) — **this is spec §41's MVP milestone,
      concretely realized**: `@inquirer/prompts` wizard (`apps/cli/src/commands/
      init.ts`) collects a structured `BlueprintInput` (project/architecture/stack/
      testing/security, plus which agent to target — `promptAgent` derives its
      choices directly from `SUPPORTED_AGENT_IDS`, so `claude`/`cursor`/`codex`/
      `copilot` are all offered with zero prompt-code changes needed when
      `CopilotAdapter` was added in Phase 3) → `selectAIProvider(useAI).generateBlueprint`
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
- ~~`init` now also registers with `apps/api` when configured~~ — **removed as part
      of the CLI-only pivot.** This existed briefly (`apps/cli/src/
      register-with-api.ts`: `POST /projects` + `POST /projects/:id/blueprint` via
      `fetch` when `AI_ZOLL_API_URL` was set) but depended entirely on `apps/api`,
      which has since been deleted along with `apps/web` and `prisma/` (see the
      scope-pivot note at the top of this phase). `register-with-api.ts` and its
      test were deleted, `run-init.ts`'s `RunInitResult` no longer carries a
      `projectId` field, and `RunInitResult` is now just `{ outputDir, files }`.
      Kept here as a historical record, not silently dropped from the log.
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
- [x] Fixed a real non-destructiveness bug in `apply-generated-files.ts`, found during
      Phase 7's fourth dogfooding pass (see there for the full context): cal.com's
      real repo has `.cursor/rules` and `.claude/skills` as pre-existing symlinks into
      a real, git-tracked `agents/` directory it maintains itself (sharing rule
      content across agent tools). The writer only checked whether the *leaf* file
      path was a symlink (`lstatSync(fullPath).isSymbolicLink()`) — an intermediate
      *directory* being a symlink resolves transparently at the OS level, so
      `.cursor/rules/project.mdc` silently wrote through the symlink into cal.com's
      real `agents/rules/` directory, and a stale path reconciliation during a
      same-run agent switch briefly did the same for a delete. Fixed with a new
      `hasSymlinkedAncestor` check (any directory between `projectDir` and a file's
      parent), applied to both the write and stale-deletion paths — treated exactly
      like the existing leaf-symlink case: preserved, reported, never touched. 2 new
      tests reproducing the exact scenario (a symlinked ancestor pointing to a real
      directory with real content, for both the write and delete paths); all 58
      pre-existing `apps/cli` tests passed unchanged. Verified for real: re-cloned
      cal.com fresh, rebuilt, re-ran the full `analyze` → `sync cursor` pipeline, and
      confirmed cal.com's real `agents/rules/`/`agents/skills/` directories were no
      longer polluted (previously confirmed polluted with the pre-fix build).
- ~~`init <project-id>` (downloads a dashboard-created blueprint)~~ — **out of
      scope (CLI-only pivot).** Presupposed `apps/web`, which no longer exists.
- [x] `analyze` — shipped, see Phase 7.
- ~~`login`~~ — **out of scope (CLI-only pivot).** Existed only to support
      `init <project-id>` and dashboard auth, both removed above; there is no
      remaining CLI-only use case for authentication. Not tracked as a pending
      item — this is a fully local, account-free tool by design.

## Phase 6 — Dashboard — **out of scope (CLI-only pivot)**

New Project / Existing Project flows, Project Overview, Blueprint Editor, Agent
Selection, Generated Workspace Preview. `apps/web` was actually scaffolded at one
point (Next.js, App Router) but was removed along with `apps/api` when the product
pivoted to CLI-only — see the note at the top of this document. Not "not started
yet," genuinely not planned under the current direction.

## Phase 7 — Existing Project Analysis — **done, including the AI-assisted layer and multi-language support**

`npx ai-zoll analyze`. Deterministic analyzers first (see
`packages/analyzer`), then AI interpretation on top (opt-in via the same `--ai` flag
`init` uses — real, not required; improves output, never a hard dependency). Never
modifies application source code at this stage. The command is fully usable end-to-end
on the deterministic path alone (see the checkbox below); spec §16's AI-assisted
layer is also now real, not just a documented gap — see the new checkbox further
down.

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
- [x] `ai-zoll analyze` — closes the phase. `analyzeRepository()` (`@ai-zoll/analyzer`)
      → interactive resolution of each Blueprint field (`detected` → used directly,
      `likely` → confirm-or-decline, `unknown` → the same field prompts `init` uses,
      refactored out of its monolithic wizard into `apps/cli/src/commands/prompts.ts`
      so `analyze` can call only the ones it actually needs) → the same
      `generateWorkspace` + `AgentAdapter` pipeline `init`/`sync` already use → the
      same merge-aware writer `sync` built, extracted from `run-sync.ts` into
      `apps/cli/src/apply-generated-files.ts` (a second consumer, not new logic —
      `run-sync.ts`'s own 9 tests still pass unchanged, proving the extraction
      preserved behavior exactly). Refuses to run on an already-`.ai-zoll`-initialized
      directory, pointing to `sync` instead. `architecture.style` is never resolved
      from analysis — always prompted, per `DirectoryAnalyzer`'s ADR-0004-driven scope
      (`directory.signals`, if present, is shown as a plain informational line above
      the prompt, never wired to a default). 4 new tests in `run-analyze.test.ts`,
      including the load-bearing one: a directory with a genuine hand-written
      `README.md` and real `src/index.ts` stays byte-for-byte untouched after
      `runAnalyze`, reported in `preserved` rather than silently overwritten (Rule 10,
      exercised directly for this command, not just inherited by assumption). Verified
      for real, not just fixtures: built the CLI, created a synthetic existing-project
      scratch directory (real `package.json` with NestJS/Prisma/Postgres/JWT/Vitest
      signals, a real hand-written `README.md`, real `src/index.ts` "application
      code"), ran the full non-interactive pipeline against it — confirmed the
      analysis report was accurate, confirmed `README.md` and `src/index.ts` were
      byte-for-byte unchanged on disk after generation, confirmed a subsequent
      `ai-zoll sync cursor` worked immediately on the adopted project (switching
      agents, still preserving the hand-written `README.md` throughout), and confirmed
      re-running `analyze` on the now-adopted directory correctly refuses.
- [x] Post-launch dogfooding pass against a real, unmodified external repository (not
      a synthetic fixture) — cloned a real Next.js 16 + React 19 frontend app and ran
      the full pipeline against it, which surfaced three real gaps no fixture had:
      (1) `DirectoryAnalyzer`'s candidate list was backend/DDD-only and returned
      `unknown` for this repo's genuinely well-structured `app/`/`components/`/`lib/`/
      `store/` layout — researched and expanded to also recognize standard
      React/Next.js folders, Feature-Sliced Design layers, and Atomic Design folders
      (still never classifying `architecture.style` itself, per ADR 0004); (2)
      `FrameworkAnalyzer` was missing Nuxt/SvelteKit/Remix/Astro/Svelte and
      Koa/Hapi/Hono, added with correct most-specific-first ordering (e.g. Nuxt before
      plain Vue, mirroring the existing Next.js-before-React precedent); (3) a
      misleading `PackageAnalyzer` message reported a missing `description` field as
      "no package.json found" even when the file demonstrably existed (`name` was
      found from that same file) — fixed to distinguish the two cases. Also fixed,
      found via the same pass: the CLI's database prompt had no `"none"` choice
      (unlike frontend/backend/orm), forcing a frontend-only project with no database
      into a dishonest `"other"`. 9 new tests, 73 total in `packages/analyzer` now.
      Re-cloned the same real repo after the fixes and confirmed all three findings
      resolved for real, not just in the fixture suite.
- [x] Monorepo/workspace-aware analysis — the best-evidenced remaining gap, closed:
      this very `ai-zoll` repo (a real pnpm monorepo) previously returned `unknown`
      for `framework`/`database`/`orm` at its own root, since those signals live in
      `apps/web`/`apps/api`, not the root `package.json`. New
      `packages/analyzer/src/workspace-discovery.ts` finds subpackages under
      `apps/*`/`packages/*` (directory-walk is the actual discovery mechanism, same as
      before) plus any custom glob roots declared in `pnpm-workspace.yaml`/
      `package.json`'s `workspaces` field (narrow hand-written parsing, no YAML/glob
      library — `!`-prefixed exclusion globs are recognized and skipped, never given
      real filter semantics, a deliberate scope cut from a design review rather than
      an oversight). `FrameworkAnalyzer`/`DatabaseAnalyzer`/`TestAnalyzer`/
      `DependencyAnalyzer`/`DirectoryAnalyzer` are unchanged — each already accepted an
      arbitrary path — only `analyzeRepository()` (the orchestrator) changed, now
      running each against the root and every discovered subpackage and merging with
      one of three distinct strategies in new `merge-findings.ts` (categorical fields
      like framework/database report `unknown` with every disagreeing source's value
      enumerated rather than silently picking one — no majority voting, and
      `unknown`-confidence sources like a frameworkless library subpackage are
      excluded from voting entirely, not treated as a non-match; boolean testing
      fields use OR/union semantics but the reason text always enumerates full
      per-source coverage, never just the source that said yes, so "has tests
      somewhere" can't be mistaken for "has tests"; array directory signals are a
      straight union, since different subpackages having different conventions is
      expected, not a conflict). `PackageAnalyzer` and `GitAnalyzer.projectName` stay
      root-only by design — a monorepo's overall name is inherently a root-level
      concept. Every merge function guarantees an exact, byte-for-byte passthrough
      when only one location was ever checked, which is why all 101 pre-existing
      analyzer tests kept passing completely unchanged through this work — only new,
      genuine multi-package fixtures exercise the new merge logic. 28 new tests, 101
      total in `packages/analyzer` now. Verified for real: re-ran
      `analyzeRepository('.')` against this actual repo's own root post-fix and
      confirmed `frontend: nextjs` (from `apps/web`), `backend: nestjs`/
      `database: postgresql`/`orm: prisma` (from `apps/api`), and unit testing
      correctly attributed across all 11 real packages in this repo — a direct
      resolution of the exact gap that motivated this work, not just a fixture-level
      proof.
- [x] Third dogfooding pass, against a real NestJS backend (dual passport strategies,
      Prisma+Postgres, Jest with a `test:e2e` script) — found and fixed two more real
      gaps. `DirectoryAnalyzer.signals` returned `unknown` despite the repo having a
      completely standard structure (`Auth/`, `booking/`, `conversation/` — one folder
      per business *domain*, not per *layer*), so no directory name in the candidate
      list matched; fixed by adding a second signal source, file-naming *suffixes*
      (`Name.controller.ts`, `Name.service.ts`, `Name.module.ts`, ...), found via the
      same bounded/exclusion-aware walk `TestAnalyzer` already uses — still a raw fact,
      not a classification, per the same ADR 0004 boundary. `TestAnalyzer`'s file
      pattern also only recognized the dot-separated convention and missed NestJS's own
      official hyphenated `*.e2e-spec.ts` convention (this repo's `test:e2e` script
      happened to mask the gap via a different signal; a repo without that script
      would've been missed) — fixed to recognize both separators. Also confirmed a
      designed, not accidental, behavior for real: this repo has *two* passport
      strategies (`passport-jwt` + `passport-google-oauth20`) simultaneously, and
      `DependencyAnalyzer` correctly picked the first-checked one per its documented
      first-match-wins order, not a bug. 4 new tests, 103 total in `packages/analyzer`.
      Verified for real: rebuilt, re-ran `analyzeRepository()` against the same cloned
      repo, confirmed `directory.signals` now reports `controller, module, service,
      dto, guard, strategy, entity`; ran the full `runAnalyze` pipeline against it,
      confirmed the repo's real hand-written `README.md` and real application source
      stayed byte-for-byte untouched, and confirmed a subsequent `sync cursor` worked
      on the adopted project.
- [x] Fourth dogfooding pass, against 10 real, diverse open source repos at once
      (express, fastify, nestjs/nest, trpc, astro, sveltejs/kit, remix, cal.com,
      directus, medusajs/medusa — shallow-cloned fresh, not fixtures) — the broadest
      real-world sweep yet, and found two more real gaps, one of each severity this
      package has now seen: a correctness gap in the deterministic core, and a real
      non-destructiveness bug in `apps/cli`'s writer (see Phase 5's entry below for the
      latter). **Zero crashes** across all 10, including 350+-package monorepos
      (medusa), each analyzed in well under 200ms.
      - Correctness gap: `mergeCategorical` reported `framework.frontend` as `unknown`
        on both cal.com and SvelteKit's own repo, even though each has one obvious,
        overwhelming answer (`nextjs`/`sveltekit`) — because one or two packages in
        each large monorepo depend only on the *base* library (`react`/`svelte`
        directly) rather than the meta-framework, and differing string values were
        treated as pure disagreement. Fixed with a new, purely additive optional
        `specializes` parameter on `mergeCategorical` (`{ nextjs: "react", remix:
        "react", nuxt: "vue", sveltekit: "svelte" }`, `FRONTEND_SPECIALIZES` in
        `framework-analyzer.ts`) — resolves to the meta-framework when every
        disagreeing value is explained by exactly one meta/base pair, still reports
        `unknown` when it isn't (a genuinely different framework family, or a meta
        value alongside an unrelated base it doesn't imply). Every existing call site
        omits the new parameter and is provably unaffected — all 103 pre-existing
        analyzer tests passed unchanged before any new tests were added. Deliberately
        **not** extended to `backend`: investigating trpc's and NestJS's own
        `unknown` backend results (same dogfooding pass) found genuine, correct
        ambiguity, not a bug — both repos really do ship multiple backend
        integrations side by side (trpc supports both Express and Fastify adapters;
        NestJS's own monorepo contains both `platform-express` and
        `platform-fastify`), so there's no safe, unconditional "NestJS always implies
        X" fact to encode the way "a Next.js app always has react" is unconditionally
        true. 7 new tests (110 total in `packages/analyzer`). Verified for real:
        re-cloned cal.com and SvelteKit's repo fresh, rebuilt, confirmed both now
        report the meta-framework with a reason explaining the corroborating
        base-library package, and confirmed trpc/nest still correctly report
        `unknown` with the genuine multi-framework reasoning intact.
- [x] AI-assisted analysis layer (spec §16) — closes this phase's last gap.
      `AIProvider` gained `interpretRepository(analysis: RepositoryAnalysis):
      Promise<RepositoryInsights>` (`packages/ai/src/provider.ts`), sitting
      *after* `analyzeRepository()`, not replacing it — the model only ever
      sees the already-computed, compact `RepositoryAnalysis` (never raw
      repository files, per ADR 0004/spec §34 cost control), consistent with
      `packages/ai` -> `packages/analyzer` now being a real, one-directional
      workspace dependency (no cycle — `packages/analyzer` depends on
      nothing). `RepositoryInsightsSchema` (`packages/ai/src/insights.ts`)
      implements spec §16's ten categories verbatim (business domains,
      modules, architectural patterns, conventions, important dependencies,
      testing patterns, security patterns, undocumented conventions,
      inconsistencies, missing documentation) as flat string arrays, each
      independently allowed to be empty — "no evidence" is a valid answer,
      not padded to look more thorough (same spirit as `Finding`'s
      `Confidence` tiers, applied to prose). `ClaudeAIProvider.
      interpretRepository` reuses the exact `zodOutputFormat`/
      `messages.parse` structured-output pattern `generateBlueprint`
      established, generalized `request()` to accept a system prompt +
      output format per call so both methods share it. Deliberately
      **single-attempt, no repair round** (unlike `generateBlueprint`) and
      **purely informational** — nothing here is persisted into the
      Blueprint or used to generate any file (spec §16: "The AI should not
      automatically modify source code during this stage"), so there's no
      correctness requirement forcing a retry the way persisting an invalid
      Blueprint would. `MockAIProvider.interpretRepository` returns all-empty
      insights (real, tested, not a stub) — exists for `AIProvider` interface
      conformance; the CLI never actually calls it, since insights are only
      requested when `--ai` selected the real provider in the first place.
      Wired into `apps/cli/src/commands/analyze.ts`: prints an
      "AI-ASSISTED INSIGHTS" section right after the deterministic
      "PROJECT ANALYSIS" block, skipping any category the model returned
      empty. A request-level failure (network, malformed structured output)
      degrades to a one-line notice and the rest of `analyze` proceeds
      unaffected — "AI improves output, never required" applied concretely.
      A missing-key configuration error is deliberately NOT caught the same
      way: the provider is now selected *eagerly*, before any output, so
      `--ai` with no `ANTHROPIC_API_KEY` fails fast immediately — a genuine
      UX improvement surfaced as a side effect (previously, `runAnalyze`
      only discovered the missing key at the very end, after the entire
      interactive Q&A). 6 new tests in `packages/ai` (both providers, plus a
      validation-failure and a null-`parsed_output` case for Claude's), no
      dedicated unit test for the CLI wiring itself (matching this
      codebase's existing precedent — `commands/*.ts` wrappers aren't
      unit-tested directly anywhere, only their non-interactive `run-*.ts`
      cores are). Verified for real: built the CLI, ran `analyze --ai` with
      no API key set and confirmed it failed immediately with a clear error
      before any analysis output printed; separately exercised the actual
      print logic against a fake provider returning realistic multi-category
      insights and confirmed the rendered report (including correctly
      skipping an empty category) matches what's described above. No live
      `ANTHROPIC_API_KEY`-backed run was performed — same choice already
      made for Phase 4's `generateBlueprint`, offline tests only.
- [x] Multi-language analyzer support — Python, Java, Rust, Go, Ruby, PHP, and .NET
      added alongside Node/TypeScript, closing the single most-cited remaining gap.
      `packages/analyzer/src/ecosystems/` gained one manifest reader per language
      (`python.ts`/`java.ts`/`rust.ts`/`go.ts`/`ruby.ts`/`php.ts`/`dotnet.ts`), each
      narrow and hand-written — no new TOML/XML/YAML parser dependency, matching this
      package's existing precedent (the Prisma-schema and `pnpm-workspace.yaml`
      regex extractors). New `read-dependency-names.ts`'s `readAllDependencyNames()`
      unions every ecosystem's names found at a path; `FrameworkAnalyzer`/
      `DatabaseAnalyzer`/`TestAnalyzer`/`DependencyAnalyzer` switched to it from the
      old Node-only `readDependencyNames` — a single import-and-call-site change per
      analyzer, since the matching/confidence/merge logic itself needed no changes at
      all. Each analyzer's signal tables gained one block per language (backend
      frameworks, ORMs, database drivers, auth/authz libraries); frontend-framework
      detection deliberately stays Node/JS-only (no real equivalent concept in the
      other ecosystems). `TestAnalyzer` gained per-language test-runner dependencies
      and file-naming patterns (`test_*.py`, `*_test.go`, `*Test.java`, `*_spec.rb`,
      `*Test.php`, `*Tests.cs`); Rust and Go deliberately have no test-runner
      *dependency* signal (`cargo test`/`go test` are toolchain built-ins, not a
      package), relying on file-pattern detection instead. 44 new tests (154 total in
      `packages/analyzer`).

      Verified for real against real, unmodified repos in all 4 compiled/systems
      languages of the 7 (Python, Java, Go, Rust — the four the request named
      explicitly), not just fixtures — cloned `tiangolo/full-stack-fastapi-template`,
      `spring-projects/spring-petclinic`, `gothinkster/golang-gin-realworld-example-app`,
      and `launchbadge/realworld-axum-sqlx` fresh, which found and fixed four more
      real gaps in a single pass:
      - **Spring Boot 4's renamed starter** (`spring-boot-starter-webmvc`, replacing
        `spring-boot-starter-web`) was completely missing from the signal table —
        spring-petclinic reported `backend: unknown` until both names were added.
      - **Rust's dominant testing convention** (inline `#[test]`/`#[cfg(test)]`
        attributes within ordinary source files, not a separate test-file naming
        convention) was entirely invisible to the file-name-only walk every other
        language relies on — a real Rust web service with real tests reported
        `testing.unit: false (detected)`, a confident false negative. Fixed with a
        small, targeted content read scoped to `.rs` files only, within the same
        bounded/exclusion-aware walk `TestAnalyzer` already uses — not a general
        "read every file's contents" policy.
      - **PEP 621 dependency-array truncation**: the regex used to find where a
        `pyproject.toml`'s `dependencies = [...]` array ends broke as soon as any
        entry contained its own brackets (Python's extras syntax, e.g.
        `"fastapi[standard]>=0.100"` — extremely common, not an edge case), silently
        dropping every dependency after the first bracketed one. Fixed with a small
        hand-written bracket-depth/string-aware scanner (still not a real TOML
        parser) instead of a single regex.
      - **`psycopg` (v3) and `sqlmodel`** — a separate, newer package from
        `psycopg2`/`psycopg2-binary`, and a real, distinct ORM (Pydantic + SQLAlchemy
        combined, from FastAPI's own author) — were both missing from the Python
        signal tables; added after the FastAPI template repo used both exclusively.

      All four fixes were re-verified against the specific real repo that exposed
      them, not just the new unit tests, after rebuilding.

      Also found, and deliberately **not** fixed in this pass: the FastAPI template
      repo's actual Python manifest lives in `backend/pyproject.toml`, undiscovered
      because it's a `uv` workspace (`[tool.uv.workspace] members = ["backend"]`) —
      `workspace-discovery.ts` only understands the `apps/*`/`packages/*` +
      pnpm/npm-workspaces convention, not `uv`/Poetry/Cargo/Go's own workspace
      declarations. Confirmed this is a workspace-*discovery* gap, not a Python-reader
      bug, by pointing `analyzeFramework`/etc. directly at `backend/` and getting
      correct results immediately. Documented in `packages/analyzer/README.md` as a
      real, stated limitation — extending workspace discovery to understand each new
      ecosystem's own monorepo convention is separate, additional scope, not a quick
      follow-on to this task.
- [x] Broad real-world validation pass — 35 real, unmodified, popular (all far over
      300 stars) open source repos, 5 per language across all 7 (Python: django,
      flask, fastapi, django-rest-framework, celery; Java: spring-petclinic,
      dropwizard, killbill, dubbo, javalin; Rust: axum, actix-web, sqlx, clap, tokio;
      Go: gin, echo, fiber, caddy, cobra; Ruby: rails, sinatra, fastlane, huginn,
      jekyll; PHP: laravel/laravel, symfony, Slim, composer, october; .NET:
      eShopOnWeb, nopCommerce, OrchardCore, marten, eShop) — shallow-cloned fresh,
      analyzed, cleaned up after. **Zero crashes across all 35**, including large
      real solutions (OrchardCore's walk took 348ms, still well within budget).

      Found and fixed one more systematic, high-severity real bug: `.NET`'s
      `readDotnetDependencyNames` was repo-root-only, but **every one of the 5 real
      .NET repos** has its actual `.csproj` files exclusively in subdirectories
      (`src/*/`, `tests/*/`) — the dominant, near-universal real-world .NET solution
      layout, not an edge case — so it reported nothing at all for any of them.
      Fixed with a bounded, exclusion-aware walk (same `MAX_WALK_DEPTH` pattern
      `TestAnalyzer`/`DirectoryAnalyzer` already use), additionally skipping
      `bin`/`obj` build-output directories. Re-verified: went from 0/5 to 5/5 real
      .NET repos correctly detecting `backend: aspnet`, and 4/5 also correctly
      detecting their database/ORM. 3 new tests (156 total in `packages/analyzer`).

      The other "unknown" results across the 35 are correctly explained, not bugs:
      most of the Python/Rust/Go/Java picks above are frameworks' or tools' *own*
      source repos (django doesn't depend on django, axum doesn't depend on axum,
      etc.) — the same, already-validated "correctly unknown" pattern as Node's
      `express`/`fastify` self-analysis. `django-rest-framework` has no Python
      dependency manifest at all in its repo (an unusual, minimal packaging setup,
      confirmed by direct inspection) — nothing to read, not a parser gap. Real
      *consumer* apps among the 35 (spring-petclinic, huginn, laravel/laravel,
      october, fastlane, all 5 .NET repos) consistently detected correctly.

## Phase 8 — Existing Project AI Layer — **mostly superseded by Phase 7's shipped `analyze`; AI-assisted interpretation now shipped too, only `CONVENTIONS.md` generation left**

Originally scoped as: generate `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`,
`CONVENTIONS.md`, `skills/`, agent-specific config around an existing repo, preserving
existing source, idempotent on repeat runs. By the time Phase 7 shipped `analyze`
(deterministic analysis → interactive resolution → the same `generateWorkspace` +
`AgentAdapter` pipeline `init` uses → non-destructive write), most of this was
delivered there instead: `AGENTS.md`/`PROJECT.md`/`ARCHITECTURE.md`/`skills/`/agent
config are all generated for existing projects today, application source is proven
byte-for-byte preserved (dogfooded four times against real repos, including a 10-repo
sweep), and re-running is
handled correctly (`analyze` refuses on an already-adopted directory and points to
`sync`, which is the actual idempotent-regeneration path). The AI-assisted
interpretation layer, this phase's other original item, is also done now — see Phase
7's last checkbox (`AIProvider.interpretRepository`); it isn't tracked twice. What's
genuinely still missing: **`CONVENTIONS.md` is not generated by anything** (no
generator function exists for it). The AI-assisted insights layer is a natural future
*source* for that file's content (undocumented conventions/inconsistencies map
directly), but that wiring — taking `RepositoryInsights` and turning it into a real,
persisted, golden-testable file rather than a console-only report — is deliberately
not built yet; it would need its own design pass (does it go through the Blueprint,
like `features` does, or get written directly as informational prose outside the
deterministic-generator/golden-test guarantee ADR 0004 requires for everything else in
`packages/generators`? Genuinely undecided, not an oversight).

## Phase 9 — Sync (original meaning: local/remote Blueprint diff) — **out of scope (CLI-only pivot)**

`npx ai-zoll sync` — but *this specific name is already taken* by a different,
already-shipped feature (Phase 5): local re-sync/agent-switching, no remote Blueprint
involved at all, since there's no server to hold one. This phase's original meaning
(diffing a local Blueprint against a dashboard-stored remote one) presupposed
`apps/web`/`apps/api`, which no longer exist — genuinely out of scope, not deferred.

## Phase 10 — Organizations — **out of scope (CLI-only pivot)**

Organizations, Teams, Shared Standards, Project Templates, Roles all presuppose a
multi-user server/dashboard, which no longer exists.

## Phase 11 — Drift Detection — **field-comparison slice done; import-boundary and undocumented-directory detection not started**

`npx ai-zoll check`. Compare expected architecture vs. actual repository
state; report violations (import boundary breaks, undocumented directories, testing
convention mismatches).

- [x] `ai-zoll check` — first slice, entirely deterministic (no `--ai` involved at
      all, unlike `init`/`analyze`). `apps/cli/src/run-check.ts`: reads the stored
      Blueprint from `.ai-zoll/state.json` (spec §27's "expected architecture"),
      runs a fresh `analyzeRepository()` scan (its "actual repository"), and
      compares every field a deterministic analyzer can independently observe —
      `stack.frontend`/`backend`/`database`/`orm`, `testing.unit`/`integration`/
      `e2e`, `security.authentication`/`authorization` — directly realizing spec
      §27's "Testing convention mismatch" example, plus stack/security drift it
      didn't explicitly name. An analyzer finding with `confidence: "unknown"` is
      never treated as drift (no evidence either way isn't evidence of a
      mismatch) — same convention `analyze`/`sync` already use elsewhere.
      Requires an already-`ai-zoll`-initialized project, same precondition as
      `sync`. `apps/cli/src/commands/check.ts` is a thin, non-interactive
      wrapper (same shape as `sync`) that prints a report and sets
      `process.exitCode = 1` when drift is found, so `ai-zoll check` is usable
      as a CI gate, not just a human-facing report. 6 new tests in
      `run-check.test.ts` (real temp-directory fixtures, no mocking) covering:
      not-yet-initialized error, no-drift passthrough, a detected categorical
      mismatch, a boolean testing mismatch, `unknown`-confidence fields never
      producing false positives, and multiple simultaneous drift entries.
      Verified for real: built the CLI, initialized a scratch project with a
      deliberately wrong stored Blueprint (`backend: "express"` vs. an actual
      NestJS `package.json`, `testing.unit: false` vs. an actual `vitest`
      devDependency) against a real `package.json`, confirmed `ai-zoll check`
      reported exactly those two mismatches with exit code 1 and correctly
      stayed silent on fields with no analyzer signal (database/orm/auth),
      then fixed the stored Blueprint and confirmed a clean re-run reports "No
      drift detected" with exit code 0.
- [ ] **Import-boundary violations** — not started, and deliberately not a smaller
      version of the above (Rule 1: don't build placeholder functionality
      disguised as complete). Needs real static analysis this codebase doesn't
      have yet: parsing each file's imports, building a per-module dependency
      graph, and defining which cross-module imports are actually disallowed
      per `architecture.style` (layered vs. modular vs. feature-sliced have
      different rules) — a substantial standalone feature warranting its own
      design review before implementation, not an extension of `run-check.ts`'s
      field-comparison approach.
- [ ] **Undocumented-directory detection** — not started. `DirectoryAnalyzer`
      already produces raw directory-convention signals
      (`packages/analyzer/src/directory-analyzer.ts`), but there's no stored
      baseline to diff against yet ("undocumented" implies comparing against
      what *was* documented/expected, not just listing what exists). The most
      likely shape: snapshot `directory.signals` into `.ai-zoll/state.json` at
      `init`/`analyze`/`sync` time, then `check` diffs the fresh scan against
      that snapshot and reports newly-appeared conventions — a real schema
      addition to `ProjectState`, deliberately deferred rather than bundled
      into this session's first slice.

## Immediate development order (spec §48)

**Historical record of the original, pre-pivot plan** — kept verbatim below since it's
what spec §48 actually says, not because it's still the live plan. Steps 11
(Dashboard) and 17 (Organization mode) are out of scope post-pivot; the rest either
shipped or were superseded, as tracked in the "Next up" paragraph below (which *is*
kept current) rather than by editing this numbered list.

1. Monorepo foundation → 2. Blueprint schema → 3. Blueprint validation → 4. Template
engine → 5. Generated workspace → 6. First agent adapter → 7. Mock AI provider →
8. Real AI provider → 9. CLI → 10. New-project workflow → 11. Dashboard →
12. Existing-project analyzer → 13. Existing-project AI layer → 14. Additional agent
adapters → 15. Blueprint versioning → 16. Sync → 17. Organization mode →
18. Drift detection.

**Next up (current, post-pivot):** everything through step 14 is effectively done —
`init`/`sync`/`analyze` (steps 9-10, 12) are shipped and dogfooded, all four planned
agent adapters (step 14: Claude/Cursor/Codex/Copilot) are implemented, and Blueprint
versioning (step 15, the schema's `version` field + `safeParseBlueprint` re-validation
on every `state.json` read) has been in place since Phase 5. Steps 11 and 17
(Dashboard, Organization mode) are out of scope, not merely deferred — `apps/web` and
`apps/api` were removed entirely this session. **Drift detection** (step 18, Phase 11)
now has a real, shipped first slice (`ai-zoll check`, field-comparison against the
stored Blueprint) — what's left there is import-boundary violations and
undocumented-directory detection, both genuinely separate sub-features, not smaller
versions of what shipped (see Phase 11 above). The **AI-assisted analysis layer**
(spec §16, Phase 7/8's shared item) is also now shipped — `analyze --ai` prints
business-domain/module/convention/inconsistency observations via
`AIProvider.interpretRepository`. What's left there specifically is narrower than
before: turning those insights into a real, persisted `CONVENTIONS.md` file (a
separate design question — see Phase 8 above), not the interpretation step itself.
**Multi-language analyzer support** is also done now — Python, Java, Rust, Go, Ruby,
PHP, and .NET added alongside Node/TypeScript, dogfooded against real repos in four
of the seven (see Phase 7's multi-language entry). What's left there specifically:
workspace/monorepo discovery still only understands `apps/*`/`packages/*` +
pnpm/npm-workspaces, not each new ecosystem's own workspace convention (`uv`/Poetry,
Cargo, `go.work`) — a real, separate, additional piece of scope, not a quick
follow-on. Beyond that: **future agent adapters** beyond the initial
four (Cline, Zed — researched in `docs/decisions/0003-agent-adapter-pattern.md`, not
built). `login`/auth has no remaining use case now that the dashboard and
`init <project-id>` are both out of scope — this is a fully local, account-free tool
by design, not a gap.
