import { describe, expect, it } from "vitest";
import { renderAgentInstructions } from "@ai-zoll/generators";
import { ZedAdapter } from "../zed-adapter";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("ZedAdapter", () => {
  it("has id 'zed'", () => {
    expect(new ZedAdapter().id).toBe("zed");
  });

  it("returns a single .rules file", () => {
    const files = new ZedAdapter().generateInstructions(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe(".rules");
  });

  it("the content matches renderAgentInstructions directly (no drift, no frontmatter)", () => {
    const [file] = new ZedAdapter().generateInstructions(fullBlueprint);
    const body = renderAgentInstructions(fullBlueprint, "Zed Instructions");
    expect(file?.content).toBe(body);
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = new ZedAdapter().generateInstructions(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot("./__snapshots__/zed-adapter/full.rules");
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = new ZedAdapter().generateInstructions(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot("./__snapshots__/zed-adapter/minimal.rules");
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new ZedAdapter();
    const first = adapter.generateInstructions(fullBlueprint);
    const second = adapter.generateInstructions(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateSkills always returns [] — Zed has no separate skill/contextual-rules mechanism", () => {
    const adapter = new ZedAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual([]);
    // Even for a blueprint that would trigger the testing skill on every other adapter.
    expect(fullBlueprint.testing.unit).toBe(true);
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new ZedAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate always reports valid: true, since generateSkills never attempts per-skill files", () => {
    const adapter = new ZedAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
    expect(adapter.validate(minimalBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
