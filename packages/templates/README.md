# @ai-zoll/templates

Raw templates (no business logic) consumed by `packages/generators` and
`packages/agents`. See `docs/PRODUCT_SPEC.md` §3.

**Status:** deliberately empty. `packages/generators` renders every template
inline (see its own README) rather than consuming files from here — no code
anywhere imports `@ai-zoll/templates`. Kept as a placeholder package rather
than deleted in case a future generator genuinely needs raw, non-inlined
template files (e.g. a binary/non-text asset), not because Phase 2 work is
outstanding.
