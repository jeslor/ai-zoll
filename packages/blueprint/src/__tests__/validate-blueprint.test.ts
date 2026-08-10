import { describe, expect, it } from "vitest";
import { safeParseBlueprint, parseBlueprint } from "../validation/validate-blueprint";
import { BlueprintValidationError } from "../validation/errors";
import validFull from "./fixtures/valid-full.json";
import invalidBadArchitecture from "./fixtures/invalid-bad-architecture.json";
import invalidMissingProjectName from "./fixtures/invalid-missing-project-name.json";

describe("safeParseBlueprint", () => {
  it("returns success: true with typed data for a valid blueprint", () => {
    const result = safeParseBlueprint(validFull);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.name).toBe("School Management Platform");
      expect(result.data.agent.primary).toBe("claude");
    }
  });

  it("returns success: false with typed issues (not raw Zod errors) for an invalid blueprint", () => {
    const result = safeParseBlueprint(invalidBadArchitecture);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toEqual(
        expect.objectContaining({
          path: expect.any(String),
          message: expect.any(String),
        }),
      );
      expect(result.issues.some((issue) => issue.path === "architecture.style")).toBe(
        true,
      );
    }
  });

  it("rejects a completely unrelated value without throwing", () => {
    const result = safeParseBlueprint("not a blueprint");
    expect(result.success).toBe(false);
  });
});

describe("parseBlueprint", () => {
  it("returns the parsed blueprint for valid input", () => {
    const blueprint = parseBlueprint(validFull);
    expect(blueprint.project.type).toBe("saas");
  });

  it("throws a BlueprintValidationError carrying the issues for invalid input", () => {
    expect(() => parseBlueprint(invalidMissingProjectName)).toThrow(
      BlueprintValidationError,
    );

    let caught: unknown;
    try {
      parseBlueprint(invalidMissingProjectName);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BlueprintValidationError);
    expect((caught as BlueprintValidationError).issues.length).toBeGreaterThan(0);
  });
});
