import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import type { GeneratedFile } from "@ai-zoll/shared";
import { renderAgentInstructions } from "@ai-zoll/generators";
import type { AgentAdapter, ValidationResult } from "../agent-adapter";

/**
 * Zed discovers a single project-root `.rules` file. Zed also recognizes
 * `.cursorrules`/`CLAUDE.md` as compatibility fallbacks (first match wins),
 * but a project whose chosen agent is Zed should get an intentional,
 * first-class `.rules` file, not rely on an accidental fallback match from
 * whatever other agent files happen to exist. Source: researched in
 * `docs/decisions/0003-agent-adapter-pattern.md`'s "Future adapter
 * candidates" section before this adapter was built.
 */
export class ZedAdapter implements AgentAdapter {
  readonly id = "zed";

  generateInstructions(blueprint: ProjectBlueprint): GeneratedFile[] {
    return [
      {
        path: ".rules",
        content: renderAgentInstructions(blueprint, "Zed Instructions"),
      },
    ];
  }

  /**
   * Zed has no separate skill/contextual-rules mechanism the way Claude's
   * `.claude/skills/`, Cursor's globbed `.mdc` files, Copilot's `applyTo`
   * instructions, or Cline's `.clinerules/` directory do — the one
   * recognized file above already carries testing/security/stack
   * directives via `renderAgentInstructions`' shared body content.
   * Returning a second file at an invented path Zed wouldn't actually read
   * would violate this project's "research real conventions, never invent
   * one" discipline every other adapter follows.
   */
  generateSkills(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  generateRules(_blueprint: ProjectBlueprint): GeneratedFile[] {
    return [];
  }

  /**
   * No per-skill coverage to check — `generateSkills` deliberately never
   * attempts per-skill files (see there), so `validateSkillCoverage`'s
   * "does every triggered skill have a mapping" premise doesn't apply to
   * this adapter at all. Always valid.
   */
  validate(_blueprint: ProjectBlueprint): ValidationResult {
    return { valid: true, issues: [] };
  }
}
