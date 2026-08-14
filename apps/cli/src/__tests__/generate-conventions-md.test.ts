import { describe, expect, it } from "vitest";
import type { RepositoryInsights } from "@ai-zoll/ai";
import { generateConventionsMd } from "../generate-conventions-md";

function insights(overrides: Partial<RepositoryInsights> = {}): RepositoryInsights {
  return {
    businessDomains: [],
    modules: [],
    architecturalPatterns: [],
    conventions: [],
    importantDependencies: [],
    testingPatterns: [],
    securityPatterns: [],
    undocumentedConventions: [],
    inconsistencies: [],
    missingDocumentation: [],
    ...overrides,
  };
}

describe("generateConventionsMd", () => {
  it("returns null when every relevant insight category is empty", () => {
    expect(generateConventionsMd(insights())).toBeNull();
  });

  it("returns null even when only categories it doesn't render are non-empty (businessDomains, modules, importantDependencies, missingDocumentation)", () => {
    const result = generateConventionsMd(
      insights({
        businessDomains: ["Billing"],
        modules: ["users"],
        importantDependencies: ["prisma"],
        missingDocumentation: ["no ARCHITECTURE.md"],
      }),
    );
    expect(result).toBeNull();
  });

  it("renders only the non-empty sections, skipping empty ones entirely", () => {
    const result = generateConventionsMd(
      insights({
        conventions: ["One folder per business domain"],
        testingPatterns: ["Vitest for unit tests"],
      }),
    );

    expect(result).toContain("## Conventions");
    expect(result).toContain("- One folder per business domain");
    expect(result).toContain("## Testing patterns");
    expect(result).toContain("- Vitest for unit tests");
    expect(result).not.toContain("## Security patterns");
    expect(result).not.toContain("## Inconsistencies");
  });

  it("renders every relevant category when all are present", () => {
    const result = generateConventionsMd(
      insights({
        conventions: ["conv"],
        undocumentedConventions: ["undoc"],
        inconsistencies: ["inconsistency"],
        architecturalPatterns: ["pattern"],
        testingPatterns: ["test pattern"],
        securityPatterns: ["security pattern"],
      }),
    );

    for (const heading of [
      "Conventions",
      "Undocumented conventions",
      "Inconsistencies to be aware of",
      "Architectural patterns",
      "Testing patterns",
      "Security patterns",
    ]) {
      expect(result).toContain(`## ${heading}`);
    }
  });

  it("starts with a # Conventions heading and notes this content isn't kept in sync by sync", () => {
    const result = generateConventionsMd(insights({ conventions: ["x"] }));
    expect(result?.startsWith("# Conventions")).toBe(true);
    expect(result).toContain("ai-zoll sync");
  });
});
