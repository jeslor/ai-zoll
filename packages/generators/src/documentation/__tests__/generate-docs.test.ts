import { describe, expect, it } from "vitest";
import { generateDocs } from "../generate-docs";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateDocs", () => {
  it("returns the three expected stub README files", () => {
    const files = generateDocs(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      "docs/architecture/README.md",
      "docs/development/README.md",
      "docs/decisions/README.md",
    ]);
  });

  it("matches the golden output for docs/architecture/README.md", async () => {
    const files = generateDocs(fullBlueprint);
    const file = files.find((f) => f.path === "docs/architecture/README.md");
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-docs/architecture.README.md",
    );
  });

  it("matches the golden output for docs/development/README.md", async () => {
    const files = generateDocs(fullBlueprint);
    const file = files.find((f) => f.path === "docs/development/README.md");
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-docs/development.README.md",
    );
  });

  it("matches the golden output for docs/decisions/README.md", async () => {
    const files = generateDocs(fullBlueprint);
    const file = files.find((f) => f.path === "docs/decisions/README.md");
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-docs/decisions.README.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateDocs(fullBlueprint);
    const second = generateDocs(fullBlueprint);
    expect(first).toEqual(second);
  });

  it("interpolates the project name correctly for a minimal blueprint, without a snapshot", () => {
    const files = generateDocs(minimalBlueprint);
    expect(files).toHaveLength(3);
    expect(files.map((file) => file.path)).toEqual([
      "docs/architecture/README.md",
      "docs/development/README.md",
      "docs/decisions/README.md",
    ]);
    for (const file of files) {
      expect(file.content).toContain("Minimal Project");
    }
  });
});
