# @ai-software-zoll/api

NestJS REST API. See `docs/PRODUCT_SPEC.md` §32 and
`docs/plan/04-database-and-api.md` for the endpoint list and DB model.

**Status:** scaffolded with the first real vertical slice — Projects and Blueprint
persistence.

## Implemented endpoints

```
POST   /projects
GET    /projects
GET    /projects/:id

POST   /projects/:id/blueprint     (body: a full ProjectBlueprint JSON)
GET    /projects/:id/blueprint
```

`POST /projects/:id/blueprint` re-validates the request body server-side via
`safeParseBlueprint` from `@ai-software-zoll/blueprint` — the same canonical
validator every other part of the system uses (Rule 9/ADR 0002) — even though a
well-behaved caller (an `AIProvider`) already validated it locally. Every write
creates a new `BlueprintVersion` row (append-only history, per spec §26) and
upserts the `ProjectBlueprint` "current" row to match.

**Not yet implemented (future units):**
- `POST /projects/:id/generate`, `GET /projects/:id/generated-files` — needs the
  generation pipeline (`packages/generators`/`packages/agents`) wired in.
- `POST /analysis`, `GET /analysis/:id` — needs `packages/analyzer` (Phase 7).
- `POST /cli/auth`, `POST /cli/projects/:id/download` — needs a real auth strategy
  decision. `Project.userId` is nullable in the schema for exactly this reason —
  no endpoint currently requires a user identity.

## Local development

1. Set `DATABASE_URL` in `apps/api/.env` (copy `.env.example`) — any Postgres works,
   including a free Neon instance.
2. `pnpm install` (runs `prisma generate` automatically via `postinstall`).
3. `pnpm --filter @ai-software-zoll/api exec prisma migrate dev` — creates the
   tables (schema path comes from `apps/api/prisma.config.ts`).
4. `pnpm --filter @ai-software-zoll/api build && pnpm --filter @ai-software-zoll/api start`
   — or `pnpm --filter @ai-software-zoll/api dev` (tsc watch) + a separate `start` run.

Prisma 7 removed `datasource.url` from `schema.prisma` — the CLI reads the
connection string from `apps/api/prisma.config.ts`, and the running app constructs
its own `@prisma/adapter-pg` driver adapter directly from `process.env.DATABASE_URL`
(see `src/prisma/prisma.service.ts`). See `prisma/README.md` for why `prisma`/
`@prisma/client` are also listed in the repo root's `package.json`.

## Testing

- `src/__tests__/*.service.test.ts` — unit tests against a faked `PrismaService`.
- `src/__tests__/app.e2e.test.ts` — in-memory HTTP e2e (`@nestjs/testing` +
  `supertest`), still against a faked `PrismaService`. This is the first HTTP
  server in the repo, so verifying the actual routing/pipes/status-code contract
  is the thing worth testing at the integration level.

`pnpm test` runs fully offline — no real database required. A real Postgres
round-trip was verified manually against a live database as part of building this
slice (migrations + real HTTP requests); it isn't part of the automated suite.
