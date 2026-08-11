# 00 — Vision & Philosophy

> Condensed from `docs/PRODUCT_SPEC.md` §1, 2, 45, 46, 47. Read the spec for full detail.

## Vision

AI Zoll helps developers prepare software projects for AI-assisted
development. It does not replace Claude Code, Cursor, Codex, or Copilot — it solves the
problem that comes *before* and *around* those tools: developers often don't know how
to structure a project for AI-assisted development, what instructions to provide, what
skills to create, or how to configure different coding agents.

Zoll creates a canonical **Project Blueprint** and converts it into an AI-ready
development environment, for both new projects and existing repositories.

## The five principles

1. **AI should make decisions, not freestyle the entire project.** An LLM is never
   asked to generate a whole workspace from scratch. Flow: requirements → AI
   interpretation → canonical Blueprint → validation → deterministic templates →
   generated workspace. The Blueprint is the source of truth.
2. **Agent agnostic.** The canonical project representation never depends on Claude
   Code, Cursor, Codex, Copilot, or any future agent. Agent-specific output is produced
   through adapters.
3. **Existing projects are first-class.** An old project with `src/`, `package.json`,
   a `Dockerfile`, doesn't need to be rebuilt — Zoll documents and layers AI-context
   around it.
4. **Deterministic where possible.** Directory detection, config parsing, package/
   dependency detection, file generation, template rendering, and validation are all
   plain code. AI is reserved for understanding requirements, interpreting
   architecture, identifying conventions/concepts, generating project-specific
   context, and flagging ambiguity.
5. **The CLI is a first-class product**, not an afterthought to the dashboard. The web
   app and CLI consume the same underlying blueprint system.

## North star

> "How do I make any AI coding agent understand this software and work on it according
> to the project's architecture and engineering standards?"

- New project: Idea → Blueprint → AI-ready project.
- Existing project: Repository → Understanding → Blueprint → AI-ready project.
- Company: Company standards → Project standards → Agent context → Consistent
  AI-assisted development.

## The core differentiator

Zoll is never "an AI that writes your code" — that puts it in direct competition with
coding agents. Instead:

> **AI Zoll prepares, structures, and maintains the context that AI coding
> agents need to build software effectively.**

- For individuals: turn your project idea or existing repository into an AI-ready
  software workspace.
- For companies: turn engineering standards into consistent, agent-ready project
  context.

The coding agents remain the builders. Zoll prepares the environment in which they
build.

## Final product model

```
                         AI SOFTWARE ZOLL
                                |
              +-----------------+-----------------+
              |                                   |
         NEW PROJECT                         EXISTING PROJECT
              |                                   |
              v                                   v
      Requirements -> Blueprint            Repository -> Analysis
              |                                   |
              +-----------------+-----------------+
                                v
                       CANONICAL BLUEPRINT
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
        Architecture         Skills           Standards
             |                  |                  |
             +------------------+------------------+
                                v
                         AGENT ADAPTERS
                                |
                +----------------+----------------+
                v                v                v
             Claude           Cursor           Codex
                |                |                |
                +----------------+----------------+
                                v
                         Developer Workspace
                                |
                                v
                         AI Coding Agent
                                |
                                v
                            Software
```

See [`01-architecture.md`](01-architecture.md) for how this maps to the monorepo.
