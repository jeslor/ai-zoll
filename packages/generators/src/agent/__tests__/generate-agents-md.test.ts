import { describe, expect, it } from "vitest";
import { generateAgentsMd } from "../generate-agents-md";
import { fullBlueprint } from "../../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../../__fixtures__/minimal-blueprint";

describe("generateAgentsMd", () => {
  it("returns a single AGENTS.md file", () => {
    const files = generateAgentsMd(fullBlueprint);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("AGENTS.md");
  });

  it("matches the golden output for a full blueprint (all testing types required)", async () => {
    const [file] = generateAgentsMd(fullBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-agents-md/full.AGENTS.md",
    );
  });

  it("matches the golden output for a minimal blueprint (no testing configured)", async () => {
    const [file] = generateAgentsMd(minimalBlueprint);
    await expect(file?.content).toMatchFileSnapshot(
      "./__snapshots__/generate-agents-md/minimal.AGENTS.md",
    );
  });

  it("is deterministic: the same blueprint always produces identical output", () => {
    const first = generateAgentsMd(fullBlueprint);
    const second = generateAgentsMd(fullBlueprint);
    expect(first[0]?.content).toBe(second[0]?.content);
  });

  it("does not repeat PROJECT.md's features list or ARCHITECTURE.md's prose explanation", () => {
    const [file] = generateAgentsMd(fullBlueprint);
    expect(file?.content).not.toContain("Manage student records");
    expect(file?.content).not.toContain(
      "Organizes the application around independent business modules",
    );
  });

  it("phrases testing requirements as a directive, not a yes/no table", () => {
    const [file] = generateAgentsMd(fullBlueprint);
    expect(file?.content).toContain("New functionality must include");
    expect(file?.content).not.toContain("- Unit:");
  });
});
