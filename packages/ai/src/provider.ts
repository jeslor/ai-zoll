import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { RepositoryAnalysis } from "@ai-zoll/analyzer";
import type { RepositoryInsights } from "./insights";

/**
 * The structured input a Blueprint is generated from — the same fields a
 * dashboard/CLI wizard collects (spec §5-9: project info, architecture
 * choice, stack choices, testing/security/agent choices). `version` is
 * excluded because it's owned by the provider/schema, not a user choice.
 */
export type BlueprintInput = Omit<ProjectBlueprint, "version">;

/**
 * AIProvider abstraction (spec §33).
 *
 * `generateBlueprint` is Phase 1's scope. `interpretRepository` is Phase
 * 7/8's "AI-Assisted Repository Understanding" (spec §16): takes the
 * already-computed, deterministic `RepositoryAnalysis` (never raw repo
 * files — cost control, spec §34) and returns AI-derived observations. It
 * is purely informational — the caller (`ai-zoll analyze --ai`) only ever
 * prints it; nothing here is persisted into the Blueprint or used to
 * generate files (spec §16: "The AI should not automatically modify source
 * code during this stage").
 *
 * `generateProjectContext(blueprint): Promise<ProjectContext>` (Phase 8's
 * other item, spec §33) still isn't declared — `ProjectContext` has no real
 * shape yet (Rule 1). Add it when that work starts.
 */
export interface AIProvider {
  generateBlueprint(input: BlueprintInput): Promise<ProjectBlueprint>;
  interpretRepository(analysis: RepositoryAnalysis): Promise<RepositoryInsights>;
}
