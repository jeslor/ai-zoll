import { describe, expect, it } from "vitest";
import { generateWorkflows } from "../generate-workflows";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateWorkflows", () => {
  it("returns the feature-development workflow file", () => {
    const files = generateWorkflows(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      "workflows/feature-development.md",
    ]);
  });

  it("matches the golden output for a full blueprint (Modular Architecture)", async () => {
    const [file] = generateWorkflows(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-workflows/full.feature-development.md",
    );
  });

  it("matches the golden output for a minimal blueprint (Layered Architecture)", async () => {
    const [file] = generateWorkflows(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-workflows/minimal.feature-development.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateWorkflows(fullBlueprint);
    const second = generateWorkflows(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("does not repeat AGENTS.md's directive prose verbatim", () => {
    const [file] = generateWorkflows(fullBlueprint);
    expect(file?.content).not.toContain(
      "Do not introduce a different framework or library",
    );
    expect(file?.content).not.toContain("New functionality must include");
  });
});
