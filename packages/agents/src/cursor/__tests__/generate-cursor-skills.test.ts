import { describe, expect, it } from "vitest";
import {
  generateCursorSkills,
  remapSkillFileForCursor,
} from "../generate-cursor-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateCursorSkills", () => {
  it("relocates the testing skill under .cursor/rules/ with frontmatter (full blueprint)", () => {
    const files = generateCursorSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([".cursor/rules/testing.mdc"]);
    expect(files[0]?.content).toContain("alwaysApply: false");
    expect(files[0]?.content).toContain(
      'globs: ["**/*.test.*", "**/*.spec.*"]',
    );
  });

  it("matches the golden output for the full blueprint", async () => {
    const [file] = generateCursorSkills(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-cursor-skills/full.testing.mdc",
    );
  });

  it("returns an empty array when no testing types are configured (minimal blueprint)", () => {
    expect(generateCursorSkills(minimalBlueprint)).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateCursorSkills(fullBlueprint);
    const second = generateCursorSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("remapSkillFileForCursor", () => {
  it("preserves the original body content after the frontmatter", () => {
    const original = { path: "skills/testing/SKILL.md", content: "# Testing\n\nBody." };
    const remapped = remapSkillFileForCursor(original);
    expect(remapped.path).toBe(".cursor/rules/testing.mdc");
    expect(remapped.content.endsWith("# Testing\n\nBody.")).toBe(true);
  });

  it("throws for a skill id with no Cursor frontmatter mapping (synthetic, not a real skill)", () => {
    const unmapped = {
      path: "skills/some-future-skill/SKILL.md",
      content: "# Some Future Skill",
    };
    expect(() => remapSkillFileForCursor(unmapped)).toThrow(
      /No Cursor frontmatter mapping for skill "some-future-skill"/,
    );
  });

  it("throws for a path that doesn't match skills/<id>/SKILL.md", () => {
    const badPath = { path: "PROJECT.md", content: "# Project" };
    expect(() => remapSkillFileForCursor(badPath)).toThrow(
      /Unexpected skill file path "PROJECT\.md"/,
    );
  });
});
