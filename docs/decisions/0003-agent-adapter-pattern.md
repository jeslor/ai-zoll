# ADR 0003 — Agent-Agnostic Core with Adapter Pattern

## Status

Accepted (mandated by `docs/PRODUCT_SPEC.md` §2 Principle 2, §21, Rule 8).

## Context

Zoll must support Claude Code, Cursor, Codex, GitHub Copilot, and future coding agents,
each of which expects different instruction file formats, directory conventions, and
rule mechanisms. If the canonical Blueprint or the generation pipeline encoded any of
these formats directly, adding or changing agent support would require touching core
product logic — and the product would effectively be "a Claude Code project generator"
rather than an agent-agnostic tool.

## Decision

Introduce a shared `AgentAdapter` interface in `packages/agents`:

```ts
interface AgentAdapter {
  id: string;
  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[];
  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[];
  generateRules(blueprint: ProjectBlueprint): GeneratedFile[];
  validate(blueprint: ProjectBlueprint): ValidationResult;
}
```

Each supported agent is a separate implementation (`packages/agents/claude`,
`packages/agents/cursor`, `packages/agents/codex`, `packages/agents/copilot`) that
consumes a `ProjectBlueprint` and produces agent-specific `GeneratedFile[]`. The
canonical Blueprint package never imports from `packages/agents`, and no adapter is
special-cased inside `packages/blueprint` or `packages/generators`.

Adapters are implemented incrementally (Phase 3) — one at a time, starting with
Claude — but the interface is designed up front to support all of them.

## Consequences

- Adding a new agent means adding a new adapter package, not modifying the Blueprint
  schema or the deterministic generator.
- Agent-specific output directories/formats (e.g. `.claude/`, a Cursor `.cursorrules`
  file, etc.) are entirely owned by the relevant adapter — the rest of the system has
  no opinion on them.
- Testing an adapter means testing `AgentAdapter.generate*` output against a Blueprint
  fixture — independent of the other adapters.

## Alternatives considered

- **Single generator with per-agent `if` branches** — rejected: violates agent-
  agnosticism (Principle 2), makes the generator package grow unboundedly as agents are
  added, and couples unrelated agents' logic together.
