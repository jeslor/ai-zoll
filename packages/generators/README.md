# @ai-zoll/generators

Deterministic template engine: `project/`, `documentation/`, `agent/` generators
turning a validated `ProjectBlueprint` into `GeneratedFile[]` (README, PROJECT.md,
ARCHITECTURE.md, AGENTS.md, docs/, skills/, workflows/). See `docs/PRODUCT_SPEC.md`
§11 and `docs/plan/03-roadmap.md` Phase 2.

**Status:** implemented and golden-tested — core, used by every `ai-zoll init`/
`analyze`/`sync` run. `generate-workspace.ts` is the orchestrator, composing the
`project/` (README.md, PROJECT.md), `documentation/` (ARCHITECTURE.md, docs/),
`agent/` (AGENTS.md), `skills/`, and `workflows/` generators into the full
`GeneratedFile[]` output. Every generator is a pure function of a validated
`ProjectBlueprint` — no I/O, no AI calls, no randomness — per
`docs/decisions/0004-deterministic-vs-ai-boundary.md`, and is golden-tested
against the fixtures in `src/__fixtures__/`. See
`docs/plan/06-testing-strategy.md` and
`.claude/skills/add-deterministic-generator/SKILL.md` before adding another
generator.
