# AI Software Zoll

**AI Software Zoll prepares, structures, and maintains the context that AI coding
agents need to build software effectively.** It does not write your application code —
Claude Code, Cursor, Codex, and Copilot remain the builders. Zoll prepares the
environment in which they build.

- For a new project: describe what you're building and get back a complete AI-ready
  project structure (`PROJECT.md`, `ARCHITECTURE.md`, `AGENTS.md`, docs, skills,
  agent-specific configuration).
- For an existing project: point Zoll at a repository and it analyzes the codebase,
  then generates the missing AI-context layer around it — without touching your
  existing source code.

See [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) for the full product specification
and [`docs/plan/`](docs/plan/) for the operational roadmap.

## Status

This repository is currently a documented, empty monorepo skeleton — no application
code exists yet. See [`docs/plan/03-roadmap.md`](docs/plan/03-roadmap.md) for the
current phase and what happens next.

## Repository layout

```
apps/
  web/       Next.js dashboard
  api/       NestJS REST API
  cli/       CLI (npx ai-software-zoll ...)
packages/
  blueprint/    Canonical Project Blueprint: schema, types, validation (Zod)
  generators/   Deterministic template engine (blueprint -> workspace)
  agents/       AgentAdapter implementations (claude, cursor, codex, copilot)
  templates/    Raw templates used by generators
  analyzer/     Deterministic repository analyzers
  ai/           AIProvider abstraction (mock + real providers)
  shared/       Cross-cutting types/utilities
docs/            Product spec, plan docs, ADRs, glossary
prisma/          Database schema
.claude/skills/  Process skills for building Zoll itself
```

## Getting started (once Phase 0 lands)

```bash
pnpm install
pnpm turbo run build
pnpm turbo run test
```

Nothing above does anything meaningful yet beyond validating the workspace wiring —
there's no real application code until Phase 0 implementation begins.

## Documentation map

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — authoritative product spec (verbatim)
- [`docs/plan/00-overview.md`](docs/plan/00-overview.md) — vision & philosophy
- [`docs/plan/01-architecture.md`](docs/plan/01-architecture.md) — technical architecture
- [`docs/plan/02-mvp.md`](docs/plan/02-mvp.md) — MVP scope, explicitly excluded scope
- [`docs/plan/03-roadmap.md`](docs/plan/03-roadmap.md) — phase-by-phase roadmap & status
- [`docs/plan/04-database-and-api.md`](docs/plan/04-database-and-api.md) — DB model & API
- [`docs/plan/05-security-and-privacy.md`](docs/plan/05-security-and-privacy.md) — secrets & privacy
- [`docs/plan/06-testing-strategy.md`](docs/plan/06-testing-strategy.md) — test strategy
- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records
- [`docs/glossary.md`](docs/glossary.md) — product terminology
- [`CLAUDE.md`](CLAUDE.md) — instructions for AI coding agents working in this repo
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — human contributor workflow

## License

MIT — see [`LICENSE`](LICENSE).
