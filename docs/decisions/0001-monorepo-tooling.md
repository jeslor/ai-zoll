# ADR 0001 — Monorepo Tooling: pnpm + Turborepo + TypeScript

## Status

Accepted (mandated by `docs/PRODUCT_SPEC.md` §3).

## Context

AI Zoll ships three deployables (web dashboard, API, CLI) that all need to
share the same canonical Blueprint types, validation, generators, and agent adapters.
Without a monorepo, these packages would drift out of sync or be duplicated.

## Decision

- **pnpm workspaces** for package management (fast installs, strict dependency
  isolation, avoids phantom dependencies).
- **Turborepo** for task orchestration/caching across `apps/*` and `packages/*`.
- **TypeScript** everywhere, sharing a base config (`tsconfig.base.json`).

## Consequences

- All packages must declare their own `package.json` with explicit dependencies —
  nothing is implicitly available via hoisting assumptions.
- CI and local dev use the same `turbo run <task>` entry points, defined once in
  `turbo.json`.
- New packages/apps are added under `apps/` or `packages/` and picked up automatically
  by `pnpm-workspace.yaml`.

## Alternatives considered

- **Separate repos per app** — rejected: makes sharing the Blueprint schema and agent
  adapters across web/API/CLI painful and encourages drift, which directly undermines
  Principle 1 (Blueprint as single source of truth).
- **Nx** — plausible alternative to Turborepo; not chosen because the spec explicitly
  names Turborepo and there's no concrete requirement (e.g. advanced code generators)
  that Nx would satisfy and Turborepo wouldn't (Rule 3 — don't add tooling without
  justification).
