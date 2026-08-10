# Glossary

**Project Blueprint (Blueprint)** — The canonical, Zod-validated JSON representation of
a project: its stack, architecture style, features, testing/security posture, and
primary AI agent. The single source of truth that all generation flows through. See
`docs/decisions/0002-blueprint-as-source-of-truth.md`.

**BlueprintVersion** — A versioned snapshot of the Blueprint schema a given project was
generated from. Enables future drift detection and `sync`.

**AgentAdapter** — The interface (`packages/agents`) that turns a Blueprint into
agent-specific output (instructions, skills, rules) for one AI coding agent (Claude,
Cursor, Codex, Copilot). See `docs/decisions/0003-agent-adapter-pattern.md`.

**AIProvider** — The abstraction (`packages/ai`) around an LLM used for interpretation
tasks: turning requirements into a Blueprint, analyzing a repository profile,
generating project-specific context. A mock implementation exists before any real
provider is wired in (Phase 1 vs. Phase 4).

**Generator** — A deterministic component (`packages/generators`) that renders a
Blueprint into workspace files (README, ARCHITECTURE.md, docs/, skills/, etc.) using
templates from `packages/templates`. Same Blueprint in, same files out — no AI call.

**Analyzer** — A deterministic component (`packages/analyzer`) that inspects an
existing repository and produces structured findings (e.g. `FrameworkAnalyzer`,
`DatabaseAnalyzer`, `TestAnalyzer`) with a confidence level: Detected, Likely, or
Unknown. Never guesses with false certainty.

**Skill (product-generated)** — A generated file describing when/how an AI agent should
work on a specific concern of the *end user's* project (e.g. `skills/authentication/`),
generated from actual detected/declared project requirements — not a generic boilerplate
list. Not to be confused with:

**Skill (repo-meta / `.claude/skills`)** — A process skill for whoever is *building
Zoll itself*, e.g. how to add a new agent adapter. Lives in this repo's `.claude/skills/`
and is irrelevant to end users' generated projects.

**Existing-project mode** — The workflow where Zoll analyzes an existing repository and
layers AI context around it without modifying or restructuring existing source code
(non-destructive by default — Rule 10).

**Drift (Architecture Drift)** — A later-phase feature (Phase 11) comparing a project's
expected architecture (per its Blueprint) against its actual current repository state,
reporting violations such as import-boundary breaks or undocumented directories.

**Organization Blueprint** — A later-phase (Phase 10) concept where a company defines
shared engineering standards (architecture, security, testing, CI/CD, approved
frameworks, agent standards) that individual Project Blueprints inherit from.
