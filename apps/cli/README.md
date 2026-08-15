# ai-zoll

A CLI that prepares software projects for AI-assisted development. It generates the
**Project Blueprint** and the AI-context layer (`README.md`, `PROJECT.md`,
`ARCHITECTURE.md`, `docs/`, `skills/`, and agent-specific files like `AGENTS.md` or
`.cursor/rules/`) that tools like Claude Code, Cursor, Codex, and GitHub Copilot need
to work effectively on a project — for both brand-new projects and existing
repositories, and keeps that context in sync as the project or chosen agent changes.

Everything runs locally. No server, no database, no account. AI is never required:
a deterministic mode is the default for every command; a real, Claude-backed
`--ai` mode is a strict, explicit opt-in.

## Usage

```
npx ai-zoll init [--ai]
npx ai-zoll analyze [--ai]
npx ai-zoll sync [agent]
npx ai-zoll check
```

- **`init`** — starts a new project. Walks you through a few questions about what
  you're building, then generates the Blueprint and the full AI-context workspace.
  Pass `--ai` to have Claude interpret your answers instead of using the
  deterministic default.
- **`analyze`** — prepares an *existing* repository. Deterministically detects your
  stack (framework, database, ORM, test setup, directory conventions, and more,
  across 7 languages) and generates the same AI-context workspace from what it
  finds. Never modifies your application source. Pass `--ai` for a deeper,
  LLM-assisted read of your codebase's conventions, written to `CONVENTIONS.md`.
- **`sync`** — regenerates the AI-context workspace for a different agent (or after
  the Blueprint changes), preserving any hand-written notes you've added. Always
  deterministic — never calls an LLM.
- **`check`** — reports drift between your Blueprint and the current state of the
  repository (new directory conventions, import-boundary violations for layered
  architectures, and more).

Using `--ai` requires an `ANTHROPIC_API_KEY` environment variable. Without it (or
without the flag), every command still works end-to-end using the deterministic
provider.

## Learn more

Full source and documentation: <https://github.com/jeslor/ai-zoll>
