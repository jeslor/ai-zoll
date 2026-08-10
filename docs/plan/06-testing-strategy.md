# 06 — Testing Strategy

> Condensed from `docs/PRODUCT_SPEC.md` §35, 36. Every major package requires tests
> (Rule 11) — this is not optional per-feature.

## Unit tests

For: blueprint validation, analyzers, generators, adapters, CLI commands. Each package
owns its own unit tests.

## Integration tests

For the seams between systems:

```
Web -> API -> Blueprint
API -> AI provider
API -> Database
CLI -> API
```

## End-to-end tests

At minimum, two full flows:

1. New project: Create project → Generate blueprint → Generate workspace → Verify
   files.
2. Existing project: Analyze repository → Generate AI layer → **Verify original source
   unchanged** (this assertion is non-negotiable — it's the automated check for
   Rule 10).

## Golden / snapshot tests

The template engine (`packages/generators`) must use golden-file tests: given
Blueprint X, the generated workspace must always match a checked-in expected output.
This is what prevents accidental regressions in generated projects, and it's the
primary safety net for Phase 2. Store expected fixtures alongside each generator
(`__tests__/__snapshots__/` or equivalent) and treat any snapshot diff as a deliberate,
reviewed change — never auto-accept a snapshot update without checking *why* it
changed.

## Tooling

Vitest or Jest, as appropriate per package (Rule 4 — prefer whichever is already in
use once Phase 0 picks one; don't mix both without reason).
