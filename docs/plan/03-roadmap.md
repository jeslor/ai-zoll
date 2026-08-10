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

## Phase 1 — Blueprint Engine — **in progress**

`ProjectBlueprint`, `BlueprintSchema`, `BlueprintValidator`, `BlueprintVersion` in
`packages/blueprint`. Build `Project → Blueprint` using a mock AI provider first — the
system must work with zero external LLM dependency.

- [x] `ProjectBlueprintSchema` (Zod) + inferred types + `safeParseBlueprint`/
      `parseBlueprint` validation, with unit tests and fixtures covering the spec §4
      example, a minimal blueprint, and invalid-input cases (`packages/blueprint`)
- [ ] Mock `AIProvider` implementing `generateBlueprint` (`packages/ai`)
- [ ] `Project → Blueprint` wiring exercised end-to-end using the mock provider

## Phase 2 — Deterministic Generator — **not started**

`Blueprint → Template Engine → Workspace` in `packages/generators` +
`packages/templates`. Generates `README.md`, `PROJECT.md`, `ARCHITECTURE.md`,
`AGENTS.md`, `docs/`, `skills/`, `workflows/`. Fully deterministic — same Blueprint in,
same files out (golden-tested, see `06-testing-strategy.md`).

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
