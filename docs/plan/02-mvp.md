# 02 — MVP Scope

> Condensed from `docs/PRODUCT_SPEC.md` §41-44. Read the spec for full detail.

## First MVP — new project

```bash
npx ai-software-zoll init
```

Answer: What are you building? Architecture? Stack? Testing? Agent?

Zoll generates:

```
Project/
  README.md
  PROJECT.md
  ARCHITECTURE.md
  AGENTS.md
  docs/
  skills/
  <agent-specific configuration>
```

The developer can immediately open the project with their preferred AI coding agent.

## Second MVP — existing project

```bash
cd existing-project
npx ai-software-zoll analyze
```

Zoll detects framework, database, architecture, testing, modules, conventions, then
generates `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `skills/`,
and agent-specific configuration — **without modifying existing application code**
(Rule 10).

## First practical milestone (proves the foundation works)

Input: *"Build a SaaS CRM with Next.js, NestJS, PostgreSQL and Prisma using Modular
Architecture."*

Output: Project Blueprint → Generated Workspace → Agent Context → ready for
Claude/Cursor/Codex.

If this works reliably end-to-end, the foundation of the product works.

## Explicitly out of scope for now

Do not build:

- Autonomous coding agent
- AI chat interface
- Full enterprise governance
- Billing system
- Marketplace / plugin marketplace
- Dozens of agent integrations or frameworks
- Complex architecture designer
- Real-time collaboration
- Advanced drift detection
- Large-scale repository indexing
- Custom model training

These are possible future features, not MVP work. Building any of them before the
current roadmap phase reaches them violates Rule 1.
