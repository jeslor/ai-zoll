import { describe, expect, it } from "vitest";
import {
  generateWorkspace,
  assertNoDuplicatePaths,
} from "../generate-workspace";
import { generateProjectMd } from "../project/generate-project-md";
import { generateReadmeMd } from "../project/generate-readme-md";
import { generateArchitectureMd } from "../documentation/generate-architecture-md";
import { generateDocs } from "../documentation/generate-docs";
import { generateAgentsMd } from "../agent/generate-agents-md";
import { generateSkills } from "../skills/generate-skills";
import { generateWorkflows } from "../workflows/generate-workflows";
import { fullBlueprint } from "../__fixtures__/full-blueprint";
import { minimalBlueprint } from "../__fixtures__/minimal-blueprint";

describe("assertNoDuplicatePaths", () => {
  it("does not throw when all paths are unique", () => {
    expect(() =>
      assertNoDuplicatePaths([
        { path: "A.md", content: "a" },
        { path: "B.md", content: "b" },
      ]),
    ).not.toThrow();
  });

  it("throws listing the colliding path when two files share a path", () => {
    expect(() =>
      assertNoDuplicatePaths([
        { path: "A.md", content: "a" },
        { path: "A.md", content: "different content" },
      ]),
    ).toThrow(/A\.md/);
  });

  it("does not throw for an empty file list", () => {
    expect(() => assertNoDuplicatePaths([])).not.toThrow();
  });
});

describe("generateWorkspace", () => {
  it("returns exactly the expected paths, in a fixed order", () => {
    const files = generateWorkspace(fullBlueprint);
    expect(files.map((file) => file.path)).toEqual([
      "PROJECT.md",
      "README.md",
      "ARCHITECTURE.md",
      "docs/architecture/README.md",
      "docs/development/README.md",
      "docs/decisions/README.md",
      "AGENTS.md",
      "skills/testing/SKILL.md",
      "workflows/feature-development.md",
    ]);
  });

  it("omits skills/ entirely for a blueprint with no testing configured (minimal)", () => {
    const files = generateWorkspace(minimalBlueprint);
    const skillPaths = files
      .map((file) => file.path)
      .filter((path) => path.startsWith("skills/"));
    expect(skillPaths).toEqual([]);
  });

  it("each file's content matches calling its generator directly (aggregation doesn't mutate anything)", () => {
    const files = generateWorkspace(fullBlueprint);
    const byPath = Object.fromEntries(
      files.map((file) => [file.path, file.content]),
    );

    expect(byPath["PROJECT.md"]).toBe(
      generateProjectMd(fullBlueprint)[0]?.content,
    );
    expect(byPath["README.md"]).toBe(
      generateReadmeMd(fullBlueprint)[0]?.content,
    );
    expect(byPath["ARCHITECTURE.md"]).toBe(
      generateArchitectureMd(fullBlueprint)[0]?.content,
    );

    const docsFiles = generateDocs(fullBlueprint);
    for (const docFile of docsFiles) {
      expect(byPath[docFile.path]).toBe(docFile.content);
    }

    expect(byPath["AGENTS.md"]).toBe(
      generateAgentsMd(fullBlueprint)[0]?.content,
    );
    expect(byPath["skills/testing/SKILL.md"]).toBe(
      generateSkills(fullBlueprint)[0]?.content,
    );
    expect(byPath["workflows/feature-development.md"]).toBe(
      generateWorkflows(fullBlueprint)[0]?.content,
    );
  });

  it("is deterministic: the same blueprint always produces an identical file list", () => {
    const first = generateWorkspace(fullBlueprint);
    const second = generateWorkspace(fullBlueprint);
    expect(first).toEqual(second);
  });
});
