import { describe, expect, it } from "vitest";
import { validateSkillCoverage } from "../validate-skill-coverage";
import { fullBlueprint } from "../claude/__tests__/fixtures/full-blueprint";
import { minimalBlueprint } from "../claude/__tests__/fixtures/minimal-blueprint";

describe("validateSkillCoverage", () => {
  it("reports invalid with an issue when a triggered skill has no frontmatter mapping", () => {
    const result = validateSkillCoverage(fullBlueprint, {});
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toContain("testing");
  });

  it("reports valid when the triggered skill has a frontmatter mapping", () => {
    const result = validateSkillCoverage(fullBlueprint, { testing: {} });
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it("reports valid for a blueprint that triggers no skills at all, regardless of the map", () => {
    const result = validateSkillCoverage(minimalBlueprint, {});
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it("is deterministic: the same inputs always produce identical output", () => {
    const first = validateSkillCoverage(fullBlueprint, {});
    const second = validateSkillCoverage(fullBlueprint, {});
    expect(first).toEqual(second);
  });
});
