---
name: add-repo-analyzer
description: Use when adding a new deterministic repository analyzer (e.g. FrameworkAnalyzer, DatabaseAnalyzer, TestAnalyzer) under packages/analyzer for the existing-project workflow. Covers the confidence-scoring convention and secret-exclusion requirement.
---

# Adding a repository analyzer

## When to use this

Adding a new deterministic analyzer under `packages/analyzer` for the existing-project
flow (spec §13-17, Phase 7) — e.g. a new `PackageAnalyzer`, `FrameworkAnalyzer`,
`DatabaseAnalyzer`, `DirectoryAnalyzer`, `TestAnalyzer`, `GitAnalyzer`,
`ConfigurationAnalyzer`, `DependencyAnalyzer`, or similar.

## Ground rules

1. **Deterministic only.** Analyzers are plain code inspecting files (`package.json`,
   lockfiles, `tsconfig.json`, `Dockerfile`, directory structure, etc.) — never an AI
   call. AI interpretation happens in a later stage, on top of the *combined* output of
   all analyzers (see `docs/decisions/0004-deterministic-vs-ai-boundary.md`).
2. **Never pretend certainty.** Every finding carries a confidence level:
   `Detected` (certain), `Likely` (inferred), or `Unknown` (not enough signal). Don't
   default to `Detected` just because a heuristic matched once.
3. **Respect the exclusion system.** Before an analyzer reads file *contents* (not just
   names), check it against the secret-exclusion rules in
   `docs/plan/05-security-and-privacy.md` — `.env*`, `*.pem`, `*.key`, `id_rsa`,
   `credentials.json`, etc. Analyzers should generally only need filenames, config
   shape, and non-secret file contents (`package.json` fields, `tsconfig.json`, test
   file counts) — if an analyzer seems to need secret file contents, that's a design
   smell, stop and reconsider.
4. **Structured output only.** Return typed findings, e.g.:
   ```json
   { "framework": { "name": "nestjs", "confidence": 0.99 } }
   ```
   Don't return prose — prose synthesis is the AI-interpretation stage's job, not the
   analyzer's.

## Steps

1. Add `packages/analyzer/src/<name>Analyzer.ts` with a pure function:
   `(repoPath: string) => AnalyzerFinding` (or async if it needs to read files).
2. Register it wherever the full analyzer set is run (don't hardcode a subset if the
   orchestrator is supposed to run "all analyzers").
3. Add unit tests using small fixture repositories/fixtures (a temp dir with a
   representative `package.json` etc.) — not the real project's own repo, so tests stay
   independent of this codebase's own stack choices.
4. Add a case where the analyzer should report `Unknown` or `Likely` rather than
   `Detected`, to prove the confidence logic isn't hardcoded to always succeed.

## Checklist

- [ ] Analyzer is pure/deterministic, no AI/network calls
- [ ] Confidence levels used correctly (Detected/Likely/Unknown)
- [ ] Does not read excluded/secret file contents
- [ ] Structured (typed) output, not prose
- [ ] Unit tests include a non-`Detected` case
- [ ] Registered in the analyzer orchestrator
