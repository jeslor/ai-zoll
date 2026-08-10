import type { ProjectBlueprint } from "@ai-software-zoll/blueprint";

/**
 * The structured input a Blueprint is generated from — the same fields a
 * dashboard/CLI wizard collects (spec §5-9: project info, architecture
 * choice, stack choices, testing/security/agent choices). `version` is
 * excluded because it's owned by the provider/schema, not a user choice.
 */
export type BlueprintInput = Omit<ProjectBlueprint, "version">;

/**
 * AIProvider abstraction (spec §33). Only `generateBlueprint` is declared
 * here — Phase 1's scope. The full spec interface also has:
 *
 *   analyzeRepository(profile: RepositoryProfile): Promise<RepositoryAnalysis>   (Phase 7)
 *   generateProjectContext(blueprint: ProjectBlueprint): Promise<ProjectContext> (Phase 8)
 *
 * Those aren't declared yet because RepositoryProfile/RepositoryAnalysis/
 * ProjectContext have no real shape until packages/analyzer exists (Rule 1 —
 * don't implement/design for future phases early). Add them to this
 * interface when their respective phase starts.
 */
export interface AIProvider {
  generateBlueprint(input: BlueprintInput): Promise<ProjectBlueprint>;
}
