import { describe, expect, it } from "vitest";
import { ProjectBlueprintSchema } from "../schemas/blueprint.schema";
import validFull from "./fixtures/valid-full.json";
import validMinimal from "./fixtures/valid-minimal.json";
import invalidBadArchitecture from "./fixtures/invalid-bad-architecture.json";
import invalidWrongVersion from "./fixtures/invalid-wrong-version.json";
import invalidMissingProjectName from "./fixtures/invalid-missing-project-name.json";

describe("ProjectBlueprintSchema", () => {
  it("accepts the full example fixture (mirrors spec §4)", () => {
    const result = ProjectBlueprintSchema.safeParse(validFull);
    expect(result.success).toBe(true);
  });

  it("accepts a minimal fixture with only required fields", () => {
    const result = ProjectBlueprintSchema.safeParse(validMinimal);
    expect(result.success).toBe(true);
  });

  it("rejects an architecture style outside the enum", () => {
    const result = ProjectBlueprintSchema.safeParse(invalidBadArchitecture);
    expect(result.success).toBe(false);
  });

  it("rejects a version other than the current schema version", () => {
    const result = ProjectBlueprintSchema.safeParse(invalidWrongVersion);
    expect(result.success).toBe(false);
  });

  it("rejects a blueprint missing a required field", () => {
    const result = ProjectBlueprintSchema.safeParse(invalidMissingProjectName);
    expect(result.success).toBe(false);
  });

  it("defaults features to an empty array when omitted", () => {
    const { features, ...withoutFeatures } = validMinimal as Record<
      string,
      unknown
    >;
    const result = ProjectBlueprintSchema.safeParse(withoutFeatures);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toEqual([]);
    }
  });
});
