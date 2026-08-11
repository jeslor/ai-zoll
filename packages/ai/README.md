# @ai-software-zoll/ai

`AIProvider` abstraction (`generateBlueprint`, `analyzeRepository`,
`generateProjectContext`). See `docs/PRODUCT_SPEC.md` §33-34 and
`docs/decisions/0004-deterministic-vs-ai-boundary.md`.

**Status:** `AIProvider.generateBlueprint` has two implementations:

- `MockAIProvider` — deterministic, non-AI. Assembles a `BlueprintInput` into a
  validated `ProjectBlueprint` (stamps the current version, runs it through
  `safeParseBlueprint`) with zero external LLM dependency. Used as the CLI's
  no-credentials fallback (see `apps/cli/src/select-ai-provider.ts`).
- `ClaudeAIProvider` — real, LLM-backed (Phase 4). Uses the official
  `@anthropic-ai/sdk` and Claude's Structured Outputs (`messages.parse()` +
  `output_config.format`) to interpret the user's project description and
  produce a coherent `features` list. Every candidate is still validated via
  the exact same `safeParseBlueprint` pipeline `MockAIProvider` uses — Claude's
  wire-level schema conformance is not treated as sufficient (Rule 9).

## What's here

- `src/provider.ts` — the `AIProvider` interface and `BlueprintInput` type.
  **Only `generateBlueprint` is declared for now.** The full spec §33 interface also
  has `analyzeRepository` (Phase 7) and `generateProjectContext` (Phase 8) — those
  aren't declared yet because their input/output types (`RepositoryProfile`,
  `RepositoryAnalysis`, `ProjectContext`) don't have a real shape until
  `packages/analyzer` exists. Add them to this interface when their phase starts —
  see the doc-comment on `AIProvider` in `provider.ts`.
- `src/providers/mock-ai-provider.ts` — `MockAIProvider`, the Phase 1 implementation.
- `src/providers/claude-ai-provider.ts` — `ClaudeAIProvider`, the Phase 4 implementation.
- `src/prompts/blueprint-prompt.ts` — system/user/repair prompt text and the
  Structured Outputs schema (`ProjectBlueprintSchema.omit({ version: true })`, reused
  from `@ai-software-zoll/blueprint` rather than hand-duplicated).
- `src/index.ts` — the package's public surface.

## `ClaudeAIProvider`

### The AI/deterministic boundary (ADR 0004)

The CLI wizard already collects every structural field as an explicit user
selection (`architecture.style`, `stack.*`, `testing.*`, `security.*`,
`agent.primary`, `project.name`/`type`). `ClaudeAIProvider` only lets the model
do real interpretive work on two things:

- `features` — filled in / organized / expanded from the project description.
- `project.description` — light polish only (grammar/clarity, same meaning).

This is enforced in **code**, not just prompted for: `ClaudeAIProvider.mergeCandidate`
takes the model's output for those two fields and the user's original input for
everything else, before validation ever runs. A model response can't silently
override an explicit user choice.

### Retry / repair

Per spec Phase 4 ("if validation fails, retry or repair"): if the merged candidate
fails `safeParseBlueprint`, `ClaudeAIProvider` sends one repair request containing
the invalid candidate and the exact validation issues, then validates again. If that
still fails, it throws `BlueprintValidationError` with the latest issues — same shape
`MockAIProvider` throws. Two Claude calls maximum per `generateBlueprint()` call.

### Model / cost defaults

`claude-opus-4-8`, `thinking: {type: "adaptive"}`, `output_config.effort: "medium"`
(deliberately below the `high` default — spec §34 "AI Cost Control": this is a small
structured-extraction-plus-light-reasoning task, not a long-horizon agentic one),
`max_tokens: 4096`, non-streaming. Override the model via the constructor:
`new ClaudeAIProvider({ model: "claude-sonnet-5" })`.

### Credentials

No API-key handling code exists in this package on purpose. `new Anthropic()`
(the SDK's zero-arg constructor) already resolves `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, or an `ant auth login` profile on its own. Set
`ANTHROPIC_API_KEY` in your shell environment before running the CLI with the real
provider; without it, `apps/cli` falls back to `MockAIProvider`.

### Testing

`src/__tests__/claude-ai-provider.test.ts` runs fully offline — the Anthropic client
is injected via the constructor (`new ClaudeAIProvider({ client })`), and tests pass a
minimal fake (`{ messages: { parse: vi.fn() } }`) instead of a real SDK instance. No
network calls, no `ANTHROPIC_API_KEY` required to run `pnpm test`.
