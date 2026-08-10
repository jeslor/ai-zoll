# ADR 0002 — Canonical Blueprint as Source of Truth, Validated with Zod

## Status

Accepted (mandated by `docs/PRODUCT_SPEC.md` §4, Rule 9).

## Context

Both the new-project flow (requirements → AI → workspace) and the existing-project flow
(repository → analysis → AI → workspace) need a single, stable, well-typed
representation of "what this project is" that every downstream consumer — generators,
agent adapters, the dashboard, the CLI — can rely on. LLM output is inherently
unreliable in shape; it cannot be trusted directly as that representation.

## Decision

- The **Project Blueprint** (`packages/blueprint`) is the only representation that
  generators and agent adapters are allowed to consume. No component renders files or
  generates agent config directly from raw AI output or raw repository data.
- The Blueprint schema is defined and validated with **Zod**. Every Blueprint —
  whether authored by a human via the dashboard/CLI or produced by an `AIProvider` —
  passes through the same validator before it's persisted or used.
- If an AI response fails validation, the system retries or repairs; it never falls
  back to accepting unvalidated data (Rule 9).
- The Blueprint is versioned (`BlueprintVersion`) so projects can track which schema
  version produced them, enabling future `sync`/migration tooling (Phase 9).

## Consequences

- `packages/blueprint` has no dependency on `apps/web`, `packages/ai`, or any specific
  agent adapter (Rule 6, Rule 8) — it is pure schema + types + validation.
- Adding a field to the Blueprint is a deliberate, versioned change — see
  `.claude/skills/extend-blueprint-schema/SKILL.md`.
- Any new AI-generation path (Phase 4, Phase 7/8) must produce a Blueprint (or a typed
  intermediate that maps into one) and validate it — there is no shortcut.

## Alternatives considered

- **Trusting raw LLM JSON output directly** — rejected outright by spec Rule 9; too
  fragile for a system whose entire value proposition is a reliable, deterministic
  generation step downstream.
- **JSON Schema instead of Zod** — Zod chosen because it gives TypeScript types and
  runtime validation from a single source, which JSON Schema + a separate codegen step
  does not, and the spec explicitly names Zod.
