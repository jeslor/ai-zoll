# AI Software Zoll

## Master Product Specification, Development Roadmap & Coding-Agent Instructions

> **Purpose:** This document is the authoritative specification for building AI Software Zoll. The coding agent should treat it as the product source of truth and implement the application incrementally according to the phases below.
>
> **Provenance:** this file is a verbatim copy of the original product specification as provided by the project owner on 2026-08-10. It must not be edited to "correct" or update product direction — if direction changes, record the change as a new ADR in `docs/decisions/` or a dated addendum, and keep this file as the historical source of truth. Derived, operational docs live in `docs/plan/` and link back here by section number.

---

# 1. Product Vision

AI Software Zoll is a platform and CLI that helps developers prepare software projects for AI-assisted development.

The product does **not** attempt to replace Claude Code, Cursor, Codex, GitHub Copilot, or other coding agents.

Instead, it solves the problem that comes **before** and **around** those agents:

> Developers often do not know how to structure a project for AI-assisted development, what instructions to provide, what skills to create, how to organize project context, or how different coding agents should be configured.

AI Software Zoll creates a structured, canonical **Project Blueprint** and converts that blueprint into an AI-ready development environment.

The platform supports both:

### New Projects

A developer describes what they want to build and receives a complete AI-ready project structure.

### Existing Projects

A developer points Zoll at an existing repository. Zoll analyzes the project, understands its architecture and conventions, and generates the missing AI-development layer around the existing codebase.

---

# 2. Core Product Philosophy

The product should follow five principles.

## Principle 1 — AI should make decisions, not freestyle the entire project

Do not ask an LLM to generate hundreds of files from scratch.

Instead:

```text
User Requirements
        ↓
AI Interpretation
        ↓
Canonical Blueprint
        ↓
Validation
        ↓
Deterministic Templates
        ↓
Generated Workspace
```

The blueprint is the source of truth.

---

## Principle 2 — Agent agnostic

The project must not be designed around one AI coding agent.

The canonical project representation should be independent of:

* Claude Code
* Cursor
* Codex
* GitHub Copilot
* future agents

Agent-specific configuration must be generated through adapters.

```text
                Project Blueprint
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Claude        Cursor        Codex
       Adapter       Adapter       Adapter
          │            │            │
          ▼            ▼            ▼
     Agent-specific output
```

---

## Principle 3 — Existing projects are first-class

Do not treat existing repositories as an afterthought.

A developer should be able to take an old project with:

```text
src/
package.json
Dockerfile
README.md
...
```

and turn it into an AI-ready project without rebuilding it.

---

## Principle 4 — Deterministic where possible

Use normal code for:

* directory detection
* configuration parsing
* package detection
* dependency detection
* file generation
* template rendering
* validation

Use AI for:

* understanding requirements
* interpreting architecture
* identifying conventions
* identifying project concepts
* generating project-specific context
* identifying ambiguities

---

## Principle 5 — The CLI is a first-class product

The dashboard is not the only interface.

Developers should be able to use:

```bash
npx ai-software-zoll init
```

```bash
npx ai-software-zoll analyze
```

```bash
npx ai-software-zoll sync
```

The web application and CLI must use the same underlying blueprint system.

---

# 3. Product Architecture

Use a monorepo.

Recommended structure:

```text
ai-software-zoll/
│
├── apps/
│   │
│   ├── web/
│   │   ├── Next.js
│   │   └── Dashboard
│   │
│   ├── api/
│   │   ├── NestJS
│   │   └── REST API
│   │
│   └── cli/
│       └── Node.js / TypeScript
│
├── packages/
│   │
│   ├── blueprint/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── validation/
│   │
│   ├── generators/
│   │   ├── project/
│   │   ├── documentation/
│   │   └── agent/
│   │
│   ├── agents/
│   │   ├── claude/
│   │   ├── cursor/
│   │   ├── codex/
│   │   └── copilot/
│   │
│   ├── templates/
│   │
│   ├── analyzer/
│   │
│   ├── ai/
│   │
│   └── shared/
│
├── docs/
│
├── prisma/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Use:

* TypeScript
* pnpm
* Turborepo
* Next.js
* NestJS
* PostgreSQL
* Prisma
* Zod
* Vitest/Jest as appropriate
* Docker

Do not introduce unnecessary technologies without justification.

---

# 4. The Canonical Blueprint

The most important technical component is the Project Blueprint.

Everything should eventually flow through it.

Example:

```json
{
  "version": "1.0",

  "project": {
    "name": "School Management Platform",
    "description": "A platform for schools to manage students, teachers and payments.",
    "type": "saas"
  },

  "architecture": {
    "style": "modular"
  },

  "stack": {
    "frontend": "nextjs",
    "backend": "nestjs",
    "database": "postgresql",
    "orm": "prisma"
  },

  "features": [
    {
      "name": "Students",
      "description": "Manage student records"
    },
    {
      "name": "Payments",
      "description": "Manage school payments"
    }
  ],

  "testing": {
    "unit": true,
    "integration": true,
    "e2e": true
  },

  "security": {
    "authentication": "jwt",
    "authorization": "rbac"
  },

  "agent": {
    "primary": "claude"
  }
}
```

Use a strict schema.

Do not allow arbitrary unvalidated JSON to become the project's source of truth.

Use Zod or equivalent schema validation.

---

# 5. New Project Workflow

The first major workflow is:

```text
Create Project
      ↓
Project Requirements
      ↓
Architecture
      ↓
Technology Stack
      ↓
Development Standards
      ↓
AI Coding Agent
      ↓
Generate Blueprint
      ↓
Review
      ↓
Generate Workspace
```

---

# 6. New Project — User Experience

The dashboard should begin with:

```text
What do you want to do?

[ Start a New Project ]

[ Prepare an Existing Project ]
```

Do not overwhelm the user with dozens of settings on the first screen.

---

## Step 1 — Project description

Ask:

```text
What are you building?
```

Allow natural language.

Example:

> A SaaS platform that allows schools to manage students, teachers, attendance and payments.

---

## Step 2 — Project type

Examples:

```text
SaaS
Web Application
API
Mobile Backend
E-commerce
Internal Tool
AI Application
CLI
Other
```

---

## Step 3 — Technology stack

Allow the user to choose:

### Frontend

* Next.js
* React
* Vue
* Angular
* None

### Backend

* NestJS
* Express
* Fastify
* Django
* FastAPI
* None

### Database

* PostgreSQL
* MySQL
* MongoDB
* SQLite
* Redis
* Other

### ORM

Examples:

* Prisma
* Drizzle
* TypeORM
* SQLAlchemy

The system should be extensible.

Do not hardcode the UI architecture so tightly that adding a new technology requires rewriting the application.

---

# 7. Architecture Selection

Support initially:

* Modular
* Layered
* Clean Architecture
* Hexagonal
* Domain-Driven Design

The user should see a short explanation of each.

For example:

```text
Modular Architecture

Organizes the application around independent
business modules with clear boundaries.
```

Allow the AI to recommend an architecture based on the project description.

But never silently override the user's choice.

---

# 8. Development Standards

Allow configuration for:

* Testing
* Linting
* Formatting
* Naming conventions
* API style
* Error handling
* Logging
* Security
* Git conventions
* Documentation
* CI/CD

These should eventually become part of the blueprint.

---

# 9. AI Coding Agent Selection

Support the architecture for multiple agents.

Initially prioritize:

1. Claude Code
2. Cursor
3. Codex

Add additional agents through adapters later.

The user should be able to select:

```text
Primary Agent

○ Claude Code
○ Cursor
○ Codex
○ GitHub Copilot
```

Eventually support multiple agents simultaneously.

---

# 10. Blueprint Preview

Before generation, show:

```text
PROJECT BLUEPRINT

Project
School Management Platform

Architecture
Modular

Frontend
Next.js

Backend
NestJS

Database
PostgreSQL

Agent
Claude Code
```

Also show:

```text
Will generate:

✓ Project documentation
✓ Architecture documentation
✓ Agent instructions
✓ Skills
✓ Workflows
✓ Coding standards
✓ Testing conventions
✓ Agent-specific configuration
```

The user should be able to modify the blueprint before generation.

---

# 11. Generated Workspace

For example:

```text
school-platform/

├── README.md
├── PROJECT.md
├── ARCHITECTURE.md
├── CONVENTIONS.md
├── SECURITY.md
├── TESTING.md
│
├── AGENTS.md
│
├── docs/
│   ├── architecture/
│   ├── development/
│   └── decisions/
│
├── skills/
│   ├── authentication/
│   ├── database/
│   └── testing/
│
├── workflows/
│
├── src/
│
└── tests/
```

Agent-specific files must be generated through the relevant adapter.

Do not assume that all agents use the same directory or instruction mechanism.

---

# 12. Existing Project Workflow

This is the second major product.

User chooses:

```text
Prepare an Existing Project
```

The product explains:

> Zoll will analyze your repository and generate the AI coding context your project is missing.

The user receives a CLI command:

```bash
npx ai-software-zoll analyze
```

---

# 13. Existing Project Analysis

The CLI should analyze the local repository.

Initially inspect:

```text
package.json
pnpm-lock.yaml
package-lock.json
yarn.lock
tsconfig.json
eslint.config.*
.prettierrc*
Dockerfile
docker-compose*
README*
.gitignore
.github/
src/
app/
lib/
test/
tests/
prisma/
```

Do not upload everything blindly.

---

# 14. Static Repository Analysis

Build deterministic analyzers.

Examples:

```text
PackageAnalyzer
FrameworkAnalyzer
DatabaseAnalyzer
DirectoryAnalyzer
TestAnalyzer
GitAnalyzer
ConfigurationAnalyzer
DependencyAnalyzer
```

Each produces structured findings.

Example:

```json
{
  "framework": {
    "name": "nestjs",
    "confidence": 0.99
  },

  "database": {
    "name": "postgresql",
    "orm": "prisma"
  },

  "testing": {
    "framework": "jest"
  }
}
```

---

# 15. Architecture Detection

Analyze the directory structure and imports.

Potential result:

```json
{
  "architecture": {
    "detected": "modular",
    "confidence": 0.87
  }
}
```

Do not pretend certainty.

The system should distinguish:

```text
Detected
Likely
Unknown
```

---

# 16. AI-Assisted Repository Understanding

After deterministic analysis, send a compact repository profile to the LLM.

The AI should identify:

* business domains
* modules
* architectural patterns
* conventions
* important dependencies
* testing patterns
* security patterns
* undocumented conventions
* inconsistencies
* missing documentation

The AI should **not** automatically modify source code during this stage.

Analysis comes first.

---

# 17. Existing Project Report

Show the developer:

```text
PROJECT ANALYSIS

✓ NestJS detected
✓ PostgreSQL detected
✓ Prisma detected
✓ Jest detected

Architecture
Modular — 91% confidence

Detected modules
✓ Users
✓ Organizations
✓ Billing
✓ Notifications

Missing AI context
⚠ No AGENTS.md
⚠ No architecture documentation
⚠ No documented testing conventions
⚠ No skills
```

This report is important.

The developer should understand what Zoll discovered before accepting changes.

---

# 18. Generate AI Layer

After approval:

```text
Generate AI Workspace
```

Zoll creates the missing files.

It should preserve existing application code.

This is critical.

Existing-project mode must be:

> **Non-destructive by default.**

Never overwrite source code without explicit user approval.

---

# 19. Existing Project Generated Layer

Example:

```text
existing-project/

├── AGENTS.md
├── PROJECT.md
├── ARCHITECTURE.md
├── CONVENTIONS.md
│
├── docs/
│   └── ai/
│
├── skills/
│   ├── users/
│   ├── billing/
│   └── testing/
│
├── .claude/
│   └── ...
│
└── existing source code...
```

Do not force a new folder structure onto an existing application.

Instead:

> **Document and preserve the existing architecture first.**

---

# 20. Skills Generation

Skills should be generated from actual project requirements.

Don't generate 50 generic skills.

Possible skills:

```text
skills/

authentication/
database/
testing/
api-development/
payments/
deployment/
```

Each skill should explain:

* When it should be used
* Project-specific conventions
* Relevant files
* Required patterns
* Things the agent must avoid
* Testing expectations

---

# 21. Agent Adapter Architecture

Create a common interface:

```ts
interface AgentAdapter {
  id: string;

  generateInstructions(
    blueprint: ProjectBlueprint
  ): GeneratedFile[];

  generateSkills(
    blueprint: ProjectBlueprint
  ): GeneratedFile[];

  generateRules(
    blueprint: ProjectBlueprint
  ): GeneratedFile[];

  validate(
    blueprint: ProjectBlueprint
  ): ValidationResult;
}
```

Then implement:

```text
ClaudeAdapter
CursorAdapter
CodexAdapter
CopilotAdapter
```

The canonical blueprint must never depend on a specific agent.

---

# 22. CLI Commands

Initial commands:

```bash
npx ai-software-zoll init
```

Starts a new project interactively.

```bash
npx ai-software-zoll init <project-id>
```

Downloads a blueprint created from the dashboard.

```bash
npx ai-software-zoll analyze
```

Analyzes an existing project.

```bash
npx ai-software-zoll generate
```

Generates the AI layer from an analysis/blueprint.

```bash
npx ai-software-zoll sync
```

Synchronizes the local project with its blueprint.

```bash
npx ai-software-zoll login
```

Authenticates the CLI.

---

# 23. CLI Design Principle

The CLI must remain lightweight.

Do not put your entire AI engine inside the CLI.

The CLI should perform:

```text
Authentication
Repository analysis
Local validation
Blueprint retrieval
File generation
```

Heavy AI operations can happen remotely when appropriate.

However, repository analysis should perform as much deterministic processing locally as possible to minimize data transmission and protect user privacy.

---

# 24. Security Requirements

This is extremely important because existing repositories may contain secrets.

Never upload:

```text
.env
.env.local
private keys
certificates
credentials
API keys
tokens
SSH keys
```

Create an explicit exclusion system.

Example:

```text
.env*
*.pem
*.key
id_rsa
credentials.json
```

The CLI should detect likely secrets before transmission.

Display exactly what will be sent.

The user must approve repository analysis before sensitive source information is transmitted.

---

# 25. Privacy

The platform should clearly distinguish:

### Local analysis

Information processed locally.

### Remote AI analysis

Information transmitted to the server/AI provider.

Users should know the difference.

For company customers, eventually provide:

* data retention controls
* deletion
* audit logs
* configurable AI providers
* self-hosted analysis
* enterprise privacy controls

---

# 26. Blueprint Versioning

Blueprints must be versioned.

Example:

```text
Project Blueprint

v1
v2
v3
```

A project should know which blueprint version it was generated from.

This enables future:

```bash
npx ai-software-zoll sync
```

---

# 27. Architecture Drift

This should be a later feature, not MVP.

Eventually:

```bash
npx ai-software-zoll check
```

could compare:

```text
Expected architecture
        vs
Actual repository
```

and report:

```text
Architecture Drift

⚠ 3 modules violate import boundaries.
⚠ 2 undocumented directories detected.
⚠ Testing convention mismatch.
```

This is one of the strongest long-term features.

---

# 28. Company Mode

After the individual product works, introduce organizations.

An organization can define:

```text
Engineering Blueprint

Architecture
Security
Testing
CI/CD
Documentation
Approved frameworks
Agent standards
```

Projects inherit those standards.

```text
Organization Blueprint
        ↓
Project Blueprint
        ↓
Agent Adapter
        ↓
Agent Context
```

The organization should be able to update standards centrally.

---

# 29. Dashboard Navigation

Recommended initial navigation:

```text
Dashboard

Projects
Blueprints
Templates
Agents

[Later]

Organizations
Standards
Repositories
Drift
Settings
```

---

# 30. Dashboard Project Page

A project page should contain:

```text
Project Overview

Architecture
Stack
Blueprint
Generated Files
AI Agents
Skills
Documentation
Versions
```

Eventually:

```text
Repository Health
Architecture Drift
Agent Context Health
```

---

# 31. Database Model

Start with:

```text
User
Project
ProjectBlueprint
BlueprintVersion
Agent
GeneratedArtifact
```

Later:

```text
Organization
OrganizationMember
OrganizationStandard
Repository
RepositoryAnalysis
DriftReport
```

Do not prematurely create dozens of tables.

---

# 32. API Design

Example endpoints:

```text
POST   /projects
GET    /projects
GET    /projects/:id

POST   /projects/:id/blueprint
GET    /projects/:id/blueprint

POST   /projects/:id/generate
GET    /projects/:id/generated-files

POST   /analysis
GET    /analysis/:id

POST   /cli/auth
POST   /cli/projects/:id/download
```

Use clear resource-oriented naming.

Validate every request.

---

# 33. AI Layer

Create an abstraction:

```ts
interface AIProvider {
  generateBlueprint(
    input: BlueprintInput
  ): Promise<ProjectBlueprint>;

  analyzeRepository(
    profile: RepositoryProfile
  ): Promise<RepositoryAnalysis>;

  generateProjectContext(
    blueprint: ProjectBlueprint
  ): Promise<ProjectContext>;
}
```

This prevents the entire application from becoming coupled to one AI provider.

---

# 34. AI Cost Control

This is a critical requirement.

Do not use an LLM for deterministic tasks.

Use:

```text
Templates
Schemas
Rules
Static analysis
Caching
```

where possible.

Use LLMs for:

```text
Interpretation
Architecture reasoning
Project-specific context
Repository understanding
```

Cache reusable results.

Never send an entire repository when a structured repository profile is sufficient.

---

# 35. Testing Strategy

Every major package requires tests.

### Unit tests

For:

* blueprint validation
* analyzers
* generators
* adapters
* CLI commands

### Integration tests

For:

```text
Web → API → Blueprint
API → AI provider
API → Database
CLI → API
```

### End-to-end tests

At minimum:

```text
Create project
    ↓
Generate blueprint
    ↓
Generate workspace
    ↓
Verify files
```

And:

```text
Existing repository
    ↓
Analyze
    ↓
Generate AI layer
    ↓
Verify original source unchanged
```

---

# 36. Golden Tests

The template engine should use golden/snapshot-style tests.

Given:

```text
Blueprint X
```

the generated workspace should always match the expected output.

This prevents accidental changes to generated projects.

---

# 37. Development Phases

## Phase 0 — Product Foundation

Build:

* Monorepo
* TypeScript
* pnpm
* Turborepo
* Web app
* API
* CLI
* Shared packages
* PostgreSQL
* Prisma
* Basic CI

Do not build complex UI yet.

---

# Phase 1 — Blueprint Engine

Build this first.

Implement:

```text
ProjectBlueprint
BlueprintSchema
BlueprintValidator
BlueprintVersion
```

Then build:

```text
Project → Blueprint
```

using a mock AI provider initially.

The system should work without an external LLM.

---

# Phase 2 — Deterministic Generator

Implement:

```text
Blueprint
   ↓
Template Engine
   ↓
Workspace
```

Generate:

```text
README.md
PROJECT.md
ARCHITECTURE.md
AGENTS.md
docs/
skills/
workflows/
```

Make this deterministic.

---

# Phase 3 — Agent Adapters

Implement the first adapter.

Start with one agent.

After it works:

```text
Claude
Cursor
Codex
```

Do not implement three adapters simultaneously.

The adapter architecture must support all three, but implementation can be incremental.

---

# Phase 4 — AI Blueprint Generation

Connect the AI provider.

Input:

```text
Project description
+
User selections
```

Output:

```text
Validated ProjectBlueprint
```

The AI must return structured output.

Never trust raw AI text as the blueprint.

Validate it.

If validation fails, retry or repair.

---

# Phase 5 — CLI

Implement:

```bash
npx ai-software-zoll init
```

Then:

```bash
npx ai-software-zoll init PROJECT_ID
```

The CLI should be usable without the dashboard.

---

# Phase 6 — Dashboard

Now build the polished dashboard.

Create:

```text
New Project
Existing Project
Project Overview
Blueprint Editor
Agent Selection
Generated Workspace Preview
```

The dashboard should consume the same blueprint APIs as the CLI.

---

# Phase 7 — Existing Project Analysis

Build:

```bash
npx ai-software-zoll analyze
```

Implement deterministic analyzers first.

Then AI interpretation.

Then:

```text
Repository Analysis
        ↓
Blueprint
        ↓
AI Context
```

Do not modify application source code.

---

# Phase 8 — Existing Project AI Layer

Generate:

```text
AGENTS.md
PROJECT.md
ARCHITECTURE.md
CONVENTIONS.md
skills/
agent-specific configuration
```

Preserve existing source.

Make generation idempotent.

Running it twice should not continuously duplicate files.

---

# Phase 9 — Sync

Implement:

```bash
npx ai-software-zoll sync
```

Compare:

```text
Local Blueprint
Remote Blueprint
Local AI Context
```

Show changes before applying them.

---

# Phase 10 — Organizations

Only after individual workflows are validated.

Add:

```text
Organizations
Teams
Shared Standards
Project Templates
Roles
```

---

# Phase 11 — Drift Detection

Build:

```bash
npx ai-software-zoll check
```

Compare expected architecture with actual repository state.

---

# 38. Coding-Agent Rules

The coding agent building Zoll must follow these rules.

## Rule 1

Do not implement future features before the current phase is complete.

## Rule 2

Do not create placeholder functionality disguised as completed functionality.

## Rule 3

Do not introduce dependencies without explaining why they are necessary.

## Rule 4

Prefer existing packages already present in the repository.

## Rule 5

All business logic belongs in appropriate modules.

## Rule 6

Keep the blueprint package independent from the web application.

## Rule 7

Keep the CLI independent from the dashboard UI.

## Rule 8

Never couple the canonical blueprint to a single AI coding agent.

## Rule 9

Never allow an LLM response to bypass schema validation.

## Rule 10

Existing-project generation must be non-destructive.

## Rule 11

Every new feature requires tests.

## Rule 12

Before implementing a feature, inspect the existing codebase and understand the current architecture.

---

# 39. Development Loop for the Coding Agent

For every task:

```text
1. Read requirements
2. Inspect repository
3. Identify affected packages
4. Design the smallest change
5. Implement
6. Add tests
7. Run type checking
8. Run linting
9. Run tests
10. Review generated output
11. Update documentation
```

Do not jump directly from requirement to implementation.

---

# 40. Definition of Done

A feature is not complete until:

```text
✓ Implementation complete
✓ Types pass
✓ Tests pass
✓ Lint passes
✓ Error handling exists
✓ Security considered
✓ Documentation updated
✓ Existing behavior preserved
```

---

# 41. MVP Definition

The MVP is complete when a developer can do this:

```bash
npx ai-software-zoll init
```

Answer:

```text
What are you building?
Architecture?
Stack?
Testing?
Agent?
```

Then Zoll generates:

```text
Project
├── README.md
├── PROJECT.md
├── ARCHITECTURE.md
├── AGENTS.md
├── docs/
├── skills/
└── agent-specific configuration
```

And the developer can immediately open the project with their preferred AI coding agent.

---

# 42. Second MVP Workflow

The second MVP capability is:

```bash
cd existing-project

npx ai-software-zoll analyze
```

Zoll detects:

```text
Framework
Database
Architecture
Testing
Modules
Conventions
```

Then generates:

```text
AGENTS.md
PROJECT.md
ARCHITECTURE.md
CONVENTIONS.md
skills/
agent-specific configuration
```

without modifying existing application code.

---

# 43. What NOT to Build Initially

Do not build:

* Autonomous coding agent
* AI chat interface
* Full enterprise governance
* Billing system
* Marketplace
* Plugin marketplace
* Dozens of agent integrations
* Dozens of frameworks
* Complex architecture designer
* Real-time collaboration
* Advanced drift detection
* Large-scale repository indexing
* Custom model training

These are possible future features.

---

# 44. First Practical Milestone

The coding agent should first make this possible:

```text
Input:

"Build a SaaS CRM with Next.js,
NestJS, PostgreSQL and Prisma using
Modular Architecture."
```

Output:

```text
Project Blueprint
        ↓
Generated Workspace
        ↓
Agent Context
        ↓
Ready for Claude/Cursor/Codex
```

If this works reliably, the foundation of the product works.

---

# 45. Product North Star

The product should eventually answer this question:

> **"How do I make any AI coding agent understand this software and work on it according to the project's architecture and engineering standards?"**

For a new project:

```text
Idea
 ↓
Blueprint
 ↓
AI-ready project
```

For an existing project:

```text
Repository
 ↓
Understanding
 ↓
Blueprint
 ↓
AI-ready project
```

For a company:

```text
Company standards
 ↓
Project standards
 ↓
Agent context
 ↓
Consistent AI-assisted development
```

---

# 46. Final Product Model

The long-term system should look like:

```text
                         AI SOFTWARE ZOLL
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
         NEW PROJECT                         EXISTING PROJECT
              │                                   │
              ▼                                   ▼
      Requirements → Blueprint            Repository → Analysis
              │                                   │
              └─────────────────┬─────────────────┘
                                ▼
                       CANONICAL BLUEPRINT
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
        Architecture         Skills           Standards
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                         AGENT ADAPTERS
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
             Claude           Cursor           Codex
                │               │               │
                └───────────────┼───────────────┘
                                ▼
                         Developer Workspace
                                │
                                ▼
                         AI Coding Agent
                                │
                                ▼
                            Software
```

---

# 47. The Core Differentiator

AI Software Zoll should never market itself as:

> "An AI that writes your code."

That puts it directly against coding agents.

Instead:

> **AI Software Zoll prepares, structures, and maintains the context that AI coding agents need to build software effectively.**

For individuals:

> **Turn your project idea or existing repository into an AI-ready software workspace.**

For companies:

> **Turn engineering standards into consistent, agent-ready project context.**

The coding agents remain the builders.

**Zoll prepares the environment in which they build.**

---

# 48. Immediate Development Order

The coding agent should execute the project in this order:

```text
01. Monorepo foundation
        ↓
02. Blueprint schema
        ↓
03. Blueprint validation
        ↓
04. Template engine
        ↓
05. Generated workspace
        ↓
06. First agent adapter
        ↓
07. Mock AI provider
        ↓
08. Real AI provider
        ↓
09. CLI
        ↓
10. New-project workflow
        ↓
11. Dashboard
        ↓
12. Existing-project analyzer
        ↓
13. Existing-project AI layer
        ↓
14. Additional agent adapters
        ↓
15. Blueprint versioning
        ↓
16. Sync
        ↓
17. Organization mode
        ↓
18. Drift detection
```

**Do not skip directly to the dashboard.**

The Blueprint Engine and Generator are the foundation of the entire product.

The dashboard should eventually be a beautiful interface over that foundation—not the foundation itself.
