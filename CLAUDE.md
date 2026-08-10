# CLAUDE.md

Instructions for Claude Code (or any coding agent) working in this repository.

## What this project is

AI Software Zoll is a platform + CLI that prepares software projects for AI-assisted
development. It does not write application code for the end user and does not compete
with Claude Code / Cursor / Codex / Copilot — it generates the **Project Blueprint** and
the AI-context layer (docs, `AGENTS.md`, skills, agent-specific config) that those tools
need to work effectively on a project, for both brand-new projects and existing
repositories.

Full source-of-truth spec: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). Everything
below is a condensed, operational summary of that document for day-to-day development.
If this file and the spec ever disagree, the spec wins — fix this file, not the other
way around.

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
6. Keep the `blueprint` package independent from the web application.
7. Keep the CLI independent from the dashboard UI.
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
apps/web        Next.js dashboard
apps/api        NestJS REST API
apps/cli        Node/TypeScript CLI (npx ai-software-zoll ...)
packages/blueprint    Blueprint schema (Zod), types, validation — the core, agent-agnostic
packages/generators   Deterministic template engine: blueprint -> workspace files
packages/agents       AgentAdapter implementations: claude/, cursor/, codex/, copilot/
packages/templates    Raw templates consumed by generators
packages/analyzer     Deterministic repo analyzers (framework/db/test/git/config/...)
packages/ai           AIProvider abstraction (mock provider first, real provider later)
packages/shared       Cross-cutting types/utilities with no framework dependency
prisma/               Database schema for the API's PostgreSQL store
```

Currently this is an empty skeleton (placeholder `package.json` per package, no
framework deps installed, no business logic). Real implementation starts at Phase 0 —
see the roadmap for what's next.

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
