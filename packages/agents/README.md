# @ai-zoll/agents

`AgentAdapter` implementations, one subdirectory per agent: `claude/`, `cursor/`,
`codex/`, `copilot/`, `cline/`, `zed/`. See `docs/PRODUCT_SPEC.md` §21 and
`docs/decisions/0003-agent-adapter-pattern.md`.

**Status:** all six adapters implemented and tested — see `docs/plan/03-roadmap.md`
Phase 3. `cline`/`zed` were the two candidates from `docs/decisions/
0003-agent-adapter-pattern.md`'s "Future adapter candidates" research; no further
candidates are currently tracked.
