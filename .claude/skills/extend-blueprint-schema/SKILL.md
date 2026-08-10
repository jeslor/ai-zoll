---
name: extend-blueprint-schema
description: Use when adding, changing, or removing a field on the canonical Project Blueprint (packages/blueprint). Covers schema, types, versioning, and validation — the highest-blast-radius change in the codebase since everything flows through the Blueprint.
---

# Extending the Project Blueprint schema

## When to use this

Any change to the shape of `ProjectBlueprint` — a new field under `project`,
`architecture`, `stack`, `features`, `testing`, `security`, `agent`, or a new top-level
section.

## Why this is high-risk

Per `docs/decisions/0002-blueprint-as-source-of-truth.md`, every generator, every agent
adapter, the dashboard, and the CLI all consume the Blueprint. A careless change here
breaks all of them at once. Rule 9 also means AI-produced Blueprints must keep passing
validation — a schema change can silently make previously-valid AI output invalid.

## Steps

1. **Locate the schema.** It lives in `packages/blueprint/src/schemas/` (Zod) with
   matching TypeScript types in `packages/blueprint/src/types/` and validation logic in
   `packages/blueprint/src/validation/`.
2. **Decide: additive or breaking?**
   - Additive (new optional field with a sensible default) — usually safe within the
     current schema version.
   - Breaking (renaming, removing, changing a field's type/required-ness) — requires a
     `BlueprintVersion` bump and a migration path for existing stored Blueprints.
3. **Update the Zod schema first**, then let TypeScript types flow from it
   (`z.infer<...>`) rather than hand-maintaining a parallel type — avoids the two
   drifting apart.
4. **Update every consumer that pattern-matches on the changed shape**: generators in
   `packages/generators`, adapters in `packages/agents/*`, and any mock data in
   `packages/ai`'s mock provider.
5. **Update golden/snapshot fixtures** for any generator whose output depends on the
   changed field (see `docs/plan/06-testing-strategy.md`) — expect snapshot diffs, and
   verify each one is the *intended* consequence of your change, not a coincidental
   side effect.
6. **Update `docs/PRODUCT_SPEC.md`'s example is NOT edited** — that file is a verbatim
   historical spec (see its provenance note). Instead update the example Blueprint in
   `docs/plan/01-architecture.md` and `CLAUDE.md`'s architecture summary if they now
   look stale, and add an ADR under `docs/decisions/` if the change reflects a real
   design decision (not just a small additive field).

## Rules this touches

- **Rule 6**: the schema package (`packages/blueprint`) still must not import from
  `apps/web` or any specific agent adapter.
- **Rule 9**: never add a schema escape hatch (e.g. `z.any()` passthrough) to make an
  awkward AI response "just validate" — fix the AI prompt/repair step instead, in
  `packages/ai`.
- **Rule 11**: add/update unit tests in `packages/blueprint` covering both valid and
  now-invalid example payloads for the changed field.

## Checklist

- [ ] Zod schema updated, types derived from it (not duplicated)
- [ ] Version bumped if the change is breaking
- [ ] All consumers (generators, adapters, mock AI provider) updated
- [ ] Golden fixtures reviewed and intentionally updated
- [ ] Blueprint package unit tests updated
- [ ] ADR added if this reflects a real design decision
