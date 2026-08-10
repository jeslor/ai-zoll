import { describe, expect, it } from "vitest";
import { generateArchitectureMd } from "../generate-architecture-md";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateArchitectureMd", () => {
  it("returns a single ARCHITECTURE.md file", () => {
    const files = generateArchitectureMd(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("ARCHITECTURE.md");
  });

  it("matches the golden output for a full blueprint (modular)", async () => {
    const [file] = generateArchitectureMd(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-architecture-md/full.ARCHITECTURE.md",
    );
  });

  it("matches the golden output for a minimal blueprint (layered)", async () => {
    const [file] = generateArchitectureMd(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-architecture-md/minimal.ARCHITECTURE.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateArchitectureMd(fullBlueprint);
    const second = generateArchitectureMd(fullBlueprint);
    expect(first[0]?.content).toBe(second[0]?.content);
  });

  it("does not repeat PROJECT.md's detailed fields (features/testing/security)", () => {
    const [file] = generateArchitectureMd(fullBlueprint);
    expect(file?.content).not.toContain("Manage student records");
    expect(file?.content).not.toContain("Authentication:");
  });

  it("renders a distinct heading and explanation for every architecture style", () => {
    const styles = [
      "modular",
      "layered",
      "clean-architecture",
      "hexagonal",
      "domain-driven-design",
    ] as const;

    const renderedHeadings = styles.map((style) => {
      const [file] = generateArchitectureMd({
        ...fullBlueprint,
        architecture: { style },
      });
      return file?.content.split("\n")[2];
    });

    expect(new Set(renderedHeadings).size).toBe(styles.length);
  });
});
