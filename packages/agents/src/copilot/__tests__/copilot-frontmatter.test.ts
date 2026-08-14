import { describe, expect, it } from "vitest";
import { renderCopilotInstructionsFrontmatter } from "../copilot-frontmatter";

describe("renderCopilotInstructionsFrontmatter", () => {
  it("renders a single applyTo glob", () => {
    const result = renderCopilotInstructionsFrontmatter({ applyTo: ["**/*.ts"] });
    expect(result).toBe('---\napplyTo: "**/*.ts"\n---\n\n');
  });

  it("joins multiple globs with a comma and no spaces", () => {
    const result = renderCopilotInstructionsFrontmatter({
      applyTo: ["**/*.test.*", "**/*.spec.*"],
    });
    expect(result).toContain('applyTo: "**/*.test.*,**/*.spec.*"');
  });
});
