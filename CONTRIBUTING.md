# Contributing

This document is the human-facing counterpart to [`CLAUDE.md`](CLAUDE.md). If you're an
AI coding agent, read `CLAUDE.md` first — it's more condensed and links to the same
sources.

## Before you start

1. Read [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — the authoritative spec.
2. Read [`docs/plan/03-roadmap.md`](docs/plan/03-roadmap.md) to see the current phase
   and what's in scope right now. **Do not start work on a later phase before the
   current one is done** (Rule 1).
3. If your change touches the Blueprint schema, an agent adapter, a generator, or an
   analyzer, check `.claude/skills/` first — there's likely a checklist for exactly
   this kind of change.

## Workflow

1. Branch from `main`.
2. Make the smallest change that satisfies the requirement — no speculative
   abstractions, no unused flexibility for hypothetical future needs.
3. Add tests for anything new (Rule 11). Unit tests live next to the code they test;
   golden/snapshot tests for the template engine live under each generator package's
   `__tests__/__snapshots__`.
4. Run, in order: typecheck → lint → test. All three must pass.
5. Update documentation affected by your change — including `docs/plan/03-roadmap.md`
   if you completed or started a roadmap item.
6. Open a PR. The PR template mirrors the Definition of Done — fill it out honestly.

## Definition of Done

A feature isn't done until:
- Implementation is complete (no placeholders disguised as finished work — Rule 2)
- Types pass
- Tests pass
- Lint passes
- Error handling exists where errors are actually possible
- Security has been considered (see [`docs/plan/05-security-and-privacy.md`](docs/plan/05-security-and-privacy.md))
- Documentation is updated
- Existing behavior is preserved (especially: existing-project generation must stay non-destructive — Rule 10)

## Coding-agent rules (spec §38)

These apply to everyone, human or AI:

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

## Common tasks

| I want to...                                 | Start here |
|-----------------------------------------------|------------|
| Add a new AI coding agent adapter              | `.claude/skills/add-agent-adapter/SKILL.md` |
| Add/change a field on the Project Blueprint    | `.claude/skills/extend-blueprint-schema/SKILL.md` |
| Add a new generated file/template              | `.claude/skills/add-deterministic-generator/SKILL.md` |
| Add a new repository analyzer                  | `.claude/skills/add-repo-analyzer/SKILL.md` |
| Know what "done" means before opening a PR     | `.claude/skills/phase-dev-loop/SKILL.md` |

## Commit conventions

Use conventional-commit-style prefixes where practical: `feat:`, `fix:`, `docs:`,
`test:`, `refactor:`, `chore:`. Keep commits scoped to one logical change.
