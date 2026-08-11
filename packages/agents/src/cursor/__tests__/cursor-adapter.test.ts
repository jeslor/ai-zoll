import { describe, expect, it } from "vitest";
import { renderAgentInstructions } from "@ai-zoll/generators";
import { CursorAdapter } from "../cursor-adapter";
import { generateCursorSkills } from "../generate-cursor-skills";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("CursorAdapter", () => {
  it("has id 'cursor'", () => {
    expect(new CursorAdapter().id).toBe("cursor");
  });

  it("returns a single .cursor/rules/project.mdc file", () => {
    const files = new CursorAdapter().generateInstructions(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe(".cursor/rules/project.mdc");
  });

  it("frontmatter has alwaysApply: true and empty globs", () => {
    const [file] = new CursorAdapter().generateInstructions(fullBlueprint);
    expect(file?.content).toContain("alwaysApply: true");
    expect(file?.content).toContain("globs: []");
    expect(file?.content.startsWith("---\ndescription:")).toBe(true);
  });

  it("the body content matches renderAgentInstructions directly (no drift)", () => {
    const [file] = new CursorAdapter().generateInstructions(fullBlueprint);
    const body = renderAgentInstructions(fullBlueprint, "Project Instructions");
    expect(file?.content.endsWith(body)).toBe(true);
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = new CursorAdapter().generateInstructions(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/cursor-adapter/full.project.mdc",
    );
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = new CursorAdapter().generateInstructions(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/cursor-adapter/minimal.project.mdc",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const adapter = new CursorAdapter();
    const first = adapter.generateInstructions(fullBlueprint);
    const second = adapter.generateInstructions(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("generateSkills matches calling generateCursorSkills directly (no divergence)", () => {
    const adapter = new CursorAdapter();
    expect(adapter.generateSkills(fullBlueprint)).toEqual(
      generateCursorSkills(fullBlueprint),
    );
  });

  it("generateRules returns [] for full and minimal blueprints", () => {
    const adapter = new CursorAdapter();
    expect(adapter.generateRules(fullBlueprint)).toEqual([]);
    expect(adapter.generateRules(minimalBlueprint)).toEqual([]);
  });

  it("validate reports valid: true for a blueprint whose skills are all mapped", () => {
    const adapter = new CursorAdapter();
    expect(adapter.validate(fullBlueprint)).toEqual({ valid: true, issues: [] });
  });
});
