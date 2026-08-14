import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { RepositoryAnalysis } from "@ai-zoll/analyzer";
import { RepositoryInsightsSchema } from "../insights";

export const INSIGHTS_OUTPUT_FORMAT = zodOutputFormat(RepositoryInsightsSchema);

/**
 * Establishes the ADR 0004 boundary for this call specifically: the model
 * sees only the already-computed, compact deterministic analysis (never raw
 * repository files — spec §34 cost control), and its job is interpretation,
 * not modification. Spec §16: "The AI should not automatically modify
 * source code during this stage. Analysis comes first."
 */
export function buildInsightsSystemPrompt(): string {
  return [
    "You are the AI-assisted repository-understanding layer for AI Zoll.",
    "You are given a compact, deterministic analysis of a repository (never its raw source files) and must identify what it reveals about the project.",
    "",
    "For each category in the schema, return short, specific observations grounded only in the given analysis — do not invent facts the analysis doesn't support. An empty array is a valid, honest answer for a category with nothing to report; do not pad it to look more thorough than the evidence supports.",
    "Do not propose or describe any source-code change. This step is analysis only, not modification.",
  ].join("\n");
}

export function buildInsightsUserPrompt(analysis: RepositoryAnalysis): string {
  return [
    "Here is the deterministic analysis of this repository:",
    "",
    JSON.stringify(analysis, null, 2),
    "",
    "Identify, for this repository: business domains, modules, architectural patterns, conventions, important dependencies, testing patterns, security patterns, undocumented conventions, inconsistencies, and missing documentation.",
  ].join("\n");
}
