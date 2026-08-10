# 01 — Technical Architecture

> Condensed from `docs/PRODUCT_SPEC.md` §3, 4, 21, 33. Read the spec for full detail.

## Monorepo

TypeScript, pnpm, Turborepo. No unnecessary technologies without justification
(Rule 3).

```
apps/
  web/       Next.js — dashboard
  api/       NestJS — REST API
  cli/       Node.js/TypeScript — CLI
packages/
  blueprint/     schemas/, types/, validation/ — canonical Blueprint, Zod-validated
  generators/    project/, documentation/, agent/ — deterministic template engine
  agents/        claude/, cursor/, codex/, copilot/ — AgentAdapter implementations
  templates/     raw templates consumed by generators
  analyzer/      deterministic repository analyzers
  ai/            AIProvider abstraction
  shared/        cross-cutting types/utilities, no framework dependency
docs/
prisma/          PostgreSQL schema (via Prisma)
```

Stack: TypeScript, pnpm, Turborepo, Next.js, NestJS, PostgreSQL, Prisma, Zod,
Vitest/Jest, Docker.

## The canonical Blueprint

The most important technical component. Everything flows through it. Strictly
Zod-validated — arbitrary unvalidated JSON never becomes a project's source of truth
(Rule 9).

```json
{
  "version": "1.0",
  "project": {
    "name": "School Management Platform",
    "description": "A platform for schools to manage students, teachers and payments.",
    "type": "saas"
  },
  "architecture": { "style": "modular" },
  "stack": {
    "frontend": "nextjs",
    "backend": "nestjs",
    "database": "postgresql",
    "orm": "prisma"
  },
  "features": [
    { "name": "Students", "description": "Manage student records" },
    { "name": "Payments", "description": "Manage school payments" }
  ],
  "testing": { "unit": true, "integration": true, "e2e": true },
  "security": { "authentication": "jwt", "authorization": "rbac" },
  "agent": { "primary": "claude" }
}
```

`packages/blueprint` owns this schema and must stay independent of `apps/web`
(Rule 6) and of any single agent (Rule 8).

## Agent Adapter interface

```ts
interface AgentAdapter {
  id: string;
  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[];
  generateSkills(blueprint: ProjectBlueprint): GeneratedFile[];
  generateRules(blueprint: ProjectBlueprint): GeneratedFile[];
  validate(blueprint: ProjectBlueprint): ValidationResult;
}
```

Implementations: `ClaudeAdapter`, `CursorAdapter`, `CodexAdapter`, `CopilotAdapter`,
living under `packages/agents/<id>/`. Build one at a time (Phase 3) — the interface
must support all of them, but implementation is incremental. See
`.claude/skills/add-agent-adapter/SKILL.md` when adding one.

## AI provider abstraction

```ts
interface AIProvider {
  generateBlueprint(input: BlueprintInput): Promise<ProjectBlueprint>;
  analyzeRepository(profile: RepositoryProfile): Promise<RepositoryAnalysis>;
  generateProjectContext(blueprint: ProjectBlueprint): Promise<ProjectContext>;
}
```

Lives in `packages/ai`. A mock provider comes first (Phase 1) so the rest of the system
works without a real external LLM; a real provider is wired in later (Phase 4). Every
AI response is validated against the Blueprint schema before it's trusted — if
validation fails, retry or repair, never bypass (Rule 9).

## Deterministic vs. AI boundary

Deterministic (plain code): directory detection, config parsing, package/dependency
detection, file generation, template rendering, validation.

AI: understanding requirements, interpreting architecture, identifying conventions/
concepts, generating project-specific context, identifying ambiguities.

See [`docs/decisions/0004-deterministic-vs-ai-boundary.md`](../decisions/0004-deterministic-vs-ai-boundary.md)
for the cost-control rationale.
