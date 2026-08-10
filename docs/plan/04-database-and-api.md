# 04 — Database Model & API Design

> Condensed from `docs/PRODUCT_SPEC.md` §31, 32. Read the spec for full detail.

## Database model

Start minimal (Rule 1 — don't prematurely create dozens of tables):

```
User
Project
ProjectBlueprint
BlueprintVersion
Agent
GeneratedArtifact
```

Later, once individual workflows are validated (Phase 10+):

```
Organization
OrganizationMember
OrganizationStandard
Repository
RepositoryAnalysis
DriftReport
```

Managed via Prisma (`prisma/schema.prisma`), PostgreSQL.

## API design

Resource-oriented, every request validated (against the Blueprint schema or the
relevant DTO):

```
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

`apps/api` (NestJS) owns these endpoints. The CLI (`apps/cli`) and web dashboard
(`apps/web`) both consume this same API — neither talks to the database directly
(Rule 7: keep the CLI independent from the dashboard UI, but both depend on the API,
not on each other).
