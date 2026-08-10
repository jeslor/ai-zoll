---
name: add-deterministic-generator
description: Use when adding a new generated file or template to packages/generators / packages/templates (e.g. a new doc file, a new skills/ entry format, a new workflow file). Covers the golden-test convention that keeps generation deterministic.
---

# Adding a deterministic generator or template

## When to use this

Adding a new kind of file to the generated workspace output (spec §11) — e.g. a new
top-level doc, a new category of generated skill, a new workflow file — via
`packages/generators` and `packages/templates`.

## Ground rule

Generation must be deterministic: the same `ProjectBlueprint` must always produce
byte-identical output. If you find yourself wanting to call an `AIProvider` from inside
a generator, stop — that decision belongs in `docs/decisions/0004-deterministic-vs-ai-boundary.md`'s
boundary, and it means the *Blueprint* is missing information the generator needs,
not that the generator should call an LLM to fill the gap.

## Steps

1. Add the raw template under `packages/templates/src/` (plain template, no business
   logic in the template itself — keep templating logic in the generator).
2. Add or extend the generator under `packages/generators/src/<project|documentation|agent>/`
   depending on what kind of output it is.
3. The generator function takes a validated `ProjectBlueprint` and returns
   `GeneratedFile[]` (path + content) — it does not write to disk itself; writing is
   the workspace-generation orchestrator's job, kept separate so generators stay
   unit-testable in isolation.
4. Write a **golden test**: pick 1-2 representative Blueprint fixtures, generate
   output, and snapshot it. Check in the snapshot. Any future change to this generator
   that alters the snapshot must be a deliberate, reviewed diff — never blindly
   regenerate snapshots to make a test pass.
5. If this generator produces something agent-facing (vs. plain project docs), check
   whether it actually belongs in an `AgentAdapter` instead (see
   `add-agent-adapter/SKILL.md`) — generic docs go through `packages/generators`,
   agent-specific instructions/rules go through `packages/agents/*`.

## Rules this touches

- **Rule 2**: don't add a generator that produces a stub/TODO file and call it done —
  if the content can't be meaningfully generated yet, don't add the generator yet.
- **Rule 11**: golden tests are the test requirement here, not optional extra coverage.

## Checklist

- [ ] Template added under `packages/templates`
- [ ] Generator added/extended under `packages/generators`, pure function
      (Blueprint → GeneratedFile[])
- [ ] Golden/snapshot test added with at least one minimal and one full-featured
      Blueprint fixture
- [ ] Confirmed this isn't actually agent-specific output that belongs in an adapter
- [ ] Typecheck, lint, test all pass
