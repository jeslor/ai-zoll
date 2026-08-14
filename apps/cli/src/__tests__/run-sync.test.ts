import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import { getAgentAdapter } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { generateWorkspace } from "@ai-zoll/generators";
import { wrapManaged, CUSTOM_ZONE_HINT } from "../managed-content";
import { readProjectState, writeProjectState } from "../project-state";
import { runSync } from "../run-sync";

const baseBlueprint: ProjectBlueprint = {
  version: "1.0",
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-sync-test-"));
  tempDirs.push(dir);
  return dir;
}

/** Mirrors what the updated run-init.ts will do — decoupled here so run-sync's own tests don't depend on that change. */
function seedProject(dir: string, blueprint: ProjectBlueprint, agentId: SupportedAgentId): void {
  const adapter = getAgentAdapter(agentId);
  const files = [
    ...generateWorkspace(blueprint),
    ...adapter.generateInstructions(blueprint),
    ...adapter.generateSkills(blueprint),
    ...adapter.generateRules(blueprint),
  ];

  for (const file of files) {
    const fullPath = path.join(dir, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${wrapManaged(file.content) + CUSTOM_ZONE_HINT}\n`);
  }

  writeProjectState(dir, { blueprint, generatedPaths: files.map((f) => f.path), directorySignals: [] });
}

function readFile(dir: string, relPath: string): string {
  return fs.readFileSync(path.join(dir, relPath), "utf-8");
}

function exists(dir: string, relPath: string): boolean {
  return fs.existsSync(path.join(dir, relPath));
}

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("runSync", () => {
  it("re-syncs with the current agent as a no-op when nothing changed", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");

    const result = await runSync({ projectDir: dir });

    expect(result.agentId).toBe("claude");
    expect(result.created).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.updated).toContain("CLAUDE.md");
    expect(readFile(dir, "CLAUDE.md")).toContain(CUSTOM_ZONE_HINT);
  });

  it("preserves hand-added custom content across a resync", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    fs.appendFileSync(path.join(dir, "CLAUDE.md"), "\n## My notes\nDon't forget X.\n");

    await runSync({ projectDir: dir });

    expect(readFile(dir, "CLAUDE.md")).toContain("## My notes\nDon't forget X.");
  });

  it("switches agents: removes the outgoing agent's clean files, creates the new agent's files, leaves AGENTS.md untouched", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    const agentsMdBefore = readFile(dir, "AGENTS.md");

    const result = await runSync({ projectDir: dir, agentId: "cursor" });

    expect(result.agentId).toBe("cursor");
    expect(exists(dir, "CLAUDE.md")).toBe(false);
    expect(exists(dir, ".claude")).toBe(false);
    expect(exists(dir, ".cursor/rules/project.mdc")).toBe(true);
    expect(exists(dir, ".cursor/rules/testing.mdc")).toBe(true);
    expect(readFile(dir, "AGENTS.md")).toBe(agentsMdBefore);
    expect(result.deleted).toEqual(expect.arrayContaining(["CLAUDE.md", ".claude/skills/testing/SKILL.md"]));
  });

  it("preserves (does not delete) an outgoing agent file that has custom content, and still creates the new agent's file", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    fs.appendFileSync(path.join(dir, "CLAUDE.md"), "\n## Keep me\n");

    const result = await runSync({ projectDir: dir, agentId: "cursor" });

    expect(exists(dir, "CLAUDE.md")).toBe(true);
    expect(readFile(dir, "CLAUDE.md")).toContain("## Keep me");
    expect(result.preserved.map((p) => p.path)).toContain("CLAUDE.md");
    expect(exists(dir, ".cursor/rules/project.mdc")).toBe(true);
  });

  it("throws a clear error when the project was never initialized", async () => {
    const dir = makeTempDir();

    await expect(runSync({ projectDir: dir })).rejects.toThrow(/run "ai-zoll init" first/);
    expect(fs.existsSync(dir) && fs.readdirSync(dir).length).toBe(0);
  });

  it("throws without partial writes when state.json is corrupted", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    fs.writeFileSync(path.join(dir, ".ai-zoll", "state.json"), "not json");
    const claudeMdBefore = readFile(dir, "CLAUDE.md");

    await expect(runSync({ projectDir: dir })).rejects.toThrow(/not valid JSON/);
    expect(readFile(dir, "CLAUDE.md")).toBe(claudeMdBefore);
  });

  it("orphans a conditional file when the Blueprint changes, with no agent switch involved", async () => {
    const dir = makeTempDir();
    const testingBlueprint = { ...baseBlueprint, testing: { unit: true, integration: true, e2e: false } };
    seedProject(dir, testingBlueprint, "claude");
    expect(exists(dir, "skills/testing/SKILL.md")).toBe(true);
    expect(exists(dir, ".claude/skills/testing/SKILL.md")).toBe(true);

    const noTestingBlueprint = { ...baseBlueprint, testing: { unit: false, integration: false, e2e: false } };
    writeProjectState(dir, {
      blueprint: noTestingBlueprint,
      generatedPaths: readGeneratedPaths(dir),
      directorySignals: [],
    });

    const result = await runSync({ projectDir: dir });

    expect(exists(dir, "skills/testing/SKILL.md")).toBe(false);
    expect(exists(dir, ".claude/skills/testing/SKILL.md")).toBe(false);
    expect(result.deleted).toEqual(
      expect.arrayContaining(["skills/testing/SKILL.md", ".claude/skills/testing/SKILL.md"]),
    );
  });

  it("leaves a symlink untouched and reports it as preserved", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    const targetPath = path.join(dir, "symlink-target.md");
    fs.writeFileSync(targetPath, "not managed by ai-zoll");
    fs.rmSync(path.join(dir, "CLAUDE.md"));
    fs.symlinkSync(targetPath, path.join(dir, "CLAUDE.md"));

    const result = await runSync({ projectDir: dir });

    expect(fs.lstatSync(path.join(dir, "CLAUDE.md")).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(targetPath, "utf-8")).toBe("not managed by ai-zoll");
    expect(result.preserved.map((p) => p.path)).toContain("CLAUDE.md");
  });

  it("never writes through a symlinked ancestor directory into whatever it really points at", async () => {
    // Found dogfooding against a real repo (cal.com) that shares AI-agent
    // rule content across tools via symlinked directories, e.g.
    // .cursor/rules -> ../agents/rules — a real, git-tracked directory with
    // real, hand-written content unrelated to ai-zoll. Writing into
    // .cursor/rules/project.mdc without checking whether .cursor/rules
    // itself is a symlink silently follows it and pollutes that real
    // directory instead.
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");

    const realRulesDir = path.join(dir, "agents", "rules");
    fs.mkdirSync(realRulesDir, { recursive: true });
    fs.writeFileSync(path.join(realRulesDir, "existing-rule.md"), "hand-written, unrelated to ai-zoll");
    fs.mkdirSync(path.join(dir, ".cursor"), { recursive: true });
    fs.symlinkSync(realRulesDir, path.join(dir, ".cursor", "rules"));

    const result = await runSync({ projectDir: dir, agentId: "cursor" });

    expect(fs.readdirSync(realRulesDir)).toEqual(["existing-rule.md"]);
    expect(fs.readFileSync(path.join(realRulesDir, "existing-rule.md"), "utf-8")).toBe(
      "hand-written, unrelated to ai-zoll",
    );
    expect(result.preserved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".cursor/rules/project.mdc",
          reason: expect.stringContaining("symlink"),
        }),
      ]),
    );
    expect(result.created).not.toContain(".cursor/rules/project.mdc");
  });

  it("never deletes a stale file reached through a symlinked ancestor directory", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");

    // Simulate .claude/skills already being a symlink to a real directory
    // that happens to contain a file at the exact path a prior ai-zoll run
    // generated (claude/skills/testing/SKILL.md) — reconcileOrphans must not
    // delete it just because it matches a stale generated path.
    const realSkillsDir = path.join(dir, "agents", "skills", "testing");
    fs.mkdirSync(realSkillsDir, { recursive: true });
    fs.writeFileSync(path.join(realSkillsDir, "SKILL.md"), "hand-written, unrelated to ai-zoll");
    fs.rmSync(path.join(dir, ".claude", "skills"), { recursive: true, force: true });
    fs.symlinkSync(path.join(dir, "agents", "skills"), path.join(dir, ".claude", "skills"));

    const blueprintWithoutTesting: ProjectBlueprint = {
      ...baseBlueprint,
      testing: { unit: false, integration: false, e2e: false },
    };
    writeProjectState(dir, {
      blueprint: blueprintWithoutTesting,
      generatedPaths: [
        ...generateWorkspace(baseBlueprint).map((f) => f.path),
        ".claude/skills/testing/SKILL.md",
      ],
      directorySignals: [],
    });

    const result = await runSync({ projectDir: dir });

    expect(fs.readFileSync(path.join(realSkillsDir, "SKILL.md"), "utf-8")).toBe(
      "hand-written, unrelated to ai-zoll",
    );
    expect(result.deleted).not.toContain(".claude/skills/testing/SKILL.md");
    expect(result.preserved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".claude/skills/testing/SKILL.md",
          reason: expect.stringContaining("symlink"),
        }),
      ]),
    );
  });

  it("preserves-with-warning rather than crashing when a directory occupies a path a generated file wants", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    // No real adapter today produces a genuine directory/file path collision between
    // agents, so this simulates the class of problem directly: something (a stale
    // leftover, a manual mistake) put a directory where PROJECT.md — part of every
    // agent's file set, unconditionally regenerated on every sync — wants a plain file.
    fs.rmSync(path.join(dir, "PROJECT.md"));
    fs.mkdirSync(path.join(dir, "PROJECT.md"));

    const result = await runSync({ projectDir: dir });

    expect(fs.lstatSync(path.join(dir, "PROJECT.md")).isDirectory()).toBe(true);
    expect(result.preserved.map((p) => p.path)).toContain("PROJECT.md");
    expect(result.created).not.toContain("PROJECT.md");
  });

  it("refreshes the directorySignals baseline on every sync, relative to the last sync, not the original one", async () => {
    const dir = makeTempDir();
    seedProject(dir, baseBlueprint, "claude");
    fs.mkdirSync(path.join(dir, "src", "controllers"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "controllers", ".gitkeep"), "");

    await runSync({ projectDir: dir });
    const state = readProjectState(dir);

    expect(state.directorySignals).toEqual(["controllers"]);
  });
});

function readGeneratedPaths(dir: string): string[] {
  const state = JSON.parse(fs.readFileSync(path.join(dir, ".ai-zoll", "state.json"), "utf-8"));
  return state.generatedPaths;
}
