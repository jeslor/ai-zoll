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
      `ProjectBlueprint` "current" pointer. `/generate`, `/generated-files`,
      `/analysis`, `/cli/auth`, `/cli/projects/:id/download` are explicitly
      deferred (their own future units — need `packages/analyzer`, a real auth
      strategy, and/or the generation pipeline wired in). Tested with service-level
      unit tests (fake Prisma) plus an in-memory HTTP e2e suite
      (`@nestjs/testing` + `supertest`, fake Prisma, no real DB needed for
      `pnpm test`) — 18 tests total, all offline. Verified for real: ran
      `prisma migrate dev` against a live Neon Postgres database and exercised
      every endpoint (including the 400/404 error paths) with real HTTP requests,
      confirming genuine round-trips through Postgres.
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

`npx ai-zoll init` (interactive), then `init <project-id>` (downloads a
dashboard-created blueprint). CLI must be usable with zero dashboard involvement.

- [x] `init` (interactive, no project-id) — **this is spec §41's MVP milestone,
      concretely realized**: `@inquirer/prompts` wizard (`apps/cli/src/commands/
      init.ts`) collects a structured `BlueprintInput` (project/architecture/stack/
      testing/security, plus which of the three real agents —
      `claude`/`cursor`/`codex`; `copilot` isn't offered since there's no
      `CopilotAdapter` yet) → `selectAIProvider().generateBlueprint` (real
      `ClaudeAIProvider` when `ANTHROPIC_API_KEY` is set, else `MockAIProvider` —
      see Phase 4) → `adapter.validate` (first real caller of the Phase 3 `validate`
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
- [ ] `init <project-id>` (downloads a dashboard-created blueprint) — needs
      `apps/web` and an auth strategy first
- [ ] `analyze`, `generate`, `sync`, `login` — later Phase 5/7/9 commands

## Phase 6 — Dashboard — **not started**

New Project / Existing Project flows, Project Overview, Blueprint Editor, Agent
Selection, Generated Workspace Preview. Consumes the same blueprint APIs as the CLI —
built only after Phases 1-2 exist, not before.

## Phase 7 — Existing Project Analysis — **not started**

`npx ai-zoll analyze`. Deterministic analyzers first (see
`packages/analyzer`), then AI interpretation on top. Never modifies application source
code at this stage.

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
Preview). Of those, only New Project / Blueprint Editor / Agent Selection /
Project Overview have real `apps/api` endpoints to consume today; Existing
Project and Generated Workspace Preview need `/analysis` and
`/generate`/`/generated-files`, which don't exist yet. Auth
(`login`/`POST /cli/auth`, real `Project.userId` values, `init <project-id>`) is
still an open decision, deferred until the dashboard or CLI genuinely needs it.
