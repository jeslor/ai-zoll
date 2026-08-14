import { describe, expect, it } from "vitest";
import { generateClineSkills, remapSkillFileForCline } from "../generate-cline-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateClineSkills", () => {
  it("relocates the testing skill under .clinerules/ with no frontmatter (full blueprint)", () => {
    const files = generateClineSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([".clinerules/testing.md"]);
    expect(files[0]?.content.startsWith("---")).toBe(false);
  });

  it("matches the golden output for the full blueprint", async () => {
    const [file] = generateClineSkills(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot("./__snapshots__/generate-cline-skills/full.testing.md");
  });

  it("returns an empty array when no testing types are configured (minimal blueprint)", () => {
    expect(generateClineSkills(minimalBlueprint)).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateClineSkills(fullBlueprint);
    const second = generateClineSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("remapSkillFileForCline", () => {
  it("preserves the original body content byte-for-byte (no frontmatter injected)", () => {
    const original = { path: "skills/testing/SKILL.md", content: "# Testing\n\nBody." };
    const remapped = remapSkillFileForCline(original);
    expect(remapped.path).toBe(".clinerules/testing.md");
    expect(remapped.content).toBe("# Testing\n\nBody.");
  });

  it("throws for a skill id with no Cline mapping (synthetic, not a real skill)", () => {
    const unmapped = { path: "skills/some-future-skill/SKILL.md", content: "# Some Future Skill" };
    expect(() => remapSkillFileForCline(unmapped)).toThrow(
      /No Cline mapping for skill "some-future-skill"/,
    );
  });

  it("throws for a path that doesn't match skills/<id>/SKILL.md", () => {
    const badPath = { path: "PROJECT.md", content: "# Project" };
    expect(() => remapSkillFileForCline(badPath)).toThrow(/Unexpected skill file path "PROJECT\.md"/);
  });
});
