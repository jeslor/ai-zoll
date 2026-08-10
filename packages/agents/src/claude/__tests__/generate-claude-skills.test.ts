import { describe, expect, it } from "vitest";
import {
  generateClaudeSkills,
  remapSkillFileForClaude,
} from "../generate-claude-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateClaudeSkills", () => {
  it("relocates the testing skill under .claude/ with frontmatter (full blueprint)", () => {
    const files = generateClaudeSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      ".claude/skills/testing/SKILL.md",
    ]);
    expect(files[0]?.content.startsWith("---\nname: testing\n")).toBe(true);
  });

  it("matches the golden output for the full blueprint", async () => {
    const [file] = generateClaudeSkills(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-claude-skills/full.testing.SKILL.md",
    );
  });

  it("returns an empty array when no testing types are configured (minimal blueprint)", () => {
    expect(generateClaudeSkills(minimalBlueprint)).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateClaudeSkills(fullBlueprint);
    const second = generateClaudeSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("remapSkillFileForClaude", () => {
  it("preserves the original body content after the frontmatter", () => {
    const original = { path: "skills/testing/SKILL.md", content: "# Testing\n\nBody." };
    const remapped = remapSkillFileForClaude(original);
    expect(remapped.path).toBe(".claude/skills/testing/SKILL.md");
    expect(remapped.content.endsWith("# Testing\n\nBody.")).toBe(true);
    expect(remapped.content).toContain(
      "---\nname: testing\ndescription: Use when writing or modifying tests",
    );
  });

  it("throws for a skill id with no Claude frontmatter mapping (synthetic, not a real skill)", () => {
    const unmapped = {
      path: "skills/some-future-skill/SKILL.md",
      content: "# Some Future Skill",
    };
    expect(() => remapSkillFileForClaude(unmapped)).toThrow(
      /No Claude frontmatter mapping for skill "some-future-skill"/,
    );
  });

  it("throws for a path that doesn't match skills/<id>/SKILL.md", () => {
    const badPath = { path: "PROJECT.md", content: "# Project" };
    expect(() => remapSkillFileForClaude(badPath)).toThrow(
      /Unexpected skill file path "PROJECT\.md"/,
    );
  });
});
