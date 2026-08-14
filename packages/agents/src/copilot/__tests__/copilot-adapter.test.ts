import { describe, expect, it } from "vitest";
import { renderAgentInstructions } from "@ai-zoll/generators";
import { CopilotAdapter } from "../copilot-adapter";
import { generateCopilotSkills } from "../generate-copilot-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("CopilotAdapter", () => {
  it("has id 'copilot'", () => {
    expect(new CopilotAdapter().id).toBe("copilot");
  });

  it("returns a single .github/copilot-instructions.md file", () => {
    const files = new CopilotAdapter().generateInstructions(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe(".github/copilot-instructions.md");
  });

  it("the content matches renderAgentInstructions directly (no drift)", () => {
    const [file] = new CopilotAdapter().generateInstructions(fullBlueprint);
    const body = renderAgentInstructions(fullBlueprint, "GitHub Copilot Instructions");
    expect(file?.content).toBe(body);
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = new CopilotAdapter().generateInstructions(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/copilot-adapter/full.copilot-instructions.md",
    );
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = new CopilotAdapter().generateInstructions(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/copilot-adapter/minimal.copilot-instructions.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new CopilotAdapter();
    const first = adapter.generateInstructions(fullBlueprint);
    const second = adapter.generateInstructions(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateSkills matches calling generateCopilotSkills directly (no divergence)", () => {
    const adapter = new CopilotAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual(
      generateCopilotSkills(fullBlueprint),
    );
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new CopilotAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate reports valid: true for a blueprint whose skills are all mapped", () => {
    const adapter = new CopilotAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
