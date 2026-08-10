# 03 — Roadmap & Phase Status

> Condensed from `docs/PRODUCT_SPEC.md` §37 (Development Phases) and §48 (Immediate
> Development Order). **This is the living plan file — update it as phases start/finish.**

Rule 1 applies to this whole document: do not start a phase before the previous one is
done, and do not jump straight to the dashboard (Phase 6) before the Blueprint engine
and generator (Phases 1-2) exist.

## Status legend

`not started` · `in progress` · `done`

## Phase 0 — Product Foundation — **not started**

Monorepo, TypeScript, pnpm, Turborepo, web app, API, CLI, shared packages, PostgreSQL,
Prisma, basic CI. No complex UI yet.

- [x] Documented monorepo skeleton created (this bootstrap pass — folders + placeholder
      `package.json` per package, no framework deps, no business logic)
- [ ] Real `apps/web` Next.js app scaffolded
- [ ] Real `apps/api` NestJS app scaffolded
- [ ] Real `apps/cli` scaffolded
- [ ] PostgreSQL + Prisma wired up (`prisma/schema.prisma`)
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

## Phase 3 — Agent Adapters — **not started**

Implement one adapter first (recommend `ClaudeAdapter`, since this repo is developed
with Claude Code), then Cursor, then Codex. Do not implement all three at once.

## Phase 4 — AI Blueprint Generation — **not started**

Connect a real `AIProvider`. Input: project description + user selections. Output: a
*validated* `ProjectBlueprint` — never trust raw AI text directly; validate, and
retry/repair on failure.

## Phase 5 — CLI — **not started**

`npx ai-software-zoll init` (interactive), then `init <project-id>` (downloads a
dashboard-created blueprint). CLI must be usable with zero dashboard involvement.

## Phase 6 — Dashboard — **not started**

New Project / Existing Project flows, Project Overview, Blueprint Editor, Agent
Selection, Generated Workspace Preview. Consumes the same blueprint APIs as the CLI —
built only after Phases 1-2 exist, not before.

## Phase 7 — Existing Project Analysis — **not started**

`npx ai-software-zoll analyze`. Deterministic analyzers first (see
`packages/analyzer`), then AI interpretation on top. Never modifies application source
code at this stage.

## Phase 8 — Existing Project AI Layer — **not started**

Generate `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `skills/`,
agent-specific config around an existing repo. Preserve existing source. Idempotent —
running twice must not duplicate files.

## Phase 9 — Sync — **not started**

`npx ai-software-zoll sync`. Compare local Blueprint, remote Blueprint, local AI
context; show a diff before applying anything.

## Phase 10 — Organizations — **not started**

Only after individual (single-developer) workflows are validated. Organizations,
Teams, Shared Standards, Project Templates, Roles.

## Phase 11 — Drift Detection — **not started**

`npx ai-software-zoll check`. Compare expected architecture vs. actual repository
state; report violations (import boundary breaks, undocumented directories, testing
convention mismatches).

## Immediate development order (spec §48)

1. Monorepo foundation → 2. Blueprint schema → 3. Blueprint validation → 4. Template
engine → 5. Generated workspace → 6. First agent adapter → 7. Mock AI provider →
8. Real AI provider → 9. CLI → 10. New-project workflow → 11. Dashboard →
12. Existing-project analyzer → 13. Existing-project AI layer → 14. Additional agent
adapters → 15. Blueprint versioning → 16. Sync → 17. Organization mode →
18. Drift detection.

**Next up:** Phase 1 (Blueprint Engine) is the true starting point for real
implementation — build `packages/blueprint` before anything else.
