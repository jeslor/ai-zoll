# @ai-software-zoll/blueprint

The canonical Project Blueprint: `schemas/` (Zod), `types/`, `validation/`. The single
source of truth every generator and agent adapter consumes. See
`docs/PRODUCT_SPEC.md` §4 and `docs/decisions/0002-blueprint-as-source-of-truth.md`.

**Status:** not yet implemented (placeholder package). This is the true starting point
for real implementation — see `docs/plan/03-roadmap.md` Phase 1. Must stay independent
of `apps/web` (Rule 6) and of any specific agent (Rule 8).

Before changing the schema, read `.claude/skills/extend-blueprint-schema/SKILL.md`.
