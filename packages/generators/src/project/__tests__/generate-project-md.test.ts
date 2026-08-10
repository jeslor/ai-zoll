import { describe, expect, it } from "vitest";
import { generateProjectMd } from "../generate-project-md";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateProjectMd", () => {
  it("returns a single PROJECT.md file", () => {
    const files = generateProjectMd(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("PROJECT.md");
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = generateProjectMd(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-project-md/full.PROJECT.md",
    );
  });

  it("matches the golden output for a minimal blueprint (no features)", async () => {
    const [file] = generateProjectMd(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-project-md/minimal.PROJECT.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateProjectMd(fullBlueprint);
    const second = generateProjectMd(fullBlueprint);
    expect(first[0]?.content).toBe(second[0]?.content);
  });
});
