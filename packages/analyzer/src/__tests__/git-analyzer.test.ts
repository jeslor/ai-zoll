import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeGit } from "../git-analyzer";

let tempDirs: string[] = [];

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

function gitConfigWithOrigin(url: string): string {
  return `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n`;
}

describe("analyzeGit — projectName", () => {
  it("extracts the repo name from an SSH GitHub remote", () => {
    const dir = seed({ ".git/config": gitConfigWithOrigin("git@github.com:acme/api-service.git") });

    expect(analyzeGit(dir).projectName).toEqual({
      value: "api-service",
      confidence: "likely",
      reason: expect.stringContaining("api-service"),
    });
  });

  it("extracts the repo name from an HTTPS remote", () => {
    const dir = seed({ ".git/config": gitConfigWithOrigin("https://github.com/acme/api-service.git") });

    expect(analyzeGit(dir).projectName.value).toBe("api-service");
  });

  it("is host-agnostic — works for a self-hosted GitLab remote", () => {
    const dir = seed({
      ".git/config": gitConfigWithOrigin("git@gitlab.internal.acme.com:platform/core-api.git"),
    });

    expect(analyzeGit(dir).projectName.value).toBe("core-api");
  });

  it("works without a trailing .git suffix", () => {
    const dir = seed({ ".git/config": gitConfigWithOrigin("git@github.com:acme/api-service") });

    expect(analyzeGit(dir).projectName.value).toBe("api-service");
  });

  it("returns unknown when there's no .git directory at all", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "x" }) });

    expect(analyzeGit(dir).projectName.confidence).toBe("unknown");
  });

  it("returns unknown when .git/config has no origin remote", () => {
    const dir = seed({ ".git/config": "[core]\n\trepositoryformatversion = 0\n" });

    expect(analyzeGit(dir).projectName.confidence).toBe("unknown");
  });
});

describe("analyzeGit — hasMonorepoLayout", () => {
  it("detects an apps/*/package.json layout", () => {
    const dir = seed({
      "apps/web/package.json": JSON.stringify({ name: "web" }),
      "apps/api/package.json": JSON.stringify({ name: "api" }),
    });

    expect(analyzeGit(dir).hasMonorepoLayout).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.any(String),
    });
  });

  it("detects a packages/*/package.json layout", () => {
    const dir = seed({ "packages/shared/package.json": JSON.stringify({ name: "shared" }) });

    expect(analyzeGit(dir).hasMonorepoLayout.value).toBe(true);
  });

  it("returns unknown for a plain single-package repo", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "single" }), "src/index.ts": "" });

    expect(analyzeGit(dir).hasMonorepoLayout.confidence).toBe("unknown");
  });
});
