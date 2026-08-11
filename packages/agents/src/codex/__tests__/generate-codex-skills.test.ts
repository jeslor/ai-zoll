import { describe, expect, it } from "vitest";
import {
  generateCodexSkills,
  remapSkillFileForCodex,
} from "../generate-codex-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateCodexSkills", () => {
  it("relocates the testing skill under .codex/ with frontmatter (full blueprint)", () => {
    const files = generateCodexSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      ".codex/skills/testing/SKILL.md",
    ]);
    expect(files[0]?.content.startsWith("---\nname: testing\n")).toBe(true);
  });

  it("matches the golden output for the full blueprint", async () => {
    const [file] = generateCodexSkills(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-codex-skills/full.testing.SKILL.md",
    );
  });

  it("returns an empty array when no testing types are configured (minimal blueprint)", () => {
    expect(generateCodexSkills(minimalBlueprint)).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateCodexSkills(fullBlueprint);
    const second = generateCodexSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("remapSkillFileForCodex", () => {
  it("preserves the original body content after the frontmatter", () => {
    const original = { path: "skills/testing/SKILL.md", content: "# Testing\n\nBody." };
    const remapped = remapSkillFileForCodex(original);
    expect(remapped.path).toBe(".codex/skills/testing/SKILL.md");
    expect(remapped.content.endsWith("# Testing\n\nBody.")).toBe(true);
  });

  it("throws for a skill id with no Codex frontmatter mapping (synthetic, not a real skill)", () => {
    const unmapped = {
      path: "skills/some-future-skill/SKILL.md",
      content: "# Some Future Skill",
    };
    expect(() => remapSkillFileForCodex(unmapped)).toThrow(
      /No Codex frontmatter mapping for skill "some-future-skill"/,
    );
  });

  it("throws for a path that doesn't match skills/<id>/SKILL.md", () => {
    const badPath = { path: "PROJECT.md", content: "# Project" };
    expect(() => remapSkillFileForCodex(badPath)).toThrow(
      /Unexpected skill file path "PROJECT\.md"/,
    );
  });
});
