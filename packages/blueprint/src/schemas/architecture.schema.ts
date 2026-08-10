import { z } from "zod";

/**
 * Fixed set per spec §7 — the architecture styles Zoll currently knows how to
 * explain/recommend. Adding a new style is a deliberate schema change, not a
 * free-form choice (unlike stack.* — see stack.schema.ts).
 */
export const ArchitectureStyleSchema = z.enum([
  "modular",
  "layered",
  "clean-architecture",
  "hexagonal",
  "domain-driven-design",
]);

export const ArchitectureSchema = z.object({
  style: ArchitectureStyleSchema,
});
