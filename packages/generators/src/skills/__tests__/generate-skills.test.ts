import { describe, expect, it } from "vitest";
import { generateSkills, buildSkillFiles } from "../generate-skills";
import type { SkillDefinition } from "../generate-skills";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateSkills", () => {
  it("includes the testing skill when a testing type is required (full blueprint)", () => {
    const files = generateSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual(["skills/testing/SKILL.md"]);
  });

  it("matches the golden output for skills/testing/SKILL.md", async () => {
    const files = generateSkills(fullBlueprint);
    const file = files.find((f) => f.path === "skills/testing/SKILL.md");
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-skills/testing.SKILL.md",
    );
  });

  it("returns an empty array when no testing types are configured (minimal blueprint) — the critical case", () => {
    const files = generateSkills(minimalBlueprint);
    expect(files).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces an identical file list", () => {
    const first = generateSkills(fullBlueprint);
    const second = generateSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("buildSkillFiles (synthetic definitions, not the real testing skill)", () => {
  it("includes only skills whose shouldInclude returns true, with correct paths and rendered content", () => {
    const alwaysIncluded: SkillDefinition = {
      id: "always",
      shouldInclude: () => true,
      render: () => "always content",
    };
    const neverIncluded: SkillDefinition = {
      id: "never",
      shouldInclude: () => false,
      render: () => "never content",
    };

    // Exercises the real filter-then-render code path (buildSkillFiles),
    // not a re-implementation of it, independent of which real skills exist
    // in SKILL_DEFINITIONS.
    const files = buildSkillFiles(fullBlueprint, [alwaysIncluded, neverIncluded]);

    expect(files).toEqual([
      { path: "skills/always/SKILL.md", content: "always content" },
    ]);
  });

  it("returns an empty array when no definitions match", () => {
    const neverIncluded: SkillDefinition = {
      id: "never",
      shouldInclude: () => false,
      render: () => "never content",
    };

    expect(buildSkillFiles(fullBlueprint, [neverIncluded])).toEqual([]);
  });

  it("returns an empty array when given no definitions at all", () => {
    expect(buildSkillFiles(fullBlueprint, [])).toEqual([]);
  });
});
