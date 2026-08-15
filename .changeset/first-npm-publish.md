---
"ai-zoll": minor
---

`ai-zoll` is now installable via `npx ai-zoll init` / `analyze` / `sync` / `check` outside this monorepo. The 6 internal `@ai-zoll/*` packages are bundled into a single self-contained `dist/index.js` (tsup) rather than published separately, so there's nothing left for an end user to install beyond the real runtime dependencies (`zod`, `@inquirer/prompts`, `@anthropic-ai/sdk`).
