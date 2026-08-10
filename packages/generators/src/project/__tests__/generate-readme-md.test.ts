import { describe, expect, it } from "vitest";
import { generateReadmeMd } from "../generate-readme-md";
import { fullBlueprint } from "./fixtures/full-blueprint";
import { minimalBlueprint } from "./fixtures/minimal-blueprint";

describe("generateReadmeMd", () => {
  it("returns a single README.md file", () => {
    const files = generateReadmeMd(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("README.md");
  });

  it("matches the golden output for a full blueprint", async () => {
    const [file] = generateReadmeMd(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-readme-md/full.README.md",
    );
  });

  it("matches the golden output for a minimal blueprint", async () => {
    const [file] = generateReadmeMd(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-readme-md/minimal.README.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateReadmeMd(fullBlueprint);
    const second = generateReadmeMd(fullBlueprint);
    expect(first[0]?.content).toBe(second[0]?.content);
  });

  it("does not repeat PROJECT.md's detailed fields (features/testing/security)", () => {
    const [file] = generateReadmeMd(fullBlueprint);
    expect(file?.content).not.toContain("Manage student records");
    expect(file?.content).not.toContain("Authentication:");
  });
});
