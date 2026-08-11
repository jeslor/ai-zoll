import { describe, expect, it } from "vitest";
import { renderAgentInstructions, generateAgentsMd } from "@ai-zoll/generators";
import { ClaudeAdapter } from "../claude-adapter";
import { generateClaudeSkills } from "../generate-claude-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("ClaudeAdapter", () => {
  it("has id 'claude'", () => {
    expect(new ClaudeAdapter().id).toBe("claude");
  });

  it("returns a single CLAUDE.md file", () => {
    const files = new ClaudeAdapter().generateInstructions(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("CLAUDE.md");
  });

  it("the heading says CLAUDE.md, not AGENTS.md", () => {
    const [file] = new ClaudeAdapter().generateInstructions(fullBlueprint);
    expect(file?.content.split("\n")[0]).toBe("# CLAUDE.md");
    expect(file?.content).not.toContain("# AGENTS.md");
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = new ClaudeAdapter().generateInstructions(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/claude-adapter/full.CLAUDE.md",
    );
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = new ClaudeAdapter().generateInstructions(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/claude-adapter/minimal.CLAUDE.md",
    );
  });

  it("content matches renderAgentInstructions directly (no drift from the shared render function)", () => {
    const [file] = new ClaudeAdapter().generateInstructions(fullBlueprint);
    expect(file?.content).toBe(
      renderAgentInstructions(fullBlueprint, "CLAUDE.md"),
    );
  });

  it("is identical to AGENTS.md's content except for the heading", () => {
    const [claudeFile] = new ClaudeAdapter().generateInstructions(fullBlueprint);
    const [agentsFile] = generateAgentsMd(fullBlueprint);

    const claudeBody = claudeFile?.content.split("\n").slice(1).join("\n");
    const agentsBody = agentsFile?.content.split("\n").slice(1).join("\n");
    expect(claudeBody).toBe(agentsBody);
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new ClaudeAdapter();
    const first = adapter.generateInstructions(fullBlueprint);
    const second = adapter.generateInstructions(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateSkills matches calling generateClaudeSkills directly (no divergence)", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual(
      generateClaudeSkills(fullBlueprint),
    );
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate reports valid: true for a blueprint whose skills are all mapped", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
