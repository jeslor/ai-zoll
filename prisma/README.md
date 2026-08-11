# prisma

Database schema for `apps/api`'s PostgreSQL store. See
`docs/plan/04-database-and-api.md` for the initial data model
(`User`, `Project`, `ProjectBlueprint`, `BlueprintVersion`, `Agent`,
`GeneratedArtifact`).

**Status:** `schema.prisma` implemented with all 6 minimal-model tables. Uses
`DATABASE_URL` from `apps/api/.env` (a Postgres connection string — Neon or any
other Postgres works). Run migrations from `apps/api` (schema path comes from
`apps/api/prisma.config.ts`, no `--schema` flag needed):

```sh
pnpm --filter @ai-zoll/api exec prisma migrate dev
```

The Prisma Client generates into `apps/api/generated/prisma` (not
`node_modules/@prisma/client`) — see the `generator client { output = ... }` block
in `schema.prisma`. This is a monorepo workaround: `schema.prisma` lives at the repo
root, but only `apps/api` declares `prisma`/`@prisma/client` as dependencies, and
pnpm's strict workspace isolation means neither package is resolvable by walking up
node_modules from here. The root `package.json` also lists both as `devDependencies`
for the same reason — the Prisma CLI itself resolves `prisma`/`@prisma/client`
starting from `schema.prisma`'s own directory (this one), not from the invoking
package's directory, so they need to be reachable from here too, not just from
`apps/api`.

`Organization`/`Repository`/`DriftReport` and the rest of the Phase 10+ tables are
intentionally not here yet (spec §31: "do not prematurely create dozens of tables").
