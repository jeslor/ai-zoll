import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import { readProjectState, writeProjectState } from "../project-state";

const validBlueprint: ProjectBlueprint = {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-state-test-"));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("writeProjectState / readProjectState", () => {
  it("round-trips a valid state exactly", () => {
    const dir = makeTempDir();
    const state = {
      blueprint: validBlueprint,
      generatedPaths: ["PROJECT.md", "CLAUDE.md"],
      directorySignals: ["controller", "service"],
    };

    writeProjectState(dir, state);
    const result = readProjectState(dir);

    expect(result).toEqual(state);
  });

  it("writes pretty-printed JSON with a trailing newline", () => {
    const dir = makeTempDir();
    writeProjectState(dir, { blueprint: validBlueprint, generatedPaths: [], directorySignals: [] });

    const raw = fs.readFileSync(path.join(dir, ".ai-zoll", "state.json"), "utf-8");

    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain("\n  ");
  });

  it("reads directorySignals as undefined (not []) for a state.json written before this field existed", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, ".ai-zoll"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".ai-zoll", "state.json"),
      JSON.stringify({ blueprint: validBlueprint, generatedPaths: [] }, null, 2),
    );

    const result = readProjectState(dir);

    expect(result.directorySignals).toBeUndefined();
  });

  it("throws a clear error when state.json doesn't exist", () => {
    const dir = makeTempDir();

    expect(() => readProjectState(dir)).toThrow(/run "ai-zoll init" first/);
  });

  it("throws a clear error on invalid JSON", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, ".ai-zoll"));
    fs.writeFileSync(path.join(dir, ".ai-zoll", "state.json"), "{ not valid json");

    expect(() => readProjectState(dir)).toThrow(/not valid JSON/);
  });

  it("throws a clear error when the outer shape is wrong", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, ".ai-zoll"));
    fs.writeFileSync(
      path.join(dir, ".ai-zoll", "state.json"),
      JSON.stringify({ blueprint: validBlueprint }),
    );

    expect(() => readProjectState(dir)).toThrow(/unexpected shape/);
  });

  it("throws a distinct, actionable error on a blueprint version mismatch", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, ".ai-zoll"));
    fs.writeFileSync(
      path.join(dir, ".ai-zoll", "state.json"),
      JSON.stringify({
        blueprint: { ...validBlueprint, version: "0.1" },
        generatedPaths: [],
      }),
    );

    expect(() => readProjectState(dir)).toThrow(/different ai-zoll version/);
  });

  it("throws a generic validation error for other blueprint problems", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, ".ai-zoll"));
    fs.writeFileSync(
      path.join(dir, ".ai-zoll", "state.json"),
      JSON.stringify({
        blueprint: { ...validBlueprint, architecture: { style: "spaghetti" } },
        generatedPaths: [],
      }),
    );

    expect(() => readProjectState(dir)).toThrow(/blueprint failed validation/);
  });
});
