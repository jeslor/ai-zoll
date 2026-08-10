# @ai-software-zoll/blueprint

The canonical Project Blueprint: `schemas/` (Zod), `types/`, `validation/`. The single
source of truth every generator and agent adapter consumes. See
`docs/PRODUCT_SPEC.md` §4 and `docs/decisions/0002-blueprint-as-source-of-truth.md`.

**Status:** schema, types, and validation implemented. Not yet wired to an `AIProvider`
(mock or real) — see `docs/plan/03-roadmap.md` Phase 1 for what's left.

## What's here

- `src/schemas/` — one Zod schema per Blueprint section (`project`, `architecture`,
  `stack`, `feature`, `testing`, `security`, `agent`), composed in
  `blueprint.schema.ts` into `ProjectBlueprintSchema`.
- `src/types/` — TypeScript types inferred from the schemas (`z.infer`), not
  hand-maintained separately.
- `src/validation/` — `safeParseBlueprint()` (returns a typed result, never throws) and
  `parseBlueprint()` (throws `BlueprintValidationError` for fail-fast callers).
- `src/index.ts` — the package's public surface; import from here, not from internal
  paths.

## A deliberate asymmetry

`architecture.style` and `agent.primary` are closed Zod enums — the spec currently
enumerates a fixed set for both (§7's five architecture styles; the four adapters under
`packages/agents/src/`). `stack.frontend/backend/database/orm` and
`security.authentication/authorization` are open, validated non-empty strings, because
spec §6 explicitly requires the stack selection to stay extensible without a schema
change per new framework. See the comments in `stack.schema.ts` / `security.schema.ts`
for the reasoning, and don't "fix" this asymmetry without re-reading spec §6 first.

Before changing the schema, read `.claude/skills/extend-blueprint-schema/SKILL.md`.
