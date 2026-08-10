# @ai-software-zoll/ai

`AIProvider` abstraction (`generateBlueprint`, `analyzeRepository`,
`generateProjectContext`). A mock provider must exist before any real provider is wired
in, so the rest of the system works without an external LLM. See
`docs/PRODUCT_SPEC.md` §33-34 and `docs/decisions/0004-deterministic-vs-ai-boundary.md`.

**Status:** not yet implemented (placeholder package). Mock provider is part of
Phase 1; real provider is Phase 4 — see `docs/plan/03-roadmap.md`.
