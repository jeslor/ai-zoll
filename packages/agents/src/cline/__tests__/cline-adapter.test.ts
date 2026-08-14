import { describe, expect, it } from "vitest";
import { renderAgentInstructions } from "@ai-zoll/generators";
import { ClineAdapter } from "../cline-adapter";
import { generateClineSkills } from "../generate-cline-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("ClineAdapter", () => {
  it("has id 'cline'", () => {
    expect(new ClineAdapter().id).toBe("cline");
  });

  it("returns a single .clinerules/project.md file", () => {
    const files = new ClineAdapter().generateInstructions(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe(".clinerules/project.md");
  });

  it("the content matches renderAgentInstructions directly (no drift, no frontmatter)", () => {
    const [file] = new ClineAdapter().generateInstructions(fullBlueprint);
    const body = renderAgentInstructions(fullBlueprint, "Cline Instructions");
    expect(file?.content).toBe(body);
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = new ClineAdapter().generateInstructions(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot("./__snapshots__/cline-adapter/full.project.md");
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = new ClineAdapter().generateInstructions(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot("./__snapshots__/cline-adapter/minimal.project.md");
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new ClineAdapter();
    const first = adapter.generateInstructions(fullBlueprint);
    const second = adapter.generateInstructions(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateSkills matches calling generateClineSkills directly (no divergence)", () => {
    const adapter = new ClineAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual(generateClineSkills(fullBlueprint));
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new ClineAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate reports valid: true for a blueprint whose skills are all mapped", () => {
    const adapter = new ClineAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
