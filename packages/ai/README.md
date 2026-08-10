# @ai-software-zoll/ai

`AIProvider` abstraction (`generateBlueprint`, `analyzeRepository`,
`generateProjectContext`). See `docs/PRODUCT_SPEC.md` §33-34 and
`docs/decisions/0004-deterministic-vs-ai-boundary.md`.

**Status:** `AIProvider.generateBlueprint` implemented via `MockAIProvider` — a
deterministic, non-AI implementation that assembles a `BlueprintInput` into a
validated `ProjectBlueprint` (stamping the current version and running it through
`@ai-software-zoll/blueprint`'s `safeParseBlueprint`). This proves the
`Project → Blueprint` pipeline works with zero external LLM dependency, per Phase 1.

## What's here

- `src/provider.ts` — the `AIProvider` interface and `BlueprintInput` type.
  **Only `generateBlueprint` is declared for now.** The full spec §33 interface also
  has `analyzeRepository` (Phase 7) and `generateProjectContext` (Phase 8) — those
  aren't declared yet because their input/output types (`RepositoryProfile`,
  `RepositoryAnalysis`, `ProjectContext`) don't have a real shape until
  `packages/analyzer` exists. Add them to this interface when their phase starts —
  see the doc-comment on `AIProvider` in `provider.ts`.
- `src/providers/mock-ai-provider.ts` — `MockAIProvider`, the Phase 1 implementation.
- `src/index.ts` — the package's public surface.

A real, LLM-backed provider (Phase 4) will implement the same `AIProvider` interface
and reuse the same validate-or-throw pattern `MockAIProvider` already establishes
(Rule 9: never let an AI response bypass schema validation).
