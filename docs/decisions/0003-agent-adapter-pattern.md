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
`packages/agents/cursor`, `packages/agents/codex`, `packages/agents/copilot`,
`packages/agents/cline`, `packages/agents/zed`) that consumes a `ProjectBlueprint`
and produces agent-specific `GeneratedFile[]`. The canonical Blueprint package never
imports from `packages/agents`, and no adapter is special-cased inside
`packages/blueprint` or `packages/generators`.

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

## Cline and Zed adapters

`ClineAdapter` and `ZedAdapter` were built from the "Future adapter candidates"
research below (kept as a historical record — the research findings, not the
"not started" framing, are what's still relevant). Both real conventions were
confirmed accurate once implemented:

- **Cline** — `.clinerules/`, used consistently as a directory (never the
  single-file form Cline also supports) so `generateInstructions`'
  `.clinerules/project.md` and `generateSkills`' `.clinerules/<id>.md` can coexist
  without fighting over the same path. Plain markdown, no frontmatter — unlike
  every other adapter's skill convention.
- **Zed** — a single `.rules` file, generated unconditionally rather than relying
  on Zed's `.cursorrules`/`CLAUDE.md` compatibility fallback (an intentional,
  first-class file for the Blueprint's actual chosen agent). Zed has no separate
  skill/contextual-rules mechanism at all, so `generateSkills` always returns `[]`
  and `validate` is trivially always valid — a real, structural difference from
  the other five adapters, not a shortcut.

**Once-obvious candidates that are no longer live targets (checked, not assumed,
during the same research pass):**

- **Gemini CLI** — retired.
- **Amazon Q Developer** — being sunset.
- **Windsurf** — acquired/absorbed; the product became Devin Desktop, not a
  standalone agent with its own rules convention anymore.
- **Cursor's own trajectory** — acquired Continue.dev; doesn't change
  `CursorAdapter` itself, but is a signal that this landscape consolidates quickly
  and any adapter built here should be re-verified against the vendor's current docs
  before shipping, not assumed stable from this research date.

No further candidates are currently tracked — the next one would need fresh research
into the 2026+ landscape at whatever point it's actually needed, not a name pulled
from this now-resolved list.

**Process note for whoever builds the next one**: follow the same pattern used for
all six adapters so far (see `docs/plan/03-roadmap.md` Phase 3) — confirm the real,
current file convention from the vendor's own docs first (this codebase has more
than once found the obvious guess wrong: Cursor's rules need the `.mdc` extension
specifically, not `.md`; Copilot's file lives at `.github/copilot-instructions.md`,
not `AGENTS.md` or a top-level dotfile), then add a new `packages/agents/src/<id>/`
implementation, wire it into `SUPPORTED_AGENT_IDS`/`getAgentAdapter` *and*
`packages/blueprint`'s `AgentIdSchema` enum, and add golden-snapshot tests mirroring
the existing adapters' test suites.
