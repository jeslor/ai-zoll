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

## Future adapter candidates

Researched during the CLI-only pivot session, when `CopilotAdapter` was added as the
fourth adapter. This is a survey of the live 2026 AI-coding-agent landscape for the
*next* adapter to build — deliberately research + documentation only (Rule 1: don't
implement future-phase work early). Each candidate below is a separate future task,
not started.

**Live candidates, real conventions confirmed:**

- **Cline** — a single `.clinerules` file, or a `.clinerules/` directory of markdown
  files that get merged, at the workspace root. Plain markdown, no frontmatter
  requirement. Cline's own guidance recommends keeping the combined content under
  ~150 lines. Structurally the simplest of the four already-built adapters plus this
  one — closest in shape to `CodexAdapter` (reads a checked-in file directly, no
  adapted content needed) but the filename differs from `AGENTS.md`, so
  `generateInstructions` would need to return real content here, unlike Codex.
- **Zed** — a single `.rules` file at the project root. Zed also recognizes
  `.cursorrules` and `CLAUDE.md` as compatibility fallbacks (first match wins), which
  means a project already targeting Claude or Cursor may get free, un-requested Zed
  compatibility — worth a deliberate decision (probably still generate a real `.rules`
  file rather than relying on that fallback, since the Blueprint's chosen agent should
  produce an intentional, first-class file, not an accidental one).

**Once-obvious candidates that are no longer live targets (checked, not assumed):**

- **Gemini CLI** — retired.
- **Amazon Q Developer** — being sunset.
- **Windsurf** — acquired/absorbed; the product became Devin Desktop, not a
  standalone agent with its own rules convention anymore.
- **Cursor's own trajectory** — acquired Continue.dev; doesn't change
  `CursorAdapter` itself, but is a signal that this landscape consolidates quickly
  and any adapter built here should be re-verified against the vendor's current docs
  before shipping, not assumed stable from this research date.

**Process note for whoever builds one of these next**: follow the same pattern as
`CopilotAdapter` (see `docs/plan/03-roadmap.md` Phase 3) — confirm the real, current
file convention from the vendor's own docs first (this codebase has twice now found
the obvious guess wrong: Cursor's rules need the `.mdc` extension specifically, not
`.md`; Copilot's file lives at `.github/copilot-instructions.md`, not `AGENTS.md` or a
top-level dotfile), then add a new `packages/agents/src/<id>/` implementation, wire it
into `SUPPORTED_AGENT_IDS`/`getAgentAdapter`, and add golden-snapshot tests mirroring
the existing four adapters' test suites.
