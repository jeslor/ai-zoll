# ADR 0004 — Deterministic-by-Default, AI Only Where Judgment Is Required

## Status

Accepted (mandated by `docs/PRODUCT_SPEC.md` §2 Principle 4, §34).

## Context

It would be possible to implement most of Zoll's file generation, repository
inspection, and even validation by asking an LLM to "just do it." This would be slower,
non-reproducible (the same Blueprint could generate different files on different runs),
expensive at scale, and harder to test (no golden/snapshot testing is possible against
non-deterministic output).

## Decision

Draw a hard boundary:

- **Always deterministic (plain code, no LLM call):** directory detection, config
  parsing, package/dependency detection, file generation, template rendering, schema
  validation. Lives in `packages/analyzer` and `packages/generators`.
- **AI-assisted (LLM call via `packages/ai`'s `AIProvider`):** interpreting free-text
  requirements, architecture reasoning, identifying conventions/business domains in an
  existing repo, generating project-specific prose context, flagging ambiguities.

Cost-control consequences (spec §34):
- Never send a full repository to an LLM when a structured, deterministic repository
  *profile* is sufficient.
- Cache reusable AI results.
- A mock `AIProvider` (Phase 1) must be sufficient to exercise the entire deterministic
  pipeline end-to-end without any real external LLM — this is what makes Phases 1-3
  buildable and testable before Phase 4 (real AI provider) exists.

## Consequences

- `packages/generators`' output must be testable with golden/snapshot tests (see
  `docs/plan/06-testing-strategy.md`) — if a generator's output isn't reproducible from
  a given Blueprint, it has drifted from this ADR.
- Any new feature proposal should be checked against this list before deciding whether
  it needs an `AIProvider` call at all.

## Alternatives considered

- **LLM-generates-everything** — rejected: contradicts Principle 1 and Principle 4
  directly, and makes golden testing (§36) impossible.
