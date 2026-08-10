---
name: phase-dev-loop
description: Use before starting any implementation task in this repo, and again before calling it done. Encodes the mandatory development loop (spec §39) and Definition of Done (spec §40) as a checklist, and checks the task against the current roadmap phase.
---

# Phase-aware development loop

## Use this at the start of a task

1. **Read requirements** — re-read the relevant section(s) of `docs/PRODUCT_SPEC.md`
   and cross-check `docs/plan/03-roadmap.md` for current phase status. If this task
   belongs to a phase later than the current "in progress" phase, stop and flag it —
   don't start future-phase work early (Rule 1).
2. **Inspect the repository** — read the actual current state of the affected
   package(s) before writing anything (Rule 12). Don't assume the skeleton described in
   `docs/plan/01-architecture.md` is exactly what exists on disk; verify.
3. **Identify affected packages** — list which of `apps/*` / `packages/*` this touches.
   If it's more than expected, check whether a boundary rule (Rule 6, Rule 7, Rule 8) is
   being crossed and whether that's actually necessary.
4. **Design the smallest change** — no speculative abstractions, no unused
   configuration surface for hypothetical future agents/frameworks.
5. **Implement.**
6. **Add tests** (Rule 11) — unit tests at minimum; golden tests if touching a
   generator; integration/e2e if touching a cross-package seam (see
   `docs/plan/06-testing-strategy.md`).
7. **Typecheck.**
8. **Lint.**
9. **Test.**
10. **Review the actual generated output**, not just "tests pass" — for generator/
    adapter work, look at the real files produced for a representative Blueprint.
11. **Update documentation** — `docs/plan/03-roadmap.md` phase checkboxes if this
    finishes or starts a roadmap item, plus any doc whose content is now stale.

## Definition of Done — check before calling a task finished

- [ ] Implementation complete — no placeholder/stub logic presented as finished
      (Rule 2)
- [ ] Types pass
- [ ] Tests pass
- [ ] Lint passes
- [ ] Error handling exists for cases that can actually occur (not defensive code for
      impossible inputs)
- [ ] Security considered — check `docs/plan/05-security-and-privacy.md` if the task
      touches repository analysis, file transmission, or secrets
- [ ] Documentation updated
- [ ] Existing behavior preserved — for existing-project features, explicitly verify no
      application source file was modified (Rule 10)

## Note on commits

Per repository convention, only the user runs `git commit`. After finishing a feature
or milestone, summarize the change and hand back a ready-to-use commit message — do not
run `git add`/`git commit` yourself.
