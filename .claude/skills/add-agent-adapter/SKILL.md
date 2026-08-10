---
name: add-agent-adapter
description: Use when implementing a new AgentAdapter (Claude, Cursor, Codex, Copilot, or a future coding agent) under packages/agents, or modifying an existing one. Ensures the agent-agnostic boundary (Rule 8) is respected.
---

# Adding or changing an Agent Adapter

## When to use this

- Implementing `packages/agents/<id>/` for a new coding agent.
- Changing what an existing adapter generates (instructions, skills, or rules format).

## Before you start

1. Confirm this adapter is actually next in the roadmap
   (`docs/plan/03-roadmap.md`, Phase 3) — implement adapters one at a time, not several
   in parallel (spec §37 Phase 3).
2. Re-read the `AgentAdapter` interface in `docs/plan/01-architecture.md` §"Agent
   Adapter interface" and `docs/decisions/0003-agent-adapter-pattern.md`.

## Required shape

Every adapter implements:

```ts
interface AgentAdapter {
  id: string;
  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[];
  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[];
  generateRules(blueprint: ProjectBlueprint): GeneratedFile[];
  validate(blueprint: ProjectBlueprint): ValidationResult;
}
```

- `id` is a stable, lowercase identifier (`"claude"`, `"cursor"`, `"codex"`,
  `"copilot"`) — this is what `blueprint.agent.primary` refers to.
- Each `generate*` method is pure: same `ProjectBlueprint` in, same `GeneratedFile[]`
  out. No network calls, no AI calls, no filesystem side effects inside the adapter —
  writing files is the caller's job.
- `validate` checks whether the given Blueprint is actually renderable by this agent
  (e.g. does it need a feature this agent's format can't express yet) and returns a
  `ValidationResult`, not a thrown exception, for anything that's a normal "this
  Blueprint isn't compatible" case.

## Rules this touches

- **Rule 8**: the adapter depends on `packages/blueprint`'s types, never the other way
  around. `packages/blueprint` must not import anything from `packages/agents`.
- **Rule 4**: check `packages/templates` for reusable rendering helpers before writing
  new ones from scratch inside the adapter.
- **Rule 11**: every adapter needs tests asserting its `generate*` output against fixed
  Blueprint fixtures (golden-test style, matching `docs/plan/06-testing-strategy.md`).

## Checklist

- [ ] `packages/agents/<id>/` created with the adapter implementing the full interface
- [ ] Adapter registered wherever the set of available adapters is enumerated (don't
      hardcode a single adapter's id anywhere generation logic branches on agent choice)
- [ ] Unit tests with Blueprint fixtures covering: minimal Blueprint, full-featured
      Blueprint, and any agent-specific edge case (e.g. features this agent can't
      represent)
- [ ] `docs/plan/03-roadmap.md` Phase 3 checklist updated
- [ ] Typecheck, lint, test all pass
