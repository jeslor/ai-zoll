import { z } from "zod";

/**
 * Structured output shape for spec §16's "AI-Assisted Repository
 * Understanding" — the ten categories named there, verbatim. Each is a
 * flat list of short, specific observations, not free-form prose: keeps
 * the shape simple enough to render directly (see
 * apps/cli/src/commands/analyze.ts) without inventing a second markup
 * layer. An empty array is a valid, honest answer for any category with
 * nothing to report — never padded to look more thorough than the
 * evidence supports (same "never pretend certainty" spirit as
 * packages/analyzer's Confidence tiers, applied to prose instead of
 * enums).
 */
export const RepositoryInsightsSchema = z.object({
  businessDomains: z.array(z.string()),
  modules: z.array(z.string()),
  architecturalPatterns: z.array(z.string()),
  conventions: z.array(z.string()),
  importantDependencies: z.array(z.string()),
  testingPatterns: z.array(z.string()),
  securityPatterns: z.array(z.string()),
  undocumentedConventions: z.array(z.string()),
  inconsistencies: z.array(z.string()),
  missingDocumentation: z.array(z.string()),
});

export type RepositoryInsights = z.infer<typeof RepositoryInsightsSchema>;
