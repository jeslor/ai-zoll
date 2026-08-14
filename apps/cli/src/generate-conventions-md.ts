import type { RepositoryInsights } from "@ai-zoll/ai";

/**
 * Renders AI-derived repository insights (spec §16) into CONVENTIONS.md.
 * Deliberately NOT part of `packages/generators` — that package's contract
 * (ADR 0004) is "pure, deterministic function of a Blueprint, always
 * golden-testable"; this function's output depends on an LLM response that
 * can vary between runs against the identical Blueprint, which would break
 * that guarantee if mixed into the same package. Lives in `apps/cli`
 * instead, next to the other AI-provider orchestration (see
 * `commands/analyze.ts`, which computes the same `RepositoryInsights` this
 * consumes for its own console report — one AI call serves both).
 *
 * Only ever called from `analyze --ai` (adopting an existing project) —
 * `init` has no existing repository to derive conventions from, and `sync`
 * is deliberately AI-free, so neither can produce or refresh this content.
 *
 * Returns `null` (not an empty file) when every relevant insight category
 * came back empty — nothing worth writing is a valid, honest outcome, not
 * a fallback to placeholder text.
 */
export function generateConventionsMd(insights: RepositoryInsights): string | null {
  const sections: Array<[heading: string, items: string[]]> = [
    ["Conventions", insights.conventions],
    ["Undocumented conventions", insights.undocumentedConventions],
    ["Inconsistencies to be aware of", insights.inconsistencies],
    ["Architectural patterns", insights.architecturalPatterns],
    ["Testing patterns", insights.testingPatterns],
    ["Security patterns", insights.securityPatterns],
  ];

  const nonEmpty = sections.filter(([, items]) => items.length > 0);
  if (nonEmpty.length === 0) {
    return null;
  }

  const body = nonEmpty
    .map(([heading, items]) => `## ${heading}\n\n${items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");

  return [
    "# Conventions",
    "",
    "AI-derived observations about this project's conventions, from a one-time analysis",
    "at adoption time. Treat these as a starting point to verify, not ground truth — they",
    "are not re-checked or kept in sync with the codebase (`ai-zoll sync` never touches",
    "this file's managed content, since it runs fully offline, without AI).",
    "",
    body,
    "",
  ].join("\n");
}
