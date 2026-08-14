# @ai-zoll/ai

`AIProvider` abstraction (`generateBlueprint`, `interpretRepository`). See
`docs/PRODUCT_SPEC.md` §33-34/§16 and
`docs/decisions/0004-deterministic-vs-ai-boundary.md`.

**Status:** both `AIProvider` methods have two implementations:

- `MockAIProvider` — deterministic, non-AI. `generateBlueprint` assembles a
  `BlueprintInput` into a validated `ProjectBlueprint` (stamps the current version,
  runs it through `safeParseBlueprint`) with zero external LLM dependency.
  `interpretRepository` returns all-empty insights (real, tested — exists for
  interface conformance; the CLI never actually calls it, since insights are only
  requested when `--ai` selected the real provider in the first place). Used as the
  CLI's no-credentials default (see `apps/cli/src/select-ai-provider.ts`).
- `ClaudeAIProvider` — real, LLM-backed (Phase 4/7). Uses the official
  `@anthropic-ai/sdk` and Claude's Structured Outputs (`messages.parse()` +
  `output_config.format`) for both methods: `generateBlueprint` interprets the
  user's project description into a coherent `features` list; `interpretRepository`
  (Phase 7's spec §16 layer) takes an already-computed `RepositoryAnalysis` and
  returns business domains/modules/conventions/inconsistencies/etc. Every
  `generateBlueprint` candidate is validated via the exact same `safeParseBlueprint`
  pipeline `MockAIProvider` uses — Claude's wire-level schema conformance is not
  treated as sufficient (Rule 9). `interpretRepository` is validated via
  `RepositoryInsightsSchema.safeParse` for the same reason, though with lower
  stakes (see below).

## What's here

- `src/provider.ts` — the `AIProvider` interface, `BlueprintInput` type.
  `generateProjectContext(blueprint): Promise<ProjectContext>` (spec §33's other
  Phase 8 item) still isn't declared — `ProjectContext` has no real shape yet
  (Rule 1). Add it when that work starts.
- `src/insights.ts` — `RepositoryInsightsSchema`/`RepositoryInsights`,
  `interpretRepository`'s output shape: spec §16's ten categories, each a flat,
  independently-empty-allowed string array.
- `src/providers/mock-ai-provider.ts` — `MockAIProvider`, the Phase 1/7 implementation.
- `src/providers/claude-ai-provider.ts` — `ClaudeAIProvider`, the Phase 4/7 implementation.
- `src/prompts/blueprint-prompt.ts` — `generateBlueprint`'s system/user/repair prompt
  text and Structured Outputs schema (`ProjectBlueprintSchema.omit({ version: true })`,
  reused from `@ai-zoll/blueprint` rather than hand-duplicated).
- `src/prompts/insights-prompt.ts` — `interpretRepository`'s system/user prompt text
  and Structured Outputs schema (`RepositoryInsightsSchema`).
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

### `interpretRepository` (spec §16)

Sits after `packages/analyzer`'s deterministic `analyzeRepository()`, not instead of
it — the model only ever receives the already-computed, compact `RepositoryAnalysis`
(never raw repository files, per ADR 0004/spec §34 cost control). Reuses
`ClaudeAIProvider`'s `request()` helper (generalized to accept a system prompt +
output format per call, shared with `generateBlueprint`), but differs from it in two
ways: **single attempt, no repair round**, and **purely informational** — nothing
here is persisted into a Blueprint or used to generate a file (spec §16: "The AI
should not automatically modify source code during this stage"), so there's no
correctness requirement forcing a retry the way persisting an invalid Blueprint
would. A validation failure or thrown error is caught by the caller
(`apps/cli/src/commands/analyze.ts`) and degrades to a one-line notice rather than
failing the whole `analyze` command.

### Testing

`src/__tests__/claude-ai-provider.test.ts` runs fully offline — the Anthropic client
is injected via the constructor (`new ClaudeAIProvider({ client })`), and tests pass a
minimal fake (`{ messages: { parse: vi.fn() } }`) instead of a real SDK instance. No
network calls, no `ANTHROPIC_API_KEY` required to run `pnpm test`.
