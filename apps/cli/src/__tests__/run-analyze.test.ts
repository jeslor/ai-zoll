import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { BlueprintInput } from "@ai-zoll/ai";
import { runAnalyze } from "../run-analyze";
import { readProjectState } from "../project-state";

const fullInput: BlueprintInput = {
  project: {
    name: "Existing Project",
    description: "An already-existing codebase being adopted.",
    type: "saas",
  },
  architecture: { style: "modular" },
  stack: {
    frontend: "nextjs",
    backend: "nestjs",
    database: "postgresql",
    orm: "prisma",
  },
  features: [],
  testing: { unit: true, integration: false, e2e: false },
  security: { authentication: "jwt", authorization: "rbac" },
  agent: { primary: "claude" },
};

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-analyze-test-"));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  tempDirs = [];
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
});

describe("runAnalyze", () => {
  it("generates the full workspace and writes .ai-zoll/state.json for a fresh directory", async () => {
    const projectDir = makeTempDir();

    const result = await runAnalyze({ projectDir, input: fullInput, agentId: "claude" });

    expect(result.created).toContain("PROJECT.md");
    expect(result.created).toContain("CLAUDE.md");
    expect(result.deleted).toEqual([]);
    expect(result.preserved).toEqual([]);

    const state = readProjectState(projectDir);
    expect(state.blueprint.project.name).toBe("Existing Project");
  });

  it("never overwrites pre-existing hand-written files or application source (Rule 10)", async () => {
    const projectDir = makeTempDir();
    const handWrittenReadme = "# Existing Project\n\nThis README predates ai-zoll. Do not touch.\n";
    const applicationSource = "export function main() { return 42; }\n";

    fs.writeFileSync(path.join(projectDir, "README.md"), handWrittenReadme);
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "src", "index.ts"), applicationSource);

    const result = await runAnalyze({ projectDir, input: fullInput, agentId: "claude" });

    expect(fs.readFileSync(path.join(projectDir, "README.md"), "utf-8")).toBe(handWrittenReadme);
    expect(fs.readFileSync(path.join(projectDir, "src", "index.ts"), "utf-8")).toBe(applicationSource);
    expect(result.preserved.map((p) => p.path)).toContain("README.md");
    expect(result.created).not.toContain("README.md");
    // Files ai-zoll doesn't generate at all (application source) are simply
    // never touched — they're not in the generated file set to begin with.
    expect(result.created).not.toContain("src/index.ts");
  });

  it("refuses to run on an already-initialized project and touches no files", async () => {
    const projectDir = makeTempDir();
    await runAnalyze({ projectDir, input: fullInput, agentId: "claude" });
    const projectMdAfterFirstRun = fs.readFileSync(path.join(projectDir, "PROJECT.md"), "utf-8");

    await expect(runAnalyze({ projectDir, input: fullInput, agentId: "cursor" })).rejects.toThrow(
      /already an ai-zoll project/,
    );

    // Confirms the refusal happens before any generation/writing occurs.
    expect(fs.readFileSync(path.join(projectDir, "PROJECT.md"), "utf-8")).toBe(projectMdAfterFirstRun);
    expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".cursor"))).toBe(false);
  });

  it("rejects structurally invalid input without writing anything", async () => {
    const projectDir = makeTempDir();
    const invalidInput = {
      ...fullInput,
      architecture: { style: "not-a-real-style" },
    } as unknown as BlueprintInput;

    await expect(runAnalyze({ projectDir, input: invalidInput, agentId: "claude" })).rejects.toThrow();
    expect(fs.existsSync(path.join(projectDir, "PROJECT.md"))).toBe(false);
  });
});
