import { describe, expect, it } from "vitest";
import {
  generateCopilotSkills,
  remapSkillFileForCopilot,
} from "../generate-copilot-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateCopilotSkills", () => {
  it("relocates the testing skill under .github/instructions/ with applyTo frontmatter (full blueprint)", () => {
    const files = generateCopilotSkills(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      ".github/instructions/testing.instructions.md",
    ]);
    expect(files[0]?.content).toContain('applyTo: "**/*.test.*,**/*.spec.*"');
  });

  it("matches the golden output for the full blueprint", async () => {
    const [file] = generateCopilotSkills(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-copilot-skills/full.testing.instructions.md",
    );
  });

  it("returns an empty array when no testing types are configured (minimal blueprint)", () => {
    expect(generateCopilotSkills(minimalBlueprint)).toEqual([]);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateCopilotSkills(fullBlueprint);
    const second = generateCopilotSkills(fullBlueprint);
    expect(first).toEqual(second);
  });
});

describe("remapSkillFileForCopilot", () => {
  it("preserves the original body content after the frontmatter", () => {
    const original = { path: "skills/testing/SKILL.md", content: "# Testing\n\nBody." };
    const remapped = remapSkillFileForCopilot(original);
    expect(remapped.path).toBe(".github/instructions/testing.instructions.md");
    expect(remapped.content.endsWith("# Testing\n\nBody.")).toBe(true);
  });

  it("throws for a skill id with no Copilot frontmatter mapping (synthetic, not a real skill)", () => {
    const unmapped = {
      path: "skills/some-future-skill/SKILL.md",
      content: "# Some Future Skill",
    };
    expect(() => remapSkillFileForCopilot(unmapped)).toThrow(
      /No Copilot frontmatter mapping for skill "some-future-skill"/,
    );
  });

  it("throws for a path that doesn't match skills/<id>/SKILL.md", () => {
    const badPath = { path: "PROJECT.md", content: "# Project" };
    expect(() => remapSkillFileForCopilot(badPath)).toThrow(
      /Unexpected skill file path "PROJECT\.md"/,
    );
  });
});
