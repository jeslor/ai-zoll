# CLAUDE.md

Instructions for Claude Code (or any coding agent) working in this repository.

## What this project is

AI Zoll is a **CLI** that prepares software projects for AI-assisted development. It
does not write application code for the end user and does not compete with Claude Code
/ Cursor / Codex / Copilot — it generates the **Project Blueprint** and the AI-context
layer (docs, `AGENTS.md`, skills, agent-specific config) that those tools need to work
effectively on a project, for both brand-new projects (`init`) and existing
repositories (`analyze`), and keeps that context in sync as the project or the chosen
agent changes (`sync`).

**Product pivot (superseding the original dashboard-first spec):** this is now a
fully self-contained CLI — no web dashboard, no server-side API, no database. Every
run is local. AI is never required: `MockAIProvider` (deterministic) is the default
for every command; the real, LLM-backed `ClaudeAIProvider` is a strict, explicit
opt-in via `--ai`, never auto-triggered just because a credential happens to be
present. See `docs/plan/03-roadmap.md`'s Phase 5/7 sections for how this was built and
verified (including several real-repo dogfooding passes, not just fixtures).

Full source-of-truth spec: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — written for
the original, broader (dashboard + API) vision. Where it describes the dashboard, API,
or database, treat those sections as historical/superseded by the pivot above, not
current direction. Everything else below is a condensed, operational summary for
day-to-day development.

Read next, in order:
1. [`docs/plan/00-overview.md`](docs/plan/00-overview.md) — vision & philosophy
2. [`docs/plan/01-architecture.md`](docs/plan/01-architecture.md) — monorepo, Blueprint, adapters
3. [`docs/plan/03-roadmap.md`](docs/plan/03-roadmap.md) — **current phase status, start here for "what's next"**

## Core architecture, in one paragraph

Everything flows through the canonical **Project Blueprint**: a Zod-validated JSON
document that is agent-agnostic and framework-agnostic. New projects go
`requirements → AI interpretation → Blueprint`; existing projects go
`repository → deterministic analysis (+ AI interpretation) → Blueprint`. The Blueprint
is then rendered by deterministic template generators into a workspace (`README.md`,
`PROJECT.md`, `ARCHITECTURE.md`, `docs/`, `skills/`), and agent-specific files are
produced by **adapters** (`ClaudeAdapter`, `CursorAdapter`, `CodexAdapter`,
`CopilotAdapter`) implementing a shared `AgentAdapter` interface. AI is used for
interpretation and reasoning; everything that can be deterministic (parsing, detection,
rendering, validation) must be deterministic. See `docs/decisions/` for the ADRs behind
these choices.

## The 12 rules (spec §38) — non-negotiable

1. Do not implement future features before the current phase is complete.
2. Do not create placeholder functionality disguised as completed functionality.
3. Do not introduce dependencies without explaining why they are necessary.
4. Prefer existing packages already present in the repository.
5. All business logic belongs in appropriate modules.
6. Keep the `blueprint` package independent from the web application. *(Moot post-pivot — there is no web application. Kept for history; the spirit lives on as "keep `packages/blueprint` independent of `apps/cli`.")*
7. Keep the CLI independent from the dashboard UI. *(Moot post-pivot — there is no dashboard.)*
8. Never couple the canonical blueprint to a single AI coding agent.
9. Never allow an LLM response to bypass schema validation.
10. Existing-project generation must be non-destructive.
11. Every new feature requires tests.
12. Before implementing a feature, inspect the existing codebase and understand the current architecture.

## Development loop (spec §39)

For every task: read requirements → inspect the repo → identify affected packages →
design the smallest change → implement → add tests → typecheck → lint → test → review
generated output → update docs. Do not jump straight from requirement to implementation.
See the `phase-dev-loop` skill for the enforceable checklist version of this.

## Definition of Done (spec §40)

A feature isn't done until: implementation complete, types pass, tests pass, lint
passes, error handling exists, security considered, documentation updated, existing
behavior preserved.

## Monorepo map

```
apps/cli              Node/TypeScript CLI (npx ai-zoll init|sync|analyze) — the only app
packages/blueprint    Blueprint schema (Zod), types, validation — the core, agent-agnostic
packages/generators   Deterministic template engine: blueprint -> workspace files
packages/agents       AgentAdapter implementations: claude/, cursor/, codex/, copilot/
packages/templates    Raw templates consumed by generators (currently unused — see its README)
packages/analyzer     Deterministic repo analyzers (framework/db/test/git/directory/dependency/package), monorepo-aware
packages/ai           AIProvider abstraction: MockAIProvider (default) + ClaudeAIProvider (--ai opt-in)
packages/shared       Cross-cutting types/utilities with no framework dependency
```

All real, tested, built — this is not a skeleton. See `docs/plan/03-roadmap.md` for
current phase status per package (most are marked done; `packages/analyzer` and
`apps/cli` are the most actively developed).

## Where things live

- Full spec: `docs/PRODUCT_SPEC.md`
- Operational plan docs (overview, architecture, MVP, roadmap, DB/API, security, testing): `docs/plan/`
- Architecture Decision Records: `docs/decisions/`
- Glossary of product terms (Blueprint, Adapter, Skill, Drift, ...): `docs/glossary.md`
- Meta/process skills for building Zoll itself: `.claude/skills/`
- Human contributor workflow: `CONTRIBUTING.md`

## A note on "skills"

There are two different kinds of "skills" in this project — don't confuse them:

- **`.claude/skills/*`** — process skills for whoever (human or agent) is *building*
  Zoll itself (e.g. how to add a new agent adapter, how to extend the Blueprint schema).
- **Product-generated skills** — skills Zoll *generates for end users' projects* as part
  of the output workspace (spec §20). That generation logic lives in
  `packages/generators` / `packages/templates` and is itself a Phase 2 / Phase 8
  feature, not something that exists yet.
