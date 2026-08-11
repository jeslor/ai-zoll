import { describe, expect, it } from "vitest";
import { CodexAdapter } from "../codex-adapter";
import { generateCodexSkills } from "../generate-codex-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("CodexAdapter", () => {
  it("has id 'codex'", () => {
    expect(new CodexAdapter().id).toBe("codex");
  });

  it("generateInstructions returns [] — Codex reads the canonical AGENTS.md directly, no adapted file needed", () => {
    const adapter = new CodexAdapter();
    expect(adapter.generateInstructions(fullBlueprint)).toEqual([]);
    expect(adapter.generateInstructions(minimalBlueprint)).toEqual([]);
  });

  it("generateSkills matches calling generateCodexSkills directly (no divergence)", () => {
    const adapter = new CodexAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual(
      generateCodexSkills(fullBlueprint),
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new CodexAdapter();
    const first = adapter.generateSkills(fullBlueprint);
    const second = adapter.generateSkills(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new CodexAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate reports valid: true for a blueprint whose skills are all mapped", () => {
    const adapter = new CodexAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
