import { describe, expect, it } from "vitest";
import { CURRENT_BLUEPRINT_VERSION, BlueprintValidationError } from "@ai-software-zoll/blueprint";
import { MockAIProvider } from "../providers/mock-ai-provider";
import type { BlueprintInput } from "../provider";
import validInput from "./fixtures/valid-blueprint-input.json";
import invalidInput from "./fixtures/invalid-blueprint-input.json";

describe("MockAIProvider.generateBlueprint", () => {
  it("assembles a valid, spec-compliant ProjectBlueprint from structured input", async () => {
    const provider = new MockAIProvider();
    const blueprint = await provider.generateBlueprint(
      validInput as BlueprintInput,
    );

    expect(blueprint.version).toBe(CURRENT_BLUEPRINT_VERSION);
    expect(blueprint.project.name).toBe("School Management Platform");
    expect(blueprint.architecture.style).toBe("modular");
    expect(blueprint.agent.primary).toBe("claude");
  });

  it("stamps the current version regardless of what the input contains", async () => {
    const provider = new MockAIProvider();
    const blueprint = await provider.generateBlueprint(
      validInput as BlueprintInput,
    );

    expect(blueprint.version).toBe("1.0");
  });

  it("throws BlueprintValidationError for structurally invalid input, without silently returning bad data", async () => {
    const provider = new MockAIProvider();

    // Cast through `unknown`: this fixture is deliberately malformed at
    // runtime (architecture.style isn't in the enum) to simulate input that
    // bypassed compile-time typing, e.g. from an external/unchecked source.
    await expect(
      provider.generateBlueprint(invalidInput as unknown as BlueprintInput),
    ).rejects.toBeInstanceOf(BlueprintValidationError);
  });

  it("the thrown error carries the specific validation issue", async () => {
    const provider = new MockAIProvider();

    let caught: unknown;
    try {
      await provider.generateBlueprint(
        invalidInput as unknown as BlueprintInput,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BlueprintValidationError);
    const validationError = caught as BlueprintValidationError;
    expect(
      validationError.issues.some(
        (issue) => issue.path === "architecture.style",
      ),
    ).toBe(true);
  });
});
