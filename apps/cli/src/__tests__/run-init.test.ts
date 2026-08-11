import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { BlueprintInput } from "@ai-zoll/ai";
import { runInit } from "../run-init";

const fullInput: BlueprintInput = {
  project: {
    name: "SaaS CRM",
    description: "A SaaS CRM for managing customers.",
    type: "saas",
  },
  architecture: { style: "modular" },
  stack: {
    frontend: "nextjs",
    backend: "nestjs",
    database: "postgresql",
    orm: "prisma",
  },
  features: [{ name: "Contacts", description: "Manage customer contacts" }],
  testing: { unit: true, integration: true, e2e: false },
  security: { authentication: "jwt", authorization: "rbac" },
  agent: { primary: "claude" },
};

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-cli-test-"));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  tempDirs = [];
  // These tests exercise the deterministic MockAIProvider path. Clear any
  // ANTHROPIC_API_KEY from the host shell so a developer's real credential
  // can't redirect runInit() to a live API call during a test run.
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
});

describe("runInit", () => {
  it("writes the canonical workspace plus Claude-specific files to disk", async () => {
    const outputDir = path.join(makeTempDir(), "project");
    const result = await runInit({
      input: fullInput,
      agentId: "claude",
      outputDir,
    });

    expect(result.outputDir).toBe(outputDir);
    expect(result.files.map((file) => file.path)).toContain("PROJECT.md");
    expect(result.files.map((file) => file.path)).toContain("CLAUDE.md");
    expect(result.files.map((file) => file.path)).toContain(
      ".claude/skills/testing/SKILL.md",
    );

    const projectMdOnDisk = fs.readFileSync(
      path.join(outputDir, "PROJECT.md"),
      "utf-8",
    );
    expect(projectMdOnDisk).toContain("SaaS CRM");

    const claudeMdOnDisk = fs.readFileSync(
      path.join(outputDir, "CLAUDE.md"),
      "utf-8",
    );
    expect(claudeMdOnDisk.startsWith("# CLAUDE.md")).toBe(true);
  });

  it("writes Cursor-specific files (.mdc, not .claude/)", async () => {
    const outputDir = path.join(makeTempDir(), "project");
    const result = await runInit({
      input: { ...fullInput, agent: { primary: "cursor" } },
      agentId: "cursor",
      outputDir,
    });

    const paths = result.files.map((file) => file.path);
    expect(paths).toContain(".cursor/rules/project.mdc");
    expect(paths).toContain(".cursor/rules/testing.mdc");
    expect(paths).not.toContain("CLAUDE.md");
  });

  it("writes Codex-specific files (skills only, no adapted instructions file)", async () => {
    const outputDir = path.join(makeTempDir(), "project");
    const result = await runInit({
      input: { ...fullInput, agent: { primary: "codex" } },
      agentId: "codex",
      outputDir,
    });

    const paths = result.files.map((file) => file.path);
    expect(paths).toContain(".codex/skills/testing/SKILL.md");
    expect(paths).toContain("AGENTS.md"); // canonical, Codex reads this directly
    expect(paths).not.toContain("CLAUDE.md");
  });

  it("refuses to write into a non-empty output directory", async () => {
    const outputDir = makeTempDir();
    fs.writeFileSync(path.join(outputDir, "existing-file.txt"), "hello");

    await expect(
      runInit({ input: fullInput, agentId: "claude", outputDir }),
    ).rejects.toThrow(/already exists and is not empty/);
  });

  it("rejects structurally invalid input instead of writing partial output", async () => {
    const outputDir = path.join(makeTempDir(), "project");
    const invalidInput = {
      ...fullInput,
      architecture: { style: "not-a-real-style" },
    } as unknown as BlueprintInput;

    await expect(
      runInit({ input: invalidInput, agentId: "claude", outputDir }),
    ).rejects.toThrow();
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it("is deterministic: the same input always produces the same file contents", async () => {
    const firstDir = path.join(makeTempDir(), "project");
    const secondDir = path.join(makeTempDir(), "project");

    const first = await runInit({
      input: fullInput,
      agentId: "claude",
      outputDir: firstDir,
    });
    const second = await runInit({
      input: fullInput,
      agentId: "claude",
      outputDir: secondDir,
    });

    expect(first.files).toEqual(second.files);
  });
});
