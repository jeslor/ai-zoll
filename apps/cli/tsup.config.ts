import { defineConfig } from "tsup";

// This package is what actually gets published to npm; the 6 sibling
// @ai-zoll/* packages never are (see packages/*/package.json, private:
// true). noExternal forces those into this single bundle so `npx ai-zoll`
// works standalone with no pnpm workspace behind it. Real npm dependencies
// are named explicitly in `external` rather than left to tsup's default
// package.json-sniffing, which only externalizes deps declared directly in
// this package's own package.json and silently vendors anything that's only
// a transitive dependency of a bundled @ai-zoll/* package (caught this
// happening to @anthropic-ai/sdk, which packages/ai depends on directly but
// apps/cli didn't). Each of these three must also be a real "dependencies"
// entry in package.json so npm installs them for the end user.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node24",
  platform: "node",
  noExternal: [/^@ai-zoll\//],
  external: ["zod", "@inquirer/prompts", "@anthropic-ai/sdk"],
  clean: true,
  sourcemap: true,
  dts: false,
  shims: false,
  splitting: false,
});
